# Устранение ошибки PKCE в организационных инвайтах Keycloak 26.3.2

## Описание проблемы

При переходе по ссылке из письма-приглашения возникает ошибка:

```text
Missing parameter: code_challenge_method
```

Это происходит потому, что в Keycloak 26.x клиент `account` требует PKCE (Proof Key for Code Exchange), но старые ссылки в письмах не содержат необходимых PKCE параметров.

## Решение для Keycloak 26.3.2

### A1. Исправление настроек клиента account

1. **Настройки клиента в realm-config/iot-hub-realm.json:**
   - Клиент настроен как `publicClient: true` (требование в KC 26.x)
   - Добавлен атрибут `"pkce.code.challenge.method": "S256"`
   - Добавлены новые атрибуты для KC 26.x:
     - `oauth2.device.authorization.grant.enabled: false`
     - `oidc.ciba.grant.enabled: false`
   - Расширены redirectUris для поддержки localhost

### A2. Обновление email-шаблона (organization-invite.ftl)

1. **Исправлена генерация ссылок для KC 26.x:**
   - Приоритет переменной `${link}` если доступна
   - Action-token URL с правильным форматом для KC 26.x
   - Добавлен tab_id параметр для корректной обработки
   - Fallback на стандартный OIDC registration endpoint

### A3. Обновление формы регистрации (register.ftl)

1. **Добавлена поддержка invitation tokens:**

   - Скрытые поля для передачи orgId, orgName, invitation_token
   - Автоматический выбор enterprise аккаунта при наличии инвайта
   - Предзаполнение организационных полей
   - Блокировка изменения полей организации при инвайте

2. **Обновлён JavaScript:**
   - Определение наличия invitation token
   - Автоматическое отображение организационных полей
   - Блокировка переключения типа аккаунта при инвайте

### A4. Добавлены новые сообщения

1. **messages_ru.properties и messages_en.properties:**
   - `enterpriseInvitationTitle` - заголовок при инвайте
   - `enterpriseInvitationMessage` - сообщение о приглашении
   - `invitationAutoFillNote` - уведомление об автозаполнении

## Структура изменений

```text
keycloak/
├── realm-config/
│   └── iot-hub-realm.json          # Обновлена конфигурация клиента account
├── themes/iot-hub/
│   ├── email/
│   │   └── organization-invite.ftl  # Исправлен email шаблон
│   └── login/
│       ├── register.ftl            # Добавлена поддержка инвайтов
│       └── messages/
│           ├── messages_ru.properties # Новые сообщения (русский)
│           └── messages_en.properties # Новые сообщения (английский)
└── organization-invite-provider/    # Java SPI провайдер (опционально)
```

## Проверка решения

1. **Создайте организационный инвайт**
2. **Проверьте ссылку в письме** - она должна иметь вид:

   ```text
   http://localhost:8080/realms/iot-hub/login-actions/action-token?key=TOKEN&client_id=account
   ```

3. **Переход по ссылке** должен открывать форму регистрации без ошибки PKCE
4. **Форма регистрации** должна автоматически:
   - Выбрать тип аккаунта "Enterprise"
   - Заполнить название организации
   - Скрыть поля выбора типа аккаунта

## Дополнительно: Java SPI провайдер

В папке `organization-invite-provider/` находится кастомный Java провайдер для расширенной обработки инвайтов. Для его использования:

1. Соберите провайдер: `./build-provider.sh`
2. Перезапустите Keycloak
3. Настройте Required Action в админ-консоли

## Тестирование

Для тестирования можете использовать URL вида:

```text
http://localhost:8080/realms/iot-hub/login-actions/registration?client_id=account&invitation_token=TEST_TOKEN&org_id=test-org&org_name=Test%20Organization
```

## Совместимость

Решение протестировано с Keycloak 26.3.2 и должно работать с версиями 26.x+.

### Особенности Keycloak 26.x

- Обязательное использование PKCE для Public Clients
- Изменённая структура action tokens
- Новые атрибуты клиентов для OAuth2 extensions
- Улучшенная безопасность authentication flows

### Миграция с предыдущих версий

Если обновляетесь с более старых версий Keycloak:

1. Обновите клиент account согласно новой конфигурации
2. Обновите email шаблоны
3. Протестируйте action tokens в development среде
