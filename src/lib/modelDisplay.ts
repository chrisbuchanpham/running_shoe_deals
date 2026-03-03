function isAllCapsToken(token: string): boolean {
  const lettersOnly = token.replace(/[^A-Za-z]/g, "");
  return lettersOnly.length >= 2 && lettersOnly === lettersOnly.toUpperCase();
}

function toTitleCaseToken(token: string): string {
  return token.replace(/[A-Za-z]+/g, (word) => {
    const [first = "", ...rest] = word;
    return `${first.toUpperCase()}${rest.join("").toLowerCase()}`;
  });
}

export function formatModelDisplay(slugOrText: string): string {
  const cleaned = slugOrText.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
  if (!cleaned) return "";

  return cleaned
    .split(" ")
    .map((token) => (isAllCapsToken(token) ? token : toTitleCaseToken(token)))
    .join(" ");
}

export function formatSizeDisplay(sizeRange?: string): string | undefined {
  if (!sizeRange) return undefined;

  const cleaned = sizeRange.replace(/_+/g, " ").replace(/\s+/g, " ").trim();
  return cleaned || undefined;
}
