import type {
  CreateFeedbackRequest,
  UpdateFeedbackRequest,
  Helpful,
} from './types'

const VALID_HELPFUL_VALUES: Helpful[] = ['helpful', 'not_helpful']

export function validateCreateFeedback(
  feedback: CreateFeedbackRequest
): string | null {
  if (!feedback.runId || feedback.runId.trim().length === 0) {
    return 'runId is required'
  }
  if (
    feedback.helpful !== undefined &&
    !VALID_HELPFUL_VALUES.includes(feedback.helpful)
  ) {
    return 'helpful must be "helpful" or "not_helpful"'
  }
  if (
    feedback.userFeedback !== undefined &&
    feedback.userFeedback.trim().length === 0
  ) {
    return 'userFeedback cannot be empty'
  }
  if (feedback.helpful === undefined && feedback.userFeedback === undefined) {
    return 'At least one of helpful or userFeedback is required'
  }
  return null
}

export function validateUpdateFeedback(
  update: UpdateFeedbackRequest
): string | null {
  if (
    update.helpful !== undefined &&
    !VALID_HELPFUL_VALUES.includes(update.helpful)
  ) {
    return 'helpful must be "helpful" or "not_helpful"'
  }
  if (
    update.userFeedback !== undefined &&
    update.userFeedback.trim().length === 0
  ) {
    return 'userFeedback cannot be empty'
  }
  if (update.helpful === undefined && update.userFeedback === undefined) {
    return 'At least one of helpful or userFeedback is required'
  }
  return null
}
