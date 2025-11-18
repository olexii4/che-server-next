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
  OAuthToken,
  OAuthAuthenticatorDescriptor,
  OAuthProviderConfig,
  OAUTH_CONSTANTS,
} from '../models/OAuthModels';
import { logger } from '../utils/logger';

/**
 * OAuth Service - Manages OAuth authentication and token operations
 *
 * Based on: org.eclipse.che.security.oauth.OAuthAPI
 */
export class OAuthService {
  private tokens: Map<string, Map<string, OAuthToken>> = new Map(); // userId -> provider -> token
  private providers: Map<string, OAuthProviderConfig> = new Map();

  constructor() {
    // Register default OAuth providers
    this.registerProvider({
      name: OAUTH_CONSTANTS.PROVIDERS.GITHUB,
      authorizationEndpoint: 'https://github.com/login/oauth/authorize',
      tokenEndpoint: 'https://github.com/login/oauth/access_token',
      scopes: ['repo', 'user', 'write:public_key'],
    });

    this.registerProvider({
      name: OAUTH_CONSTANTS.PROVIDERS.GITLAB,
      authorizationEndpoint: 'https://gitlab.com/oauth/authorize',
      tokenEndpoint: 'https://gitlab.com/oauth/token',
      scopes: ['api', 'read_user', 'read_repository'],
    });

    this.registerProvider({
      name: OAUTH_CONSTANTS.PROVIDERS.BITBUCKET,
      authorizationEndpoint: 'https://bitbucket.org/site/oauth2/authorize',
      tokenEndpoint: 'https://bitbucket.org/site/oauth2/access_token',
      scopes: ['repository', 'account'],
    });

    this.registerProvider({
      name: OAUTH_CONSTANTS.PROVIDERS.AZURE_DEVOPS,
      authorizationEndpoint: 'https://app.vssps.visualstudio.com/oauth2/authorize',
      tokenEndpoint: 'https://app.vssps.visualstudio.com/oauth2/token',
      scopes: ['vso.code', 'vso.code_write'],
    });
  }

  /**
   * Register an OAuth provider
   *
   * @param config - OAuth provider configuration
   */
  registerProvider(config: OAuthProviderConfig): void {
    this.providers.set(config.name, config);
  }

  /**
   * Get list of registered OAuth authenticators
   *
   * @returns Array of OAuth authenticator descriptors
   */
  getRegisteredAuthenticators(): OAuthAuthenticatorDescriptor[] {
    const descriptors: OAuthAuthenticatorDescriptor[] = [];
    const apiEndpoint = process.env.CHE_API_ENDPOINT || 'http://localhost:8080';

    this.providers.forEach((config, name) => {
      // Get the base endpoint URL (without /oauth/authorize path)
      let endpointUrl = config.authorizationEndpoint;

      // Extract base URL for display
      if (name === 'github') {
        endpointUrl = 'https://github.com';
      } else if (name === 'gitlab') {
        endpointUrl = 'https://gitlab.com';
      } else if (name === 'bitbucket') {
        endpointUrl = 'https://bitbucket.org';
      } else if (name === 'azure-devops') {
        endpointUrl = 'https://dev.azure.com';
      }

      descriptors.push({
        name: name,
        endpointUrl: endpointUrl,
        links: [
          {
            method: 'GET',
            parameters: [
              {
                name: 'oauth_provider',
                defaultValue: name,
                required: true,
                valid: [],
              },
              {
                name: 'mode',
                defaultValue: 'federated_login',
                required: true,
                valid: [],
              },
            ],
            rel: 'Authenticate URL',
            href: `${apiEndpoint}/api/oauth/authenticate`,
          },
        ],
      });
    });

    return descriptors;
  }

  /**
   * Get or refresh OAuth token for user
   *
   * @param userId - User ID
   * @param oauthProvider - OAuth provider name
   * @returns OAuth token or null if not found
   * @throws Error if provider not found
   */
  async getOrRefreshToken(userId: string, oauthProvider: string): Promise<OAuthToken | null> {
    if (!oauthProvider) {
      throw new Error(OAUTH_CONSTANTS.ERRORS.PROVIDER_REQUIRED);
    }

    // Check if provider exists
    if (!this.providers.has(oauthProvider)) {
      throw new Error(OAUTH_CONSTANTS.ERRORS.PROVIDER_NOT_FOUND);
    }

    // Get user's tokens
    const userTokens = this.tokens.get(userId);
    if (!userTokens) {
      return null;
    }

    // Get token for this provider
    const token = userTokens.get(oauthProvider);
    if (!token) {
      return null;
    }

    return token;
  }

  /**
   * Store OAuth token for user
   *
   * @param userId - User ID
   * @param oauthProvider - OAuth provider name
   * @param token - OAuth token
   */
  storeToken(userId: string, oauthProvider: string, token: OAuthToken): void {
    if (!this.tokens.has(userId)) {
      this.tokens.set(userId, new Map());
    }

    const userTokens = this.tokens.get(userId)!;
    userTokens.set(oauthProvider, token);

    logger.info(`Stored OAuth token for user ${userId} and provider ${oauthProvider}`);
  }

  /**
   * Invalidate OAuth token for user
   *
   * @param userId - User ID
   * @param oauthProvider - OAuth provider name
   * @throws Error if provider or token not found
   */
  invalidateToken(userId: string, oauthProvider: string): void {
    if (!oauthProvider) {
      throw new Error(OAUTH_CONSTANTS.ERRORS.PROVIDER_REQUIRED);
    }

    const userTokens = this.tokens.get(userId);
    if (!userTokens) {
      throw new Error(OAUTH_CONSTANTS.ERRORS.TOKEN_NOT_FOUND);
    }

    if (!userTokens.has(oauthProvider)) {
      throw new Error(OAUTH_CONSTANTS.ERRORS.TOKEN_NOT_FOUND);
    }

    userTokens.delete(oauthProvider);
    logger.info(`Invalidated OAuth token for user ${userId} and provider ${oauthProvider}`);
  }

  /**
   * Check if user has token for provider
   *
   * @param userId - User ID
   * @param oauthProvider - OAuth provider name
   * @returns true if token exists
   */
  hasToken(userId: string, oauthProvider: string): boolean {
    const userTokens = this.tokens.get(userId);
    if (!userTokens) {
      return false;
    }
    return userTokens.has(oauthProvider);
  }

  /**
   * Generate a mock OAuth token for testing
   *
   * @param oauthProvider - OAuth provider name
   * @returns Mock OAuth token
   */
  generateMockToken(oauthProvider: string): OAuthToken {
    const provider = this.providers.get(oauthProvider);
    const scopes = provider?.scopes.join(' ') || 'read';

    return {
      token: `gho_${Date.now()}_${Math.random().toString(36).substring(2)}`,
      scope: scopes,
    };
  }
}
