import type { BaseRecord, Prefills } from "../../types/definitions/job.ts";

export type PrefillsResult = PrefillsResultSuccess | PrefillsResultFailure;

export interface PrefillsResultSuccess {
  success: true;
  enhancedJobId: string;
  prefills: Prefills;
}

export interface PrefillsResultFailure {
  success: false;
  enhancedJobId: string;
  prefills: null;
}

export type AIGeneratedPrefillsInfo = Omit<Prefills, keyof BaseRecord | "enhancedJobId">;
