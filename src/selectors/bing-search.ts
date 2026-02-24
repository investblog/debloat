/**
 * CSS selectors for Bing Search Copilot / AI elements.
 * These break when Bing updates its UI — keep them modular for fast patching.
 */

/** Copilot Search answer panel (AI-generated summary at top of SERP) */
export const COPILOT_ANSWER = ['#copans_container', '#b_genserp_container'];

/** QnA AI-generated answer block (quick answer with sources carousel) */
export const QNA_ANSWER = ['.qna_tlgacont'];

/** Copilot chat / follow-up composer on SERP */
export const COPILOT_CHAT = [
  '#b_copilot_search',
  '#b_copilot_search_container',
  '#b_bop_pin_placeholder',
  '.b_copilot_composer',
  '.b_copilot_send',
];

/** Copilot tab in search navigation */
export const COPILOT_NAV = ['#b-scopeListItem-copilotsearch'];

/** Sydney conversation (Copilot backend) */
export const SYDNEY_CONV = ['#b_sydConvOuter'];

/** Trivia overlay */
export const TRIVIA = ['#b_TriviaOverlay'];

/** Combined: all AI elements to hide */
export const ALL = [...COPILOT_ANSWER, ...QNA_ANSWER, ...COPILOT_CHAT, ...COPILOT_NAV, ...SYDNEY_CONV, ...TRIVIA];
