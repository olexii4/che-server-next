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
import { getServiceAccountToken } from '../helpers/getServiceAccountToken';
import { DevWorkspaceTemplate, PatchOperation } from '../models/DevWorkspaceModels';
import { DevWorkspaceTemplateService } from '../services/DevWorkspaceTemplateService';

interface NamespacedParams {
  namespace: string;
}

interface NamespacedTemplateParams extends NamespacedParams {
  templateName: string;
}

interface TemplateBody {
  template: DevWorkspaceTemplate;
}

/**
 * Register DevWorkspaceTemplate routes
 *
 * Provides CRUD operations for DevWorkspaceTemplate custom resources.
 * Note: DELETE operation is excluded (only available in local-run mode in dashboard-backend).
 */
export async function registerDevWorkspaceTemplateRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * GET /api/namespace/:namespace/devworkspacetemplates
   *
   * List all DevWorkspaceTemplates in a namespace
   */
  fastify.get<{ Params: NamespacedParams }>(
    '/namespace/:namespace/devworkspacetemplates',
    {
      schema: {
        tags: ['devworkspace-template'],
        summary: 'List DevWorkspaceTemplates in namespace',
        description: 'Get all DevWorkspaceTemplates in the specified namespace',
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
            description: 'List of DevWorkspaceTemplates',
            type: 'array',
            items: { type: 'object' },
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

        // Use service account token for DevWorkspaceTemplate operations
        const serviceAccountToken = getServiceAccountToken();
        if (!serviceAccountToken) {
          return reply.code(500).send({
            error: 'Internal Server Error',
            message: 'Service account token not available',
          });
        }

        const kubeConfig = getKubeConfig(serviceAccountToken);
        const service = new DevWorkspaceTemplateService(kubeConfig);

        const templates = await service.listInNamespace(namespace);
        return reply
          .code(200)
          .header('Content-Type', 'application/json')
          .send(JSON.stringify(templates));
      } catch (error: any) {
        fastify.log.error({ error }, 'Error listing DevWorkspaceTemplates');
        return reply.code(error.statusCode || 500).send({
          error: 'Internal Server Error',
          message: error.message || 'Failed to list DevWorkspaceTemplates',
        });
      }
    },
  );

  /**
   * GET /api/namespace/:namespace/devworkspacetemplates/:templateName
   *
   * Get a specific DevWorkspaceTemplate by name
   */
  fastify.get<{ Params: NamespacedTemplateParams }>(
    '/namespace/:namespace/devworkspacetemplates/:templateName',
    {
      schema: {
        tags: ['devworkspace-template'],
        summary: 'Get DevWorkspaceTemplate',
        description: 'Get a specific DevWorkspaceTemplate by name',
        params: {
          type: 'object',
          properties: {
            namespace: { type: 'string' },
            templateName: { type: 'string' },
          },
          required: ['namespace', 'templateName'],
        },
        security: [{ BearerAuth: [] }],
        response: {
          200: {
            description: 'DevWorkspaceTemplate details',
            type: 'object',
          },
        },
      },
      onRequest: [fastify.authenticate, fastify.requireAuth],
    },
    async (request: FastifyRequest<{ Params: NamespacedTemplateParams }>, reply: FastifyReply) => {
      try {
        if (!request.subject) {
          return reply.code(401).send({ error: 'Unauthorized' });
        }

        const { namespace, templateName } = request.params;

        // Use service account token for DevWorkspaceTemplate operations
        const serviceAccountToken = getServiceAccountToken();
        if (!serviceAccountToken) {
          return reply.code(500).send({
            error: 'Internal Server Error',
            message: 'Service account token not available',
          });
        }

        const kubeConfig = getKubeConfig(serviceAccountToken);
        const service = new DevWorkspaceTemplateService(kubeConfig);

        const template = await service.getByName(namespace, templateName);
        return reply
          .code(200)
          .header('Content-Type', 'application/json')
          .send(JSON.stringify(template));
      } catch (error: any) {
        fastify.log.error({ error }, 'Error getting DevWorkspaceTemplate');
        return reply.code(error.statusCode || 500).send({
          error: 'Internal Server Error',
          message: error.message || 'Failed to get DevWorkspaceTemplate',
        });
      }
    },
  );

  /**
   * POST /api/namespace/:namespace/devworkspacetemplates
   *
   * Create a new DevWorkspaceTemplate
   */
  fastify.post<{ Params: NamespacedParams; Body: TemplateBody }>(
    '/namespace/:namespace/devworkspacetemplates',
    {
      schema: {
        tags: ['devworkspace-template'],
        summary: 'Create DevWorkspaceTemplate',
        description: 'Create a new DevWorkspaceTemplate in the specified namespace',
        params: {
          type: 'object',
          properties: {
            namespace: { type: 'string' },
          },
          required: ['namespace'],
        },
        body: {
          type: 'object',
          properties: {
            template: { type: 'object' },
          },
          required: ['template'],
        },
        security: [{ BearerAuth: [] }],
        response: {
          201: {
            description: 'DevWorkspaceTemplate created',
            type: 'object',
          },
        },
      },
      onRequest: [fastify.authenticate, fastify.requireAuth],
    },
    async (
      request: FastifyRequest<{ Params: NamespacedParams; Body: TemplateBody }>,
      reply: FastifyReply,
    ) => {
      try {
        if (!request.subject) {
          return reply.code(401).send({ error: 'Unauthorized' });
        }

        const { namespace } = request.params;
        const { template } = request.body;

        // Use service account token for DevWorkspaceTemplate operations
        const serviceAccountToken = getServiceAccountToken();
        if (!serviceAccountToken) {
          return reply.code(500).send({
            error: 'Internal Server Error',
            message: 'Service account token not available',
          });
        }

        const kubeConfig = getKubeConfig(serviceAccountToken);
        const service = new DevWorkspaceTemplateService(kubeConfig);

        const created = await service.create(namespace, template);
        return reply
          .code(201)
          .header('Content-Type', 'application/json')
          .send(JSON.stringify(created));
      } catch (error: any) {
        fastify.log.error({ error }, 'Error creating DevWorkspaceTemplate');
        return reply.code(error.statusCode || 500).send({
          error: 'Internal Server Error',
          message: error.message || 'Failed to create DevWorkspaceTemplate',
        });
      }
    },
  );

  /**
   * PATCH /api/namespace/:namespace/devworkspacetemplates/:templateName
   *
   * Update a DevWorkspaceTemplate using JSON Patch
   */
  fastify.patch<{ Params: NamespacedTemplateParams; Body: PatchOperation[] }>(
    '/namespace/:namespace/devworkspacetemplates/:templateName',
    {
      schema: {
        tags: ['devworkspace-template'],
        summary: 'Update DevWorkspaceTemplate',
        description: 'Update a DevWorkspaceTemplate using JSON Patch operations',
        params: {
          type: 'object',
          properties: {
            namespace: { type: 'string' },
            templateName: { type: 'string' },
          },
          required: ['namespace', 'templateName'],
        },
        body: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              op: { type: 'string', enum: ['add', 'remove', 'replace', 'move', 'copy', 'test'] },
              path: { type: 'string' },
              value: {},
              from: { type: 'string' },
            },
            required: ['op', 'path'],
          },
        },
        security: [{ BearerAuth: [] }],
        response: {
          200: {
            description: 'DevWorkspaceTemplate updated',
            type: 'object',
          },
        },
      },
      onRequest: [fastify.authenticate, fastify.requireAuth],
    },
    async (
      request: FastifyRequest<{ Params: NamespacedTemplateParams; Body: PatchOperation[] }>,
      reply: FastifyReply,
    ) => {
      try {
        if (!request.subject) {
          return reply.code(401).send({ error: 'Unauthorized' });
        }

        const { namespace, templateName } = request.params;
        const patch = request.body;

        // Use service account token for DevWorkspaceTemplate operations
        const serviceAccountToken = getServiceAccountToken();
        if (!serviceAccountToken) {
          return reply.code(500).send({
            error: 'Internal Server Error',
            message: 'Service account token not available',
          });
        }

        const kubeConfig = getKubeConfig(serviceAccountToken);
        const service = new DevWorkspaceTemplateService(kubeConfig);

        const updated = await service.patch(namespace, templateName, patch);
        return reply
          .code(200)
          .header('Content-Type', 'application/json')
          .send(JSON.stringify(updated));
      } catch (error: any) {
        fastify.log.error({ error }, 'Error patching DevWorkspaceTemplate');
        return reply.code(error.statusCode || 500).send({
          error: 'Internal Server Error',
          message: error.message || 'Failed to patch DevWorkspaceTemplate',
        });
      }
    },
  );

  // Note: DELETE endpoint is NOT implemented as it's only available in local-run mode
  // in the original dashboard-backend implementation
}
