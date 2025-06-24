# Декомпозированная конфигурация

## Быстрый старт

### 1. Использование нового конфигурационного модуля

```typescript
// В app.module.ts замените:
import { ConfigModule } from './config/config.module';
// на:
import { ConfigModule } from './config/config.module'; // (уже обновлен)
```

### 2. Базовое использование

```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from './config/config.service';

@Injectable()
export class MyService {
  constructor(private configService: ConfigService) {}

  useConfig() {
    // Доменные конфигурации
    const jwtConfig = this.configService.auth.getJwtConfig();
    const dbConfig = this.configService.database.getTypeOrmConfig();
    const mqttConfig = this.configService.mqtt.getClientOptions();
    
    // Старый API все еще работает
    const nodeEnv = this.configService.get('NODE_ENV');
    const isDev = this.configService.isDevelopment();
  }
}
```

### 3. Инъекция доменных сервисов

```typescript
import { Injectable } from '@nestjs/common';
import { AuthConfigService } from './auth/config/auth-config.service';
import { DatabaseConfigService } from './database/config/database-config.service';

@Injectable()
export class MyService {
  constructor(
    private authConfig: AuthConfigService,
    private dbConfig: DatabaseConfigService
  ) {}

  useConfig() {
    const jwtSecret = this.authConfig.get('jwtSecret');
    const dbConnection = this.dbConfig.getConnectionInfo();
  }
}
```

## Доменные области

- **Auth** (`auth/config/`) - JWT, Keycloak, OAuth2
- **Common** (`common/config/`) - App, CORS, Security, Logging  
- **Database** (`database/config/`) - Database connection
- **MQTT** (`mqtt/config/`) - MQTT broker settings
- **Telemetry** (`common/config/`) - OpenTelemetry
- **Devices** (`devices/config/`) - Device management
- **Users** (`users/config/`) - User management

## Преимущества

✅ **Разделение ответственности** - каждый домен управляет своей конфигурацией  
✅ **Типобезопасность** - Zod схемы и TypeScript типы  
✅ **Композиция** - легкое комбинирование конфигураций  
✅ **Тестируемость** - изолированное тестирование доменов  
✅ **Обратная совместимость** - старый API продолжает работать  

## Environment переменные

Все существующие переменные остались без изменений. Добавлены новые опциональные:

```env
# Devices
DEVICE_TIMEOUT_MS=30000
MAX_DEVICES_PER_USER=100

# Users  
USER_SESSION_TIMEOUT_MS=3600000
ENABLE_USER_REGISTRATION=true
```

См. полную документацию в [DECOMPOSITION_GUIDE.md](./DECOMPOSITION_GUIDE.md)
