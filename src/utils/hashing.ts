import { createHash } from "crypto";

/**
 * Returns the SHA-256 hex digest of the given string content.
 */
export function hashContent(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}
