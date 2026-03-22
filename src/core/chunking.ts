import { parseFile, isSupportedExtension, type ParsedNode } from "./parser.js";
import { extname } from "path";

export interface Chunk {
  content: string;
  chunkType: string;
  name: string | null;
  startLine: number | null;
  endLine: number | null;
} 

const MAX_CHUNK_CHARS = 4000;
const FALLBACK_CHUNK_LINES = 60;

/**
 * Splits source code into AST-aware chunks.
 * For supported file types, each top-level declaration becomes a chunk.
 * Long declarations are split further. Non-code files fall back to
 * line-window chunks.
 */
export function chunkFile(code: string, filePath: string): Chunk[] {
  const ext = extname(filePath);

  if (isSupportedExtension(ext)) {
    return chunkAst(code, filePath);
  }

  return chunkByLines(code);
}

function chunkAst(code: string, filePath: string): Chunk[] {
  const nodes: ParsedNode[] = parseFile(code, filePath);
  const chunks: Chunk[] = [];

  for (const node of nodes) {
    if (node.content.length <= MAX_CHUNK_CHARS) {
      chunks.push({
        content: node.content,
        chunkType: node.type,
        name: node.name,
        startLine: node.startLine,
        endLine: node.endLine,
      });
    } else {
      // Split oversized node into line windows
      const subChunks = chunkByLines(node.content, node.startLine);
      for (const sub of subChunks) {
        sub.chunkType = node.type;
        sub.name = node.name;
        chunks.push(sub);
      }
    }
  }

  // If the AST produced no chunks (e.g. a file with only imports/comments),
  // fall back to line-based chunking so content is still indexed.
  if (chunks.length === 0) {
    return chunkByLines(code);
  }

  return chunks;
}

function chunkByLines(
  code: string,
  lineOffset = 1
): Chunk[] {
  const lines = code.split("\n");
  const chunks: Chunk[] = [];

  for (let i = 0; i < lines.length; i += FALLBACK_CHUNK_LINES) {
    const slice = lines.slice(i, i + FALLBACK_CHUNK_LINES);
    const content = slice.join("\n").trim();
    if (!content) continue;
    chunks.push({
      content,
      chunkType: "text",
      name: null,
      startLine: lineOffset + i,
      endLine: lineOffset + i + slice.length - 1,
    });
  }

  return chunks;
}
