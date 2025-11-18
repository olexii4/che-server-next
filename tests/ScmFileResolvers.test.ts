/**
 * Copyright (c) 2021-2025 Red Hat, Inc.
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */

import {
  GitHubFileResolver,
  GitLabFileResolver,
  GenericScmFileResolver,
  ScmService,
} from '../src/services/ScmFileResolvers';
import { SCM_CONSTANTS } from '../src/models/ScmModels';

// Mock fetch globally
global.fetch = jest.fn();

describe('GitHubFileResolver', () => {
  let resolver: GitHubFileResolver;

  beforeEach(() => {
    resolver = new GitHubFileResolver();
    jest.clearAllMocks();
  });

  describe('accept()', () => {
    it('should accept GitHub URLs', () => {
      expect(resolver.accept('https://github.com/user/repo')).toBe(true);
      expect(resolver.accept('https://github.com/user/repo.git')).toBe(true);
      expect(resolver.accept('https://github.enterprise.com/user/repo')).toBe(true);
    });

    it('should reject non-GitHub URLs', () => {
      expect(resolver.accept('https://gitlab.com/user/repo')).toBe(false);
      expect(resolver.accept('https://example.com/user/repo')).toBe(false);
    });
  });

  describe('fileContent() with specific file path', () => {
    it('should fetch file content successfully', async () => {
      const mockContent = 'file content';
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => mockContent,
      });

      const content = await resolver.fileContent('https://github.com/user/repo', 'README.md');

      expect(content).toBe(mockContent);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('raw.githubusercontent.com')
      );
    });

    it('should throw error on 404', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      await expect(
        resolver.fileContent('https://github.com/user/repo', 'missing.md')
      ).rejects.toThrow(SCM_CONSTANTS.ERRORS.FILE_NOT_FOUND);
    });

    it('should throw error on other HTTP errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(
        resolver.fileContent('https://github.com/user/repo', 'file.md')
      ).rejects.toThrow();
    });
  });

  describe('fileContent() without file path (auto-detect devfile)', () => {
    it('should try multiple devfile filenames and return first successful', async () => {
      // First attempt (devfile.yaml) fails with 404
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      // Second attempt (.devfile.yaml) succeeds
      const devfileContent = 'schemaVersion: 2.1.0';
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => devfileContent,
      });

      const content = await resolver.fileContent('https://github.com/user/repo');

      expect(content).toBe(devfileContent);
      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(global.fetch).toHaveBeenNthCalledWith(1, expect.stringContaining('devfile.yaml'));
      expect(global.fetch).toHaveBeenNthCalledWith(2, expect.stringContaining('.devfile.yaml'));
    });

    it('should throw error if no devfile found', async () => {
      // All attempts fail
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
      });

      await expect(resolver.fileContent('https://github.com/user/repo')).rejects.toThrow(
        'No devfile found'
      );
    });

    it('should handle network errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      await expect(resolver.fileContent('https://github.com/user/repo')).rejects.toThrow();
    });
  });

  describe('URL construction', () => {
    it('should construct proper raw.githubusercontent.com URLs', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => 'content',
      });

      await resolver.fileContent('https://github.com/eclipse/che/tree/main', 'devfile.yaml');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://raw.githubusercontent.com/eclipse/che/HEAD/devfile.yaml'
      );
    });
  });
});

describe('GitLabFileResolver', () => {
  let resolver: GitLabFileResolver;

  beforeEach(() => {
    resolver = new GitLabFileResolver();
    jest.clearAllMocks();
  });

  describe('accept()', () => {
    it('should accept GitLab URLs', () => {
      expect(resolver.accept('https://gitlab.com/user/repo')).toBe(true);
      expect(resolver.accept('https://gitlab.com/group/subgroup/repo')).toBe(true);
      expect(resolver.accept('https://gitlab.enterprise.com/user/repo')).toBe(true);
    });

    it('should reject non-GitLab URLs', () => {
      expect(resolver.accept('https://github.com/user/repo')).toBe(false);
      expect(resolver.accept('https://example.com/user/repo')).toBe(false);
    });
  });

  describe('fileContent() with specific file path', () => {
    it('should fetch file content successfully', async () => {
      const mockContent = 'file content';
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => mockContent,
      });

      const content = await resolver.fileContent('https://gitlab.com/user/repo', 'README.md');

      expect(content).toBe(mockContent);
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('api/v4/projects'));
    });

    it('should throw error on 404', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      await expect(
        resolver.fileContent('https://gitlab.com/user/repo', 'missing.md')
      ).rejects.toThrow(SCM_CONSTANTS.ERRORS.FILE_NOT_FOUND);
    });
  });

  describe('fileContent() without file path (auto-detect devfile)', () => {
    it('should try multiple devfile filenames', async () => {
      // First attempt fails
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      // Second attempt succeeds
      const devfileContent = 'schemaVersion: 2.1.0';
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => devfileContent,
      });

      const content = await resolver.fileContent('https://gitlab.com/user/repo');

      expect(content).toBe(devfileContent);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should throw error if no devfile found', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
      });

      await expect(resolver.fileContent('https://gitlab.com/user/repo')).rejects.toThrow(
        'No devfile found'
      );
    });
  });

  describe('URL construction', () => {
    it('should construct proper GitLab API URLs with URL encoding', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => 'content',
      });

      await resolver.fileContent('https://gitlab.com/group/subgroup/project', 'devfile.yaml');

      const callUrl = (global.fetch as jest.Mock).mock.calls[0][0];
      expect(callUrl).toContain('api/v4/projects');
      expect(callUrl).toContain(encodeURIComponent('group/subgroup/project'));
      expect(callUrl).toContain(encodeURIComponent('devfile.yaml'));
    });
  });
});

describe('GenericScmFileResolver', () => {
  let resolver: GenericScmFileResolver;

  beforeEach(() => {
    resolver = new GenericScmFileResolver();
    jest.clearAllMocks();
  });

  describe('accept()', () => {
    it('should accept any valid URL', () => {
      expect(resolver.accept('https://example.com/file')).toBe(true);
      expect(resolver.accept('http://localhost:8080/file')).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(resolver.accept('not-a-url')).toBe(false);
      expect(resolver.accept('')).toBe(false);
    });
  });

  describe('fileContent()', () => {
    it('should fetch file content from direct URL', async () => {
      const mockContent = 'file content';
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => mockContent,
      });

      const content = await resolver.fileContent(
        'https://example.com/devfile.yaml',
        'devfile.yaml'
      );

      expect(content).toBe(mockContent);
    });

    it('should append file path if not already included', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => 'content',
      });

      await resolver.fileContent('https://example.com', 'file.yaml');

      expect(global.fetch).toHaveBeenCalledWith('https://example.com/file.yaml');
    });

    it('should not duplicate file path if already included', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => 'content',
      });

      await resolver.fileContent('https://example.com/file.yaml', 'file.yaml');

      expect(global.fetch).toHaveBeenCalledWith('https://example.com/file.yaml');
    });

    it('should throw error on HTTP error', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(resolver.fileContent('https://example.com/file', 'file')).rejects.toThrow(
        SCM_CONSTANTS.ERRORS.FETCH_FAILED
      );
    });
  });
});

describe('ScmService', () => {
  let scmService: ScmService;

  beforeEach(() => {
    scmService = new ScmService();
    jest.clearAllMocks();
  });

  describe('resolveFile()', () => {
    it('should use GitHub resolver for GitHub URLs', async () => {
      const mockContent = 'devfile content';
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => mockContent,
      });

      const content = await scmService.resolveFile('https://github.com/user/repo', 'devfile.yaml');

      expect(content).toBe(mockContent);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('raw.githubusercontent.com')
      );
    });

    it('should use GitLab resolver for GitLab URLs', async () => {
      const mockContent = 'devfile content';
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => mockContent,
      });

      const content = await scmService.resolveFile('https://gitlab.com/user/repo', 'devfile.yaml');

      expect(content).toBe(mockContent);
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('api/v4/projects'));
    });

    it('should fall back to generic resolver for unknown URLs', async () => {
      const mockContent = 'file content';
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => mockContent,
      });

      const content = await scmService.resolveFile(
        'https://custom-git.com/repo/file.yaml',
        'file.yaml'
      );

      expect(content).toBe(mockContent);
    });

    it('should throw error if repository is empty', async () => {
      await expect(scmService.resolveFile('', 'file.yaml')).rejects.toThrow(
        SCM_CONSTANTS.ERRORS.REPOSITORY_REQUIRED
      );
    });

    it('should throw error if file path is empty', async () => {
      await expect(scmService.resolveFile('https://github.com/user/repo', '')).rejects.toThrow(
        SCM_CONSTANTS.ERRORS.FILE_REQUIRED
      );
    });

    it('should throw error if no resolver accepts the repository', async () => {
      // Create a service with no resolvers
      const emptyService = new ScmService();
      emptyService['resolvers'] = [];

      await expect(
        emptyService.resolveFile('https://github.com/user/repo', 'file')
      ).rejects.toThrow(SCM_CONSTANTS.ERRORS.NO_RESOLVER);
    });
  });

  describe('auto-detect devfile filename', () => {
    it('should auto-detect devfile when no filename provided for GitHub', async () => {
      // First attempt (devfile.yaml) succeeds
      const devfileContent = 'schemaVersion: 2.1.0';
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => devfileContent,
      });

      const content = await scmService.resolveFile('https://github.com/user/repo', '');

      expect(content).toBe(devfileContent);
    });

    it('should try multiple filenames for GitLab', async () => {
      // First attempt fails
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      // Second attempt succeeds
      const devfileContent = 'schemaVersion: 2.1.0';
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => devfileContent,
      });

      const content = await scmService.resolveFile('https://gitlab.com/user/repo', '');

      expect(content).toBe(devfileContent);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });
});
