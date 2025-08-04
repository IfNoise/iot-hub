export interface LogRequest {
  url?: string;
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
  timestamp?: Date;
}

export interface LogResponse {
  statusCode?: number;
  headers?: Record<string, string>;
  body?: unknown;
  timestamp?: Date;
}
