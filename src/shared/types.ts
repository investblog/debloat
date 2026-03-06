export type BrowserType = 'chrome' | 'edge' | 'firefox' | 'unknown';

export type CategoryId = 'ai' | 'sponsored' | 'shopping' | 'telemetry' | 'annoyances';

export type PresetId = 'aggressive' | 'balanced' | 'minimal' | 'custom';

export interface SubToggle {
  id: string;
  label: string;
  browsers: BrowserType[];
  /** dNR ruleset IDs this sub-toggle controls (empty = CSS/DOM only) */
  rulesetIds?: string[];
  defaultEnabled: boolean;
}

export interface Category {
  id: CategoryId;
  icon: string;
  labelKey: string;
  descriptionKey: string;
  subToggles: SubToggle[];
}

export interface Settings {
  /** Master toggles per category */
  ai: boolean;
  sponsored: boolean;
  shopping: boolean;
  telemetry: boolean;
  annoyances: boolean;
  /** Sub-toggle overrides: key = subToggle.id, value = enabled */
  subToggles: Record<string, boolean>;
  /** Active preset */
  preset: PresetId;
  /** Per-site whitelist: domain → disabled category IDs */
  siteWhitelist: Record<string, CategoryId[]>;
  /** Pause state */
  pauseUntil: number | null;
  /** AI Scout: opt-in anonymous reporting */
  scoutReporting: boolean;
  /** AI Scout: anonymous install UUID (generated on first enable) */
  scoutInstallId: string;
}

export interface ActivityEntry {
  time: number;
  domain: string;
  category: CategoryId;
  rulesetId: string;
  /** CSS/DOM entries carry element count; absent for dNR */
  count?: number;
}

/** Per-tab scout candidates state */
export interface ScoutStatus {
  /** Number of candidates collected */
  candidateCount: number;
  /** Number of unknown (heuristic) candidates — triggers aggressive UI */
  unknownCount: number;
  /** Surface identifier */
  surface: string;
  /** Reporting state */
  state: 'pending' | 'sending' | 'reported';
  /** Result message after reporting */
  resultMessage?: string;
}
