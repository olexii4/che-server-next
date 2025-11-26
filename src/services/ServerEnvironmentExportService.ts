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

import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../utils/logger';

/**
 * Environment variables that the dashboard needs from the server
 */
export interface ServerEnvironmentVars {
  CHE_DEFAULT_EDITOR?: string;
  CHE_DEFAULT_PLUGINS?: string;
  CHE_DEFAULT_COMPONENTS?: string;
  CHE_WORKSPACE_PLUGIN_REGISTRY_URL?: string;
  CHE_WORKSPACE_PLUGIN_REGISTRY_INTERNAL_URL?: string;
  CHE_PLUGIN_REGISTRY_OPENVSX_URL?: string;
  CHE_WORKSPACE_INACTIVITY_TIMEOUT?: string;
  CHE_WORKSPACE_RUN_TIMEOUT?: string;
  CHE_WORKSPACE_START_TIMEOUT?: string;
  CHE_PVC_STRATEGY?: string;
  CHE_AUTO_PROVISION?: string;
  CHE_NAMESPACE?: string;
  CHE_DISABLE_INTERNAL_REGISTRY?: string;
  CHE_EXTERNAL_DEVFILE_REGISTRIES?: string;
  CHE_CONTAINER_BUILD_ENABLED?: string;
  CHE_CONTAINER_RUN_ENABLED?: string;
  CHE_DASHBOARD_LOGO?: string;
  CHE_ALLOWED_SOURCE_URLS?: string;
}

/**
 * Service for exporting server environment variables to a JSON file
 *
 * This service creates a JSON file containing environment variables that
 * the dashboard needs to access. The file is placed in the devfile-registry
 * directory so it can be served via HTTP.
 */
export class ServerEnvironmentExportService {
  private static instance: ServerEnvironmentExportService | null = null;
  private exportPath: string;

  private constructor() {
    // Export to server's dist directory so it can be served via HTTP
    // Default: /home/user/che-server/dist/server-env.json
    const defaultPath = path.join(process.cwd(), 'dist', 'server-env.json');
    this.exportPath = process.env.CHE_SERVER_ENV_EXPORT_PATH || defaultPath;
  }

  /**
   * Get the singleton instance
   */
  static getInstance(): ServerEnvironmentExportService {
    if (!ServerEnvironmentExportService.instance) {
      ServerEnvironmentExportService.instance = new ServerEnvironmentExportService();
    }
    return ServerEnvironmentExportService.instance;
  }

  /**
   * Initialize the service by exporting environment variables to a JSON file
   */
  async initialize(): Promise<void> {
    try {
      const envVars = this.collectEnvironmentVariables();
      await this.writeEnvironmentFile(envVars);
      logger.info(
        {
          exportPath: this.exportPath,
          varsCount: Object.keys(envVars).length,
        },
        'Server environment variables exported successfully',
      );
    } catch (error) {
      logger.error(
        { error, exportPath: this.exportPath },
        'Failed to export server environment variables',
      );
      // Don't throw - this is not critical for server startup
    }
  }

  /**
   * Collect environment variables that the dashboard needs
   */
  private collectEnvironmentVariables(): ServerEnvironmentVars {
    const envVars: ServerEnvironmentVars = {};

    // List of environment variables to export
    const varsToExport: Array<keyof ServerEnvironmentVars> = [
      'CHE_DEFAULT_EDITOR',
      'CHE_DEFAULT_PLUGINS',
      'CHE_DEFAULT_COMPONENTS',
      'CHE_WORKSPACE_PLUGIN_REGISTRY_URL',
      'CHE_WORKSPACE_PLUGIN_REGISTRY_INTERNAL_URL',
      'CHE_PLUGIN_REGISTRY_OPENVSX_URL',
      'CHE_WORKSPACE_INACTIVITY_TIMEOUT',
      'CHE_WORKSPACE_RUN_TIMEOUT',
      'CHE_WORKSPACE_START_TIMEOUT',
      'CHE_PVC_STRATEGY',
      'CHE_AUTO_PROVISION',
      'CHE_NAMESPACE',
      'CHE_DISABLE_INTERNAL_REGISTRY',
      'CHE_EXTERNAL_DEVFILE_REGISTRIES',
      'CHE_CONTAINER_BUILD_ENABLED',
      'CHE_CONTAINER_RUN_ENABLED',
      'CHE_DASHBOARD_LOGO',
      'CHE_ALLOWED_SOURCE_URLS',
    ];

    for (const varName of varsToExport) {
      if (process.env[varName]) {
        envVars[varName] = process.env[varName];
      }
    }

    return envVars;
  }

  /**
   * Write environment variables to a JSON file
   */
  private async writeEnvironmentFile(envVars: ServerEnvironmentVars): Promise<void> {
    try {
      // Ensure directory exists
      const dir = path.dirname(this.exportPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        logger.info({ dir }, 'Created directory for server environment export');
      }

      // Write JSON file
      const jsonContent = JSON.stringify(envVars, null, 2);
      fs.writeFileSync(this.exportPath, jsonContent, 'utf8');

      logger.info(
        {
          exportPath: this.exportPath,
          size: jsonContent.length,
        },
        'Server environment file written successfully',
      );
    } catch (error) {
      logger.error({ error, exportPath: this.exportPath }, 'Failed to write environment file');
      throw error;
    }
  }

  /**
   * Get the export path
   */
  getExportPath(): string {
    return this.exportPath;
  }
}

