export const FILE_EXTENSION_PRESETS = [
  "pdf",
  "jpg",
  "jpeg",
  "png",
  "doc",
  "docx",
  "xls",
  "xlsx",
] as const;

export const DEFAULT_MAX_FILE_SIZE_MB = 10;
export const DEFAULT_MAX_FILE_COUNT = 5;
export const MAX_FILE_COUNT_LIMIT = 10;
export const MAX_FILE_SIZE_MB_LIMIT = 50;

export const DEFAULT_FILE_FIELD_CONFIG = {
  multiple: false,
  maxCount: 1,
  maxFileSizeMB: DEFAULT_MAX_FILE_SIZE_MB,
  allowedExtensions: [] as string[],
};

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(String).filter(Boolean);
}

export function normalizeFileExtensions(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const raw of values) {
    const ext = String(raw).trim().toLowerCase().replace(/^\.+/, "");
    if (!ext || seen.has(ext)) continue;
    seen.add(ext);
    result.push(ext);
  }

  return result;
}

export interface LoadedFileFieldConfig {
  multiple: boolean;
  maxCount: number;
  maxFileSizeMB: number;
  allowedExtensions: string[];
  acceptMimeTypes: string[];
}

export function loadFileFieldConfig(
  config: Record<string, unknown> | undefined,
): LoadedFileFieldConfig {
  const cfg = config ?? {};
  const validation =
    cfg.validation && typeof cfg.validation === "object" && !Array.isArray(cfg.validation)
      ? (cfg.validation as Record<string, unknown>)
      : {};

  const allowedExtensions = normalizeFileExtensions([
    ...readStringArray(cfg.allowedExtensions),
    ...readStringArray(validation.allowedExtensions),
  ]);

  const acceptMimeTypes = [
    ...readStringArray(cfg.accept),
    ...readStringArray(validation.allowedMimeTypes),
  ].filter((value, index, array) => array.indexOf(value) === index);

  const inferredMultiple =
    cfg.multiple === true ||
    (cfg.multiple !== false &&
      Number(cfg.maxFiles ?? validation.maxFileCount ?? cfg.maxCount) > 1);

  let maxCount = Number(
    cfg.maxCount ?? validation.maxFileCount ?? cfg.maxFiles ?? (inferredMultiple ? DEFAULT_MAX_FILE_COUNT : 1),
  );
  if (!Number.isFinite(maxCount) || maxCount < 1) {
    maxCount = inferredMultiple ? DEFAULT_MAX_FILE_COUNT : 1;
  }
  maxCount = Math.min(MAX_FILE_COUNT_LIMIT, Math.max(1, Math.floor(maxCount)));

  let maxFileSizeMB = Number(cfg.maxFileSizeMB ?? validation.maxFileSizeMB ?? DEFAULT_MAX_FILE_SIZE_MB);
  if (!Number.isFinite(maxFileSizeMB) || maxFileSizeMB < 1) {
    maxFileSizeMB = DEFAULT_MAX_FILE_SIZE_MB;
  }
  maxFileSizeMB = Math.min(MAX_FILE_SIZE_MB_LIMIT, Math.max(1, Math.floor(maxFileSizeMB)));

  return {
    multiple: inferredMultiple,
    maxCount: inferredMultiple ? maxCount : 1,
    maxFileSizeMB,
    allowedExtensions,
    acceptMimeTypes,
  };
}

export function fileFieldConfigToPatch(
  loaded: LoadedFileFieldConfig,
  patch: Partial<LoadedFileFieldConfig>,
): Record<string, unknown> {
  const next = { ...loaded, ...patch };
  const multiple = next.multiple === true;
  const maxCount = multiple
    ? Math.min(
        MAX_FILE_COUNT_LIMIT,
        Math.max(1, Math.floor(next.maxCount || DEFAULT_MAX_FILE_COUNT)),
      )
    : 1;

  const result: Record<string, unknown> = {
    multiple,
    maxCount,
    maxFileSizeMB: Math.min(
      MAX_FILE_SIZE_MB_LIMIT,
      Math.max(1, Math.floor(next.maxFileSizeMB || DEFAULT_MAX_FILE_SIZE_MB)),
    ),
    allowedExtensions: normalizeFileExtensions(next.allowedExtensions),
  };

  const acceptMimeTypes = next.acceptMimeTypes.map((value) => value.trim()).filter(Boolean);
  result.accept = acceptMimeTypes;

  return result;
}
