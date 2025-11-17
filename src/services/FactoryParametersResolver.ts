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

import { FactoryMeta, FactoryDevfileV2, FactoryResolverParams, FACTORY_CONSTANTS } from '../models/FactoryModels';

/**
 * Default devfile filenames to look for
 * Based on: che.factory.default_devfile_filenames
 */
export const DEFAULT_DEVFILE_FILENAMES = ['devfile.yaml', '.devfile.yaml'];

/**
 * Factory resolver priority levels
 * 
 * Based on: org.eclipse.che.api.factory.server.FactoryResolverPriority
 */
export enum FactoryResolverPriority {
  LOWEST = 0,
  DEFAULT = 5,
  HIGHEST = 10
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
    
    return DEFAULT_DEVFILE_FILENAMES.some(filename => 
      cleanUrl.endsWith(filename.toLowerCase())
    );
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
            name: this.extractNameFromUrl(url)
          }
        };
      }
      
      // Create factory with devfile v2
      const factory: FactoryDevfileV2 = {
        v: FACTORY_CONSTANTS.CURRENT_VERSION,
        devfile: devfile,
        source: this.extractSourceFromUrl(url),
        name: this.extractNameFromUrl(url)
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
        devfileFileLocation: url
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

