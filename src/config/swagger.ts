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

/**
 * Swagger/OpenAPI configuration for Fastify
 *
 * Configures @fastify/swagger and @fastify/swagger-ui plugins
 * Using dynamic mode similar to Eclipse Che Dashboard
 */
import { FastifyInstance } from 'fastify';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';

import { logger } from '../utils/logger';

const ROUTE_PREFIX = '/swagger';

type MySchema = {
  headers?: {
    properties?: {
      authorization?: string;
    };
  };
};

/**
 * Register Swagger plugins with Fastify in dynamic mode
 */
export async function setupSwagger(fastify: FastifyInstance): Promise<void> {
  logger.info(`Che Server swagger is running on "${ROUTE_PREFIX}".`);

  await fastify.register(fastifySwagger, {
    mode: 'dynamic',
    openapi: {
      openapi: '3.0.0',
      info: {
        title: 'Eclipse Che Server API',
        description:
          'API for Eclipse Che Server - Namespace Provisioning, Factory Resolution, and SCM Integration',
        version: '1.0.0',
      },
      servers: [
        {
          url: 'http://localhost:8080',
          description: 'Development server',
        },
      ],
      components: {
        securitySchemes: {
          BearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'Bearer token authentication',
          },
          BasicAuth: {
            type: 'http',
            scheme: 'basic',
            description: 'Basic authentication',
          },
        },
      },
    },
    hideUntagged: false,
    transform: ({ schema, url }) => {
      const mySchema = schema as MySchema;
      // Remove authorization header from schema to avoid duplication
      if (mySchema?.headers?.properties?.authorization) {
        delete mySchema.headers.properties.authorization;
      }
      return { schema: mySchema, url };
    },
  });

  await fastify.register(fastifySwaggerUi, {
    routePrefix: ROUTE_PREFIX,
    uiConfig: {
      tryItOutEnabled: true,
      validatorUrl: null,
      layout: 'BaseLayout',
      deepLinking: true,
      displayRequestDuration: true,
      filter: true,
      syntaxHighlight: {
        activate: true,
        theme: 'monokai',
      },
    },
  });
}
