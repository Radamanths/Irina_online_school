"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { TranslationShape } from "../lib/i18n.config";
import type { QuizAnswerInput, QuizDetail, QuizSubmission } from "../lib/types";

type FocusReminder = "tip" | "active" | "lost" | "tabHidden";

interface LessonQuizClientProps {
  locale: string;
  quiz: QuizDetail;
  submissions: QuizSubmission[];
  copy: TranslationShape["lessonQuiz"];
  submitAttempt: (payload: { answers: QuizAnswerInput[]; elapsedSeconds: number | null }) => Promise<QuizSubmission>;
}

function buildSelectionMap(questions: QuizDetail["questions"]): Record<string, string[]> {
  return questions.reduce<Record<string, string[]>>((acc, question) => {
    acc[question.id] = [];
    return acc;
  }, {});
}

function hasSelections(selection: Record<string, string[]>): boolean {
  return Object.values(selection).some(options => options.length > 0);
}

export function LessonQuizClient({
  locale,
  quiz,
  submissions,
  copy,
  submitAttempt
}: LessonQuizClientProps) {
  const [history, setHistory] = useState<QuizSubmission[]>(submissions);
  const [selection, setSelection] = useState<Record<string, string[]>>(() => buildSelectionMap(quiz.questions));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error" | null; message: string | null }>({
    type: null,
    message: null
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const questionsRef = useRef<HTMLDivElement>(null);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [focusReminder, setFocusReminder] = useState<FocusReminder>("tip");
  const [hasUnsubmittedProgress, setHasUnsubmittedProgress] = useState(false);
  const focusModeRef = useRef(false);
  const hasEnteredFocusMode = useRef(false);
  const hasAutoSubmittedRef = useRef(false);
  const questionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const totalQuestions = quiz.questions.length;

  const computedTimeLimit = useMemo(() => {
    if (typeof quiz.timeLimitSeconds === "number" && quiz.timeLimitSeconds > 0) {
      return quiz.timeLimitSeconds;
    }
    const fallback = totalQuestions * 90;
    return fallback > 0 ? fallback : null;
  }, [quiz.timeLimitSeconds, totalQuestions]);

  const [timerSeconds, setTimerSeconds] = useState<number | null>(computedTimeLimit);
  const [timerExpired, setTimerExpired] = useState(false);

  useEffect(() => {
    setHistory(submissions);
  }, [submissions]);

  useEffect(() => {
    setSelection(buildSelectionMap(quiz.questions));
    setTimerSeconds(computedTimeLimit);
    setTimerExpired(false);
    setIsFocusMode(false);
    setFocusReminder("tip");
    setHasUnsubmittedProgress(false);
    focusModeRef.current = false;
    hasEnteredFocusMode.current = false;
    hasAutoSubmittedRef.current = false;
    questionRefs.current = {};
    if (document.fullscreenElement === containerRef.current) {
      document.exitFullscreen().catch(() => {});
    }
  }, [quiz, computedTimeLimit]);

  const updateFocusReminder = useCallback(
    (active: boolean, override?: FocusReminder) => {
      if (override) {
        setFocusReminder(override);
        return;
      }
      if (active) {
        setFocusReminder("active");
        return;
      }
      if (hasEnteredFocusMode.current) {
        setFocusReminder("lost");
        return;
      }
      setFocusReminder("tip");
    },
    []
  );

  useEffect(() => {
    if (!computedTimeLimit || timerExpired) {
      return;
    }
    const intervalId = window.setInterval(() => {
      setTimerSeconds(prev => {
        if (prev === null) {
          return prev;
        }
        if (prev <= 1) {
          window.clearInterval(intervalId);
          setTimerExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, [computedTimeLimit, timerExpired]);

  useEffect(() => {
    const handleFullscreen = () => {
      const target = containerRef.current;
      const active = Boolean(target && document.fullscreenElement === target);
      setIsFocusMode(active);
      focusModeRef.current = active;
      if (active) {
        hasEnteredFocusMode.current = true;
        questionsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      updateFocusReminder(active);
    };
    document.addEventListener("fullscreenchange", handleFullscreen);
    return () => document.removeEventListener("fullscreenchange", handleFullscreen);
  }, [updateFocusReminder]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        setFocusReminder("tabHidden");
        return;
      }
      updateFocusReminder(focusModeRef.current);
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [updateFocusReminder]);

  useEffect(() => {
    const handleWindowBlur = () => {
      if (!focusModeRef.current) {
        return;
      }
      updateFocusReminder(false);
    };
    window.addEventListener("blur", handleWindowBlur);
    return () => window.removeEventListener("blur", handleWindowBlur);
  }, [updateFocusReminder]);

  useEffect(() => {
    if (!hasUnsubmittedProgress) {
      return;
    }
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = copy.leaveWarning;
      return copy.leaveWarning;
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsubmittedProgress, copy.leaveWarning]);

  const attemptsLimit = quiz.attemptsLimit ?? null;
  const attemptsUsed = history.length;
  const attemptsRemaining = attemptsLimit ? Math.max(attemptsLimit - attemptsUsed, 0) : null;
  const limitReached = attemptsLimit ? attemptsUsed >= attemptsLimit : false;

  const handleSubmit = useCallback(
    async (options?: { allowIncomplete?: boolean; auto?: boolean }) => {
      if (isSubmitting) {
        return;
      }

      if (limitReached) {
        setFeedback({ type: "error", message: copy.limitReached });
        return;
      }

      if (timerExpired && !options?.auto) {
        setFeedback({ type: "error", message: copy.timerExpired });
        return;
      }

      const answers: QuizAnswerInput[] = quiz.questions.map(question => ({
        questionId: question.id,
        selectedOptionIds: selection[question.id] ?? []
      }));

      if (!options?.allowIncomplete && answers.some(answer => answer.selectedOptionIds.length === 0)) {
        setFeedback({ type: "error", message: copy.selectAnswerError });
        return;
      }

      const elapsedSecondsUsed =
        typeof computedTimeLimit === "number" && typeof timerSeconds === "number"
          ? Math.min(computedTimeLimit, Math.max(0, computedTimeLimit - timerSeconds))
          : null;

      try {
        setIsSubmitting(true);
        const submission = await submitAttempt({ answers, elapsedSeconds: elapsedSecondsUsed });
        setHistory(prev => [submission, ...prev]);
        setSelection(buildSelectionMap(quiz.questions));
        setHasUnsubmittedProgress(false);
        setFeedback({
          type: submission.passed ? "success" : "error",
          message: options?.auto
            ? copy.autoSubmitMessage
            : submission.passed
            ? copy.submitSuccess
            : copy.submitFailure
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : copy.submitError;
        setFeedback({ type: "error", message: message || copy.submitError });
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      isSubmitting,
      limitReached,
      copy.limitReached,
      timerExpired,
      copy.timerExpired,
      quiz.questions,
      selection,
      copy.selectAnswerError,
      computedTimeLimit,
      timerSeconds,
      submitAttempt,
      copy.autoSubmitMessage,
      copy.submitSuccess,
      copy.submitFailure,
      copy.submitError
    ]
  );

  useEffect(() => {
    if (!timerExpired || hasAutoSubmittedRef.current) {
      return;
    }
    hasAutoSubmittedRef.current = true;
    setHasUnsubmittedProgress(false);
    if (limitReached || !hasSelections(selection)) {
      setFeedback({ type: "error", message: copy.timerExpired });
      return;
    }
    handleSubmit({ allowIncomplete: true, auto: true });
  }, [timerExpired, limitReached, selection, copy.timerExpired, handleSubmit]);

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        dateStyle: "medium",
        timeStyle: "short"
      }),
    [locale]
  );

  const latestAttempt = history[0];
  const latestAnswersById = useMemo<Record<string, QuizSubmission["answers"][number]> | null>(() => {
    if (!latestAttempt) {
      return null;
    }
    return latestAttempt.answers.reduce((acc, answer) => {
      acc[answer.questionId] = answer;
      return acc;
    }, {} as Record<string, QuizSubmission["answers"][number]>);
  }, [latestAttempt]);
  const correctAnswersLast = latestAttempt?.answers.filter(answer => answer.isCorrect).length ?? 0;
  const hasTimer = typeof computedTimeLimit === "number" && computedTimeLimit > 0;
  const submissionLocked = isSubmitting || limitReached || timerExpired;
  const latestAttemptElapsedLabel =
    latestAttempt && latestAttempt.elapsedSeconds !== null
      ? formatTimer(latestAttempt.elapsedSeconds)
      : copy.reportTimeFallback;
  const latestAttemptSubmittedLabel = latestAttempt
    ? dateFormatter.format(new Date(latestAttempt.submittedAt))
    : null;
  const answeredQuestions = useMemo(() => {
    return quiz.questions.reduce((count, question) => {
      return count + ((selection[question.id] ?? []).length > 0 ? 1 : 0);
    }, 0);
  }, [quiz.questions, selection]);
  const navigatorSummaryText = useMemo(() => {
    return copy.navigatorSummary
      .replace("{answered}", String(answeredQuestions))
      .replace("{total}", String(totalQuestions));
  }, [copy.navigatorSummary, answeredQuestions, totalQuestions]);
  const focusHintMessage = useMemo(() => {
    switch (focusReminder) {
      case "active":
        return copy.focusHintActive;
      case "lost":
        return copy.focusHintLost;
      case "tabHidden":
        return copy.focusHintHidden;
      default:
        return copy.focusHintTip;
    }
  }, [copy, focusReminder]);
  const focusHintLive = focusReminder === "tip" ? "polite" : "assertive";

  function formatUsage() {
    if (!attemptsLimit) {
      return copy.attemptsUnlimited;
    }
    return copy.attemptsUsed
      .replace("{used}", String(attemptsUsed))
      .replace("{limit}", String(attemptsLimit));
  }

  function handleOptionToggle(questionId: string, optionId: string, type: QuizDetail["questions"][number]["type"]) {
    setSelection(prev => {
      const current = new Set(prev[questionId] ?? []);
      if (type === "single") {
        const next = { ...prev, [questionId]: [optionId] };
        setHasUnsubmittedProgress(hasSelections(next));
        return next;
      }
      if (current.has(optionId)) {
        current.delete(optionId);
      } else {
        current.add(optionId);
      }
      const next = { ...prev, [questionId]: Array.from(current) };
      setHasUnsubmittedProgress(hasSelections(next));
      return next;
    });
  }

  function formatTimer(seconds: number | null) {
    if (seconds === null || seconds < 0) {
      return "—";
    }
    const wholeSeconds = Math.max(seconds, 0);
    const minutes = Math.floor(wholeSeconds / 60)
      .toString()
      .padStart(2, "0");
    const remainder = Math.floor(wholeSeconds % 60)
      .toString()
      .padStart(2, "0");
    return `${minutes}:${remainder}`;
  }

  function resolveOptionLabels(question: QuizDetail["questions"][number], optionIds: string[]): string[] {
    if (!optionIds.length) {
      return [];
    }
    const labelMap = new Map(question.options.map(option => [option.id, option.label]));
    return optionIds.map(optionId => labelMap.get(optionId)).filter((label): label is string => Boolean(label));
  }

  async function toggleFocusMode() {
    const target = containerRef.current;
    if (!target) {
      return;
    }

    if (document.fullscreenElement === target) {
      await document.exitFullscreen().catch(() => {});
      return;
    }

    await target.requestFullscreen().catch(() => {});
  }

  const scrollToQuestions = () => {
    questionsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const scrollToQuestionId = (questionId: string) => {
    const target = questionRefs.current[questionId];
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const toolbarTimerMessage = timerExpired ? copy.timerExpired : copy.timerHint;
  const rootClass = `lesson-quiz__interactive${isFocusMode ? " is-focus" : ""}`;

  return (
    <div ref={containerRef} className={rootClass}>
      <div className="lesson-quiz__toolbar">
        {hasTimer && (
          <div className={`lesson-quiz__timer${timerExpired ? " is-expired" : ""}`}>
            <p className="eyebrow">{copy.timerLabel}</p>
            <p className="lesson-quiz__metric">{formatTimer(timerSeconds)}</p>
            <span className="lesson-quiz__muted">{toolbarTimerMessage}</span>
          </div>
        )}
        <button type="button" className="button button--ghost" onClick={toggleFocusMode}>
          {isFocusMode ? copy.focusModeExit : copy.focusModeEnter}
        </button>
      </div>

      {isFocusMode && (
        <div className="lesson-quiz__focus-hud">
          {hasTimer && (
            <div>
              <p className="eyebrow">{copy.timerLabel}</p>
              <p className={`lesson-quiz__hud-value${timerExpired ? " is-expired" : ""}`}>
                {formatTimer(timerSeconds)}
              </p>
              <span className="lesson-quiz__hud-subtle">{toolbarTimerMessage}</span>
            </div>
          )}
          <div>
            <p className="eyebrow">{copy.navigatorHeading}</p>
            <p className="lesson-quiz__hud-value">{navigatorSummaryText}</p>
          </div>
          <div className="lesson-quiz__focus-hud-action">
            <button type="button" className="button" onClick={toggleFocusMode}>
              {copy.focusModeExit}
            </button>
          </div>
        </div>
      )}

      <div
        className={`lesson-quiz__focus-hint lesson-quiz__focus-hint--${focusReminder}`}
        aria-live={focusHintLive}
      >
        <p className="eyebrow">{copy.focusHintTitle}</p>
        <p className="lesson-quiz__focus-hint-text">{focusHintMessage}</p>
      </div>

      {hasUnsubmittedProgress && !submissionLocked && (
        <div className="lesson-quiz__warning" role="status">
          <p className="lesson-quiz__warning-title">{copy.leaveWarningTitle}</p>
          <p className="lesson-quiz__warning-text">{copy.leaveWarning}</p>
        </div>
      )}

      <div className="lesson-quiz__stats">
        <div>
          <p className="eyebrow">{copy.passScoreLabel}</p>
          <p className="lesson-quiz__metric">{quiz.passScore}%</p>
        </div>
        <div>
          <p className="eyebrow">{copy.attemptsLabel}</p>
          <p className="lesson-quiz__metric">{formatUsage()}</p>
          {attemptsRemaining !== null && (
            <span className="lesson-quiz__muted">
              {copy.attemptsRemaining.replace("{count}", String(attemptsRemaining))}
            </span>
          )}
        </div>
        <div>
          <p className="eyebrow">{copy.lastAttemptLabel}</p>
          {latestAttempt ? (
            <p className="lesson-quiz__metric">
              {latestAttempt.score}% · {latestAttempt.passed ? copy.statusPassed : copy.statusFailed}
            </p>
          ) : (
            <p className="lesson-quiz__muted">{copy.noAttempts}</p>
          )}
        </div>
      </div>

      {feedback.message && feedback.type && (
        <p className={`lesson-quiz__message lesson-quiz__message--${feedback.type}`}>
          {feedback.message}
        </p>
      )}

      {latestAttempt && (
        <section className="lesson-quiz__summary">
          <p className="eyebrow">{copy.summaryHeading}</p>
          <div className="lesson-quiz__summary-body">
            <div>
              <p className="lesson-quiz__metric">
                {copy.summaryScoreLabel.replace("{score}", String(latestAttempt.score))}
              </p>
              <p className="lesson-quiz__muted">
                {copy.summaryAnswersLabel
                  .replace("{correct}", String(correctAnswersLast))
                  .replace("{total}", String(totalQuestions))}
              </p>
            </div>
            <div className={`lesson-quiz__status${latestAttempt.passed ? " is-passed" : " is-failed"}`}>
              <span>
                {copy.summaryStatus.replace(
                  "{status}",
                  latestAttempt.passed ? copy.statusPassed : copy.statusFailed
                )}
              </span>
            </div>
            <button type="button" className="button button--ghost" onClick={scrollToQuestions}>
              {copy.summaryCta}
            </button>
          </div>
        </section>
      )}

      {latestAttempt && (
        <section className="lesson-quiz__report">
          <p className="eyebrow">{copy.reportHeading}</p>
          <div className="lesson-quiz__report-grid">
            <article>
              <span className="lesson-quiz__report-label">{copy.reportScoreLabel}</span>
              <p className="lesson-quiz__report-value">{latestAttempt.score}%</p>
              <div className={`lesson-quiz__status${latestAttempt.passed ? " is-passed" : " is-failed"}`}>
                <span>{latestAttempt.passed ? copy.statusPassed : copy.statusFailed}</span>
              </div>
            </article>
            <article>
              <span className="lesson-quiz__report-label">{copy.reportTimeLabel}</span>
              <p className="lesson-quiz__report-value">{latestAttemptElapsedLabel}</p>
              {hasTimer && (
                <p className="lesson-quiz__muted">{copy.reportTimeHint}</p>
              )}
            </article>
            <article>
              <span className="lesson-quiz__report-label">{copy.reportSubmittedLabel}</span>
              <p className="lesson-quiz__report-value">{latestAttemptSubmittedLabel}</p>
              <p className="lesson-quiz__muted">{copy.reportTip}</p>
            </article>
          </div>
          {!limitReached && (
            <div className="lesson-quiz__report-cta">
              <button type="button" className="button button--ghost" onClick={scrollToQuestions}>
                {copy.reportRetakeCta}
              </button>
            </div>
          )}
        </section>
      )}

      {latestAttempt && latestAnswersById && (
        <section className="lesson-quiz__review">
          <p className="eyebrow">{copy.reviewHeading}</p>
          <div className="lesson-quiz__review-grid">
            {quiz.questions.map((question, index) => {
              const answer = latestAnswersById[question.id];
              const selectedLabels = resolveOptionLabels(question, answer?.selectedOptionIds ?? []);
              const correctLabels = resolveOptionLabels(question, answer?.correctOptionIds ?? []);
              const statusKey = answer ? (answer.isCorrect ? "passed" : "failed") : "skipped";
              const statusClass =
                statusKey === "passed" ? "is-passed" : statusKey === "failed" ? "is-failed" : "is-skipped";
              const statusLabel =
                statusKey === "passed"
                  ? copy.reviewStatusCorrect
                  : statusKey === "failed"
                  ? copy.reviewStatusIncorrect
                  : copy.reviewStatusSkipped;
              return (
                <article key={question.id} className="lesson-quiz__review-item">
                  <div className={`lesson-quiz__status ${statusClass}`}>
                    <span>{statusLabel}</span>
                  </div>
                  <p className="lesson-quiz__review-question">
                    {copy.questionLabel.replace("{index}", String(index + 1))}: {question.prompt}
                  </p>
                  <div className="lesson-quiz__review-row">
                    <span className="lesson-quiz__review-label">{copy.reviewSelectedLabel}</span>
                    <p className="lesson-quiz__review-value">
                      {selectedLabels.length ? selectedLabels.join(", ") : copy.reviewEmptyAnswer}
                    </p>
                  </div>
                  <div className="lesson-quiz__review-row">
                    <span className="lesson-quiz__review-label">{copy.reviewCorrectLabel}</span>
                    <p className="lesson-quiz__review-value">
                      {correctLabels.length ? correctLabels.join(", ") : copy.reviewEmptyAnswer}
                    </p>
                  </div>
                  {question.explanation && (
                    <p className="lesson-quiz__review-note">
                      <strong>{copy.reviewExplanationLabel}: </strong>
                      {question.explanation}
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      )}

      <section className="lesson-quiz__navigator">
        <div>
          <p className="eyebrow">{copy.navigatorHeading}</p>
          <p className="lesson-quiz__muted">{navigatorSummaryText}</p>
        </div>
        <div className="lesson-quiz__navigator-grid">
          {quiz.questions.map((question, index) => {
            const answered = (selection[question.id] ?? []).length > 0;
            return (
              <button
                key={question.id}
                type="button"
                className={`lesson-quiz__navigator-item${answered ? " is-answered" : ""}`}
                onClick={() => scrollToQuestionId(question.id)}
              >
                <span className="lesson-quiz__navigator-index">{index + 1}</span>
                <span className="lesson-quiz__navigator-status">
                  {answered ? copy.navigatorAnswered : copy.navigatorUnanswered}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <div ref={questionsRef} className="lesson-quiz__questions">
        {quiz.questions.map((question, index) => (
          <article
            key={question.id}
            className="lesson-quiz__question"
            ref={(el: HTMLDivElement | null) => {
              questionRefs.current[question.id] = el;
            }}
          >
            <p className="eyebrow">{copy.questionLabel.replace("{index}", String(index + 1))}</p>
            <h2>{question.prompt}</h2>
            <p className="lesson-quiz__muted">
              {question.type === "multiple" ? copy.multiChoiceHint : copy.singleChoiceHint}
            </p>
            <div className="lesson-quiz__options">
              {question.options.map(option => {
                const selected = (selection[question.id] ?? []).includes(option.id);
                return (
                  <label key={option.id} className={`lesson-quiz__option${selected ? " is-selected" : ""}`}>
                    <input
                      type={question.type === "multiple" ? "checkbox" : "radio"}
                      name={question.id}
                      value={option.id}
                      checked={selected}
                      onChange={() => handleOptionToggle(question.id, option.id, question.type)}
                      disabled={submissionLocked}
                    />
                    <span>{option.label}</span>
                  </label>
                );
              })}
            </div>
            {question.explanation && <p className="lesson-quiz__note">{question.explanation}</p>}
          </article>
        ))}
      </div>

      <button
        type="button"
        className="button lesson-quiz__submit"
        onClick={() => handleSubmit()}
        disabled={submissionLocked}
      >
        {copy.submitLabel}
      </button>
      {limitReached && <p className="lesson-quiz__muted">{copy.limitReached}</p>}
      {timerExpired && <p className="lesson-quiz__muted">{copy.timerExpired}</p>}

      <section className="lesson-quiz__history">
        <p className="eyebrow">{copy.historyHeading}</p>
        {history.length === 0 ? (
          <p className="lesson-quiz__muted">{copy.noAttempts}</p>
        ) : (
          <ul>
            {history.map((attempt, index) => (
              <li key={attempt.id} className="lesson-quiz__attempt">
                <div>
                  <p className="lesson-quiz__metric">
                    {copy.attemptLabel.replace("{count}", String(history.length - index))}
                  </p>
                  <span className="lesson-quiz__muted">
                    {dateFormatter.format(new Date(attempt.submittedAt))}
                  </span>
                </div>
                <div className={`lesson-quiz__status${attempt.passed ? " is-passed" : " is-failed"}`}>
                  <span>
                    {attempt.passed ? copy.statusPassed : copy.statusFailed} · {copy.scoreLabel}: {attempt.score}%
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
