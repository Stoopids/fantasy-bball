import sys,asyncio,json
from playwright.async_api import async_playwright
pre=sys.argv[1]; tabs=sys.argv[2].split(','); S=json.load(open('/tmp/seed2.json'))
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path='/usr/bin/google-chrome')
    for vw,(w,h) in {'laptop':(1280,800),'phone':(390,844)}.items():
      c=await b.new_context(viewport={'width':w,'height':h})
      await c.add_init_script("try{localStorage.setItem('fbn.store','/api/data/');localStorage.setItem('fbn.me.%s',JSON.stringify(%s))}catch(e){}"%(S['id'],json.dumps(S['me'])))
      pg=await c.new_page()
      for t in tabs:
        await pg.goto(f"http://localhost:8840/league.html?l={S['id']}#{t}"); await pg.wait_for_timeout(4500)
        await pg.evaluate("window.scrollTo(0,document.querySelector('nav').getBoundingClientRect().top+scrollY-8)"); await pg.wait_for_timeout(400)
        await pg.screenshot(path=f'out/{pre}-{t}-{vw}.png')
        if t=='games':
          n=await pg.evaluate("(()=>{const e=document.querySelector('.gm.mkbet')||document.querySelector('.gm .qb-btn')?.closest('.gm');if(!e)return 0;window.scrollTo(0,e.getBoundingClientRect().top+scrollY-90);return document.querySelectorAll('.gm.mkbet').length+'/'+document.querySelectorAll('.mkbtns .qb-btn').length})()")
          print(vw,'mkbet/qb',n); await pg.wait_for_timeout(400); await pg.screenshot(path=f'out/{pre}-{t}-{vw}-bet.png')
        if t=='bets':
          await pg.evaluate("window.scrollTo(0,document.body.scrollHeight)"); await pg.wait_for_timeout(400); await pg.screenshot(path=f'out/{pre}-{t}-{vw}-bottom.png')
    await b.close()
asyncio.run(main())
