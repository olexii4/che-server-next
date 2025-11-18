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

import { KubernetesNamespaceMeta, NAMESPACE_ATTRIBUTES } from '../models/KubernetesNamespaceMeta';
import { NamespaceResolutionContext } from '../models/NamespaceResolutionContext';
import { KubernetesNamespaceFactory } from './KubernetesNamespaceFactory';

/**
 * Provisions the k8s Namespace. After provisioning, configures the namespace.
 *
 * This is a TypeScript implementation of the Java class:
 * org.eclipse.che.workspace.infrastructure.kubernetes.provision.NamespaceProvisioner
 */
export class NamespaceProvisioner {
  constructor(private namespaceFactory: KubernetesNamespaceFactory) {}

  /**
   * Provision a namespace for the given context.
   *
   * @param namespaceResolutionContext - Context containing user information
   * @returns Promise resolving to namespace metadata
   * @throws Error if namespace cannot be provisioned or found
   */
  async provision(
    namespaceResolutionContext: NamespaceResolutionContext
  ): Promise<KubernetesNamespaceMeta> {
    // Evaluate namespace name based on context
    const namespaceName = this.namespaceFactory.evaluateNamespaceName(namespaceResolutionContext);

    // Get or create the namespace
    const namespace = await this.namespaceFactory.getOrCreate(
      namespaceName,
      namespaceResolutionContext.subject.userId
    );

    if (!namespace.metadata?.name) {
      throw new Error(`Not able to find the provisioned namespace name`);
    }

    // Fetch the namespace metadata
    const namespaceMeta = await this.namespaceFactory.fetchNamespace(namespace.metadata.name);

    if (!namespaceMeta) {
      throw new Error(`Not able to find namespace ${namespace.metadata?.name}`);
    }

    return namespaceMeta;
  }
}
