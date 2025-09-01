export function hasRequiredFields(job: unknown, requiredFields: Record<string, string>): boolean {
  if (typeof job !== "object" || job === null) {
    return false;
  }

  for (const [field, type] of Object.entries(requiredFields)) {
    if (!(field in job)) {
      return false;
    }

    if (type === "date" && !(job[field] instanceof Date)) {
      return false;
    }

    if (typeof job[field] !== type) {
      return false;
    }
  }

  return true;
}

export function hasOptionalFields(job: unknown, optionalFields: Record<string, string>): boolean {
  if (typeof job !== "object" || job === null) {
    return false;
  }

  for (const [field, type] of Object.entries(optionalFields)) {
    if (!(field in job)) {
      continue;
    }

    if (type === "date" && !(job[field] instanceof Date)) {
      return false;
    }

    if (typeof job[field] !== type) {
      return false;
    }
  }

  return true;
}
