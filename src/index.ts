/**
 * Cobbl SDK
 *
 * A lightweight SDK for interacting with the Cobbl platform.
 *
 * For namespaced imports, use:
 * - `@cobbl-ai/sdk/admin` for admin operations (runPrompt)
 * - `@cobbl-ai/sdk/public` for public operations (createFeedback, updateFeedback)
 *
 * @example Admin operations
 * ```typescript
 * import { CobblAdminClient } from '@cobbl-ai/sdk/admin'
 *
 * const client = new CobblAdminClient({
 *   apiKey: process.env.COBBL_API_KEY
 * })
 *
 * const result = await client.runPrompt('sales_summary', {
 *   topic: 'Q4 Results',
 *   tone: 'friendly'
 * })
 * ```
 *
 * @example Public operations
 * ```typescript
 * import { CobblPublicClient } from '@cobbl-ai/sdk/public'
 *
 * const client = new CobblPublicClient({
 *   apiKey: process.env.COBBL_API_KEY
 * })
 *
 * const { id } = await client.createFeedback({
 *   runId: result.runId,
 *   helpful: 'not_helpful'
 * })
 *
 * await client.updateFeedback(id, {
 *   userFeedback: 'Too formal'
 * })
 * ```
 */

// Export admin client
export { CobblAdminClient } from './admin'

// Export public client
export { CobblPublicClient } from './public'

// Export errors
export { CobblError } from './errors'
export type { CobblErrorCode } from './errors'

// Export all types
export type {
  CobblConfig,
  TokenUsage,
  RunPromptRequest,
  RunPromptResponse,
  CreateFeedbackRequest,
  CreateFeedbackResponse,
  UpdateFeedbackRequest,
  UpdateFeedbackResponse,
  Helpful,
  PromptInput,
  PromptVersionClient,
  Provider,
  VariableConfig,
} from './types'
