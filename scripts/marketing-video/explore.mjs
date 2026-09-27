import { chromium } from 'playwright-core';
const OUT='/tmp/claude-0/-home-user-mashklanta/e11042a8-53fc-5936-91aa-988424d64e2a/scratchpad/shots/';
const B='http://localhost:3000';
const browser = await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const ctx = await browser.newContext({viewport:{width:1280,height:720},locale:'he-IL'});
await ctx.addInitScript(()=>{ const s=document.createElement('style'); s.textContent='.mk-demo-bar,.mk-demo-badge,.driver-popover,nextjs-portal{display:none!important}.driver-overlay{opacity:0!important}'; document.addEventListener('DOMContentLoaded',()=>document.head.appendChild(s)); });
const page = await ctx.newPage();
// usage: name|step|url|js1|js2...   (step -1 = no demo)
for (const s of process.argv.slice(2)){
  const [name,step,url,...acts]=s.split('|');
  await page.goto(B+'/');
  await page.evaluate((st)=>{ if(st<0) sessionStorage.removeItem('mashkalanta:demo'); else sessionStorage.setItem('mashkalanta:demo',JSON.stringify({flowId:'marketing',stepIndex:st,returnTo:'/',autoplay:false}))}, Number(step));
  await page.goto(B+url,{waitUntil:'networkidle'}).catch(()=>{}); await page.waitForTimeout(2500);
  for (const a of acts){ try{ await page.evaluate(a);}catch(e){console.log('ERR',a,e.message)} await page.waitForTimeout(1500);} 
  await page.screenshot({path:OUT+name+'.png', fullPage: name.endsWith('-full')});
  console.log(name, page.url(), await page.evaluate(()=>[...new Set([...document.querySelectorAll('[data-demo-id]')].map(e=>e.getAttribute('data-demo-id')))].join(' ')));
}
await browser.close();
