/** Display "Name (EMP001)" for user pickers. Name only when code is missing. */
export function formatUserNameWithCode(name: string, employeeId?: string | null): string {
  const trimmedName = name.trim();
  const code = employeeId?.trim();
  if (!code) return trimmedName;
  return `${trimmedName} (${code})`;
}
