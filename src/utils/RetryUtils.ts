/**
 * Retry utility functions with exponential backoff
 */

export interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
}

export interface RetryResult<T> {
  success: boolean;
  result?: T;
  error?: Error;
  attempts: number;
}

/**
 * Retry a function with exponential backoff
 * @param fn Function to retry
 * @param options Retry configuration options
 * @returns Promise with retry result
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<RetryResult<T>> {
  const {
    maxAttempts = 3,
    baseDelayMs = 1000,
    maxDelayMs = 8000,
    backoffMultiplier = 2
  } = options;

  let lastError: Error | undefined;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await fn();
      return {
        success: true,
        result,
        attempts: attempt
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Don't wait after the last attempt
      if (attempt < maxAttempts) {
        const delay = Math.min(
          baseDelayMs * Math.pow(backoffMultiplier, attempt - 1),
          maxDelayMs
        );
        await sleep(delay);
      }
    }
  }

  return {
    success: false,
    error: lastError,
    attempts: maxAttempts
  };
}

/**
 * Retry a function with exponential backoff, but only for transient errors
 * @param fn Function to retry
 * @param isTransientError Function to determine if error is transient
 * @param options Retry configuration options
 * @returns Promise with retry result
 */
export async function retryTransientErrors<T>(
  fn: () => Promise<T>,
  isTransientError: (error: Error) => boolean,
  options: RetryOptions = {}
): Promise<RetryResult<T>> {
  const {
    maxAttempts = 3,
    baseDelayMs = 1000,
    maxDelayMs = 8000,
    backoffMultiplier = 2
  } = options;

  let lastError: Error | undefined;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await fn();
      return {
        success: true,
        result,
        attempts: attempt
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Don't retry permanent errors
      if (!isTransientError(lastError)) {
        return {
          success: false,
          error: lastError,
          attempts: attempt
        };
      }
      
      // Don't wait after the last attempt
      if (attempt < maxAttempts) {
        const delay = Math.min(
          baseDelayMs * Math.pow(backoffMultiplier, attempt - 1),
          maxDelayMs
        );
        await sleep(delay);
      }
    }
  }

  return {
    success: false,
    error: lastError,
    attempts: maxAttempts
  };
}

/**
 * Sleep for specified milliseconds
 * @param ms Milliseconds to sleep
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if an error is transient (should be retried)
 * @param error Error to check
 * @returns True if error is transient
 */
export function isTransientError(error: Error): boolean {
  const transientPatterns = [
    'network error',
    'timeout',
    'connection refused',
    'server error',
    'service unavailable',
    'rate limit',
    'too many requests',
    'temporary failure',
    'ECONNRESET',
    'ENOTFOUND',
    'ETIMEDOUT'
  ];

  const errorMessage = error.message.toLowerCase();
  return transientPatterns.some(pattern => errorMessage.includes(pattern));
}

/**
 * Check if an error is permanent (should not be retried)
 * @param error Error to check
 * @returns True if error is permanent
 */
export function isPermanentError(error: Error): boolean {
  const permanentPatterns = [
    'job no longer available',
    'position closed',
    'application deadline passed',
    'invalid credentials',
    'account suspended',
    'unauthorized access',
    'forbidden',
    'not found',
    '404',
    '403',
    '401'
  ];

  const errorMessage = error.message.toLowerCase();
  return permanentPatterns.some(pattern => errorMessage.includes(pattern));
}