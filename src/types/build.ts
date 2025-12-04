/**
 * Build-related types for CodeBuild integration
 */

export interface BuildResult {
  success: boolean;
  buildId?: string;
  imageUri?: string;
  error?: string;
  logs?: string[];
}

export interface BuildProgress {
  phase: string;
  status: string;
  percentage: number;
  message: string;
}
