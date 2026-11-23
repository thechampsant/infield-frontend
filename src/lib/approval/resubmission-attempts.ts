export const RESUBMISSION_ATTEMPTS_LABEL = "Maximum Re-submission Attempts";
export const RESUBMISSION_ATTEMPTS_HELP =
  "Additional attempts after rejection, excluding the initial submission. Set 0 to disable.";

export function resubmissionAttemptsError(value: unknown): string | null {
  const number = typeof value === "string" && value.trim() !== ""
    ? Number(value)
    : typeof value === "number" ? value : NaN;
  return Number.isInteger(number) && number >= 0
    ? null
    : `${RESUBMISSION_ATTEMPTS_LABEL} must be a whole number greater than or equal to 0.`;
}

export function parseResubmissionAttempts(value: unknown): number {
  const error = resubmissionAttemptsError(value);
  if (error) throw new Error(error);
  return Number(value);
}
