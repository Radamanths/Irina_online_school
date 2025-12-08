"use server";

import { getSeoSettings, updateSeoSettings } from "../lib/api";
import type { SeoSettings } from "../lib/api";

export async function getSeoSettingsAction() {
  return getSeoSettings();
}

export async function updateSeoSettingsAction(payload: SeoSettings) {
  return updateSeoSettings(payload);
}
