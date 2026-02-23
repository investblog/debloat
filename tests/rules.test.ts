import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const RULES_DIR = resolve(__dirname, '../src/public/rules');
const VALID_RESOURCE_TYPES = [
  'main_frame',
  'sub_frame',
  'stylesheet',
  'script',
  'image',
  'font',
  'object',
  'xmlhttprequest',
  'ping',
  'csp_report',
  'media',
  'websocket',
  'webtransport',
  'webbundle',
  'other',
];

const ruleFiles = readdirSync(RULES_DIR).filter((f) => f.endsWith('.json'));

describe('dNR rule files', () => {
  it('should have 6 rule files', () => {
    expect(ruleFiles).toHaveLength(6);
  });

  for (const file of ruleFiles) {
    describe(file, () => {
      const raw = readFileSync(resolve(RULES_DIR, file), 'utf-8');
      const rules = JSON.parse(raw) as Array<Record<string, unknown>>;

      it('should be valid JSON array', () => {
        expect(Array.isArray(rules)).toBe(true);
        expect(rules.length).toBeGreaterThan(0);
      });

      it('should have unique rule IDs', () => {
        const ids = rules.map((r) => r.id);
        expect(new Set(ids).size).toBe(ids.length);
      });

      it('should have required fields on every rule', () => {
        for (const rule of rules) {
          expect(rule).toHaveProperty('id');
          expect(rule).toHaveProperty('priority');
          expect(rule).toHaveProperty('action');
          expect(rule).toHaveProperty('condition');
          expect(typeof rule.id).toBe('number');
          expect(typeof rule.priority).toBe('number');

          const action = rule.action as Record<string, unknown>;
          expect(action).toHaveProperty('type');

          const condition = rule.condition as Record<string, unknown>;
          expect(condition).toHaveProperty('urlFilter');
          expect(condition).toHaveProperty('resourceTypes');
        }
      });

      it('should have valid resourceTypes', () => {
        for (const rule of rules) {
          const condition = rule.condition as Record<string, unknown>;
          const types = condition.resourceTypes as string[];
          for (const t of types) {
            expect(VALID_RESOURCE_TYPES).toContain(t);
          }
        }
      });
    });
  }
});
