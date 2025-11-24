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

import * as k8s from '@kubernetes/client-node';

import { KubernetesNamespaceMeta } from '../models/KubernetesNamespaceMeta';
import { NamespaceResolutionContext } from '../models/NamespaceResolutionContext';
import { logger } from '../utils/logger';
import { KubernetesNamespaceFactory } from './KubernetesNamespaceFactory';
import { UserProfileService } from './UserProfileService';

/**
 * Provisions the k8s Namespace. After provisioning, configures the namespace.
 *
 * This is a TypeScript implementation of the Java class:
 * org.eclipse.che.workspace.infrastructure.kubernetes.provision.NamespaceProvisioner
 * 
 * Matches Java UserProfileConfigurator behavior:
 * infrastructures/kubernetes/.../namespace/configurator/UserProfileConfigurator.java
 */
export class NamespaceProvisioner {
  constructor(
    private namespaceFactory: KubernetesNamespaceFactory,
    private kubeConfig: k8s.KubeConfig,
  ) {}

  /**
   * Provision a namespace for the given context.
   *
   * @param namespaceResolutionContext - Context containing user information
   * @returns Promise resolving to namespace metadata
   * @throws Error if namespace cannot be provisioned or found
   */
  async provision(
    namespaceResolutionContext: NamespaceResolutionContext,
  ): Promise<KubernetesNamespaceMeta> {
    // Evaluate namespace name based on context
    const namespaceName = this.namespaceFactory.evaluateNamespaceName(namespaceResolutionContext);

    logger.info({ namespaceName, userId: namespaceResolutionContext.subject.userId }, '📋 Provisioning namespace');

    // Get or create the namespace
    const namespace = await this.namespaceFactory.getOrCreate(
      namespaceName,
      namespaceResolutionContext.subject.userId,
    );

    if (!namespace.metadata?.name) {
      throw new Error(`Not able to find the provisioned namespace name`);
    }

    // Configure the namespace (create user-profile Secret, etc.)
    // Matches Java UserProfileConfigurator.configure()
    await this.configure(namespaceResolutionContext, namespace.metadata.name);

    // Fetch the namespace metadata
    const namespaceMeta = await this.namespaceFactory.fetchNamespace(namespace.metadata.name);

    if (!namespaceMeta) {
      throw new Error(`Not able to find namespace ${namespace.metadata?.name}`);
    }

    logger.info({ namespaceName, userId: namespaceResolutionContext.subject.userId }, '✅ Namespace provisioned successfully');

    return namespaceMeta;
  }

  /**
   * Configure the namespace by creating required Secrets.
   * 
   * Matches Java implementation:
   * UserProfileConfigurator.configure(NamespaceResolutionContext, String)
   * 
   * Creates user-profile Secret with:
   * - id: base64(UUID)
   * - name: base64(username)
   * - email: base64(email)
   * 
   * @param namespaceResolutionContext - Context containing user information
   * @param namespaceName - Namespace name where Secret will be created
   */
  private async configure(
    namespaceResolutionContext: NamespaceResolutionContext,
    namespaceName: string,
  ): Promise<void> {
    logger.info({ namespaceName }, '🔧 Configuring namespace (creating user-profile Secret)');

    try {
      const userProfileService = new UserProfileService(this.kubeConfig);
      
      // Get user profile (will create Secret if it doesn't exist)
      await userProfileService.getUserProfile(namespaceName);
      
      logger.info({ namespaceName }, '✅ Namespace configured successfully');
    } catch (error: any) {
      logger.error({ error, namespaceName }, '❌ Error configuring namespace');
      throw new Error(`Error occurred while trying to create user profile secret: ${error.message}`);
    }
  }
}
