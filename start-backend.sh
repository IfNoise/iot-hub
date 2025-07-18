#!/bin/bash
cd /home/noise83/Projects/Nodejs/iot-hub
export NODE_ENV=development
export PORT=3001
export DB_HOST=localhost
export DB_PORT=5432
export DB_USERNAME=postgres
export DB_PASSWORD=postgres
export DB_DATABASE=iot_hub
export KEYCLOAK_URL=http://localhost:8080
export KEYCLOAK_REALM=iot-hub
export KEYCLOAK_CLIENT_ID=iot-hub-backend
export KEYCLOAK_CLIENT_SECRET=backend-secret
export KEYCLOAK_ADMIN_USERNAME=admin
export KEYCLOAK_ADMIN_PASSWORD=admin

node dist/apps/backend/src/main.js
