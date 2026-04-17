export type ApiSuccess<T> = { success: true; data: T }
export type ApiError = { success: false; error: string }
export type ApiResponse<T> = ApiSuccess<T> | ApiError

export type AttemptStreamEvent =
  | { type: 'chunk'; text: string }
  | {
      type: 'judge'
      score: number
      feedback: string
      strengths: string[]
      improvements: string[]
      techniqueFocus: string
      shouldShowPopup: boolean
      attemptNumber: number
    }
  | { type: 'done'; attemptNumber: number }
  | { type: 'error'; message: string; partialResponse?: string }
