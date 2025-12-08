"use server";

import {
  getProgressAutomationSettings,
  triggerProgressAutomationTest,
  updateProgressAutomationSettings,
  type ProgressAutomationSettings,
  type ProgressAutomationTestResult,
  type ProgressAutomationUpdateInput
} from "../lib/api";

export async function getProgressAutomationSettingsAction(): Promise<ProgressAutomationSettings> {
  return getProgressAutomationSettings();
}

export async function updateProgressAutomationSettingsAction(
  payload: ProgressAutomationUpdateInput
): Promise<ProgressAutomationSettings> {
  return updateProgressAutomationSettings(payload);
}

export async function triggerProgressAutomationTestAction(): Promise<ProgressAutomationTestResult> {
  return triggerProgressAutomationTest();
}
