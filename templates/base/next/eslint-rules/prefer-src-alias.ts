import path from "node:path";

import type { Rule } from "eslint";

const RELATIVE_IMPORT_PATTERN = /^\.{1,2}\//;

type SourceNode = {
  value: unknown;
};

function normalizePath(value: string) {
  return value.split(path.sep).join("/");
}

function getAliasImportPath(filename: string, importSource: string, srcRoot: string) {
  const normalizedSrcRoot = normalizePath(srcRoot);
  const currentDirectory = path.dirname(filename);
  const resolvedImportPath = path.resolve(currentDirectory, importSource);
  const normalizedResolvedImportPath = normalizePath(resolvedImportPath);

  if (!normalizedResolvedImportPath.startsWith(`${normalizedSrcRoot}/`)) {
    return null;
  }

  return normalizePath(path.relative(srcRoot, resolvedImportPath));
}

const preferSrcAliasRule: Rule.RuleModule = {
  meta: {
    type: "suggestion",
    docs: {
      description: "Rewrite relative imports inside src to @/ absolute aliases.",
    },
    fixable: "code",
    schema: [],
    messages: {
      useAlias: "Use @/ absolute imports instead of relative imports inside src.",
    },
  },
  create(context) {
    const filename = context.filename;
    const srcRoot = path.resolve(process.cwd(), "src");

    if (!filename || filename === "<input>") {
      return {};
    }

    const normalizedFilename = normalizePath(filename);
    const normalizedSrcRoot = normalizePath(srcRoot);

    if (!normalizedFilename.startsWith(`${normalizedSrcRoot}/`)) {
      return {};
    }

    function reportIfRelative(sourceNode: SourceNode) {
      const importSource = sourceNode.value;

      if (typeof importSource !== "string") {
        return;
      }

      if (!RELATIVE_IMPORT_PATTERN.test(importSource)) {
        return;
      }

      const aliasPath = getAliasImportPath(filename, importSource, srcRoot);

      if (!aliasPath) {
        return;
      }

      context.report({
        node: sourceNode as never,
        messageId: "useAlias",
        fix(fixer) {
          return fixer.replaceText(sourceNode as never, `"@/${aliasPath}"`);
        },
      });
    }

    return {
      ImportDeclaration(node) {
        if (!node.source) {
          return;
        }

        reportIfRelative(node.source as SourceNode);
      },
      ExportNamedDeclaration(node) {
        if (!node.source) {
          return;
        }

        reportIfRelative(node.source as SourceNode);
      },
    };
  },
};

export default preferSrcAliasRule;
