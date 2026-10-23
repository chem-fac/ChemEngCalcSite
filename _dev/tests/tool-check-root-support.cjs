'use strict';
// Run the shipped calculator code, exposing its closure only in this test VM.
// HTML supplies the actual field IDs, default values, units and script paths.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../..');
function load(url, names) {
  const html = fs.readFileSync(path.join(root, url, 'index.html'), 'utf8');
  const els = new Map();
  const context2d = new Proxy({}, {get: (_, k) => k === 'measureText' ? s => ({width: String(s).length * 7}) : () => {}});
  function element(id) {
    return {id, value: '', textContent: '', innerHTML: '', style: {}, dataset: {}, hidden: false,
      width: 800, height: 500, clientWidth: 800,
      classList: {toggle(){},add(){},remove(){}}, addEventListener(){}, setAttribute(){},
      appendChild(){}, getContext: () => context2d};
  }
  for (const m of html.matchAll(/<([a-z][\w-]*)\b([^>]*\bid="([^"]+)"[^>]*)>/gi)) {
    const el = element(m[3]);
    el.value = m[2].match(/\bvalue="([^"]*)"/)?.[1] ?? '';
    if (m[1].toLowerCase() === 'select') {
      const body = html.slice(m.index + m[0].length).split('</select>')[0];
      const options = [...body.matchAll(/<option\b([^>]*)>/gi)];
      const chosen = options.find(o => /\bselected\b/.test(o[1])) ?? options[0];
      el.value = chosen?.[1].match(/\bvalue="([^"]*)"/)?.[1] ?? '';
    }
    els.set(el.id, el);
  }
  for (let i=0; i<10; i++) {els.set(`c${i}`, element(`c${i}`)); els.set(`q${i}`, element(`q${i}`));}
  const document = {
    getElementById: id => els.get(id) ?? null,
    addEventListener(){}, querySelectorAll: () => [],
    querySelector: s => {const m=s.match(/\[data-([cq])="(\d+)"\]/); return m ? els.get(m[1]+m[2]) : null;},
    createElement: () => element('')
  };
  const scripts = [...html.matchAll(/<script\b[^>]*src="([^"]*assets\/js\/[^"?]+\.js)[^"]*"/g)]
    .map(m => path.resolve(root, url, m[1]));
  const ignored = /(?:share|calc-utils|references|search|value-figure)\.js$/;
  const js = scripts.find(s => !ignored.test(s));
  assert.ok(js, `${url}: calculator script exists`);
  const sandbox = {document, window:{devicePixelRatio:1,addEventListener(){},setTimeout(){},clearTimeout(){}}, console, setTimeout(){}, clearTimeout(){}};
  sandbox.globalThis = sandbox;
  let source = fs.readFileSync(js, 'utf8');
  source = source.replace(/\}\)\(\);\s*$/, `globalThis.audit = {${names.join(',')}};})();`);
  vm.runInNewContext(source, sandbox, {filename:js, timeout:5000});
  assert.ok(sandbox.audit, 'calculator closure exposed');
  const api = sandbox.audit;
  function set(values) {for(const [k,v] of Object.entries(values)) {assert.ok(els.has(k), `field ${k}`); els.get(k).value=String(v);}}
  function run(values={}, fn='calculate') {set(values); api[fn](); return {error:els.get('error').textContent, html:els.get('result-area').innerHTML};}
  return {api,els,set,run,html,js};
}
function near(actual, expected, relative=1e-10) {assert.ok(Number.isFinite(actual) && Math.abs(actual-expected)<=relative*Math.max(1,Math.abs(expected)), `${actual} != ${expected}`);}
function clean(result) {assert.equal(result.error,''); assert.ok(!/\b(?:NaN|Infinity)\b/.test(result.html),result.html); return result;}
function error(result) {assert.ok(result.error, 'expected explicit error'); assert.match(result.html,/placeholder/); return result;}
function cells(result) {return [...result.html.matchAll(/<td\b[^>]*class="num"[^>]*>([\s\S]*?)<\/td>/g)].map(m=>m[1].replace(/<[^>]*>/g,' ').trim());}
module.exports={load,near,clean,error,cells,assert};
