import { CobblAdminClient, CobblPublicClient, CobblError } from '../index'

// Mock fetch globally
const mockFetch = jest.fn()
global.fetch = mockFetch as any

describe('SDK Integration Tests', () => {
  beforeEach(() => {
    mockFetch.mockClear()
    delete process.env.COBBL_API_URL
  })

  describe('complete workflow', () => {
    it('should run prompt and create feedback successfully', async () => {
      const adminClient = new CobblAdminClient({ apiKey: 'test-key' })
      const publicClient = new CobblPublicClient()

      // Mock runPrompt response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          runId: 'run-123',
          output: 'AI generated summary of Q4 results in a friendly tone.',
          tokenUsage: {
            promptTokens: 50,
            completionTokens: 100,
            totalTokens: 150,
          },
          renderedPrompt:
            'Summarize Q4 Results in a friendly tone for investors',
          promptVersion: {
            id: 'version-1',
            promptId: 'sales-summary',
            version: 1,
            provider: 'openai',
            model: 'gpt-4',
            template: 'Summarize {{topic}} in a {{tone}} tone for {{audience}}',
            variables: ['topic', 'tone', 'audience'],
            isActive: true,
            createdAt: new Date('2024-01-01'),
            metadata: {},
          },
        }),
      })

      const runResult = await adminClient.runPrompt('sales_summary', {
        topic: 'Q4 Results',
        tone: 'friendly',
        audience: 'investors',
      })

      expect(runResult.runId).toBe('run-123')
      expect(runResult.output).toContain('Q4 results')
      expect(runResult.tokenUsage.totalTokens).toBe(150)

      // Mock createFeedback response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'feedback-123',
          message: 'Feedback submitted successfully',
        }),
      })

      const feedbackResult = await publicClient.createFeedback({
        runId: runResult.runId,
        helpful: 'helpful',
        userFeedback: 'Great summary! Very clear and concise.',
      })

      expect(feedbackResult.id).toBe('feedback-123')
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it('should support segmented feedback workflow', async () => {
      const adminClient = new CobblAdminClient({ apiKey: 'test-key' })
      const publicClient = new CobblPublicClient()

      // Mock runPrompt response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          runId: 'run-123',
          output: 'AI generated response',
          tokenUsage: {
            promptTokens: 50,
            completionTokens: 100,
            totalTokens: 150,
          },
          renderedPrompt: 'Test prompt',
          promptVersion: {
            id: 'version-1',
            promptId: 'test',
            version: 1,
            provider: 'openai',
            model: 'gpt-4',
            template: 'Test',
            variables: [],
            isActive: true,
            createdAt: new Date('2024-01-01'),
            metadata: {},
          },
        }),
      })

      const runResult = await adminClient.runPrompt('test', {})

      // Step 1: Submit just thumbs down
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'feedback-123',
          message: 'Feedback created',
        }),
      })

      const feedbackResult = await publicClient.createFeedback({
        runId: runResult.runId,
        helpful: 'not_helpful',
      })

      expect(feedbackResult.id).toBe('feedback-123')

      // Step 2: Update with detailed feedback
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'feedback-123',
          message: 'Feedback updated',
        }),
      })

      const updateResult = await publicClient.updateFeedback(
        feedbackResult.id,
        {
          userFeedback: 'The response was too verbose and missed key points.',
        }
      )

      expect(updateResult.id).toBe('feedback-123')
      expect(mockFetch).toHaveBeenCalledTimes(3)
    })

    it('should handle error in runPrompt and not proceed to feedback', async () => {
      const adminClient = new CobblAdminClient({ apiKey: 'test-key' })

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({ error: 'Prompt not found' }),
      })

      await expect(
        adminClient.runPrompt('nonexistent-prompt', {})
      ).rejects.toThrow(CobblError)

      // Should not call createFeedback after error
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })
  })

  describe('error handling scenarios', () => {
    it('should handle multiple API errors gracefully', async () => {
      const adminClient = new CobblAdminClient({ apiKey: 'test-key' })

      // First call fails with 429
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        json: async () => ({
          error: 'Rate limit exceeded. Please try again later.',
        }),
      })

      try {
        await adminClient.runPrompt('test', {})
        fail('Should have thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(CobblError)
        expect((error as CobblError).code).toBe('RATE_LIMIT_EXCEEDED')
      }

      // Second call fails with 500
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ error: 'Internal server error' }),
      })

      try {
        await adminClient.runPrompt('test', {})
        fail('Should have thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(CobblError)
        expect((error as CobblError).code).toBe('SERVER_ERROR')
      }

      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it('should maintain state across multiple successful calls', async () => {
      const adminClient = new CobblAdminClient({ apiKey: 'test-key' })

      for (let i = 0; i < 3; i++) {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            runId: `run-${i}`,
            output: `Output ${i}`,
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

        const result = await adminClient.runPrompt('test', {})
        expect(result.runId).toBe(`run-${i}`)
      }

      expect(mockFetch).toHaveBeenCalledTimes(3)
    })
  })

  describe('exports', () => {
    it('should export CobblAdminClient', () => {
      expect(CobblAdminClient).toBeDefined()
      expect(typeof CobblAdminClient).toBe('function')
    })

    it('should export CobblPublicClient', () => {
      expect(CobblPublicClient).toBeDefined()
      expect(typeof CobblPublicClient).toBe('function')
    })

    it('should export CobblError', () => {
      expect(CobblError).toBeDefined()
      expect(typeof CobblError).toBe('function')
    })

    it('should be able to create instances of exported classes', () => {
      const adminClient = new CobblAdminClient({ apiKey: 'test' })
      const publicClient = new CobblPublicClient()
      const error = new CobblError('test', 'API_ERROR')

      expect(adminClient).toBeInstanceOf(CobblAdminClient)
      expect(publicClient).toBeInstanceOf(CobblPublicClient)
      expect(error).toBeInstanceOf(CobblError)
      expect(error).toBeInstanceOf(Error)
    })
  })

  describe('API URL configuration', () => {
    it('should use default URL when not configured', async () => {
      const adminClient = new CobblAdminClient({ apiKey: 'test-key' })

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

      await adminClient.runPrompt('test', {})

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.cobbl.ai/admin/v1/prompt/run',
        expect.any(Object)
      )
    })

    it('should use custom URL from environment', async () => {
      process.env.COBBL_API_URL = 'https://staging.cobbl.ai'
      const adminClient = new CobblAdminClient({ apiKey: 'test-key' })

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

      await adminClient.runPrompt('test', {})

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.cobbl.ai/admin/v1/prompt/run',
        expect.any(Object)
      )
    })
  })

  describe('type safety', () => {
    it('should enforce correct types for runPrompt input', async () => {
      const adminClient = new CobblAdminClient({ apiKey: 'test-key' })

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

      // Should accept various input types
      await adminClient.runPrompt('test', {
        string: 'value',
        number: 123,
        boolean: true,
        nested: { key: 'value' },
      })

      expect(mockFetch).toHaveBeenCalled()
    })

    it('should enforce correct types for feedback submission', async () => {
      const publicClient = new CobblPublicClient()

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'fb-123',
          message: 'Success',
        }),
      })

      // Should accept 'helpful' or 'not_helpful'
      await publicClient.createFeedback({
        runId: 'run-123',
        helpful: 'helpful',
        userFeedback: 'Great!',
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'fb-124',
          message: 'Success',
        }),
      })

      // Should accept partial feedback (just helpful)
      await publicClient.createFeedback({
        runId: 'run-124',
        helpful: 'not_helpful',
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'fb-125',
          message: 'Success',
        }),
      })

      // Should accept partial feedback (just userFeedback)
      await publicClient.createFeedback({
        runId: 'run-125',
        userFeedback: 'Needs improvement',
      })

      expect(mockFetch).toHaveBeenCalledTimes(3)
    })
  })
})
