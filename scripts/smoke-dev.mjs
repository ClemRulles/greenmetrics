#!/usr/bin/env node
import fetch from 'node-fetch';

const base = process.env.SMOKE_BASE || 'http://localhost:3001';
const urls = [
  `${base}/en`,
  `${base}/api/health`
];

async function check(url) {
  try {
    const res = await fetch(url, { redirect: 'follow' });
    const text = await res.text();
    return { ok: res.ok, status: res.status, body: text.slice(0, 300) };
  } catch (e) {
    return { ok: false, status: 0, error: String(e) };
  }
}

(async function main(){
  let allOk = true;
  for (const url of urls) {
    const r = await check(url);
    if (r.ok) {
      console.log(`${url} -> ${r.status}`);
      console.log(r.body);
    } else {
      console.error(`${url} -> ERROR status=${r.status} ${r.error || ''}`);
      allOk = false;
    }
    console.log('---');
  }
  process.exit(allOk ? 0 : 1);
})();
