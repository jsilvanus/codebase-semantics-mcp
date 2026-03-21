const DEFAULT_OLLAMA_BASE_URL = "http://localhost:11434";
const DEFAULT_EMBED_MODEL = "nomic-embed-text";

export interface OllamaConfig {
  baseUrl?: string;
  model?: string;
}

/**
 * Generates an embedding vector for the given text using Ollama.
 * Returns a Float32Array containing the embedding.
 */
export async function embed(
  text: string,
  config: OllamaConfig = {}
): Promise<Float32Array> {
  const baseUrl = config.baseUrl ?? DEFAULT_OLLAMA_BASE_URL;
  const model = config.model ?? DEFAULT_EMBED_MODEL;

  const response = await fetch(`${baseUrl}/api/embed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, input: text }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Ollama embed request failed (${response.status}): ${body}`
    );
  }

  const data = (await response.json()) as { embeddings: number[][] };

  if (!data.embeddings || data.embeddings.length === 0) {
    throw new Error("Ollama returned no embeddings");
  }

  return new Float32Array(data.embeddings[0]);
}

/**
 * Computes the cosine similarity between two vectors.
 * Returns a value in [-1, 1] where 1 is most similar.
 */
export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) {
    throw new Error(
      `Vector length mismatch: ${a.length} vs ${b.length}`
    );
  }
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
