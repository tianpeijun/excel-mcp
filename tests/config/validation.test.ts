/**
 * Unit tests for configuration validation
 */

import {
  validateConfig,
  validateAwsRegion,
  validateSourcePath,
  parseUvxCommand,
  validateConfigureOptions
} from '../../src/config/validation';
import { Config, ConfigureOptions } from '../../src/types/config';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('Configuration Validation', () => {
  describe('validateAwsRegion', () => {
    test('accepts valid AWS regions', () => {
      const result = validateAwsRegion('us-east-1');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('rejects invalid AWS regions', () => {
      const result = validateAwsRegion('invalid-region');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Invalid AWS region');
    });

    test('rejects empty region', () => {
      const result = validateAwsRegion('');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('parseUvxCommand', () => {
    test('parses simple uvx command', () => {
      const result = parseUvxCommand('uvx excel-mcp-server');
      expect(result.command).toBe('uvx');
      expect(result.packageName).toBe('excel-mcp-server');
      expect(result.version).toBeUndefined();
      expect(result.args).toEqual([]);
    });

    test('parses uvx command with version', () => {
      const result = parseUvxCommand('uvx excel-mcp-server@1.0.0');
      expect(result.command).toBe('uvx');
      expect(result.packageName).toBe('excel-mcp-server');
      expect(result.version).toBe('1.0.0');
      expect(result.args).toEqual([]);
    });

    test('parses uvx command with arguments', () => {
      const result = parseUvxCommand('uvx excel-mcp-server --port 8080');
      expect(result.command).toBe('uvx');
      expect(result.packageName).toBe('excel-mcp-server');
      expect(result.version).toBeUndefined();
      expect(result.args).toEqual(['--port', '8080']);
    });

    test('parses uvx command with version and arguments', () => {
      const result = parseUvxCommand('uvx excel-mcp-server@1.0.0 --port 8080');
      expect(result.command).toBe('uvx');
      expect(result.packageName).toBe('excel-mcp-server');
      expect(result.version).toBe('1.0.0');
      expect(result.args).toEqual(['--port', '8080']);
    });

    test('throws error for non-uvx command', () => {
      expect(() => parseUvxCommand('npm install package')).toThrow('Expected command to start with "uvx"');
    });

    test('throws error for empty command', () => {
      expect(() => parseUvxCommand('')).toThrow('Command string is empty');
    });

    test('throws error for uvx without package', () => {
      expect(() => parseUvxCommand('uvx')).toThrow('uvx command must include a package name');
    });
  });

  describe('validateSourcePath', () => {
    test('accepts existing directory', () => {
      const tempDir = os.tmpdir();
      const result = validateSourcePath(tempDir);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('rejects non-existent path', () => {
      const result = validateSourcePath('/non/existent/path');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('does not exist');
    });

    test('rejects empty path', () => {
      const result = validateSourcePath('');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('validateConfig', () => {
    const validConfig: Config = {
      version: '1.0',
      project: {
        name: 'test-project',
        region: 'us-east-1'
      },
      server: {
        command: 'uvx',
        args: ['excel-mcp-server'],
        transport: 'streamable-http',
        environment: {}
      },
      build: {
        codebuildProject: 'test-build',
        ecrRepository: 'test-repo'
      },
      auth: {}
    };

    test('accepts valid configuration', () => {
      const result = validateConfig(validConfig);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('rejects config without version', () => {
      const config = { ...validConfig, version: '' };
      const result = validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('version'))).toBe(true);
    });

    test('rejects config with invalid region', () => {
      const config = {
        ...validConfig,
        project: { ...validConfig.project, region: 'invalid' }
      };
      const result = validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('region'))).toBe(true);
    });

    test('rejects config with invalid transport', () => {
      const config = {
        ...validConfig,
        server: { ...validConfig.server, transport: 'websocket' as any }
      };
      const result = validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('streamable-http'))).toBe(true);
    });
  });

  describe('validateConfigureOptions', () => {
    const validOptions: ConfigureOptions = {
      server: 'uvx excel-mcp-server',
      transport: 'streamable-http',
      region: 'us-east-1',
      projectName: 'test-project'
    };

    test('accepts valid options', () => {
      const result = validateConfigureOptions(validOptions);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('rejects invalid server command', () => {
      const options = { ...validOptions, server: 'npm install' };
      const result = validateConfigureOptions(options);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('server command'))).toBe(true);
    });

    test('rejects invalid transport', () => {
      const options = { ...validOptions, transport: 'websocket' };
      const result = validateConfigureOptions(options);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('streamable-http'))).toBe(true);
    });

    test('rejects invalid project name', () => {
      const options = { ...validOptions, projectName: 'invalid name!' };
      const result = validateConfigureOptions(options);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Project name'))).toBe(true);
    });
  });
});
