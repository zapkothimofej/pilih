// Single source of truth for the judge/rubric types. Previously
// declared in three places (lib/ai/judge-ai.ts, ChatInterface.tsx,
// JudgeFeedbackPopup.tsx) with the fields subtly reordered between
// them, which drifted the SSE payload shape. Components and the
// server import from here.

export type JudgeDimensions = {
  specificity: number
  context: number
  role: number
  format: number
  constraints: number
  reasoning: number
}

export type JudgeFeedback = {
  score: number
  dimensions: JudgeDimensions
  feedback: string
  strengths: string[]
  improvements: string[]
  techniqueFocus: string
}

export type JudgeStreamEvent = JudgeFeedback & {
  shouldShowPopup: boolean
  attemptNumber: number
}
