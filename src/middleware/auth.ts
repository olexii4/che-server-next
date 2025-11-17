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
 * Authentication middleware for Fastify
 * 
 * Supports two authentication methods:
 * 1. Bearer token: Authorization: Bearer <userid>:<username>
 * 2. Basic auth: Authorization: Basic <base64(username:userid)>
 */
import { FastifyRequest, FastifyReply, HookHandlerDoneFunction } from 'fastify';

/**
 * User subject information extracted from authentication
 */
export interface Subject {
  userId: string;
  userName: string;
  token: string;
}

/**
 * Extend Fastify request and instance to include subject and auth hooks
 */
declare module 'fastify' {
  interface FastifyRequest {
    subject?: Subject;
  }
  
  interface FastifyInstance {
    authenticate: typeof authenticate;
    requireAuth: typeof requireAuth;
  }
}

/**
 * Parse Bearer token format: Bearer <userid>:<username>
 */
function parseBearerToken(token: string): Subject | null {
  const parts = token.split(':');
  if (parts.length !== 2) {
    return null;
  }
  
  return {
    userId: parts[0],
    userName: parts[1],
    token: token
  };
}

/**
 * Parse Basic auth format: Basic <base64(username:userid)>
 */
function parseBasicAuth(credentials: string): Subject | null {
  const decoded = Buffer.from(credentials, 'base64').toString('utf-8');
  const parts = decoded.split(':');
  
  if (parts.length !== 2) {
    return null;
  }
  
  return {
    userId: parts[1],
    userName: parts[0],
    token: decoded
  };
}

/**
 * Fastify hook to authenticate requests
 */
export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const authHeader = request.headers.authorization;
  
  if (!authHeader) {
    request.subject = undefined;
    return;
  }
  
  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const subject = parseBearerToken(token);
    if (subject) {
      request.subject = subject;
      return;
    }
  } else if (authHeader.startsWith('Basic ')) {
    const credentials = authHeader.substring(6);
    const subject = parseBasicAuth(credentials);
    if (subject) {
      request.subject = subject;
      return;
    }
  }
  
  request.subject = undefined;
}

/**
 * Fastify hook to require authentication
 */
export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  if (!request.subject) {
    reply.code(401).send({
      error: 'Unauthorized',
      message: 'Authorization header is required'
    });
  }
}
