/**
 * Unit tests for configuration persistence
 */

import {
  saveConfig,
  loadConfig,
  configExists,
  deleteConfig,
  getDefaultConfigPath
} from '../../src/config/persistence';
import { Config } from '../../src/types/config';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('Configuration Persistence', () => {
  const testConfig: Config = {
    version: '1.0',
    project: {
      name: 'test-project',
      region: 'us-east-1'
    },
    server: {
      command: 'uvx',
      args: ['excel-mcp-server'],
      transport: 'streamable-http',
      environment: { TEST: 'value' }
    },
    build: {
      codebuildProject: 'test-build',
      ecrRepository: 'test-repo'
    },
    auth: {
      cognitoUserPoolId: 'test-pool',
      cognitoClientId: 'test-client'
    }
  };

  let testFilePath: string;

  beforeEach(() => {
    // Create a unique test file path in temp directory
    testFilePath = path.join(os.tmpdir(), `test-config-${Date.now()}.json`);
  });

  afterEach(async () => {
    // Clean up test file
    if (fs.existsSync(testFilePath)) {
      await deleteConfig(testFilePath);
    }
  });

  describe('saveConfig and loadConfig', () => {
    test('saves and loads configuration correctly', async () => {
      await saveConfig(testConfig, testFilePath);
      expect(fs.existsSync(testFilePath)).toBe(true);

      const loaded = await loadConfig(testFilePath);
      expect(loaded).toEqual(testConfig);
    });

    test('preserves all configuration fields', async () => {
      await saveConfig(testConfig, testFilePath);
      const loaded = await loadConfig(testFilePath);

      expect(loaded.version).toBe(testConfig.version);
      expect(loaded.project.name).toBe(testConfig.project.name);
      expect(loaded.server.command).toBe(testConfig.server.command);
      expect(loaded.server.environment).toEqual(testConfig.server.environment);
      expect(loaded.auth.cognitoUserPoolId).toBe(testConfig.auth.cognitoUserPoolId);
    });

    test('creates directory if it does not exist', async () => {
      const nestedPath = path.join(os.tmpdir(), `test-dir-${Date.now()}`, 'config.json');
      await saveConfig(testConfig, nestedPath);
      expect(fs.existsSync(nestedPath)).toBe(true);

      // Clean up
      fs.unlinkSync(nestedPath);
      fs.rmdirSync(path.dirname(nestedPath));
    });

    test('throws error when loading non-existent file', async () => {
      await expect(loadConfig('/non/existent/file.json')).rejects.toThrow('Configuration file not found');
    });

    test('throws error when loading invalid JSON', async () => {
      fs.writeFileSync(testFilePath, 'invalid json content', 'utf8');
      await expect(loadConfig(testFilePath)).rejects.toThrow('Invalid JSON');
    });
  });

  describe('configExists', () => {
    test('returns true for existing config', async () => {
      await saveConfig(testConfig, testFilePath);
      expect(configExists(testFilePath)).toBe(true);
    });

    test('returns false for non-existent config', () => {
      expect(configExists('/non/existent/file.json')).toBe(false);
    });
  });

  describe('deleteConfig', () => {
    test('deletes existing config file', async () => {
      await saveConfig(testConfig, testFilePath);
      expect(fs.existsSync(testFilePath)).toBe(true);

      await deleteConfig(testFilePath);
      expect(fs.existsSync(testFilePath)).toBe(false);
    });

    test('does not throw error when deleting non-existent file', async () => {
      await expect(deleteConfig('/non/existent/file.json')).resolves.not.toThrow();
    });
  });

  describe('getDefaultConfigPath', () => {
    test('returns a valid path', () => {
      const defaultPath = getDefaultConfigPath();
      expect(defaultPath).toBeTruthy();
      expect(defaultPath).toContain('.agentcore');
      expect(defaultPath).toContain('config.json');
    });
  });
});
