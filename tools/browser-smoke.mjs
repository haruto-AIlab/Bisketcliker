import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { createState } from '../src/engine.js';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const errors=[];
try {
  const context=await browser.newContext({viewport:{width:1440,height:1050}});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  const base=process.env.BASE_URL||'http://127.0.0.1:3100';
  await page.goto(base);
  assert.equal(await page.locator('#cookie').evaluate(el=>getComputedStyle(el).width),'226px');
  await page.locator('#cookie').click({clickCount:15,delay:10});
  await page.waitForFunction(()=>document.getElementById('cookies').textContent==='1,015');
  await page.locator('#buy-cursor').click();await page.waitForFunction(()=>document.getElementById('owned-cursor').textContent==='1');
  assert.equal(await page.locator('.facility').count(),20);
  await page.locator('[data-panel="upgrade-panel"]').click();assert.equal(await page.locator('#upgrade-cursor-tier-1').isVisible(),true);assert.equal(await page.locator('#upgrade-cursor-tier-2').isVisible(),true);assert.equal(await page.locator('#upgrade-cursor-tier-3').isVisible(),false);
  await page.locator('#save').click();await page.reload();await page.waitForFunction(()=>document.getElementById('owned-cursor').textContent==='1');
  // Deterministic starting balance for the upgrade/sell flow; no production cheat in UI.
  const seed=createState(Date.now());seed.cookies=1000;seed.earned=1000;
  await context.addInitScript(s=>{if(!sessionStorage.getItem('smoke-seeded')){localStorage.setItem('bisket-save-v3',JSON.stringify(s));sessionStorage.setItem('smoke-seeded','1');}},seed);await page.reload();
  await page.locator('#buy-cursor').click();await page.locator('[data-panel="upgrade-panel"]').click();await page.locator('#upgrade-cursor-tier-1').click();await page.waitForFunction(()=>document.getElementById('click-power').textContent==='+2 / CLICK');
  await page.locator('[data-panel="facility-panel"]').click();await page.locator('[data-mode="sell"]').click();await page.locator('#buy-cursor').click();await page.waitForFunction(()=>document.getElementById('owned-cursor').textContent==='0');
  await page.locator('[data-panel="record-panel"]').click();assert.equal(await page.locator('#record-upgrades').textContent(),'1 / 517');assert.equal(await page.locator('#record-achievements').textContent(),'3 / 410');
  await page.locator('#save').click();await page.reload();assert.equal(await page.locator('#click-power').textContent(),'+2 / CLICK');
  const download=page.waitForEvent('download');await page.locator('#export').click();assert.equal((await download).suggestedFilename(),'bisket-save.json');
  const badImport=JSON.stringify({...seed,version:99});await page.locator('#file').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from(badImport)});await page.waitForFunction(()=>document.getElementById('save-status').textContent.includes('読み込み失敗'));
  const seed2=createState(Date.now());seed2.cookies=42;seed2.earned=42;page.once('dialog',d=>d.accept());await page.locator('#file').setInputFiles({name:'good.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(seed2))});await page.waitForFunction(()=>document.getElementById('cookies').textContent==='42');
  await page.setViewportSize({width:390,height:844});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.locator('[data-panel="facility-panel"]').click();await page.screenshot({path:'/tmp/bisket-mobile.png',fullPage:true});
  await page.setViewportSize({width:1440,height:1050});await page.screenshot({path:'/tmp/bisket-desktop.png',fullPage:true});
  // Late-game balances use Japanese units, survive reload, and fit mobile screens.
  for(const [amount,label] of [[1.25e8,'1.25億'],[1e52,'1恒河沙'],[1e56,'1頻波羅'],[1e68,'1兆頻波羅'],[1e112,'1矜羯羅'],[1e280,'1頻波羅阿伽羅']]){
    const late=createState(Date.now());late.cookies=amount;late.earned=amount;
    const lateContext=await browser.newContext({viewport:{width:390,height:844}});
    await lateContext.addInitScript(s=>{if(!sessionStorage.getItem('late-seeded')){localStorage.setItem('bisket-save-v3',JSON.stringify(s));sessionStorage.setItem('late-seeded','1');}},late);
    const latePage=await lateContext.newPage();latePage.on('pageerror',e=>errors.push(e.message));
    await latePage.goto(base);await latePage.waitForFunction(expected=>document.getElementById('cookies').textContent===expected,label);
    await latePage.locator('#save').click();await latePage.reload();
    assert.equal(await latePage.locator('#cookies').textContent(),label);
    assert.ok(await latePage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await lateContext.close();
  }
  assert.deepEqual(errors,[]);
  console.log('PASS: clicks, 20 facilities, unlocks, purchase, sale, records, save/reload, export/import, mobile overflow; no page errors');
} finally {await browser.close();}
