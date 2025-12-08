"use client";

import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { Button } from "@virgo/ui";
import type {
  CourseDetail,
  CourseDraftInput,
  CourseModuleOutline,
  ModuleDraftInput,
  ModuleStage
} from "../lib/api";

interface CourseEditorProps {
  course?: CourseDetail;
  onSaveDraft: (input: CourseDraftInput) => Promise<{ id: string }>;
}

type FormState = Omit<CourseDraftInput, "modules">;
type ModuleFormState = {
  id?: string;
  title: string;
  owner: string;
  lessons: string;
  stage: ModuleStage;
  summary: string;
};

type SaveStatus = "idle" | "saving" | "saved" | "error";

const statusOptions: CourseDraftInput["status"][] = ["running", "enrollment", "maintenance", "archived"];
const languageOptions = ["RU", "EN"];
const timezoneOptions = ["MSK", "UTC+3", "UTC+1", "UTC+7"];
const deliveryOptions = ["Online live", "Self-paced", "Blended", "Weekend"];
const moduleStageOptions: ModuleStage[] = ["draft", "review", "published"];
const moduleStageTone: Record<ModuleStage, { label: string; tone: "warning" | "info" | "success" }> = {
  draft: { label: "Черновик", tone: "warning" },
  review: { label: "На проверке", tone: "info" },
  published: { label: "Опубликован", tone: "success" }
};
const localeFieldMap = {
  RU: { title: "titleRu", description: "descriptionRu" },
  EN: { title: "titleEn", description: "descriptionEn" }
} as const;
type LocaleKey = keyof typeof localeFieldMap;
const translationLocales: { code: LocaleKey; label: string; copyFrom?: LocaleKey }[] = [
  { code: "RU", label: "Русский" },
  { code: "EN", label: "English", copyFrom: "RU" }
];

function buildInitialState(course?: CourseDetail): FormState {
  return {
    titleRu: course?.titleRu ?? course?.title ?? "",
    titleEn: course?.titleEn ?? course?.title ?? "",
    mentor: course?.mentor ?? "",
    cohort: course?.cohort ?? "",
    status: course?.status ?? "running",
    descriptionRu: course?.descriptionRu ?? course?.description ?? "",
    descriptionEn: course?.descriptionEn ?? "",
    language: course?.language ?? "RU",
    timezone: course?.timezone ?? "MSK",
    format: course?.format ?? "Online live",
    startDate: course?.startDate ?? "",
    endDate: course?.endDate ?? "",
    capacity: course?.capacity ?? "",
    seoTitle: course?.seoTitle ?? course?.title ?? "",
    seoDescription: course?.seoDescription ?? course?.description ?? "",
    seoKeywords: course?.seoKeywords ?? "",
    seoImage: course?.seoImage ?? ""
  };
}

function buildModuleFormState(module?: CourseModuleOutline): ModuleFormState {
  return {
    id: module?.id,
    title: module?.title ?? "",
    owner: module?.owner ?? "",
    lessons: module ? String(module.lessons) : "4",
    stage: module?.stage ?? "draft",
    summary: module?.summary ?? ""
  };
}

export function CourseEditor({ course, onSaveDraft }: CourseEditorProps) {
  const [formState, setFormState] = useState<FormState>(() => buildInitialState(course));
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [modules, setModules] = useState<CourseModuleOutline[]>(() => course?.modules ?? []);
  const [moduleForm, setModuleForm] = useState<ModuleFormState>(() => buildModuleFormState());
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [moduleError, setModuleError] = useState<string | null>(null);
  const canonicalTitle = formState.titleRu.trim() || formState.titleEn?.trim() || "Название курса";
  const canonicalDescription =
    formState.descriptionRu.trim() || formState.descriptionEn?.trim() || "Краткое описание появится здесь.";
  const seoPreviewTitle = formState.seoTitle?.trim() || canonicalTitle;
  const seoPreviewDescription =
    formState.seoDescription?.trim() || canonicalDescription || "Краткое описание появится здесь.";
  const seoPreviewUrl = `virgo.school/courses/${
    (formState.cohort || canonicalTitle || "course").toLowerCase().replace(/\s+/g, "-")
  }`;
  const seoPreviewKeywords = formState.seoKeywords
    .split(",")
    .map(keyword => keyword.trim())
    .filter(Boolean);

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setFormState((current: FormState) => ({ ...current, [name]: value }));
    if (status === "saved" || status === "error") {
      setStatus("idle");
      setErrorMessage(null);
    }
  };

  const copyLocaleContent = (from: LocaleKey, to: LocaleKey) => {
    if (from === to) {
      return;
    }

    setFormState((current: FormState) => {
      const sourceTitleKey = localeFieldMap[from].title as keyof FormState;
      const sourceDescriptionKey = localeFieldMap[from].description as keyof FormState;
      const targetTitleKey = localeFieldMap[to].title as keyof FormState;
      const targetDescriptionKey = localeFieldMap[to].description as keyof FormState;
      const nextState: FormState = {
        ...current,
        [targetTitleKey]: (current[sourceTitleKey] as string) || "",
        [targetDescriptionKey]: (current[sourceDescriptionKey] as string) || ""
      } as FormState;
      return nextState;
    });
  };

  const handleModuleFieldChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setModuleForm((current: ModuleFormState) => ({ ...current, [name]: value }));
    if (moduleError) {
      setModuleError(null);
    }
  };

  const resetModuleForm = () => {
    setModuleForm(buildModuleFormState());
    setEditingModuleId(null);
    setModuleError(null);
  };

  const handleModuleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const title = moduleForm.title.trim();
    const owner = moduleForm.owner.trim();
    const lessonsValue = Number(moduleForm.lessons);

    if (!title) {
      setModuleError("Добавьте название модуля");
      return;
    }

    if (!Number.isFinite(lessonsValue) || lessonsValue <= 0) {
      setModuleError("Количество уроков должно быть больше нуля");
      return;
    }

    const nextModule: CourseModuleOutline = {
      id: editingModuleId ?? `module-${Date.now()}`,
      title,
      owner: owner || "Не назначен",
      lessons: lessonsValue,
      stage: moduleForm.stage,
      summary: moduleForm.summary.trim() || undefined
    };

    setModules((list: CourseModuleOutline[]) => {
      if (editingModuleId) {
        return list.map((module: CourseModuleOutline) => (module.id === editingModuleId ? nextModule : module));
      }
      return [...list, nextModule];
    });

    resetModuleForm();
  };

  const handleModuleEdit = (moduleId: string) => {
    const selected = modules.find((module: CourseModuleOutline) => module.id === moduleId);
    if (!selected) {
      return;
    }
    setModuleForm(buildModuleFormState(selected));
    setEditingModuleId(moduleId);
    setModuleError(null);
  };

  const handleModuleRemove = (moduleId: string) => {
    setModules((list: CourseModuleOutline[]) => list.filter((module: CourseModuleOutline) => module.id !== moduleId));
    if (editingModuleId === moduleId) {
      resetModuleForm();
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("saving");
    setErrorMessage(null);
    try {
      const modulePayload: ModuleDraftInput[] = modules.map((module: CourseModuleOutline) => ({
        id: module.id,
        title: module.title,
        owner: module.owner,
        lessons: module.lessons,
        stage: module.stage,
        summary: module.summary
      }));
      await onSaveDraft({ ...formState, modules: modulePayload });
      setStatus("saved");
    } catch (error) {
      console.error(error);
      setErrorMessage("Не удалось сохранить черновик. Попробуйте снова");
      setStatus("error");
    }
  };

  return (
    <div className="form-shell" aria-live="polite">
      <form className="form-panel" onSubmit={handleSubmit}>
        <section className="form-section">
          <header>
            <p className="eyebrow">Основное</p>
            <h2>Профиль курса</h2>
          </header>
          <div className="field-grid">
            <label className="form-field">
              <span>Куратор</span>
              <input name="mentor" value={formState.mentor} onChange={handleChange} placeholder="Ответственный куратор" />
            </label>
            <label className="form-field">
              <span>Поток</span>
              <input name="cohort" value={formState.cohort} onChange={handleChange} placeholder="Например UX-0425" />
            </label>
            <label className="form-field">
              <span>Формат</span>
              <select name="format" value={formState.format} onChange={handleChange}>
                {deliveryOptions.map(option => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="translation-grid" role="group" aria-label="Название и описание на двух языках">
            {translationLocales.map(locale => {
              const titleField = localeFieldMap[locale.code].title;
              const descriptionField = localeFieldMap[locale.code].description;
              const titleValue = locale.code === "RU" ? formState.titleRu : formState.titleEn ?? "";
              const descriptionValue =
                locale.code === "RU" ? formState.descriptionRu : formState.descriptionEn ?? "";
              const isRequired = locale.code === "RU";
              const copySourceLabel = locale.copyFrom
                ? translationLocales.find(item => item.code === locale.copyFrom)?.label || locale.copyFrom
                : null;
              return (
                <article key={locale.code} className="translation-card">
                  <header className="translation-card__header">
                    <p className="eyebrow">{locale.label}</p>
                    {locale.copyFrom && copySourceLabel && (
                      <button
                        type="button"
                        className="translation-copy"
                        onClick={() => copyLocaleContent(locale.copyFrom!, locale.code)}
                        title={`Заполнить ${locale.label} текст значениями из ${copySourceLabel}`}
                      >
                        Скопировать из {copySourceLabel}
                      </button>
                    )}
                  </header>
                  <label className="form-field">
                    <span>Название</span>
                    <input
                      name={titleField}
                      value={titleValue}
                      onChange={handleChange}
                      placeholder={locale.code === "RU" ? "Название программы" : "Title in English"}
                      required={isRequired}
                    />
                  </label>
                  <label className="form-field">
                    <span>Описание</span>
                    <textarea
                      name={descriptionField}
                      value={descriptionValue}
                      onChange={handleChange}
                      rows={5}
                      placeholder={
                        locale.code === "RU"
                          ? "Кратко объясните, чему научится студент"
                          : "Explain the value in English"
                      }
                      required={isRequired}
                    />
                  </label>
                </article>
              );
            })}
          </div>
        </section>

        <section className="form-section">
          <header>
            <p className="eyebrow">Параметры запуска</p>
            <h2>Расписание и статус</h2>
          </header>
          <div className="field-grid">
            <label className="form-field">
              <span>Статус</span>
              <select name="status" value={formState.status} onChange={handleChange}>
                {statusOptions.map(option => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-field">
              <span>Язык</span>
              <select name="language" value={formState.language} onChange={handleChange}>
                {languageOptions.map(option => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-field">
              <span>Часовой пояс</span>
              <select name="timezone" value={formState.timezone} onChange={handleChange}>
                {timezoneOptions.map(option => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-field">
              <span>Вместимость</span>
              <input name="capacity" value={formState.capacity} onChange={handleChange} placeholder="32 / 40" />
            </label>
            <label className="form-field">
              <span>Старт</span>
              <input name="startDate" value={formState.startDate} onChange={handleChange} placeholder="04 ноя" />
            </label>
            <label className="form-field">
              <span>Финиш</span>
              <input name="endDate" value={formState.endDate} onChange={handleChange} placeholder="20 дек" />
            </label>
          </div>
        </section>

        <section className="form-section">
          <header>
            <p className="eyebrow">SEO и предпросмотр</p>
            <h2>Мета-данные</h2>
            <p className="muted">Обновите сниппет для поисковых систем и социальных сетей.</p>
          </header>
          <div className="field-grid">
            <label className="form-field">
              <span>Meta title</span>
              <input
                name="seoTitle"
                value={formState.seoTitle}
                onChange={handleChange}
                placeholder="Например, UX Research Sprint — Virgo School"
                maxLength={120}
              />
            </label>
            <label className="form-field">
              <span>Ключевые слова</span>
              <input
                name="seoKeywords"
                value={formState.seoKeywords}
                onChange={handleChange}
                placeholder="ux, интервью, customer journey"
              />
            </label>
            <label className="form-field">
              <span>Изображение предпросмотра</span>
              <input
                name="seoImage"
                value={formState.seoImage}
                onChange={handleChange}
                placeholder="https://cdn.example.com/seo-cover.jpg"
              />
            </label>
          </div>
          <label className="form-field">
            <span>Meta description</span>
            <textarea
              name="seoDescription"
              value={formState.seoDescription}
              onChange={handleChange}
              rows={3}
              maxLength={240}
              placeholder="Коротко объясните ценность курса для сниппета Google"
            />
          </label>
          <div className="seo-preview" role="region" aria-label="SEO превью сниппета">
            <p className="seo-preview__url">{seoPreviewUrl}</p>
            <p className="seo-preview__title">{seoPreviewTitle}</p>
            <p className="seo-preview__description">{seoPreviewDescription}</p>
            {seoPreviewKeywords.length > 0 && (
              <ul className="seo-preview__keywords">
                {seoPreviewKeywords.map(keyword => (
                  <li key={keyword}>{keyword}</li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <div className="form-actions">
          <Button type="submit" disabled={status === "saving"}>
            {status === "saving" ? "Сохраняем..." : "Сохранить черновик"}
          </Button>
          <span className="form-status" aria-live="polite">
            {status === "saved" && "Черновик сохранен"}
            {status === "error" && errorMessage}
          </span>
        </div>
      </form>

      <aside className="form-panel form-panel--sidebar">
        <section className="form-section">
          <header>
            <p className="eyebrow">Структура</p>
            <h3>Модули курса</h3>
          </header>
          {modules.length === 0 ? (
            <p className="muted">Нет модулей. Добавьте первый, чтобы зафиксировать владельца и состав.</p>
          ) : (
            <div className="module-cards">
              {modules.map((module: CourseModuleOutline) => {
                const tone = moduleStageTone[module.stage];
                return (
                  <article key={module.id} className="module-card">
                    <div className="module-card__header">
                      <div>
                        <strong>{module.title}</strong>
                        <p className="module-card__meta">
                          {module.lessons} уроков · {module.owner}
                        </p>
                      </div>
                      <span className={`status-pill status-pill--${tone.tone}`}>{tone.label}</span>
                    </div>
                    {module.summary && <p className="module-card__summary muted">{module.summary}</p>}
                    <div className="module-actions">
                      <button type="button" className="module-action" onClick={() => handleModuleEdit(module.id)}>
                        Редактировать
                      </button>
                      <button
                        type="button"
                        className="module-action module-action--danger"
                        onClick={() => handleModuleRemove(module.id)}
                      >
                        Удалить
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
        <section className="form-section">
          <form className="module-form" onSubmit={handleModuleSubmit}>
            <p className="eyebrow">{editingModuleId ? "Редактирование" : "Новый модуль"}</p>
            <div className="field-grid">
              <label className="form-field">
                <span>Название</span>
                <input
                  name="title"
                  value={moduleForm.title}
                  onChange={handleModuleFieldChange}
                  placeholder="Например, Sprint 1"
                />
              </label>
              <label className="form-field">
                <span>Владелец</span>
                <input
                  name="owner"
                  value={moduleForm.owner}
                  onChange={handleModuleFieldChange}
                  placeholder="Ответственный ментор"
                />
              </label>
              <label className="form-field">
                <span>Уроки</span>
                <input
                  name="lessons"
                  type="number"
                  min="1"
                  value={moduleForm.lessons}
                  onChange={handleModuleFieldChange}
                />
              </label>
              <label className="form-field">
                <span>Статус</span>
                <select name="stage" value={moduleForm.stage} onChange={handleModuleFieldChange}>
                  {moduleStageOptions.map(option => (
                    <option key={option} value={option}>
                      {moduleStageTone[option].label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="form-field">
              <span>Краткое описание</span>
              <textarea
                name="summary"
                value={moduleForm.summary}
                onChange={handleModuleFieldChange}
                rows={3}
                placeholder="Чему посвящен модуль"
              />
            </label>
            {moduleError && <p className="form-error">{moduleError}</p>}
            <div className="module-form__actions">
              <Button type="submit" disabled={status === "saving"}>
                {editingModuleId ? "Сохранить модуль" : "Добавить модуль"}
              </Button>
              {editingModuleId && (
                <Button type="button" variant="ghost" onClick={resetModuleForm}>
                  Отменить
                </Button>
              )}
            </div>
          </form>
        </section>
        <section className="form-section">
          <p className="eyebrow">Подсказки</p>
          <p className="muted">Обновите описание и формат перед включением набора, чтобы карточка курса на сайте подтянула актуальные данные.</p>
        </section>
      </aside>
    </div>
  );
}
