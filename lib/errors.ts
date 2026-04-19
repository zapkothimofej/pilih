// Domain error classes so transaction flow-control doesn't rely on
// string-compare on err.message. Any wrapper that preserves the
// instanceof chain (e.g. `throw new AlreadyApprovedError({ cause: e })`)
// stays correctly classified; stringly-typed control flow broke the
// moment a future wrapper prefixed the message.

export class AlreadyApprovedError extends Error {
  constructor() {
    super('FinalSubmission is already APPROVED')
    this.name = 'AlreadyApprovedError'
  }
}

export class ChallengeNotFoundError extends Error {
  constructor() {
    super('Challenge not found')
    this.name = 'ChallengeNotFoundError'
  }
}
