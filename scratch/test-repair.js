function repairAndParseJson(raw) {
  // 1. Strip markdown fences
  let s = raw.trim();
  s = s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

  // 2. Extract outermost { ... }
  const first = s.indexOf("{");
  const last = s.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last > first) {
    s = s.slice(first, last + 1);
  }

  // 3. Pre-repair: Fix "daily_quote": "Quote text." — First Last (author outside quotes)
  s = s.split("\n").map(line => {
    const quoteMatch = line.match(/^(\s*"daily_quote"\s*:\s*")(.*)"\s*[—–-]\s*([^",]+)(\s*,?\s*)$/);
    if (quoteMatch) {
      const prefix = quoteMatch[1];
      const quoteText = quoteMatch[2];
      const author = quoteMatch[3].trim();
      const suffix = quoteMatch[4];
      return `${prefix}${quoteText} — ${author}"${suffix}`;
    }
    return line;
  }).join("\n");

  // 4. Escape unescaped double quotes inside all JSON string values (line-by-line)
  s = s.split("\n").map((line) => {
    const match = line.match(/^(\s*"[a-zA-Z_0-9]+"\s*:\s*")(.*)("\s*,?\s*)$/);
    if (match) {
      const prefix = match[1];
      const val = match[2];
      const suffix = match[3];
      // Escape any unescaped double quotes inside the value
      const escapedVal = val.replace(/(?<!\\)"/g, '\\"');
      return prefix + escapedVal + suffix;
    }
    return line;
  }).join("\n");

  // 5. Remove trailing commas before ] or }
  s = s.replace(/,\s*([}\]])/g, "$1");

  // 6. Fix lone backslashes inside JSON string values
  s = s.replace(
    /("(?:[^"\\]|\\.)*")/g,
    (match) => {
      return match.replace(/\\(\\|"|n|r|t|b|f|u[0-9a-fA-F]{4})|\\/g, (m, g1) => {
        if (g1) return m; // already-valid escape — leave alone
        return "\\\\"; // lone backslash → double-escape
      });
    }
  );

  return JSON.parse(s);
}

// Test cases
const tests = [
  // Test 1: author outside double quotes
  `{
    "daily_quote": "Education is the most powerful weapon you can use to change the world." — Nelson Mandela
  }`,
  // Test 2: unescaped quotes inside string
  `{
    "study_tip": "Focus on the "active recall" method for revision."
  }`,
  // Test 3: trailing comma and latex slash
  `{
    "study_tip": "Solve the quadratic equation: \\sqrt{b^2 - 4ac}",
  }`
];

tests.forEach((t, i) => {
  try {
    const parsed = repairAndParseJson(t);
    console.log(`Test ${i + 1} PASSED:`, parsed);
  } catch (err) {
    console.error(`Test ${i + 1} FAILED:`, err.message);
    console.error("Original input was:", t);
  }
});
