"use client";

import { useMessages } from "next-intl";
import type { TranslationShape } from "../lib/i18n.config";

export function useCopy(): TranslationShape {
  const messages = useMessages();
  return messages as unknown as TranslationShape;
}
