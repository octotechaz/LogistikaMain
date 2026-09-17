export function parseZodError(error: unknown) {
  if (typeof error === "object" && error && "issues" in error) {
    return (error as { issues: Array<{ path: Array<string | number>; message: string }> }).issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message
    }));
  }

  return undefined;
}

export function normalizeNumber(value: unknown) {
  if (value === "" || value === null || value === undefined) return null;
  if (typeof value === "string") return Number(value.replace(",", "."));
  return Number(value);
}
