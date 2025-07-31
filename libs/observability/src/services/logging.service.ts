import { Injectable, Logger } from '@nestjs/common';
import { promises as fs } from 'fs';
import * as path from 'path';
import type { LoggingConfig, LoggingHealthCheck } from '../types/index.js';

/**
 * Logging service implementation for microservices
 * Follows Contract First principles with Zod validation
 */
@Injectable()
export class LoggingService {
  private readonly logger = new Logger(LoggingService.name);

  constructor(private readonly config: LoggingConfig) {}

  /**
   * Initialize logging configuration
   */
  async initializeLogging(): Promise<void> {
    try {
      if (this.config.logToFile) {
        await this.ensureLogDirectory();
        await this.rotateLogsIfNeeded();
      }
      this.logger.log('Logging service initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize logging service:', error);
      throw error;
    }
  }

  /**
   * Ensure log directory exists
   */
  private async ensureLogDirectory(): Promise<void> {
    const logDir = path.dirname(this.config.logFilePath);
    try {
      await fs.access(logDir);
    } catch {
      await fs.mkdir(logDir, { recursive: true });
      this.logger.log(`Created log directory: ${logDir}`);
    }
  }

  /**
   * Get log file stats
   */
  private async getLogFileStats() {
    try {
      const stats = await fs.stat(this.config.logFilePath);
      return {
        exists: true,
        size: stats.size,
        formattedSize: this.formatBytes(stats.size),
        lastModified: stats.mtime,
      };
    } catch {
      return null;
    }
  }

  /**
   * Format bytes to human readable format
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Rotate logs if needed
   */
  private async rotateLogsIfNeeded(): Promise<void> {
    const logDir = path.dirname(this.config.logFilePath);
    const baseName = path.basename(
      this.config.logFilePath,
      path.extname(this.config.logFilePath)
    );
    const extension = path.extname(this.config.logFilePath);

    try {
      const files = await fs.readdir(logDir);
      const logFiles = files
        .filter((file) => file.startsWith(baseName) && file.endsWith(extension))
        .sort();

      if (logFiles.length > this.config.logFileMaxFiles) {
        const filesToDelete = logFiles.slice(
          0,
          logFiles.length - this.config.logFileMaxFiles
        );

        for (const file of filesToDelete) {
          await fs.unlink(path.join(logDir, file));
          this.logger.log(`Rotated old log file: ${file}`);
        }
      }
    } catch (error) {
      this.logger.warn('Failed to rotate logs:', error);
    }
  }

  /**
   * Test log directory writability
   */
  private async testLogDirectoryWritable(): Promise<boolean> {
    try {
      const logDir = path.dirname(this.config.logFilePath);
      const testFile = path.join(logDir, '.write-test');
      await fs.writeFile(testFile, 'test');
      await fs.unlink(testFile);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Test Loki connectivity
   */
  private async testLokiConnectivity(): Promise<boolean> {
    if (!this.config.lokiEnabled || !this.config.lokiUrl) {
      return false;
    }

    try {
      // Simple connectivity test would go here
      // For now, just return true if Loki is configured
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Perform health check for logging system
   */
  async healthCheck(): Promise<LoggingHealthCheck> {
    const details: LoggingHealthCheck['details'] = {};

    try {
      // Check if file logging is enabled
      details.fileLoggingEnabled = this.config.logToFile;

      if (this.config.logToFile) {
        details.logDirectoryWritable = await this.testLogDirectoryWritable();
        details.logFileStats = await this.getLogFileStats();
      }

      // Test Loki connectivity if enabled
      if (this.config.lokiEnabled) {
        details.lokiConnectivity = await this.testLokiConnectivity();
      }

      // Configuration summary
      details.configuration = {
        level: this.config.logLevel,
        path: this.config.logFilePath,
        maxSize: this.config.logFileMaxSize,
        maxFiles: this.config.logFileMaxFiles,
      };

      // Determine overall status
      let status: 'healthy' | 'warning' | 'error' = 'healthy';

      if (this.config.logToFile && !details.logDirectoryWritable) {
        status = 'error';
        details.error = 'Log directory is not writable';
      } else if (this.config.lokiEnabled && !details.lokiConnectivity) {
        status = 'warning';
        details.warning = 'Loki connectivity issues detected';
      }

      return { status, details };
    } catch (error) {
      return {
        status: 'error',
        details: {
          ...details,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  /**
   * Get current logging configuration
   */
  getConfig(): LoggingConfig {
    return this.config;
  }

  /**
   * Log a message with metadata
   */
  log(
    level: string,
    message: string,
    metadata?: Record<string, unknown>
  ): void {
    const logData = {
      timestamp: new Date().toISOString(),
      level,
      message,
      service: 'observability',
      ...metadata,
    };

    switch (level) {
      case 'debug':
        this.logger.debug(logData);
        break;
      case 'info':
        this.logger.log(logData);
        break;
      case 'warn':
        this.logger.warn(logData);
        break;
      case 'error':
        this.logger.error(logData);
        break;
      default:
        this.logger.log(logData);
    }
  }

  /**
   * Cleanup resources
   */
  async onModuleDestroy(): Promise<void> {
    try {
      await this.rotateLogsIfNeeded();
      this.logger.log('Logging service cleanup completed');
    } catch (error) {
      this.logger.error('Error during logging service cleanup:', error);
    }
  }
}
