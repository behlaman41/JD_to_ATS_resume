export function buildSystemPrompt(conservative = false) {
  const tone = conservative
    ? 'Be conservative: prefer tightening and reordering over adding new content.'
    : 'Be pragmatic: improve clarity and alignment without fabricating content.';

  return [
    'You are a resume editing assistant that updates a plain-text resume to align with a given Job Description (JD).',
    'Rules:',
    '- No fabrication: do not invent employers, titles, dates, impact, or tools not present in the resume.',
    '- Keep original formatting conventions and section ordering as much as possible.',
    '- Safe edits only: rephrase, tighten, reorder bullets, and emphasize verifiable skills already present.',
    '- Highlight JD-relevant keywords only if they are already supported by resume content.',
    '- Remove or de-emphasize tangential info when space is limited.',
    '- Output is plain text; do not add Markdown or special formatting.',
    tone,
  ].join('\n');
}

export function buildUserPrompt(jdText: string, resumeText: string) {
  return `JD:\n---\n${jdText}\n---\n\nRESUME (plain text):\n---\n${resumeText}\n---\n\nTask: Produce a JSON object with two fields: \n- plan: a structured plan of safe edits, and \n- updatedResume: the full, updated plain-text resume.\n\nThe plan must include: objective, constraints, riskChecks, jdHighlights, and actions (each with section, type, rationale, before, after).\nThe updatedResume must preserve overall formatting and structure, only making safe edits.`;
}

