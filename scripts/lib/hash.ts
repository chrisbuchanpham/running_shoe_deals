import { createHash } from "node:crypto";

export function stableId(prefix: string, ...parts: string[]): string {
  const hash = createHash("sha1");
  for (const part of parts) {
    hash.update(part);
    hash.update("|");
  }
  return `${prefix}_${hash.digest("hex").slice(0, 12)}`;
}
