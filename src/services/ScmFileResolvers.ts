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

import { ScmFileResolver, ScmProviderType, SCM_CONSTANTS } from '../models/ScmModels';
import { UrlParserService, RemoteFactoryUrl } from './UrlParsers';
import { DEFAULT_DEVFILE_FILENAMES } from './FactoryParametersResolver';

/**
 * Generic SCM File Resolver
 *
 * Resolves files from any Git-based repository using raw file URLs
 */
export class GenericScmFileResolver implements ScmFileResolver {
  accept(repository: string): boolean {
    try {
      new URL(repository);
      return true;
    } catch {
      return false;
    }
  }

  async fileContent(repository: string, filePath: string): Promise<string> {
    try {
      // Try to fetch the file directly
      const fileUrl = this.buildFileUrl(repository, filePath);
      const response = await fetch(fileUrl);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.text();
    } catch (error: any) {
      throw new Error(`${SCM_CONSTANTS.ERRORS.FETCH_FAILED}: ${error.message}`);
    }
  }

  private buildFileUrl(repository: string, filePath: string): string {
    // If repository already includes the file path, return as is
    if (repository.includes(filePath)) {
      return repository;
    }

    // Otherwise append file path
    const baseUrl = repository.endsWith('/') ? repository : `${repository}/`;
    return `${baseUrl}${filePath}`;
  }
}

/**
 * GitHub File Resolver
 *
 * Resolves files from GitHub repositories with automatic devfile filename detection
 *
 * Based on: org.eclipse.che.api.factory.server.github.GithubScmFileResolver
 */
export class GitHubFileResolver implements ScmFileResolver {
  accept(repository: string): boolean {
    return repository.includes('github.com') || repository.includes('github');
  }

  /**
   * Get file content from GitHub repository
   * If filePath is not provided, tries all configured devfile filenames
   */
  async fileContent(repository: string, filePath?: string): Promise<string> {
    try {
      // If specific file path is provided, fetch it directly
      if (filePath) {
        return await this.fetchFile(repository, filePath);
      }

      // Otherwise, try all devfile filenames until one works
      return await this.tryDevfileFilenames(repository);
    } catch (error: any) {
      throw new Error(`${SCM_CONSTANTS.ERRORS.FETCH_FAILED}: ${error.message}`);
    }
  }

  /**
   * Try to fetch devfile using all configured devfile filenames
   * Returns content of the first file that exists
   */
  private async tryDevfileFilenames(repository: string): Promise<string> {
    const parsedUrl = UrlParserService.parse(repository);

    if (!parsedUrl) {
      throw new Error('Unable to parse repository URL');
    }

    const devfileLocations = parsedUrl.devfileFileLocations();
    const errors: string[] = [];

    for (const location of devfileLocations) {
      try {
        console.log(`Trying to fetch devfile from: ${location.location}`);
        const content = await this.fetchFromUrl(location.location);
        console.log(`Successfully fetched devfile: ${location.filename}`);
        return content;
      } catch (error: any) {
        errors.push(`${location.filename}: ${error.message}`);
        // Continue to next filename
      }
    }

    throw new Error(
      `No devfile found. Tried: ${devfileLocations.map(l => l.filename).join(', ')}. Errors: ${errors.join('; ')}`
    );
  }

  /**
   * Fetch specific file from repository
   */
  private async fetchFile(repository: string, filePath: string): Promise<string> {
    const parsedUrl = UrlParserService.parse(repository);

    if (!parsedUrl) {
      // Fallback to direct URL construction
      return await this.fetchFromUrl(this.buildFallbackRawUrl(repository, filePath));
    }

    const rawUrl = parsedUrl.rawFileLocation(filePath);
    return await this.fetchFromUrl(rawUrl);
  }

  /**
   * Fetch content from URL
   */
  private async fetchFromUrl(url: string): Promise<string> {
    const response = await fetch(url);

    if (response.status === 404) {
      throw new Error(SCM_CONSTANTS.ERRORS.FILE_NOT_FOUND);
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.text();
  }

  /**
   * Fallback method to build raw URL (for backward compatibility)
   */
  private buildFallbackRawUrl(repository: string, filePath: string): string {
    const repoUrl = new URL(repository);
    const pathParts = repoUrl.pathname.split('/').filter(p => p);

    if (pathParts.length < 2) {
      throw new Error('Invalid GitHub repository URL');
    }

    const owner = pathParts[0];
    const repo = pathParts[1].replace(/\.git$/, '');
    const branch = pathParts[3] || 'HEAD';

    return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`;
  }
}

/**
 * GitLab File Resolver
 *
 * Resolves files from GitLab repositories with automatic devfile filename detection
 *
 * Based on: org.eclipse.che.api.factory.server.gitlab.GitlabScmFileResolver
 */
export class GitLabFileResolver implements ScmFileResolver {
  accept(repository: string): boolean {
    return repository.includes('gitlab.com') || repository.includes('gitlab');
  }

  /**
   * Get file content from GitLab repository
   * If filePath is not provided, tries all configured devfile filenames
   */
  async fileContent(repository: string, filePath?: string): Promise<string> {
    try {
      // If specific file path is provided, fetch it directly
      if (filePath) {
        return await this.fetchFile(repository, filePath);
      }

      // Otherwise, try all devfile filenames until one works
      return await this.tryDevfileFilenames(repository);
    } catch (error: any) {
      throw new Error(`${SCM_CONSTANTS.ERRORS.FETCH_FAILED}: ${error.message}`);
    }
  }

  /**
   * Try to fetch devfile using all configured devfile filenames
   * Returns content of the first file that exists
   */
  private async tryDevfileFilenames(repository: string): Promise<string> {
    const parsedUrl = UrlParserService.parse(repository);

    if (!parsedUrl) {
      throw new Error('Unable to parse repository URL');
    }

    const devfileLocations = parsedUrl.devfileFileLocations();
    const errors: string[] = [];

    for (const location of devfileLocations) {
      try {
        console.log(`Trying to fetch devfile from: ${location.location}`);
        const content = await this.fetchFromUrl(location.location);
        console.log(`Successfully fetched devfile: ${location.filename}`);
        return content;
      } catch (error: any) {
        errors.push(`${location.filename}: ${error.message}`);
        // Continue to next filename
      }
    }

    throw new Error(
      `No devfile found. Tried: ${devfileLocations.map(l => l.filename).join(', ')}. Errors: ${errors.join('; ')}`
    );
  }

  /**
   * Fetch specific file from repository
   */
  private async fetchFile(repository: string, filePath: string): Promise<string> {
    const parsedUrl = UrlParserService.parse(repository);

    if (!parsedUrl) {
      // Fallback to direct URL construction
      return await this.fetchFromUrl(this.buildFallbackRawUrl(repository, filePath));
    }

    const rawUrl = parsedUrl.rawFileLocation(filePath);
    return await this.fetchFromUrl(rawUrl);
  }

  /**
   * Fetch content from URL
   */
  private async fetchFromUrl(url: string): Promise<string> {
    const response = await fetch(url);

    if (response.status === 404) {
      throw new Error(SCM_CONSTANTS.ERRORS.FILE_NOT_FOUND);
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.text();
  }

  /**
   * Fallback method to build raw URL (for backward compatibility)
   * Uses GitLab API v4 to fetch raw file
   */
  private buildFallbackRawUrl(repository: string, filePath: string): string {
    const repoUrl = new URL(repository);
    const pathParts = repoUrl.pathname.split('/').filter(p => p);

    if (pathParts.length < 2) {
      throw new Error('Invalid GitLab repository URL');
    }

    // Join all path parts to form the project path (supports subgroups)
    let projectPath = pathParts.join('/');
    if (projectPath.endsWith('.git')) {
      projectPath = projectPath.substring(0, projectPath.length - 4);
    }

    const encodedPath = encodeURIComponent(projectPath);
    const encodedFilename = encodeURIComponent(filePath);
    const branch = 'HEAD';

    return `${repoUrl.protocol}//${repoUrl.host}/api/v4/projects/${encodedPath}/repository/files/${encodedFilename}/raw?ref=${branch}`;
  }
}

/**
 * SCM Service - Manages SCM file resolution
 *
 * Based on: org.eclipse.che.api.factory.server.ScmService
 */
export class ScmService {
  private resolvers: ScmFileResolver[] = [];

  constructor() {
    // Register default resolvers
    this.registerResolver(new GitHubFileResolver());
    this.registerResolver(new GitLabFileResolver());
    // Generic resolver as fallback
    this.registerResolver(new GenericScmFileResolver());
  }

  /**
   * Register a SCM file resolver
   *
   * @param resolver - SCM file resolver to register
   */
  registerResolver(resolver: ScmFileResolver): void {
    this.resolvers.push(resolver);
  }

  /**
   * Resolve file content from repository
   *
   * @param repository - Repository URL
   * @param filePath - Path to file in repository (optional - will try default devfile filenames if empty)
   * @returns Promise resolving to file content
   * @throws Error if no suitable resolver found or file not accessible
   */
  async resolveFile(repository: string, filePath?: string): Promise<string> {
    if (!repository) {
      throw new Error(SCM_CONSTANTS.ERRORS.REPOSITORY_REQUIRED);
    }

    // Find suitable resolver
    const resolver = this.getScmFileResolver(repository);

    // Resolve file content
    // If filePath is empty or undefined, the resolver will try default devfile filenames
    return await resolver.fileContent(repository, filePath || '');
  }

  /**
   * Get suitable SCM file resolver for repository
   *
   * @param repository - Repository URL
   * @returns SCM file resolver
   * @throws Error if no suitable resolver found
   */
  private getScmFileResolver(repository: string): ScmFileResolver {
    for (const resolver of this.resolvers) {
      if (resolver.accept(repository)) {
        return resolver;
      }
    }

    throw new Error(SCM_CONSTANTS.ERRORS.NO_RESOLVER);
  }
}
