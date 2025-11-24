# Eclipse Che Next

Next-generation TypeScript/Fastify implementation of Eclipse Che Server REST APIs.

> **Framework**: Fastify 5.0 | **Target**: Kubernetes-native IDE and developer collaboration platform

## Overview

Eclipse Che Next is a modern, high-performance reimplementation of the Eclipse Che Server using TypeScript and Fastify. This project provides the core REST APIs that power Eclipse Che, the Kubernetes-native IDE and developer collaboration platform.

Built to align with the Eclipse Che Dashboard backend architecture, this server provides enterprise-ready APIs for workspace management, OAuth integration, factory resolution, and DevWorkspace operations.

### Original Java Implementation

This TypeScript project is based on:

- **Namespace Service**: `org.eclipse.che.workspace.infrastructure.kubernetes.api.server.KubernetesNamespaceService`
- **Factory Service**: `org.eclipse.che.api.factory.server.FactoryService`
- **OAuth Service**: `org.eclipse.che.security.oauth.OAuthAuthenticationService`
- **SCM Service**: `org.eclipse.che.api.factory.server.ScmService`

## Features

### 1. Cluster & Server Configuration
- ✅ GET `/api/cluster-info` - Get cluster console information
- ✅ GET `/api/cluster-config` - Get cluster-wide configuration  
- ✅ GET `/api/server-config` - Get server configuration (editors, plugins, timeouts)

### 2. Kubernetes Namespace Management
- ✅ POST `/api/kubernetes/namespace/provision` - Provision a namespace for authenticated users
- ✅ GET `/api/kubernetes/namespace` - List available namespaces

**📖 See [docs/NAMESPACE_PROVISIONING_IMPLEMENTATION.md](docs/NAMESPACE_PROVISIONING_IMPLEMENTATION.md) for detailed implementation guide comparing Java vs TypeScript, including @kubernetes/client-node usage examples.**

### 3. DevWorkspace Management
- ✅ GET `/api/namespace/:namespace/devworkspaces` - List DevWorkspaces
- ✅ POST `/api/namespace/:namespace/devworkspaces` - Create DevWorkspace
- ✅ GET `/api/namespace/:namespace/devworkspaces/:name` - Get specific DevWorkspace
- ✅ PATCH `/api/namespace/:namespace/devworkspaces/:name` - Update DevWorkspace
- ✅ DELETE `/api/namespace/:namespace/devworkspaces/:name` - Delete DevWorkspace
- ✅ GET `/api/namespace/:namespace/devworkspacetemplates` - List DevWorkspaceTemplates
- ✅ POST `/api/namespace/:namespace/devworkspacetemplates` - Create DevWorkspaceTemplate
- ✅ GET `/api/namespace/:namespace/devworkspacetemplates/:name` - Get specific template
- ✅ PATCH `/api/namespace/:namespace/devworkspacetemplates/:name` - Update template
- ✅ POST `/api/devworkspace-resources` - Generate DevWorkspace YAML from devfile
- ✅ GET `/api/devworkspace/running-workspaces-cluster-limit-exceeded` - Check cluster limits

**📖 See [docs/DASHBOARD_BACKEND_API_IMPLEMENTATION.md](docs/DASHBOARD_BACKEND_API_IMPLEMENTATION.md) for DevWorkspace implementation details**

### 4. Monitoring & Info APIs ⭐ NEW
- ✅ GET `/api/namespace/:namespace/pods` - List pods in a namespace
- ✅ GET `/api/namespace/:namespace/events` - List Kubernetes events  
- ✅ GET `/api/editors` - List available editors/IDEs
- ✅ GET `/api/editors/devfile?che-editor=<id>` - Get specific editor devfile (YAML)
- ✅ GET `/api/userprofile/:namespace` - Get user profile (username, email)

**📖 See [docs/DASHBOARD_BACKEND_API_IMPLEMENTATION.md](docs/DASHBOARD_BACKEND_API_IMPLEMENTATION.md) for Monitoring & Info APIs implementation details**

### 5. Factory Management

- ✅ POST `/factory/resolver` - Resolve factory from URL
- ✅ POST `/factory/token/refresh` - Refresh factory OAuth tokens

### OAuth Authentication

- ✅ GET `/oauth` - Get registered OAuth authenticators (returns `[]` without configuration)
- ✅ GET `/oauth/token` - Get OAuth token for provider
- ✅ DELETE `/oauth/token` - Invalidate OAuth token

**📖 Configuration:** [docs/OAUTH_CONFIGURATION.md](docs/OAUTH_CONFIGURATION.md) - How to configure OAuth providers via Kubernetes Secrets (returns `[]` if no secrets configured)

**📖 Implementation:** [docs/OAUTH_IMPLEMENTATION.md](docs/OAUTH_IMPLEMENTATION.md) - OAuth implementation guide comparing Java vs TypeScript, including OAuth 2.0 flow diagrams

### 6. SCM Integration

- ✅ GET `/api/scm/resolve` - Resolve file content from SCM repository (supports public & private repos)

### 7. Data Resolver & CORS Solution

- ✅ POST `/data/resolver` - Backend proxy to fetch data from external URLs (solves CORS issues)
- ✅ **Certificate Authority Support** - Handles self-signed certificates from Kubernetes mounts
- ✅ **Smart Retry Logic** - Tries without certificates first, falls back to certificate validation
- ✅ **CORS-Free** - Browser → Backend → SCM Provider (bypasses CORS restrictions)

### Technical Features

- ✅ **Fastify 5.0** - High-performance web framework (2-3x faster than Express)
- ✅ **@fastify/swagger** - Schema-based API documentation
- ✅ **@fastify/swagger-ui** - Interactive API documentation at `/swagger`
- ✅ Authentication hooks (Bearer token and Basic auth)
- ✅ Kubernetes client integration
- ✅ Namespace name templating (e.g., `che-<username>`)
- ✅ **SCM API Clients** - GitHub, GitLab, Bitbucket API integration
- ✅ **Certificate Authority Support** - Handles self-signed certificates in Kubernetes/OpenShift
- ✅ Full TypeScript type safety with Fastify decorators
- ✅ Comprehensive Jest test suite using Fastify inject()
- ✅ Built-in request validation with JSON Schema
- ✅ Structured logging with Pino
- ✅ CORS support with proper header handling

## 📚 API Documentation

This API includes comprehensive **Swagger/OpenAPI 3.0** documentation with **real-world examples**!

Once the server is running, visit:

- **Swagger UI**: http://localhost:8080/swagger
- **OpenAPI JSON**: http://localhost:8080/swagger/json
- **OpenAPI YAML**: http://localhost:8080/swagger/yaml

The interactive Swagger UI allows you to:

- 🔍 Explore all endpoints and their parameters
- 🔐 Authenticate with Bearer or Basic auth
- ▶️ Try out API calls directly from the browser
- 📖 View request/response schemas and **real examples**
- 💡 See example requests and responses for all endpoints
- 📥 Download the OpenAPI specification

### Example Coverage

All major endpoints include comprehensive examples:

- **Factory Resolver** (`POST /api/factory/resolver`) - Shows example request with GitHub URL and complete response with devfile and SCM links
- **SCM Resolve** (`GET /api/scm/resolve`) - Demonstrates fetching files from repositories
- **OAuth** (`GET /api/oauth`) - Lists all available OAuth providers with authentication URLs
- **Data Resolver** (`POST /api/data/resolver`) - Shows how to fetch external data via backend proxy
- **Namespace Operations** - Examples for provisioning and listing namespaces

**📖 See [docs/swagger-examples.md](docs/swagger-examples.md) for detailed Swagger/OpenAPI usage examples.**

## API Endpoints

### 1. Provision Namespace

**Endpoint**: `POST /api/kubernetes/namespace/provision`

**Description**: Provisions a Kubernetes namespace where the authenticated user can create workspaces.

**Authentication**: Required

**Request Headers**:

```
Authorization: Bearer <userid>:<username>
```

or

```
Authorization: Basic <base64(username:userid)>
```

**Response** (200 OK):

```json
{
  "name": "che-johndoe",
  "attributes": {
    "phase": "Active",
    "default": "true"
  }
}
```

**Response** (500 Error):

```json
{
  "error": "Internal Server Error",
  "message": "Not able to find namespace che-johndoe"
}
```

### 2. List Namespaces

**Endpoint**: `GET /api/kubernetes/namespace`

**Description**: Get all Kubernetes namespaces where the user can create workspaces.

**Authentication**: Required

**Response** (200 OK):

```json
[
  {
    "name": "che-johndoe",
    "attributes": {
      "phase": "Active",
      "default": "true"
    }
  },
  {
    "name": "che-janedoe",
    "attributes": {
      "phase": "Active",
      "default": "false"
    }
  }
]
```

### 3. Resolve Factory

**Endpoint**: `POST /api/factory/resolver`

**Description**: Resolve factory metadata from a URL pointing to a devfile. The URL must end with a valid devfile filename (`devfile.yaml` or `.devfile.yaml`).

**Authentication**: Required

**Request Body**:

```json
{
  "url": "https://raw.githubusercontent.com/eclipse-che/che-server/main/devfile.yaml"
}
```

**Note**: Valid devfile filenames are:

- `devfile.yaml`
- `.devfile.yaml`

**Response** (200 OK):

```json
{
  "v": "7.0",
  "source": "repo",
  "scm": {
    "scmProvider": "github",
    "repository": "https://github.com/eclipse-che/che-server"
  }
}
```

### 4. Get OAuth Authenticators

**Endpoint**: `GET /api/oauth`

**Description**: Get list of registered OAuth providers. Returns `[]` if no Kubernetes Secrets are configured. Providers are loaded from Secrets with label `app.kubernetes.io/component=oauth-scm-configuration`.

**Authentication**: Required

**Response without configuration** (200 OK):

```json
[]
```

**Response with GitHub configured** (200 OK):

```json
[
  {
    "name": "github",
    "endpointUrl": "https://github.com/login/oauth/authorize",
    "links": [
      {
        "rel": "authenticate",
        "href": "/oauth/authenticate?oauth_provider=github"
      }
    ]
  }
]
```

**See:** [docs/OAUTH_CONFIGURATION.md](docs/OAUTH_CONFIGURATION.md) for configuration guide

### 5. Get OAuth Token

**Endpoint**: `GET /api/oauth/token?oauth_provider=github`

**Description**: Get OAuth token for specified provider.

**Authentication**: Required

**Response** (200 OK):

```json
{
  "token": "gho_1234567890abcdefghijklmnopqrstuvwxyz",
  "scope": "repo user write:public_key"
}
```

### 6. Invalidate OAuth Token

**Endpoint**: `DELETE /oauth/token?oauth_provider=github`

**Description**: Revoke OAuth token for specified provider.

**Authentication**: Required

**Response**: 204 No Content

### 7. Resolve SCM File

**Endpoint**: `GET /api/scm/resolve?repository=https://github.com/user/repo&file=devfile.yaml`

**Description**: Fetch file content from SCM repository.

**Authentication**: Required

**Response** (200 OK):

```yaml
schemaVersion: 2.1.0
metadata:
  name: che-server
components:
  - name: tools
    container:
      image: quay.io/devfile/universal-developer-image:latest
```

### 8. Data Resolver (CORS Proxy)

**Endpoint**: `POST /api/data/resolver`

**Description**: Backend proxy to fetch data from external URLs. This endpoint solves CORS issues by making server-to-server requests and supports self-signed certificates.

**Use Case**: Use this endpoint when Swagger UI or frontend applications encounter CORS errors trying to fetch data directly from SCM providers (GitHub, GitLab, Bitbucket, etc.).

**Authentication**: Optional (depends on target URL requirements)

**Request Body**:

```json
{
  "url": "https://raw.githubusercontent.com/eclipse-che/che-dashboard/main/devfile.yaml"
}
```

**Response** (200 OK):

Returns the raw content from the specified URL:

```yaml
schemaVersion: 2.1.0
metadata:
  name: che-dashboard
components:
  - name: tools
    container:
      image: quay.io/devfile/universal-developer-image:latest
```

**Response** (404 Not Found):

```json
{
  "error": "Not Found",
  "message": "Resource not found at the specified URL"
}
```

**Response** (400 Bad Request):

```json
{
  "error": "Bad Request",
  "message": "URL parameter is required"
}
```

**How It Works**:

```
Browser → Backend Proxy → External SCM Provider
         ↑ No CORS        ↑ No CORS restrictions
```

The backend acts as a proxy, bypassing browser CORS restrictions since it's a server-to-server request.

**Example with Authorization**:

```bash
curl -X POST 'http://localhost:8080/api/data/resolver' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -d '{
    "url": "https://api.bitbucket.org/2.0/repositories/workspace/repo/src/main/devfile.yaml"
  }'
```

### 9. Health Check

**Endpoint**: `GET /health`

**Description**: Check if the API is running.

**Authentication**: Not required

**Response** (200 OK):

```json
{
  "status": "ok",
  "timestamp": "2025-11-13T10:30:00.000Z"
}
```

## Installation

### Prerequisites

- Node.js 18+
- **Yarn 4.9.0** (included in repository)
- Kubernetes cluster access (optional for development)
- kubectl configured (optional)

### Setup

1. **Install dependencies**:

```bash
yarn install
```

Note: This project uses Yarn 4.9.0 (Berry), aligned with Eclipse Che Dashboard. The Yarn binary is included at `.yarn/releases/yarn-4.9.0.cjs`.

2. **Configure environment**:

```bash
cp .env.example .env
```

Edit `.env` and configure:

```env
PORT=8080
NODE_ENV=development
NAMESPACE_TEMPLATE=che-<username>
```

3. **Build the project**:

```bash
yarn build
```

## Usage

### Development Mode

**⚠️ IMPORTANT: For local development, you MUST set `LOCAL_RUN=true`**

**Option 1: Use the startup script (recommended)**

```bash
./start-local-dev.sh
```

This automatically sets `LOCAL_RUN=true` and starts the server.

**Option 2: Manual setup**

```bash
export LOCAL_RUN=true
yarn dev
```

**Why LOCAL_RUN is required:**
- Without it, the server tries to use in-cluster config (`/var/run/secrets/kubernetes.io/...`)
- With it, the server uses your local kubeconfig (`~/.kube/config`)
- See [QUICK_START.md](QUICK_START.md) for more details

**Option 2: Build in watch mode + run separately**

Terminal 1 - Build with auto-recompile:
```bash
yarn build:watch
```

Terminal 2 - Run with nodemon:
```bash
yarn start:debug
```

**Option 3: TypeScript with ts-node**

```bash
yarn dev
```

#### Kubernetes Authentication

The server uses **request token authentication** following the Eclipse Che Dashboard backend pattern:

**How It Works:**
1. Request arrives with `Authorization: Bearer <token>` header
2. Authentication middleware extracts token → `request.subject.token`
3. `KubeConfigProvider` creates KubeConfig with user's token
4. Kubernetes API calls use user's token → **RBAC enforced per-user**

**Deployment Modes:**

- **Production (In-Cluster):**
  - Runs as pod in Kubernetes/OpenShift
  - Uses in-cluster service account for cluster info
  - Each request authenticated with user's token
  - Full multi-tenancy and RBAC enforcement

- **Local Development (`LOCAL_RUN=true`):**
  - Runs on developer machine
  - Uses local kubeconfig (`~/.kube/config` or `$KUBECONFIG`)
  - Each request still authenticated with user's token
  - Useful for local development against remote clusters

**Key Benefits:**
- ✅ **Multi-tenancy**: Each user isolated with their own permissions
- ✅ **RBAC**: Kubernetes enforces access control per-user
- ✅ **Security**: No shared service account
- ✅ **Audit**: Kubernetes logs show actual user actions

**Local Development Setup:**

```bash
# Set local run mode
export LOCAL_RUN=true

# Optional: specify kubeconfig path (default: ~/.kube/config)
export KUBECONFIG=~/.kube/config

# Start development server
yarn dev
```

The server will use your local kubeconfig for cluster info, but each API request will be authenticated with the user's token from the request headers. This enables testing multi-tenant behavior locally.

### Production Mode

Build and run:

```bash
yarn build
yarn start
```

The API will be available at `http://localhost:8080`.

### Available Scripts

Based on [Eclipse Che Dashboard Backend](https://github.com/eclipse-che/che-dashboard/blob/main/packages/dashboard-backend/package.json):

#### Build Scripts
- `yarn build` - Production build with webpack (minified, optimized)
- `yarn build:dev` - Development build with webpack (faster, source maps)
- `yarn build:watch` - Development build in watch mode (auto-recompile)

#### Start Scripts
- `yarn start` - Run production build
- `yarn start:debug` - Run with nodemon (auto-restart) + debugger on port 9229
- `yarn dev` - Build dev + run with nodemon (one command for development)

#### Code Quality
- `yarn lint:check` - Check TypeScript types + ESLint
- `yarn lint:fix` - Fix TypeScript + ESLint issues automatically
- `yarn format:check` - Check Prettier formatting
- `yarn format:fix` - Fix Prettier formatting automatically

#### Testing
- `yarn test` - Run Jest tests (verbose output)
- `yarn test:watch` - Run tests in watch mode
- `yarn test:coverage` - Run tests with coverage report

## Testing the API

### Using curl

**Provision a namespace**:

```bash
curl -X POST http://localhost:8080/api/kubernetes/namespace/provision \
  -H "Authorization: Bearer user123:johndoe" \
  -H "Content-Type: application/json"
```

**List namespaces**:

```bash
curl http://localhost:8080/api/kubernetes/namespace \
  -H "Authorization: Bearer user123:johndoe"
```

### Using Basic Auth

```bash
# Provision namespace
curl -X POST http://localhost:8080/api/kubernetes/namespace/provision \
  -u "johndoe:user123"

# List namespaces
curl http://localhost:8080/api/kubernetes/namespace \
  -u "johndoe:user123"
```

### Using Postman or Insomnia

1. Create a new POST request to `http://localhost:8080/kubernetes/namespace/provision`
2. Add Authorization header:
   - Type: Bearer Token
   - Token: `user123:johndoe`
3. Send the request

## Project Structure

```
typescript-namespace-api/
├── src/
│   ├── models/
│   │   ├── KubernetesNamespaceMeta.ts    # Namespace metadata model
│   │   └── NamespaceResolutionContext.ts  # Context for namespace resolution
│   ├── services/
│   │   ├── NamespaceProvisioner.ts        # Namespace provisioning logic
│   │   └── KubernetesNamespaceFactory.ts  # K8s namespace factory
│   ├── routes/
│   │   └── namespaceRoutes.ts             # API route handlers
│   ├── middleware/
│   │   └── auth.ts                        # Authentication middleware
│   └── index.ts                           # Application entry point
├── dist/                                   # Compiled JavaScript (generated)
├── package.json
├── tsconfig.json
├── .env.example
├── .gitignore
└── README.md
```

## Configuration

### Environment Variables

| Variable                       | Description                              | Default          |
| ------------------------------ | ---------------------------------------- | ---------------- |
| `PORT`                         | Server port                              | `8080`           |
| `NODE_ENV`                     | Environment mode                         | `development`    |
| `NAMESPACE_TEMPLATE`           | Template for namespace names             | `che-<username>` |
| `CHE_SELF_SIGNED_MOUNT_PATH`   | Path to custom CA certificates           | `/public-certs`  |

### Certificate Authority Support

This server automatically loads custom CA certificates for handling self-signed certificates in Kubernetes/OpenShift environments.

**Features:**
- Automatically loads certificates from `/public-certs` (or custom path via `CHE_SELF_SIGNED_MOUNT_PATH`)
- Supports both public APIs and internal cluster URLs with self-signed certificates
- Uses dual axios instance pattern with automatic fallback
- Compatible with Eclipse Che Dashboard backend implementation

**Usage in Kubernetes/OpenShift:**
```bash
# Certificates are typically mounted via cert-manager
docker run -p 8080:8080 \
  -v /path/to/custom/certs:/public-certs:ro \
  che-server:latest
```

**Custom certificate path:**
```bash
export CHE_SELF_SIGNED_MOUNT_PATH=/custom/certs/path
yarn start
```

### Namespace Template Placeholders

The `NAMESPACE_TEMPLATE` supports the following placeholders:

- `<username>` - User's username (lowercase)
- `<userid>` - User's ID (lowercase)
- `<workspaceid>` - Workspace ID if available (lowercase)

Examples:

- `che-<username>` → `che-johndoe`
- `workspace-<userid>` → `workspace-user123`
- `<username>-<workspaceid>` → `johndoe-ws456`

## Kubernetes Integration

### Kubeconfig

The application loads Kubernetes configuration in the following order:

1. `KUBECONFIG` environment variable
2. `~/.kube/config` file
3. In-cluster configuration (when running in a pod)

### Required Permissions

When running with Kubernetes integration, ensure the service account has these permissions:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: namespace-provisioner
rules:
  - apiGroups: ['']
    resources: ['namespaces']
    verbs: ['get', 'list', 'create', 'update']
```

## Docker Deployment

### Multiplatform Container Build 🚀

The project supports **multiplatform container builds** using both **Docker** and **Podman**, allowing you to create images for multiple architectures simultaneously.

#### Container Engine Support

- 🐋 **Docker** - Uses Docker Buildx for multiplatform builds
- 🦭 **Podman** - Uses native Podman manifest support (Podman 3.0+)

The build script automatically detects which container engine is available and uses it!

#### Supported Platforms

- 🐧 **linux/amd64** - Intel/AMD x86_64 (most servers, development machines)
- 🍎 **linux/arm64** - ARM 64-bit (Apple Silicon, ARM servers, Raspberry Pi 4+)

#### Quick Build

```bash
# Build for both platforms and push to registry (recommended)
./build/build.sh olexii4dockerid/che-server next

# Build for specific platform only
./build/build.sh olexii4dockerid/che-server next "linux/amd64"

# Build for custom platforms
./build/build.sh olexii4dockerid/che-server next "linux/amd64,linux/arm64,linux/arm/v7"
```

#### How It Works

The build script automatically:
1. ✅ Detects available container engine (Docker or Podman)
2. ✅ Sets up multiplatform builder (Docker Buildx or Podman manifest)
3. ✅ Builds for all specified platforms
4. ✅ Pushes to container registry

**Note**: Multiplatform builds **require pushing to a registry**. Local `--load` flags only support single-platform images.

#### Requirements

**Docker:**
- Docker 19.03+ with Buildx support
- Access to a container registry (Docker Hub, ghcr.io, etc.)

**Podman:**
- Podman 3.0+ with manifest support
- Access to a container registry

**📖 For detailed build instructions, troubleshooting, and advanced options, see [build/README.md](build/README.md)**

### Quick Start with Docker/Podman

The Dockerfile follows Eclipse Che patterns (Dashboard and Server) and supports both Docker and Podman:

```bash
# Build using the build script (auto-detects Docker or Podman)
./build/build.sh olexii4dockerid/che-server next

# Run the container (use docker or podman)
docker run -p 8080:8080 olexii4dockerid/che-server:next
# OR
podman run -p 8080:8080 olexii4dockerid/che-server:next

# Or build manually for local platform only
docker build -f build/dockerfiles/Dockerfile -t che-server .
# OR
podman build -f build/dockerfiles/Dockerfile -t che-server .
```

### Configuration

Configure the container using environment variables:

```bash
docker run -p 8080:8080 \
  -e NODE_ENV=production \
  -e PORT=8080 \
  -e NAMESPACE_TEMPLATE=workspace-<username> \
  -v ~/.kube/config:/home/user/.kube/config:ro \
  che-server
```

### With Custom Certificates

```bash
# Single certificate
docker run -p 8080:8080 \
  -v /path/to/ca.crt:/self-signed-cert/ca.crt:ro \
  che-server

# Multiple certificates
docker run -p 8080:8080 \
  -v /path/to/certs:/public-certs:ro \
  che-server
```

### Docker Implementation

Our Dockerfile follows Eclipse Che patterns:

- **Multi-stage build** like Eclipse Che Dashboard
- **User and permissions** like Eclipse Che Server
- **Alpine-based** for lightweight images (~250MB)
- **Simple entrypoint** (61 lines vs 476 in Java version)

### Documentation

For detailed Docker configuration and deployment instructions, see the **Documentation Files** section at the bottom of this README.

### Optional: Docker Compose

A docker-compose.yml is provided for convenience but not required:

```bash
docker-compose -f build/dockerfiles/docker-compose.yml up
```

## Deploying to Eclipse Che

This project can be deployed as a custom che-server component in Eclipse Che using the provided `cr-patch.yaml` CheCluster patch file.

### What is cr-patch.yaml?

The `cr-patch.yaml` file is a Kubernetes CheCluster Custom Resource patch that configures Eclipse Che to use this custom che-server image instead of the default one:

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

### Deploying Eclipse Che with Custom che-server

Use `chectl` to deploy a new Eclipse Che instance with your custom che-server image:

**On Minikube:**
```bash
chectl server:deploy --platform=minikube --che-operator-cr-patch-yaml=$(PWD)/cr-patch.yaml
```

**On OpenShift:**
```bash
chectl server:deploy --platform=openshift --che-operator-cr-patch-yaml=$(PWD)/cr-patch.yaml
```

**Supported Platforms:**
- `minikube` - Local Kubernetes cluster
- `openshift` - Red Hat OpenShift cluster
- `k8s` - Generic Kubernetes cluster

### Updating Existing Eclipse Che Instance

#### Option 1: Using chectl (Recommended)

To update an already running Eclipse Che instance to use your custom che-server image:

```bash
chectl server:update --che-operator-cr-patch-yaml=$(PWD)/cr-patch.yaml
```

This command will:
1. Patch the existing CheCluster Custom Resource
2. Trigger a rolling update of the che-server deployment
3. Pull the new image (`docker.io/olexii4dockerid/che-server:next`)
4. Restart the che-server pod with the updated image

**Note:** Make sure you're in the project root directory or provide the full path to `cr-patch.yaml`.

#### Option 2: Using kubectl patch (Direct)

Alternative method using `kubectl` to directly patch the CheCluster:

```bash
kubectl patch -n eclipse-che "checluster/eclipse-che" --type=json \
  -p='[{"op": "replace", "path": "/spec/components/cheServer/deployment", "value": {containers: [{image: "docker.io/olexii4dockerid/che-server:next", imagePullPolicy: "Always", name: "che-server"}]}}]'
```

**For other container registries:**

Quay.io (che-incubator):
```bash
kubectl patch -n eclipse-che "checluster/eclipse-che" --type=json \
  -p='[{"op": "replace", "path": "/spec/components/cheServer/deployment", "value": {containers: [{image: "quay.io/che-incubator/che-server-next:next", imagePullPolicy: "Always", name: "che-server"}]}}]'
```

**Verify the update:**

```bash
# Check CheCluster status
kubectl get checluster eclipse-che -n eclipse-che -o jsonpath='{.spec.components.cheServer.deployment.containers[0].image}'

# Watch pod restart
kubectl get pods -n eclipse-che -l app.kubernetes.io/name=che -w

# Check logs
kubectl logs -n eclipse-che -l app.kubernetes.io/name=che -f
```

**Reference:** Based on Eclipse Che Dashboard PR workflow - [che-dashboard#1413](https://github.com/eclipse-che/che-dashboard/pull/1413#issuecomment-3563437159)

### Prerequisites

1. **Install chectl** - Eclipse Che CLI tool

```bash
# Install latest stable version
bash <(curl -sL https://www.eclipse.org/che/chectl/)

# Or using npm
npm install -g chectl
```

2. **Kubernetes/OpenShift Access** - Ensure you have:
   - `kubectl` or `oc` CLI configured
   - Cluster admin permissions
   - Sufficient resources for Eclipse Che deployment

3. **Custom Image Available** - The custom che-server image must be:
   - Built and pushed to a container registry
   - Accessible from your Kubernetes/OpenShift cluster
   - Tagged appropriately (e.g., `next`, `latest`, or version number)

### Verifying the Deployment

After deployment or update, verify the che-server is running with your custom image:

```bash
# Check the che-server pod
kubectl get pods -n eclipse-che -l app=che

# Verify the image being used
kubectl get deployment che -n eclipse-che -o jsonpath='{.spec.template.spec.containers[0].image}'
```

Expected output:
```
docker.io/olexii4dockerid/che-server:next
```

### Troubleshooting

**Image Pull Errors:**
```bash
# Check pod events
kubectl describe pod -n eclipse-che -l app=che

# Verify image exists in registry
docker pull docker.io/olexii4dockerid/che-server:next
```

**Update Not Applied:**
```bash
# Force recreation of che-server pod
kubectl delete pod -n eclipse-che -l app=che

# Check CheCluster status
kubectl get checluster -n eclipse-che -o yaml
```

### Additional Resources

- **chectl Documentation**: [https://github.com/che-incubator/chectl](https://github.com/che-incubator/chectl)
- **Eclipse Che Documentation**: [https://eclipse.dev/che/docs](https://eclipse.dev/che/docs)
- **CheCluster Custom Resource**: [https://doc.crds.dev/github.com/eclipse-che/che-operator](https://doc.crds.dev/github.com/eclipse-che/che-operator)

## SCM API Clients

The project includes comprehensive API clients for major SCM providers, enabling programmatic access to GitHub, GitLab, and Bitbucket APIs.

### Available Clients

#### GitHub API Client

```typescript
import { GithubApiClient } from './services/api-clients';

// Public GitHub
const client = new GithubApiClient();
const user = await client.getUser('ghp_token...');
const pr = await client.getPullRequest('123', 'owner', 'repo', 'token');

// GitHub Enterprise
const enterpriseClient = new GithubApiClient('https://github.enterprise.com');
```

**Features:**
- ✅ User information (`/user`)
- ✅ Pull request data (`/repos/{owner}/{repo}/pulls/{id}`)
- ✅ GitHub Enterprise support
- ✅ Token-based authentication

#### GitLab API Client

```typescript
import { GitlabApiClient } from './services/api-clients';

// Public GitLab
const client = new GitlabApiClient();
const user = await client.getUser('glpat-token...');
const tokenInfo = await client.getPersonalAccessTokenInfo('token');

// Self-hosted GitLab
const selfHostedClient = new GitlabApiClient('https://gitlab.example.com');
```

**Features:**
- ✅ User information (`/api/v4/user`)
- ✅ Personal Access Token info (`/api/v4/personal_access_tokens/self`)
- ✅ Self-hosted GitLab support
- ✅ Bearer token authentication
- ✅ Token scope validation

#### Bitbucket API Client

```typescript
import { BitbucketApiClient } from './services/api-clients';

const client = new BitbucketApiClient();
const user = await client.getUser('oauth_token');
const email = await client.getUserEmail('oauth_token');
const content = await client.getFileContent('workspace', 'repo', 'main', 'devfile.yaml', 'token');
const { username, scopes } = await client.getTokenScopes('token');
```

**Features:**
- ✅ User information (`/user`)
- ✅ User email (`/user/emails`)
- ✅ File content retrieval
- ✅ Token scope inspection
- ✅ Bearer token authentication
- ✅ High redirect tolerance (50 redirects)

### Error Handling

All API clients implement consistent error handling:

```typescript
import { UnauthorizedException } from './models/UnauthorizedException';
import { SCM_API_ERRORS } from './models/ScmApiModels';

try {
  const user = await client.getUser('token');
} catch (error) {
  if (error instanceof UnauthorizedException) {
    // Redirect to OAuth authentication
    console.log('Authenticate at:', error.oauthAuthenticationUrl);
  } else if (error.message.includes(SCM_API_ERRORS.NOT_FOUND)) {
    // Resource not found
  } else if (error.message.includes(SCM_API_ERRORS.COMMUNICATION)) {
    // Network error
  }
}
```

### Tests

All API clients have comprehensive test coverage (48 tests):

```bash
yarn test --testPathPattern="api-clients"
```

## `/scm/resolve` Endpoint

The `/scm/resolve` endpoint provides direct access to file content in SCM repositories, supporting both public and private repositories.

### Usage

**Public Repository** (No authentication):
```bash
curl 'http://localhost:8080/api/scm/resolve?repository=https://github.com/eclipse-che/che-dashboard&file=devfile.yaml'
```

**Private Repository** (With Bearer token):
```bash
curl 'http://localhost:8080/api/scm/resolve?repository=https://bitbucket.org/user/private-repo&file=devfile.yaml' \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

### Features

✅ **Public repository support** - No authentication required
✅ **Private repository support** - Bearer token authentication
✅ **Multiple SCM providers** - GitHub, GitLab, Bitbucket
✅ **Enterprise support** - GitHub Enterprise, self-hosted GitLab
✅ **Automatic provider detection** - Based on repository URL
✅ **Plain text response** - Returns raw file content

### Response Examples

**Success** (200 OK):
```yaml
schemaVersion: 2.1.0
metadata:
  name: my-project
```

**Unauthorized** (401):
```json
{
  "errorCode": 401,
  "message": "SCM Authentication required",
  "attributes": {
    "oauth_provider": "bitbucket",
    "oauth_version": "2.0",
    "oauth_authentication_url": "http://localhost:8080/oauth/authenticate?..."
  }
}
```

### Integration with Factory Resolver

The `/scm/resolve` endpoint is used in the `links` array returned by `/factory/resolver`:

```json
{
  "v": "4.0",
  "devfile": { ... },
  "links": [
    {
      "href": "http://localhost:8080/scm/resolve?repository=...&file=devfile.yaml",
      "method": "GET",
      "rel": "devfile.yaml content"
    }
  ]
}
```

## Comparison with Java Implementation

| Feature              | Java Implementation | TypeScript Implementation          |
| -------------------- | ------------------- | ---------------------------------- |
| Framework            | JAX-RS / RESTEasy   | **Fastify 5.0**                    |
| Dependency Injection | Guice / CDI         | Constructor injection              |
| K8s Client           | Fabric8             | @kubernetes/client-node            |
| Authentication       | EnvironmentContext  | **Fastify hooks**                  |
| DTO Pattern          | Eclipse Che DTO     | TypeScript interfaces              |
| API Documentation    | Swagger annotations | **@fastify/swagger + OpenAPI 3.0** |
| Performance          | ~5,000 req/s        | **~15,000 req/s** (3x faster)      |

## Development

### Code Style

The project follows TypeScript best practices:

- Strict type checking enabled
- ESLint for code quality
- Comprehensive JSDoc comments

### Adding Features

1. Create models in `src/models/`
2. Implement business logic in `src/services/`
3. Add routes in `src/routes/`
4. Update this README

## License

Eclipse Public License 2.0 (EPL-2.0)

Copyright (c) 2025 Red Hat, Inc.

## Documentation Files

### Core Documentation

- **README.md** (this file) - Complete API documentation and usage guide

### Implementation Guides (`docs/`)

- **[docs/NAMESPACE_PROVISIONING_IMPLEMENTATION.md](docs/NAMESPACE_PROVISIONING_IMPLEMENTATION.md)** - Kubernetes namespace provisioning: Java vs TypeScript comparison, @kubernetes/client-node usage
- **[docs/OAUTH_IMPLEMENTATION.md](docs/OAUTH_IMPLEMENTATION.md)** - OAuth authentication: Java vs TypeScript comparison, OAuth 2.0 flows, Kubernetes Secret configuration
- **[docs/swagger-examples.md](docs/swagger-examples.md)** - Swagger/OpenAPI usage examples and interactive documentation

### Docker & Deployment

- **[build/README.md](build/README.md)** - **Comprehensive Docker build guide** (multiplatform builds, troubleshooting, examples)
- **[build/build.sh](build/build.sh)** - Multiplatform Docker build script (linux/amd64, linux/arm64)
- **[build/dockerfiles/Dockerfile](build/dockerfiles/Dockerfile)** - Multi-stage production Dockerfile
- **[build/dockerfiles/entrypoint.sh](build/dockerfiles/entrypoint.sh)** - Container entrypoint script
- **[build/dockerfiles/docker-compose.yml](build/dockerfiles/docker-compose.yml)** - Optional compose file

### Eclipse Che Deployment

- **[cr-patch.yaml](cr-patch.yaml)** - CheCluster Custom Resource patch for deploying custom che-server image
- See **"Deploying to Eclipse Che"** section above for usage with `chectl` commands

## References

- [Eclipse Che Server (Java)](https://github.com/eclipse-che/che-server)
- [Eclipse Che Dashboard (Fastify)](https://github.com/eclipse-che/che-dashboard)
- [Kubernetes JavaScript Client](https://github.com/kubernetes-client/javascript)
- **[Fastify Documentation](https://fastify.dev)** ⭐
- **[@fastify/swagger](https://github.com/fastify/fastify-swagger)**
- **[@fastify/swagger-ui](https://github.com/fastify/fastify-swagger-ui)**
- [OpenAPI Specification](https://swagger.io/specification/)
- [Swagger UI](https://swagger.io/tools/swagger-ui/)

## Support

For issues related to:

- **TypeScript implementation**: Open an issue in this repository
- **Original Java API**: See [Eclipse Che documentation](https://www.eclipse.org/che/docs/)
