import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {createState} from '../src/engine.js';
import {upgrades} from '../src/data.js';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
try {
  const context=await browser.newContext({viewport:{width:1440,height:1050}});
  const s=createState(Date.now(),{starter:false});s.cookies=1e18;s.earned=1e12;s.owned.cursor=1;s.owned.grandma=10;
  s.upgrades=['research-5','research-7','research-9',...upgrades.filter(u=>u.effect.kind==='grandma-synergy').slice(0,7).map(u=>u.id)];s.unlocked=[...s.upgrades];s.elder.stage=3;s.parasites=[{id:0,arrivalMs:0,sucked:100,shiny:false}];
  await context.addInitScript(seed=>{if(!sessionStorage.getItem('progression-seeded')){localStorage.setItem('bisket-save-v3',JSON.stringify(seed));sessionStorage.setItem('progression-seeded','1');}},s);
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.BASE_URL||'http://127.0.0.1:3100');
  await page.locator('[data-panel="research-panel"]').click();assert.match(await page.locator('#elder-stage').textContent(),/段階 3/);
  await page.locator('#pledge').click();await page.waitForFunction(()=>document.getElementById('elder-stage').textContent.includes('休戦中'));assert.equal(await page.locator('#parasites button').count(),0);
  await page.locator('#covenant').click();assert.match(await page.locator('#elder-stage').textContent(),/永久休戦/);await page.locator('#covenant').click();
  await page.locator('[data-panel="sky-panel"]').click();page.once('dialog',d=>d.accept());await page.locator('#ascend').click();assert.equal(await page.locator('#prestige').textContent(),'1');assert.equal(await page.locator('#chips').textContent(),'1');
  await page.locator('#heaven-legacy').click();assert.equal(await page.locator('#chips').textContent(),'0');await page.reload();await page.locator('[data-panel="sky-panel"]').click();assert.equal(await page.locator('#reincarnate').isVisible(),true);
  await page.locator('#reincarnate').click();assert.equal(await page.locator('#cookies').textContent(),'0');assert.equal(await page.locator('#owned').textContent(),'0');assert.equal(await page.locator('#prestige').textContent(),'1');
  await page.locator('#save').click();await page.reload();assert.equal(await page.locator('#cookies').textContent(),'0');
  await page.setViewportSize({width:390,height:844});await page.locator('[data-panel="sky-panel"]').click();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  const fresh=await browser.newPage();await fresh.goto(process.env.BASE_URL||'http://127.0.0.1:3100');assert.equal(await fresh.locator('#cookies').textContent(),'1,000');assert.equal(await fresh.locator('#earned').textContent(),'0');await fresh.reload();assert.equal(await fresh.locator('#cookies').textContent(),'1,000');
  assert.deepEqual(errors,[]);console.log('PASS: starter, apocalypse, pledge/covenant, ascension, heavenly purchase, rebirth, reload and mobile sky layout');
} finally {await browser.close();}
