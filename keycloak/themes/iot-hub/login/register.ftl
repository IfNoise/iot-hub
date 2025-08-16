<#import "template.ftl" as layout>
<@layout.registrationLayout displayMessage=!messagesPerField.existsError('firstName','lastName','email','username','password','password-confirm','account_type') displayInfo=realm.password && realm.registrationAllowed && !registrationDisabled??; section>
    <#if section = "header">
        ${msg("registerTitle")}
    <#elseif section = "form">
        <form id="kc-register-form" class="${properties.kcFormClass!}" action="${url.registrationAction}" method="post">
            
            <#-- Hidden fields for invitation handling -->
            <#if org??>
                <input type="hidden" name="user.attributes.organization_id" value="${org.id!''}" />
                <input type="hidden" name="user.attributes.invited_via_organization" value="true" />
            </#if>
            
            <!-- Account Type Selection -->
            <div class="account-type-selection full-width">
                <h3>${msg("accountTypeSelection")}</h3>
                <div class="account-type-options">
                    <div class="account-type-option">
                        <input type="radio" id="personal" name="user.attributes.account_type" value="personal" 
                               <#if org??>
                                   disabled
                               <#elseif (register.formData['user.attributes.account_type']!'personal') == 'personal'>checked</#if>
                               onchange="toggleOrganizationFields()">
                        <label for="personal" <#if org??>style="opacity: 0.5; cursor: not-allowed;"</#if>>
                            <div class="option-title">${msg("personalAccount")}</div>
                            <div class="option-description">${msg("personalAccountDescription")}</div>
                        </label>
                    </div>
                    <div class="account-type-option">
                        <input type="radio" id="enterprise" name="user.attributes.account_type" value="enterprise"
                               <#if org?? || (register.formData['user.attributes.account_type']!'') == 'enterprise'>checked</#if>
                               onchange="toggleOrganizationFields()">
                        <label for="enterprise">
                            <div class="option-title">${msg("enterpriseAccount")}</div>
                            <div class="option-description">${msg("enterpriseAccountDescription")}</div>
                        </label>
                    </div>
                </div>
            </div>

            <!-- Main form grid with user fields and organization fields -->
            <div class="main-form-grid">
                <!-- User Fields (Left Column) -->
                <div class="user-fields">
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
                </div>

                <!-- Organization Fields (Right Column) -->
                <div id="organization-fields" class="organization-fields <#if org?? || (register.formData['user.attributes.account_type']!'') == 'enterprise'>show</#if>">
                    <h4>${msg("organizationInformation")}</h4>
                    
                    <#-- Индикация приглашения в организацию -->
                    <#if org??>
                        <div class="alert alert-info" style="background-color: #e6f3ff; border: 1px solid #b3d9ff; padding: 10px; margin-bottom: 15px; border-radius: 4px;">
                            <strong>${msg("invitedToOrganization")}</strong><br/>
                            ${msg("invitedToOrganizationDescription", org.name!'test-org')}
                        </div>
                    </#if>
                    
                    <div class="${properties.kcFormGroupClass!}">
                        <div class="${properties.kcLabelWrapperClass!}">
                            <label for="organization-name" class="${properties.kcLabelClass!}">${msg("organizationName")}</label>
                        </div>
                        <div class="${properties.kcInputWrapperClass!}">
                            <input type="text" id="organization-name" class="${properties.kcInputClass!}" 
                                   name="user.attributes.organization_name"
                                   value="${(org.name)!((register.formData['user.attributes.organization_name'])!'')}"
                                   placeholder="${msg("organizationNamePlaceholder")}"
                                   <#if org??>readonly style="background-color: #f5f5f5; cursor: not-allowed;"</#if>
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
                                       value="${(org.domain)!((register.formData['user.attributes.organization_domain'])!'')}"
                                       placeholder="${msg("organizationDomainPlaceholder")}"
                                       <#if org??>readonly style="background-color: #f5f5f5; cursor: not-allowed;"</#if>
                                />
                                <small class="${properties.kcFormHelperTextClass!}">${msg("organizationDomainHelp")}</small>
                            </div>
                        </div>
                </div>
            </div>

            <#if recaptchaRequired??>
                <div class="form-group full-width">
                    <div class="${properties.kcInputWrapperClass!}">
                        <div class="g-recaptcha" data-size="compact" data-sitekey="${recaptchaSiteKey}"></div>
                    </div>
                </div>
            </#if>

            <div class="${properties.kcFormGroupClass!} full-width">


                <div id="kc-form-buttons" class="${properties.kcFormButtonsClass!}">
                    <input class="${properties.kcButtonClass!} ${properties.kcButtonPrimaryClass!} ${properties.kcButtonBlockClass!} ${properties.kcButtonLargeClass!}" type="submit" value="${msg("doRegister")}"/>
                </div>
                                <div id="kc-form-options" class="${properties.kcFormOptionsClass!}">
                    <div class="${properties.kcFormOptionsWrapperClass!}" style="align-items: center;">
                        <span><a href="${url.loginUrl}">${kcSanitize(msg("backToLogin"))?no_esc}</a></span>
                    </div>
                </div>
            </div>
        </form>

        <script>
            // Проверяем, есть ли invitation token в URL
            const hasInvitation = window.location.search.includes('invitation_token') || 
                                 document.querySelector('input[name="invitation_token"]');
            
            function toggleOrganizationFields() {
                // Если есть инвайт, всегда показываем enterprise поля
                if (hasInvitation) {
                    const organizationFields = document.getElementById('organization-fields');
                    if (organizationFields) {
                        organizationFields.classList.add('show');
                    }
                    return;
                }
                
                const enterpriseRadio = document.getElementById('enterprise');
                const personalRadio = document.getElementById('personal');
                const organizationFields = document.getElementById('organization-fields');
                
                if (enterpriseRadio && enterpriseRadio.checked) {
                    organizationFields.classList.add('show');
                    // Делаем поля обязательными для enterprise аккаунтов
                    const orgNameField = document.getElementById('organization-name');
                    const orgDomainField = document.getElementById('organization-domain');
                    if (orgNameField && !orgNameField.hasAttribute('readonly')) {
                        orgNameField.setAttribute('required', 'required');
                    }
                    if (orgDomainField && !orgDomainField.hasAttribute('readonly')) {
                        orgDomainField.setAttribute('required', 'required');
                    }
                } else {
                    organizationFields.classList.remove('show');
                    // Убираем обязательность полей для personal аккаунтов
                    const orgNameField = document.getElementById('organization-name');
                    const orgDomainField = document.getElementById('organization-domain');
                    if (orgNameField && !orgNameField.hasAttribute('readonly')) {
                        orgNameField.removeAttribute('required');
                        orgNameField.value = '';
                    }
                    if (orgDomainField && !orgDomainField.hasAttribute('readonly')) {
                        orgDomainField.removeAttribute('required');
                        orgDomainField.value = '';
                    }
                }
            }

            // Initialize on page load
            document.addEventListener('DOMContentLoaded', function() {
                toggleOrganizationFields();
                
                // Добавляем обработчики событий для радио-кнопок только если нет инвайта
                if (!hasInvitation) {
                    const personalRadio = document.getElementById('personal');
                    const enterpriseRadio = document.getElementById('enterprise');
                    
                    if (personalRadio) {
                        personalRadio.addEventListener('change', toggleOrganizationFields);
                    }
                    if (enterpriseRadio) {
                        enterpriseRadio.addEventListener('change', toggleOrganizationFields);
                    }
                }
            });
        </script>
    </#if>
</@layout.registrationLayout>
