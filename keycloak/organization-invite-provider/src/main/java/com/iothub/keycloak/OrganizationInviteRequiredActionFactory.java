package com.iothub.keycloak;

import org.keycloak.Config;
import org.keycloak.authentication.RequiredActionFactory;
import org.keycloak.authentication.RequiredActionProvider;
import org.keycloak.models.KeycloakSession;
import org.keycloak.models.KeycloakSessionFactory;

/**
 * Фабрика для OrganizationInviteRequiredAction
 */
public class OrganizationInviteRequiredActionFactory implements RequiredActionFactory {

    @Override
    public RequiredActionProvider create(KeycloakSession session) {
        return new OrganizationInviteRequiredAction();
    }

    @Override
    public String getId() {
        return OrganizationInviteRequiredAction.PROVIDER_ID;
    }

    @Override
    public String getDisplayText() {
        return "Organization Invitation";
    }

    @Override
    public void init(Config.Scope config) {
        // Инициализация не требуется
    }

    @Override
    public void postInit(KeycloakSessionFactory factory) {
        // Пост-инициализация не требуется
    }

    @Override
    public void close() {
        // Ничего не нужно закрывать
    }

    @Override
    public boolean isOneTimeAction() {
        return true;
    }
}
