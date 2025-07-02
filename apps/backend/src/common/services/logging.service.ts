import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '../../config/config.service.js';
import type { LogHealthCheck, LogHealthDetails } from '../types/logging.types.js';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Enhanced logging service with error handling and log management
 */
@Injectable()
export class LoggingService {
  private readonly logger = new Logger(LoggingService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Ensure log directory exists and is writable
   */
  async ensureLogDirectory(): Promise<void> {
    try {
      const logPath = this.configService.get('LOG_FILE_PATH');
      const logDir = path.dirname(logPath);

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
      const logPath = this.configService.get('LOG_FILE_PATH');
      const stats = await fs.stat(logPath);

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
      const logPath = this.configService.get('LOG_FILE_PATH');
      const maxFiles = this.configService.get('LOG_FILE_MAX_FILES');
      const logDir = path.dirname(logPath);
      const logBaseName = path.basename(logPath, path.extname(logPath));

      const files = await fs.readdir(logDir);
      const logFiles = files
        .filter((file) => file.startsWith(logBaseName) && file.includes('.log'))
        .map((file) => path.join(logDir, file));

      if (logFiles.length > maxFiles) {
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
        const filesToRemove = fileStats.slice(0, fileStats.length - maxFiles);

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
      const logPath = this.configService.get('LOG_FILE_PATH');
      const logDir = path.dirname(logPath);
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
      const logToFile = this.configService.get('LOG_TO_FILE');
      details.fileLoggingEnabled = logToFile;

      if (logToFile) {
        // Check log directory
        const logPath = this.configService.get('LOG_FILE_PATH');
        const logDir = path.dirname(logPath);

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
        level: this.configService.get('LOG_LEVEL'),
        path: this.configService.get('LOG_FILE_PATH'),
        maxSize: this.configService.get('LOG_FILE_MAX_SIZE'),
        maxFiles: this.configService.get('LOG_FILE_MAX_FILES'),
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
