import { CobblError } from '../errors'

describe('CobblError', () => {
  describe('constructor', () => {
    it('should create an error with message and code', () => {
      const error = new CobblError('Test error', 'INVALID_REQUEST')

      expect(error).toBeInstanceOf(Error)
      expect(error).toBeInstanceOf(CobblError)
      expect(error.message).toBe('Test error')
      expect(error.code).toBe('INVALID_REQUEST')
      expect(error.name).toBe('CobblError')
      expect(error.details).toBeUndefined()
    })

    it('should create an error with details', () => {
      const details = { field: 'apiKey', reason: 'missing' }
      const error = new CobblError('Invalid config', 'INVALID_CONFIG', details)

      expect(error.message).toBe('Invalid config')
      expect(error.code).toBe('INVALID_CONFIG')
      expect(error.details).toEqual(details)
    })

    it('should maintain proper stack trace', () => {
      const error = new CobblError('Test error', 'API_ERROR')

      expect(error.stack).toBeDefined()
      expect(error.stack).toContain('CobblError')
    })
  })

  describe('isCobblError', () => {
    it('should return true for CobblError instances', () => {
      const error = new CobblError('Test', 'NETWORK_ERROR')

      expect(CobblError.isCobblError(error)).toBe(true)
    })

    it('should return false for standard Error instances', () => {
      const error = new Error('Test')

      expect(CobblError.isCobblError(error)).toBe(false)
    })

    it('should return false for non-error values', () => {
      expect(CobblError.isCobblError(null)).toBe(false)
      expect(CobblError.isCobblError(undefined)).toBe(false)
      expect(CobblError.isCobblError('error')).toBe(false)
      expect(CobblError.isCobblError({ message: 'error' })).toBe(false)
    })
  })

  describe('toJSON', () => {
    it('should serialize error to JSON', () => {
      const error = new CobblError('Test error', 'SERVER_ERROR', {
        status: 500,
      })
      const json = error.toJSON()

      expect(json).toEqual({
        name: 'CobblError',
        message: 'Test error',
        code: 'SERVER_ERROR',
        details: { status: 500 },
      })
    })

    it('should serialize error without details', () => {
      const error = new CobblError('Test error', 'NOT_FOUND')
      const json = error.toJSON()

      expect(json).toEqual({
        name: 'CobblError',
        message: 'Test error',
        code: 'NOT_FOUND',
        details: undefined,
      })
    })
  })

  describe('error codes', () => {
    const errorCodes = [
      'INVALID_CONFIG',
      'INVALID_REQUEST',
      'UNAUTHORIZED',
      'NOT_FOUND',
      'RATE_LIMIT_EXCEEDED',
      'SERVER_ERROR',
      'NETWORK_ERROR',
      'API_ERROR',
    ] as const

    it.each(errorCodes)('should support %s error code', (code) => {
      const error = new CobblError('Test', code)

      expect(error.code).toBe(code)
    })
  })
})
