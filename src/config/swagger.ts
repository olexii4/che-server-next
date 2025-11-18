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
 */
import { FastifyInstance } from 'fastify';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import * as fs from 'fs';
import * as path from 'path';
import * as YAML from 'yamljs';

/**
 * Register Swagger plugins with Fastify
 */
export async function setupSwagger(fastify: FastifyInstance): Promise<void> {
  // Load OpenAPI spec from YAML file (from source directory)
  // Use src/swagger path instead of dist/swagger since YAML files aren't compiled
  const openApiPath = path.join(__dirname, '../../src/swagger/openapi.yaml');
  const openApiSpec = YAML.load(openApiPath);

  // Register @fastify/swagger plugin
  await fastify.register(fastifySwagger, {
    mode: 'static',
    specification: {
      document: openApiSpec,
    },
  });

  // Register @fastify/swagger-ui plugin
  await fastify.register(fastifySwaggerUi, {
    routePrefix: '/swagger',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
      displayRequestDuration: true,
      filter: true,
      showExtensions: true,
      showCommonExtensions: true,
      syntaxHighlight: {
        activate: true,
        theme: 'monokai',
      },
    },
    staticCSP: true,
    transformStaticCSP: header => header,
    transformSpecification: (swaggerObject, req, reply) => {
      return swaggerObject;
    },
    transformSpecificationClone: true,
  });
}

/**
 * Get OpenAPI specification as JSON
 */
export function getOpenApiSpec(): any {
  const openApiPath = path.join(__dirname, '../../src/swagger/openapi.yaml');
  return YAML.load(openApiPath);
}
