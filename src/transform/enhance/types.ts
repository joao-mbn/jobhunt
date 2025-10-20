import type { CleanJob, EnhancedJob } from "../../types/definitions/job.ts";

export type AIGeneratedEnhancedJobInfo = Omit<
  EnhancedJob,
  keyof CleanJob | "uploadedToSheet"
>;
