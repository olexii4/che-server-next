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

import { logger } from '../utils/logger';

/**
 * Register Air Gap Sample routes
 *
 * These routes provide sample projects for air-gapped environments.
 * In che-server-next, we return empty array as samples are managed externally.
 */
export async function registerAirGapSampleRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * GET /api/airgap-sample
   * List air gap samples
   */
  fastify.get(
    '/airgap-sample',
    {
      schema: {
        description: 'List air gap sample projects',
        tags: ['Air Gap Samples'],
        response: {
          200: {
            description: 'List of air gap samples (empty in che-server-next)',
            type: 'array',
            items: {
              type: 'object',
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        // In che-server-next, air gap samples are not used
        // The dashboard will fall back to external registries
        logger.info('Air gap samples requested - returning empty array');
        return reply.code(200).send([]);
      } catch (error) {
        logger.error({ error }, 'Error listing air gap samples');
        return reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to list air gap samples',
        });
      }
    },
  );
}

