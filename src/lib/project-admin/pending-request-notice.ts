/** One displayed line of a pending-request notice. */
export interface NoticeLine {
  text: string;
  /** The count line ("… has 6 pending requests:"). */
  isHeadline: boolean;
  /** Says what happens next or what to do ("These will stay with …", "Please close …"). */
  isOutcome: boolean;
}

const OUTCOME_PATTERN = /will stay with|will be routed to|Please close all pending|Please assign a Project Admin/i;
/** Breaks "… has 6 pending requests: Leaves (2) …" after the colon, but not "Manager: Ravi". */
const COUNT_COLON = /^(.*?\bpending (?:requests?|approvals?):)\s+(.+)$/i;

/**
 * Splits a backend pending-request message into display lines: one per sentence, plus the
 * request list on its own line after "N pending requests:". Splits only where a sentence
 * ends and the next starts with a capital or a digit, so codes such as "(E2)." stay intact.
 */
export function splitNoticeLines(message: string): NoticeLine[] {
  const sentences = message
    .split(/(?<=\.)\s+(?=[A-Z0-9])/)
    .map((part) => part.trim())
    .filter(Boolean);

  const parts: string[] = [];
  for (const sentence of sentences) {
    const match = parts.length === 0 ? COUNT_COLON.exec(sentence) : null;
    if (match) {
      parts.push(match[1], match[2]);
    } else {
      parts.push(sentence);
    }
  }

  return parts.map((text, index) => ({
    text,
    isHeadline: index === 0 && parts.length > 1 && !OUTCOME_PATTERN.test(text),
    isOutcome: OUTCOME_PATTERN.test(text),
  }));
}
