"use client";

import { useMemo, useState, useTransition } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { Button } from "@virgo/ui";
import {
  createLessonAction,
  deleteLessonAction,
  reorderLessonsAction,
  updateLessonAction,
  updateLessonQuizAction
} from "../actions/lessons";
import type { LessonDetail, LessonDraftInput, LessonQuizInput, ModuleDirectoryRecord } from "../lib/api";

interface LessonManagerProps {
  moduleMeta: ModuleDirectoryRecord;
  initialLessons: LessonDetail[];
}

type LessonFormState = {
  titleRu: string;
  titleEn: string;
  bodyRu: string;
  bodyEn: string;
  durationMinutes: string;
  videoProvider: string;
  videoRef: string;
};

type QuizFormState = {
  passScore: string;
  attemptsLimit: string;
  timeLimitSeconds: string;
};

type SaveStatus = "idle" | "saving" | "success" | "error";

const moduleStageTone = {
  draft: { label: "Черновик", tone: "warning" },
  review: { label: "На проверке", tone: "info" },
  published: { label: "Опубликован", tone: "success" }
} as const;

const emptyFormState: LessonFormState = {
  titleRu: "",
  titleEn: "",
  bodyRu: "",
  bodyEn: "",
  durationMinutes: "",
  videoProvider: "",
  videoRef: ""
};

const emptyQuizFormState: QuizFormState = {
  passScore: "80",
  attemptsLimit: "",
  timeLimitSeconds: ""
};

export function LessonManager({ moduleMeta, initialLessons }: LessonManagerProps) {
  const [lessons, setLessons] = useState<LessonDetail[]>(() => sortLessons(initialLessons));
  const [formState, setFormState] = useState<LessonFormState>(() => buildFormState());
  const [quizFormState, setQuizFormState] = useState<QuizFormState>(() => buildQuizFormState());
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [quizStatus, setQuizStatus] = useState<SaveStatus>("idle");
  const [quizStatusMessage, setQuizStatusMessage] = useState<string | null>(null);
  const [quizErrorMessage, setQuizErrorMessage] = useState<string | null>(null);
  const [isQuizPending, startQuizTransition] = useTransition();

  const selectedLesson = useMemo(
    () => lessons.find(lesson => lesson.id === editingLessonId) ?? null,
    [editingLessonId, lessons]
  );

  const handleSelectLesson = (lesson: LessonDetail) => {
    setEditingLessonId(lesson.id);
    setFormState(buildFormState(lesson));
    setQuizFormState(buildQuizFormState(lesson.quiz ?? null));
    setStatus("idle");
    setErrorMessage(null);
    setStatusMessage(null);
    setQuizStatus("idle");
    setQuizErrorMessage(null);
    setQuizStatusMessage(null);
  };

  const handleReset = () => {
    setEditingLessonId(null);
    setFormState(buildFormState());
    setQuizFormState(buildQuizFormState());
    setStatus("idle");
    setErrorMessage(null);
    setStatusMessage(null);
    setQuizStatus("idle");
    setQuizErrorMessage(null);
    setQuizStatusMessage(null);
  };

  const handleFieldChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setFormState(current => ({ ...current, [name]: value }));
    if (status === "success" || status === "error") {
      setStatus("idle");
      setErrorMessage(null);
      setStatusMessage(null);
    }
  };

  const handleQuizFieldChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setQuizFormState(current => ({ ...current, [name]: value }));
    if (quizStatus === "success" || quizStatus === "error") {
      setQuizStatus("idle");
      setQuizErrorMessage(null);
      setQuizStatusMessage(null);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const { payload, error } = buildLessonPayload(formState);
    if (!payload) {
      setErrorMessage(error ?? "Исправьте ошибки формы");
      setStatus("error");
      setStatusMessage(null);
      return;
    }

    setStatus("saving");
    setErrorMessage(null);
    setStatusMessage(null);

    startTransition(() => {
      void (async () => {
        try {
          const savedLesson = editingLessonId
            ? await updateLessonAction(moduleMeta.id, editingLessonId, payload)
            : await createLessonAction(moduleMeta.id, payload);

          setLessons(current => {
            const next = editingLessonId
              ? current.map(lesson => (lesson.id === savedLesson.id ? savedLesson : lesson))
              : [...current, savedLesson];
            return sortLessons(next);
          });

          setEditingLessonId(savedLesson.id);
          setFormState(buildFormState(savedLesson));
          setStatus("success");
          setStatusMessage("Урок сохранен");
        } catch (error) {
          console.error(error);
          setErrorMessage("Не удалось сохранить урок. Попробуйте снова.");
          setStatus("error");
          setStatusMessage(null);
        }
      })();
    });
  };

  const handleQuizSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingLessonId) {
      setQuizStatus("error");
      setQuizErrorMessage("Сначала сохраните урок");
      setQuizStatusMessage(null);
      return;
    }

    const { payload, error } = buildQuizPayload(quizFormState);
    if (!payload) {
      setQuizStatus("error");
      setQuizErrorMessage(error ?? "Исправьте ошибки формы теста");
      setQuizStatusMessage(null);
      return;
    }

    setQuizStatus("saving");
    setQuizErrorMessage(null);
    setQuizStatusMessage(null);

    startQuizTransition(() => {
      void (async () => {
        try {
          const updatedQuiz = await updateLessonQuizAction(editingLessonId, payload);
          setLessons(current =>
            current.map(lesson =>
              lesson.id === editingLessonId
                ? {
                    ...lesson,
                    quizId: updatedQuiz.id,
                    quiz: updatedQuiz
                  }
                : lesson
            )
          );
          setQuizFormState(buildQuizFormState(updatedQuiz));
          setQuizStatus("success");
          setQuizStatusMessage("Настройки теста сохранены");
        } catch (err) {
          console.error(err);
          setQuizStatus("error");
          setQuizErrorMessage("Не удалось сохранить настройки теста");
          setQuizStatusMessage(null);
        }
      })();
    });
  };

  const handleDeleteLesson = (lessonId: string) => {
    if (!lessonId || !window.confirm("Удалить урок? Действие необратимо.")) {
      return;
    }

    setStatus("saving");
    setErrorMessage(null);
    setStatusMessage(null);

    startTransition(() => {
      void (async () => {
        try {
          await deleteLessonAction(moduleMeta.id, lessonId);
          setLessons(current => {
            const filtered = current.filter(lesson => lesson.id !== lessonId);
            const next = reindexLessons(filtered);
            setEditingLessonId(prev => {
              if (prev === lessonId) {
                const fallback = next[0] ?? null;
                setFormState(buildFormState(fallback ?? undefined));
                return fallback?.id ?? null;
              }
              return prev;
            });
            return next;
          });
          setStatus("success");
          setStatusMessage("Урок удален");
        } catch (error) {
          console.error(error);
          setStatus("error");
          setErrorMessage("Не удалось удалить урок");
          setStatusMessage(null);
        }
      })();
    });
  };

  const handleMoveLesson = (lessonId: string, direction: "up" | "down") => {
    const currentIndex = lessons.findIndex(lesson => lesson.id === lessonId);
    if (currentIndex === -1) {
      return;
    }

    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= lessons.length) {
      return;
    }

    const previousLessons = lessons;
    const swapped = [...lessons];
    [swapped[currentIndex], swapped[targetIndex]] = [swapped[targetIndex], swapped[currentIndex]];
    const resequenced = reindexLessons(swapped);
    const lessonIds = resequenced.map(lesson => lesson.id);
    setLessons(resequenced);
    setStatus("saving");
    setErrorMessage(null);
    setStatusMessage(null);

    startTransition(() => {
      void (async () => {
        try {
          const updated = await reorderLessonsAction(moduleMeta.id, lessonIds);
          setLessons(sortLessons(updated));
          setStatus("success");
          setStatusMessage("Порядок обновлен");
        } catch (error) {
          console.error(error);
          setLessons(previousLessons);
          setStatus("error");
          setErrorMessage("Не удалось обновить порядок уроков");
          setStatusMessage(null);
        }
      })();
    });
  };

  const saving = status === "saving" || isPending;
  const quizSaving = quizStatus === "saving" || isQuizPending;

  return (
    <div className="lesson-shell">
      <aside className="lesson-sidebar form-panel">
        <header className="lesson-sidebar__header">
          <p className="eyebrow">Модуль</p>
          <h2>{moduleMeta.moduleTitle}</h2>
          <p className="muted">Курс: {moduleMeta.courseTitle}</p>
          <p className="muted">Владелец: {moduleMeta.owner}</p>
          <div className="lesson-sidebar__meta">
            <span className={`status-pill status-pill--${moduleStageTone[moduleMeta.stage].tone}`}>
              {moduleStageTone[moduleMeta.stage].label}
            </span>
            <span className="lesson-language">Язык: {moduleMeta.language}</span>
          </div>
        </header>
        <div className="lesson-sidebar__actions">
          <Button variant="ghost" onClick={handleReset} disabled={saving}>
            Новый урок
          </Button>
          {selectedLesson && (
            <span className="lesson-counter">Редактируется урок #{selectedLesson.orderIndex}</span>
          )}
        </div>
        {lessons.length === 0 ? (
          <p className="muted">Пока нет уроков. Добавьте первый, чтобы команда знала сценарий.</p>
        ) : (
          <ul className="lesson-list">
            {lessons.map((lesson, index) => (
              <li key={lesson.id}>
                <button
                  type="button"
                  className={`lesson-card${editingLessonId === lesson.id ? " lesson-card--active" : ""}`}
                  onClick={() => handleSelectLesson(lesson)}
                  aria-pressed={editingLessonId === lesson.id}
                  disabled={saving}
                >
                  <div>
                    <strong>{lesson.titleRu}</strong>
                    <p className="lesson-card__meta">
                      #{lesson.orderIndex} · {lesson.durationMinutes ? `${lesson.durationMinutes} мин` : "без тайминга"}
                    </p>
                  </div>
                  {lesson.videoProvider && (
                    <span className="lesson-card__badge">{lesson.videoProvider}</span>
                  )}
                </button>
                <div className="lesson-card__actions" role="group" aria-label="Действия с уроком">
                  <button
                    type="button"
                    className="lesson-mini-button"
                    onClick={() => handleMoveLesson(lesson.id, "up")}
                    disabled={saving || index === 0}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="lesson-mini-button"
                    onClick={() => handleMoveLesson(lesson.id, "down")}
                    disabled={saving || index === lessons.length - 1}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="lesson-mini-button lesson-mini-button--danger"
                    onClick={() => handleDeleteLesson(lesson.id)}
                    disabled={saving}
                  >
                    ✕
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </aside>

      <section className="lesson-form form-panel">
        <form onSubmit={handleSubmit} className="lesson-form__form">
          <div className="lesson-form__header">
            <div>
              <p className="eyebrow">{editingLessonId ? "Редактирование" : "Новый урок"}</p>
              <h3>{selectedLesson ? selectedLesson.titleRu : "Карточка урока"}</h3>
            </div>
            <Button type="submit" disabled={saving}>
              {saving ? "Сохраняем..." : "Сохранить урок"}
            </Button>
          </div>
          <div className="field-grid">
            <label className="form-field">
              <span>Название (RU)</span>
              <input
                name="titleRu"
                value={formState.titleRu}
                onChange={handleFieldChange}
                placeholder="Например, Customer Journey"
                required
              />
            </label>
            <label className="form-field">
              <span>Название (EN)</span>
              <input
                name="titleEn"
                value={formState.titleEn}
                onChange={handleFieldChange}
                placeholder="Optional"
              />
            </label>
            <label className="form-field">
              <span>Длительность (мин)</span>
              <input
                name="durationMinutes"
                type="number"
                min="1"
                value={formState.durationMinutes}
                onChange={handleFieldChange}
                placeholder="45"
              />
            </label>
            <label className="form-field">
              <span>Видео провайдер</span>
              <input
                name="videoProvider"
                value={formState.videoProvider}
                onChange={handleFieldChange}
                placeholder="vimeo, youtube, loom"
              />
            </label>
            <label className="form-field">
              <span>Видео ID / ссылка</span>
              <input
                name="videoRef"
                value={formState.videoRef}
                onChange={handleFieldChange}
                placeholder="ID или URL"
              />
            </label>
          </div>
          <label className="form-field">
            <span>Контент (RU)</span>
            <textarea
              name="bodyRu"
              rows={5}
              value={formState.bodyRu}
              onChange={handleFieldChange}
              placeholder="Краткий конспект или план урока"
            />
          </label>
          <label className="form-field">
            <span>Контент (EN)</span>
            <textarea
              name="bodyEn"
              rows={5}
              value={formState.bodyEn}
              onChange={handleFieldChange}
              placeholder="English summary if доступен"
            />
          </label>
          <div className="lesson-form__status" aria-live="polite">
            {status === "success" && statusMessage && (
              <span className="status-pill status-pill--success">{statusMessage}</span>
            )}
            {status === "error" && errorMessage && <p className="form-error">{errorMessage}</p>}
          </div>
        </form>

        <hr className="lesson-form__divider" aria-hidden="true" />

        <form onSubmit={handleQuizSubmit} className="lesson-form__form">
          <div className="lesson-form__header">
            <div>
              <p className="eyebrow">Настройки теста</p>
              <h3>Ограничения и критерии</h3>
              {!editingLessonId && <p className="muted">Сначала сохраните урок, чтобы настроить тест.</p>}
            </div>
            <Button type="submit" disabled={!editingLessonId || quizSaving}>
              {quizSaving ? "Сохраняем..." : "Сохранить тест"}
            </Button>
          </div>
          <div className="field-grid">
            <label className="form-field">
              <span>Проходной балл (%)</span>
              <input
                name="passScore"
                type="number"
                min="1"
                max="100"
                value={quizFormState.passScore}
                onChange={handleQuizFieldChange}
                disabled={!editingLessonId || quizSaving}
                required
              />
            </label>
            <label className="form-field">
              <span>Лимит попыток</span>
              <input
                name="attemptsLimit"
                type="number"
                min="1"
                value={quizFormState.attemptsLimit}
                onChange={handleQuizFieldChange}
                placeholder="Без лимита"
                disabled={!editingLessonId || quizSaving}
              />
              <small className="muted">Оставьте пустым, чтобы не ограничивать попытки.</small>
            </label>
            <label className="form-field">
              <span>Лимит по времени (сек)</span>
              <input
                name="timeLimitSeconds"
                type="number"
                min="30"
                value={quizFormState.timeLimitSeconds}
                onChange={handleQuizFieldChange}
                placeholder="Авторасчет"
                disabled={!editingLessonId || quizSaving}
              />
              <small className="muted">Оставьте пустым, чтобы использовать авторасчет из количества вопросов.</small>
            </label>
          </div>
          <div className="lesson-form__status" aria-live="polite">
            {quizStatus === "success" && quizStatusMessage && (
              <span className="status-pill status-pill--success">{quizStatusMessage}</span>
            )}
            {quizStatus === "error" && quizErrorMessage && <p className="form-error">{quizErrorMessage}</p>}
          </div>
        </form>
      </section>
    </div>
  );
}

function sortLessons(lessons: LessonDetail[]): LessonDetail[] {
  return [...lessons].sort((a, b) => a.orderIndex - b.orderIndex);
}

function reindexLessons(lessons: LessonDetail[]): LessonDetail[] {
  return sortLessons(lessons).map((lesson, index) => ({
    ...lesson,
    orderIndex: index + 1
  }));
}

function buildFormState(lesson?: LessonDetail): LessonFormState {
  if (!lesson) {
    return emptyFormState;
  }

  return {
    titleRu: lesson.titleRu ?? "",
    titleEn: lesson.titleEn ?? "",
    bodyRu: lesson.bodyRu ?? "",
    bodyEn: lesson.bodyEn ?? "",
    durationMinutes: lesson.durationMinutes ? String(lesson.durationMinutes) : "",
    videoProvider: lesson.videoProvider ?? "",
    videoRef: lesson.videoRef ?? ""
  };
}

function buildLessonPayload(formState: LessonFormState): { payload: LessonDraftInput | null; error?: string } {
  const titleRu = formState.titleRu.trim();
  if (!titleRu) {
    return { payload: null, error: "Добавьте название урока" };
  }

  const durationRaw = formState.durationMinutes.trim();
  let durationValue: number | undefined;
  if (durationRaw) {
    const parsed = Number(durationRaw);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return { payload: null, error: "Длительность должна быть положительным числом" };
    }
    durationValue = parsed;
  }

  const payload: LessonDraftInput = {
    titleRu,
    titleEn: formState.titleEn.trim() || undefined,
    bodyRu: formState.bodyRu.trim() || undefined,
    bodyEn: formState.bodyEn.trim() || undefined,
    durationMinutes: durationValue,
    videoProvider: formState.videoProvider.trim() || undefined,
    videoRef: formState.videoRef.trim() || undefined
  };

  return { payload };
}

function buildQuizFormState(settings?: LessonDetail["quiz"]): QuizFormState {
  if (!settings) {
    return { ...emptyQuizFormState };
  }

  return {
    passScore: String(settings.passScore ?? 80),
    attemptsLimit: settings.attemptsLimit ? String(settings.attemptsLimit) : "",
    timeLimitSeconds: settings.timeLimitSeconds ? String(settings.timeLimitSeconds) : ""
  };
}

function buildQuizPayload(formState: QuizFormState): { payload: LessonQuizInput | null; error?: string } {
  const normalizedScore = Number(formState.passScore.trim());
  if (!Number.isFinite(normalizedScore) || normalizedScore < 1 || normalizedScore > 100) {
    return { payload: null, error: "Проходной балл должен быть в пределах 1-100%" };
  }

  const attemptsRaw = formState.attemptsLimit.trim();
  let attemptsValue: number | null = null;
  if (attemptsRaw) {
    const parsed = Number(attemptsRaw);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return { payload: null, error: "Лимит попыток должен быть положительным числом" };
    }
    attemptsValue = Math.floor(parsed);
  }

  const timerRaw = formState.timeLimitSeconds.trim();
  let timerValue: number | null = null;
  if (timerRaw) {
    const parsed = Number(timerRaw);
    if (!Number.isFinite(parsed) || parsed < 30) {
      return { payload: null, error: "Лимит по времени должен быть не меньше 30 секунд" };
    }
    timerValue = Math.floor(parsed);
  }

  const payload: LessonQuizInput = {
    passScore: Math.floor(normalizedScore),
    attemptsLimit: attemptsValue,
    timeLimitSeconds: timerValue
  };

  return { payload };
}
