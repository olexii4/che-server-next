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

import Fastify from 'fastify';
import fastifyCors from '@fastify/cors';
import dotenv from 'dotenv';
import { authenticate, requireAuth } from './middleware/auth';
import { registerNamespaceRoutes } from './routes/namespaceRoutes';
import { registerFactoryRoutes } from './routes/factoryRoutes';
import { registerOAuthRoutes } from './routes/oauthRoutes';
import { registerScmRoutes } from './routes/scmRoutes';
import { setupSwagger } from './config/swagger';

// Load environment variables
dotenv.config();

// Create Fastify instance
const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    transport:
      process.env.NODE_ENV === 'development'
        ? {
            target: 'pino-pretty',
            options: {
              translateTime: 'HH:MM:ss Z',
              ignore: 'pid,hostname',
            },
          }
        : undefined,
  },
});

const PORT = Number(process.env.PORT) || 8080;
const HOST = process.env.HOST || '0.0.0.0';

// Register plugins and routes
async function start() {
  try {
    // Register CORS
    await fastify.register(fastifyCors, {
      origin: true,
    });

    // Register authentication hooks as decorators
    fastify.decorate('authenticate', authenticate);
    fastify.decorate('requireAuth', requireAuth);

    // Setup Swagger/OpenAPI documentation
    await setupSwagger(fastify);

    // Health check endpoint
    fastify.get(
      '/health',
      {
        schema: {
          tags: ['health'],
          summary: 'Health check',
          description: 'Check if the API is running',
          response: {
            200: {
              description: 'Service is healthy',
              type: 'object',
              properties: {
                status: { type: 'string' },
                timestamp: { type: 'string' },
              },
            },
          },
        },
      },
      async (request, reply) => {
        return reply.code(200).send({
          status: 'ok',
          timestamp: new Date().toISOString(),
        });
      }
    );

    // Register route modules
    await registerNamespaceRoutes(fastify);
    await registerFactoryRoutes(fastify);
    await registerOAuthRoutes(fastify);
    await registerScmRoutes(fastify);

    // Global error handler
    fastify.setErrorHandler((error: Error & { statusCode?: number }, request, reply) => {
      fastify.log.error(error);

      reply.status(error.statusCode || 500).send({
        error: error.name || 'Internal Server Error',
        message: error.message,
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
      });
    });

    // 404 handler
    fastify.setNotFoundHandler((request, reply) => {
      reply.status(404).send({
        error: 'Not Found',
        message: `Route ${request.method} ${request.url} not found`,
      });
    });

    // Start the server
    await fastify.listen({ port: PORT, host: HOST });

    console.log(`\n🚀 Kubernetes Namespace Provisioner API (Fastify) is running on port ${PORT}`);
    console.log(`\n📚 API Documentation:`);
    console.log(`   Swagger UI: http://localhost:${PORT}/swagger`);
    console.log(`   OpenAPI JSON: http://localhost:${PORT}/swagger/json`);
    console.log(`   OpenAPI YAML: http://localhost:${PORT}/swagger/yaml`);
    console.log(`\n🔗 Endpoints:`);
    console.log(`   POST http://localhost:${PORT}/kubernetes/namespace/provision`);
    console.log(`   GET  http://localhost:${PORT}/kubernetes/namespace`);
    console.log(`   POST http://localhost:${PORT}/factory/resolver`);
    console.log(`   POST http://localhost:${PORT}/factory/token/refresh`);
    console.log(`   GET  http://localhost:${PORT}/oauth`);
    console.log(`   GET  http://localhost:${PORT}/oauth/token`);
    console.log(`   DELETE http://localhost:${PORT}/oauth/token`);
    console.log(`   GET  http://localhost:${PORT}/scm/resolve`);
    console.log(`   GET  http://localhost:${PORT}/health\n`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

// Handle shutdown gracefully
['SIGINT', 'SIGTERM'].forEach(signal => {
  process.on(signal, async () => {
    fastify.log.info('Shutting down gracefully...');
    await fastify.close();
    process.exit(0);
  });
});

// Start the application
start();

export default fastify;
