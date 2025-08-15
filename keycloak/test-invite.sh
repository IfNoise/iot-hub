#!/bin/bash

# Скрипт для тестирования организационного инвайта в Keycloak 26.3.2
# Открывает форму регистрации с предзаполненными данными

REALM="iot-hub"
BASE_URL="http://localhost:8080"
CLIENT_ID="account"
ORG_ID="test-org-$(date +%s)"
ORG_NAME="Test%20Organization"
INVITATION_TOKEN="test-token-$(date +%s)"
TAB_ID="test-tab-$(date +%s)"

# Формируем URL для тестирования action token (рекомендуемый способ для KC 26.x)
TEST_URL="${BASE_URL}/realms/${REALM}/login-actions/action-token?key=${INVITATION_TOKEN}&client_id=${CLIENT_ID}&tab_id=${TAB_ID}"

# Альтернативный URL для прямой регистрации с параметрами
ALT_URL="${BASE_URL}/realms/${REALM}/login-actions/registration?client_id=${CLIENT_ID}&invitation_token=${INVITATION_TOKEN}&org_id=${ORG_ID}&org_name=${ORG_NAME}&tab_id=${TAB_ID}"

echo "Testing organization invite for Keycloak 26.3.2"
echo ""
echo "Primary URL (action-token): $TEST_URL"
echo "Alternative URL (direct): $ALT_URL"
echo ""
echo "Expected behavior:"
echo "- Account type should be automatically set to 'Enterprise'"
echo "- Organization name should be prefilled with 'Test Organization'"
echo "- Account type selection should be hidden"
echo "- Organization fields should be visible and readonly"
echo "- No PKCE errors should occur"
echo ""
echo "Opening primary URL in default browser..."

# Попытка открыть URL в браузере
if command -v xdg-open > /dev/null; then
    xdg-open "$TEST_URL"
elif command -v open > /dev/null; then
    open "$TEST_URL"
else
    echo "Cannot open browser automatically. Please copy this URL:"
    echo "$TEST_URL"
    echo ""
    echo "Or try the alternative URL:"
    echo "$ALT_URL"
fi
