# Enterprise Migration Strategy

## 🎯 Стратегия миграции для Enterprise функций

### 1. Добавление новых таблиц

```sql
-- Таблица организаций
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    logo VARCHAR(500),
    domain VARCHAR(100),
    plan VARCHAR(20) DEFAULT 'business' CHECK (plan IN ('business', 'enterprise')),
    max_users INTEGER DEFAULT 100,
    max_devices INTEGER DEFAULT 1000,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица групп
CREATE TABLE groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    parent_group_id UUID REFERENCES groups(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 2. Расширение существующих таблиц (без breaking changes)

```sql
-- Добавляем поля к таблице пользователей
ALTER TABLE users
ADD COLUMN user_type VARCHAR(20) DEFAULT 'individual' CHECK (user_type IN ('individual', 'organization')),
ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
ADD COLUMN group_id UUID REFERENCES groups(id) ON DELETE SET NULL;

-- Обновляем enum роли
ALTER TYPE user_role_enum ADD VALUE 'org_admin';
ALTER TYPE user_role_enum ADD VALUE 'group_admin';

-- Обновляем enum планов
ALTER TYPE plan_type_enum ADD VALUE 'enterprise';

-- Добавляем поля к таблице устройств
ALTER TABLE devices
ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
ADD COLUMN group_id UUID REFERENCES groups(id) ON DELETE SET NULL,
ADD COLUMN owner_type VARCHAR(10) DEFAULT 'user' CHECK (owner_type IN ('user', 'group'));
```

### 3. Индексы для производительности

```sql
-- Индексы для быстрого поиска
CREATE INDEX idx_users_organization_id ON users(organization_id);
CREATE INDEX idx_users_group_id ON users(group_id);
CREATE INDEX idx_devices_organization_id ON devices(organization_id);
CREATE INDEX idx_devices_group_id ON devices(group_id);
CREATE INDEX idx_devices_owner_type ON devices(owner_type);
CREATE INDEX idx_groups_organization_id ON groups(organization_id);
CREATE INDEX idx_groups_parent_group_id ON groups(parent_group_id);
```

### 4. Constraints для data integrity

```sql
-- Убеждаемся, что устройство имеет правильную связь с владельцем
ALTER TABLE devices ADD CONSTRAINT check_device_ownership
CHECK (
    (owner_type = 'user' AND owner_id IS NOT NULL AND group_id IS NULL) OR
    (owner_type = 'group' AND group_id IS NOT NULL)
);

-- Убеждаемся, что пользователь организации принадлежит к организации
ALTER TABLE users ADD CONSTRAINT check_org_user_consistency
CHECK (
    (user_type = 'individual' AND organization_id IS NULL) OR
    (user_type = 'organization' AND organization_id IS NOT NULL)
);
```

### 5. Data migration для существующих записей

```sql
-- Все существующие пользователи остаются individual
UPDATE users SET user_type = 'individual' WHERE user_type IS NULL;

-- Все существующие устройства остаются user-owned
UPDATE devices SET owner_type = 'user' WHERE owner_type IS NULL;
```

## 🔄 Поэтапное внедрение

### Фаза 1: Database Schema

1. Добавить новые таблицы
2. Расширить существующие таблицы
3. Добавить индексы и constraints
4. Миграция существующих данных

### Фаза 2: Backend API

1. Добавить OrganizationsModule
2. Расширить UsersModule для поддержки организаций
3. Обновить DevicesModule для групповых операций
4. Добавить middleware для authorization

### Фаза 3: Authorization Layer

1. Implement role-based access control
2. Добавить проверки на уровне организации/группы
3. Middleware для проверки прав доступа к устройствам

### Фаза 4: MQTT Integration

1. ACL rules для организационной структуры
2. Topic patterns для групповых операций
3. Сохранение обратной совместимости топиков

## ✅ Преимущества данного подхода

1. **Нулевой downtime** - все изменения backward compatible
2. **Постепенная миграция** - можно внедрять поэтапно
3. **Сохранение топиков** - MQTT структура не меняется
4. **Гибкость** - поддержка как individual, так и enterprise пользователей
5. **Масштабируемость** - готово для больших организаций
