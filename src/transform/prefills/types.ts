import type { BaseRecord, Prefills } from "../../types/definitions/job.ts";

export type AIGeneratedPrefillsInfo = Omit<
  Prefills,
  keyof BaseRecord | "enhancedJobId"
>;
