/**
 * Basic setup verification tests
 */

import { isValidAWSRegion } from '../src/aws/clients';
import { DeploymentPhase, DeploymentStatus } from '../src/types';

describe('Project Setup', () => {
  test('TypeScript compilation works', () => {
    expect(true).toBe(true);
  });

  test('AWS region validation works', () => {
    expect(isValidAWSRegion('us-east-1')).toBe(true);
    expect(isValidAWSRegion('us-west-2')).toBe(true);
    expect(isValidAWSRegion('invalid-region')).toBe(false);
  });

  test('Deployment enums are defined', () => {
    expect(DeploymentPhase.CONFIGURING).toBe('configuring');
    expect(DeploymentPhase.BUILDING).toBe('building');
    expect(DeploymentStatus.IN_PROGRESS).toBe('in_progress');
    expect(DeploymentStatus.SUCCESS).toBe('success');
  });
});
