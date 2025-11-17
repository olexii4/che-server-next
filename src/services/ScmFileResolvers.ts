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
 * Resolves files from GitHub repositories
 */
export class GitHubFileResolver implements ScmFileResolver {
  
  accept(repository: string): boolean {
    return repository.includes('github.com');
  }
  
  async fileContent(repository: string, filePath: string): Promise<string> {
    try {
      const rawUrl = this.buildRawUrl(repository, filePath);
      const response = await fetch(rawUrl);
      
      if (response.status === 404) {
        throw new Error(SCM_CONSTANTS.ERRORS.FILE_NOT_FOUND);
      }
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.text();
    } catch (error: any) {
      if (error.message === SCM_CONSTANTS.ERRORS.FILE_NOT_FOUND) {
        throw error;
      }
      throw new Error(`${SCM_CONSTANTS.ERRORS.FETCH_FAILED}: ${error.message}`);
    }
  }
  
  private buildRawUrl(repository: string, filePath: string): string {
    // Parse GitHub URL
    const repoUrl = new URL(repository);
    const pathParts = repoUrl.pathname.split('/').filter(p => p);
    
    if (pathParts.length < 2) {
      throw new Error('Invalid GitHub repository URL');
    }
    
    const owner = pathParts[0];
    const repo = pathParts[1];
    const branch = pathParts[3] || 'main'; // Default to 'main' if no branch specified
    
    // Build raw.githubusercontent.com URL
    return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`;
  }
}

/**
 * GitLab File Resolver
 * 
 * Resolves files from GitLab repositories
 */
export class GitLabFileResolver implements ScmFileResolver {
  
  accept(repository: string): boolean {
    return repository.includes('gitlab.com');
  }
  
  async fileContent(repository: string, filePath: string): Promise<string> {
    try {
      const rawUrl = await this.buildRawUrl(repository, filePath);
      const response = await fetch(rawUrl);
      
      if (response.status === 404) {
        throw new Error(SCM_CONSTANTS.ERRORS.FILE_NOT_FOUND);
      }
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.text();
    } catch (error: any) {
      if (error.message === SCM_CONSTANTS.ERRORS.FILE_NOT_FOUND) {
        throw error;
      }
      throw new Error(`${SCM_CONSTANTS.ERRORS.FETCH_FAILED}: ${error.message}`);
    }
  }
  
  private async buildRawUrl(repository: string, filePath: string): Promise<string> {
    // Parse GitLab URL
    const repoUrl = new URL(repository);
    const pathParts = repoUrl.pathname.split('/').filter(p => p);
    
    if (pathParts.length < 2) {
      throw new Error('Invalid GitLab repository URL');
    }
    
    const owner = pathParts[0];
    const repo = pathParts[1];
    const branch = pathParts[3] || 'main';
    
    // Build GitLab raw URL
    return `https://gitlab.com/${owner}/${repo}/-/raw/${branch}/${filePath}`;
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
   * @param filePath - Path to file in repository
   * @returns Promise resolving to file content
   * @throws Error if no suitable resolver found or file not accessible
   */
  async resolveFile(repository: string, filePath: string): Promise<string> {
    if (!repository) {
      throw new Error(SCM_CONSTANTS.ERRORS.REPOSITORY_REQUIRED);
    }
    
    if (!filePath) {
      throw new Error(SCM_CONSTANTS.ERRORS.FILE_REQUIRED);
    }
    
    // Find suitable resolver
    const resolver = this.getScmFileResolver(repository);
    
    // Resolve file content
    return await resolver.fileContent(repository, filePath);
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

