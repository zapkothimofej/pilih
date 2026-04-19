---
title: Stream Lifecycle (Attempt Route)
type: concept
---

# Stream Lifecycle

`app/api/challenges/[id]/attempt/route.ts` streams a Haiku response while running a Sonnet judge in parallel. Four races had to be neutralised.

## 1. Controller close ↔ enqueue

The abort listener used to call `controller.close()` directly. If the `for await` loop was mid-enqueue, that throws `TypeError: Invalid state`. Fix: a `closed` module-scope flag + `safeEnqueue` helper that swallows write-after-close throws.

## 2. Judge-fails-after-stream-succeeded

Haiku streams 200 tokens to the client, judge then fails on both retries. Used to enqueue `{type:'error'}` — the client kept the assistant bubble (since `assistantContent.length > 0`) but the DB held no row. Next attempt's history rebuild mismatched what the user saw on screen.

Fix: server emits `{type:'error', dropAssistant: true}`. Client force-strips the bubble regardless of content. Now the UI and the DB agree.

## 3. Haiku-stream-throws-while-judge-runs

Used to let Sonnet run to completion, billing tokens no one reads. Fix: `judgePromise.catch` aborts `judgeAbort.abort()` on any internal throw.

## 4. attemptNumber count+1 collision

Computing `attemptNumber = count + 1` infinite-P2002's when an admin hard-deletes a row: count shrinks, remaining rows' numbers stay, count+1 collides forever. Fix: `const max = await prisma.promptAttempt.aggregate({ _max: { attemptNumber: true } })` → `const next = (max._max.attemptNumber ?? 0) + 1`. Always finds a free slot.

## 5. Client-disconnect persistence

When the user closes the tab AFTER Haiku + Sonnet have both produced output, we persist the attempt anyway. The LLM tokens already cost money; losing the row to an abort means the user's progress + rate-limit count vanish with no record. Only drop when `fullResponse.length === 0` (nothing useful happened).

## Chat history rebuild

Loaded server-side from `PromptAttempt` by `sessionId`, ordered by `attemptNumber`. See [[prompt-injection]] for why client-supplied history is refused.

## Related

- [[prompt-injection]] — history trust boundary
- [[judge-ai]] — parallel judge
- [[data-integrity]] — `@@unique([sessionId, attemptNumber])`
- [[reduced-motion]] — streaming indicator during the wait
