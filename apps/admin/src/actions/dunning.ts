"use server";

import { runDunningAutomation, type DunningRunInput, type DunningRunResult } from "../lib/api";

export async function runDunningAutomationAction(input: DunningRunInput = {}): Promise<DunningRunResult> {
  return runDunningAutomation(input);
}
