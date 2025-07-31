/**
 * OpenTelemetry instrumentation для user-management сервиса
 * ВАЖНО: Этот файл должен быть импортирован ПЕРВЫМ перед всеми остальными модулями
 */

// Load environment variables first
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env file from the app directory
config({ path: resolve(process.cwd(), 'apps/user-management/.env') });

import '@iot-hub/observability/instrumentation';
