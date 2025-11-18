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

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Source the container tool script
CONTAINER_TOOL_SCRIPT="$PROJECT_ROOT/scripts/container_tool.sh"

# Detect container engine (Docker or Podman)
detect_container_engine() {
    if command -v podman &> /dev/null && podman info &>/dev/null; then
        echo "podman"
    elif command -v docker &> /dev/null && docker info &>/dev/null; then
        echo "docker"
    else
        echo "none"
    fi
}

CONTAINER_ENGINE=$(detect_container_engine)

if [ "$CONTAINER_ENGINE" = "none" ]; then
    echo "❌ Error: Neither Docker nor Podman is installed or running"
    echo "   Please install Docker or Podman"
    exit 1
fi

# Default values
IMAGE_NAME="${1:-che-server}"
IMAGE_TAG="${2:-latest}"
PLATFORMS="${3:-linux/amd64,linux/arm64}"

echo "Container engine: $CONTAINER_ENGINE"
echo "Building ${IMAGE_NAME}:${IMAGE_TAG}"
echo "Platforms: ${PLATFORMS}"
echo "Using Dockerfile: build/dockerfiles/Dockerfile"
echo ""

cd "$PROJECT_ROOT"

# Build based on container engine
if [ "$CONTAINER_ENGINE" = "podman" ]; then
    echo "📦 Building with Podman..."
    
    # Podman supports multiplatform builds natively
    podman build \
      --platform "${PLATFORMS}" \
      -f build/dockerfiles/Dockerfile \
      -t "${IMAGE_NAME}:${IMAGE_TAG}" \
      --manifest "${IMAGE_NAME}:${IMAGE_TAG}" \
      .
    
    echo ""
    echo "📤 Pushing manifest to registry..."
    podman manifest push "${IMAGE_NAME}:${IMAGE_TAG}" "docker://${IMAGE_NAME}:${IMAGE_TAG}"
    
elif [ "$CONTAINER_ENGINE" = "docker" ]; then
    echo "📦 Building with Docker Buildx..."
    
    # Ensure buildx is available
    if ! docker buildx version &> /dev/null; then
        echo "❌ Error: docker buildx is not available"
        echo "   Please install Docker Desktop or enable buildx"
        exit 1
    fi
    
    # Create and use a new builder instance if it doesn't exist
    if ! docker buildx inspect multiarch-builder &> /dev/null; then
        echo "📦 Creating multiarch-builder instance..."
        docker buildx create --name multiarch-builder --use --driver docker-container --bootstrap
    else
        echo "📦 Using existing multiarch-builder instance..."
        docker buildx use multiarch-builder
    fi
    
    # Build and push the multiplatform Docker image
    docker buildx build \
      --platform "${PLATFORMS}" \
      -f build/dockerfiles/Dockerfile \
      -t "${IMAGE_NAME}:${IMAGE_TAG}" \
      --push \
      .
fi

echo ""
echo "✅ Multiplatform build complete: ${IMAGE_NAME}:${IMAGE_TAG}"
echo "   Platforms: ${PLATFORMS}"
echo "   Container engine: $CONTAINER_ENGINE"
echo ""
echo "To pull the image:"
echo "  $CONTAINER_ENGINE pull ${IMAGE_NAME}:${IMAGE_TAG}"
echo ""
echo "To run the image:"
echo "  $CONTAINER_ENGINE run -p 8080:8080 ${IMAGE_NAME}:${IMAGE_TAG}"
