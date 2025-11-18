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

echo "🚀 Starting che-server-new in LOCAL DEV mode"
echo "=============================================="
echo ""

# Check for SERVICE_ACCOUNT_TOKEN
if [ -z "$SERVICE_ACCOUNT_TOKEN" ]; then
    echo "❌ ERROR: SERVICE_ACCOUNT_TOKEN not set!"
    echo ""
    echo "   Required for namespace operations."
    echo "   Get your token with:"
    echo ""
    echo "   export SERVICE_ACCOUNT_TOKEN=\$(oc whoami -t)  # OpenShift"
    echo "   export SERVICE_ACCOUNT_TOKEN=\$(kubectl config view --raw -o jsonpath='{.users[0].user.token}')  # Kubernetes"
    echo ""
    exit 1
fi

echo "✅ SERVICE_ACCOUNT_TOKEN is set"
echo ""

# Kill existing server on port 8080
if lsof -ti tcp:8080 &>/dev/null 2>&1; then
    echo "Stopping existing server on port 8080..."
    lsof -ti tcp:8080 | xargs kill 2>/dev/null
    sleep 2
fi

# Set environment variables
export LOCAL_RUN=true
export NODE_ENV=development

echo "Environment:"
echo "  LOCAL_RUN=true"
echo "  NODE_ENV=development"
echo "  SERVICE_ACCOUNT_TOKEN=***...${SERVICE_ACCOUNT_TOKEN: -20}"
echo ""

# Start server
echo "Starting server..."
echo ""
yarn dev

ZXlKaGJHY2lPaUpTVXpJMU5pSXNJbXRwWkNJNkltUlZRVVpHVFVsVlRHcENTbTloWW5oT1JGSjZMWG8yYjJOWlYyNUNaMnB4VmxaeU5sUlNZbWN5YkZVaWZRLmV5SnBjM01pT2lKcmRXSmxjbTVsZEdWekwzTmxjblpwWTJWaFkyTnZkVzUwSWl3aWEzVmlaWEp1WlhSbGN5NXBieTl6WlhKMmFXTmxZV05qYjNWdWRDOXVZVzFsYzNCaFkyVWlPaUprYjJkbWIyOWthVzVuSWl3aWEzVmlaWEp1WlhSbGN5NXBieTl6WlhKMmFXTmxZV05qYjNWdWRDOXpaV055WlhRdWJtRnRaU0k2SW1Ob1pTMTBiMnRsYmkxb05tSTRkQ0lzSW10MVltVnlibVYwWlhNdWFXOHZjMlZ5ZG1salpXRmpZMjkxYm5RdmMyVnlkbWxqWlMxaFkyTnZkVzUwTG01aGJXVWlPaUpqYUdVaUxDSnJkV0psY201bGRHVnpMbWx2TDNObGNuWnBZMlZoWTJOdmRXNTBMM05sY25acFkyVXRZV05qYjNWdWRDNTFhV1FpT2lKbU5ESTJZVFV3TWkxall6YzBMVFJtTnpZdFltTmlOaTAwT1RobFpHWm1ORGhpTldVaUxDSnpkV0lpT2lKemVYTjBaVzA2YzJWeWRtbGpaV0ZqWTI5MWJuUTZaRzluWm05dlpHbHVaenBqYUdVaWZRLkd4d0FwemJXNW9zTW51LWo1ajk2MDBialpXeWlRWnhNQU5aNGxlUGtXc1h1ZWthMWlZaUdmQ19XS05uaGdQd0tqdWdKNTVCSGlFSjF0R0ZURkl4aTZmaDVvdnRTX0VFU1NTd09vbFF0NV96cHBfVkFOTzdFVmJVOGRQaXJ4d3RkbnR4aE80RGtxS2I0dGFPRkw2MTE5WTdfcGlOYzZOc240ZW5xczFhSUVvcU5CTGtKX2Y4NXgyNkRaaG1VSlBwVm5DTERSU19IbGhwQmt4cmpTY05GZ1ZUOFFnQkJtSDliOHA5MjlhaHNoWENETVBETDQxZXdQd2VpemVUTDRieEZIaUdOY2N2UTJZSXh5bHBMVEFKbFZCdmtGeXhweWFXTzJrbHdOMG8zT1B1REhUdFg3dFR0S0szUUo0SUdYcTR6UGhjc2hheUNHby13eVZyNDJMY0E0UQ==
