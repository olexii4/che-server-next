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

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { OAuthService } from '../services/OAuthService';

/**
 * Register OAuth routes
 * 
 * Based on: org.eclipse.che.security.oauth.OAuthAuthenticationService
 */
export async function registerOAuthRoutes(fastify: FastifyInstance): Promise<void> {
  // Initialize service
  const oauthService = new OAuthService();
  
  /**
   * GET /oauth
   * 
   * Gets list of installed OAuth authenticators.
   */
  fastify.get('/oauth', {
    schema: {
      tags: ['oauth'],
      summary: 'Get registered OAuth authenticators',
      description: 'Gets list of installed OAuth authenticators',
      security: [
        { BearerAuth: [] },
        { BasicAuth: [] }
      ],
      response: {
        200: {
          description: 'List of registered OAuth authenticators',
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              endpointUrl: { type: 'string' },
              links: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    rel: { type: 'string' },
                    href: { type: 'string' }
                  }
                }
              }
            }
          }
        },
        401: {
          description: 'Unauthorized',
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' }
          }
        },
        500: {
          description: 'Internal Server Error',
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' }
          }
        }
      }
    },
    onRequest: [
      fastify.authenticate,
      fastify.requireAuth
    ]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const authenticators = oauthService.getRegisteredAuthenticators();
      return reply.code(200).send(authenticators);
    } catch (error: any) {
      fastify.log.error('Error getting OAuth authenticators:', error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: error.message || 'Failed to get OAuth authenticators'
      });
    }
  });
  
  /**
   * GET /oauth/token
   * 
   * Gets OAuth token for the authenticated user.
   */
  fastify.get('/oauth/token', {
    schema: {
      tags: ['oauth'],
      summary: 'Get OAuth token',
      description: 'Gets OAuth token for the authenticated user and specified provider',
      security: [
        { BearerAuth: [] },
        { BasicAuth: [] }
      ],
      querystring: {
        type: 'object',
        required: ['oauth_provider'],
        properties: {
          oauth_provider: {
            type: 'string',
            description: 'OAuth provider name',
            enum: ['github', 'gitlab', 'bitbucket', 'azure-devops']
          }
        }
      },
      response: {
        200: {
          description: 'OAuth token successfully retrieved',
          type: 'object',
          properties: {
            token: { type: 'string' },
            scope: { type: 'string' }
          }
        },
        400: {
          description: 'Bad Request',
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' }
          }
        },
        401: {
          description: 'Unauthorized',
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' }
          }
        },
        404: {
          description: 'OAuth provider not found',
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' }
          }
        },
        500: {
          description: 'Internal Server Error',
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' }
          }
        }
      }
    },
    onRequest: [
      fastify.authenticate,
      fastify.requireAuth
    ]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Ensure user is authenticated
      if (!request.subject) {
        return reply.code(401).send({
          error: 'Unauthorized',
          message: 'Authentication required'
        });
      }
      
      // Get oauth_provider from query
      const query = request.query as any;
      const oauthProvider = query.oauth_provider;
      
      if (!oauthProvider) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'OAuth provider is required'
        });
      }
      
      // Get token
      const token = await oauthService.getOrRefreshToken(request.subject.userId, oauthProvider);
      
      if (!token) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'OAuth provider not found'
        });
      }
      
      return reply.code(200).send(token);
      
    } catch (error: any) {
      fastify.log.error('Error getting OAuth token:', error);
      
      if (error.message?.includes('not found')) {
        return reply.code(404).send({
          error: 'Not Found',
          message: error.message
        });
      }
      
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: error.message || 'Failed to get OAuth token'
      });
    }
  });
  
  /**
   * DELETE /oauth/token
   * 
   * Invalidates OAuth token for the authenticated user.
   */
  fastify.delete('/oauth/token', {
    schema: {
      tags: ['oauth'],
      summary: 'Invalidate OAuth token',
      description: 'Invalidates (deletes) OAuth token for the authenticated user and specified provider',
      security: [
        { BearerAuth: [] },
        { BasicAuth: [] }
      ],
      querystring: {
        type: 'object',
        required: ['oauth_provider'],
        properties: {
          oauth_provider: {
            type: 'string',
            description: 'OAuth provider name',
            enum: ['github', 'gitlab', 'bitbucket', 'azure-devops']
          }
        }
      },
      response: {
        204: {
          description: 'OAuth token successfully invalidated',
          type: 'null'
        },
        400: {
          description: 'Bad Request',
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' }
          }
        },
        401: {
          description: 'Unauthorized',
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' }
          }
        },
        404: {
          description: 'OAuth token not found',
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' }
          }
        },
        500: {
          description: 'Internal Server Error',
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' }
          }
        }
      }
    },
    onRequest: [
      fastify.authenticate,
      fastify.requireAuth
    ]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Ensure user is authenticated
      if (!request.subject) {
        return reply.code(401).send({
          error: 'Unauthorized',
          message: 'Authentication required'
        });
      }
      
      // Get oauth_provider from query
      const query = request.query as any;
      const oauthProvider = query.oauth_provider;
      
      if (!oauthProvider) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'OAuth provider is required'
        });
      }
      
      // Invalidate token
      await oauthService.invalidateToken(request.subject.userId, oauthProvider);
      
      return reply.code(204).send();
      
    } catch (error: any) {
      fastify.log.error('Error invalidating OAuth token:', error);
      
      if (error.message?.includes('not found')) {
        return reply.code(404).send({
          error: 'Not Found',
          message: error.message
        });
      }
      
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: error.message || 'Failed to invalidate OAuth token'
      });
    }
  });
}
