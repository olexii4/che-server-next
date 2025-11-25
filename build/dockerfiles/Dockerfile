# Copyright (c) 2025 Red Hat, Inc.
# This program and the accompanying materials are made
# available under the terms of the Eclipse Public License 2.0
# which is available at https://www.eclipse.org/legal/epl-2.0/
#
# SPDX-License-Identifier: EPL-2.0
#
# Contributors:
#   Red Hat, Inc. - initial API and implementation

FROM docker.io/node:20.18.0-alpine3.20 AS builder

RUN apk add --no-cache python3 make g++ git

# Capture git commit hash and build info
ARG GIT_COMMIT_SHA="unknown"
ARG BUILD_DATE="unknown"

# Copy Yarn configuration
COPY .yarn/releases /che-server/.yarn/releases/
COPY .yarnrc.yml /che-server/.yarnrc.yml
COPY package.json /che-server/
COPY yarn.lock /che-server/
COPY tsconfig.json /che-server/

WORKDIR /che-server
RUN yarn install --network-timeout 3600000

COPY src /che-server/src
COPY webpack.config.common.js /che-server/
COPY webpack.config.prod.js /che-server/
COPY webpack.config.dev.js /che-server/
RUN yarn build

# Create version file
RUN echo "Che Server Version Information" > /che-server/dist/version.txt && \
    echo "==============================" >> /che-server/dist/version.txt && \
    echo "Git Commit: ${GIT_COMMIT_SHA}" >> /che-server/dist/version.txt && \
    echo "Build Date: ${BUILD_DATE}" >> /che-server/dist/version.txt && \
    echo "Node Version: $(node --version)" >> /che-server/dist/version.txt

# Production image
FROM docker.io/node:20.18.0-alpine3.20

# Pass build args to runtime
ARG GIT_COMMIT_SHA="unknown"
ARG BUILD_DATE="unknown"
ENV GIT_COMMIT_SHA=${GIT_COMMIT_SHA}
ENV BUILD_DATE=${BUILD_DATE}

RUN apk add --no-cache curl shadow

ENV CHE_HOME=/home/user/che-server

# Copy built application from builder
COPY --from=builder /che-server/dist ${CHE_HOME}/dist
COPY --from=builder /che-server/node_modules ${CHE_HOME}/node_modules
COPY --from=builder /che-server/package.json ${CHE_HOME}/

# Copy entrypoint script
COPY build/dockerfiles/entrypoint.sh /entrypoint.sh

# Create user and directories with proper permissions
RUN addgroup -g 1001 user && \
    adduser -u 1001 -G user -D user && \
    chown -R user:user ${CHE_HOME} && \
    chmod -R g+rwX ${CHE_HOME} && \
    chmod +x /entrypoint.sh

USER user

EXPOSE 8080

ENTRYPOINT ["/entrypoint.sh"]
CMD ["sh"]

