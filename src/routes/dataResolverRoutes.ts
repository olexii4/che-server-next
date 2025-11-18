/**
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
import { axiosInstance, axiosInstanceNoCert } from '../helpers/getCertificateAuthority';
import { AxiosResponse } from 'axios';

const config = {
  headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET' },
};

interface DataResolverBody {
  url: string;
}

/**
 * Register the data resolver route
 * This endpoint acts as a proxy to fetch data from external URLs,
 * solving CORS issues and handling self-signed certificates
 */
export async function registerDataResolverRoutes(fastify: FastifyInstance) {
  fastify.post<{ Body: DataResolverBody }>(
    '/data/resolver',
    {
      schema: {
        tags: ['Data Resolver'],
        description: 'Resolve data from external URLs (proxy endpoint to solve CORS issues)',
        body: {
          type: 'object',
          required: ['url'],
          properties: {
            url: {
              type: 'string',
              description: 'URL to fetch data from',
            },
          },
        },
        response: {
          200: {
            description: 'Data fetched successfully',
            type: 'string',
            example: `schemaVersion: 2.1.0
metadata:
  name: che-dashboard
  description: Eclipse Che Dashboard`,
          },
          400: {
            description: 'Bad Request',
            type: 'object',
            properties: {
              error: { type: 'string' },
              message: { type: 'string' },
            },
            example: {
              error: 'Bad Request',
              message: 'URL parameter is required',
            },
          },
          404: {
            description: 'Resource not found',
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
    },
    async (request: FastifyRequest<{ Body: DataResolverBody }>, reply: FastifyReply) => {
      const { url } = request.body;

      if (!url) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'URL parameter is required',
        });
      }

      try {
        let response: AxiosResponse;
        try {
          // First try without certificate validation
          response = await axiosInstanceNoCert.get(url, config);
        } catch (error: any) {
          // If 404, throw immediately (resource doesn't exist)
          if (error.response?.status === 404) {
            throw error;
          }
          // For other errors (like cert issues), retry with cert-enabled instance
          response = await axiosInstance.get(url, config);
        }
        return reply.code(200).send(response.data);
      } catch (error: any) {
        if (error.response) {
          // Forward the error response from the external server
          return reply.code(error.response.status).send({
            error: error.response.statusText || 'Error',
            message:
              error.response.data?.message || error.message || 'Failed to fetch data from URL',
          });
        }
        // Network or other errors
        return reply.code(500).send({
          error: 'Internal Server Error',
          message: `Failed to fetch data from URL: ${error.message}`,
        });
      }
    },
  );
}
