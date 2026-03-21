import { parse, simpleTraverse } from "@typescript-eslint/typescript-estree";
import type { TSESTree } from "@typescript-eslint/typescript-estree";

export interface ParsedNode {
  type: string;
  name: string | null;
  startLine: number;
  endLine: number;
  content: string;
}

const SUPPORTED_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".mts",
  ".cts",
]);

export function isSupportedExtension(ext: string): boolean {
  return SUPPORTED_EXTENSIONS.has(ext.toLowerCase());
}

/**
 * Parses a TypeScript/JavaScript/JSX file into top-level AST nodes.
 * Returns an array of ParsedNode representing meaningful code units
 * (functions, classes, interfaces, type aliases, etc.).
 */
export function parseFile(
  code: string,
  filePath: string
): ParsedNode[] {
  const isTsx = filePath.endsWith(".tsx") || filePath.endsWith(".jsx");

  let ast: TSESTree.Program;
  try {
    ast = parse(code, {
      jsx: isTsx,
      loc: true,
      range: true,
      tolerant: true,
    });
  } catch {
    return [];
  }

  const lines = code.split("\n");
  const nodes: ParsedNode[] = [];

  const extractName = (node: TSESTree.Node): string | null => {
    switch (node.type) {
      case "FunctionDeclaration":
        return node.id?.name ?? null;
      case "ClassDeclaration":
        return node.id?.name ?? null;
      case "TSInterfaceDeclaration":
        return node.id.name;
      case "TSTypeAliasDeclaration":
        return node.id.name;
      case "TSEnumDeclaration":
        return node.id.name;
      case "VariableDeclaration": {
        const decl = node.declarations[0];
        if (decl?.id.type === "Identifier") return decl.id.name;
        return null;
      }
      case "ExportNamedDeclaration":
        if (node.declaration) return extractName(node.declaration);
        return null;
      case "ExportDefaultDeclaration":
        return extractName(node.declaration);
      case "MethodDefinition": {
        const key = node.key;
        if (key.type === "Identifier") return key.name;
        return null;
      }
      default:
        return null;
    }
  };

  const isTopLevel = (node: TSESTree.Node): boolean => {
    return (
      node.type === "FunctionDeclaration" ||
      node.type === "ClassDeclaration" ||
      node.type === "TSInterfaceDeclaration" ||
      node.type === "TSTypeAliasDeclaration" ||
      node.type === "TSEnumDeclaration" ||
      node.type === "VariableDeclaration" ||
      node.type === "ExportNamedDeclaration" ||
      node.type === "ExportDefaultDeclaration"
    );
  };

  simpleTraverse(ast, {
    enter(node) {
      if (!isTopLevel(node)) return;
      if (!node.loc) return;

      const startLine = node.loc.start.line;
      const endLine = node.loc.end.line;
      const content = lines
        .slice(startLine - 1, endLine)
        .join("\n");

      nodes.push({
        type: node.type,
        name: extractName(node),
        startLine,
        endLine,
        content,
      });
    },
  });

  return nodes;
}
