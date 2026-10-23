'use strict';
// Small DOM adapter: executes the shipped calculator script and its real click handlers.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../..');
let calculations = 0;
process.on('exit', () => console.log(`Calculator executions: ${calculations}`));
function load(category, slug, js = slug) {
  const html = fs.readFileSync(path.join(root, 'tools', category, slug, 'index.html'), 'utf8');
  assert.ok(html.includes(`assets/js/${js}.js`), 'Test must execute the script referenced by the page');
  const els = new Map(), tabs = [], ready = [];
  function element(id = '') {
    return { id, value: '', innerHTML: '', textContent: '', style: {}, dataset: {}, hidden: false,
      events: {}, classList: { toggle() {} }, setAttribute() {},
      addEventListener(event, callback) { this.events[event] = callback; },
      appendChild(row) {
        for (const tag of row.innerHTML.matchAll(/<input\b([^>]*)>/g)) {
          const e = element();
          const field = /data-field="([^"]+)"/.exec(tag[1])?.[1];
          const i = /data-row="([^"]+)"/.exec(tag[1])?.[1];
          els.set(`component:${field}:${i}`, e);
        }
      }
    };
  }
  for (const m of html.matchAll(/<(input|select|button|div|span|p|tbody)\b[^>]*\bid="([^"]+)"[^>]*>/g)) {
    const e = element(m[2]);
    e.value = /\bvalue="([^"]*)"/.exec(m[0])?.[1] || '';
    if (m[1] === 'select') {
      const options = html.slice(m.index + m[0].length).split('</select>')[0];
      e.value = /<option\b[^>]*value="([^"]*)"[^>]*selected/.exec(options)?.[1]
        ?? /<option\b[^>]*value="([^"]*)"/.exec(options)?.[1] ?? '';
    }
    els.set(e.id, e);
  }
  for (const m of html.matchAll(/<button\b[^>]*data-mode="([^"]+)"[^>]*>/g)) {
    const e = element(); e.dataset.mode = m[1]; tabs.push(e);
  }
  const get = id => { if (!els.has(id)) els.set(id, element(id)); return els.get(id); };
  const document = {
    getElementById: get, createElement: () => element(),
    querySelector(selector) {
      const m = /data-field="([^"]+)".*data-row="([^"]+)"/.exec(selector);
      return m ? els.get(`component:${m[1]}:${m[2]}`) : null;
    },
    querySelectorAll: selector => selector === '.mode-tab' ? tabs : [],
    addEventListener: (event, callback) => { if (event === 'DOMContentLoaded') ready.push(callback); }
  };
  const context = { document, window: { addEventListener() {} }, location: { search: '' }, console };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'assets/js', js + '.js'), 'utf8'), context);
  ready.forEach(callback => callback());
  const api = {
    set(values) { for (const [id, value] of Object.entries(values)) get(id).value = String(value); return api; },
    mode(mode) { const tab = tabs.find(t => t.dataset.mode === mode); assert.ok(tab, mode); tab.events.click(); return api; },
    component(i, values) { for (const [field, value] of Object.entries(values)) els.get(`component:${field}:${i}`).value = String(value); return api; },
    calc() { calculations++; get('calc-btn').events.click(); return api; },
    get output() { return get('result-area').innerHTML; },
    get error() { return get('error').textContent; },
    big(expected, relative = 6e-4) {
      const text = /class="result-value-big">([\s\S]*?)<span/.exec(api.output)?.[1]
        ?? /class="result-value-big">([^<]+)/.exec(api.output)?.[1];
      const sup = { '⁰':'0','¹':'1','²':'2','³':'3','⁴':'4','⁵':'5','⁶':'6','⁷':'7','⁸':'8','⁹':'9','⁻':'-' };
      const normalized = (text || '').trim().replace(/,/g, '').replace(/×10([⁰¹²³⁴⁵⁶⁷⁸⁹⁻]+)/g,
        (_, exponent) => 'e' + [...exponent].map(c => sup[c]).join(''));
      const actual = Number(normalized);
      assert.ok(Number.isFinite(actual) && Math.abs(actual - expected) <= relative * Math.max(Math.abs(expected), 1e-300), `${actual} != ${expected}`);
      return api;
    },
    ok() { assert.equal(api.error, ''); return api; },
    fails() { assert.notEqual(api.error, ''); return api; },
    has(value) { assert.ok(api.output.includes(value), `${value} absent: ${api.output}`); return api; }
  };
  return api;
}
module.exports = { load, assert };
