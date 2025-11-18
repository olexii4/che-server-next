#!/bin/bash

set -e

# Default values
IMAGE_NAME="${1:-che-server}"
IMAGE_TAG="${2:-latest}"

echo "Building ${IMAGE_NAME}:${IMAGE_TAG} (local only, no push)"
echo "Using Dockerfile: build/dockerfiles/Dockerfile"
echo ""

# Build the Docker image for local use (no multiplatform)
docker build \
  -f build/dockerfiles/Dockerfile \
  -t "${IMAGE_NAME}:${IMAGE_TAG}" \
  .

echo ""
echo "✅ Local build complete: ${IMAGE_NAME}:${IMAGE_TAG}"

