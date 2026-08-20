import type { UDFField, UDFValue } from "@/types/project-admin";

export const SHIFT_START_FIELD_KEY = "shiftStartTime";
export const SHIFT_END_FIELD_KEY = "shiftEndTime";

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isShiftTimeFieldKey(fieldKey: string): boolean {
  return fieldKey === SHIFT_START_FIELD_KEY || fieldKey === SHIFT_END_FIELD_KEY;
}

function stringValue(value: UDFValue | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

function timeToMinutes(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

export function validateShiftTimes(
  fields: UDFField[],
  values: Record<string, UDFValue>,
  entityLabel = "user",
): { errorKeys: string[]; message: string } | null {
  const startField = fields.find((field) => field.fieldKey === SHIFT_START_FIELD_KEY);
  const endField = fields.find((field) => field.fieldKey === SHIFT_END_FIELD_KEY);

  if (!startField && !endField) return null;

  const start = stringValue(values[SHIFT_START_FIELD_KEY]);
  const end = stringValue(values[SHIFT_END_FIELD_KEY]);
  const errorKeys = [startField, endField]
    .filter((field): field is UDFField => Boolean(field))
    .map((field) => `udf_${field.id}`);

  if (!start && !end) return null;

  if (!start || !end) {
    return {
      errorKeys,
      message: "Shift start and end time must both be filled, or both left blank.",
    };
  }

  if (!TIME_PATTERN.test(start) || !TIME_PATTERN.test(end)) {
    return {
      errorKeys,
      message: "Shift timings must use HH:mm format.",
    };
  }

  const startIsBypass = start === "00:00";
  const endIsBypass = end === "00:00";
  if (startIsBypass || endIsBypass) {
    return startIsBypass && endIsBypass
      ? null
      : {
          errorKeys,
          message: `Use 00:00 for both shift timings to bypass shift logic for a ${entityLabel}.`,
        };
  }

  if (timeToMinutes(end) <= timeToMinutes(start)) {
    return {
      errorKeys,
      message: "Shift end time must be later than shift start time.",
    };
  }

  return null;
}

export function validateUserShiftTimes(
  fields: UDFField[],
  values: Record<string, UDFValue>,
): { errorKeys: string[]; message: string } | null {
  return validateShiftTimes(fields, values, "user");
}
