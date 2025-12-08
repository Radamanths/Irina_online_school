-- Add quiz timer fields
ALTER TABLE "Quiz"
ADD COLUMN "timeLimitSeconds" INTEGER;

ALTER TABLE "QuizSubmission"
ADD COLUMN "elapsedSeconds" INTEGER;
