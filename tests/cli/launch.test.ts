/**
 * Tests for launch command
 */

import { Command } from 'commander';

// Mock ora and chalk before importing the launch command
jest.mock('ora', () => {
  return jest.fn(() => ({
    start: jest.fn().mockReturnThis(),
    succeed: jest.fn().mockReturnThis(),
    fail: jest.fn().mockReturnThis(),
    text: ''
  }));
});

jest.mock('chalk', () => ({
  bold: jest.fn((text) => text),
  green: jest.fn((text) => text),
  cyan: jest.fn((text) => text),
  red: jest.fn((text) => text)
}));

import { registerLaunchCommand } from '../../src/cli/commands/launch';
import { createLogger } from '../../src/cli/logger';

describe('Launch Command', () => {
  let program: Command;
  let logger: ReturnType<typeof createLogger>;

  beforeEach(() => {
    program = new Command();
    logger = createLogger();
  });

  test('should register launch command', () => {
    registerLaunchCommand(program, logger);
    
    const launchCommand = program.commands.find(cmd => cmd.name() === 'launch');
    
    expect(launchCommand).toBeDefined();
    expect(launchCommand?.description()).toContain('Launch MCP server deployment');
  });

  test('should have config-file option', () => {
    registerLaunchCommand(program, logger);
    
    const launchCommand = program.commands.find(cmd => cmd.name() === 'launch');
    const options = launchCommand?.options || [];
    
    const configOption = options.find(opt => opt.long === '--config-file');
    expect(configOption).toBeDefined();
  });

  test('should have verbose option', () => {
    registerLaunchCommand(program, logger);
    
    const launchCommand = program.commands.find(cmd => cmd.name() === 'launch');
    const options = launchCommand?.options || [];
    
    const verboseOption = options.find(opt => opt.long === '--verbose');
    expect(verboseOption).toBeDefined();
  });
});
