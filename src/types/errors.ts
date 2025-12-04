/**
 * Error handling types
 */

export enum ErrorCategory {
  CONFIG_ERROR = 'CONFIG_ERROR',
  BUILD_ERROR = 'BUILD_ERROR',
  AUTH_ERROR = 'AUTH_ERROR',
  DEPLOYMENT_ERROR = 'DEPLOYMENT_ERROR',
  RUNTIME_ERROR = 'RUNTIME_ERROR'
}

export interface CategorizedError {
  category: ErrorCategory;
  code: string;
  message: string;
  details?: string;
  originalError?: Error;
}

export interface UserMessage {
  level: 'error' | 'warning' | 'info';
  code: string;
  message: string;
  details?: string;
  suggestions: string[];
  documentation?: string;
}

export interface RecoveryResult {
  recovered: boolean;
  message: string;
  action?: string;
}
