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

import { GettingStartedSample } from '../models/AdvancedFeaturesModels';
import { logger } from '../utils/logger';

const DEVFILE_METADATA_LABEL_SELECTOR =
  'app.kubernetes.io/component=getting-started-samples,app.kubernetes.io/part-of=che.eclipse.org';

/**
 * Service for managing Getting Started Samples
 *
 * Samples are stored as ConfigMaps with specific labels in the Che namespace.
 */
export class GettingStartedSamplesService {
  private coreV1Api: k8s.CoreV1Api;
  private cheNamespace: string;

  constructor(kubeConfig: k8s.KubeConfig) {
    this.coreV1Api = kubeConfig.makeApiClient(k8s.CoreV1Api);
    this.cheNamespace = process.env.CHECLUSTER_CR_NAMESPACE || 'eclipse-che';
  }

  /**
   * List all getting started samples
   */
  async list(): Promise<GettingStartedSample[]> {
    // In local run mode, return empty array
    if (process.env.LOCAL_RUN === 'true') {
      logger.info('LOCAL_RUN mode: returning empty getting started samples list');
      return [];
    }

    if (!this.cheNamespace) {
      logger.warn('CHECLUSTER_CR_NAMESPACE not defined, returning empty list');
      return [];
    }

    try {
      const response = await this.coreV1Api.listNamespacedConfigMap(
        this.cheNamespace,
        undefined,
        undefined,
        undefined,
        undefined,
        DEVFILE_METADATA_LABEL_SELECTOR,
      );

      const samples: GettingStartedSample[] = [];

      for (const cm of response.body.items) {
        if (!cm.data) {
          continue;
        }

        for (const key in cm.data) {
          try {
            const sampleData = JSON.parse(cm.data[key]);
            // Handle both single samples and arrays of samples
            if (Array.isArray(sampleData)) {
              samples.push(...sampleData);
            } else {
              samples.push(sampleData);
            }
          } catch (error) {
            logger.error(
              { error, configMapName: cm.metadata?.name, key },
              'Failed to parse getting started sample',
            );
          }
        }
      }

      return samples;
    } catch (error) {
      logger.error(
        { error, namespace: this.cheNamespace },
        'Error listing getting started samples',
      );
      throw error;
    }
  }
}
