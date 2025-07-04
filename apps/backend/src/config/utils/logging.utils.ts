import { LogRequest, LogResponse } from '../../common/types/logging.types.js';
import { CommonConfigService } from '../../common/config/common-config.service.js';

/**
 * Logging utilities that were previously in ConfigService
 * These methods contain business logic and should be in a dedicated service
 */
export class LoggingUtils {
  constructor(private readonly commonConfig: CommonConfigService) {}

  /**
   * Determine if a request should be logged
   */
  shouldLogRequest(request: LogRequest): boolean {
    const loggingConfig = this.commonConfig.getLoggingConfig();

    if (!loggingConfig.enableRequestLogging) {
      return false;
    }

    // Skip health check endpoints
    if (request.url?.includes('/health') || request.url?.includes('/metrics')) {
      return false;
    }

    return true;
  }

  /**
   * Determine if a response should be logged
   */
  shouldLogResponse(response: LogResponse): boolean {
    const loggingConfig = this.commonConfig.getLoggingConfig();

    if (!loggingConfig.enableRequestLogging) {
      return false;
    }

    // Log errors always
    if (response.statusCode && response.statusCode >= 400) {
      return true;
    }

    return true;
  }

  /**
   * Get request/response logging configuration
   */
  getRequestLoggingConfig() {
    return this.commonConfig.getLoggingConfig();
  }
}
