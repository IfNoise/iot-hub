#!/bin/bash

set -euo pipefail

REALM="iot-hub"
CLIENT_NAME="account"
ADMIN_USER="noise83"
ADMIN_PASSWORD="00000006"
KEYCLOAK_URL="http://localhost:8080"
ROLES=("manage-account" "view-profile" "manage-account-links")

echo "🔐 Получаем admin access token..."

TOKEN=$(curl -s "$KEYCLOAK_URL/realms/master/protocol/openid-connect/token" \
  -d "grant_type=password" \
  -d "client_id=admin-cli" \
  -d "username=$ADMIN_USER" \
  -d "password=$ADMIN_PASSWORD" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  | jq -r .access_token)

if [[ -z "$TOKEN" || "$TOKEN" == "null" ]]; then
  echo "❌ Ошибка: не удалось получить admin access_token"
  exit 1
fi
 echo $TOKEN | jq -R 'split(".") | .[1] | @base64d | fromjson' 
# Проверим наличие роли realm-admin
if ! echo "$TOKEN" | cut -d '.' -f2 | base64 -d 2>/dev/null | jq -e '.realm_access.roles | index("realm-admin")' >/dev/null; then
  echo "❌ Ошибка: access_token не содержит роли 'realm-admin'"
  exit 1
fi

echo "✅ Токен получен и проверен"

echo "🔍 Получаем clientId клиента '$CLIENT_NAME' в realm '$REALM'..."

CLIENT_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" "$KEYCLOAK_URL/admin/realms/$REALM/clients")

CLIENT_ID=$(echo "$CLIENT_RESPONSE" | jq -r ".[] | select(.clientId==\"$CLIENT_NAME\") | .id")

if [[ -z "$CLIENT_ID" ]]; then
  echo "❌ Ошибка: clientId клиента '$CLIENT_NAME' не найден"
  exit 1
fi

echo "✅ clientId: $CLIENT_ID"

echo "🔍 Получаем ID ролей..."

ROLE_OBJECTS=()
for ROLE_NAME in "${ROLES[@]}"; do
  echo "➡️  Получаем роль '$ROLE_NAME'..."
  ROLE_JSON=$(curl -s -H "Authorization: Bearer $TOKEN" \
    "$KEYCLOAK_URL/admin/realms/$REALM/roles/$ROLE_NAME")

  ROLE_ID=$(echo "$ROLE_JSON" | jq -r '.id')
  if [[ -z "$ROLE_ID" || "$ROLE_ID" == "null" ]]; then
    echo "❌ Ошибка: роль '$ROLE_NAME' не найдена"
    exit 1
  fi

  ROLE_OBJECT=$(echo "$ROLE_JSON" | jq '{id, name, clientRole, composite, containerId}')
  ROLE_OBJECTS+=("$ROLE_OBJECT")
done

# Собираем JSON-массив
ROLE_PAYLOAD=$(printf "%s\n" "${ROLE_OBJECTS[@]}" | jq -s '.')

echo "📤 Назначаем роли клиенту '$CLIENT_NAME'..."

RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
  "$KEYCLOAK_URL/admin/realms/$REALM/clients/$CLIENT_ID/scope-mappings/realm" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "$ROLE_PAYLOAD")

if [[ "$RESPONSE" == "204" ]]; then
  echo "✅ Роли успешно назначены"
else
  echo "❌ Ошибка: HTTP $RESPONSE при назначении ролей"
  exit 1
fi
