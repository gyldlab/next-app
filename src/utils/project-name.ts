const LEADING_INVALID_CHARS = /^([._]|-)+/;
const INVALID_PACKAGE_CHARS = /[^a-z0-9-~]+/g;

export function toValidPackageName(input: string): string {
  const normalized = input
    .trim()
    .toLowerCase()
    .replace(/[\s._]+/g, "-")
    .replace(INVALID_PACKAGE_CHARS, "-")
    .replace(/-+/g, "-")
    .replace(LEADING_INVALID_CHARS, "")
    .replace(/-$/g, "");

  return normalized || "next-app";
}
