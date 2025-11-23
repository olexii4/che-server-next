# Docker Hub Setup and Configuration

## Image Information

**Registry:** Docker Hub (`docker.io`)  
**Username:** `olexii4dockerid`  
**Repository:** `che-server`  
**Tag:** `next`  
**Full Image:** `docker.io/olexii4dockerid/che-server:next`

## Configuration Files

### 1. GitHub Actions Workflow

**File:** `.github/workflows/next-build-multiarch.yml`

```yaml
env:
  IMAGE: docker.io/olexii4dockerid/che-server

jobs:
  build-images:
    steps:
      - name: "Login to Docker Hub"
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}
      
      - name: "Build and push ${{ matrix.arch }}"
        uses: docker/build-push-action@v5
        with:
          platforms: linux/${{ matrix.arch }}
          tags: ${{ env.IMAGE }}:${{ matrix.arch }}-next
```

**Required GitHub Secrets:**
- `DOCKERHUB_USERNAME` - Your Docker Hub username
- `DOCKERHUB_TOKEN` - Your Docker Hub access token (not password!)

**How to set GitHub Secrets:**
1. Go to: https://github.com/YOUR_USERNAME/YOUR_REPO/settings/secrets/actions
2. Click "New repository secret"
3. Add `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN`

### 2. CheCluster Patch

**File:** `cr-patch.yaml`

```yaml
kind: CheCluster
apiVersion: org.eclipse.che/v2
spec:
  components:
    cheServer:
      deployment:
        containers:
          - image: 'docker.io/olexii4dockerid/che-server:next'
            imagePullPolicy: Always
            name: che-server
```

### 3. Build Scripts

**Files:** `build/build.sh`, `build/build-local.sh`, `build/build-multiplatform.sh`

**Default image name:** `che-server`  
**Override with:** First argument

```bash
# Build with default name (che-server)
./build/build.sh

# Build with Docker Hub image name
./build/build.sh docker.io/olexii4dockerid/che-server next

# Build local only
./build/build-local.sh docker.io/olexii4dockerid/che-server next

# Build multiplatform
./build/build-multiplatform.sh docker.io/olexii4dockerid/che-server next
```

## Docker Hub Login

### Local Development

```bash
# Login to Docker Hub
docker login docker.io

# Or specify username
docker login docker.io -u olexii4dockerid

# Enter your Docker Hub password or access token
```

### GitHub Actions (Automatic)

The workflow automatically logs in using secrets:
```yaml
username: ${{ secrets.DOCKERHUB_USERNAME }}
password: ${{ secrets.DOCKERHUB_TOKEN }}
```

## Building and Pushing Images

### Manual Build (Local)

```bash
# 1. Login to Docker Hub
docker login docker.io

# 2. Build image
./build/build-local.sh docker.io/olexii4dockerid/che-server next

# 3. Push image
docker push docker.io/olexii4dockerid/che-server:next
```

### Automated Build (GitHub Actions)

Automatically builds and pushes on every push to `main`:

```bash
git push origin main
```

**Workflow steps:**
1. Checkout code
2. Set up QEMU (for ARM support)
3. Set up Docker Buildx
4. Login to Docker Hub
5. Build and push `amd64-next` image
6. Build and push `arm64-next` image
7. Create multiarch manifest `next`
8. Push manifest

**Result:**
```
docker.io/olexii4dockerid/che-server:amd64-next  # AMD64/x86_64
docker.io/olexii4dockerid/che-server:arm64-next  # ARM64
docker.io/olexii4dockerid/che-server:next        # Multiarch manifest
```

## Pulling and Running Images

### Pull Image

```bash
# Pull multiarch image (automatically selects correct architecture)
docker pull docker.io/olexii4dockerid/che-server:next

# Or with Podman
podman pull docker.io/olexii4dockerid/che-server:next
```

### Run Image

```bash
# Run with Docker
docker run -p 8080:8080 docker.io/olexii4dockerid/che-server:next

# Run with Podman
podman run -p 8080:8080 docker.io/olexii4dockerid/che-server:next

# Run with environment variables
docker run -p 8080:8080 \
  -e CHE_HOST=localhost \
  -e NODE_ENV=production \
  docker.io/olexii4dockerid/che-server:next
```

## Deploying to Eclipse Che

### Deploy New Instance

```bash
chectl server:deploy \
  --platform=minikube \
  --che-operator-cr-patch-yaml=cr-patch.yaml
```

### Update Existing Instance

```bash
chectl server:update \
  --che-operator-cr-patch-yaml=cr-patch.yaml
```

### Verify Deployment

```bash
# Check pod is running
kubectl get pods -n eclipse-che | grep che-server

# Check image
kubectl get pod che-XXXXX -n eclipse-che -o jsonpath='{.spec.containers[0].image}'

# Expected output:
# docker.io/olexii4dockerid/che-server:next
```

## Image Architecture

The `next` tag is a **multiarch manifest** supporting:
- **linux/amd64** - Intel/AMD x86_64
- **linux/arm64** - ARM 64-bit (Apple Silicon, AWS Graviton)

Docker/Podman automatically pulls the correct architecture for your system.

## Troubleshooting

### Cannot pull image

```bash
# Check if image exists
docker pull docker.io/olexii4dockerid/che-server:next

# Check Docker Hub
# Visit: https://hub.docker.com/r/olexii4dockerid/che-server/tags
```

### GitHub Actions failing

Check secrets are set:
```bash
# Go to: https://github.com/YOUR_USERNAME/YOUR_REPO/settings/secrets/actions
# Verify:
# - DOCKERHUB_USERNAME exists
# - DOCKERHUB_TOKEN exists (use access token, not password)
```

### Wrong credentials

```bash
# Create new access token:
# 1. Login to Docker Hub: https://hub.docker.com
# 2. Go to Account Settings → Security
# 3. Click "New Access Token"
# 4. Name: "GitHub Actions"
# 5. Permissions: Read & Write
# 6. Copy token and save to GitHub Secrets
```

### Image pull policy

The `cr-patch.yaml` uses `imagePullPolicy: Always` to ensure latest image is pulled:
```yaml
imagePullPolicy: Always  # Always pull latest :next tag
```

## Summary

✅ **Registry:** Docker Hub  
✅ **Image:** `docker.io/olexii4dockerid/che-server:next`  
✅ **Multiarch:** AMD64 + ARM64  
✅ **GitHub Actions:** Automated builds on push  
✅ **CheCluster:** Configured in `cr-patch.yaml`  
✅ **Build Scripts:** Support Docker and Podman  

All configuration files are committed and ready to use! 🎉

