/*
 * Copyright (c) 2018-2025 Red Hat, Inc.
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import { getKubeConfig } from '../helpers/getKubernetesClient';
import { UserProfileService } from '../services/UserProfileService';

interface NamespacedParams {
  namespace: string;
}

/**
 * Register User Profile routes
 *
 * Provides endpoints to get user profile information.
 */
export async function registerUserProfileRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * GET /api/user/id
   *
   * Get current user ID (UUID)
   *
   * This endpoint returns the UUID of the currently authenticated user.
   * Compatible with Eclipse Che Server API: https://github.com/eclipse-che/che-server
   *
   * @returns {string} User UUID (e.g., "d4810a4f-169f-4da5-a8e0-d8dff7ecf959")
   */
  fastify.get(
    '/user/id',
    {
      schema: {
        tags: ['user'],
        summary: 'Get current user ID (UUID)',
        description:
          'Returns the UUID of the currently authenticated user. This is extracted from the JWT sub claim or provided in the authentication token.',
        security: [{ BearerAuth: [] }],
        response: {
          200: {
            description: 'User UUID',
            type: 'string',
            examples: ['d4810a4f-169f-4da5-a8e0-d8dff7ecf959'],
          },
          401: {
            description: 'Unauthorized',
            type: 'object',
            properties: {
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
      onRequest: [fastify.authenticate, fastify.requireAuth],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        if (!request.subject) {
          return reply.code(401).send({
            error: 'Unauthorized',
            message: 'Authentication required',
          });
        }

        // Return the user ID (UUID) from the authenticated subject
        // This is extracted from JWT sub claim or provided in Bearer token format: uuid:username
        return reply.code(200).send(request.subject.id);
      } catch (error: any) {
        fastify.log.error({ error }, 'Error getting user ID');
        return reply.code(500).send({
          error: 'Internal Server Error',
          message: error.message || 'Failed to get user ID',
        });
      }
    },
  );

  /**
   * GET /api/userprofile/:namespace
   *
   * Get user profile from a namespace
   */
  fastify.get<{ Params: NamespacedParams }>(
    '/userprofile/:namespace',
    {
      schema: {
        tags: ['user-profile'],
        summary: 'Get user profile',
        description: 'Get user profile information (username, email) from a namespace',
        params: {
          type: 'object',
          properties: {
            namespace: { type: 'string' },
          },
          required: ['namespace'],
        },
        security: [{ BearerAuth: [] }],
        response: {
          200: {
            description: 'User profile',
            type: 'object',
            properties: {
              username: { type: 'string' },
              email: { type: 'string' },
            },
          },
          401: {
            description: 'Unauthorized',
            type: 'object',
            properties: {
              error: { type: 'string' },
            },
          },
          404: {
            description: 'User profile not found',
            type: 'object',
            properties: {
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
          500: {
            description: 'Internal Server Error',
            type: 'object',
            properties: {
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
      onRequest: [fastify.authenticate, fastify.requireAuth],
    },
    async (request: FastifyRequest<{ Params: NamespacedParams }>, reply: FastifyReply) => {
      try {
        if (!request.subject) {
          return reply.code(401).send({ error: 'Unauthorized' });
        }

        const { namespace } = request.params;
        const kubeConfig = getKubeConfig(request.subject.token);
        const service = new UserProfileService(kubeConfig);

        const profile = await service.getUserProfile(namespace);
        return reply.code(200).send(profile);
      } catch (error: any) {
        // Check if it's a 404 (Secret not found)
        if (error.statusCode === 404 || error.response?.statusCode === 404) {
          return reply.code(404).send({
            error: 'Not Found',
            message: 'User profile not found in this namespace',
          });
        }

        fastify.log.error({ error }, 'Error getting user profile');
        return reply.code(error.statusCode || 500).send({
          error: 'Internal Server Error',
          message: error.message || 'Failed to get user profile',
        });
      }
    },
  );
}
