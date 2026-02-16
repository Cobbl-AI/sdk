/**
 * Type definitions for the Cobbl SDK
 *
 * All types are defined locally to keep the SDK self-contained.
 * These match the API contract and are used as type hints for SDK consumers.
 */


// ─── SDK Config ──────────────────────────────────────────────

/**
 * Configuration options for the CobblClient
 */
export interface CobblConfig {
  /**
   * Your Cobbl API key
   * @required
   */
  apiKey: string

  /**
   * Base URL for the API
   * @optional
   * @default 'https://api.cobbl.ai'
   * @internal
   * @example 'http://localhost:5001/your-project/us-central1/externalApi' // For local development
   */
  baseUrl?: string
}

// ─── Feedback Types ──────────────────────────────────────────

/**
 * Whether the AI output was helpful
 */
export type Helpful = 'helpful' | 'not_helpful'

/**
 * Request payload for creating feedback
 * Supports segmented feedback submission - at least one of helpful or userFeedback required
 */
export interface CreateFeedbackRequest {
  runId: string
  helpful?: Helpful
  userFeedback?: string
}

/**
 * Response from creating feedback
 */
export interface CreateFeedbackResponse {
  id: string
  message: string
}

/**
 * Request payload for updating feedback
 * At least one of helpful or userFeedback required
 */
export interface UpdateFeedbackRequest {
  helpful?: Helpful
  userFeedback?: string
}

/**
 * Response from updating feedback
 */
export interface UpdateFeedbackResponse {
  id: string
  message: string
}

// ─── Prompt Types ────────────────────────────────────────────

/**
 * Supported LLM providers
 */
export type Provider = 'openai' | 'anthropic' | 'google'

/**
 * Configuration for a variable in the prompt
 */
export interface VariableConfig {
  key: string
  type: 'string' | 'number' | 'boolean' | 'list' | 'object'
  required: boolean
  description?: string
}

/**
 * Input values provided when executing a prompt
 */
export type PromptInput = Record<
  string,
  string | number | boolean | unknown[] | Record<string, unknown>
>

// ─── Token Usage ─────────────────────────────────────────────

/**
 * Token usage breakdown for a completed prompt run
 */
export interface TokenUsage {
  inputTokens: number
  outputTokens: number
  totalTokens: number
}

// ─── Analytics ───────────────────────────────────────────────

/**
 * Aggregated analytics for a prompt or prompt version
 */
export interface PromptAggregatedAnalytics {
  runs: {
    totalCount: number
    successCount: number
    errorCount: number
    totalProviderMs: number
    totalRequestMs: number
    successRate: number
    errorRate: number
    avgProviderMs: number
    avgRequestMs: number
  }
  feedback: {
    totalCount: number
    helpfulCount: number
    notHelpfulCount: number
    helpfulRate: number
  }
}

// ─── Prompt Version ──────────────────────────────────────────

/**
 * Base fields shared across all prompt version sources
 */
interface PromptVersionBase {
  id: string
  schemaVersion: number
  createdAt: Date
  updatedAt: Date
  tenantId: string
  environmentId: string
  promptId: string
  versionNumber: number
  template: string
  variables: VariableConfig[]
  provider: Provider
  model: string
  status: 'draft' | 'active' | 'inactive'
  parentVersionId: string | null
  analytics: PromptAggregatedAnalytics
  publishedAt: Date | null
}

/**
 * Manually created prompt version (by a user or from feedback edits)
 */
interface PromptVersionManual extends PromptVersionBase {
  source: 'manual'
  authorId: string
  authorName: string | null
}

/**
 * AI-generated prompt version suggestion from feedback issue assessment
 */
interface PromptVersionIssueLlmSuggestion extends PromptVersionBase {
  source: 'issue_llm_suggestion'
}

/**
 * Prompt version - discriminated union by source
 */
export type PromptVersionClient =
  | PromptVersionManual
  | PromptVersionIssueLlmSuggestion

// ─── API Request/Response Types ──────────────────────────────

/**
 * Request payload for running a prompt
 */
export interface RunPromptRequest {
  promptSlug: string
  input: PromptInput
}

/**
 * Response from running a prompt
 */
export interface RunPromptResponse {
  runId: string
  output: string
  tokenUsage: TokenUsage
  renderedPrompt: string
  promptVersion: PromptVersionClient
}