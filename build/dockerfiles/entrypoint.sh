#!/bin/sh
#
# Copyright (c) 2025 Red Hat, Inc.
# This program and the accompanying materials are made
# available under the terms of the Eclipse Public License 2.0
# which is available at https://www.eclipse.org/legal/epl-2.0/
#
# SPDX-License-Identifier: EPL-2.0
#
# Contributors:
#   Red Hat, Inc. - initial API and implementation

set -e

echo 'Starting Che Server...'

# Set default values
export PORT=${PORT:-8080}
export HOST=${HOST:-0.0.0.0}
export NODE_ENV=${NODE_ENV:-production}
export CHE_HOME=${CHE_HOME:-/home/user/che-server}

# Set namespace template from CHE environment variables
if [ -n "${CHE_INFRA_KUBERNETES_NAMESPACE_DEFAULT}" ]; then
  export NAMESPACE_TEMPLATE=${CHE_INFRA_KUBERNETES_NAMESPACE_DEFAULT}
elif [ -n "${CHE_NAMESPACE_TEMPLATE}" ]; then
  export NAMESPACE_TEMPLATE=${CHE_NAMESPACE_TEMPLATE}
fi

# Set API endpoint if provided
if [ -n "${CHE_API}" ]; then
  export CHE_API_ENDPOINT=${CHE_API}
fi

# Set factory default devfile filenames if provided
if [ -n "${CHE_FACTORY_DEFAULT_DEVFILE_FILENAMES}" ]; then
  export CHE_FACTORY_DEFAULT_DEVFILE_FILENAMES=${CHE_FACTORY_DEFAULT_DEVFILE_FILENAMES}
fi

# Set force refresh token if provided
if [ -n "${CHE_FORCE_REFRESH_PERSONAL_ACCESS_TOKEN}" ]; then
  export CHE_FORCE_REFRESH_PERSONAL_ACCESS_TOKEN=${CHE_FORCE_REFRESH_PERSONAL_ACCESS_TOKEN}
fi

# Handle custom certificates
CERT_PATH="/self-signed-cert/ca.crt"
if [ -e "${CERT_PATH}" ]; then
  echo "Found custom certificate at ${CERT_PATH}"
  export NODE_EXTRA_CA_CERTS=${CERT_PATH}
fi

# Handle public certificates directory
CUSTOM_PUBLIC_CERTIFICATES="/public-certs"
if [ -d "${CUSTOM_PUBLIC_CERTIFICATES}" ] && [ -n "$(find ${CUSTOM_PUBLIC_CERTIFICATES} -type f 2>/dev/null)" ]; then
  echo "Adding public certificates from ${CUSTOM_PUBLIC_CERTIFICATES}"
  COMBINED_CERTS=/tmp/combined-certs.pem
  cat ${CUSTOM_PUBLIC_CERTIFICATES}/* > ${COMBINED_CERTS} 2>/dev/null || true
  if [ -s "${COMBINED_CERTS}" ]; then
    export NODE_EXTRA_CA_CERTS=${COMBINED_CERTS}
  fi
fi

# Change to application directory
cd "${CHE_HOME}"

# Start the server
echo "Starting server on ${HOST}:${PORT} in ${NODE_ENV} mode"
exec node --no-deprecation dist/index.js

