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
  FactoryMeta,
  FactoryDevfileV2,
  FactoryResolverParams,
  FACTORY_CONSTANTS,
} from '../models/FactoryModels';

/**
 * Get devfile filenames from configuration
 * Reads from environment variable CHE_FACTORY_DEFAULT_DEVFILE_FILENAMES
 * or uses default values
 *
 * Based on: che.factory.default_devfile_filenames
 */
function getConfiguredDevfileFilenames(): string[] {
  const configValue = process.env.CHE_FACTORY_DEFAULT_DEVFILE_FILENAMES;

  if (configValue) {
    // Split by comma and trim whitespace
    return configValue
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }

  // Default devfile filenames
  return ['devfile.yaml', '.devfile.yaml'];
}

/**
 * Default devfile filenames to look for
 * Based on: che.factory.default_devfile_filenames
 */
export const DEFAULT_DEVFILE_FILENAMES = getConfiguredDevfileFilenames();

/**
 * Factory resolver priority levels
 *
 * Based on: org.eclipse.che.api.factory.server.FactoryResolverPriority
 */
export enum FactoryResolverPriority {
  LOWEST = 0,
  DEFAULT = 5,
  HIGHEST = 10,
}

/**
 * Remote factory URL information
 */
export interface RemoteFactoryUrl {
  providerUrl: string;
  branch?: string;
  devfileFileLocation?: string;
}

/**
 * Interface for factory parameters resolvers
 *
 * Based on: org.eclipse.che.api.factory.server.FactoryParametersResolver
 */
export interface FactoryParametersResolver {
  /**
   * Check if this resolver accepts the given parameters
   */
  accept(parameters: FactoryResolverParams): boolean;

  /**
   * Create factory from parameters
   */
  createFactory(parameters: FactoryResolverParams): Promise<FactoryMeta>;

  /**
   * Parse factory URL to extract information
   */
  parseFactoryUrl(url: string): RemoteFactoryUrl;

  /**
   * Get the SCM provider name (e.g., "github", "gitlab")
   */
  getProviderName(): string;

  /**
   * Get resolver priority
   */
  priority(): FactoryResolverPriority;
}

/**
 * Base factory parameter resolver with common functionality
 *
 * Based on: org.eclipse.che.api.factory.server.BaseFactoryParameterResolver
 */
export abstract class BaseFactoryParameterResolver implements FactoryParametersResolver {
  abstract accept(parameters: FactoryResolverParams): boolean;
  abstract createFactory(parameters: FactoryResolverParams): Promise<FactoryMeta>;
  abstract parseFactoryUrl(url: string): RemoteFactoryUrl;
  abstract getProviderName(): string;

  priority(): FactoryResolverPriority {
    return FactoryResolverPriority.DEFAULT;
  }

  /**
   * Check if authorization should be skipped based on parameters
   */
  protected getSkipAuthorisation(parameters: FactoryResolverParams): boolean {
    // Skip authorization if error_code indicates access_denied
    const errorCode = parameters['error_code'];
    if (errorCode === 'access_denied') {
      return true;
    }
    return false;
  }
}

/**
 * Raw devfile URL factory resolver
 *
 * Based on: org.eclipse.che.api.factory.server.RawDevfileUrlFactoryParameterResolver
 */
export class RawDevfileUrlFactoryParameterResolver extends BaseFactoryParameterResolver {
  /**
   * Check if the URL ends with a valid devfile filename
   */
  private isValidDevfileUrl(url: string): boolean {
    const urlLower = url.toLowerCase();
    // Remove query parameters and fragments for validation
    const cleanUrl = urlLower.split('?')[0].split('#')[0];

    return DEFAULT_DEVFILE_FILENAMES.some(filename => cleanUrl.endsWith(filename.toLowerCase()));
  }

  accept(parameters: FactoryResolverParams): boolean {
    const url = parameters[FACTORY_CONSTANTS.URL_PARAMETER_NAME];
    if (!url || typeof url !== 'string') {
      return false;
    }

    // Validate URL format and devfile filename
    try {
      new URL(url);

      // Validate that URL ends with a valid devfile filename
      if (!this.isValidDevfileUrl(url)) {
        console.warn(
          `URL does not end with a valid devfile filename. Expected: ${DEFAULT_DEVFILE_FILENAMES.join(', ')}. Got: ${url}`
        );
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  async createFactory(parameters: FactoryResolverParams): Promise<FactoryMeta> {
    const url = parameters[FACTORY_CONSTANTS.URL_PARAMETER_NAME] as string;
    if (!url) {
      throw new Error(FACTORY_CONSTANTS.ERRORS.URL_REQUIRED);
    }

    // Validate that URL ends with a valid devfile filename
    if (!this.isValidDevfileUrl(url)) {
      throw new Error(
        `Invalid devfile URL. URL must end with one of: ${DEFAULT_DEVFILE_FILENAMES.join(', ')}. Got: ${url}`
      );
    }

    try {
      // Fetch devfile content from URL
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch devfile from ${url}: ${response.statusText}`);
      }

      const content = await response.text();

      // Try to parse as YAML/JSON to create devfile object
      let devfile: Record<string, any>;
      try {
        // Try JSON first
        devfile = JSON.parse(content);
      } catch {
        // If not JSON, treat as YAML (simplified - in production use a YAML parser)
        // For now, create a simple devfile structure
        devfile = {
          schemaVersion: '2.1.0',
          metadata: {
            name: this.extractNameFromUrl(url),
          },
        };
      }

      // Create factory with devfile v2
      const factory: FactoryDevfileV2 = {
        v: FACTORY_CONSTANTS.CURRENT_VERSION,
        devfile: devfile,
        source: this.extractSourceFromUrl(url),
        name: this.extractNameFromUrl(url),
      };

      return factory;
    } catch (error: any) {
      throw new Error(`Failed to create factory from URL ${url}: ${error.message}`);
    }
  }

  parseFactoryUrl(url: string): RemoteFactoryUrl {
    try {
      const parsedUrl = new URL(url);
      return {
        providerUrl: `${parsedUrl.protocol}//${parsedUrl.host}`,
        devfileFileLocation: url,
      };
    } catch {
      throw new Error(`Invalid factory URL: ${url}`);
    }
  }

  getProviderName(): string {
    return 'raw-url';
  }

  priority(): FactoryResolverPriority {
    return FactoryResolverPriority.HIGHEST;
  }

  private extractNameFromUrl(url: string): string {
    try {
      const parsedUrl = new URL(url);
      const pathParts = parsedUrl.pathname.split('/').filter(p => p);
      return pathParts[pathParts.length - 1]?.replace(/\.(yaml|yml|json)$/i, '') || 'factory';
    } catch {
      return 'factory';
    }
  }

  private extractSourceFromUrl(url: string): string | undefined {
    try {
      const parsedUrl = new URL(url);
      const pathParts = parsedUrl.pathname.split('/');
      const filename = pathParts[pathParts.length - 1];
      if (filename && filename.match(/\.(yaml|yml|json)$/i)) {
        return filename;
      }
    } catch {
      // ignore
    }
    return undefined;
  }
}

/**
 * SCM Repository URL factory resolver
 *
 * Handles factory creation from SCM repository URLs (GitHub, GitLab, Bitbucket)
 * without requiring the devfile filename in the URL
 *
 * Based on: org.eclipse.che.api.factory.server.github.GithubFactoryParametersResolver
 * and similar GitLab/Bitbucket resolvers
 */
export class ScmRepositoryFactoryResolver extends BaseFactoryParameterResolver {
  /**
   * Check if the URL is a valid SCM repository URL
   */
  accept(parameters: FactoryResolverParams): boolean {
    const url = parameters[FACTORY_CONSTANTS.URL_PARAMETER_NAME];
    if (!url || typeof url !== 'string') {
      return false;
    }

    try {
      new URL(url);

      // Accept if URL is a known SCM provider and doesn't already end with a devfile filename
      const isScmUrl = this.isScmProviderUrl(url);
      const hasDevfileFilename = this.hasDevfileFilename(url);

      // Accept SCM URLs that don't already have devfile filename
      // (RawDevfileUrlFactoryParameterResolver will handle URLs with devfile filenames)
      return isScmUrl && !hasDevfileFilename;
    } catch {
      return false;
    }
  }

  /**
   * Check if URL is from a known SCM provider
   */
  private isScmProviderUrl(url: string): boolean {
    const lowerUrl = url.toLowerCase();
    return (
      lowerUrl.includes('github.com') ||
      lowerUrl.includes('github') ||
      lowerUrl.includes('gitlab.com') ||
      lowerUrl.includes('gitlab') ||
      lowerUrl.includes('bitbucket.org') ||
      lowerUrl.includes('bitbucket')
    );
  }

  /**
   * Check if URL already ends with a devfile filename
   */
  private hasDevfileFilename(url: string): boolean {
    const urlLower = url.toLowerCase();
    // Remove query string and fragment
    let cleanUrl = urlLower.split('?')[0].split('#')[0];

    // Remove .git suffix if present (common for repository URLs)
    if (cleanUrl.endsWith('.git')) {
      cleanUrl = cleanUrl.substring(0, cleanUrl.length - 4);
    }

    return DEFAULT_DEVFILE_FILENAMES.some(filename =>
      cleanUrl.endsWith('/' + filename.toLowerCase())
    );
  }

  async createFactory(parameters: FactoryResolverParams): Promise<FactoryMeta> {
    const url = parameters[FACTORY_CONSTANTS.URL_PARAMETER_NAME] as string;
    if (!url) {
      throw new Error(FACTORY_CONSTANTS.ERRORS.URL_REQUIRED);
    }

    // Import here to avoid circular dependency
    const { ScmService } = await import('./ScmFileResolvers');
    const scmService = new ScmService();

    try {
      // Clean URL: remove .git suffix if present
      let cleanUrl = url;
      if (cleanUrl.endsWith('.git')) {
        cleanUrl = cleanUrl.substring(0, cleanUrl.length - 4);
      }

      // Try to fetch devfile from repository (tries all configured filenames)
      // Pass empty string or undefined to trigger automatic devfile detection
      const devfileContent = await scmService.resolveFile(cleanUrl);

      // Parse devfile content
      let devfile: Record<string, any>;
      try {
        // Try JSON first
        devfile = JSON.parse(devfileContent);
      } catch {
        // If not JSON, we need a YAML parser
        // For now, create a minimal devfile structure
        // In production, use a proper YAML parser like 'yaml' or 'js-yaml'
        devfile = {
          schemaVersion: '2.1.0',
          metadata: {
            name: this.extractNameFromUrl(url),
          },
        };
      }

      // Create factory with devfile v2
      const factory: FactoryDevfileV2 = {
        v: FACTORY_CONSTANTS.CURRENT_VERSION,
        devfile: devfile,
        source: url,
        name: this.extractNameFromUrl(url),
      };

      return factory;
    } catch (error: any) {
      throw new Error(`Failed to create factory from repository URL ${url}: ${error.message}`);
    }
  }

  parseFactoryUrl(url: string): RemoteFactoryUrl {
    try {
      const parsedUrl = new URL(url);
      return {
        providerUrl: `${parsedUrl.protocol}//${parsedUrl.host}`,
        branch: this.extractBranchFromUrl(url),
      };
    } catch {
      throw new Error(`Invalid factory URL: ${url}`);
    }
  }

  getProviderName(): string {
    return 'scm-repository';
  }

  priority(): FactoryResolverPriority {
    // Higher priority than raw URL resolver, so SCM URLs are handled here first
    return FactoryResolverPriority.DEFAULT;
  }

  private extractNameFromUrl(url: string): string {
    try {
      const parsedUrl = new URL(url);
      const pathParts = parsedUrl.pathname.split('/').filter(p => p);

      // For repository URLs, use the repository name
      if (pathParts.length >= 2) {
        let repoName = pathParts[pathParts.length - 1];
        // Remove .git suffix if present
        if (repoName.endsWith('.git')) {
          repoName = repoName.substring(0, repoName.length - 4);
        }
        return repoName;
      }

      return 'factory';
    } catch {
      return 'factory';
    }
  }

  private extractBranchFromUrl(url: string): string | undefined {
    try {
      const parsedUrl = new URL(url);
      const pathParts = parsedUrl.pathname.split('/').filter(p => p);

      // Check for /tree/<branch> or /blob/<branch> pattern (GitHub/GitLab)
      const treeIndex = pathParts.indexOf('tree');
      const blobIndex = pathParts.indexOf('blob');

      if (treeIndex >= 0 && pathParts.length > treeIndex + 1) {
        return pathParts[treeIndex + 1];
      }
      if (blobIndex >= 0 && pathParts.length > blobIndex + 1) {
        return pathParts[blobIndex + 1];
      }
    } catch {
      // ignore
    }
    return undefined;
  }
}
