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
 * Tests for SCM routes (Fastify)
 *
 * Based on: ScmService (Java)
 */
import Fastify, { FastifyInstance } from 'fastify';
import { registerScmRoutes } from '../src/routes/scmRoutes';
import { authenticate, requireAuth } from '../src/middleware/auth';

describe('SCM Routes (Fastify)', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = Fastify();

    // Register authentication hooks
    app.decorate('authenticate', authenticate);
    app.decorate('requireAuth', requireAuth);

    // Register routes
    await registerScmRoutes(app);

    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /scm/resolve', () => {
    it('should return 400 when repository is missing', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/scm/resolve?file=devfile.yaml',
        headers: {
          Authorization: 'Bearer user123:johndoe',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.message).toContain('Repository');
    });

    it('should return 400 when file is missing', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/scm/resolve?repository=https://github.com/user/repo',
        headers: {
          Authorization: 'Bearer user123:johndoe',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.message).toContain('File');
    });

    it('should return 401 without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/scm/resolve?repository=https://github.com/user/repo&file=devfile.yaml',
      });

      expect(response.statusCode).toBe(401);
    });

    it('should resolve file from valid URL with authentication', async () => {
      // Mock fetch for testing
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue('file content here'),
      } as any);

      const response = await app.inject({
        method: 'GET',
        url: '/scm/resolve?repository=https://github.com/eclipse-che/che-server&file=devfile.yaml',
        headers: {
          Authorization: 'Bearer user123:johndoe',
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.body).toBe('file content here');
      expect(response.headers['content-type']).toContain('text/plain');
    });

    it('should return 404 when file not found', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      } as any);

      const response = await app.inject({
        method: 'GET',
        url: '/scm/resolve?repository=https://github.com/user/repo&file=non-existent.yaml',
        headers: {
          Authorization: 'Bearer user123:johndoe',
        },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.message).toContain('not found');
    });

    it('should handle network errors gracefully', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      const response = await app.inject({
        method: 'GET',
        url: '/scm/resolve?repository=https://github.com/user/repo&file=devfile.yaml',
        headers: {
          Authorization: 'Bearer user123:johndoe',
        },
      });

      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('error');
    });
  });
});
