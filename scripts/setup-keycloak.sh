#!/bin/bash

# Keycloak Setup Script
# This script initializes Keycloak with IoT Hub realm configuration

set -e

KEYCLOAK_URL="http://localhost:8080"
ADMIN_USER="admin"
ADMIN_PASSWORD="iot-keycloak-admin"
REALM_NAME="iot-hub"

echo "🚀 Starting Keycloak setup for IoT Hub..."

# Wait for Keycloak to be ready
echo "⏳ Waiting for Keycloak to be ready..."
while ! curl -s "$KEYCLOAK_URL/health/ready" > /dev/null; do
    echo "   Waiting for Keycloak..."
    sleep 5
done

echo "✅ Keycloak is ready!"

# Get admin access token
echo "🔑 Getting admin access token..."
ADMIN_TOKEN=$(curl -s -X POST "$KEYCLOAK_URL/realms/master/protocol/openid-connect/token" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "username=$ADMIN_USER" \
    -d "password=$ADMIN_PASSWORD" \
    -d "grant_type=password" \
    -d "client_id=admin-cli" | \
    jq -r '.access_token')

if [ "$ADMIN_TOKEN" = "null" ] || [ -z "$ADMIN_TOKEN" ]; then
    echo "❌ Failed to get admin token. Check Keycloak admin credentials."
    exit 1
fi

echo "✅ Admin token obtained"

# Check if realm already exists
echo "🔍 Checking if realm '$REALM_NAME' exists..."
REALM_EXISTS=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    "$KEYCLOAK_URL/admin/realms/$REALM_NAME")

if [ "$REALM_EXISTS" = "200" ]; then
    echo "⚠️  Realm '$REALM_NAME' already exists. Skipping creation."
else
    # Import realm configuration
    echo "📦 Importing realm configuration..."
    IMPORT_RESULT=$(curl -s -w "%{http_code}" -o /tmp/import_response.json \
        -X POST "$KEYCLOAK_URL/admin/realms" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -H "Content-Type: application/json" \
        -d @./keycloak/realm-configs/iot-hub-realm.json)

    if [ "$IMPORT_RESULT" = "201" ]; then
        echo "✅ Realm '$REALM_NAME' created successfully"
    else
        echo "❌ Failed to create realm. HTTP code: $IMPORT_RESULT"
        echo "Response:"
        cat /tmp/import_response.json
        exit 1
    fi
fi

# Set up service account roles for backend client
echo "🔧 Setting up backend service account roles..."
BACKEND_CLIENT_ID=$(curl -s \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    "$KEYCLOAK_URL/admin/realms/$REALM_NAME/clients?clientId=iot-hub-backend" | \
    jq -r '.[0].id')

if [ "$BACKEND_CLIENT_ID" != "null" ] && [ -n "$BACKEND_CLIENT_ID" ]; then
    # Get service account user
    SERVICE_ACCOUNT_USER=$(curl -s \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        "$KEYCLOAK_URL/admin/realms/$REALM_NAME/clients/$BACKEND_CLIENT_ID/service-account-user" | \
        jq -r '.id')
    
    # Get realm management client ID
    REALM_MGMT_CLIENT_ID=$(curl -s \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        "$KEYCLOAK_URL/admin/realms/$REALM_NAME/clients?clientId=realm-management" | \
        jq -r '.[0].id')
    
    # Get required roles
    MANAGE_USERS_ROLE=$(curl -s \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        "$KEYCLOAK_URL/admin/realms/$REALM_NAME/clients/$REALM_MGMT_CLIENT_ID/roles/manage-users" | \
        jq -r '{id, name}')
    
    MANAGE_CLIENTS_ROLE=$(curl -s \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        "$KEYCLOAK_URL/admin/realms/$REALM_NAME/clients/$REALM_MGMT_CLIENT_ID/roles/manage-clients" | \
        jq -r '{id, name}')
    
    VIEW_USERS_ROLE=$(curl -s \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        "$KEYCLOAK_URL/admin/realms/$REALM_NAME/clients/$REALM_MGMT_CLIENT_ID/roles/view-users" | \
        jq -r '{id, name}')
    
    # Assign roles to service account
    curl -s -X POST \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -H "Content-Type: application/json" \
        "$KEYCLOAK_URL/admin/realms/$REALM_NAME/users/$SERVICE_ACCOUNT_USER/role-mappings/clients/$REALM_MGMT_CLIENT_ID" \
        -d "[$MANAGE_USERS_ROLE, $MANAGE_CLIENTS_ROLE, $VIEW_USERS_ROLE]"
    
    echo "✅ Backend service account roles configured"
else
    echo "⚠️  Backend client not found, skipping service account setup"
fi

echo ""
echo "🎉 Keycloak setup completed successfully!"
echo ""
echo "📋 Configuration Summary:"
echo "   Keycloak URL: $KEYCLOAK_URL"
echo "   Realm: $REALM_NAME"
echo "   Admin Console: $KEYCLOAK_URL/admin/"
echo "   Admin User: $ADMIN_USER"
echo "   Admin Password: $ADMIN_PASSWORD"
echo ""
echo "🔗 Client Configuration:"
echo "   Frontend Client ID: iot-hub-frontend"
echo "   Backend Client ID: iot-hub-backend"
echo ""
echo "🌐 URLs:"
echo "   Auth URL: $KEYCLOAK_URL/realms/$REALM_NAME/protocol/openid-connect/auth"
echo "   Token URL: $KEYCLOAK_URL/realms/$REALM_NAME/protocol/openid-connect/token"
echo "   UserInfo URL: $KEYCLOAK_URL/realms/$REALM_NAME/protocol/openid-connect/userinfo"
echo "   Logout URL: $KEYCLOAK_URL/realms/$REALM_NAME/protocol/openid-connect/logout"
echo ""
