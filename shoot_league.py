import sys,asyncio,json
from playwright.async_api import async_playwright
pre=sys.argv[1]; tabs=sys.argv[2].split(','); LID=open('/tmp/lsid').read().strip()
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path='/usr/bin/google-chrome')
    for vw,(w,h) in {'laptop':(1280,800),'phone':(390,844)}.items():
      c=await b.new_context(viewport={'width':w,'height':h})
      await c.add_init_script("try{localStorage.setItem('fbn.store','/api/data/')}catch(e){}")
      pg=await c.new_page()
      for t in tabs:
        await pg.goto(f'http://localhost:8840/league.html?l={LID}&demo=1#{t}'); await pg.wait_for_timeout(3500)
        await pg.evaluate("window.scrollTo(0,document.querySelector('nav').getBoundingClientRect().top+scrollY-8-((document.getElementById('demobar')||{}).offsetHeight||0))"); await pg.wait_for_timeout(400)
        await pg.screenshot(path=f'out/{pre}-{t}-{vw}.png')
        if t=='standings':
          await pg.evaluate("document.querySelector('[data-a=stview][data-v=breakdown]').click()"); await pg.wait_for_timeout(600); await pg.screenshot(path=f'out/{pre}-breakdown-{vw}.png'); await pg.evaluate("document.querySelector('[data-a=stview][data-v=league]').click()"); await pg.wait_for_timeout(400)
        info=await pg.evaluate("""(()=>{const r=e=>{if(!e)return null;const b=e.getBoundingClientRect();return [Math.round(b.left),Math.round(b.right),Math.round(b.height)]};const n=document.querySelector('nav');return {nav:r(n),main:r(document.querySelector('main')),first:r(document.querySelector('main .card, main .gm')),docH:document.documentElement.scrollHeight}})()""")
        print(pre,t,vw,json.dumps(info))
        await pg.evaluate('window.scrollTo(0,document.body.scrollHeight)'); await pg.wait_for_timeout(400)
        await pg.screenshot(path=f'out/{pre}-{t}-{vw}-bottom.png')
    await b.close()
asyncio.run(main())
