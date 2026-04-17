-- Drop old RESTRICT FK constraints (those that need CASCADE)
ALTER TABLE "OnboardingProfile" DROP CONSTRAINT "OnboardingProfile_userId_fkey";
ALTER TABLE "Challenge" DROP CONSTRAINT "Challenge_userId_fkey";
ALTER TABLE "DailySession" DROP CONSTRAINT "DailySession_userId_fkey";
ALTER TABLE "PromptAttempt" DROP CONSTRAINT "PromptAttempt_sessionId_fkey";
ALTER TABLE "PromptAttempt" DROP CONSTRAINT "PromptAttempt_userId_fkey";
ALTER TABLE "FinalSubmission" DROP CONSTRAINT "FinalSubmission_userId_fkey";
ALTER TABLE "Certificate" DROP CONSTRAINT "Certificate_userId_fkey";
ALTER TABLE "Booking" DROP CONSTRAINT "Booking_userId_fkey";

-- Re-add with ON DELETE CASCADE
ALTER TABLE "OnboardingProfile" ADD CONSTRAINT "OnboardingProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Challenge" ADD CONSTRAINT "Challenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DailySession" ADD CONSTRAINT "DailySession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PromptAttempt" ADD CONSTRAINT "PromptAttempt_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "DailySession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PromptAttempt" ADD CONSTRAINT "PromptAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FinalSubmission" ADD CONSTRAINT "FinalSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add missing unique indexes
CREATE UNIQUE INDEX "DailySession_userId_dayNumber_key" ON "DailySession"("userId", "dayNumber");
CREATE UNIQUE INDEX "PromptAttempt_sessionId_attemptNumber_key" ON "PromptAttempt"("sessionId", "attemptNumber");
