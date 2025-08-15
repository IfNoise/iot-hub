package com.iothub.keycloak;

import org.jboss.logging.Logger;
import org.keycloak.authentication.RequiredActionContext;
import org.keycloak.authentication.RequiredActionProvider;
import org.keycloak.forms.login.LoginFormsProvider;
import org.keycloak.models.KeycloakSession;
import org.keycloak.models.UserModel;

import javax.ws.rs.core.MultivaluedMap;
import javax.ws.rs.core.Response;

/**
 * Required Action для обработки организационных инвайтов
 */
public class OrganizationInviteRequiredAction implements RequiredActionProvider {

    private static final Logger logger = Logger.getLogger(OrganizationInviteRequiredAction.class);
    public static final String PROVIDER_ID = "organization-invite";

    @Override
    public void evaluateTriggers(RequiredActionContext context) {
        // Проверяем наличие invitation_token в форме или сессии
        String invitationToken = context.getHttpRequest().getDecodedFormParameters()
                .getFirst("invitation_token");
        
        if (invitationToken != null && !invitationToken.trim().isEmpty()) {
            logger.infof("Invitation token found: %s", invitationToken);
            context.getUser().setSingleAttribute("invitation_token", invitationToken);
        }
    }

    @Override
    public void requiredActionChallenge(RequiredActionContext context) {
        // Если есть приглашение, подготавливаем форму с предзаполненными данными
        MultivaluedMap<String, String> formData = context.getHttpRequest().getDecodedFormParameters();
        
        LoginFormsProvider form = context.form();
        
        // Добавляем данные об организации в контекст формы
        String orgId = formData.getFirst("user.attributes.organization_id");
        String orgName = formData.getFirst("user.attributes.organization_name");
        String invitationToken = formData.getFirst("invitation_token");
        
        if (orgId != null) {
            form.setAttribute("orgId", orgId);
        }
        if (orgName != null) {
            form.setAttribute("orgName", orgName);
        }
        if (invitationToken != null) {
            form.setAttribute("invitationToken", invitationToken);
        }
        
        logger.infof("Organization invite challenge - orgId: %s, orgName: %s", orgId, orgName);
        
        Response response = form.createRegistration();
        context.challenge(response);
    }

    @Override
    public void processAction(RequiredActionContext context) {
        MultivaluedMap<String, String> formData = context.getHttpRequest().getDecodedFormParameters();
        UserModel user = context.getUser();
        
        // Обрабатываем данные об организации
        String orgId = formData.getFirst("user.attributes.organization_id");
        String orgName = formData.getFirst("user.attributes.organization_name");
        String invitationToken = formData.getFirst("invitation_token");
        
        if (orgId != null && !orgId.trim().isEmpty()) {
            user.setSingleAttribute("organization_id", orgId);
            logger.infof("Set organization_id for user %s: %s", user.getUsername(), orgId);
        }
        
        if (orgName != null && !orgName.trim().isEmpty()) {
            user.setSingleAttribute("organization_name", orgName);
            logger.infof("Set organization_name for user %s: %s", user.getUsername(), orgName);
        }
        
        if (invitationToken != null && !invitationToken.trim().isEmpty()) {
            user.setSingleAttribute("invitation_token", invitationToken);
            logger.infof("Set invitation_token for user %s", user.getUsername());
        }
        
        // Завершаем required action
        context.success();
    }

    @Override
    public String getDisplayText() {
        return "Organization Invitation";
    }

    @Override
    public void close() {
        // Ничего не нужно закрывать
    }
}
