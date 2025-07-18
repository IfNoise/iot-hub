<#import "template.ftl" as layout>
<@layout.registrationLayout displayMessage=!messagesPerField.existsError('firstName','lastName','email','username','password','password-confirm','account_type') displayInfo=realm.password && realm.registrationAllowed && !registrationDisabled??; section>
    <#if section = "header">
        ${msg("registerTitle")}
    <#elseif section = "form">
        <form id="kc-register-form" class="${properties.kcFormClass!}" action="${url.registrationAction}" method="post">
            <!-- Account Type Selection -->
            <div class="account-type-selection">
                <h3>${msg("accountTypeSelection")}</h3>
                <div class="account-type-options">
                    <div class="account-type-option">
                        <input type="radio" id="personal" name="user.attributes.account_type" value="personal" 
                               <#if (register.formData['user.attributes.account_type']!'personal') == 'personal'>checked</#if>
                               onchange="toggleOrganizationFields()">
                        <label for="personal">
                            <div class="option-title">${msg("personalAccount")}</div>
                            <div class="option-description">${msg("personalAccountDescription")}</div>
                        </label>
                    </div>
                    <div class="account-type-option">
                        <input type="radio" id="enterprise" name="user.attributes.account_type" value="enterprise"
                               <#if (register.formData['user.attributes.account_type']!'') == 'enterprise'>checked</#if>
                               onchange="toggleOrganizationFields()">
                        <label for="enterprise">
                            <div class="option-title">${msg("enterpriseAccount")}</div>
                            <div class="option-description">${msg("enterpriseAccountDescription")}</div>
                        </label>
                    </div>
                </div>
            </div>

            <!-- Basic User Information -->
            <div class="${properties.kcFormGroupClass!}">
                <div class="${properties.kcLabelWrapperClass!}">
                    <label for="firstName" class="${properties.kcLabelClass!}">${msg("firstName")}</label>
                </div>
                <div class="${properties.kcInputWrapperClass!}">
                    <input type="text" id="firstName" class="${properties.kcInputClass!}" name="firstName"
                           value="${(register.formData.firstName!'')}"
                           aria-invalid="<#if messagesPerField.existsError('firstName')>true</#if>"
                    />

                    <#if messagesPerField.existsError('firstName')>
                        <span id="input-error-firstname" class="${properties.kcInputErrorMessageClass!}" aria-live="polite">
                            ${kcSanitize(messagesPerField.get('firstName'))?no_esc}
                        </span>
                    </#if>
                </div>
            </div>

            <div class="${properties.kcFormGroupClass!}">
                <div class="${properties.kcLabelWrapperClass!}">
                    <label for="lastName" class="${properties.kcLabelClass!}">${msg("lastName")}</label>
                </div>
                <div class="${properties.kcInputWrapperClass!}">
                    <input type="text" id="lastName" class="${properties.kcInputClass!}" name="lastName"
                           value="${(register.formData.lastName!'')}"
                           aria-invalid="<#if messagesPerField.existsError('lastName')>true</#if>"
                    />

                    <#if messagesPerField.existsError('lastName')>
                        <span id="input-error-lastname" class="${properties.kcInputErrorMessageClass!}" aria-live="polite">
                            ${kcSanitize(messagesPerField.get('lastName'))?no_esc}
                        </span>
                    </#if>
                </div>
            </div>

            <div class="${properties.kcFormGroupClass!}">
                <div class="${properties.kcLabelWrapperClass!}">
                    <label for="email" class="${properties.kcLabelClass!}">${msg("email")}</label>
                </div>
                <div class="${properties.kcInputWrapperClass!}">
                    <input type="text" id="email" class="${properties.kcInputClass!}" name="email"
                           value="${(register.formData.email!'')}" autocomplete="email"
                           aria-invalid="<#if messagesPerField.existsError('email')>true</#if>"
                    />

                    <#if messagesPerField.existsError('email')>
                        <span id="input-error-email" class="${properties.kcInputErrorMessageClass!}" aria-live="polite">
                            ${kcSanitize(messagesPerField.get('email'))?no_esc}
                        </span>
                    </#if>
                </div>
            </div>

            <#if !realm.registrationEmailAsUsername>
                <div class="${properties.kcFormGroupClass!}">
                    <div class="${properties.kcLabelWrapperClass!}">
                        <label for="username" class="${properties.kcLabelClass!}">${msg("username")}</label>
                    </div>
                    <div class="${properties.kcInputWrapperClass!}">
                        <input type="text" id="username" class="${properties.kcInputClass!}" name="username"
                               value="${(register.formData.username!'')}" autocomplete="username"
                               aria-invalid="<#if messagesPerField.existsError('username')>true</#if>"
                        />

                        <#if messagesPerField.existsError('username')>
                            <span id="input-error-username" class="${properties.kcInputErrorMessageClass!}" aria-live="polite">
                                ${kcSanitize(messagesPerField.get('username'))?no_esc}
                            </span>
                        </#if>
                    </div>
                </div>
            </#if>

            <div class="${properties.kcFormGroupClass!}">
                <div class="${properties.kcLabelWrapperClass!}">
                    <label for="password" class="${properties.kcLabelClass!}">${msg("password")}</label>
                </div>
                <div class="${properties.kcInputWrapperClass!}">
                    <input type="password" id="password" class="${properties.kcInputClass!}" name="password"
                           autocomplete="new-password"
                           aria-invalid="<#if messagesPerField.existsError('password','password-confirm')>true</#if>"
                    />

                    <#if messagesPerField.existsError('password')>
                        <span id="input-error-password" class="${properties.kcInputErrorMessageClass!}" aria-live="polite">
                            ${kcSanitize(messagesPerField.get('password'))?no_esc}
                        </span>
                    </#if>
                </div>
            </div>

            <div class="${properties.kcFormGroupClass!}">
                <div class="${properties.kcLabelWrapperClass!}">
                    <label for="password-confirm" class="${properties.kcLabelClass!}">${msg("passwordConfirm")}</label>
                </div>
                <div class="${properties.kcInputWrapperClass!}">
                    <input type="password" id="password-confirm" class="${properties.kcInputClass!}"
                           name="password-confirm"
                           aria-invalid="<#if messagesPerField.existsError('password-confirm')>true</#if>"
                    />

                    <#if messagesPerField.existsError('password-confirm')>
                        <span id="input-error-password-confirm" class="${properties.kcInputErrorMessageClass!}" aria-live="polite">
                            ${kcSanitize(messagesPerField.get('password-confirm'))?no_esc}
                        </span>
                    </#if>
                </div>
            </div>

            <!-- Organization Fields (shown only for enterprise) -->
            <div id="organization-fields" class="organization-fields <#if (register.formData['user.attributes.account_type']!'') == 'enterprise'>show</#if>">
                <h4>${msg("organizationInformation")}</h4>
                
                <div class="${properties.kcFormGroupClass!}">
                    <div class="${properties.kcLabelWrapperClass!}">
                        <label for="organization-name" class="${properties.kcLabelClass!}">${msg("organizationName")}</label>
                    </div>
                    <div class="${properties.kcInputWrapperClass!}">
                        <input type="text" id="organization-name" class="${properties.kcInputClass!}" 
                               name="user.attributes.organization_name"
                               value="${(register.formData['user.attributes.organization_name']!'')}"
                               placeholder="${msg("organizationNamePlaceholder")}"
                        />
                    </div>
                </div>

                <div class="${properties.kcFormGroupClass!}">
                    <div class="${properties.kcLabelWrapperClass!}">
                        <label for="organization-domain" class="${properties.kcLabelClass!}">${msg("organizationDomain")}</label>
                    </div>
                    <div class="${properties.kcInputWrapperClass!}">
                        <input type="text" id="organization-domain" class="${properties.kcInputClass!}" 
                               name="user.attributes.organization_domain"
                               value="${(register.formData['user.attributes.organization_domain']!'')}"
                               placeholder="${msg("organizationDomainPlaceholder")}"
                        />
                        <small class="${properties.kcFormHelperTextClass!}">${msg("organizationDomainHelp")}</small>
                    </div>
                </div>

                <div class="${properties.kcFormGroupClass!}">
                    <div class="${properties.kcLabelWrapperClass!}">
                        <label for="invitation-code" class="${properties.kcLabelClass!}">${msg("invitationCode")} (${msg("optional")})</label>
                    </div>
                    <div class="${properties.kcInputWrapperClass!}">
                        <input type="text" id="invitation-code" class="${properties.kcInputClass!}" 
                               name="user.attributes.invitation_code"
                               value="${(register.formData['user.attributes.invitation_code']!'')}"
                               placeholder="${msg("invitationCodePlaceholder")}"
                        />
                        <small class="${properties.kcFormHelperTextClass!}">${msg("invitationCodeHelp")}</small>
                    </div>
                </div>
            </div>

            <#if recaptchaRequired??>
                <div class="form-group">
                    <div class="${properties.kcInputWrapperClass!}">
                        <div class="g-recaptcha" data-size="compact" data-sitekey="${recaptchaSiteKey}"></div>
                    </div>
                </div>
            </#if>

            <div class="${properties.kcFormGroupClass!}">
                <div id="kc-form-options" class="${properties.kcFormOptionsClass!}">
                    <div class="${properties.kcFormOptionsWrapperClass!}">
                        <span><a href="${url.loginUrl}">${kcSanitize(msg("backToLogin"))?no_esc}</a></span>
                    </div>
                </div>

                <div id="kc-form-buttons" class="${properties.kcFormButtonsClass!}">
                    <input class="${properties.kcButtonClass!} ${properties.kcButtonPrimaryClass!} ${properties.kcButtonBlockClass!} ${properties.kcButtonLargeClass!}" type="submit" value="${msg("doRegister")}"/>
                </div>
            </div>
        </form>

        <script>
            function toggleOrganizationFields() {
                const enterpriseRadio = document.getElementById('enterprise');
                const organizationFields = document.getElementById('organization-fields');
                
                if (enterpriseRadio.checked) {
                    organizationFields.classList.add('show');
                } else {
                    organizationFields.classList.remove('show');
                }
            }

            // Initialize on page load
            document.addEventListener('DOMContentLoaded', function() {
                toggleOrganizationFields();
            });
        </script>
    </#if>
</@layout.registrationLayout>
