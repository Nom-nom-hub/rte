import chalk from 'chalk';

export interface CLIError {
  message: string;
  code?: string;
  suggestion?: string;
}

let debugMode = false;

export function setDebugMode(enabled: boolean): void {
  debugMode = enabled;
}

export function isDebugMode(): boolean {
  return debugMode;
}

export function handleError(error: unknown, context?: string): never {
  const errorMessage = getErrorMessage(error);
  const errorCode = getErrorCode(error);

  console.error('\n' + chalk.red('❌ Error') + ': ' + errorMessage);

  if (context) {
    console.error(chalk.gray('  Command: ') + context);
  }

  if (debugMode && error instanceof Error) {
    console.error('\n' + chalk.gray('--- Stack Trace ---'));
    console.error(chalk.gray(error.stack || 'No stack trace available'));
  }

  const suggestion = getSuggestion(error);
  if (suggestion) {
    console.error(chalk.cyan('  ' + suggestion));
  }

  console.error('');

  process.exit(errorCode);
}

export function handleUserError(message: string, suggestion?: string): never {
  console.error('\n' + chalk.red('❌ Error') + ': ' + message);
  if (suggestion) {
    console.error(chalk.cyan('  ' + suggestion));
  }
  console.error('');
  process.exit(1);
}

export function handleSuccess(message: string): void {
  console.log(chalk.green('✅ ') + message);
}

export function getErrorMessage(error: unknown): string {
  if (typeof error === 'string') {
    return error;
  }

  if (error instanceof SyntaxError) {
    return `Invalid JSON: ${error.message.split('\n')[0]}`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'An unexpected error occurred';
}

function getErrorCode(error: unknown): number {
  if (error instanceof SyntaxError || error instanceof TypeError) {
    return 1;
  }
  return 1;
}

function getSuggestion(error: unknown): string | undefined {
  if (error instanceof SyntaxError) {
    return 'Ensure the file contains valid JSON format';
  }

  if (error instanceof Error) {
    if (error.message.includes('not found')) {
      return 'Check that the file path is correct';
    }
    if (error.message.includes('permission')) {
      return 'Ensure you have read permissions for the file';
    }
  }

  return undefined;
}

export function safeJSONParse<T = unknown>(content: string, context: string): T {
  try {
    return JSON.parse(content) as T;
  } catch (error) {
    if (error instanceof SyntaxError) {
      handleUserError(
        `Invalid ${context}: unable to parse JSON`,
        `The file may be corrupted or empty. Check the file contents.`
      );
    }
    throw error;
  }
}

export function wrapCommand<T extends any[], R>(
  commandFn: (...args: T) => R | Promise<R>,
  commandName: string
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    try {
      return await commandFn(...args);
    } catch (error) {
      handleError(error, commandName);
    }
  };
}