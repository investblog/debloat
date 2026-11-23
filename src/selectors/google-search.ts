/**
 * CSS selectors and text signals for Google Search AI elements.
 * These break when Google updates its UI — keep them modular for fast patching.
 *
 * Sources: our own observations (≤1.0.3) plus signals used by actively maintained
 * competitors (Nov 2026). Verify against a live SERP before relying on a new one.
 */

/**
 * AI Overview markers. A match is an inner node or the block itself;
 * the detector climbs from it to the module container (see google-ai-detect.ts).
 */
export const AI_OVERVIEW = [
  '#ai-overview-card',
  'div[data-attrid="AIOverview"]',
  '#Odp5De',
  '#dEwkXc',
  '#B2Jtyd',
  '#m-x-content',
  '#eKIzJc',
  '#SePcAf',
  'div[data-subtree="mfc"]',
  '[data-async-type="folsrch"]',
  '[id^="folsrch"]',
  '[data-content-feature="ai_overview"]', // used by a competitor (Nov 2026), not yet seen live
  'div.M8OgIe', // ≤1.0.3, class may be reused — container guard applies
  'div[jsname="Cpkphb"]', // ≤1.0.3, same caveat
];

/**
 * Subset of AI_OVERVIEW safe to hide by CSS at document_start (before JS runs),
 * so the block never flashes. Only stable ids/attributes — no reused classes.
 */
export const AI_OVERVIEW_INSTANT = [
  '#ai-overview-card',
  'div[data-attrid="AIOverview"]',
  '#Odp5De',
  '#dEwkXc',
  '#B2Jtyd',
  '#m-x-content',
  '#eKIzJc',
  '#SePcAf',
  'div[data-subtree="mfc"]',
];

/** Module wrapper Google puts around each SERP block (AI Overview included) */
export const MODULE_WRAPPER = 'div.ULSxyf';

/** AI Mode entry points: links into the udm=50 vertical, found by URL param */
export const AI_MODE_LINK = 'a[href*="udm=50"]';
export const AI_MODE_UDM = '50';
/** Container of a search tab, hidden together with its AI Mode link */
export const AI_MODE_TAB = '[role="listitem"]';
/** Legacy AI Mode selectors (≤1.0.3) */
export const AI_MODE = ['a[href*="/search?udm=50"]', 'div[data-udm="50"]'];

/** "People also ask" — the answers are AI-generated */
export const PEOPLE_ALSO_ASK = ['[data-initq]', 'div.related-question-pair'];

/** "Things to know": every section has a title; only non-AI sections have content */
export const THINGS_TO_KNOW_TITLE = '[data-attrid^="lab/title/"], [data-attrid^="lab/cluster/title/"]';
export const THINGS_TO_KNOW_CONTENT = '[data-attrid^="lab/content/"], [data-attrid^="lab/cluster/content/"]';

/** The organic results column — never hide it or anything that contains it */
export const RESULTS_AREA = '#center_col, #search, #rso';
/** An organic result title */
export const RESULT_TITLE = 'a[href] h3';
/** Containers the detector climbs up to (and never past) */
export const STOP_IDS = ['rso', 'rcnt', 'center_col'];

/**
 * AI Overview heading text in Google's UI languages (full-text match on
 * [role="heading"]). Entries marked "verified" are used by a competitor with
 * 1.2K ratings; the rest are best-effort and must be checked on a live SERP.
 */
export const AI_OVERVIEW_HEADINGS: RegExp[] = [
  /^ai overview$/i, // en (verified)
  /^обзор от ии$/i, // ru (verified)
  /^übersicht mit ki$/i, // de (verified)
  /^aperçu (?:ia|généré par l['’]ia)$/i, // fr (verified: "Aperçu IA")
  /^(?:vista creada con ia|visión general creada por ia|resumen creado con ia)$/i, // es (verified), es_419
  /^ai による概要$/, // ja (verified)
  /^ai 摘要$/i, // zh_TW (verified)
  /^ai-overzicht$/i, // nl (verified)
  /^ai-oversigt$/i, // da (verified)
  /^přehled od ai$/i, // cs (verified)
  /^prezentare generală generată de ai$/i, // ro (verified)
  /^ai 概览$/i, // zh_CN
  /^ai 개요$/i, // ko
  /^(?:visão geral criada por ia|vista geral de ia)$/i, // pt_BR, pt_PT (Google PT blog)
  /^panoramica (?:ai|ia)$/i, // it (Google: "Panoramiche AI")
  /^przegląd od ai$/i, // pl (Google blog: "Przegląd od AI")
  /^огляд від ші$/i, // uk
  /^(?:ai bakışı|yapay zeka genel bakışı)$/i, // tr (Google TR help: "AI Bakışı")
  /^ringkasan ai$/i, // id
  /^tổng quan về ai$/i, // vi
  /^نظرة عامة (?:مولّدة )?بالذكاء الاصطناعي$/, // ar
  /^(?:ai|एआई) (?:से खास जानकारी|अवलोकन)$/i, // hi
];

/** Combined static selectors (kept for the selector module test) */
export const ALL = [...AI_OVERVIEW, ...AI_MODE, ...PEOPLE_ALSO_ASK];

/** Build a single CSS selector string */
export function toCSS(selectors: string[]): string {
  return selectors.join(',\n');
}
