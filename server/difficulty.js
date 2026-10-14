/**
 * Classify an issue only when its labels contain an explicit difficulty signal.
 * This is a documented heuristic, not a guarantee of actual implementation effort.
 * Unknown or malformed labels intentionally fall back to Unclassified.
 */
export function classifyDifficulty(issue = {}) {
  const labels = (Array.isArray(issue.labels) ? issue.labels : [])
    .map(label => typeof label === 'string' ? label : label?.name)
    .filter(label => typeof label === 'string')
    .map(label => label.trim().toLowerCase());

  // Precedence is deliberate and tested when repositories apply conflicting labels.
  if (labels.some(label => /good first issue|first-timers-only|beginner|easy|starter issue/.test(label))) return 'Beginner';
  if (labels.some(label => /intermediate|medium difficulty|moderate/.test(label))) return 'Intermediate';
  if (labels.some(label => /hard|advanced|difficult|expert/.test(label))) return 'Advanced';
  return 'Unclassified';
}
