# Kubernetes Namespace Provisioner API

A TypeScript/Fastify implementation of the Eclipse Che server's REST APIs.

> **Framework**: Fastify 5.0 (migrated from Express.js)

## Overview

This project provides a high-performance REST API implementation using Fastify, mirroring the functionality of the Java-based Eclipse Che server. It has been migrated from Express.js to Fastify to align with the Eclipse Che Dashboard backend architecture.

### Original Java Implementation

This TypeScript project is based on:

- **Namespace Service**: `org.eclipse.che.workspace.infrastructure.kubernetes.api.server.KubernetesNamespaceService`
- **Factory Service**: `org.eclipse.che.api.factory.server.FactoryService`
- **OAuth Service**: `org.eclipse.che.security.oauth.OAuthAuthenticationService`
- **SCM Service**: `org.eclipse.che.api.factory.server.ScmService`

## Features

### Kubernetes Namespace Management

- ✅ POST `/kubernetes/namespace/provision` - Provision a namespace for authenticated users
- ✅ GET `/kubernetes/namespace` - List available namespaces

### Factory Management

- ✅ POST `/factory/resolver` - Resolve factory from URL
- ✅ POST `/factory/token/refresh` - Refresh factory OAuth tokens

### OAuth Authentication

- ✅ GET `/oauth` - Get registered OAuth authenticators
- ✅ GET `/oauth/token` - Get OAuth token for provider
- ✅ DELETE `/oauth/token` - Invalidate OAuth token

### SCM Integration

- ✅ GET `/scm/resolve` - Resolve file content from SCM repository

### Technical Features

- ✅ **Fastify 5.0** - High-performance web framework (2-3x faster than Express)
- ✅ **@fastify/swagger** - Schema-based API documentation
- ✅ **@fastify/swagger-ui** - Interactive API documentation at `/swagger`
- ✅ Authentication hooks (Bearer token and Basic auth)
- ✅ Kubernetes client integration
- ✅ Namespace name templating (e.g., `che-<username>`)
- ✅ Full TypeScript type safety with Fastify decorators
- ✅ Comprehensive Jest test suite using Fastify inject()
- ✅ Built-in request validation with JSON Schema
- ✅ Structured logging with Pino

## 📚 API Documentation

This API includes comprehensive **Swagger/OpenAPI 3.0** documentation!

Once the server is running, visit:

- **Swagger UI**: http://localhost:8080/swagger
- **OpenAPI JSON**: http://localhost:8080/swagger/json
- **OpenAPI YAML**: http://localhost:8080/swagger/yaml

The interactive Swagger UI allows you to:

- 🔍 Explore all endpoints and their parameters
- 🔐 Authenticate with Bearer or Basic auth
- ▶️ Try out API calls directly from the browser
- 📖 View request/response schemas and examples
- 📥 Download the OpenAPI specification

See [SWAGGER_GUIDE.md](SWAGGER_GUIDE.md) for detailed Swagger documentation.

## API Endpoints

### 1. Provision Namespace

**Endpoint**: `POST /kubernetes/namespace/provision`

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

**Endpoint**: `GET /kubernetes/namespace`

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

**Endpoint**: `POST /factory/resolver`

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

**Endpoint**: `GET /oauth`

**Description**: Get list of registered OAuth providers (GitHub, GitLab, Bitbucket).

**Authentication**: Required

**Response** (200 OK):

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

### 5. Get OAuth Token

**Endpoint**: `GET /oauth/token?oauth_provider=github`

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

**Endpoint**: `GET /scm/resolve?repository=https://github.com/user/repo&file=devfile.yaml`

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

### 8. Health Check

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

Run with auto-reload:

```bash
yarn dev
```

### Production Mode

Build and run:

```bash
yarn build
yarn start
```

The API will be available at `http://localhost:8080`.

## Testing the API

### Using curl

**Provision a namespace**:

```bash
curl -X POST http://localhost:8080/kubernetes/namespace/provision \
  -H "Authorization: Bearer user123:johndoe" \
  -H "Content-Type: application/json"
```

**List namespaces**:

```bash
curl http://localhost:8080/kubernetes/namespace \
  -H "Authorization: Bearer user123:johndoe"
```

### Using Basic Auth

```bash
# Provision namespace
curl -X POST http://localhost:8080/kubernetes/namespace/provision \
  -u "johndoe:user123"

# List namespaces
curl http://localhost:8080/kubernetes/namespace \
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

| Variable             | Description                  | Default          |
| -------------------- | ---------------------------- | ---------------- |
| `PORT`               | Server port                  | `8080`           |
| `NODE_ENV`           | Environment mode             | `development`    |
| `NAMESPACE_TEMPLATE` | Template for namespace names | `che-<username>` |

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

### Quick Start with Docker

The Dockerfile follows Eclipse Che patterns (Dashboard and Server):

```bash
# Build using the build script (recommended)
build/build.sh

# Run the container
docker run -p 8080:8080 che-server

# Or build and run manually
docker build -f build/dockerfiles/Dockerfile -t che-server .
docker run -p 8080:8080 che-server
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

- **[DOCKER_QUICK_START.md](DOCKER_QUICK_START.md)** - Quick start guide
- **[DOCKERFILE_IMPLEMENTATION.md](DOCKERFILE_IMPLEMENTATION.md)** - Implementation details following Eclipse Che patterns
- **[build/build.sh](build/build.sh)** - Build script

### Optional: Docker Compose

A docker-compose.yml is provided for convenience but not required:

```bash
docker-compose -f build/dockerfiles/docker-compose.yml up
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

- **README.md** (this file) - Complete API documentation
- **[QUICKSTART.md](QUICKSTART.md)** - Get started in 5 minutes
- **[SWAGGER_GUIDE.md](SWAGGER_GUIDE.md)** - Swagger/OpenAPI documentation guide
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - System architecture and diagrams
- **[PROJECT_SUMMARY.md](PROJECT_SUMMARY.md)** - Complete project overview

### Migration Guides

- **[FASTIFY_MIGRATION.md](FASTIFY_MIGRATION.md)** - ⭐ **Express to Fastify migration guide**
- **[YARN_MIGRATION.md](YARN_MIGRATION.md)** - ⭐ **npm to Yarn 4.9.0 migration guide**
- **[LICENSE_HEADERS.md](LICENSE_HEADERS.md)** - ⭐ **EPL-2.0 license headers guide**
- **[IMPLEMENTATION_NOTES.md](IMPLEMENTATION_NOTES.md)** - Java-to-TypeScript mapping details

### Docker & Deployment

- **[DOCKER_QUICK_START.md](DOCKER_QUICK_START.md)** - ⭐ **Docker quick start guide**
- **[DOCKERFILE_IMPLEMENTATION.md](DOCKERFILE_IMPLEMENTATION.md)** - ⭐ **Dockerfile following Eclipse Che patterns**
- **[build/build.sh](build/build.sh)** - Build script
- **[docker-compose.yml](build/dockerfiles/docker-compose.yml)** - Optional compose file

### API Implementation

- **[NEW_APIS_COMPLETE.md](NEW_APIS_COMPLETE.md)** - Factory API implementation summary
- **[OAUTH_SCM_IMPLEMENTATION.md](OAUTH_SCM_IMPLEMENTATION.md)** - OAuth and SCM API implementation summary
- **[MIGRATION_COMPLETE.md](MIGRATION_COMPLETE.md)** - OAuth/SCM APIs migration summary
- **[FACTORY_RESOLVER_FIX.md](FACTORY_RESOLVER_FIX.md)** - Factory resolver bug fixes

### Change Logs

- **[CHANGES_SUMMARY.md](CHANGES_SUMMARY.md)** - Summary of all changes
- **[SWAGGER_PATH_UPDATE.md](SWAGGER_PATH_UPDATE.md)** - Swagger path change details
- **[PORT_CHANGE_SUMMARY.md](PORT_CHANGE_SUMMARY.md)** - Default port change details

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
