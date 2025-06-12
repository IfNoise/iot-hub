// Types for enhanced logging functionality

export interface LogRequest {
  method?: string;
  url?: string;
  headers?: Record<string, string | string[]>;
  ip?: string;
  remoteAddress?: string;
  remotePort?: number;
}

export interface LogResponse {
  statusCode?: number;
  headers?: Record<string, string | string[]>;
}

export interface LogObject {
  req?: LogRequest;
  res?: LogResponse;
  level?: number;
  time?: number;
  pid?: number;
  hostname?: string;
  msg?: string;
  [key: string]: unknown;
}

export interface LogHealthDetails {
  fileLoggingEnabled?: boolean;
  logDirectoryWritable?: boolean;
  logFileStats?: {
    exists: boolean;
    size: number;
    formattedSize: string;
    lastModified: Date;
  } | null;
  warning?: string;
  error?: string;
  configuration?: {
    level: string;
    path: string;
    maxSize: string;
    maxFiles: number;
  };
}

export interface LogHealthCheck {
  status: 'healthy' | 'warning' | 'error';
  details: LogHealthDetails;
}
