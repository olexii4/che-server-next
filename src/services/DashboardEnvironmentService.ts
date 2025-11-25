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

import { getKubeConfig, getServiceAccountToken } from '../helpers/getKubernetesClient';
import { logger } from '../utils/logger';

/**
 * Environment variables that need to be read from the dashboard pod
 */
export interface DashboardEnvironmentVars {
  CHE_SHOW_DEPRECATED_EDITORS?: string;
  CHE_HIDE_EDITORS_BY_ID?: string;
  CHE_DEFAULT_SPEC_DEVENVIRONMENTS_DISABLECONTAINERBUILDCAPABILITIES?: string;
  CHE_DEFAULT_SPEC_DEVENVIRONMENTS_DEFAULTEDITOR?: string;
  CHE_DEFAULT_SPEC_DEVENVIRONMENTS_DEFAULTCOMPONENTS?: string;
  CHE_DEFAULT_SPEC_COMPONENTS_PLUGINREGISTRY_OPENVSXURL?: string;
  CHE_DEFAULT_SPEC_COMPONENTS_DASHBOARD_HEADERMESSAGE_TEXT?: string;
  CHE_DASHBOARD_AXIOS_REQUEST_TIMEOUT?: string;
}

/**
 * Service for reading dashboard environment variables on startup
 *
 * This service reads environment variables from the che-dashboard deployment
 * by inspecting the CheCluster custom resource. These variables are used to
 * maintain compatibility with the original che-dashboard backend API.
 */
export class DashboardEnvironmentService {
  private static instance: DashboardEnvironmentService | null = null;
  private envVars: DashboardEnvironmentVars = {};
  private initialized = false;

  private constructor() {}

  /**
   * Get the singleton instance
   */
  static getInstance(): DashboardEnvironmentService {
    if (!DashboardEnvironmentService.instance) {
      DashboardEnvironmentService.instance = new DashboardEnvironmentService();
    }
    return DashboardEnvironmentService.instance;
  }

  /**
   * Initialize the service by reading environment variables from the dashboard deployment
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      logger.info('DashboardEnvironmentService already initialized');
      return;
    }

    try {
      const token = getServiceAccountToken();
      if (!token) {
        logger.warn(
          'No service account token available - skipping dashboard environment initialization (local run mode)',
        );
        this.loadFromProcessEnv();
        this.initialized = true;
        return;
      }

      const kubeConfig = getKubeConfig(token);
      await this.loadFromCheCluster(kubeConfig);
      this.initialized = true;

      logger.info(
        { envVars: Object.keys(this.envVars) },
        'Dashboard environment variables loaded successfully',
      );
    } catch (error) {
      logger.error({ error }, 'Failed to load dashboard environment variables');
      // Fall back to process.env
      this.loadFromProcessEnv();
      this.initialized = true;
    }
  }

  /**
   * Load environment variables from the CheCluster custom resource
   */
  private async loadFromCheCluster(kubeConfig: k8s.KubeConfig): Promise<void> {
    const customObjectsApi = kubeConfig.makeApiClient(k8s.CustomObjectsApi);
    const namespace = process.env.CHECLUSTER_CR_NAMESPACE || 'eclipse-che';

    try {
      const response = await customObjectsApi.listNamespacedCustomObject(
        'org.eclipse.che',
        'v2',
        namespace,
        'checlusters',
      );

      const cheClusterList = response.body as any;
      const cheCluster = cheClusterList.items?.[0];

      if (!cheCluster) {
        logger.warn({ namespace }, 'No CheCluster found in namespace');
        this.loadFromProcessEnv();
        return;
      }

      // Extract environment variables from dashboard container spec
      const containers = cheCluster.spec?.components?.dashboard?.deployment?.containers || [];
      const dashboardContainer = containers.find(
        (c: any) => c.name === 'che-dashboard' || c.env !== undefined,
      );

      if (dashboardContainer && dashboardContainer.env) {
        for (const envVar of dashboardContainer.env) {
          if (this.isRelevantEnvVar(envVar.name)) {
            this.envVars[envVar.name as keyof DashboardEnvironmentVars] = envVar.value;
          }
        }
      }

      // Fall back to process.env for any missing variables
      this.loadFromProcessEnv(true);
    } catch (error) {
      logger.error({ error, namespace }, 'Error loading CheCluster custom resource');
      throw error;
    }
  }

  /**
   * Load environment variables from process.env
   */
  private loadFromProcessEnv(onlyMissing = false): void {
    const relevantVars: Array<keyof DashboardEnvironmentVars> = [
      'CHE_SHOW_DEPRECATED_EDITORS',
      'CHE_HIDE_EDITORS_BY_ID',
      'CHE_DEFAULT_SPEC_DEVENVIRONMENTS_DISABLECONTAINERBUILDCAPABILITIES',
      'CHE_DEFAULT_SPEC_DEVENVIRONMENTS_DEFAULTEDITOR',
      'CHE_DEFAULT_SPEC_DEVENVIRONMENTS_DEFAULTCOMPONENTS',
      'CHE_DEFAULT_SPEC_COMPONENTS_PLUGINREGISTRY_OPENVSXURL',
      'CHE_DEFAULT_SPEC_COMPONENTS_DASHBOARD_HEADERMESSAGE_TEXT',
      'CHE_DASHBOARD_AXIOS_REQUEST_TIMEOUT',
    ];

    for (const varName of relevantVars) {
      if (onlyMissing && this.envVars[varName] !== undefined) {
        continue;
      }

      if (process.env[varName]) {
        this.envVars[varName] = process.env[varName];
      }
    }
  }

  /**
   * Check if an environment variable name is relevant
   */
  private isRelevantEnvVar(name: string): boolean {
    return (
      name.startsWith('CHE_') &&
      (name.includes('EDITOR') ||
        name.includes('COMPONENT') ||
        name.includes('DEVENVIRONMENT') ||
        name.includes('DASHBOARD') ||
        name.includes('PLUGINREGISTRY'))
    );
  }

  /**
   * Get a specific environment variable value
   */
  getEnvVar(name: keyof DashboardEnvironmentVars): string | undefined {
    return this.envVars[name];
  }

  /**
   * Get all environment variables
   */
  getAllEnvVars(): DashboardEnvironmentVars {
    return { ...this.envVars };
  }

  /**
   * Get whether to show deprecated editors
   */
  getShowDeprecatedEditors(): boolean {
    const value = this.getEnvVar('CHE_SHOW_DEPRECATED_EDITORS');
    return value === 'true';
  }

  /**
   * Get list of editor IDs to hide
   */
  getHideEditorsById(): string[] {
    const value = this.getEnvVar('CHE_HIDE_EDITORS_BY_ID');
    if (!value) {
      return [];
    }
    return value.split(',').map((val) => val.trim());
  }

  /**
   * Get whether container build capabilities are disabled
   */
  getDisableContainerBuildCapabilities(): boolean {
    const value = this.getEnvVar('CHE_DEFAULT_SPEC_DEVENVIRONMENTS_DISABLECONTAINERBUILDCAPABILITIES');
    // `defaultDisableContainerBuildCapabilities` is true if the env var is undefined or is not equal to 'false'
    return value === undefined || value.toLowerCase() !== 'false';
  }

  /**
   * Get default editor
   */
  getDefaultEditor(): string | undefined {
    return this.getEnvVar('CHE_DEFAULT_SPEC_DEVENVIRONMENTS_DEFAULTEDITOR');
  }

  /**
   * Get default components
   */
  getDefaultComponents(): any[] {
    const value = this.getEnvVar('CHE_DEFAULT_SPEC_DEVENVIRONMENTS_DEFAULTCOMPONENTS');
    if (!value) {
      return [];
    }
    try {
      return JSON.parse(value);
    } catch (e) {
      logger.error(
        { error: e },
        'Unable to parse default components from environment variable CHE_DEFAULT_SPEC_DEVENVIRONMENTS_DEFAULTCOMPONENTS',
      );
      return [];
    }
  }

  /**
   * Get OpenVSX URL
   */
  getOpenVSXURL(): string | undefined {
    return this.getEnvVar('CHE_DEFAULT_SPEC_COMPONENTS_PLUGINREGISTRY_OPENVSXURL');
  }

  /**
   * Get dashboard header message text
   */
  getDashboardHeaderMessageText(): string | undefined {
    return this.getEnvVar('CHE_DEFAULT_SPEC_COMPONENTS_DASHBOARD_HEADERMESSAGE_TEXT');
  }

  /**
   * Get axios request timeout in milliseconds
   */
  getAxiosRequestTimeout(): number {
    const value = this.getEnvVar('CHE_DASHBOARD_AXIOS_REQUEST_TIMEOUT');
    if (!value) {
      return 60000; // default 60 seconds
    }
    const timeout = parseInt(value, 10);
    return isNaN(timeout) ? 60000 : timeout;
  }
}

