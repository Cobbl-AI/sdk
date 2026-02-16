/**
 * Error types that can be thrown by the Cobbl SDK
 */
export type CobblErrorCode =
  | 'INVALID_CONFIG'
  | 'INVALID_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'ARCHIVED'
  | 'RATE_LIMIT_EXCEEDED'
  | 'SERVER_ERROR'
  | 'NETWORK_ERROR'
  | 'API_ERROR'

/**
 * Custom error class for Cobbl SDK errors
 *
 * @example
 * ```typescript
 * try {
 *   await client.runPrompt('my-prompt', { topic: 'test' })
 * } catch (error) {
 *   if (error instanceof CobblError) {
 *     console.error(`Error [${error.code}]: ${error.message}`)
 *     console.error('Details:', error.details)
 *   }
 * }
 * ```
 */
export class CobblError extends Error {
  /**
   * Error code indicating the type of error
   */
  public readonly code: CobblErrorCode

  /**
   * Additional details about the error (e.g., missing variables, validation issues)
   */
  public readonly details?: unknown

  constructor(message: string, code: CobblErrorCode, details?: unknown) {
    super(message)
    this.name = 'CobblError'
    this.code = code
    this.details = details

    // Maintains proper stack trace for where error was thrown (V8 only)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, CobblError)
    }
  }

  /**
   * Check if an error is a CobblError
   */
  static isCobblError(error: unknown): error is CobblError {
    return error instanceof CobblError
  }

  /**
   * Convert error to JSON-serializable object
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      details: this.details,
    }
  }
}

/**
 * Handle error responses from the API
 * @internal
 */
export const handleErrorResponse = async (
  response: Response
): Promise<never> => {
  let errorData: any
  try {
    errorData = await response.json()
  } catch {
    throw new CobblError(
      `HTTP ${response.status}: ${response.statusText}`,
      'API_ERROR',
      { status: response.status }
    )
  }

  const message = errorData.error || errorData.message || 'Unknown error'
  const details = errorData.details

  switch (response.status) {
    case 400:
      throw new CobblError(message, 'INVALID_REQUEST', details)
    case 401:
      throw new CobblError(message, 'UNAUTHORIZED', details)
    case 403:
      throw new CobblError(message, 'FORBIDDEN', details)
    case 404:
      throw new CobblError(message, 'NOT_FOUND', details)
    case 410:
      throw new CobblError(message, 'ARCHIVED', details)
    case 429:
      throw new CobblError(message, 'RATE_LIMIT_EXCEEDED', details)
    case 500:
    case 502:
    case 503:
    case 504:
      throw new CobblError(message, 'SERVER_ERROR', details)
    default:
      throw new CobblError(message, 'API_ERROR', {
        status: response.status,
        ...details,
      })
  }
}
