import { Injectable, Logger } from '@nestjs/common';
import { CommonConfigService } from '../config/common-config.service.js';
import type {
  LogHealthCheck,
  LogHealthDetails,
} from '../types/logging.types.js';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Enhanced logging service with error handling and log management
 */
@Injectable()
export class LoggingService {
  private readonly logger = new Logger(LoggingService.name);

  constructor(private readonly commonConfigService: CommonConfigService) {}

  /**
   * Ensure log directory exists and is writable
   */
  async ensureLogDirectory(): Promise<void> {
    try {
      const loggingConfig = this.commonConfigService.getLoggingConfig();
      const logDir = path.dirname(loggingConfig.filePath);

      // Create directory if it doesn't exist
      await fs.mkdir(logDir, { recursive: true });

      // Test write permissions
      const testFile = path.join(logDir, '.write-test');
      await fs.writeFile(testFile, 'test');
      await fs.unlink(testFile);

      this.logger.log(`📁 Log directory ensured: ${logDir}`);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`❌ Failed to ensure log directory: ${errorMessage}`);
      throw new Error(`Log directory setup failed: ${errorMessage}`);
    }
  }

  /**
   * Get log file statistics
   */
  async getLogFileStats(): Promise<{
    exists: boolean;
    size: number;
    formattedSize: string;
    lastModified: Date;
  } | null> {
    try {
      const loggingConfig = this.commonConfigService.getLoggingConfig();
      const stats = await fs.stat(loggingConfig.filePath);

      return {
        exists: true,
        size: stats.size,
        formattedSize: this.formatBytes(stats.size),
        lastModified: stats.mtime,
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`⚠️ Could not get log file stats: ${errorMessage}`);
      return null;
    }
  }

  /**
   * Clean up old log files beyond the configured limit
   */
  async cleanupOldLogs(): Promise<void> {
    try {
      const loggingConfig = this.commonConfigService.getLoggingConfig();
      const logDir = path.dirname(loggingConfig.filePath);
      const logBaseName = path.basename(
        loggingConfig.filePath,
        path.extname(loggingConfig.filePath)
      );

      const files = await fs.readdir(logDir);
      const logFiles = files
        .filter((file) => file.startsWith(logBaseName) && file.includes('.log'))
        .map((file) => path.join(logDir, file));

      if (logFiles.length > loggingConfig.fileMaxFiles) {
        // Sort by modification time (oldest first)
        const fileStats = await Promise.all(
          logFiles.map(async (file) => ({
            path: file,
            stats: await fs.stat(file),
          }))
        );

        fileStats.sort(
          (a, b) => a.stats.mtime.getTime() - b.stats.mtime.getTime()
        );

        // Remove files beyond the limit
        const filesToRemove = fileStats.slice(
          0,
          fileStats.length - loggingConfig.fileMaxFiles
        );

        for (const fileInfo of filesToRemove) {
          await fs.unlink(fileInfo.path);
          this.logger.log(
            `🗑️ Removed old log file: ${path.basename(fileInfo.path)}`
          );
        }
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`❌ Failed to cleanup old logs: ${errorMessage}`);
    }
  }

  /**
   * Archive old logs to compressed format
   */
  async archiveLogs(olderThanDays = 30): Promise<void> {
    try {
      const loggingConfig = this.commonConfigService.getLoggingConfig();
      const logDir = path.dirname(loggingConfig.filePath);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const files = await fs.readdir(logDir);
      const logFiles = files.filter(
        (file) => file.includes('.log') && !file.includes('.gz')
      );

      for (const file of logFiles) {
        const filePath = path.join(logDir, file);
        const stats = await fs.stat(filePath);

        if (stats.mtime < cutoffDate) {
          // Here you could implement compression using zlib
          // For now, we'll just mark files for archival
          this.logger.log(
            `📦 Log file ready for archival: ${file} (modified: ${stats.mtime.toISOString()})`
          );
        }
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`❌ Failed to archive logs: ${errorMessage}`);
    }
  }

  /**
   * Health check for logging system
   */
  async healthCheck(): Promise<LogHealthCheck> {
    const details: LogHealthDetails = {};
    let status: 'healthy' | 'warning' | 'error' = 'healthy';

    try {
      // Check if file logging is enabled
      const loggingConfig = this.commonConfigService.getLoggingConfig();
      details.fileLoggingEnabled = loggingConfig.toFile;

      if (loggingConfig.toFile) {
        // Check log directory
        const logDir = path.dirname(loggingConfig.filePath);

        try {
          await fs.access(logDir, fs.constants.W_OK);
          details.logDirectoryWritable = true;
        } catch {
          details.logDirectoryWritable = false;
          status = 'error';
        }

        // Check log file stats
        const stats = await this.getLogFileStats();
        details.logFileStats = stats;

        // Check if log file is growing too large
        if (stats && stats.size > 100 * 1024 * 1024) {
          // 100MB
          details.warning = 'Log file is very large';
          if (status === 'healthy') status = 'warning';
        }
      }

      details.configuration = {
        level: loggingConfig.level,
        path: loggingConfig.filePath,
        maxSize: loggingConfig.fileMaxSize,
        maxFiles: loggingConfig.fileMaxFiles,
      };
    } catch (error: unknown) {
      status = 'error';
      details.error = error instanceof Error ? error.message : 'Unknown error';
    }

    return { status, details };
  }

  /**
   * Format bytes to human readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
