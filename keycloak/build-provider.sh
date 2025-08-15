#!/bin/bash

# Script to build the organization invite provider

echo "Building Keycloak Organization Invite Provider..."

# Navigate to the provider directory
cd "$(dirname "$0")/organization-invite-provider"

# Clean and build the project
mvn clean package

# Check if build was successful
if [ $? -eq 0 ]; then
    echo "Build successful!"
    
    # Copy the JAR to the providers directory
    cp target/keycloak-organization-invite-provider-1.0.0.jar ../providers/
    
    echo "Provider JAR copied to ../providers/"
    echo "Please restart Keycloak to load the new provider"
else
    echo "Build failed!"
    exit 1
fi
