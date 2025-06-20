/**
 * Типы для интеграции с TS-REST
 */

// Переэкспортируем основные типы из @ts-rest/nest
export { TsRestRequest, TsRestHandler } from '@ts-rest/nest';

// Дополнительные типы для нашего приложения
export interface TsRestValidatedRequest<T = unknown> {
  body: T;
  params: Record<string, string>;
  query: Record<string, string>;
}

export interface TsRestValidatedResponse<T = unknown> {
  status: number;
  body: T;
}
