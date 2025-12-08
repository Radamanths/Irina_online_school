"use client";

/* eslint-disable @next/next/no-img-element */

import { useMemo, useState, useTransition } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { Button } from "@virgo/ui";
import type { MediaAssetRecord, SeoPageConfig, SeoSettings } from "../lib/api";
import { updateSeoSettingsAction } from "../actions/seo-settings";
import { refreshMediaLibraryAction } from "../actions/media-library";

const localeLabels: Record<"ru" | "en", string> = {
  ru: "Русский",
  en: "English"
};

interface SeoEditorProps {
  settings: SeoSettings;
}

export function SeoEditor({ settings }: SeoEditorProps) {
  const [pages, setPages] = useState<SeoPageConfig[]>(settings.pages);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [mediaPicker, setMediaPicker] = useState<{
    open: boolean;
    pageId: string | null;
    loading: boolean;
    assets: MediaAssetRecord[];
    error: string | null;
  }>({ open: false, pageId: null, loading: false, assets: [], error: null });

  const updatePage = (pageId: string, updater: (page: SeoPageConfig) => SeoPageConfig) => {
    setPages(current => current.map(page => (page.id === pageId ? updater(page) : page)));
  };

  const normalizeSlugInput = (value: string) => {
    if (!value) {
      return "/";
    }
    let next = value.trim().toLowerCase();
    if (!next.startsWith("/")) {
      next = `/${next}`;
    }
    next = next.replace(/\s+/g, "-");
    next = next.replace(/[^a-z0-9/_-]+/g, "-");
    next = next.replace(/-+/g, "-");
    next = next.replace(/\/+/g, "/");
    if (next.length > 1 && next.endsWith("/")) {
      next = next.replace(/\/+$/, "");
    }
    return next || "/";
  };

  const handleMetaChange = (pageId: string, event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    const nextValue = name === "slug" ? normalizeSlugInput(value) : value;
    updatePage(pageId, page => ({ ...page, [name]: nextValue }));
  };

  const handleLocaleChange = (
    pageId: string,
    locale: "ru" | "en",
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target;
    updatePage(pageId, page => ({
      ...page,
      locales: {
        ...page.locales,
        [locale]: {
          ...page.locales[locale],
          [name]: value
        }
      }
    }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("saving");
    setErrorMessage(null);

    startTransition(() => {
      updateSeoSettingsAction({ updatedAt: new Date().toISOString(), pages })
        .then(response => {
          setPages(response.pages);
          setStatus("saved");
        })
        .catch(err => {
          const message = err instanceof Error ? err.message : "Не удалось сохранить настройки";
          setErrorMessage(message);
          setStatus("error");
        });
    });
  };

  const createBlankPage = (): SeoPageConfig => {
    const randomId = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : Date.now().toString(36);
    return {
      id: `seo-${randomId}`,
      label: "Новая страница",
      slug: "/",
      image: "",
      locales: {
        ru: { title: "", description: "", keywords: "" },
        en: { title: "", description: "", keywords: "" }
      }
    };
  };

  const handleAddPage = () => {
    setPages(current => [...current, createBlankPage()]);
  };

  const handleRemovePage = (pageId: string) => {
    setPages(current => (current.length > 1 ? current.filter(page => page.id !== pageId) : current));
  };

  const handleMovePage = (pageId: string, direction: "up" | "down") => {
    setPages(current => {
      const index = current.findIndex(page => page.id === pageId);
      if (index === -1) {
        return current;
      }
      const nextIndex = direction === "up" ? index - 1 : index + 1;
      if (nextIndex < 0 || nextIndex >= current.length) {
        return current;
      }
      const reordered = [...current];
      const [moved] = reordered.splice(index, 1);
      reordered.splice(nextIndex, 0, moved);
      return reordered;
    });
  };

  const fetchMediaAssets = async () => {
    setMediaPicker(current => ({ ...current, loading: true, error: null }));
    try {
      const assets = await refreshMediaLibraryAction();
      setMediaPicker(current => ({ ...current, assets, loading: false }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Не удалось загрузить библиотеку";
      setMediaPicker(current => ({ ...current, error: message, loading: false }));
    }
  };

  const handleOpenMediaPicker = (pageId: string) => {
    setMediaPicker({ open: true, pageId, loading: true, assets: [], error: null });
    fetchMediaAssets();
  };

  const handleCloseMediaPicker = () => {
    setMediaPicker(current => ({ ...current, open: false, pageId: null }));
  };

  const handleSelectMedia = (asset: MediaAssetRecord) => {
    if (!mediaPicker.pageId) {
      return;
    }
    updatePage(mediaPicker.pageId, page => ({ ...page, image: asset.url }));
    handleCloseMediaPicker();
  };

  const slugDiagnostics = useMemo(() => {
    const counts: Record<string, number> = {};
    pages.forEach(page => {
      const slug = normalizeSlugInput(page.slug || "/");
      counts[slug] = (counts[slug] ?? 0) + 1;
    });

    const errors = new Map<string, string | null>();
    pages.forEach(page => {
      const slug = normalizeSlugInput(page.slug || "/");
      let message: string | null = null;
      if (!slug || slug.trim().length === 0) {
        message = "Укажите slug";
      } else if (counts[slug] > 1) {
        message = "Slug уже используется";
      }
      errors.set(page.id, message);
    });

    return {
      errors,
      hasErrors: Array.from(errors.values()).some(Boolean)
    };
  }, [pages]);

  const busy = isPending || status === "saving";
  const disableSubmit = busy || slugDiagnostics.hasErrors;

  return (
    <form className="seo-editor" onSubmit={handleSubmit}>
      <div className="form-actions">
        <Button type="submit" disabled={disableSubmit}>
          {busy ? "Сохраняем..." : "Сохранить SEO"}
        </Button>
        <Button type="button" variant="ghost" onClick={handleAddPage} disabled={busy}>
          Добавить страницу
        </Button>
        <span className="form-status" aria-live="polite">
          {status === "saved" && "Настройки сохранены"}
          {status === "error" && errorMessage}
          {!busy && slugDiagnostics.hasErrors && "Исправьте ошибки slug перед сохранением"}
        </span>
      </div>

      <div className="seo-cards">
        {pages.map((page, index) => {
          const previewLocale = page.locales.ru.title ? page.locales.ru : page.locales.en;
          const previewTitle = previewLocale.title || "Заголовок страницы";
          const previewDescription = previewLocale.description || "Описание для сниппета появится здесь";
          const previewUrl = `virgo.school${page.slug || "/"}`;

          return (
            <article key={page.id} className="seo-card">
              <header className="seo-card__meta">
                <div>
                  <p className="eyebrow">{page.label}</p>
                  <strong>{previewUrl}</strong>
                </div>
                <div className="seo-card__fields">
                  <label className="form-field">
                    <span>Label</span>
                    <input name="label" value={page.label} onChange={event => handleMetaChange(page.id, event)} />
                  </label>
                  <label className="form-field">
                    <span>Slug</span>
                    <input
                      name="slug"
                      value={page.slug}
                      onChange={event => handleMetaChange(page.id, event)}
                      aria-invalid={Boolean(slugDiagnostics.errors.get(page.id))}
                    />
                    {slugDiagnostics.errors.get(page.id) && (
                      <p className="form-error">{slugDiagnostics.errors.get(page.id)}</p>
                    )}
                  </label>
                  <label className="form-field">
                    <span>Preview image URL</span>
                    <div className="input-with-action">
                      <input name="image" value={page.image} onChange={event => handleMetaChange(page.id, event)} />
                      <Button type="button" variant="ghost" onClick={() => handleOpenMediaPicker(page.id)} disabled={busy}>
                        Выбрать из библиотеки
                      </Button>
                    </div>
                    {page.image && (
                      <div className="seo-image-preview">
                        <img src={page.image} alt={page.label} loading="lazy" />
                        <a href={page.image} target="_blank" rel="noreferrer">
                          Открыть
                        </a>
                      </div>
                    )}
                  </label>
                  <div className="seo-card__actions">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => handleMovePage(page.id, "up")}
                      disabled={index === 0 || busy}
                      aria-label="Переместить выше"
                    >
                      ↑
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => handleMovePage(page.id, "down")}
                      disabled={index === pages.length - 1 || busy}
                      aria-label="Переместить ниже"
                    >
                      ↓
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => handleRemovePage(page.id)}
                      disabled={pages.length === 1 || busy}
                    >
                      Удалить
                    </Button>
                  </div>
                </div>
              </header>

              <div className="translation-grid">
                {(Object.keys(localeLabels) as Array<"ru" | "en">).map(locale => (
                  <article key={locale} className="translation-card">
                    <header className="translation-card__header">
                      <p className="eyebrow">{localeLabels[locale]}</p>
                    </header>
                    <label className="form-field">
                      <span>Meta title</span>
                      <input
                        name="title"
                        value={page.locales[locale].title}
                        onChange={event => handleLocaleChange(page.id, locale, event)}
                        maxLength={140}
                      />
                    </label>
                    <label className="form-field">
                      <span>Meta description</span>
                      <textarea
                        name="description"
                        rows={3}
                        value={page.locales[locale].description}
                        onChange={event => handleLocaleChange(page.id, locale, event)}
                        maxLength={320}
                      />
                    </label>
                    <label className="form-field">
                      <span>Keywords</span>
                      <input
                        name="keywords"
                        value={page.locales[locale].keywords}
                        onChange={event => handleLocaleChange(page.id, locale, event)}
                      />
                    </label>
                  </article>
                ))}
              </div>

              <div className="seo-preview" role="region" aria-label="SEO превью">
                <p className="seo-preview__url">{previewUrl}</p>
                <p className="seo-preview__title">{previewTitle}</p>
                <p className="seo-preview__description">{previewDescription}</p>
                {previewLocale.keywords && (
                  <ul className="seo-preview__keywords">
                    {previewLocale.keywords.split(",").map(keyword => (
                      <li key={keyword.trim()}>{keyword.trim()}</li>
                    ))}
                  </ul>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {mediaPicker.open && (
        <div className="media-picker" role="dialog" aria-modal="true">
          <div className="media-picker__backdrop" onClick={handleCloseMediaPicker} aria-hidden="true" />
          <div className="media-picker__panel">
            <header className="media-picker__header">
              <div>
                <p className="eyebrow">Выбор изображения</p>
                <p className="muted">Выберите обложку для Open Graph и превью.</p>
              </div>
              <div className="media-picker__header-actions">
                <Button type="button" variant="ghost" onClick={fetchMediaAssets} disabled={mediaPicker.loading}>
                  {mediaPicker.loading ? "Обновляем..." : "Обновить"}
                </Button>
                <Button type="button" variant="ghost" onClick={handleCloseMediaPicker}>
                  Закрыть
                </Button>
              </div>
            </header>
            {mediaPicker.error && <p className="form-error">{mediaPicker.error}</p>}
            <div className="media-picker__grid" aria-live="polite">
              {mediaPicker.loading ? (
                <p>Загружаем библиотеку…</p>
              ) : mediaPicker.assets.length === 0 ? (
                <p>Нет доступных файлов. Сначала загрузите изображение в медиабиблиотеку.</p>
              ) : (
                mediaPicker.assets.map(asset => (
                  <button
                    key={asset.id}
                    type="button"
                    className="media-picker__asset"
                    onClick={() => handleSelectMedia(asset)}
                  >
                    <div className="media-picker__thumb">
                      {asset.type === "image" ? (
                        <img src={asset.url} alt={asset.label} loading="lazy" />
                      ) : (
                        <span>{asset.type}</span>
                      )}
                    </div>
                    <strong>{asset.label}</strong>
                    <p>{asset.size}</p>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
