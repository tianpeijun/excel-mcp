/**
 * Configuration persistence logic
 * Requirement 1.4: Persist configuration to local configuration file
 */

import { Config } from '../types/config';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * Default configuration directory and file name
 */
const DEFAULT_CONFIG_DIR = path.join(os.homedir(), '.agentcore');
const DEFAULT_CONFIG_FILE = 'config.json';

/**
 * Gets the default configuration file path
 */
export function getDefaultConfigPath(): string {
  return path.join(DEFAULT_CONFIG_DIR, DEFAULT_CONFIG_FILE);
}

/**
 * Gets the configuration directory path
 */
export function getConfigDirectory(): string {
  return DEFAULT_CONFIG_DIR;
}

/**
 * Ensures the configuration directory exists
 */
function ensureConfigDirectory(): void {
  if (!fs.existsSync(DEFAULT_CONFIG_DIR)) {
    fs.mkdirSync(DEFAULT_CONFIG_DIR, { recursive: true });
  }
}

/**
 * Saves configuration to a JSON file
 * Requirement 1.4: Persist configuration to local configuration file
 * 
 * @param config - Configuration object to save
 * @param filePath - Optional custom file path. If not provided, uses default location
 * @returns Promise that resolves when save is complete
 */
export async function saveConfig(config: Config, filePath?: string): Promise<void> {
  const targetPath = filePath || getDefaultConfigPath();
  
  // Ensure directory exists
  const directory = path.dirname(targetPath);
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }

  // Serialize config to JSON with pretty formatting
  const jsonContent = JSON.stringify(config, null, 2);

  // Write to file
  return new Promise((resolve, reject) => {
    fs.writeFile(targetPath, jsonContent, 'utf8', (error) => {
      if (error) {
        reject(new Error(`Failed to save configuration: ${error.message}`));
      } else {
        resolve();
      }
    });
  });
}

/**
 * Loads configuration from a JSON file
 * Requirement 1.4: Load configuration from local configuration file
 * 
 * @param filePath - Optional custom file path. If not provided, uses default location
 * @returns Promise that resolves with the loaded configuration
 * @throws Error if file doesn't exist or contains invalid JSON
 */
export async function loadConfig(filePath?: string): Promise<Config> {
  const targetPath = filePath || getDefaultConfigPath();

  // Check if file exists
  if (!fs.existsSync(targetPath)) {
    throw new Error(`Configuration file not found: ${targetPath}`);
  }

  // Read file
  return new Promise((resolve, reject) => {
    fs.readFile(targetPath, 'utf8', (error, data) => {
      if (error) {
        reject(new Error(`Failed to read configuration: ${error.message}`));
      } else {
        try {
          const config = JSON.parse(data) as Config;
          resolve(config);
        } catch (parseError) {
          reject(new Error(`Invalid JSON in configuration file: ${(parseError as Error).message}`));
        }
      }
    });
  });
}

/**
 * Checks if a configuration file exists
 * 
 * @param filePath - Optional custom file path. If not provided, uses default location
 * @returns true if the configuration file exists, false otherwise
 */
export function configExists(filePath?: string): boolean {
  const targetPath = filePath || getDefaultConfigPath();
  return fs.existsSync(targetPath);
}

/**
 * Deletes a configuration file
 * 
 * @param filePath - Optional custom file path. If not provided, uses default location
 * @returns Promise that resolves when deletion is complete
 */
export async function deleteConfig(filePath?: string): Promise<void> {
  const targetPath = filePath || getDefaultConfigPath();

  if (!fs.existsSync(targetPath)) {
    return; // Nothing to delete
  }

  return new Promise((resolve, reject) => {
    fs.unlink(targetPath, (error) => {
      if (error) {
        reject(new Error(`Failed to delete configuration: ${error.message}`));
      } else {
        resolve();
      }
    });
  });
}

/**
 * Lists all configuration files in the default directory
 * 
 * @returns Array of configuration file names
 */
export function listConfigs(): string[] {
  ensureConfigDirectory();

  if (!fs.existsSync(DEFAULT_CONFIG_DIR)) {
    return [];
  }

  const files = fs.readdirSync(DEFAULT_CONFIG_DIR);
  return files.filter(file => file.endsWith('.json'));
}
