import { test, describe } from 'node:test';
import assert from 'node:assert';
import * as cheerio from 'cheerio';
import { parseBreak, parseTimetablePage } from '../src/scraper.js';

describe('scraper break parsing', () => {
  test('parseBreak parses dot and dash formats with single and double digits', () => {
    assert.deepStrictEqual(parseBreak('8:50 - 9:10'), { start: '08:50', end: '09:10' });
    assert.deepStrictEqual(parseBreak('08.06-08.26'), { start: '08:06', end: '08:26' });
    assert.deepStrictEqual(parseBreak('11:20–11:40'), { start: '11:20', end: '11:40' });
    assert.deepStrictEqual(parseBreak('00.10–00.45'), { start: '00:10', end: '00:45' });
    assert.deepStrictEqual(parseBreak('not a break time'), null);
    assert.deepStrictEqual(parseBreak('25:00 - 26:00'), null);
  });

  test('parses uppercase TAUOT / PAUSER / BREAKS on Barösund correctly', () => {
    const html = `
      <h4>Barösund (saari/ö)</h4>
      <ul class="pick_ferry_line__detail_window__times"><li>07:00</li></ul>
      <p>TAUOT/ PAUSER / BREAKS:<br />8:50 - 9:10<br />11:50 - 12:10<br />16:50 - 17:10<br />19:50 - 20:10</p>
    `;
    const $ = cheerio.load(html);
    const parsed = parseTimetablePage($, 'https://www.finferries.fi/sv/.../barosund.html');
    assert.deepStrictEqual(parsed.breaks, [
      { start: '08:50', end: '09:10' },
      { start: '11:50', end: '12:10' },
      { start: '16:50', end: '17:10' },
      { start: '19:50', end: '20:10' },
    ]);
  });

  test('parses breaks where times are in the next sibling paragraph (Vartsala style)', () => {
    const html = `
      <h4>Vartsala (saari/ö)</h4>
      <ul class="pick_ferry_line__detail_window__times"><li>07:00</li></ul>
      <p>Info text.<br><br>Tauot / Pauser / Breaks:</p>
      <p>11:20–11:40<br>13:50–14:10<br>16:50–17:10<br><br></p>
    `;
    const $ = cheerio.load(html);
    const parsed = parseTimetablePage($, 'https://www.finferries.fi/sv/.../vartsala.html');
    assert.deepStrictEqual(parsed.breaks, [
      { start: '11:20', end: '11:40' },
      { start: '13:50', end: '14:10' },
      { start: '16:50', end: '17:10' },
    ]);
  });

  test('does NOT substitute Skåldö breaks when parsing non-Skåldö routes without breaks', () => {
    const html = `
      <h4>Hailuoto</h4>
      <ul class="pick_ferry_line__detail_window__times"><li>07:00</li></ul>
      <p>Continuous traffic without breaks.</p>
    `;
    const $ = cheerio.load(html);
    const parsed = parseTimetablePage($, 'https://www.finferries.fi/sv/.../hailuoto.html');
    assert.deepStrictEqual(parsed.breaks, []);
  });

  test('substitutes fallback breaks ONLY for Skåldö when no breaks are found', () => {
    const html = `
      <h4>Skåldö</h4>
      <ul class="pick_ferry_line__detail_window__times"><li>07:00</li></ul>
    `;
    const $ = cheerio.load(html);
    const parsed = parseTimetablePage($, 'https://www.finferries.fi/sv/.../skaldo.html');
    assert.strictEqual(parsed.breaks.length, 5);
    assert.strictEqual(parsed.breaks[0].start, '11:10');
  });
});
