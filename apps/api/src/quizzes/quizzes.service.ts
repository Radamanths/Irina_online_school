import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import type { SupportedLocale } from "../courses/courses.data";
import { SubmitQuizAttemptDto } from "./dto/submit-quiz.dto";
import { EnrollmentAccessService } from "../enrollments/enrollments.service";

export type QuizQuestionType = "single" | "multiple";

export interface QuizDetailResponse {
  id: string;
  lessonId: string;
  passScore: number;
  attemptsLimit: number | null;
  timeLimitSeconds: number | null;
  questions: Array<{
    id: string;
    prompt: string;
    type: QuizQuestionType;
    options: Array<{ id: string; label: string }>;
    explanation?: string;
  }>;
}

export interface QuizSubmissionAnswer {
  questionId: string;
  selectedOptionIds: string[];
  correctOptionIds: string[];
  isCorrect: boolean;
}

export interface QuizSubmissionResponse {
  id: string;
  quizId: string;
  userId: string;
  score: number;
  passed: boolean;
  elapsedSeconds: number | null;
  submittedAt: Date;
  answers: QuizSubmissionAnswer[];
}

interface NormalizedQuizOption {
  id: string;
  label: string;
  isCorrect: boolean;
}

interface NormalizedQuizQuestion {
  id: string;
  prompt: string;
  type: QuizQuestionType;
  options: NormalizedQuizOption[];
  explanation?: string;
}

@Injectable()
export class QuizzesService {
  private readonly logger = new Logger(QuizzesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly enrollmentAccessService: EnrollmentAccessService
  ) {}

  async getQuiz(quizId: string, userId: string, locale?: string): Promise<QuizDetailResponse | null> {
    const resolvedLocale = this.normalizeLocale(locale);
    const delegate = (this.prisma as PrismaService & { quiz?: Prisma.QuizDelegate }).quiz;
    if (!delegate) {
      return null;
    }

    const quiz = await delegate.findUnique({
      where: { id: quizId },
      include: { lesson: { select: { id: true } } }
    });

    if (!quiz) {
      return null;
    }

    await this.enrollmentAccessService.assertLessonAccess(userId, quiz.lessonId);

    const questions = this.parseQuestions(quiz.questions, resolvedLocale);
    return {
      id: quiz.id,
      lessonId: quiz.lessonId,
      passScore: quiz.passScore,
      attemptsLimit: quiz.attemptsLimit ?? null,
      timeLimitSeconds: quiz.timeLimitSeconds ?? null,
      questions: questions.map(question => ({
        id: question.id,
        prompt: question.prompt,
        type: question.type,
        options: question.options.map(option => ({ id: option.id, label: option.label })),
        explanation: question.explanation
      }))
    };
  }

  async listSubmissions(quizId: string, userId: string): Promise<QuizSubmissionResponse[]> {
    if (!quizId || !userId) {
      return [];
    }

    await this.assertUserCanAccessQuiz(quizId, userId);

    const delegate = (this.prisma as PrismaService & { quizSubmission?: Prisma.QuizSubmissionDelegate }).quizSubmission;
    if (!delegate) {
      return [];
    }

    const submissions = await delegate.findMany({
      where: { quizId, userId },
      orderBy: { submittedAt: "desc" }
    });

    return submissions.map(submission => this.mapSubmission(submission));
  }

  async submitAttempt(quizId: string, dto: SubmitQuizAttemptDto, locale?: string): Promise<QuizSubmissionResponse> {
    const resolvedLocale = this.normalizeLocale(locale);
    const quizDelegate = (this.prisma as PrismaService & { quiz?: Prisma.QuizDelegate }).quiz;
    if (!quizDelegate) {
      throw new Error("Quiz delegate is unavailable. Run prisma generate.");
    }

    const quiz = await quizDelegate.findUnique({
      where: { id: quizId },
      include: { lesson: { select: { id: true } } }
    });

    if (!quiz) {
      throw new NotFoundException(`Quiz ${quizId} not found`);
    }

    await this.enrollmentAccessService.assertLessonAccess(dto.userId, quiz.lessonId);

    const questions = this.parseQuestions(quiz.questions, resolvedLocale);
    if (!questions.length) {
      throw new BadRequestException("Quiz is not configured yet");
    }

    await this.ensureAttemptCapacity(quiz.id, dto.userId, quiz.attemptsLimit ?? null);

    const enforcedLimit = typeof quiz.timeLimitSeconds === "number" && quiz.timeLimitSeconds > 0 ? quiz.timeLimitSeconds : null;
    const elapsedSeconds = this.normalizeElapsedSeconds(dto.elapsedSeconds);
    if (enforcedLimit !== null) {
      if (elapsedSeconds === null) {
        throw new BadRequestException("elapsedSeconds is required for timed quizzes");
      }
      if (elapsedSeconds > enforcedLimit) {
        throw new BadRequestException("Quiz time limit exceeded");
      }
    }

    const evaluation = this.evaluateSubmission(questions, dto.answers, quiz.passScore);
    const submissionDelegate = (this.prisma as PrismaService & { quizSubmission?: Prisma.QuizSubmissionDelegate }).quizSubmission;
    if (!submissionDelegate) {
      throw new Error("QuizSubmission delegate is unavailable. Run prisma generate.");
    }

    const answersPayload = evaluation.answers.map(answer => ({
      questionId: answer.questionId,
      selectedOptionIds: answer.selectedOptionIds,
      correctOptionIds: answer.correctOptionIds,
      isCorrect: answer.isCorrect
    }));

    const submission = await submissionDelegate.create({
      data: {
        quizId: quiz.id,
        userId: dto.userId,
        score: evaluation.score,
        passed: evaluation.passed,
        answers: answersPayload as Prisma.InputJsonValue,
        elapsedSeconds
      }
    });

    if (evaluation.passed) {
      await this.markLessonCompleted(dto.userId, quiz.lessonId);
    }

    return this.mapSubmission(submission);
  }

  private async ensureAttemptCapacity(quizId: string, userId: string, limit: number | null) {
    if (!limit || limit <= 0) {
      return;
    }

    const delegate = (this.prisma as PrismaService & { quizSubmission?: Prisma.QuizSubmissionDelegate }).quizSubmission;
    if (!delegate) {
      throw new Error("QuizSubmission delegate is unavailable. Run prisma generate.");
    }

    const attempts = await delegate.count({ where: { quizId, userId } });
    if (attempts >= limit) {
      throw new BadRequestException("All quiz attempts have been used");
    }
  }

  private async markLessonCompleted(userId: string, lessonId: string) {
    const delegate = (this.prisma as PrismaService & { lessonProgress?: Prisma.LessonProgressDelegate }).lessonProgress;
    if (!delegate) {
      this.logger.warn("LessonProgress delegate missing; unable to update progress after quiz pass");
      return;
    }

    await delegate.upsert({
      where: { userId_lessonId: { userId, lessonId } },
      create: { userId, lessonId, status: "completed" },
      update: { status: "completed" }
    });
  }

  private evaluateSubmission(
    questions: NormalizedQuizQuestion[],
    answers: SubmitQuizAttemptDto["answers"],
    passScore: number
  ): { score: number; passed: boolean; answers: QuizSubmissionAnswer[] } {
    const evaluations: QuizSubmissionAnswer[] = questions.map(question => {
      const answer = answers.find(entry => entry.questionId === question.id);
      const allowedOptions = new Set(question.options.map(option => option.id));
      const selectedValues = (answer?.selectedOptionIds ?? []).filter(id => allowedOptions.has(id));
      const selected = new Set(selectedValues);
      const correct = new Set(question.options.filter(option => option.isCorrect).map(option => option.id));
      const isCorrect = selected.size === correct.size && [...selected].every(id => correct.has(id));
      return {
        questionId: question.id,
        selectedOptionIds: [...selected],
        correctOptionIds: [...correct],
        isCorrect
      };
    });

    const correctCount = evaluations.filter(entry => entry.isCorrect).length;
    const score = Math.round((correctCount / questions.length) * 100);
    return {
      score,
      passed: score >= passScore,
      answers: evaluations
    };
  }

  private parseQuestions(payload: Prisma.JsonValue, locale: SupportedLocale): NormalizedQuizQuestion[] {
    if (!Array.isArray(payload)) {
      return [];
    }

    const entries = payload as Prisma.JsonValue[];

    return entries
      .map((entry, index) => this.parseQuestion(entry, locale, index))
      .filter((question): question is NormalizedQuizQuestion => Boolean(question));
  }

  private parseQuestion(
    entry: Prisma.JsonValue,
    locale: SupportedLocale,
    index: number
  ): NormalizedQuizQuestion | null {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
      return null;
    }

    const safeEntry = entry as Record<string, unknown>;
    const id = typeof safeEntry.id === "string" && safeEntry.id.trim() ? safeEntry.id : `question-${index + 1}`;
    const prompt = this.pickLocalized(safeEntry.prompt, locale);
    const explanation = this.pickLocalized(safeEntry.explanation, locale) || undefined;
    const type = safeEntry.type === "multiple" ? "multiple" : "single";
    const rawOptions = Array.isArray(safeEntry.options)
      ? (safeEntry.options as Prisma.JsonValue[])
      : [];
    const options = rawOptions
      .map((option, optionIndex) => this.parseOption(option, locale, optionIndex))
      .filter((option): option is NormalizedQuizOption => Boolean(option));

    if (!prompt || options.length < 2) {
      return null;
    }

    const hasCorrect = options.some(option => option.isCorrect);
    if (!hasCorrect) {
      return null;
    }

    return { id, prompt, type, options, explanation };
  }

  private parseOption(
    entry: Prisma.JsonValue,
    locale: SupportedLocale,
    index: number
  ): NormalizedQuizOption | null {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
      return null;
    }

    const safeEntry = entry as Record<string, unknown>;
    const id = typeof safeEntry.id === "string" && safeEntry.id.trim() ? safeEntry.id : `option-${index + 1}`;
    const label = this.pickLocalized(safeEntry.label, locale);
    const isCorrect = Boolean(safeEntry.isCorrect);
    if (!label) {
      return null;
    }

    return { id, label, isCorrect };
  }

  private pickLocalized(value: unknown, locale: SupportedLocale): string {
    if (!value) {
      return "";
    }

    if (typeof value === "string") {
      return value.trim();
    }

    if (typeof value === "object") {
      const record = value as { ru?: string | null; en?: string | null };
      const ru = record.ru?.trim();
      const en = record.en?.trim();
      return locale === "en" ? en || ru || "" : ru || en || "";
    }

    return "";
  }

  private normalizeLocale(locale?: string): SupportedLocale {
    return locale === "en" ? "en" : "ru";
  }

  private mapSubmission(
    submission: Prisma.QuizSubmissionGetPayload<{ select: { id: true; quizId: true; userId: true; score: true; passed: true; elapsedSeconds: true; submittedAt: true; answers: true } }>
  ): QuizSubmissionResponse {
    return {
      id: submission.id,
      quizId: submission.quizId,
      userId: submission.userId,
      score: submission.score,
      passed: submission.passed,
      elapsedSeconds: submission.elapsedSeconds ?? null,
      submittedAt: submission.submittedAt,
      answers: this.normalizeStoredAnswers(submission.answers)
    };
  }

  private normalizeStoredAnswers(payload: Prisma.JsonValue): QuizSubmissionAnswer[] {
    if (!Array.isArray(payload)) {
      return [];
    }

    return payload
      .map(entry => {
        if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
          return null;
        }
        const safeEntry = entry as Record<string, unknown>;
        const questionId = typeof safeEntry.questionId === "string" ? safeEntry.questionId : undefined;
        const selectedOptionIds = Array.isArray(safeEntry.selectedOptionIds)
          ? safeEntry.selectedOptionIds.filter(id => typeof id === "string")
          : [];
        const correctOptionIds = Array.isArray(safeEntry.correctOptionIds)
          ? safeEntry.correctOptionIds.filter(id => typeof id === "string")
          : [];
        const isCorrect = Boolean(safeEntry.isCorrect);
        if (!questionId) {
          return null;
        }
        return { questionId, selectedOptionIds, correctOptionIds, isCorrect };
      })
      .filter((entry): entry is QuizSubmissionAnswer => Boolean(entry));
  }

  private normalizeElapsedSeconds(value: unknown): number | null {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      return null;
    }
    if (value <= 0) {
      return 0;
    }
    return Math.floor(value);
  }

  private async assertUserCanAccessQuiz(quizId: string, userId: string) {
    const delegate = (this.prisma as PrismaService & { quiz?: Prisma.QuizDelegate }).quiz;
    if (!delegate) {
      throw new Error("Quiz delegate is unavailable. Run prisma generate.");
    }

    const quiz = await delegate.findUnique({
      where: { id: quizId },
      select: { lessonId: true }
    });

    if (!quiz) {
      throw new NotFoundException(`Quiz ${quizId} not found`);
    }

    await this.enrollmentAccessService.assertLessonAccess(userId, quiz.lessonId);
  }
}
