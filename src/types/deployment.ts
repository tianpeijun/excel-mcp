/**
 * Deployment state and result types
 */

export interface DeploymentState {
  phase: DeploymentPhase;
  status: DeploymentStatus;
  progress: number;  // 0-100
  message: string;
  startTime: Date;
  endTime?: Date;
  error?: DeploymentError;
}

export enum DeploymentPhase {
  CONFIGURING = 'configuring',
  BUILDING = 'building',
  AUTHENTICATING = 'authenticating',
  DEPLOYING = 'deploying',
  VERIFYING = 'verifying',
  COMPLETED = 'completed'
}

export enum DeploymentStatus {
  IN_PROGRESS = 'in_progress',
  SUCCESS = 'success',
  FAILED = 'failed',
  ROLLED_BACK = 'rolled_back'
}

export interface DeploymentError {
  code: string;
  message: string;
  phase: DeploymentPhase;
  suggestion?: string;
}

export interface DeploymentResult {
  success: boolean;
  endpoint?: Endpoint;
  authConfig?: DeploymentAuthConfig;
  error?: DeploymentError;
  resourceInfo?: ResourceInfo;
}

export interface Endpoint {
  url: string;
  protocol: 'streamable-http';
  authRequired: boolean;
}

export interface DeploymentAuthConfig {
  cognitoUserPoolId: string;
  cognitoClientId: string;
  cognitoRegion: string;
}

export interface ResourceInfo {
  buildId?: string;
  imageUri?: string;
  cognitoUserPoolId?: string;
  cognitoClientId?: string;
  endpointUrl?: string;
}

export interface Deployment {
  id: string;
  status: 'CREATING' | 'ACTIVE' | 'FAILED' | 'UPDATING';
  imageUri: string;
  authConfig: DeploymentAuthConfig;
  endpoint?: Endpoint;
  createdAt: Date;
  updatedAt: Date;
}

export interface HealthStatus {
  healthy: boolean;
  message?: string;
  timestamp: Date;
}
