import { ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';

/**
 * Декоратор для Swagger документации endpoint'а
 * Используется вместе с TsRestHandler для полной интеграции
 */
export function TsRestEndpoint(summary?: string) {
  // Возвращаем только Swagger документацию, валидация будет через TsRestHandler
  if (summary) {
    return ApiOperation({ summary });
  }

  // Пустой декоратор если summary не указан
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  return () => {};
}

/**
 * Декоратор для документирования параметров пути
 */
export function TsRestPathParam(name: string, description?: string) {
  return ApiParam({
    name,
    description: description || `Path parameter: ${name}`,
    required: true,
  });
}

/**
 * Декоратор для документирования тела запроса
 */
export function TsRestBody(description = 'Request body') {
  return ApiBody({
    description,
    required: true,
  });
}

/**
 * Декоратор для документирования ответов
 */
export function TsRestResponse(status: number, description?: string) {
  return ApiResponse({
    status,
    description: description || `Response ${status}`,
  });
}
