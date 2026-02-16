/**
 * Cobbl SDK - Admin API Client
 *
 * A client for admin/server-side operations like running prompts.
 * Use this in server-side contexts where you need to execute prompts.
 *
 * @example
 * ```typescript
 * import { CobblAdminClient } from '@cobbl-ai/sdk/admin'
 *
 * const client = new CobblAdminClient({
 *   apiKey: process.env.COBBL_API_KEY
 * })
 *
 * // Run a prompt
 * const result = await client.runPrompt('sales_summary', {
 *   topic: 'Q4 Results',
 *   tone: 'friendly'
 * })
 *
 * console.log(result.output)
 * console.log(result.runId) // Use this to link feedback later
 * ```
 */

import type { PromptInput, PromptVersionClient } from './types'
import type { CobblConfig, RunPromptResponse, TokenUsage } from './types'
import { CobblError, handleErrorResponse } from './errors'

const REQUEST_TIMEOUT_MS = 30_000

/**
 * Admin API Client for Cobbl
 *
 * Provides methods to run prompts via the admin API.
 * This client is suitable for use in server-side contexts.
 */
export class CobblAdminClient {
  private readonly apiKey: string
  private readonly baseUrl: string

  /**
   * Initialize the Cobbl Admin SDK client
   *
   * @param config - Configuration object
   * @param config.apiKey - Your Cobbl API key
   * @param config.baseUrl - Optional base URL for the API (defaults to 'https://api.cobbl.ai')
   *
   * @example Production (uses default URL)
   * ```typescript
   * const client = new CobblAdminClient({
   *   apiKey: process.env.COBBL_API_KEY
   * })
   * ```
   *
   * @example Local development with Firebase emulators
   * ```typescript
   * const client = new CobblAdminClient({
   *   apiKey: process.env.COBBL_API_KEY,
   *   baseUrl: 'http://localhost:5001/your-project-id/us-central1/externalApi'
   * })
   * ```
   */
  constructor(config: CobblConfig) {
    if (!config.apiKey || config.apiKey.trim().length === 0) {
      throw new CobblError('API key is required', 'INVALID_CONFIG')
    }

    this.apiKey = config.apiKey
    this.baseUrl = config.baseUrl?.trim() || 'https://api.cobbl.ai'
  }

  /**
   * Execute a prompt with the given input variables
   *
   * @param promptSlug - The unique slug identifier for the prompt
   * @param input - Input variables to populate the prompt template
   * @returns Promise containing the prompt execution results
   *
   * @throws {CobblError} When the request fails or API returns an error
   *
   * @example
   * ```typescript
   * const result = await client.runPrompt('sales_summary', {
   *   topic: 'Q4 Results',
   *   tone: 'friendly',
   *   audience: 'investors'
   * })
   *
   * console.log(result.output) // AI-generated response
   * console.log(result.runId) // Save this to link feedback later
   * ```
   */
  async runPrompt(
    promptSlug: string,
    input: PromptInput
  ): Promise<RunPromptResponse> {
    if (!promptSlug || promptSlug.trim().length === 0) {
      throw new CobblError('promptSlug is required', 'INVALID_REQUEST')
    }

    try {
      const response = await this.makeRequest('/admin/v1/prompt/run', {
        method: 'POST',
        body: JSON.stringify({
          promptSlug: promptSlug.trim(),
          input,
        }),
      })

      if (!response.ok) {
        await handleErrorResponse(response)
      }

      const data = (await response.json()) as {
        runId: string
        output: string
        tokenUsage: TokenUsage
        renderedPrompt: string
        promptVersion: PromptVersionClient
      }

      return {
        runId: data.runId,
        output: data.output,
        tokenUsage: data.tokenUsage,
        renderedPrompt: data.renderedPrompt,
        promptVersion: data.promptVersion,
      }
    } catch (error) {
      if (error instanceof CobblError) {
        throw error
      }
      throw new CobblError(
        `Failed to run prompt: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'NETWORK_ERROR'
      )
    }
  }

  /**
   * Make an HTTP request to the Cobbl API
   * @private
   */
  private async makeRequest(
    path: string,
    options: RequestInit
  ): Promise<Response> {
    const url = `${this.baseUrl}${path}`

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
          ...options.headers,
        },
        signal: controller.signal,
      })

      return response
    } finally {
      clearTimeout(timeoutId)
    }
  }
}

// Export the client
export { CobblError } from './errors'
export type { CobblErrorCode } from './errors'
export type {
  CobblConfig,
  TokenUsage,
  RunPromptRequest,
  RunPromptResponse,
  PromptInput,
  PromptVersionClient,
  Provider,
  VariableConfig,
} from './types'
