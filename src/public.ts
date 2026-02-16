/**
 * Cobbl SDK - Public API Client
 *
 * A lightweight client for public-facing feedback operations.
 * Use this in client-side or user-facing contexts.
 * No authentication required - designed for end-user feedback submission.
 *
 * @example
 * ```typescript
 * import { CobblPublicClient } from '@cobbl-ai/sdk/public'
 *
 * const client = new CobblPublicClient({
 *   baseUrl: 'https://api.cobbl.ai' // Optional, defaults to production
 * })
 *
 * // Submit feedback
 * const { id } = await client.createFeedback({
 *   runId: 'run_abc123',
 *   helpful: 'not_helpful'
 * })
 *
 * // Update feedback with details later
 * await client.updateFeedback(id, {
 *   userFeedback: 'Too formal'
 * })
 * ```
 */

import type {
  CreateFeedbackRequest,
  CreateFeedbackResponse,
  UpdateFeedbackRequest,
  UpdateFeedbackResponse,
} from './types'
import { CobblError, handleErrorResponse } from './errors'
import { validateCreateFeedback, validateUpdateFeedback } from './validation'

/**
 * Configuration options for CobblPublicClient
 */
export interface CobblPublicConfig {
  /**
   * Base URL for the API
   * @optional
   * @default 'https://api.cobbl.ai'
   * @internal
   * @example 'http://localhost:5001/your-project/us-central1/externalApi' // For local development
   */
  baseUrl?: string
}

const REQUEST_TIMEOUT_MS = 30_000

/**
 * Public API Client for Cobbl
 *
 * Provides methods to submit and update feedback via the public API.
 * This client is suitable for use in client-side or user-facing contexts.
 * No authentication required - designed for end-user feedback submission.
 */
export class CobblPublicClient {
  private readonly baseUrl: string

  /**
   * Initialize the Cobbl Public SDK client
   *
   * @param config - Configuration object
   * @param config.baseUrl - Optional base URL for the API (defaults to 'https://api.cobbl.ai')
   */
  constructor(config: CobblPublicConfig = {}) {
    this.baseUrl = config.baseUrl?.trim() || 'https://api.cobbl.ai'
  }

  /**
   * Create user feedback for a prompt run
   * Supports segmented feedback - you can provide just helpful, just userFeedback, or both
   * Use updateFeedback to add additional data later
   *
   * @param feedback - Feedback submission data
   * @param feedback.runId - The run ID from a previous runPrompt call
   * @param feedback.helpful - Whether the output was helpful ('helpful' or 'not_helpful') - optional
   * @param feedback.userFeedback - Detailed feedback message from the user - optional
   * @returns Promise containing the created feedback ID
   *
   * @throws {CobblError} When the request fails or API returns an error
   *
   * @example Submit just thumbs down first
   * ```typescript
   * const { id } = await client.createFeedback({
   *   runId: result.runId,
   *   helpful: 'not_helpful'
   * })
   * // Later, add details
   * await client.updateFeedback(id, {
   *   userFeedback: 'The response was too formal and lengthy'
   * })
   * ```
   *
   * @example Submit both at once
   * ```typescript
   * await client.createFeedback({
   *   runId: result.runId,
   *   helpful: 'not_helpful',
   *   userFeedback: 'The response was too formal and lengthy'
   * })
   * ```
   */
  async createFeedback(
    feedback: CreateFeedbackRequest
  ): Promise<CreateFeedbackResponse> {
    const validationError = validateCreateFeedback(feedback)
    if (validationError) {
      throw new CobblError(validationError, 'INVALID_REQUEST')
    }

    try {
      // Build request body with only provided fields
      const body: CreateFeedbackRequest = {
        runId: feedback.runId.trim(),
        helpful: feedback.helpful,
        userFeedback: feedback.userFeedback?.trim(),
      }

      const response = await this.makeRequest('/public/v1/feedback', {
        method: 'POST',
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        await handleErrorResponse(response)
      }

      const data = (await response.json()) as {
        id: string
        message: string
      }

      return {
        id: data.id,
        message: data.message,
      }
    } catch (error) {
      if (error instanceof CobblError) {
        throw error
      }
      throw new CobblError(
        `Failed to create feedback: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'NETWORK_ERROR'
      )
    }
  }

  /**
   * Update existing feedback with additional data
   * Use this to add helpful sentiment or detailed feedback after initial submission
   *
   * @param id - The ID returned from createFeedback
   * @param update - The data to update
   * @param update.helpful - Whether the output was helpful ('helpful' or 'not_helpful') - optional
   * @param update.userFeedback - Detailed feedback message from the user - optional
   * @returns Promise containing the updated feedback ID
   *
   * @throws {CobblError} When the request fails or API returns an error
   *
   * @example Add details after initial thumbs down
   * ```typescript
   * // First, submit just the rating
   * const { id } = await client.createFeedback({
   *   runId: result.runId,
   *   helpful: 'not_helpful'
   * })
   *
   * // Later, add detailed feedback
   * await client.updateFeedback(id, {
   *   userFeedback: 'The response was too formal and lengthy'
   * })
   * ```
   */
  async updateFeedback(
    id: string,
    update: UpdateFeedbackRequest
  ): Promise<UpdateFeedbackResponse> {
    if (!id || id.trim().length === 0) {
      throw new CobblError('id is required', 'INVALID_REQUEST')
    }

    const validationError = validateUpdateFeedback(update)
    if (validationError) {
      throw new CobblError(validationError, 'INVALID_REQUEST')
    }

    try {
      // Build request body with only provided fields
      const body: UpdateFeedbackRequest = {
        helpful: update.helpful,
        userFeedback: update.userFeedback?.trim(),
      }

      const response = await this.makeRequest(
        `/public/v1/feedback/${id.trim()}`,
        {
          method: 'PATCH',
          body: JSON.stringify(body),
        }
      )

      if (!response.ok) {
        await handleErrorResponse(response)
      }

      const data = (await response.json()) as {
        id: string
        message: string
      }

      return {
        id: data.id,
        message: data.message,
      }
    } catch (error) {
      if (error instanceof CobblError) {
        throw error
      }
      throw new CobblError(
        `Failed to update feedback: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
  CreateFeedbackRequest,
  CreateFeedbackResponse,
  UpdateFeedbackRequest,
  UpdateFeedbackResponse,
  Helpful,
} from './types'
