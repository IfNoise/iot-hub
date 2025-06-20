# IoT Hub API Contracts

Этот модуль содержит API контракты для IoT Hub приложения, реализованные с использованием [TS-REST](https://ts-rest.com/). Контракты обеспечивают типобезопасность между клиентом и сервером.

## Структура

Контракты разделены по доменам:

### 📁 Users (`@iot-hub/users`)

Контракты для управления пользователями:

- `GET /users` - получить всех пользователей
- `GET /users/:id` - получить пользователя по ID
- `POST /users` - создать нового пользователя
- `PATCH /users/:id` - обновить пользователя
- `DELETE /users/:id` - удалить пользователя
- `PATCH /users/:id/balance` - обновить баланс
- `PATCH /users/:id/plan` - обновить план подписки

### 🔐 Auth (`@iot-hub/auth`)

Контракты для аутентификации (используют Keycloak):

- `GET /auth/profile` - получить профиль пользователя
- `GET /auth/me` - получить базовую информацию
- `GET /auth/admin` - эндпоинт только для админов
- `GET /auth/user` - эндпоинт для пользователей и админов

### 🏠 Devices (`@iot-hub/devices`)

Контракты для управления IoT устройствами:

- `POST /devices/sign-device` - регистрация нового устройства
- `POST /devices/bind-device` - привязка устройства к пользователю
- `POST /devices/unbind-device` - отвязка устройства
- `GET /devices` - получить устройства (с учетом прав)
- `GET /devices/admin/all` - получить все устройства (только админы)

#### Сертификаты устройств

- `POST /devices/certificates/sign-csr` - подписание CSR
- `GET /devices/certificates/:fingerprint` - получить сертификат
- `DELETE /devices/certificates/:fingerprint` - отозвать сертификат

### 📡 MQTT (`@iot-hub/mqtt`)

Контракты для MQTT RPC команд:

- `POST /mqtt/device/command` - отправить команду с ожиданием ответа
- `POST /mqtt/device/command/no-response` - отправить команду без ожидания

Поддерживаемые методы:

- `getDeviceState` - получить состояние устройства
- `getSensors` - получить данные сенсоров
- `reboot` - перезагрузить устройство
- `updateDiscreteTimer` - обновить дискретный таймер
- `updateAnalogTimer` - обновить аналоговый таймер
- `updateDiscreteRegulator` - обновить дискретный регулятор
- `updateAnalogRegulator` - обновить аналоговый регулятор
- `updateIrrigator` - обновить ирригатор

### 🔒 Crypto (`@iot-hub/crypto`)

Контракты для криптографических операций:

- Управление сертификатами
- Генерация ключевых пар
- Подпись и проверка данных
- Шифрование и расшифровка
- Хеширование

## Использование

### Импорт контрактов

```typescript
// Импорт всех контрактов
import * as contracts from '@iot-hub/contracts';

// Импорт конкретного домена
import { usersContract } from '@iot-hub/users';
import { authContract } from '@iot-hub/auth';
import { devicesContract, certificatesContract } from '@iot-hub/devices';
import { mqttContract } from '@iot-hub/mqtt';
```

### Использование в клиенте

```typescript
import { initClient } from '@ts-rest/core';
import { usersContract } from '@iot-hub/users';

const client = initClient(usersContract, {
  baseUrl: 'http://localhost:3000/api',
  baseHeaders: {
    Authorization: 'Bearer your-token',
  },
});

// Типобезопасный вызов API
const result = await client.getUsers();
if (result.status === 200) {
  console.log(result.body); // Типизированные данные пользователей
}
```

### Использование в сервере (NestJS)

```typescript
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import { usersContract } from '@iot-hub/users';

@Controller()
export class UsersController {
  @TsRestHandler(usersContract.getUsers)
  async getUsers() {
    return tsRestHandler(usersContract.getUsers, async () => {
      const users = await this.usersService.findAll();
      return { status: 200, body: users };
    });
  }
}
```

## Схемы валидации

Все контракты используют Zod схемы для валидации:

```typescript
import { UserBaseSchema, CreateUserSchema } from '@iot-hub/users';

// Валидация данных
const user = UserBaseSchema.parse(userData);
const createUser = CreateUserSchema.parse(requestBody);
```

## Сборка

```bash
# Сборка всех контрактов
npx nx build users auth devices mqtt crypto

# Сборка конкретного контракта
npx nx build users
```

## Типы

Все схемы экспортируют соответствующие TypeScript типы:

```typescript
import type {
  User,
  CreateUser,
  UpdateUser,
  Device,
  DeviceCommand,
  MqttRpcRequest,
} from '@iot-hub/contracts';
```

## Соответствие с backend

Контракты точно соответствуют реальным эндпоинтам в backend приложении:

- `UsersController` → `@iot-hub/users`
- `AuthController` → `@iot-hub/auth`
- `DevicesController` → `@iot-hub/devices`
- `CertificatesController` → `@iot-hub/devices` (сертификаты)
- `MqttRpcController` → `@iot-hub/mqtt`

Это обеспечивает полную типобезопасность между клиентом и сервером.
