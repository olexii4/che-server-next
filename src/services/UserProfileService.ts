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

import { logger } from '../utils/logger';

const USER_PROFILE_SECRET_NAME = 'user-profile';

export interface UserProfile {
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
   */
  async getUserProfile(namespace: string): Promise<UserProfile | undefined> {
    try {
      const response = await this.coreV1Api.readNamespacedSecret(
        USER_PROFILE_SECRET_NAME,
        namespace,
      );

      const data = response.body.data;
      if (!data) {
        throw new Error('User profile data is empty');
      }

      return {
        username: Buffer.from(data.name || '', 'base64').toString(),
        email: Buffer.from(data.email || '', 'base64').toString(),
      };
    } catch (error) {
      logger.error({ error, namespace }, 'Error getting user profile');
      throw error;
    }
  }
}
