/**
 * Core configuration types for AgentCore deployment
 */

export interface Config {
  version: string;
  project: ProjectConfig;
  server: ServerConfig;
  build: BuildConfig;
  auth: AuthConfig;
}

export interface ProjectConfig {
  name: string;
  region: string;
  tags?: Record<string, string>;
}

export interface ServerConfig {
  command: string;  // 'uvx'
  args: string[];   // ['excel-mcp-server']
  transport: 'streamable-http';
  environment: Record<string, string>;
  port?: number;
}

export interface BuildConfig {
  codebuildProject: string;
  ecrRepository: string;
  imageTag?: string;
  buildTimeout?: number;  // minutes
}

export interface AuthConfig {
  cognitoUserPoolId?: string;
  cognitoClientId?: string;
  cognitoRegion?: string;
}

export interface ConfigureOptions {
  server: string;
  transport: string;
  region: string;
  projectName: string;
  environment?: Record<string, string>;
}

export interface LaunchOptions {
  configFile?: string;
  verbose?: boolean;
}

export interface ConfigResult {
  success: boolean;
  config?: Config;
  error?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}
