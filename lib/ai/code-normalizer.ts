const MAX_CONSECUTIVE_BLANK_LINES = 2;

function normalizeWhitespace(code: string) {
  const normalizedLines = code
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/\t/g, "  ").replace(/\s+$/g, ""));

  const output: string[] = [];
  let blankLineCount = 0;

  for (const line of normalizedLines) {
    const isBlank = line.trim().length === 0;

    if (isBlank) {
      blankLineCount += 1;
      if (blankLineCount > MAX_CONSECUTIVE_BLANK_LINES) {
        continue;
      }
    } else {
      blankLineCount = 0;
    }

    output.push(line);
  }

  return output.join("\n").trim();
}

export function normalizeCodeForDisplay(code: string, language?: string) {
  const normalizedLanguage = language?.toLowerCase();

  if (normalizedLanguage === "json") {
    try {
      return {
        formattedCode: JSON.stringify(JSON.parse(code), null, 2),
        warning: "Lightweight formatting applied.",
      };
    } catch {
      // Fall through to generic normalization for invalid JSON.
    }
  }

  return {
    formattedCode: normalizeWhitespace(code),
    warning: "Lightweight formatting applied.",
  };
}
