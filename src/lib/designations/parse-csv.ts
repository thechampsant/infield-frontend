/**
 * Client-side parsing + validation for the designation bulk upload (INF2-1535
 * AC2/AC15). The backend has no designation Excel endpoint, so the template is
 * parsed here and posted as a JSON array to `createDesignations`.
 *
 * Template columns: "Designation Name", "Role" (both mandatory).
 */

import type { BackendRole } from "@/lib/api/role-service";
import { normalizeRoleName } from "./backend-roles";

export interface ParsedDesignationRow {
  name: string;
  roleId: string;
}

export interface CsvParseResult {
  rows: ParsedDesignationRow[];
  errors: string[];
}

/** Split a single CSV line, honoring double-quoted fields. */
function splitCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      fields.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  fields.push(current);
  return fields.map((f) => f.trim());
}

export function parseDesignationCsv(
  text: string,
  roles: BackendRole[],
): CsvParseResult {
  const roleByName = new Map(
    roles.map((r) => [normalizeRoleName(r.roleName), r] as const),
  );

  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return { rows: [], errors: ["The file is empty."] };
  }

  const header = splitCsvLine(lines[0]).map((h) => h.toLowerCase());
  const nameIdx = header.findIndex((h) => h.includes("designation"));
  const roleIdx = header.findIndex((h) => h === "role" || h.includes("role"));

  if (nameIdx === -1 || roleIdx === -1) {
    return {
      rows: [],
      errors: [
        'Missing required columns. Expected "Designation Name" and "Role".',
      ],
    };
  }

  const rows: ParsedDesignationRow[] = [];
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const rowNum = i;
    const cols = splitCsvLine(lines[i]);
    const name = (cols[nameIdx] ?? "").trim();
    const roleText = (cols[roleIdx] ?? "").trim();

    if (!name) {
      errors.push(`Row ${rowNum}: Designation name is required`);
      continue;
    }
    if (!roleText) {
      errors.push(`Row ${rowNum}: Role is mandatory`);
      continue;
    }

    const match = roleByName.get(normalizeRoleName(roleText));
    if (!match) {
      errors.push(`Invalid role value in row ${rowNum}`);
      continue;
    }

    rows.push({ name, roleId: match.id });
  }

  return { rows, errors };
}
