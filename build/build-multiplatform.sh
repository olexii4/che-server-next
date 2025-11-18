#!/bin/bash

set -e

# Default values
IMAGE_NAME="${1:-che-server}"
IMAGE_TAG="${2:-latest}"
DOCKERFILE="${3:-build/dockerfiles/Dockerfile}"

echo "Building multiplatform image: ${IMAGE_NAME}:${IMAGE_TAG}"
echo "Using Dockerfile: ${DOCKERFILE}"
echo "Platforms: linux/amd64, linux/arm64"
echo ""

# Build the Docker image from the parent directory
cd "$(dirname "$0")/.." || exit 1

# Ensure buildx builder exists
if ! docker buildx inspect multiplatform-builder &> /dev/null; then
  echo "Creating buildx builder 'multiplatform-builder'..."
  docker buildx create --name multiplatform-builder --use
  docker buildx inspect --bootstrap
fi

echo "Building and pushing multiplatform image..."
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -f "${DOCKERFILE}" \
  -t "${IMAGE_NAME}:${IMAGE_TAG}" \
  --push \
  .

echo ""
echo "✅ Multiplatform build complete: ${IMAGE_NAME}:${IMAGE_TAG}"
echo "   Platforms: linux/amd64, linux/arm64"
echo "   Image has been pushed to registry"
