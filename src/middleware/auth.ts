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
 * Supports multiple authentication methods:
 * 1. Bearer token (real Kubernetes/OpenShift token): Authorization: Bearer sha256~...
 * 2. Bearer token (test format): Authorization: Bearer <userid>:<username>
 * 3. Basic auth: Authorization: Basic <base64(username:userid)>
 */
import { FastifyRequest, FastifyReply, HookHandlerDoneFunction } from 'fastify';
import { logger } from '../utils/logger';
import { getServiceAccountToken } from '../helpers/getServiceAccountToken';

/**
 * User subject information extracted from authentication
 */
export interface Subject {
  userId: string;
  userName: string;
  token: string;
  isGatewayAuth?: boolean; // True if authenticated via Eclipse Che Gateway
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
 * Decode JWT token (without verification) to extract claims
 * Eclipse Che Gateway already verified the token, we just need to read it
 */
function decodeJwtPayload(token: string): any {
  try {
    // JWT format: header.payload.signature
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    // Decode base64url payload
    const payload = parts[1];
    const decoded = Buffer.from(payload, 'base64url').toString('utf-8');
    return JSON.parse(decoded);
  } catch (error) {
    logger.info(`Failed to decode JWT: ${error}`);
    return null;
  }
}

/**
 * Parse Bearer token format: Bearer <token>
 *
 * Supports three formats:
 * 1. JWT token (from Eclipse Che Gateway): extracts preferred_username
 * 2. Real Kubernetes/OpenShift tokens (e.g., sha256~...)
 * 3. Test format: userid:username
 */
function parseBearerToken(token: string): Subject | null {
  // Check if it's the test format (userid:username)
  const parts = token.split(':');
  if (parts.length === 2) {
    logger.info(`✅ Test token format: ${parts[0]}:${parts[1]}`);
    return {
      userId: parts[0],
      userName: parts[1],
      token: token,
    };
  }

  // Try to decode as JWT token (from Eclipse Che Gateway)
  const jwtPayload = decodeJwtPayload(token);
  if (jwtPayload) {
    // Extract username from JWT claims (in order of preference)
    // Check for name, username, preferred_username, or extract from email
    // Ignore "undefined" strings and null values
    let username = null;
    
    if (jwtPayload.name && jwtPayload.name !== 'undefined') {
      username = jwtPayload.name;
    } else if (jwtPayload.username && jwtPayload.username !== 'undefined') {
      username = jwtPayload.username;
    } else if (jwtPayload.preferred_username && jwtPayload.preferred_username !== 'undefined') {
      username = jwtPayload.preferred_username;
    } else if (jwtPayload.email) {
      username = jwtPayload.email.split('@')[0];
    } else if (jwtPayload.sub) {
      username = jwtPayload.sub;
    }
    
    logger.info(`✅ JWT token decoded: name="${jwtPayload.name}", username="${jwtPayload.username}", preferred_username="${jwtPayload.preferred_username}", email="${jwtPayload.email}", sub="${jwtPayload.sub}" -> using username="${username}"`);
    
    return {
      userId: username || 'che-user',
      userName: username || 'che-user',
      token: token,
    };
  }

  // Real Kubernetes/OpenShift token (no colons, not a JWT)
  // Use as-is for Kubernetes API calls
  logger.info(`✅ Kubernetes token (sha256~...): using kube-user`);
  return {
    userId: 'kube-user',
    userName: 'kube-user',
    token: token,
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
    token: decoded,
  };
}

/**
 * Fastify hook to authenticate requests
 */
export async function authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  // Check for Eclipse Che Gateway authentication first
  const gapAuth = request.headers['gap-auth'];
  
  // DEBUG: Log all authentication headers
  logger.info('🔐 Authentication attempt:', {
    path: request.url,
    hasGapAuth: !!gapAuth,
    gapAuthValue: gapAuth || 'not-present',
    hasAuthorization: !!request.headers.authorization,
    authType: request.headers.authorization?.split(' ')[0] || 'none',
  });
  
  if (gapAuth) {
    // Gateway passes user identity via gap-auth header
    // Format: username (e.g., "che@eclipse.org" or "admin")
    // Extract just the username part before @ if present
    const fullUsername = gapAuth as string;
    const username = fullUsername.split('@')[0];
    
    logger.info(`✅ Using gap-auth: "${fullUsername}" -> username: "${username}"`);
    
    // Use service account token for Kubernetes operations
    request.subject = {
      userId: username,
      userName: username,
      token: '', // Service account token will be used by routes
      isGatewayAuth: true,
    };
    return;
  }

  // Fallback to standard Authorization header (for standalone mode)
  const authHeader = request.headers.authorization;

  if (!authHeader) {
    logger.info('❌ No authentication headers present');
    request.subject = undefined;
    return;
  }

  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const subject = parseBearerToken(token);
    if (subject) {
      logger.info(`✅ Bearer token authenticated as: userId="${subject.userId}", userName="${subject.userName}"`);
      request.subject = subject;
      return;
    }
  } else if (authHeader.startsWith('Basic ')) {
    const credentials = authHeader.substring(6);
    const subject = parseBasicAuth(credentials);
    if (subject) {
      logger.info(`✅ Basic auth authenticated as: userId="${subject.userId}", userName="${subject.userName}"`);
      request.subject = subject;
      return;
    }
  }

  logger.info('❌ Authentication failed - no valid credentials found');
  request.subject = undefined;
}

/**
 * Fastify hook to require authentication
 */
export async function requireAuth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  if (!request.subject) {
    reply.code(401).send({
      error: 'Unauthorized',
      message: 'Authorization header is required',
    });
  }
}
