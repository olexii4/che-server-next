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
 * Tests for Namespace routes (Fastify)
 * 
 * Based on: KubernetesNamespaceService (Java)
 */
import Fastify, { FastifyInstance } from 'fastify';
import { registerNamespaceRoutes } from '../src/routes/namespaceRoutes';
import { authenticate, requireAuth } from '../src/middleware/auth';

describe('Namespace Routes (Fastify)', () => {
  let app: FastifyInstance;
  
  beforeEach(async () => {
    app = Fastify();
    
    // Register authentication hooks
    app.decorate('authenticate', authenticate);
    app.decorate('requireAuth', requireAuth);
    
    // Register routes
    await registerNamespaceRoutes(app);
    
    await app.ready();
  });
  
  afterEach(async () => {
    await app.close();
  });
  
  describe('POST /kubernetes/namespace/provision', () => {
    it('should provision a namespace with valid authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/kubernetes/namespace/provision',
        headers: {
          'Authorization': 'Bearer user123:johndoe'
        }
      });
      
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('name');
      expect(body).toHaveProperty('attributes');
      expect(body.name).toMatch(/^che-/);
    });
    
    it('should return 401 without authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/kubernetes/namespace/provision'
      });
      
      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('error');
      expect(body.error).toBe('Unauthorized');
    });
    
    it('should provision namespace with username-based naming', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/kubernetes/namespace/provision',
        headers: {
          'Authorization': 'Bearer user456:janedoe'
        }
      });
      
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.name).toContain('janedoe');
    });
    
    it('should work with Basic authentication', async () => {
      const credentials = Buffer.from('johndoe:user123').toString('base64');
      
      const response = await app.inject({
        method: 'POST',
        url: '/kubernetes/namespace/provision',
        headers: {
          'Authorization': `Basic ${credentials}`
        }
      });
      
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.name).toContain('johndoe');
    });
  });
  
  describe('GET /kubernetes/namespace', () => {
    it('should return list of namespaces with valid authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/kubernetes/namespace',
        headers: {
          'Authorization': 'Bearer user123:johndoe'
        }
      });
      
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(Array.isArray(body)).toBe(true);
    });
    
    it('should return 401 without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/kubernetes/namespace'
      });
      
      expect(response.statusCode).toBe(401);
    });
    
    it('should return namespaces with correct structure', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/kubernetes/namespace',
        headers: {
          'Authorization': 'Bearer user123:johndoe'
        }
      });
      
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      
      if (body.length > 0) {
        expect(body[0]).toHaveProperty('name');
        expect(body[0]).toHaveProperty('attributes');
      }
    });
  });
});
