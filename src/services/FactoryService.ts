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

import { FactoryMeta, FactoryResolverParams, FACTORY_CONSTANTS } from '../models/FactoryModels';
import { 
  FactoryParametersResolver, 
  RawDevfileUrlFactoryParameterResolver 
} from './FactoryParametersResolver';
import { PersonalAccessTokenManager } from './PersonalAccessTokenManager';
import { AuthorisationRequestManager } from './AuthorisationRequestManager';

/**
 * Factory Service - Manages factory creation and resolution
 * 
 * Based on: org.eclipse.che.api.factory.server.FactoryService
 */
export class FactoryService {
  private resolvers: FactoryParametersResolver[] = [];
  
  constructor(
    private personalAccessTokenManager: PersonalAccessTokenManager,
    private authorisationRequestManager: AuthorisationRequestManager
  ) {
    // Register default resolver
    this.registerResolver(new RawDevfileUrlFactoryParameterResolver());
  }
  
  /**
   * Register a factory parameters resolver
   * 
   * @param resolver - Factory parameters resolver to register
   */
  registerResolver(resolver: FactoryParametersResolver): void {
    this.resolvers.push(resolver);
    // Sort by priority (highest first)
    this.resolvers.sort((a, b) => b.priority() - a.priority());
  }
  
  /**
   * Resolve factory from parameters
   * 
   * @param parameters - Factory resolver parameters
   * @returns Promise resolving to factory metadata
   * @throws Error if no resolver accepts the parameters
   */
  async resolveFactory(parameters: FactoryResolverParams): Promise<FactoryMeta> {
    // Validate parameters
    if (!parameters || Object.keys(parameters).length === 0) {
      throw new Error(FACTORY_CONSTANTS.ERRORS.PARAMETERS_REQUIRED);
    }

    // console.log('>>>>>>>> Resolving factory with parameters:', parameters);
    // Find matching resolver
    const resolver = this.getFactoryParametersResolver(parameters);
    //console.log('>>>>>>>> Resolving factory with resolver:', resolver);
    // Create factory using resolver
    const factory = await resolver.createFactory(parameters);
    // console.log('>>>>>>>> Resolving factory with factory:', factory);
    if (!factory) {
      throw new Error(FACTORY_CONSTANTS.ERRORS.NOT_RESOLVABLE);
    }
    
    // Validation would happen here if validate=true
    if (parameters.validate) {
      this.validateFactory(factory);
    }
    
    // Add links (simplified version)
    this.injectLinks(factory, parameters);
    
    return factory;
  }
  
  /**
   * Refresh OAuth token for factory URL
   * 
   * @param url - Factory URL
   * @returns Promise that resolves when token is refreshed
   * @throws Error if URL is not provided or token refresh fails
   */
  async refreshToken(url: string): Promise<void> {
    // Validate URL
    if (!url) {
      throw new Error(FACTORY_CONSTANTS.ERRORS.URL_REQUIRED);
    }
    
    try {
      // Get resolver for this URL
      const resolver = this.getFactoryParametersResolver({
        [FACTORY_CONSTANTS.URL_PARAMETER_NAME]: url
      });
      
      const providerName = resolver.getProviderName();
      
      // Check if authorization was rejected
      if (this.authorisationRequestManager.isStored(providerName)) {
        console.log(`Authorization rejected for provider ${providerName}, skipping token refresh`);
        return;
      }
      
      // Parse URL to get SCM server URL
      const remoteUrl = resolver.parseFactoryUrl(url);
      const scmServerUrl = remoteUrl.providerUrl;
      
      // Check if force refresh is enabled
      const forceRefresh = process.env.CHE_FORCE_REFRESH_PERSONAL_ACCESS_TOKEN === 'true';
      
      if (forceRefresh) {
        await this.personalAccessTokenManager.forceRefreshPersonalAccessToken(scmServerUrl);
      } else {
        await this.personalAccessTokenManager.getAndStore(scmServerUrl);
      }
      
    } catch (error: any) {
      console.error('Error refreshing token:', error);
      throw new Error(`Failed to refresh token for ${url}: ${error.message}`);
    }
  }
  
  /**
   * Get factory parameters resolver for given parameters
   * 
   * @param parameters - Factory resolver parameters
   * @returns Factory parameters resolver
   * @throws Error if no resolver accepts the parameters
   */
  private getFactoryParametersResolver(parameters: FactoryResolverParams): FactoryParametersResolver {
    // Find resolver that accepts these parameters
    for (const resolver of this.resolvers) {
      try {
        if (resolver.accept(parameters)) {
          return resolver;
        }
      } catch (error) {
        // Ignore errors from accept() method
        continue;
      }
    }
    
    // Provide more specific error message if URL is present
    const url = parameters[FACTORY_CONSTANTS.URL_PARAMETER_NAME];
    if (url && typeof url === 'string') {
      // Check if URL doesn't end with valid devfile filename
      const urlLower = url.toLowerCase();
      const cleanUrl = urlLower.split('?')[0].split('#')[0];
      const validFilenames = ['devfile.yaml', '.devfile.yaml'];
      const hasValidFilename = validFilenames.some(filename => 
        cleanUrl.endsWith(filename.toLowerCase())
      );
      
      if (!hasValidFilename) {
        throw new Error(
          `Invalid devfile URL. URL must end with one of: ${validFilenames.join(', ')}. Got: ${url}`
        );
      }
    }
    
    throw new Error(FACTORY_CONSTANTS.ERRORS.NOT_RESOLVABLE);
  }
  
  /**
   * Validate factory (simplified version)
   * 
   * @param factory - Factory to validate
   * @throws Error if factory is invalid
   */
  private validateFactory(factory: FactoryMeta): void {
    if (!factory.v) {
      throw new Error('Factory version is required');
    }
    
    // Add more validation as needed
    console.log('Factory validation passed');
  }
  
  /**
   * Inject links into factory (simplified version)
   * 
   * @param factory - Factory to inject links into
   * @param parameters - Original parameters
   */
  private injectLinks(factory: FactoryMeta, parameters: FactoryResolverParams): void {
    // In a real implementation, this would add HAL links
    factory.links = [
      {
        rel: 'self',
        href: `/factory/resolver?url=${encodeURIComponent(parameters[FACTORY_CONSTANTS.URL_PARAMETER_NAME] as string || '')}`
      }
    ];
  }
}

