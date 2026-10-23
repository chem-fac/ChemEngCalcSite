'use strict';
// Execute each production calculator in an isolated VM with the real HTML input defaults.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
function load(slug, category = 'fluid', js = slug) {
  let calculationCount = 0;
  process.on('exit', () => console.log(`${slug}: ${calculationCount} calculator executions`));
  const root = path.resolve(__dirname, '../..');
  const html = fs.readFileSync(path.join(root, 'tools', category, slug, 'index.html'), 'utf8');
  const nodes = {};
  const node = value => ({value: String(value ?? ''), style: {}, dataset: {}, innerHTML: '', textContent: '', selectedOptions: [{text: 'unit'}], classList: {toggle(){}}, setAttribute(){}, addEventListener(){}});
  for (const match of html.matchAll(/<input\b[^>]*\bid="([^"]+)"[^>]*>/g)) {
    nodes[match[1]] = node(match[0].match(/\bvalue="([^"]*)"/)?.[1]);
  }
  for (const match of html.matchAll(/<select\b[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/select>/g)) {
    const opts = [...match[2].matchAll(/<option\b([^>]*)>([\s\S]*?)<\/option>/g)];
    const opt = opts.find(o => /\bselected\b/.test(o[1])) || opts[0];
    nodes[match[1]] = node(opt?.[1].match(/value="([^"]*)"/)?.[1]);
    nodes[match[1]].selectedOptions = [{text: opt?.[2] || ''}];
  }
  for (const id of ['error', 'result-area']) nodes[id] = node();
  const document = {
    getElementById: id => nodes[id] || null,
    querySelector: key => nodes[key] || (nodes[key] = node()),
    querySelectorAll: () => [], addEventListener(){}
  };
  const ctx = vm.createContext({document, console});
  const source = fs.readFileSync(path.join(root, 'assets/js', js + '.js'), 'utf8');
  vm.runInContext(source.replace(/\}\)\(\);\s*$/, 'globalThis.evaluate = code => eval(code);\n})();'), ctx);
  const api = {
    nodes, eval: code => ctx.evaluate(code),
    set(values) { for (const [id, value] of Object.entries(values)) { if (!nodes[id]) nodes[id] = node(); nodes[id].value = String(value); } return api; },
    result: () => nodes['result-area'].innerHTML,
    error: () => nodes.error.style.display === 'block' ? nodes.error.textContent : '',
    good(code = 'calculate()') { calculationCount++; ctx.evaluate(code); assert.equal(api.error(), '', api.error()); return api.result(); },
    bad(code = 'calculate()') { calculationCount++; ctx.evaluate(code); assert.ok(api.error(), 'expected visible error'); assert.ok(!api.result().includes('result-value-big'), 'stale result cleared'); },
    near(actual, expected, rel = 1e-10) { assert.ok(Math.abs(actual - expected) <= rel * Math.max(1, Math.abs(expected)), `${actual} != ${expected}`); },
    capture(fn = 'renderResult') { ctx.evaluate(`${fn} = value => {globalThis.captured = value;}`); },
    captured: () => ctx.captured,
  };
  return api;
}
module.exports = {load, assert};
