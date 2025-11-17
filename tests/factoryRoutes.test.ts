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
 * Tests for Factory routes (Fastify)
 * 
 * Based on: FactoryService (Java)
 */
import Fastify, { FastifyInstance } from 'fastify';
import { registerFactoryRoutes } from '../src/routes/factoryRoutes';
import { authenticate, requireAuth } from '../src/middleware/auth';

describe('Factory Routes (Fastify)', () => {
  let app: FastifyInstance;
  
  beforeEach(async () => {
    app = Fastify();
    
    // Register authentication hooks
    app.decorate('authenticate', authenticate);
    app.decorate('requireAuth', requireAuth);
    
    // Register routes
    await registerFactoryRoutes(app);
    
    await app.ready();
  });
  
  afterEach(async () => {
    await app.close();
  });
  
  describe('POST /factory/resolver', () => {
    it('should return 401 without authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/factory/resolver',
        payload: {
          url: 'https://raw.githubusercontent.com/eclipse-che/che-server/main/devfile.yaml'
        }
      });
      
      expect(response.statusCode).toBe(401);
    });
    
    it('should resolve factory from valid devfile URL with authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/factory/resolver',
        headers: {
          'Authorization': 'Bearer user123:johndoe',
          'Content-Type': 'application/json'
        },
        payload: {
          url: 'https://raw.githubusercontent.com/eclipse-che/che-server/main/devfile.yaml'
        }
      });
      
      const body = JSON.parse(response.body);
      console.log('Response status:', response.statusCode);
      console.log('Response body:', JSON.stringify(body, null, 2));
      
      expect(response.statusCode).toBe(200);
      expect(body).toHaveProperty('v');
      expect(body).toHaveProperty('source');
    });
    
    it('should return 400 when URL is missing', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/factory/resolver',
        headers: {
          'Authorization': 'Bearer user123:johndoe',
          'Content-Type': 'application/json'
        },
        payload: {}
      });
      
      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('error');
    });
    
    it('should return 400 when URL does not end with valid devfile filename', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/factory/resolver',
        headers: {
          'Authorization': 'Bearer user123:johndoe',
          'Content-Type': 'application/json'
        },
        payload: {
          url: 'https://example.com/invalid.txt'
        }
      });
      
      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.message).toContain('devfile');
    });
    
    it('should accept URL with .devfile.yaml', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/factory/resolver',
        headers: {
          'Authorization': 'Bearer user123:johndoe',
          'Content-Type': 'application/json'
        },
        payload: {
          url: 'https://raw.githubusercontent.com/eclipse-che/che-server/main/.devfile.yaml'
        }
      });
      
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('v');
    });
  });
  
  describe('POST /factory/token/refresh', () => {
    it('should return 401 without authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/factory/token/refresh?url=https://github.com/user/repo'
      });
      
      expect(response.statusCode).toBe(401);
    });
    
    it('should return 400 when URL is missing', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/factory/token/refresh',
        headers: {
          'Authorization': 'Bearer user123:johndoe'
        }
      });
      
      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.message).toContain('required');
    });
    
    it('should refresh token with valid URL and authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/factory/token/refresh?url=https://raw.githubusercontent.com/eclipse-che/che-server/main/devfile.yaml',
        headers: {
          'Authorization': 'Bearer user123:johndoe'
        }
      });
      
      expect(response.statusCode).toBe(204);
    });
  });
});
