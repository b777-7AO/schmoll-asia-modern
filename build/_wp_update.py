import sys, time, json, subprocess; sys.path.insert(0,'build'); import _wp_tab as T
CHECK=['https://www.schmoll-asia.com/','https://www.schmoll-asia.com/contact-us/','https://www.schmoll-asia.com/zh/','https://www.schmoll-asia.com/ko/','https://www.schmoll-asia.com/raptor-series-best-routing-pcb-equipment/','https://www.schmoll-asia.com/th/','https://www.schmoll-asia.com/vi/','https://www.schmoll-asia.com/theca-2026-bangkok-here-we-come/']
def check():
    bad=[]
    for u in CHECK:
        r=subprocess.run(['curl','-sS','-L','-m','40','-A','Mozilla/5.0','-o','/tmp/chk.html','-w','%{http_code}',u+'?nc='+str(int(time.time()))],capture_output=True,text=True)
        b=open('/tmp/chk.html','rb').read().decode('utf-8','ignore')
        ok = r.stdout.strip()=='200' and 'sap-ft' in b and 'elementor' in b and len(b)>20000
        if not ok: bad.append((u, r.stdout.strip(), 'sap-ft' in b, len(b)))
    return bad
def update(slugs_match):
    T.load('https://www.schmoll-asia.com/wp-admin/update-core.php', 14)
    sel=T.js('''(function(){ var want=%s; var n=0; document.querySelectorAll("#update-plugins-table tbody tr").forEach(function(tr){ var cb=tr.querySelector("input[type=checkbox]"); var name=tr.textContent; var hit=want.some(function(w){ return name.indexOf(w)>-1 }); if(cb){ cb.checked=hit; if(hit) n++; } }); return n; })()''' % json.dumps(slugs_match))
    if not sel or sel=='0': return 'nothing selected'
    T.js('document.querySelector("#upgrade-plugins, #upgrade-plugins-2, input[name=upgrade][value*=\\"Update Plugins\\"], form[name=upgrade-plugins] input[type=submit]").click()')
    # wait for the bulk updater to finish: the page shows "All updates have been completed" / return link
    for i in range(120):
        time.sleep(5)
        t=T.js('(function(){ var b=document.body?document.body.innerText:""; if(/All updates have been completed|Alle Aktualisierungen wurden abgeschlossen|Return to WordPress Updates|Go to WordPress Updates/i.test(b)) return "done"; if(/failed|fehlgeschlagen|error/i.test(b) && /Plugin update failed/i.test(b)) return "failed:"+b.slice(0,300); return "wait"; })()')
        if t.startswith('done') or t.startswith('failed'): return t
    return 'timeout'
stages=[('batch1',['AIOSEO - Image SEO','All in One SEO Pro','Jetpack Boost','Jetpack','Polylang','ShortPixel','WPCode','WPForms','WP Mail SMTP','hCaptcha','All-in-One WP Migration']),('elementskit',['ElementsKit Lite']),('gtranslate',['GTranslate'])]
print('pre-check', check() or 'all ok')
for name, slugs in stages:
    r=update(slugs); print(name, '->', r[:200])
    time.sleep(8); b=check(); print(name, 'check:', b or 'all ok')
    if b: print('STOP: site check failed after', name); break
# theme
T.load('https://www.schmoll-asia.com/wp-admin/update-core.php', 14)
n=T.js('(function(){ var n=0; document.querySelectorAll("#update-themes-table tbody tr input[type=checkbox]").forEach(function(cb){ cb.checked=true; n++; }); return n; })()')
if n and n!='0':
    T.js('document.querySelector("#upgrade-themes, #upgrade-themes-2, form[name=upgrade-themes] input[type=submit]").click()')
    for i in range(60):
        time.sleep(5); t=T.js('(function(){ var b=document.body?document.body.innerText:""; return /All updates have been completed|Return to WordPress Updates|Go to WordPress Updates/i.test(b) ? "done" : "wait"; })()')
        if t=='done': break
    print('theme ->', t); time.sleep(6); print('theme check:', check() or 'all ok')
T.load('https://www.schmoll-asia.com/wp-admin/update-core.php', 14)
print('remaining:', T.js('(function(){ return JSON.stringify({plugins: document.querySelectorAll("#update-plugins-table tbody tr").length, themes: document.querySelectorAll("#update-themes-table tbody tr").length, core: (document.querySelector(".response")||{}).textContent||""}); })()'))
