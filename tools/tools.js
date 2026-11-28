/* NextStep free tools: shared behaviour. Theme key matches the main site ("nextstep-theme"). */
(function(){
 var root=document.documentElement,b=document.getElementById('tg');
 function ap(t,keep){root.setAttribute('data-theme',t);if(b){var l=t==='light';b.textContent=(l?'☾ Dark':'☀ Light');b.setAttribute('aria-label',l?'Switch to dark mode':'Switch to light mode')}if(keep){try{localStorage.setItem('nextstep-theme',t)}catch(e){}}}
 ap(root.getAttribute('data-theme')||'dark',false);
 if(b)b.addEventListener('click',function(){ap(root.getAttribute('data-theme')==='light'?'dark':'light',true)});
 var n=document.querySelector('nav');
 function fade(){if(!n)return;var max=n.scrollWidth-n.clientWidth;n.classList.toggle('s0',max>4&&n.scrollLeft<4);n.classList.toggle('s1',max>4&&n.scrollLeft>max-4)}
 if(n){n.addEventListener('scroll',fade,{passive:true});window.addEventListener('resize',fade);fade()}
 window.NS={copy:function(text,btn){var t=btn?btn.textContent:'';function ok(){if(btn){btn.textContent='✓ Copied';setTimeout(function(){btn.textContent=t},1400)}}
  if(navigator.clipboard&&window.isSecureContext)navigator.clipboard.writeText(text).then(ok,function(){fb()});else fb();
  function fb(){var a=document.createElement('textarea');a.value=text;a.style.position='fixed';a.style.opacity='0';document.body.appendChild(a);a.select();try{document.execCommand('copy');ok()}catch(e){}document.body.removeChild(a)}},
  fmt:function(x){if(!isFinite(x))return '—';var a=Math.abs(x);if(a!==0&&(a>=1e12||a<1e-6))return x.toExponential(4);return String(+x.toPrecision(10))}};
})();

/* ===== My Toolkit (hearts, saved on this device only), time-of-day greeting, Bangla/English toggle ===== */
(function(){
 var FK='nextstep-fav',LK='nextstep-lang',path=location.pathname.replace(/index\.html$/,'');
 var isHub=path==='/tools/',m=path.match(/^\/tools\/([a-z0-9-]+)\/$/),slug=m?m[1]:'';
 function rd(){try{var a=JSON.parse(localStorage.getItem(FK)||'[]');return Array.isArray(a)?a.filter(function(x){return typeof x==='string'}):[]}catch(e){return[]}}
 function wr(a){try{localStorage.setItem(FK,JSON.stringify(a))}catch(e){}}
 function lang(){try{return localStorage.getItem(LK)==='bn'?'bn':'en'}catch(e){return 'en'}}
 var BN={home:'হোম',tools:'ফ্রি টুলস',prog:'প্রোগ্রাম',apply:'আবেদন',assess:'অ্যাসেসমেন্ট দিন',privacy:'গোপনীয়তা',terms:'শর্তাবলী',contact:'যোগাযোগ',
  hub:'বিনামূল্যের অনলাইন টুলস',hublead:'দৈনন্দিন কাজের জন্য ব্যবহারিক টুলস। প্রতিটি টুল আপনার ব্রাউজারেই চলে, সাইন-আপ লাগে না, আর আপনার তথ্য আপনার ডিভাইসেই থাকে।',
  mytk:'আমার টুলকিট',mytkh:'আপনার সংরক্ষিত টুল শুধু এই ডিভাইসে থাকে।',save:'♡ আমার টুলকিটে রাখুন',saved:'♥ আমার টুলকিটে আছে',back:'আবার স্বাগতম।',
  g1:'শুভ সকাল',g2:'শুভ অপরাহ্ন',g3:'শুভ সন্ধ্যা',g4:'স্বাগতম'};
 var EN={g1:'Good morning',g2:'Good afternoon',g3:'Good evening',g4:'Hello',back:'Welcome back.',save:'♡ Save to My Toolkit',saved:'♥ Saved in My Toolkit',mytk:'My Toolkit',mytkh:'Your saved tools stay on this device only.'};
 function T(k){return lang()==='bn'?BN[k]:(EN[k]||k)}
 function gk(){var h=new Date().getHours();return h>=5&&h<12?'g1':h>=12&&h<17?'g2':h>=17&&h<21?'g3':'g4'}
 /* i18n of fixed interface text */
 var MAP=[['nav a[href="/"]','home'],['nav a[href="/tools/"]','tools'],['nav a[href="/#programmes"]','prog'],['nav a[href="/#apply"]','apply'],['nav a.cta','assess'],
  ['footer a[href="/"]','home'],['footer a[href="/tools/"]','tools'],['footer a[href="/privacy.html"]','privacy'],['footer a[href="/terms.html"]','terms'],['footer a[href="/#contact"]','contact'],
  ['.crumb a[href="/"]','home'],['.crumb a[href="/tools/"]','tools']];
 if(isHub)MAP.push(['main h1','hub'],['main .lead','hublead']);
 function applyLang(){var l=lang();document.documentElement.setAttribute('data-lang',l);MAP.forEach(function(p){[].forEach.call(document.querySelectorAll(p[0]),function(e){if(!e.hasAttribute('data-en'))e.setAttribute('data-en',e.textContent);e.textContent=l==='bn'?BN[p[1]]:e.getAttribute('data-en')})});
  var b=document.getElementById('lgb');if(b){b.textContent=l==='bn'?'English':'বাংলা';b.setAttribute('aria-label',l==='bn'?'Switch to English':'বাংলায় দেখুন')}
  favUI()}
 function addToggle(){var h=document.querySelector('header .w'),t=document.getElementById('tg');if(!h||document.getElementById('lgb'))return;var b=document.createElement('button');b.type='button';b.id='lgb';b.className='tg';b.onclick=function(){try{localStorage.setItem(LK,lang()==='bn'?'en':'bn')}catch(e){}applyLang()};if(t)h.insertBefore(b,t);else h.appendChild(b)}
 function greet(){if(!isHub&&slug!=='ai-skills-check')return;var g=document.getElementById('greet');if(!g){g=document.createElement('p');g.id='greet';g.className='greet';var a=document.querySelector('main h1');if(a)a.parentNode.insertBefore(g,a)}
  var s=T(gk());if(rd().length)s+='. '+T('back');else s+='.';g.textContent=s}
 /* hearts */
 function nm(a){var h=a.querySelector('h3');return h?h.textContent:'tool'}
 function sl(a){var x=(a.getAttribute('href')||'').match(/^\/tools\/([a-z0-9-]+)\//);return x?x[1]:''}
 function heart(a){if(a.parentNode.classList&&a.parentNode.classList.contains('cw'))return;var w=document.createElement('div');w.className='cw';a.parentNode.insertBefore(w,a);w.appendChild(a);var b=document.createElement('button');b.type='button';b.className='fav';b.setAttribute('data-slug',sl(a));b.onclick=function(){tog(sl(a))};w.appendChild(b)}
 function tog(s){var f=rd(),i=f.indexOf(s);if(i>-1)f.splice(i,1);else f.push(s);wr(f);favUI()}
 function favUI(){var f=rd();[].forEach.call(document.querySelectorAll('.fav'),function(b){var s=b.getAttribute('data-slug'),on=f.indexOf(s)>-1,a=b.parentNode.querySelector('a.card');b.textContent=on?'♥':'♡';b.setAttribute('aria-pressed',on?'true':'false');b.setAttribute('aria-label',(on?'Remove from My Toolkit: ':'Save to My Toolkit: ')+(a?nm(a):''));b.title=on?'Remove from My Toolkit':'Save to My Toolkit'});
  var p=document.getElementById('favp');if(p){var on=f.indexOf(slug)>-1;p.textContent=T(on?'saved':'save');p.setAttribute('aria-pressed',on?'true':'false')}
  if(isHub)mytk(f);if(isHub||slug==='ai-skills-check')greet()}
 function mytk(f){var sec=document.getElementById('mytk');var list=document.querySelector('#mainlist .cards')||document.querySelector('main .sec2 .cards');
  if(!sec){sec=document.createElement('section');sec.id='mytk';sec.className='sec2';sec.innerHTML='<h2></h2><p class="sub"></p><div class="cards"></div>';var first=document.querySelector('main .sec2');first.parentNode.insertBefore(sec,first);list.parentNode.id='mainlist'}
  var src=document.querySelectorAll('#mainlist .cards a.card'),box=sec.querySelector('.cards');sec.querySelector('h2').textContent=T('mytk');sec.querySelector('.sub').textContent=T('mytkh');box.innerHTML='';
  f.forEach(function(s){for(var i=0;i<src.length;i++)if(sl(src[i])===s){var c=src[i].cloneNode(true);var w=document.createElement('div');w.className='cw';w.appendChild(c);var b=document.createElement('button');b.type='button';b.className='fav';b.setAttribute('data-slug',s);b.onclick=function(){tog(s)};w.appendChild(b);box.appendChild(w);break}});
  sec.hidden=!box.children.length;
  [].forEach.call(box.querySelectorAll('.fav'),function(b){var a=b.parentNode.querySelector('a.card');b.textContent='♥';b.setAttribute('aria-pressed','true');b.setAttribute('aria-label','Remove from My Toolkit: '+(a?nm(a):''));b.title='Remove from My Toolkit'})}
 function init(){addToggle();
  if(isHub){[].forEach.call(document.querySelectorAll('main a.card[href^="/tools/"]'),heart)}
  else if(slug){[].forEach.call(document.querySelectorAll('main .cards a.card'),function(a){});var lead=document.querySelector('main .lead');if(lead&&slug!=='' ){var b=document.createElement('button');b.type='button';b.id='favp';b.className='btn sec favp';b.onclick=function(){tog(slug)};lead.parentNode.insertBefore(b,lead.nextSibling)}}
  applyLang()}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
 window.NSFav={get:rd,toggle:tog}})();
