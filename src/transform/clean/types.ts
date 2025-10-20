import type { CleanJob, RawJob } from "../../types/definitions/job.ts";

export type AIGeneratedCleanJobInfo = Omit<
  CleanJob,
  keyof RawJob | "jobDescription"
>;
