import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({executablePath:'/usr/local/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--window-size=640,360','--mute-audio','--autoplay-policy=no-user-gesture-required']});
const p = await b.newPage();
await p.setViewport({width:640,height:360});
p.on('pageerror', e => console.log('PAGEERROR:\n' + (e.stack || String(e))));
p.on('console', async m => { if (m.type()==='error') { console.log('CONSOLE ERROR:', m.text()); for (const a of m.args()) { try { const v = await a.evaluate(x => x && x.stack ? x.stack : String(x)); console.log('  ARG:', String(v).slice(0,1200)); } catch {} } } });
await p.goto(process.argv[2], {waitUntil:'domcontentloaded'});
await new Promise(r=>setTimeout(r, Number(process.argv[3]||45000)));
await b.close();
