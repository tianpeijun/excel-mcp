#!/usr/bin/env node

/**
 * AgentCore CLI entry point
 */

import { Command } from 'commander';
import { createLogger } from './cli/logger';
import { registerConfigureCommand } from './cli/commands/configure';
import { registerLaunchCommand } from './cli/commands/launch';

const program = new Command();

// Create logger instance
const logger = createLogger();

program
  .name('agentcore')
  .description('Deploy MCP servers to Amazon Bedrock AgentCore Runtime')
  .version('1.0.0');

// Register configure command
registerConfigureCommand(program, logger);

// Register launch command
registerLaunchCommand(program, logger);

program.parse();
