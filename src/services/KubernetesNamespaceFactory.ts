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
import { KubernetesNamespaceMeta, NAMESPACE_ATTRIBUTES } from '../models/KubernetesNamespaceMeta';
import { NamespaceResolutionContext } from '../models/NamespaceResolutionContext';

/**
 * Factory for managing Kubernetes namespaces.
 * 
 * This is a TypeScript implementation inspired by:
 * org.eclipse.che.workspace.infrastructure.kubernetes.namespace.KubernetesNamespaceFactory
 */
export class KubernetesNamespaceFactory {
  private kc: k8s.KubeConfig;
  private k8sApi: k8s.CoreV1Api;
  private namespaceTemplate: string;

  constructor(namespaceTemplate: string = 'che-<username>') {
    this.namespaceTemplate = namespaceTemplate;
    
    // Initialize Kubernetes client
    this.kc = new k8s.KubeConfig();
    
    // Try to load config from default locations
    try {
      this.kc.loadFromDefault();
    } catch (error) {
      // If no k8s config available, use in-cluster config
      console.warn('Could not load kubeconfig, some operations may fail:', error);
    }
    
    this.k8sApi = this.kc.makeApiClient(k8s.CoreV1Api);
  }

  /**
   * Evaluate the namespace name based on the resolution context.
   * 
   * @param context - Namespace resolution context
   * @returns Evaluated namespace name
   */
  evaluateNamespaceName(context: NamespaceResolutionContext): string {
    let name = this.namespaceTemplate;
    
    // Replace placeholders
    name = name.replace('<username>', context.subject.userName.toLowerCase());
    name = name.replace('<userid>', context.subject.userId.toLowerCase());
    
    if (context.workspaceId) {
      name = name.replace('<workspaceid>', context.workspaceId.toLowerCase());
    }
    
    // Ensure name is valid for k8s (lowercase, alphanumeric, hyphens)
    name = name.replace(/[^a-z0-9-]/g, '-');
    
    // Ensure it doesn't start or end with hyphen
    name = name.replace(/^-+|-+$/g, '');
    
    // Limit length to 63 characters (k8s limit)
    if (name.length > 63) {
      name = name.substring(0, 63);
    }
    
    return name;
  }

  /**
   * Get or create a Kubernetes namespace.
   * 
   * @param namespaceName - Name of the namespace
   * @param userId - User ID for ownership
   * @returns Promise resolving to namespace object
   */
  async getOrCreate(
    namespaceName: string,
    userId: string
  ): Promise<k8s.V1Namespace> {
    try {
      // Try to get existing namespace
      const response = await this.k8sApi.readNamespace(namespaceName);
      return response.body;
    } catch (error: any) {
      if (error.statusCode === 404) {
        // Namespace doesn't exist, create it
        return await this.createNamespace(namespaceName, userId);
      }
      throw error;
    }
  }

  /**
   * Create a new Kubernetes namespace.
   * 
   * @param namespaceName - Name of the namespace
   * @param userId - User ID for ownership
   * @returns Promise resolving to created namespace
   */
  private async createNamespace(
    namespaceName: string,
    userId: string
  ): Promise<k8s.V1Namespace> {
    const namespace: k8s.V1Namespace = {
      metadata: {
        name: namespaceName,
        labels: {
          'app.kubernetes.io/component': 'workspaces-namespace',
          'app.kubernetes.io/part-of': 'che.eclipse.org'
        },
        annotations: {
          'che.eclipse.org/user-id': userId
        }
      }
    };

    const response = await this.k8sApi.createNamespace(namespace);
    return response.body;
  }

  /**
   * Fetch namespace metadata.
   * 
   * @param namespaceName - Name of the namespace
   * @returns Promise resolving to namespace metadata or null if not found
   */
  async fetchNamespace(namespaceName: string): Promise<KubernetesNamespaceMeta | null> {
    try {
      const response = await this.k8sApi.readNamespace(namespaceName);
      const ns = response.body;
      
      const attributes: Record<string, string> = {};
      
      // Set phase attribute
      if (ns.status?.phase) {
        attributes[NAMESPACE_ATTRIBUTES.PHASE] = ns.status.phase;
      }
      
      // Check if this is a default namespace (you can customize this logic)
      const isDefault = ns.metadata?.annotations?.['che.eclipse.org/default'] === 'true';
      attributes[NAMESPACE_ATTRIBUTES.DEFAULT] = isDefault.toString();

      return {
        name: namespaceName,
        attributes
      };
    } catch (error: any) {
      if (error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * List all namespaces managed by Che.
   * 
   * @returns Promise resolving to array of namespace metadata
   */
  async list(): Promise<KubernetesNamespaceMeta[]> {
    try {
      const response = await this.k8sApi.listNamespace(
        undefined,
        undefined,
        undefined,
        undefined,
        'app.kubernetes.io/part-of=che.eclipse.org'
      );

      return response.body.items.map(ns => {
        const attributes: Record<string, string> = {};
        
        if (ns.status?.phase) {
          attributes[NAMESPACE_ATTRIBUTES.PHASE] = ns.status.phase;
        }
        
        const isDefault = ns.metadata?.annotations?.['che.eclipse.org/default'] === 'true';
        attributes[NAMESPACE_ATTRIBUTES.DEFAULT] = isDefault.toString();

        return {
          name: ns.metadata?.name || '',
          attributes
        };
      });
    } catch (error) {
      console.error('Error listing namespaces:', error);
      return [];
    }
  }
}

