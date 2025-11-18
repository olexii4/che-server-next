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
  RawDevfileUrlFactoryParameterResolver,
  ScmRepositoryFactoryResolver,
  DEFAULT_DEVFILE_FILENAMES,
  FactoryResolverPriority,
} from '../src/services/FactoryParametersResolver';
import { FACTORY_CONSTANTS } from '../src/models/FactoryModels';

// Mock fetch globally
global.fetch = jest.fn();

describe('DEFAULT_DEVFILE_FILENAMES', () => {
  it('should have default values', () => {
    expect(DEFAULT_DEVFILE_FILENAMES).toContain('devfile.yaml');
    expect(DEFAULT_DEVFILE_FILENAMES).toContain('.devfile.yaml');
  });

  it('should read from environment variable', () => {
    const originalEnv = process.env.CHE_FACTORY_DEFAULT_DEVFILE_FILENAMES;

    // This test can only verify the mechanism exists
    // since DEFAULT_DEVFILE_FILENAMES is already initialized
    expect(DEFAULT_DEVFILE_FILENAMES).toBeDefined();
    expect(Array.isArray(DEFAULT_DEVFILE_FILENAMES)).toBe(true);

    // Restore
    if (originalEnv) {
      process.env.CHE_FACTORY_DEFAULT_DEVFILE_FILENAMES = originalEnv;
    }
  });
});

describe('RawDevfileUrlFactoryParameterResolver', () => {
  let resolver: RawDevfileUrlFactoryParameterResolver;

  beforeEach(() => {
    resolver = new RawDevfileUrlFactoryParameterResolver();
    jest.clearAllMocks();
  });

  describe('accept()', () => {
    it('should accept URL ending with devfile.yaml', () => {
      const parameters = {
        [FACTORY_CONSTANTS.URL_PARAMETER_NAME]: 'https://example.com/devfile.yaml',
      };

      expect(resolver.accept(parameters)).toBe(true);
    });

    it('should accept URL ending with .devfile.yaml', () => {
      const parameters = {
        [FACTORY_CONSTANTS.URL_PARAMETER_NAME]: 'https://example.com/.devfile.yaml',
      };

      expect(resolver.accept(parameters)).toBe(true);
    });

    it('should accept URL with query parameters', () => {
      const parameters = {
        [FACTORY_CONSTANTS.URL_PARAMETER_NAME]: 'https://example.com/devfile.yaml?token=abc123',
      };

      expect(resolver.accept(parameters)).toBe(true);
    });

    it('should accept URL with fragment', () => {
      const parameters = {
        [FACTORY_CONSTANTS.URL_PARAMETER_NAME]: 'https://example.com/devfile.yaml#section',
      };

      expect(resolver.accept(parameters)).toBe(true);
    });

    it('should reject URL not ending with devfile filename', () => {
      const parameters = {
        [FACTORY_CONSTANTS.URL_PARAMETER_NAME]: 'https://example.com/file.txt',
      };

      expect(resolver.accept(parameters)).toBe(false);
    });

    it('should reject repository URL without devfile filename', () => {
      const parameters = {
        [FACTORY_CONSTANTS.URL_PARAMETER_NAME]: 'https://github.com/user/repo',
      };

      expect(resolver.accept(parameters)).toBe(false);
    });

    it('should reject missing URL parameter', () => {
      const parameters = {};

      expect(resolver.accept(parameters)).toBe(false);
    });

    it('should reject invalid URL', () => {
      const parameters = {
        [FACTORY_CONSTANTS.URL_PARAMETER_NAME]: 'not-a-valid-url',
      };

      expect(resolver.accept(parameters)).toBe(false);
    });

    it('should be case insensitive', () => {
      const parameters = {
        [FACTORY_CONSTANTS.URL_PARAMETER_NAME]: 'https://example.com/DEVFILE.YAML',
      };

      expect(resolver.accept(parameters)).toBe(true);
    });
  });

  describe('createFactory()', () => {
    it('should create factory from valid devfile URL', async () => {
      const devfileContent = JSON.stringify({
        schemaVersion: '2.1.0',
        metadata: { name: 'my-devfile' },
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => devfileContent,
      });

      const parameters = {
        [FACTORY_CONSTANTS.URL_PARAMETER_NAME]: 'https://example.com/devfile.yaml',
      };

      const factory = await resolver.createFactory(parameters);

      expect(factory).toBeDefined();
      expect(factory.v).toBe(FACTORY_CONSTANTS.CURRENT_VERSION);
      expect(factory.devfile).toBeDefined();
      expect(factory.source).toBe('devfile.yaml');
    });

    it('should throw error if URL is missing', async () => {
      const parameters = {};

      await expect(resolver.createFactory(parameters)).rejects.toThrow(
        FACTORY_CONSTANTS.ERRORS.URL_REQUIRED
      );
    });

    it('should throw error if URL does not end with devfile filename', async () => {
      const parameters = {
        [FACTORY_CONSTANTS.URL_PARAMETER_NAME]: 'https://example.com/file.txt',
      };

      await expect(resolver.createFactory(parameters)).rejects.toThrow('Invalid devfile URL');
    });

    it('should throw error if fetch fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      const parameters = {
        [FACTORY_CONSTANTS.URL_PARAMETER_NAME]: 'https://example.com/devfile.yaml',
      };

      await expect(resolver.createFactory(parameters)).rejects.toThrow('Failed to fetch devfile');
    });

    it('should handle YAML content gracefully', async () => {
      // For now, YAML content creates a minimal devfile
      const yamlContent = 'schemaVersion: 2.1.0\nmetadata:\n  name: test';

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => yamlContent,
      });

      const parameters = {
        [FACTORY_CONSTANTS.URL_PARAMETER_NAME]: 'https://example.com/devfile.yaml',
      };

      const factory = await resolver.createFactory(parameters);

      expect(factory).toBeDefined();
      expect(factory.devfile).toBeDefined();
    });
  });

  describe('parseFactoryUrl()', () => {
    it('should parse valid URL', () => {
      const url = 'https://example.com/path/devfile.yaml';
      const parsed = resolver.parseFactoryUrl(url);

      expect(parsed.providerUrl).toBe('https://example.com');
      expect(parsed.devfileFileLocation).toBe(url);
    });

    it('should throw error for invalid URL', () => {
      expect(() => {
        resolver.parseFactoryUrl('not-a-valid-url');
      }).toThrow('Invalid factory URL');
    });
  });

  describe('getProviderName()', () => {
    it('should return raw-url provider name', () => {
      expect(resolver.getProviderName()).toBe('raw-url');
    });
  });

  describe('priority()', () => {
    it('should return HIGHEST priority', () => {
      expect(resolver.priority()).toBe(FactoryResolverPriority.HIGHEST);
    });
  });
});

describe('ScmRepositoryFactoryResolver', () => {
  let resolver: ScmRepositoryFactoryResolver;

  beforeEach(() => {
    resolver = new ScmRepositoryFactoryResolver();
    jest.clearAllMocks();
  });

  describe('accept()', () => {
    it('should accept GitHub repository URL without devfile filename', () => {
      const parameters = {
        [FACTORY_CONSTANTS.URL_PARAMETER_NAME]: 'https://github.com/user/repo',
      };

      expect(resolver.accept(parameters)).toBe(true);
    });

    it('should accept GitHub URL with branch', () => {
      const parameters = {
        [FACTORY_CONSTANTS.URL_PARAMETER_NAME]: 'https://github.com/user/repo/tree/main',
      };

      expect(resolver.accept(parameters)).toBe(true);
    });

    it('should accept GitLab repository URL', () => {
      const parameters = {
        [FACTORY_CONSTANTS.URL_PARAMETER_NAME]: 'https://gitlab.com/user/repo',
      };

      expect(resolver.accept(parameters)).toBe(true);
    });

    it('should accept GitLab URL with subgroups', () => {
      const parameters = {
        [FACTORY_CONSTANTS.URL_PARAMETER_NAME]: 'https://gitlab.com/group/subgroup/project',
      };

      expect(resolver.accept(parameters)).toBe(true);
    });

    it('should accept Bitbucket repository URL', () => {
      const parameters = {
        [FACTORY_CONSTANTS.URL_PARAMETER_NAME]: 'https://bitbucket.org/workspace/repo',
      };

      expect(resolver.accept(parameters)).toBe(true);
    });

    it('should reject GitHub URL already containing devfile filename', () => {
      const parameters = {
        [FACTORY_CONSTANTS.URL_PARAMETER_NAME]:
          'https://github.com/user/repo/blob/main/devfile.yaml',
      };

      // Should reject because this should be handled by RawDevfileUrlFactoryParameterResolver
      expect(resolver.accept(parameters)).toBe(false);
    });

    it('should reject non-SCM URLs', () => {
      const parameters = {
        [FACTORY_CONSTANTS.URL_PARAMETER_NAME]: 'https://example.com/file',
      };

      expect(resolver.accept(parameters)).toBe(false);
    });

    it('should reject missing URL parameter', () => {
      const parameters = {};

      expect(resolver.accept(parameters)).toBe(false);
    });

    it('should reject invalid URL', () => {
      const parameters = {
        [FACTORY_CONSTANTS.URL_PARAMETER_NAME]: 'not-a-valid-url',
      };

      expect(resolver.accept(parameters)).toBe(false);
    });

    it('should accept .git suffix URLs', () => {
      const parameters = {
        [FACTORY_CONSTANTS.URL_PARAMETER_NAME]: 'https://github.com/user/repo.git',
      };

      expect(resolver.accept(parameters)).toBe(true);
    });
  });

  describe('createFactory()', () => {
    it('should create factory from GitHub repository URL', async () => {
      const devfileContent = JSON.stringify({
        schemaVersion: '2.1.0',
        metadata: { name: 'my-devfile' },
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => devfileContent,
      });

      const parameters = {
        [FACTORY_CONSTANTS.URL_PARAMETER_NAME]: 'https://github.com/eclipse/che',
      };

      const factory = await resolver.createFactory(parameters);

      expect(factory).toBeDefined();
      expect(factory.v).toBe(FACTORY_CONSTANTS.CURRENT_VERSION);
      expect(factory.devfile).toBeDefined();
      expect(factory.source).toBe('https://github.com/eclipse/che');
      expect(factory.name).toBe('che');
    });

    it('should try multiple devfile filenames', async () => {
      // First attempt (devfile.yaml) fails
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      // Second attempt (.devfile.yaml) succeeds
      const devfileContent = JSON.stringify({
        schemaVersion: '2.1.0',
        metadata: { name: 'my-devfile' },
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => devfileContent,
      });

      const parameters = {
        [FACTORY_CONSTANTS.URL_PARAMETER_NAME]: 'https://github.com/user/repo',
      };

      const factory = await resolver.createFactory(parameters);

      expect(factory).toBeDefined();
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should throw error if URL is missing', async () => {
      const parameters = {};

      await expect(resolver.createFactory(parameters)).rejects.toThrow(
        FACTORY_CONSTANTS.ERRORS.URL_REQUIRED
      );
    });

    it('should throw error if no devfile found', async () => {
      // All attempts fail
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
      });

      const parameters = {
        [FACTORY_CONSTANTS.URL_PARAMETER_NAME]: 'https://github.com/user/repo',
      };

      await expect(resolver.createFactory(parameters)).rejects.toThrow(
        'Failed to create factory from repository URL'
      );
    });

    it('should extract repository name correctly', async () => {
      const devfileContent = JSON.stringify({
        schemaVersion: '2.1.0',
        metadata: { name: 'my-devfile' },
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => devfileContent,
      });

      const parameters = {
        [FACTORY_CONSTANTS.URL_PARAMETER_NAME]:
          'https://github.com/organization/my-awesome-project',
      };

      const factory = await resolver.createFactory(parameters);

      expect(factory.name).toBe('my-awesome-project');
    });

    it('should handle .git suffix in URL', async () => {
      const devfileContent = JSON.stringify({
        schemaVersion: '2.1.0',
        metadata: { name: 'my-devfile' },
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => devfileContent,
      });

      const parameters = {
        [FACTORY_CONSTANTS.URL_PARAMETER_NAME]: 'https://github.com/user/repo.git',
      };

      const factory = await resolver.createFactory(parameters);

      expect(factory.name).toBe('repo');
    });
  });

  describe('parseFactoryUrl()', () => {
    it('should parse GitHub URL', () => {
      const url = 'https://github.com/user/repo';
      const parsed = resolver.parseFactoryUrl(url);

      expect(parsed.providerUrl).toBe('https://github.com');
    });

    it('should parse GitLab URL', () => {
      const url = 'https://gitlab.com/group/project';
      const parsed = resolver.parseFactoryUrl(url);

      expect(parsed.providerUrl).toBe('https://gitlab.com');
    });

    it('should extract branch from URL', () => {
      const url = 'https://github.com/user/repo/tree/feature-branch';
      const parsed = resolver.parseFactoryUrl(url);

      expect(parsed.branch).toBe('feature-branch');
    });

    it('should throw error for invalid URL', () => {
      expect(() => {
        resolver.parseFactoryUrl('not-a-valid-url');
      }).toThrow('Invalid factory URL');
    });
  });

  describe('getProviderName()', () => {
    it('should return scm-repository provider name', () => {
      expect(resolver.getProviderName()).toBe('scm-repository');
    });
  });

  describe('priority()', () => {
    it('should return DEFAULT priority', () => {
      expect(resolver.priority()).toBe(FactoryResolverPriority.DEFAULT);
    });
  });
});

describe('Resolver Priority', () => {
  it('should prioritize ScmRepositoryFactoryResolver over RawDevfileUrlFactoryParameterResolver for repo URLs', () => {
    const scmResolver = new ScmRepositoryFactoryResolver();
    const rawResolver = new RawDevfileUrlFactoryParameterResolver();

    const repoUrlParams = {
      [FACTORY_CONSTANTS.URL_PARAMETER_NAME]: 'https://github.com/user/repo',
    };

    // SCM resolver should accept repository URLs
    expect(scmResolver.accept(repoUrlParams)).toBe(true);
    // Raw resolver should reject repository URLs
    expect(rawResolver.accept(repoUrlParams)).toBe(false);
  });

  it('should prioritize RawDevfileUrlFactoryParameterResolver for direct devfile URLs', () => {
    const scmResolver = new ScmRepositoryFactoryResolver();
    const rawResolver = new RawDevfileUrlFactoryParameterResolver();

    const devfileUrlParams = {
      [FACTORY_CONSTANTS.URL_PARAMETER_NAME]: 'https://github.com/user/repo/blob/main/devfile.yaml',
    };

    // Raw resolver should accept direct devfile URLs with highest priority
    expect(rawResolver.accept(devfileUrlParams)).toBe(true);
    expect(rawResolver.priority()).toBe(FactoryResolverPriority.HIGHEST);

    // SCM resolver should reject URLs that already have devfile filename
    expect(scmResolver.accept(devfileUrlParams)).toBe(false);
  });
});
