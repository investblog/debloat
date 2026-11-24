import {
  findAiModeEntries,
  findAiOverviewBlocks,
  findPeopleAlsoAsk,
  findThingsToKnowAi,
  safeContainer,
} from '@shared/google-ai-detect';
import { beforeEach, describe, expect, it } from 'vitest';

/*
 * Synthetic SERP fragments shaped after Google's DOM (Nov 2026) as targeted by
 * maintained competitors. Replace with saved live fixtures when available.
 */

const RESULT = (n: number) => `<div class="g" id="res${n}"><a href="https://example.com/${n}"><h3>Result ${n}</h3></a></div>`;

function serp(inner: string): void {
  document.body.innerHTML = `<div id="rcnt">${inner}</div>`;
}

const ids = (els: Element[]) => els.map((e) => e.id || e.className || e.tagName.toLowerCase());

describe('findAiOverviewBlocks', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('hides the ULSxyf module wrapper around a known marker', () => {
    serp(`<div id="center_col"><div id="rso">
      <div class="ULSxyf" id="aio"><div><div id="B2Jtyd">AI text</div></div></div>
      ${RESULT(1)}${RESULT(2)}
    </div></div>`);
    expect(ids(findAiOverviewBlocks(document))).toEqual(['aio']);
  });

  it('climbs to the child of #rcnt for a banner above the results', () => {
    serp(`<div id="banner"><div><div data-async-type="folsrch">AI</div></div></div>
      <div id="center_col"><div id="rso">${RESULT(1)}</div></div>`);
    expect(ids(findAiOverviewBlocks(document))).toEqual(['banner']);
  });

  it('live layout (24.11.2026, en + de): AI Overview is a sibling of #center_col, no ULSxyf', () => {
    // Observed: #rcnt > div > [div.SLPe5b.M8OgIe (AI Overview), #center_col, …];
    // markers inside: #eKIzJc, #m-x-content / #Odp5De, [data-subtree=mfc|aimc], folsrch*
    serp(`<div>
      <div class="SLPe5b M8OgIe"><div id="eKIzJc"><div data-subtree="aimc"><div data-subtree="mfc">
        <div role="heading">Übersicht mit KI</div><div id="m-x-content">KI-Text</div>
        <div id="folsrch-1">sources</div></div></div></div></div>
      <div id="center_col"><div id="rso">${RESULT(1)}${RESULT(2)}</div></div>
      <div id="rhs"></div>
    </div>`);
    expect(ids(findAiOverviewBlocks(document))).toEqual(['SLPe5b M8OgIe']);
  });

  it('stops below a parent that also wraps organic results', () => {
    serp(`<div id="center_col"><div id="rso">
      <div id="mixed"><div id="aiwrap"><div id="Odp5De">AI</div></div>${RESULT(1)}</div>
    </div></div>`);
    expect(ids(findAiOverviewBlocks(document))).toEqual(['aiwrap']);
  });

  it('never returns a marker that itself contains results', () => {
    serp(`<div id="center_col"><div id="rso"><div id="m-x-content">${RESULT(1)}</div></div></div>`);
    expect(findAiOverviewBlocks(document)).toEqual([]);
  });

  it('finds the localized heading when no known marker exists', () => {
    serp(`<div id="center_col"><div id="rso">
      <div id="ru-aio"><div><div role="heading">Обзор от ИИ</div><p>…</p></div></div>
      ${RESULT(1)}
    </div></div>`);
    expect(ids(findAiOverviewBlocks(document))).toEqual(['ru-aio']);
  });

  it('ignores headings that only mention AI Overview', () => {
    serp(`<div id="center_col"><div id="rso">
      <div id="news"><div role="heading">What is an AI Overview?</div></div>${RESULT(1)}
    </div></div>`);
    expect(findAiOverviewBlocks(document)).toEqual([]);
  });

  it('skips AI fragments inside People also ask', () => {
    serp(`<div id="center_col"><div id="rso">
      <div><div data-initq="q"><div class="related-question-pair"><div id="Odp5De">AI</div></div></div></div>
      ${RESULT(1)}
    </div></div>`);
    expect(findAiOverviewBlocks(document)).toEqual([]);
  });

  it('returns only the outermost block when markers nest', () => {
    serp(`<div id="center_col"><div id="rso">
      <div class="ULSxyf" id="aio"><div id="B2Jtyd"><div id="m-x-content">AI</div></div></div>${RESULT(1)}
    </div></div>`);
    expect(ids(findAiOverviewBlocks(document))).toEqual(['aio']);
  });
});

describe('safeContainer', () => {
  it('returns null for the results column itself', () => {
    serp(`<div id="center_col"><div id="rso">${RESULT(1)}</div></div>`);
    expect(safeContainer(document.getElementById('rso') as Element)).toBeNull();
  });
});

describe('findAiModeEntries', () => {
  it('hides the AI Mode tab by its udm=50 link, not other tabs', () => {
    document.body.innerHTML = `<div role="list">
      <div role="listitem" id="tab-all"><a href="/search?q=x">All</a></div>
      <div role="listitem" id="tab-ai"><a href="/search?q=x&udm=50&fbs=1">AI Mode</a></div>
      <div role="listitem" id="tab-img"><a href="/search?q=x&udm=2">Images</a></div>
    </div>
    <a id="sbx" href="/search?udm=50&aep=1">AI Mode</a>`;
    expect(ids(findAiModeEntries(document)).sort()).toEqual(['sbx', 'tab-ai']);
  });

  it('does not match udm values that merely contain 50', () => {
    document.body.innerHTML = '<div role="listitem" id="t"><a href="/search?q=x&udm=500">X</a></div>';
    expect(findAiModeEntries(document)).toEqual([]);
  });
});

describe('findPeopleAlsoAsk', () => {
  it('hides the whole module below #rso', () => {
    serp(`<div id="center_col"><div id="rso">
      ${RESULT(1)}
      <div><div id="paa"><div data-initq="x"><div class="related-question-pair">Q?</div></div></div></div>
      ${RESULT(2)}
    </div></div>`);
    expect(ids(findPeopleAlsoAsk(document))).toEqual(['paa']);
  });

  it('prefers the ULSxyf wrapper even though answers contain result titles', () => {
    serp(`<div id="center_col"><div id="rso">
      <div class="ULSxyf" id="paa"><div class="related-question-pair">Q? ${RESULT(9)}</div></div>
    </div></div>`);
    expect(ids(findPeopleAlsoAsk(document))).toEqual(['paa']);
  });
});

describe('findThingsToKnowAi', () => {
  const block = (sections: string) => `<div id="center_col"><div id="rso">
    <div><div id="ttk"><div class="list">${sections}</div></div></div>${RESULT(1)}
  </div></div>`;

  it('hides only AI sections (title without content)', () => {
    serp(
      block(`
      <div id="s1"><div data-attrid="lab/title/a">A</div><div data-attrid="lab/content/a">text</div></div>
      <div id="s2"><div data-attrid="lab/title/b">B</div></div>`),
    );
    expect(ids(findThingsToKnowAi(document))).toEqual(['s2']);
  });

  it('hides the whole block when every section is AI', () => {
    serp(
      block(`
      <div id="s1"><div data-attrid="lab/title/a">A</div></div>
      <div id="s2"><div data-attrid="lab/cluster/title/b">B</div></div>`),
    );
    expect(ids(findThingsToKnowAi(document))).toEqual(['ttk']);
  });

  it('returns nothing when all sections have content', () => {
    serp(
      block(`
      <div id="s1"><div data-attrid="lab/title/a">A</div><div data-attrid="lab/content/a">t</div></div>`),
    );
    expect(findThingsToKnowAi(document)).toEqual([]);
  });
});
