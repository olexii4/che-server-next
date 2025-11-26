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

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import { ServerConfig } from '../models/ClusterModels';
import { DashboardEnvironmentService } from '../services/DashboardEnvironmentService';

/**
 * Register server config routes
 *
 * Provides server-wide configuration including editor defaults, timeouts,
 * plugin registry URLs, and devfile registry settings.
 * Route: GET /api/server-config
 */
export async function registerServerConfigRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * GET /api/server-config
   *
   * Get server configuration including defaults, timeouts, and registry URLs.
   *
   * This endpoint returns comprehensive server configuration that affects
   * workspace creation and behavior, including editor defaults, plugin registries,
   * devfile registries, and various timeout settings.
   */
  fastify.get(
    '/server-config',
    {
      schema: {
        tags: ['server-config'],
        summary: 'Get server configuration',
        description:
          'Returns server-wide configuration including editor defaults, timeouts, and registry URLs',
        response: {
          200: {
            description: 'Successful response',
            type: 'object',
            properties: {
              containerBuild: {
                type: 'object',
                additionalProperties: true,
              },
              containerRun: {
                type: 'object',
                additionalProperties: true,
              },
              defaults: {
                type: 'object',
                properties: {
                  editor: { type: 'string' },
                  plugins: { type: 'array', items: { type: 'string' } },
                  components: { type: 'array' },
                  pvcStrategy: { type: 'string' },
                },
              },
              timeouts: {
                type: 'object',
                properties: {
                  inactivityTimeout: { type: 'number' },
                  runTimeout: { type: 'number' },
                  startTimeout: { type: 'number' },
                  axiosRequestTimeout: { type: 'number' },
                },
              },
              devfileRegistry: {
                type: 'object',
                properties: {
                  disableInternalRegistry: { type: 'boolean' },
                  externalDevfileRegistries: { type: 'array' },
                },
              },
              defaultNamespace: {
                type: 'object',
                properties: {
                  autoProvision: { type: 'boolean' },
                },
              },
              pluginRegistry: { type: 'object' },
              cheNamespace: { type: 'string' },
              pluginRegistryURL: { type: 'string' },
              pluginRegistryInternalURL: { type: 'string' },
              allowedSourceUrls: { type: 'array', items: { type: 'string' } },
              dashboardLogo: { type: 'string' },
              networking: {
                type: 'object',
                additionalProperties: true,
              },
              editorsVisibility: {
                type: 'object',
                additionalProperties: true,
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const serverConfig = buildServerConfig();
      return reply.code(200).send(serverConfig);
    },
  );
}

/**
 * Build server config from environment variables
 */
function buildServerConfig(): ServerConfig {
  // Get dashboard environment service for backward compatibility
  const dashboardEnv = DashboardEnvironmentService.getInstance();

  const cheNamespace = process.env.CHE_NAMESPACE || 'eclipse-che';
  const pluginRegistryInternalURL = process.env.CHE_WORKSPACE_PLUGIN_REGISTRY_INTERNAL_URL || '';
  const pluginRegistryURL = process.env.CHE_WORKSPACE_PLUGIN_REGISTRY_URL || '';

  // Parse editor and plugins - use dashboard environment service for backward compatibility
  const editor =
    dashboardEnv.getDefaultEditor() ||
    process.env.CHE_DEFAULT_EDITOR ||
    undefined;
  const pluginsStr = process.env.CHE_DEFAULT_PLUGINS || '[]';

  // Get components from dashboard environment service (backward compatibility)
  const dashboardComponents = dashboardEnv.getDefaultComponents();
  const componentsStr =
    dashboardComponents.length > 0
      ? JSON.stringify(dashboardComponents)
      : process.env.CHE_DEFAULT_COMPONENTS || '[]';

  let plugins: string[] = [];
  let components: unknown[] = [];

  try {
    plugins = JSON.parse(pluginsStr);
  } catch (e) {
    plugins = [];
  }

  try {
    components = JSON.parse(componentsStr);
  } catch (e) {
    components = [];
  }

  // Parse timeouts
  const inactivityTimeout = parseInt(process.env.CHE_WORKSPACE_INACTIVITY_TIMEOUT || '1800000', 10);
  const runTimeout = parseInt(process.env.CHE_WORKSPACE_RUN_TIMEOUT || '0', 10);
  const startTimeout = parseInt(process.env.CHE_WORKSPACE_START_TIMEOUT || '300000', 10);
  const axiosRequestTimeout = parseInt(process.env.CHE_DASHBOARD_AXIOS_REQUEST_TIMEOUT || '60000', 10);

  // Parse devfile registry
  const disableInternalRegistry = process.env.CHE_DISABLE_INTERNAL_REGISTRY === 'true' || false;
  const externalDevfileRegistriesStr = process.env.CHE_EXTERNAL_DEVFILE_REGISTRIES || '[]';

  let externalDevfileRegistries: Array<{ url: string }> = [];
  try {
    externalDevfileRegistries = JSON.parse(externalDevfileRegistriesStr);
  } catch (e) {
    externalDevfileRegistries = [];
  }

  // Parse PVC strategy
  const pvcStrategy = process.env.CHE_PVC_STRATEGY || 'common';

  // Parse auto provision
  const autoProvision = process.env.CHE_AUTO_PROVISION !== 'false';

  // Parse allowed source URLs
  const allowedSourceUrlsStr = process.env.CHE_ALLOWED_SOURCE_URLS || '*';
  const allowedSourceUrls = allowedSourceUrlsStr.split(',').map(url => url.trim());

  // Dashboard logo
  const dashboardLogo = process.env.CHE_DASHBOARD_LOGO || undefined;

  // Container build/run - use dashboard environment service for backward compatibility
  const disableContainerBuild = dashboardEnv.getDisableContainerBuildCapabilities();
  const containerBuildEnabled =
    process.env.CHE_CONTAINER_BUILD_ENABLED === 'true' || !disableContainerBuild;
  const containerRunEnabled = process.env.CHE_CONTAINER_RUN_ENABLED === 'true';

  const containerBuildConfigStr = process.env.CHE_CONTAINER_BUILD_CONFIGURATION || '{}';
  const containerRunConfigStr = process.env.CHE_CONTAINER_RUN_CONFIGURATION || '{}';

  let containerBuildConfiguration: Record<string, string> = {};
  let containerRunConfiguration: Record<string, string> = {};

  try {
    containerBuildConfiguration = JSON.parse(containerBuildConfigStr);
  } catch (e) {
    containerBuildConfiguration = {};
  }

  try {
    containerRunConfiguration = JSON.parse(containerRunConfigStr);
  } catch (e) {
    containerRunConfiguration = {};
  }

  // Advanced authorization
  const allowUsersStr = process.env.CHE_ADVANCED_AUTH_ALLOW_USERS || '';
  const allowGroupsStr = process.env.CHE_ADVANCED_AUTH_ALLOW_GROUPS || '';
  const denyUsersStr = process.env.CHE_ADVANCED_AUTH_DENY_USERS || '';
  const denyGroupsStr = process.env.CHE_ADVANCED_AUTH_DENY_GROUPS || '';

  const allowUsers = allowUsersStr ? allowUsersStr.split(',').map(u => u.trim()) : [];
  const allowGroups = allowGroupsStr ? allowGroupsStr.split(',').map(g => g.trim()) : [];
  const denyUsers = denyUsersStr ? denyUsersStr.split(',').map(u => u.trim()) : [];
  const denyGroups = denyGroupsStr ? denyGroupsStr.split(',').map(g => g.trim()) : [];

  const hasAdvancedAuth =
    allowUsers.length > 0 ||
    allowGroups.length > 0 ||
    denyUsers.length > 0 ||
    denyGroups.length > 0;

  // Editors visibility - use dashboard environment service for backward compatibility
  const showDeprecated = dashboardEnv.getShowDeprecatedEditors();
  const hideById = dashboardEnv.getHideEditorsById();

  // Build server config
  const serverConfig: ServerConfig = {
    defaults: {
      editor,
      plugins,
      components,
      pvcStrategy,
    },
    timeouts: {
      inactivityTimeout: isNaN(inactivityTimeout) ? 1800000 : inactivityTimeout,
      runTimeout: isNaN(runTimeout) ? 0 : runTimeout,
      startTimeout: isNaN(startTimeout) ? 300000 : startTimeout,
      axiosRequestTimeout: isNaN(axiosRequestTimeout) ? 10000 : axiosRequestTimeout,
    },
    devfileRegistry: {
      disableInternalRegistry,
      externalDevfileRegistries,
    },
    defaultNamespace: {
      autoProvision,
    },
    pluginRegistry: {
      openVSXURL:
        dashboardEnv.getOpenVSXURL() ||
        process.env.CHE_PLUGIN_REGISTRY_OPENVSX_URL ||
        undefined,
    },
    cheNamespace,
    pluginRegistryURL: pluginRegistryURL || undefined,
    pluginRegistryInternalURL: pluginRegistryInternalURL || undefined,
    allowedSourceUrls,
  };

  // Add optional fields
  if (containerBuildEnabled) {
    serverConfig.containerBuild = {
      openShiftSecurityContextConstraint: process.env.CHE_CONTAINER_BUILD_OSC || undefined,
      containerBuildConfiguration,
    };
  }

  if (containerRunEnabled) {
    serverConfig.containerRun = {
      openShiftSecurityContextConstraint: process.env.CHE_CONTAINER_RUN_OSC || undefined,
      containerRunConfiguration: containerRunConfiguration,
    };
  }

  if (dashboardLogo) {
    serverConfig.dashboardLogo = dashboardLogo;
  }

  // Add dashboard warning message from ClusterConfig (not from dashboard env)
  const dashboardWarning = process.env.CHE_DASHBOARD_WARNING;
  if (dashboardWarning) {
    serverConfig.dashboardWarning = dashboardWarning;
  }

  if (hasAdvancedAuth) {
    const advancedAuth: {
      allowUsers?: string[];
      allowGroups?: string[];
      denyUsers?: string[];
      denyGroups?: string[];
    } = {};

    if (allowUsers.length > 0) advancedAuth.allowUsers = allowUsers;
    if (allowGroups.length > 0) advancedAuth.allowGroups = allowGroups;
    if (denyUsers.length > 0) advancedAuth.denyUsers = denyUsers;
    if (denyGroups.length > 0) advancedAuth.denyGroups = denyGroups;

    serverConfig.networking = {
      auth: {
        advancedAuthorization: advancedAuth,
      },
    };
  }

  if (showDeprecated || hideById.length > 0) {
    serverConfig.editorsVisibility = {
      showDeprecated,
      hideById,
    };
  }

  return serverConfig;
}
