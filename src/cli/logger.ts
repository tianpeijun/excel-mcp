/**
 * Progress reporter and logger
 * Requirements: 7.1 (display progress), 7.4 (verbose mode)
 */

import ora, { Ora } from 'ora';
import chalk from 'chalk';
import { UserMessage } from '../types/errors';

export type LogLevel = 'info' | 'success' | 'warning' | 'error' | 'debug';

/**
 * Logger interface for CLI output
 */
export interface Logger {
  info(message: string): void;
  success(message: string): void;
  warning(message: string): void;
  error(message: string): void;
  debug(message: string): void;
  setVerbose(verbose: boolean): void;
  isVerbose(): boolean;
}

/**
 * Progress reporter interface
 */
export interface ProgressReporter {
  start(message: string): void;
  update(message: string): void;
  succeed(message?: string): void;
  fail(message?: string): void;
  warn(message?: string): void;
  stop(): void;
  isActive(): boolean;
}

/**
 * Combined logger and progress reporter implementation
 * Requirement 7.1: Display progress indicators during command execution
 * Requirement 7.4: Output detailed debug information in verbose mode
 */
export class CLILogger implements Logger, ProgressReporter {
  private verbose: boolean = false;
  private spinner: Ora | null = null;

  constructor(verbose: boolean = false) {
    this.verbose = verbose;
  }

  /**
   * Sets verbose mode
   */
  setVerbose(verbose: boolean): void {
    this.verbose = verbose;
  }

  /**
   * Checks if verbose mode is enabled
   */
  isVerbose(): boolean {
    return this.verbose;
  }

  /**
   * Logs an info message
   */
  info(message: string): void {
    if (this.spinner?.isSpinning) {
      this.spinner.stop();
    }
    console.log(chalk.blue('ℹ'), message);
    if (this.spinner?.isSpinning) {
      this.spinner.start();
    }
  }

  /**
   * Logs a success message
   */
  success(message: string): void {
    if (this.spinner?.isSpinning) {
      this.spinner.stop();
    }
    console.log(chalk.green('✓'), message);
    if (this.spinner?.isSpinning) {
      this.spinner.start();
    }
  }

  /**
   * Logs a warning message
   */
  warning(message: string): void {
    if (this.spinner?.isSpinning) {
      this.spinner.stop();
    }
    console.log(chalk.yellow('⚠'), message);
    if (this.spinner?.isSpinning) {
      this.spinner.start();
    }
  }

  /**
   * Logs an error message
   */
  error(message: string): void {
    if (this.spinner?.isSpinning) {
      this.spinner.stop();
    }
    console.error(chalk.red('✖'), message);
    if (this.spinner?.isSpinning) {
      this.spinner.start();
    }
  }

  /**
   * Logs a debug message (only in verbose mode)
   * Requirement 7.4: Output detailed debug information in verbose mode
   */
  debug(message: string): void {
    if (!this.verbose) {
      return;
    }

    if (this.spinner?.isSpinning) {
      this.spinner.stop();
    }
    console.log(chalk.gray('🔍'), chalk.gray(message));
    if (this.spinner?.isSpinning) {
      this.spinner.start();
    }
  }

  /**
   * Starts a progress indicator
   * Requirement 7.1: Display progress indicators during command execution
   */
  start(message: string): void {
    if (this.spinner?.isSpinning) {
      this.spinner.stop();
    }
    this.spinner = ora({
      text: message,
      color: 'cyan'
    }).start();
  }

  /**
   * Updates the progress indicator message
   */
  update(message: string): void {
    if (this.spinner?.isSpinning) {
      this.spinner.text = message;
    } else {
      this.start(message);
    }
  }

  /**
   * Marks progress as successful
   */
  succeed(message?: string): void {
    if (this.spinner?.isSpinning) {
      this.spinner.succeed(message);
      this.spinner = null;
    } else if (message) {
      this.success(message);
    }
  }

  /**
   * Marks progress as failed
   */
  fail(message?: string): void {
    if (this.spinner?.isSpinning) {
      this.spinner.fail(message);
      this.spinner = null;
    } else if (message) {
      this.error(message);
    }
  }

  /**
   * Marks progress with a warning
   */
  warn(message?: string): void {
    if (this.spinner?.isSpinning) {
      this.spinner.warn(message);
      this.spinner = null;
    } else if (message) {
      this.warning(message);
    }
  }

  /**
   * Stops the progress indicator
   */
  stop(): void {
    if (this.spinner?.isSpinning) {
      this.spinner.stop();
      this.spinner = null;
    }
  }

  /**
   * Checks if progress indicator is active
   */
  isActive(): boolean {
    return this.spinner?.isSpinning || false;
  }

  /**
   * Formats and displays a user message
   * Requirement 7.3: Output error messages with cause and suggestions
   */
  displayUserMessage(userMessage: UserMessage): void {
    this.stop();

    // Display the main message
    switch (userMessage.level) {
      case 'error':
        console.error(chalk.red.bold(`\n✖ Error [${userMessage.code}]`));
        console.error(chalk.red(userMessage.message));
        break;
      case 'warning':
        console.warn(chalk.yellow.bold(`\n⚠ Warning [${userMessage.code}]`));
        console.warn(chalk.yellow(userMessage.message));
        break;
      case 'info':
        console.log(chalk.blue.bold(`\nℹ Info`));
        console.log(chalk.blue(userMessage.message));
        break;
    }

    // Display details if present
    if (userMessage.details) {
      console.log(chalk.gray(`\nDetails: ${userMessage.details}`));
    }

    // Display suggestions
    if (userMessage.suggestions.length > 0) {
      console.log(chalk.cyan('\nSuggestions:'));
      userMessage.suggestions.forEach((suggestion, index) => {
        console.log(chalk.cyan(`  ${index + 1}. ${suggestion}`));
      });
    }

    // Display documentation link if present
    if (userMessage.documentation) {
      console.log(chalk.gray(`\nDocumentation: ${userMessage.documentation}`));
    }

    console.log(); // Empty line for spacing
  }

  /**
   * Displays a section header
   */
  section(title: string): void {
    this.stop();
    console.log(chalk.bold.cyan(`\n═══ ${title} ═══\n`));
  }

  /**
   * Displays a key-value pair
   */
  keyValue(key: string, value: string): void {
    console.log(`  ${chalk.gray(key + ':')} ${chalk.white(value)}`);
  }

  /**
   * Displays a list item
   */
  listItem(item: string, indent: number = 0): void {
    const indentation = '  '.repeat(indent);
    console.log(`${indentation}${chalk.gray('•')} ${item}`);
  }
}

/**
 * Creates a new CLI logger instance
 */
export function createLogger(verbose: boolean = false): CLILogger {
  return new CLILogger(verbose);
}
