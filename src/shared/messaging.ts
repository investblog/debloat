import { browser } from 'wxt/browser';
import type { CandidateBlock } from './scout-collector';
import type { ActivityEntry, CategoryId, ScoutStatus } from './types';

/**
 * Message types for background <-> UI communication.
 *
 * Uses chrome.runtime.sendMessage / onMessage.
 * Keep payloads minimal — these cross the serialization boundary.
 */

export type Message =
  | { type: 'GET_TAB_COUNT'; tabId: number }
  | { type: 'GET_ACTIVITY'; tabId: number }
  | { type: 'PAUSE'; durationMs: number }
  | { type: 'UNPAUSE' }
  | { type: 'WHITELIST_SITE'; domain: string; categories: CategoryId[] }
  | { type: 'UNWHITELIST_SITE'; domain: string }
  | { type: 'REPORT_CSS_HIDDEN'; domain: string; count: number; category: CategoryId }
  | {
      type: 'SCOUT_CANDIDATES';
      surface: string;
      pageUrl: string;
      candidates: CandidateBlock[];
      viewport: { width: number; height: number };
      known: boolean;
    }
  | { type: 'GET_SCOUT_STATUS'; tabId: number }
  | { type: 'SCOUT_SEND_REPORT'; tabId: number };

export type MessageResponse =
  | { type: 'TAB_COUNT'; count: number }
  | { type: 'ACTIVITY'; entries: ActivityEntry[] }
  | { type: 'SCOUT_STATUS'; status: ScoutStatus | null }
  | { type: 'OK' };

export function sendMessage(msg: Message): Promise<MessageResponse> {
  return browser.runtime.sendMessage(msg);
}
