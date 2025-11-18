#!/bin/bash
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

# Build script for Che Server
IMAGE_NAME=${IMAGE_NAME:-che-server}
IMAGE_TAG=${IMAGE_TAG:-latest}
DOCKERFILE=${DOCKERFILE:-build/dockerfiles/Dockerfile}

echo "Building ${IMAGE_NAME}:${IMAGE_TAG}"
echo "Using Dockerfile: ${DOCKERFILE}"
echo ""

# Build the image
docker build \
  -f "${DOCKERFILE}" \
  -t "${IMAGE_NAME}:${IMAGE_TAG}" \
  .

echo ""
echo "✅ Build complete!"
echo ""
echo "Image: ${IMAGE_NAME}:${IMAGE_TAG}"
echo ""
echo "To run the image:"
echo "  docker run -p 8080:8080 ${IMAGE_NAME}:${IMAGE_TAG}"
echo ""
echo "To run with custom configuration:"
echo "  docker run -p 8080:8080 \\"
echo "    -e NODE_ENV=production \\"
echo "    -e NAMESPACE_TEMPLATE=workspace-<username> \\"
echo "    -v ~/.kube/config:/home/user/.kube/config:ro \\"
echo "    ${IMAGE_NAME}:${IMAGE_TAG}"

