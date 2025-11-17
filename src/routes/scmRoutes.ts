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
import { ScmService } from '../services/ScmFileResolvers';

/**
 * Register SCM routes
 * 
 * Based on: org.eclipse.che.api.factory.server.ScmService
 */
export async function registerScmRoutes(fastify: FastifyInstance): Promise<void> {
  // Initialize service
  const scmResolvers = new ScmService();
  
  /**
   * GET /scm/resolve
   * 
   * Get file content by specific repository URL and filename.
   */
  fastify.get('/scm/resolve', {
    schema: {
      tags: ['scm'],
      summary: 'Resolve file content from SCM repository',
      description: 'Get file content by specific repository URL and filename',
      security: [
        { BearerAuth: [] },
        { BasicAuth: [] }
      ],
      querystring: {
        type: 'object',
        required: ['repository', 'file'],
        properties: {
          repository: {
            type: 'string',
            description: 'Repository URL'
          },
          file: {
            type: 'string',
            description: 'File path within the repository'
          }
        }
      },
      response: {
        200: {
          description: 'File content successfully retrieved',
          type: 'string'
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
          description: 'File not found',
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
      
      // Get parameters from query
      const query = request.query as any;
      const repository = query.repository as string;
      const file = query.file as string;
      
      if (!repository) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'Repository parameter is required'
        });
      }
      
      if (!file) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'File parameter is required'
        });
      }
      
      // Resolve file content
      const content = await scmResolvers.resolveFile(repository, file);
      
      // Return file content as plain text
      return reply.type('text/plain').code(200).send(content);
      
    } catch (error: any) {
      fastify.log.error('Error resolving SCM file:', error);
      
      // Check for specific error types
      if (error.message?.includes('required')) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: error.message
        });
      }
      
      if (error.message?.includes('not found') || error.message?.includes('404')) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Requested file not found in repository'
        });
      }
      
      if (error.message?.includes('Cannot find suitable file resolver')) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: error.message
        });
      }
      
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: error.message || 'Failed to resolve file from SCM repository'
      });
    }
  });
}
