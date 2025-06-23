/*
 * Файл инициализации OpenTelemetry
 * ВАЖНО: Этот файл должен быть импортирован самым первым,
 * до любых других модулей приложения
 */

import { initializeOpenTelemetry } from './app/otel';

// Инициализируем OpenTelemetry только если не в тестовой среде
if (process.env.NODE_ENV !== 'test') {
  initializeOpenTelemetry();
}
