<#import "template.ftl" as layout>
<@layout.registrationLayout displayMessage=false; section>
    <#if section = "header">
        ${msg("errorTitle")}
    <#elseif section = "form">
        <div id="kc-error-message">
            <#if message?? && message.summary??>
                <p class="instruction">${message.summary}</p>
            <#else>
                <p class="instruction">${msg("unexpectedErrorMessage")}</p>
            </#if>
            <#if client?? && client.baseUrl?has_content>
                <p><a id="backToApplication" href="${client.baseUrl}">${msg("backToApplication")}</a></p>
            </#if>
        </div>
    </#if>
</@layout.registrationLayout>
