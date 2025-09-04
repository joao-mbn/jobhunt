export function toDateStringSafely(date?: Date): string | undefined {
  if (!date) {
    return undefined;
  }

  if (isNaN(date.getTime())) {
    return undefined;
  }

  return date.toISOString();
}

export function fromDateStringSafely(dateString?: string): Date | undefined {
  if (!dateString) {
    return undefined;
  }

  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return undefined;
  }

  return date;
}
