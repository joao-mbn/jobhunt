import type { CleanJob, RawJob } from "../../../types/definitions/job.ts";
import type { TransformResult } from "../../types.ts";

export interface Cleaner {
  clean(rawJobs: RawJob[]): Promise<TransformResult<CleanJob>[]>;
}
