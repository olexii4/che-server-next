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

import * as k8s from '@kubernetes/client-node';
import * as crypto from 'crypto';

import { logger } from '../utils/logger';

const USER_PROFILE_SECRET_NAME = 'user-profile';

export interface UserProfile {
  id: string; // UUID
  username: string;
  email: string;
}

/**
 * Service for managing User Profiles
 *
 * Provides methods to get user profile information.
 * User profiles are stored as Secrets in the user's namespace.
 */
export class UserProfileService {
  private coreV1Api: k8s.CoreV1Api;

  constructor(kubeConfig: k8s.KubeConfig) {
    this.coreV1Api = kubeConfig.makeApiClient(k8s.CoreV1Api);
  }

  /**
   * Get user profile from a namespace
   *
   * If the user-profile Secret doesn't exist, returns a default profile
   * extracted from the namespace name (e.g., "admin-che" -> username: "admin")
   */
  async getUserProfile(namespace: string): Promise<UserProfile> {
    try {
      const response = await this.coreV1Api.readNamespacedSecret(
        USER_PROFILE_SECRET_NAME,
        namespace,
      );

      const data = response.body.data;
      if (!data) {
        logger.info({ namespace }, 'User profile secret exists but has no data, returning default');
        return this.getDefaultProfile(namespace);
      }

      return {
        id: Buffer.from(data.id || '', 'base64').toString(),
        username: Buffer.from(data.name || '', 'base64').toString(),
        email: Buffer.from(data.email || '', 'base64').toString(),
      };
    } catch (error: any) {
      // Check if it's a 404 (Secret not found)
      const statusCode = error.statusCode || error.response?.statusCode;

      if (statusCode === 404) {
        logger.info({ namespace }, `User profile secret not found, returning default profile`);
        return this.getDefaultProfile(namespace);
      }

      // For other errors (403, 500, etc.), log and re-throw
      logger.error({ error, namespace }, 'Error getting user profile');
      throw error;
    }
  }

  /**
   * Get default profile from namespace name
   * Extracts username from namespace (e.g., "admin-che" -> "admin")
   */
  private getDefaultProfile(namespace: string): UserProfile {
    // Extract username from namespace (remove "-che" suffix if present)
    const username = namespace.replace(/-che$/, '');

    // Generate a deterministic UUID based on username
    // This ensures the same user always gets the same UUID
    const hash = crypto.createHash('sha256').update(username).digest('hex');
    // Format as UUID v4 style: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    const id = `${hash.substring(0, 8)}-${hash.substring(8, 12)}-4${hash.substring(13, 16)}-${((parseInt(hash.substring(16, 18), 16) & 0x3f) | 0x80).toString(16)}${hash.substring(18, 20)}-${hash.substring(20, 32)}`;

    return {
      id: id,
      username: username,
      email: `${username}@che.local`,
    };
  }
}
