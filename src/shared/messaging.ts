import type { ActivityEntry, CategoryId } from './types';

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
  | { type: 'UNWHITELIST_SITE'; domain: string };

export type MessageResponse =
  | { type: 'TAB_COUNT'; count: number }
  | { type: 'ACTIVITY'; entries: ActivityEntry[] }
  | { type: 'OK' };

export function sendMessage(msg: Message): Promise<MessageResponse> {
  return chrome.runtime.sendMessage(msg);
}
