const WINDOWS_DRIVE_PATTERN = /^[A-Za-z]:/;

type ParsedPath = {
  readonly absolute: boolean;
  readonly root: string;
  readonly segments: string[];
};

export function normalizePathSeparators(value: string): string {
  return value.replace(/\\+/g, "/");
}

export function basenamePath(value: string): string {
  const parsed = parsePath(value);

  if (parsed.segments.length === 0) {
    return parsed.root || ".";
  }

  return parsed.segments.at(-1) ?? ".";
}

export function dirnamePath(value: string): string {
  const parsed = parsePath(value);

  if (parsed.segments.length <= 1) {
    if (parsed.absolute) {
      return parsed.root || "/";
    }

    return ".";
  }

  return buildPath({
    absolute: parsed.absolute,
    root: parsed.root,
    segments: parsed.segments.slice(0, -1),
  });
}

export function joinPath(...parts: readonly string[]): string {
  if (parts.length === 0) {
    return ".";
  }

  let parsed = parsePath(parts[0] ?? ".");

  for (const part of parts.slice(1)) {
    const next = parsePath(part);

    if (next.absolute) {
      parsed = next;
      continue;
    }

    parsed = {
      absolute: parsed.absolute,
      root: parsed.root,
      segments: normalizeSegments([...parsed.segments, ...next.segments], parsed.absolute),
    };
  }

  return buildPath(parsed);
}

export function relativePath(from: string, to: string): string {
  const fromPath = parsePath(resolvePath(from));
  const toPath = parsePath(resolvePath(to));

  if (fromPath.root.toLowerCase() !== toPath.root.toLowerCase()) {
    return buildPath(toPath);
  }

  let commonLength = 0;

  while (
    commonLength < fromPath.segments.length &&
    commonLength < toPath.segments.length &&
    fromPath.segments[commonLength] === toPath.segments[commonLength]
  ) {
    commonLength += 1;
  }

  const upwardSegments = new Array(fromPath.segments.length - commonLength).fill("..");
  const downwardSegments = toPath.segments.slice(commonLength);
  const relativeSegments = [...upwardSegments, ...downwardSegments];

  return relativeSegments.length > 0 ? relativeSegments.join("/") : ".";
}

export function resolvePath(...parts: readonly string[]): string {
  let parsed = parsePath(process.cwd());

  for (const part of parts) {
    const next = parsePath(part);

    if (next.absolute) {
      parsed = next;
      continue;
    }

    parsed = {
      absolute: parsed.absolute,
      root: parsed.root,
      segments: normalizeSegments([...parsed.segments, ...next.segments], parsed.absolute),
    };
  }

  return buildPath(parsed);
}

function buildPath(parsed: ParsedPath): string {
  if (parsed.absolute) {
    if (parsed.root === "/") {
      return parsed.segments.length > 0 ? `/${parsed.segments.join("/")}` : "/";
    }

    return parsed.segments.length > 0 ? `${parsed.root}${parsed.segments.join("/")}` : parsed.root;
  }

  return parsed.segments.length > 0 ? parsed.segments.join("/") : ".";
}

function normalizeSegments(segments: readonly string[], absolute: boolean): string[] {
  const normalized: string[] = [];

  for (const segment of segments) {
    if (segment === "." || segment.length === 0) {
      continue;
    }

    if (segment === "..") {
      const previousSegment = normalized.at(-1);

      if (previousSegment && previousSegment !== "..") {
        normalized.pop();
        continue;
      }

      if (!absolute) {
        normalized.push("..");
      }

      continue;
    }

    normalized.push(segment);
  }

  return normalized;
}

function parsePath(value: string): ParsedPath {
  const normalizedValue = normalizePathSeparators(value).trim();

  if (normalizedValue.length === 0 || normalizedValue === ".") {
    return {
      absolute: false,
      root: "",
      segments: [],
    };
  }

  if (WINDOWS_DRIVE_PATTERN.test(normalizedValue)) {
    const drive = normalizedValue.slice(0, 2);
    const withoutDrive = normalizedValue.slice(2).replace(/^\/+/, "");

    return {
      absolute: true,
      root: `${drive}/`,
      segments: normalizeSegments(withoutDrive.split("/"), true),
    };
  }

  if (normalizedValue.startsWith("/")) {
    return {
      absolute: true,
      root: "/",
      segments: normalizeSegments(normalizedValue.slice(1).split("/"), true),
    };
  }

  return {
    absolute: false,
    root: "",
    segments: normalizeSegments(normalizedValue.split("/"), false),
  };
}
