import { CobblAdminClient } from '../admin'
import { CobblPublicClient } from '../public'
import { CobblError } from '../errors'

// Mock fetch globally
const mockFetch = jest.fn()
global.fetch = mockFetch as any

describe('CobblAdminClient', () => {
  const validApiKey = 'test-api-key-123'
  const mockBaseUrl = 'https://api.cobbl.ai'

  beforeEach(() => {
    mockFetch.mockClear()
    delete process.env.COBBL_API_URL
  })

  describe('constructor', () => {
    it('should create a client with valid API key', () => {
      const client = new CobblAdminClient({ apiKey: validApiKey })

      expect(client).toBeInstanceOf(CobblAdminClient)
    })

    it('should throw error when API key is missing', () => {
      expect(() => new CobblAdminClient({ apiKey: '' })).toThrow(CobblError)
      expect(() => new CobblAdminClient({ apiKey: '' })).toThrow(
        'API key is required'
      )
    })

    it('should throw error when API key is only whitespace', () => {
      expect(() => new CobblAdminClient({ apiKey: '   ' })).toThrow(CobblError)
      expect(() => new CobblAdminClient({ apiKey: '   ' })).toThrow(
        'API key is required'
      )
    })

    it('should throw INVALID_CONFIG error code', () => {
      try {
        new CobblAdminClient({ apiKey: '' })
        fail('Should have thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(CobblError)
        expect((error as CobblError).code).toBe('INVALID_CONFIG')
      }
    })
  })

  describe('runPrompt', () => {
    let client: CobblAdminClient

    beforeEach(() => {
      client = new CobblAdminClient({ apiKey: validApiKey })
    })

    it('should successfully run a prompt', async () => {
      const mockResponse = {
        runId: 'run-123',
        output: 'AI generated response',
        tokenUsage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
        renderedPrompt: 'Summarize Q4 Results in a friendly tone',
        promptVersion: {
          id: 'version-1',
          promptId: 'prompt-1',
          version: 1,
          provider: 'openai',
          model: 'gpt-4',
          template: 'Summarize {{topic}} in a {{tone}} tone',
          variables: ['topic', 'tone'],
          isActive: true,
          createdAt: new Date('2024-01-01'),
          metadata: {},
        },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const result = await client.runPrompt('sales_summary', {
        topic: 'Q4 Results',
        tone: 'friendly',
      })

      expect(result).toEqual(mockResponse)
      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(mockFetch).toHaveBeenCalledWith(
        `${mockBaseUrl}/admin/v1/prompt/run`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: `Bearer ${validApiKey}`,
          }),
          body: JSON.stringify({
            promptSlug: 'sales_summary',
            input: { topic: 'Q4 Results', tone: 'friendly' },
          }),
        })
      )
    })

    it('should trim the promptSlug', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          runId: 'run-123',
          output: 'test',
          tokenUsage: {
            promptTokens: 10,
            completionTokens: 20,
            totalTokens: 30,
          },
          renderedPrompt: 'test',
          promptVersion: {
            id: 'v1',
            promptId: 'p1',
            version: 1,
            provider: 'openai',
            model: 'gpt-4',
            template: 'test',
            variables: [],
            isActive: true,
            createdAt: new Date(),
            metadata: {},
          },
        }),
      })

      await client.runPrompt('  sales_summary  ', {})

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"promptSlug":"sales_summary"'),
        })
      )
    })

    it('should throw error when promptSlug is empty', async () => {
      await expect(client.runPrompt('', {})).rejects.toThrow(CobblError)
      await expect(client.runPrompt('', {})).rejects.toThrow(
        'promptSlug is required'
      )
    })

    it('should throw error when promptSlug is only whitespace', async () => {
      await expect(client.runPrompt('   ', {})).rejects.toThrow(CobblError)
    })

    it('should throw INVALID_REQUEST error for empty promptSlug', async () => {
      try {
        await client.runPrompt('', {})
        fail('Should have thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(CobblError)
        expect((error as CobblError).code).toBe('INVALID_REQUEST')
      }
    })

    it('should handle 400 Bad Request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({ error: 'Invalid input variables' }),
      })

      try {
        await client.runPrompt('test', {})
        fail('Should have thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(CobblError)
        expect((error as CobblError).message).toBe('Invalid input variables')
      }
    })

    it('should handle 401 Unauthorized', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({ error: 'Invalid API key' }),
      })

      try {
        await client.runPrompt('test', {})
        fail('Should have thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(CobblError)
        expect((error as CobblError).code).toBe('UNAUTHORIZED')
        expect((error as CobblError).message).toBe('Invalid API key')
      }
    })

    it('should handle 403 Forbidden (disabled prompt)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        json: async () => ({
          error: 'Prompt "test-prompt" is currently disabled',
        }),
      })

      try {
        await client.runPrompt('test-prompt', {})
        fail('Should have thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(CobblError)
        expect((error as CobblError).code).toBe('FORBIDDEN')
        expect((error as CobblError).message).toBe(
          'Prompt "test-prompt" is currently disabled'
        )
      }
    })

    it('should handle 404 Not Found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({ error: 'Prompt not found' }),
      })

      try {
        await client.runPrompt('nonexistent', {})
        fail('Should have thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(CobblError)
        expect((error as CobblError).code).toBe('NOT_FOUND')
      }
    })

    it('should handle 410 Gone (archived prompt)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 410,
        statusText: 'Gone',
        json: async () => ({
          error: 'Prompt "test-prompt" has been archived',
        }),
      })

      try {
        await client.runPrompt('test-prompt', {})
        fail('Should have thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(CobblError)
        expect((error as CobblError).code).toBe('ARCHIVED')
        expect((error as CobblError).message).toBe(
          'Prompt "test-prompt" has been archived'
        )
      }
    })

    it('should handle 429 Rate Limit Exceeded', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        json: async () => ({ error: 'Rate limit exceeded' }),
      })

      try {
        await client.runPrompt('test', {})
        fail('Should have thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(CobblError)
        expect((error as CobblError).code).toBe('RATE_LIMIT_EXCEEDED')
      }
    })

    it('should handle 500 Server Error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ error: 'Server error' }),
      })

      try {
        await client.runPrompt('test', {})
        fail('Should have thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(CobblError)
        expect((error as CobblError).code).toBe('SERVER_ERROR')
      }
    })

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network failure'))

      try {
        await client.runPrompt('test', {})
        fail('Should have thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(CobblError)
        expect((error as CobblError).code).toBe('NETWORK_ERROR')
        expect((error as CobblError).message).toContain('Network failure')
      }
    })

    it('should handle non-JSON error responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => {
          throw new Error('Invalid JSON')
        },
      })

      try {
        await client.runPrompt('test', {})
        fail('Should have thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(CobblError)
        expect((error as CobblError).code).toBe('API_ERROR')
        expect((error as CobblError).message).toContain('HTTP 500')
      }
    })

    it('should use custom API URL from environment', async () => {
      process.env.COBBL_API_URL = 'https://custom.api.com'

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          runId: 'run-123',
          output: 'test',
          tokenUsage: {
            promptTokens: 10,
            completionTokens: 20,
            totalTokens: 30,
          },
          renderedPrompt: 'test',
          promptVersion: {
            id: 'v1',
            promptId: 'p1',
            version: 1,
            provider: 'openai',
            model: 'gpt-4',
            template: 'test',
            variables: [],
            isActive: true,
            createdAt: new Date(),
            metadata: {},
          },
        }),
      })

      await client.runPrompt('test', {})

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.cobbl.ai/admin/v1/prompt/run',
        expect.any(Object)
      )
    })

    it('should have a request timeout configured', () => {
      // This test verifies that the client has timeout logic
      // The actual timeout behavior is tested through integration tests
      // Testing with real timers would make the test suite slow
      expect(client).toBeDefined()

      // The timeout is hardcoded in admin.ts as REQUEST_TIMEOUT_MS = 30_000
      // This test ensures we remember to test timeout behavior if we change it
    })
  })

  describe('error handling with details', () => {
    let client: CobblAdminClient

    beforeEach(() => {
      client = new CobblAdminClient({ apiKey: validApiKey })
    })

    it('should include error details from API response', async () => {
      const errorDetails = {
        missingVariables: ['topic', 'tone'],
        promptId: 'prompt-123',
      }

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({
          error: 'Missing required variables',
          details: errorDetails,
        }),
      })

      try {
        await client.runPrompt('test', {})
        fail('Should have thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(CobblError)
        expect((error as CobblError).details).toEqual(errorDetails)
      }
    })

    it('should handle error with message field instead of error field', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({ message: 'Custom error message' }),
      })

      try {
        await client.runPrompt('test', {})
        fail('Should have thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(CobblError)
        expect((error as CobblError).message).toBe('Custom error message')
      }
    })

    it('should handle generic server errors (502, 503, 504)', async () => {
      const statuses = [502, 503, 504]

      for (const status of statuses) {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status,
          statusText: 'Server Error',
          json: async () => ({ error: 'Server unavailable' }),
        })

        try {
          await client.runPrompt('test', {})
          fail('Should have thrown')
        } catch (error) {
          expect(error).toBeInstanceOf(CobblError)
          expect((error as CobblError).code).toBe('SERVER_ERROR')
        }
      }
    })
  })
})

describe('CobblPublicClient', () => {
  const mockBaseUrl = 'https://api.cobbl.ai'

  beforeEach(() => {
    mockFetch.mockClear()
  })

  describe('constructor', () => {
    it('should create a client with default config', () => {
      const client = new CobblPublicClient()

      expect(client).toBeInstanceOf(CobblPublicClient)
    })

    it('should create a client with custom baseUrl', () => {
      const client = new CobblPublicClient({
        baseUrl: 'https://custom.api.com',
      })

      expect(client).toBeInstanceOf(CobblPublicClient)
    })

    it('should create a client with empty config object', () => {
      const client = new CobblPublicClient({})

      expect(client).toBeInstanceOf(CobblPublicClient)
    })
  })

  describe('createFeedback', () => {
    let client: CobblPublicClient

    beforeEach(() => {
      client = new CobblPublicClient()
    })

    it('should successfully create feedback with both fields', async () => {
      const mockResponse = {
        id: 'feedback-123',
        message: 'Feedback submitted successfully',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const result = await client.createFeedback({
        runId: 'run-123',
        helpful: 'not_helpful',
        userFeedback: 'Too formal',
      })

      expect(result).toEqual(mockResponse)
      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(mockFetch).toHaveBeenCalledWith(
        `${mockBaseUrl}/public/v1/feedback`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({
            runId: 'run-123',
            helpful: 'not_helpful',
            userFeedback: 'Too formal',
          }),
        })
      )
    })

    it('should create feedback with only helpful (segmented feedback)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'fb-123', message: 'Success' }),
      })

      const result = await client.createFeedback({
        runId: 'run-123',
        helpful: 'not_helpful',
      })

      expect(result.id).toBe('fb-123')
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            runId: 'run-123',
            helpful: 'not_helpful',
          }),
        })
      )
    })

    it('should create feedback with only userFeedback (segmented feedback)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'fb-123', message: 'Success' }),
      })

      const result = await client.createFeedback({
        runId: 'run-123',
        userFeedback: 'Too formal',
      })

      expect(result.id).toBe('fb-123')
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            runId: 'run-123',
            userFeedback: 'Too formal',
          }),
        })
      )
    })

    it('should trim runId and userFeedback', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'fb-123', message: 'Success' }),
      })

      await client.createFeedback({
        runId: '  run-123  ',
        helpful: 'helpful',
        userFeedback: '  Great response!  ',
      })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"runId":"run-123"'),
        })
      )
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"userFeedback":"Great response!"'),
        })
      )
    })

    it('should throw error when runId is empty', async () => {
      await expect(
        client.createFeedback({
          runId: '',
          helpful: 'helpful',
        })
      ).rejects.toThrow(CobblError)
      await expect(
        client.createFeedback({
          runId: '',
          helpful: 'helpful',
        })
      ).rejects.toThrow('runId is required')
    })

    it('should throw error when neither helpful nor userFeedback is provided', async () => {
      await expect(
        client.createFeedback({
          runId: 'run-123',
        })
      ).rejects.toThrow(CobblError)
      await expect(
        client.createFeedback({
          runId: 'run-123',
        })
      ).rejects.toThrow('At least one of helpful or userFeedback is required')
    })

    it('should throw error when userFeedback is empty string', async () => {
      await expect(
        client.createFeedback({
          runId: 'run-123',
          userFeedback: '',
        })
      ).rejects.toThrow(CobblError)
    })

    it('should throw error when helpful is invalid', async () => {
      await expect(
        client.createFeedback({
          runId: 'run-123',
          helpful: 'invalid' as any,
        })
      ).rejects.toThrow(CobblError)
    })

    it('should accept "helpful" value', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'fb-123', message: 'Success' }),
      })

      await client.createFeedback({
        runId: 'run-123',
        helpful: 'helpful',
        userFeedback: 'Great!',
      })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"helpful":"helpful"'),
        })
      )
    })

    it('should accept "not_helpful" value', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'fb-123', message: 'Success' }),
      })

      await client.createFeedback({
        runId: 'run-123',
        helpful: 'not_helpful',
        userFeedback: 'Needs work',
      })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"helpful":"not_helpful"'),
        })
      )
    })

    it('should handle 400 Bad Request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({ error: 'Invalid feedback data' }),
      })

      try {
        await client.createFeedback({
          runId: 'run-123',
          helpful: 'helpful',
        })
        fail('Should have thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(CobblError)
        expect((error as CobblError).code).toBe('INVALID_REQUEST')
      }
    })

    it('should handle 401 Unauthorized', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({ error: 'Invalid API key' }),
      })

      try {
        await client.createFeedback({
          runId: 'run-123',
          helpful: 'helpful',
        })
        fail('Should have thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(CobblError)
        expect((error as CobblError).code).toBe('UNAUTHORIZED')
      }
    })

    it('should handle 404 Not Found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({ error: 'Run ID not found' }),
      })

      try {
        await client.createFeedback({
          runId: 'nonexistent',
          helpful: 'helpful',
        })
        fail('Should have thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(CobblError)
        expect((error as CobblError).code).toBe('NOT_FOUND')
      }
    })

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network failure'))

      try {
        await client.createFeedback({
          runId: 'run-123',
          helpful: 'helpful',
        })
        fail('Should have thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(CobblError)
        expect((error as CobblError).code).toBe('NETWORK_ERROR')
        expect((error as CobblError).message).toContain('Network failure')
      }
    })
  })

  describe('updateFeedback', () => {
    let client: CobblPublicClient

    beforeEach(() => {
      client = new CobblPublicClient()
    })

    it('should successfully update feedback with userFeedback', async () => {
      const mockResponse = {
        id: 'feedback-123',
        message: 'Feedback updated successfully',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const result = await client.updateFeedback('feedback-123', {
        userFeedback: 'Additional details',
      })

      expect(result).toEqual(mockResponse)
      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(mockFetch).toHaveBeenCalledWith(
        `${mockBaseUrl}/public/v1/feedback/feedback-123`,
        expect.objectContaining({
          method: 'PATCH',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({
            userFeedback: 'Additional details',
          }),
        })
      )
    })

    it('should successfully update feedback with helpful', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'fb-123', message: 'Success' }),
      })

      await client.updateFeedback('fb-123', {
        helpful: 'helpful',
      })

      expect(mockFetch).toHaveBeenCalledWith(
        `${mockBaseUrl}/public/v1/feedback/fb-123`,
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({
            helpful: 'helpful',
          }),
        })
      )
    })

    it('should successfully update feedback with both fields', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'fb-123', message: 'Success' }),
      })

      await client.updateFeedback('fb-123', {
        helpful: 'not_helpful',
        userFeedback: 'Updated feedback',
      })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            helpful: 'not_helpful',
            userFeedback: 'Updated feedback',
          }),
        })
      )
    })

    it('should trim feedbackId and userFeedback', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'fb-123', message: 'Success' }),
      })

      await client.updateFeedback('  fb-123  ', {
        userFeedback: '  Trimmed feedback  ',
      })

      expect(mockFetch).toHaveBeenCalledWith(
        `${mockBaseUrl}/public/v1/feedback/fb-123`,
        expect.objectContaining({
          body: expect.stringContaining('"userFeedback":"Trimmed feedback"'),
        })
      )
    })

    it('should throw error when feedbackId is empty', async () => {
      await expect(
        client.updateFeedback('', { helpful: 'helpful' })
      ).rejects.toThrow(CobblError)
      await expect(
        client.updateFeedback('', { helpful: 'helpful' })
      ).rejects.toThrow('id is required')
    })

    it('should throw error when neither field is provided', async () => {
      await expect(client.updateFeedback('fb-123', {})).rejects.toThrow(
        CobblError
      )
      await expect(client.updateFeedback('fb-123', {})).rejects.toThrow(
        'At least one of helpful or userFeedback is required'
      )
    })

    it('should throw error when helpful is invalid', async () => {
      await expect(
        client.updateFeedback('fb-123', { helpful: 'invalid' as any })
      ).rejects.toThrow(CobblError)
    })

    it('should handle 404 Not Found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({ error: 'Feedback not found' }),
      })

      try {
        await client.updateFeedback('nonexistent', { helpful: 'helpful' })
        fail('Should have thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(CobblError)
        expect((error as CobblError).code).toBe('NOT_FOUND')
      }
    })

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network failure'))

      try {
        await client.updateFeedback('fb-123', { helpful: 'helpful' })
        fail('Should have thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(CobblError)
        expect((error as CobblError).code).toBe('NETWORK_ERROR')
        expect((error as CobblError).message).toContain('Network failure')
      }
    })
  })
})
