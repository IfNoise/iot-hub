# IoT Hub Keycloak Configuration - Final Setup

## 📋 Общая информация

Данный файл содержит итоговую конфигурацию Keycloak для IoT Hub, основанную на версии **Keycloak 26.3.2** и включающую все исправления для работы **Organization Invites** с поддержкой **PKCE**.

### 🔧 Ключевые изменения в конфигурации

1. **Account Client Configuration** - Исправлен для работы с приглашениями:

   - `publicClient: false` - изменен на confidential client
   - Удален `pkce.code.challenge.method` для избежания конфликта с action tokens
   - Добавлены правильные redirect URIs для account management

2. **Organization Support**:

   - `organizationsEnabled: true` - включена поддержка организаций
   - Настроены роли и группы для enterprise/personal пользователей

3. **Email & Login Themes**:

   - `emailTheme: "iot-hub"` - кастомная email тема с исправленными invite шаблонами
   - `loginTheme: "iot-hub"` - кастомная login тема с поддержкой приглашений
   - `accountTheme: "iot-hub"` - кастомная account тема

4. **SMTP Configuration**:
   - Настроен Gmail SMTP для отправки emails
   - Поддержка SSL/TLS
   - Корректный fromDisplayName

## 🎯 Решённые проблемы

### Problem 1: PKCE Error в Invite Links

**Ошибка**: `Missing parameter: code_challenge_method`

**Решение**:

- Account client изменен на confidential
- Удалена принудительная настройка PKCE для account client
- Action tokens теперь работают корректно

### Problem 2: Неправильные URLs в Email Templates

**Ошибка**: Links в emails не работали корректно

**Решение**:

- Использование `${link}` вместо ручной конструкции URLs
- Обновлен `organization-invite.ftl` template
- Добавлены fallback URLs

### Problem 3: Registration Form для Invites

**Ошибка**: Форма регистрации не обрабатывала invitation tokens

**Решение**:

- Обновлен `register.ftl` с поддержкой invitation parameters
- Добавлена auto-selection enterprise accounts для приглашений
- Скрытые поля для передачи invitation data

## 🏗 Структура клиентов

### 1. iot-hub-frontend (Public Client)

- **PKCE**: `S256` - обязательно для public clients
- **Redirect URIs**: Frontend applications (port 3000, 4200)
- **Logout support**: Front/back channel logout

### 2. iot-hub-backend (Public Client)

- **PKCE**: `S256` - для API interactions
- **Redirect URIs**: Backend callback endpoints
- **Direct Access**: Enabled для server-to-server

### 3. acm-service (Confidential Client)

- **Service Account**: Enabled для microservice communication
- **Secret-based auth**: Для Keycloak Admin API access
- **Full scope**: Доступ ко всем endpoint'ам

### 4. account (Confidential Client) - **ИСПРАВЛЕН**

- **Public Client**: `false` - теперь confidential
- **PKCE**: Отключен для избежания конфликтов с action tokens
- **Redirect URIs**: Account management endpoints

## 📧 Email Templates

### Исправленные шаблоны

1. **organization-invite.ftl** - использует правильные action token URLs
2. **messages_ru.properties** - русские переводы для invite flow
3. **messages_en.properties** - английские переводы для invite flow

### Ключевые переменные

- `${link}` - правильный action token URL (НЕ `${linkExpiration}`)
- `${organizationName}` - название организации
- `${linkExpirationFormatter(linkExpiration)}` - время истечения ссылки

## 🚀 Deployment

### Применение конфигурации

```bash
# 1. Остановка сервисов
docker compose down

# 2. Замена конфигурации
cp keycloak/realm-config/iot-hub-realm-keycloak26.json keycloak/realm-config/iot-hub-realm.json

# 3. Запуск с новой конфигурацией
docker compose up -d

# 4. Проверка применения настроек
docker compose exec keycloak /opt/keycloak/bin/kcadm.sh config credentials --server http://localhost:8080 --realm master --user noise83 --password 00000006
docker compose exec keycloak /opt/keycloak/bin/kcadm.sh get realms/iot-hub/clients -q clientId=account
```

### Проверка работы

1. **Organization Invites**: Создать приглашение через Admin Console
2. **Email Templates**: Проверить получение email с правильными ссылками
3. **Registration**: Пройти регистрацию по ссылке из приглашения
4. **PKCE Compatibility**: Убедиться, что нет ошибок `code_challenge_method`

## 🔍 Мониторинг

### Events включены для отслеживания

- `REGISTER` - регистрации пользователей
- `LOGIN` - входы в систему
- `SEND_VERIFY_EMAIL` - отправка verification emails
- `CUSTOM_REQUIRED_ACTION` - кастомные действия (включая invites)

### Kafka Event Listener

- Настроен `iot-hub-kafka-event-listener`
- События отправляются в Kafka для дальнейшей обработки microservices

## ⚠️ Важные замечания

1. **Account Client Security**: Теперь confidential client - храните secret безопасно
2. **PKCE Settings**: Не включайте PKCE для account client - это ломает action tokens в Keycloak 26.x
3. **Email Theme**: Обязательно используйте `iot-hub` theme для правильной работы invite emails
4. **Organization Setup**: После применения конфигурации создайте test organization для проверки

## 🔄 Migration Notes

Если обновляетесь с предыдущей конфигурации:

1. **Backup existing realm**: Экспортируйте текущие настройки
2. **Update client secrets**: Account client теперь требует secret
3. **Test invite flow**: Полностью протестируйте invite/registration flow
4. **Monitor events**: Проверьте логи на наличие ошибок после применения

---

**Автор**: GitHub Copilot  
**Дата**: December 2024  
**Версия Keycloak**: 26.3.2  
**Статус**: Production Ready ✅
