<#import "template.ftl" as layout>
<@layout.emailLayout>
<h1>${msg("organizationInviteSubject")}</h1>

<p>${msg("organizationInviteGreeting", user.firstName!"")}</p>

<p>${msg("organizationInviteBody", organization.name!"", invitedBy.firstName!"", invitedBy.lastName!"")}</p>

<#-- В Keycloak 26.x используем прямую ссылку на registration с action token -->
<#if link?? && link != "">
    <#-- Если есть готовая ссылка, используем её -->
    <#assign inviteUrl = link>
<#elseif actionToken?? && actionToken != "">
    <#-- Создаём ссылку для регистрации с action token -->
    <#assign inviteUrl = "${url.baseUrl}/realms/${realm.name}/login-actions/action-token?key=${actionToken}&client_id=account&tab_id=${tabId!''}">
<#else>
    <#-- Fallback ссылка на обычную регистрацию -->
    <#assign inviteUrl = "${url.baseUrl}/realms/${realm.name}/protocol/openid-connect/registrations?client_id=account&response_type=code&scope=openid&redirect_uri=${url.accountUrl?url}">
</#if>

<p>
    <a href="${inviteUrl}" style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 4px;">
        ${msg("organizationInviteButtonText")}
    </a>
</p>

<#-- Fallback ссылка -->
<p>${msg("organizationInviteAlternativeText")}</p>
<p><a href="${inviteUrl}">${inviteUrl}</a></p>

<p>${msg("organizationInviteExpiration", linkExpiration)}</p>

<p>${msg("organizationInviteFooter")}</p>
</@layout.emailLayout>
