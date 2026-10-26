'use strict';
function fitHeadings(){
 if(!document.documentElement.lang.startsWith('zh')){
  document.querySelectorAll('main h1,main h2,main h3').forEach(el=>{
   el.style.fontSize='';el.style.whiteSpace='';
   if(el.querySelector('.heading-phrase,.heading-tail,.sentence-line,.sentence-fit,.parent-title-line')||el.closest('.song-card'))return;
   const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);let node,last;
   while((node=walker.nextNode()))if(node.textContent.trim())last=node;
   if(!last)return;
   const m=last.textContent.match(/(\S+\s+\S+)(\s*)$/);
   if(!m||m[1].length>26)return;
   const span=document.createElement('span');span.className='heading-tail';span.textContent=m[1];
   const tail=last.splitText(last.textContent.length-m[0].length);tail.replaceWith(span,document.createTextNode(m[2]));
  });return;
 }
 if(document.querySelector('.phase-one'))return;
 document.querySelectorAll('body:not([data-home="true"]) main h1,body:not([data-home="true"]) main h2').forEach(el=>{
  if(el.querySelector('.growth-title-line,.parent-title-line')){el.style.fontSize='';el.style.whiteSpace='normal';return;}
  el.style.fontSize='';el.style.whiteSpace='nowrap';
  const available=el.clientWidth,natural=el.scrollWidth,size=parseFloat(getComputedStyle(el).fontSize);
  if(available&&natural>available){const next=size*available/natural;if(next>=20)el.style.fontSize=next+'px';else el.style.whiteSpace='normal'}
 });
}
window.addEventListener('resize',()=>requestAnimationFrame(fitHeadings));
document.fonts.ready.then(fitHeadings);
// Keep each Chinese word on one line: wrap multi-character words in nowrap elements.
// Custom tags (z-w, z-c, z-b) so existing `span` styles never apply to them.
function fitClauses(){
 document.querySelectorAll('z-c').forEach(c=>c.classList.remove('zc-free'));
 document.querySelectorAll('z-c').forEach(c=>{const h=c.closest('h1,h2,h3,p');if(h&&c.offsetWidth>h.clientWidth)c.classList.add('zc-free')});
}
window.addEventListener('resize',()=>requestAnimationFrame(fitClauses));
const keepWords=(()=>{
 if(typeof Intl==='undefined'||!Intl.Segmenter)return()=>{};
 // Site terms the browser dictionary splits (class names, curriculum words).
 const TERMS='知语乐 千惠老师 阅芽班 萌籽班 抽枝班 枝展班 繁叶班 绽放班 萌籽 抽枝 枝展 繁叶 绽放 阅芽 小芽 立干 奥尔夫 律动 跟唱 感统 多感官 五阶段 幼升小 小一 学前 学段 适龄 个月 年龄段 试听 体验课 绘本 共读 素养 潜能 亲子 家校 到访 手部 触觉 质感 控笔 纸笔 构字 认字 认读 字卡 树苗 蓄力 宋锦 纹样 共创 每堂 班额 时段 时长 场次 在线 可选 复盘 唱响 敬请 小贴士 好评 寄语 手记 育儿 全人 六维 维度 因材施教 二选一 熟悉感 安全感 成就感 自驾 一键 预览 点击 链接 剪贴板 短片 短语 构建 主线 童谣 抓握 脚尖 乘风 听懂 持牌 师生 加载 重试 华文 华语 记下 小学华文衔接'.split(' ').sort((a,b)=>b.length-a.length);
 const seg=new Intl.Segmenter('zh',{granularity:'word'}),termRe=new RegExp('('+TERMS.join('|')+')'),han=/^[㐀-鿿豈-﫿]{2,8}$/;
 const skip='script,style,textarea,select,option,[contenteditable],z-w';
 // Particles such as 的 stay with the word before them so a line never starts with one.
 const words=t=>t.split(termRe).flatMap((part,i)=>i%2?[part]:[...seg.segment(part)].map(x=>x.segment)).reduce((out,w)=>{
  if(/^[的了着地得们吗呢吧中里]$/.test(w)&&/[\u3400-\u9fff]$/.test(out.at(-1)||''))out[out.length-1]+=w;else out.push(w);return out},[]);
 let observer;
 function run(){
  if(!document.documentElement.lang.startsWith('zh'))return;
  observer?.disconnect();
  // Older markup kept fixed character runs together, which split words; let words decide instead.
  document.querySelectorAll('main .reading-unit').forEach(u=>{const p=u.parentNode;u.replaceWith(...u.childNodes);p.normalize()});
  // Headings and short card lines break only between clauses (after ，。？！；：), unless a clause is wider than the line.
  document.querySelectorAll('main :is(h1,h2,h3,p)').forEach(h=>{
   if(h.querySelector('z-c')||h.tagName==='P'&&h.textContent.trim().length>32||/flex|grid/.test(getComputedStyle(h).display))return;
   const tw=document.createTreeWalker(h,NodeFilter.SHOW_TEXT);const list=[];while(tw.nextNode())list.push(tw.currentNode);
   for(const t of list){
    const pieces=t.data.split(/(?<=[，。？！；：])/).filter(Boolean);if(pieces.length<2)continue;
    const frag=document.createDocumentFragment();
    for(const piece of pieces){const c=document.createElement('z-c');c.textContent=piece;frag.append(c)}
    t.replaceWith(frag);
   }
  });
  const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT,{acceptNode:n=>/[\u3400-\u9fff]{2}/.test(n.data)&&!n.parentElement?.closest(skip)?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT});
  const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
  for(const node of nodes){
   const parts=words(node.data);if(!parts.some(p=>han.test(p)))continue;
   const frag=document.createDocumentFragment();let text='';
   for(const part of parts){
    if(han.test(part)){if(text)frag.append(text);text='';const span=document.createElement('z-w');span.textContent=part;frag.append(span)}
    else text+=part;
   }
   if(text)frag.append(text);
   // In a flex or grid container every span would become its own item, so keep the run together.
   if(/flex|grid/.test(getComputedStyle(node.parentElement).display)){const box=document.createElement('z-b');box.append(frag);node.replaceWith(box)}
   else node.replaceWith(frag);
  }
  observer?.observe(document.body,{childList:true,subtree:true,characterData:true});
 }
 let queued=false;const schedule=()=>{if(!queued){queued=true;requestAnimationFrame(()=>{queued=false;run();fitHeadings();fitClauses()})}};
 observer=new MutationObserver(schedule);
 return schedule;
})();
keepWords();
function initPage(){
 requestAnimationFrame(fitHeadings);
 const nav=document.querySelector('.header .nav'),active=nav?.querySelector('[aria-current="page"]');
 if(nav&&active)requestAnimationFrame(()=>{const n=nav.getBoundingClientRect(),a=active.getBoundingClientRect();nav.scrollLeft+=a.left-n.left-(nav.clientWidth-a.width)/2});

// Google Apps Script web app that records enquiries and emails the centre.
const ENQUIRY_ENDPOINT='https://script.google.com/macros/s/AKfycbyG6BLZJU2wMt9eyLXv6mabrH-yq9VUeO0XGYffnrPtPGbb5T0mG9tJDYnTlCaZfNR2/exec';
const form=document.querySelector('#enquiry-form');
if(form){
 const en=form.dataset.lang==='en',say=(zh,eng)=>en?eng:zh;
 const programme=new URLSearchParams(location.search).get('programme');
 if(['pg','n1','n2','k1','k2'].includes(programme))form.elements.programme.value=programme;
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(!form.reportValidity())return;
  const data=new FormData(form),selected=form.elements.programme.selectedOptions[0].textContent;
  const draft=[say('你好，我想了解知语乐 ZHIYULE 体验课。','Hello, I would like to enquire about a ZHIYULE trial.'),...(data.get('parent')?[say('家长称呼：','Parent name: ')+data.get('parent')]:[]),...(data.get('phone')?[say('联系电话：','Phone: ')+data.get('phone')]:[]),say('孩子年龄：','Child’s age: ')+data.get('age'),say('意向班级：','Programme: ')+selected,say('中文经验：','Mandarin exposure: ')+data.get('experience'),...(data.get('question')?[say('想了解：','My questions: ')+data.get('question')]:[]),say('请告知可预约日期、费用、陪同与取消安排，谢谢。','Please share available dates, fees, accompaniment and cancellation arrangements. Thank you.')].join('\n');
  document.querySelector('#enquiry-draft').value=draft;document.querySelector('#draft-area').hidden=false;
  const status=document.querySelector('#form-status'),button=form.querySelector('[type="submit"]');
  status.textContent=say('正在提交……','Sending…');if(button)button.disabled=true;
  let sent=false;
  if(ENQUIRY_ENDPOINT&&!data.get('website')){
   const body=new URLSearchParams({lang:en?'en':'zh',parent:data.get('parent')||'',phone:data.get('phone')||'',age:data.get('age')||'',programme:selected,experience:data.get('experience')||'',question:data.get('question')||'',page:location.pathname});
   try{await fetch(ENQUIRY_ENDPOINT,{method:'POST',mode:'no-cors',body});sent=true}catch{}
  }
  if(button)button.disabled=false;
  status.textContent=sent?say('已收到你的咨询，中心会尽快通过 WhatsApp 或电话联系你。提交咨询不代表已预约名额。也可以点“打开 WhatsApp”直接和我们聊。','Thank you, we have received your enquiry and will contact you by WhatsApp or phone soon. This does not reserve a place. You can also tap “Open WhatsApp” to chat with us now.'):say('网络问题，咨询暂未提交。请点“打开 WhatsApp”发送给中心，或稍后再试。','We could not send your enquiry. Please tap “Open WhatsApp” to send it to the centre, or try again later.');
  const wa=document.querySelector('#send-whatsapp');if(wa){wa.href='https://wa.me/6580719508?text='+encodeURIComponent(draft);wa.hidden=false}
 });
 const draftField=document.querySelector('#enquiry-draft'),waLink=document.querySelector('#send-whatsapp');
 if(draftField&&waLink)draftField.addEventListener('input',()=>{waLink.href='https://wa.me/6580719508?text='+encodeURIComponent(draftField.value)});
 document.querySelector('#copy-enquiry').addEventListener('click',async()=>{
  const field=document.querySelector('#enquiry-draft');
  try{await navigator.clipboard.writeText(field.value);document.querySelector('#form-status').textContent=say('已复制。内容未发送至中心。','Copied. Nothing has been sent to the centre.')}catch{field.focus();field.select();document.querySelector('#form-status').textContent=say('请手动复制已选中的咨询内容。','Please copy the selected enquiry text manually.')}
 });
}

try{localStorage.setItem('zhiyule-language',document.documentElement.lang.startsWith('zh')?'zh':'en')}catch{}
}
initPage();
// One audio element and shared controls on every page. Music starts by default on each visit;
// turning it off is remembered only for the current visit.
(()=>{
 const audio=document.getElementById('theme-audio');if(!audio)return;
 const say=(a,b)=>document.documentElement.lang.startsWith('zh')?a:b;
 const toggles=()=>[...document.querySelectorAll('.music-toggle')];
 const statuses=()=>[...document.querySelectorAll('.music-status')];
 const read=(key)=>{try{return sessionStorage.getItem(key)}catch{return null}};
 const write=(key,value)=>{try{sessionStorage.setItem(key,value)}catch{}};
 try{localStorage.removeItem('zhiyule-music')}catch{}
 let wantsPlay=read('zhiyule-music')!=='off',requestVersion=0,awaitingGesture=false;
 audio.volume=.32;
 let lastSaved=0;
 const message=text=>statuses().forEach(el=>el.textContent=text);
 function update(){
  const playing=!audio.paused&&!audio.ended;
  toggles().forEach(b=>{if(!b.classList.contains('music-speaker')&&!b.classList.contains('music-hint-play'))b.textContent=playing?say('暂停','Pause'):say('播放主题曲','Play song');b.setAttribute('aria-label',playing?say('暂停主题曲','Pause theme song'):say('播放主题曲','Play theme song'));b.setAttribute('aria-pressed',String(playing))});
  document.body.classList.toggle('music-playing',playing);
 }
 function rememberPosition(){try{sessionStorage.setItem('zhiyule-music-position',String(audio.currentTime||0))}catch{}}
 audio.addEventListener('loadedmetadata',()=>{
  try{const n=Number(sessionStorage.getItem('zhiyule-music-position'));if(Number.isFinite(n)&&n>0&&n<audio.duration)audio.currentTime=n}catch{}
 });
 async function play(){
  const version=++requestVersion;wantsPlay=true;write('zhiyule-music','on');
  try{
   await audio.play();awaitingGesture=false;
   if(version!==requestVersion||!wantsPlay){audio.pause();return}
   message(say('正在播放《星光发芽》；你可以随时暂停或关闭。','Playing Starlight Sprouts. Pause or turn it off whenever you like.'));
  }catch(err){
   if(version!==requestVersion||!wantsPlay)return;
   awaitingGesture=err.name==='NotAllowedError';
   message(err.name==='NotAllowedError'?say('轻触页面即可开始音乐，随时可用小喇叭关闭。','Tap the page to start the music; use the speaker button to turn it off anytime.'):say('音乐暂时未能加载，请点击播放再试一次。','The song could not load. Press play to try again.'));
  }update();
 }
 function stop(){awaitingGesture=false;wantsPlay=false;++requestVersion;audio.pause();write('zhiyule-music','off');rememberPosition();message(say('音乐已关闭，已记住你的选择。','Music is off. Your choice has been remembered.'));update()}
 document.addEventListener('click',ev=>{
  if(ev.target.closest('.music-toggle')){if(audio.paused)play();else stop()}
  if(ev.target.closest('.music-off')){stop();return}
 });
 // Browsers only allow sound after the visitor interacts, so start on the first tap, click or key press.
 const firstGesture=ev=>{if(awaitingGesture&&wantsPlay&&!ev.target.closest?.('.music-toggle,.music-off')){awaitingGesture=false;play()}};
 for(const type of ['pointerdown','touchend','keydown','click'])document.addEventListener(type,firstGesture,{capture:true,passive:true});
 document.addEventListener('zhiyule:navigate',()=>{update();message(audio.paused?say('点击播放，让主题曲陪你浏览。','Press play to listen while you browse.'):say('主题曲正在播放。','The theme song is playing.'))});
 document.addEventListener('play',ev=>{if(ev.target.tagName==='VIDEO'){awaitingGesture=false;wantsPlay=false;++requestVersion;audio.pause();rememberPosition();message(say('视频播放中，主题曲已暂停。','The theme song is paused while the video plays.'));update()}},true);
 audio.addEventListener('play',update);audio.addEventListener('pause',update);
 audio.addEventListener('error',()=>{message(say('音乐暂时无法播放，请稍后重试。','The song is unavailable right now. Please try again later.'));update()});
 audio.addEventListener('timeupdate',()=>{if(Date.now()-lastSaved>2000){rememberPosition();lastSaved=Date.now()}});
 window.addEventListener('pagehide',rememberPosition);
 // A small invitation to listen, shown while the song is waiting for the visitor.
 const hint=document.createElement('div');hint.className='music-hint';hint.hidden=true;
 hint.innerHTML='<button type="button" class="music-toggle music-hint-play"><span class="music-hint-note" aria-hidden="true">♪</span><span class="music-hint-text"></span></button><button type="button" class="music-off music-hint-close"><span aria-hidden="true">×</span></button>';
 document.body.append(hint);
 function showHint(){
  hint.querySelector('.music-hint-text').textContent=say('点一下，听主题曲《星光发芽》','Tap to hear our theme song');
  hint.querySelector('.music-hint-close').setAttribute('aria-label',say('关闭音乐提示','Close music hint'));
  hint.hidden=!(audio.paused&&wantsPlay);requestAnimationFrame(()=>hint.classList.toggle('is-visible',!hint.hidden));
 }
 audio.addEventListener('play',showHint);audio.addEventListener('pause',showHint);
 document.addEventListener('click',ev=>{if(ev.target.closest('.music-off'))showHint()});
 setTimeout(showHint,1200);
 update();
 if(wantsPlay)play();
 else if(!wantsPlay)message(say('音乐已关闭。点击播放即可重新开启。','Music is off. Press play to listen again.'));
})();

// Keep the document and its audio element alive while replacing page content.
(()=>{
 let navigation=null;
 function closeMenu(){const d=document.querySelector('#site-menu');if(d?.open)d.close();document.querySelector('.menu-button')?.setAttribute('aria-expanded','false')}
 document.addEventListener('click',ev=>{
  if(ev.target.closest('.menu-button')){const d=document.querySelector('#site-menu');d.showModal();ev.target.closest('.menu-button').setAttribute('aria-expanded','true');return}
  if(ev.target.closest('[data-close-menu]'))closeMenu();
  if(ev.target.id==='site-menu')closeMenu();
  const a=ev.target.closest('a[href]');if(!a||ev.defaultPrevented||ev.button!==0||ev.metaKey||ev.ctrlKey||ev.shiftKey||ev.altKey||a.target||a.hasAttribute('download'))return;
  const u=new URL(a.href,location.href);
  if(u.origin!==location.origin||/^\/(api|media|assets|manage|signin-with-chatgpt|signout-with-chatgpt)\b/.test(u.pathname))return;
  if(u.pathname===location.pathname&&u.search===location.search){closeMenu();return}
  ev.preventDefault();navigate(u,true);
 });
 async function navigate(u,push){
  navigation?.abort();const controller=new AbortController();navigation=controller;
  document.querySelector('main')?.setAttribute('aria-busy','true');
  try{
   const r=await fetch(u.pathname+u.search,{cache:'no-cache',signal:controller.signal,headers:{'X-ZHIYULE-Navigation':'1'}});
   if(!r.ok||!r.headers.get('content-type')?.includes('text/html'))throw new Error('Navigation unavailable');
   const doc=new DOMParser().parseFromString(await r.text(),'text/html');
   if(!doc.querySelector('main')||controller.signal.aborted)return;
   closeMenu();
   for(const selector of ['header.header','main','footer.footer','.topline']){
    const old=document.querySelector(selector),next=doc.querySelector(selector);if(old&&next)old.replaceWith(next);
   }
   document.title=doc.title;document.documentElement.lang=doc.documentElement.lang;
   document.body.dataset.home=doc.body.dataset.home;
   const description=doc.querySelector('meta[name="description"]');if(description)document.querySelector('meta[name="description"]')?.setAttribute('content',description.content);
   if(push)history.pushState({},'',u.pathname+u.search+u.hash);
   initPage();await hydrateContent();if(controller.signal.aborted)return;
   document.dispatchEvent(new Event('zhiyule:navigate'));
   if(u.hash)document.getElementById(decodeURIComponent(u.hash.slice(1)))?.scrollIntoView();else window.scrollTo(0,0);
   const h=document.querySelector('main h1');if(h){h.setAttribute('tabindex','-1');h.focus({preventScroll:true})}
  }catch(err){if(err.name!=='AbortError')location.assign(u.href)}
  finally{if(!controller.signal.aborted)document.querySelector('main')?.removeAttribute('aria-busy')}
 }
 window.addEventListener('popstate',()=>navigate(new URL(location.href),false));
 document.addEventListener('close',ev=>{if(ev.target.id==='site-menu')document.querySelector('.menu-button')?.setAttribute('aria-expanded','false')},true);
})();
const contentText=v=>typeof v==='string'?v:(v?.[document.documentElement.lang.startsWith('zh')?'zh':'en']||'');
const dom=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text)n.textContent=text;return n};
function mediaNode(media){
 if(!media?.url)return null;
 const n=dom(media.type==='video'?'video':'img');n.src=media.url;
 if(media.type==='video'){n.controls=true;n.playsInline=true;n.preload='metadata'}else{n.alt=contentText(media.alt)||'';n.loading='lazy'}
 return n;
}
let editorAvailable=false;
async function hydrateContent(){
 const zh=document.documentElement.lang.startsWith('zh'),say=(a,b)=>zh?a:b;
 document.querySelectorAll('.owner-entry').forEach(el=>el.hidden=!editorAvailable);
 try{
  const r=await fetch('/content-snapshot.json',{cache:'no-store'});if(!r.ok)throw new Error('unavailable');const {content}=await r.json();
  for(const [slot,media] of Object.entries(content.media||{})){
   document.querySelectorAll(`[data-media-slot="${slot}"]`).forEach(el=>{const n=mediaNode(media);if(n)el.replaceChildren(n)});
  }
  for(const [key,list] of [['events',content.events],['parent-posts',content.posts],['reviews',content.reviews]]){
   if(!list?.length)continue;
   const target=document.querySelector(`[data-content-list="${key}"]`);if(!target)continue;
   const grid=dom('div','community-grid');
   for(const item of list){const card=dom('article','community-card');const media=mediaNode(item.media);if(media)card.append(media);const copy=dom('div','community-copy');if(item.date)copy.append(dom('p','eyebrow',item.date));copy.append(dom('h3','',contentText(item.title)),dom('p','preserve-lines',contentText(item.body)));card.append(copy);grid.append(card)}
   target.replaceChildren(grid);
  }
  const branches=document.querySelector('[data-content-list="branches"]');
  if(branches&&content.branches?.length){
   branches.replaceChildren();
   for(const b of content.branches){
    const card=dom('article','branch-card'),info=dom('div'),map=dom('div','branch-map');
    info.append(dom('p','eyebrow',say('知语乐成长空间','ZHIYULE')),dom('h2','',contentText(b.name)),dom('p','preserve-lines',contentText(b.address)));
    if(b.hours)info.append(dom('p','preserve-lines',contentText(b.hours)));
    if(b.phone){const a=dom('a','contact-link',b.phone);a.href='tel:'+b.phone.replace(/[^+0-9]/g,'');info.append(a)}
    if(b.email){const a=dom('a','contact-link',b.email);a.href='mailto:'+b.email;info.append(a)}
    map.append(dom('span','map-mark','⌖'),dom('h3','','Google Maps'));
    if(b.mapUrl){const a=dom('a','button',say('查看地图与路线','View map & directions'));a.href=b.mapUrl;a.target='_blank';a.rel='noopener noreferrer';map.append(a)}else map.append(dom('p','',say('地图即将更新','Map coming soon')));
    card.append(info,map);branches.append(card);
   }
  }
  const socials=document.querySelector('[data-content-list="socials"]');if(socials&&content.socials?.length){socials.replaceChildren();for(const social of content.socials){const a=dom('a','social-link',social.label);a.href=social.url;a.target='_blank';a.rel='noopener noreferrer';socials.append(a)}}
 }catch{
  const target=document.querySelector('[data-content-list="branches"], [data-content-list="events"], [data-content-list="parent-posts"]');
  if(target&&!target.querySelector('.content-unavailable'))target.append(dom('p','micro content-unavailable',say('最新内容暂时未能载入，请稍后刷新。','The latest content could not load. Please refresh shortly.')));
 }
}

hydrateContent();

// The heart lands on each vocal onset; flight is tied to the audio clock.
(()=>{
 const audio=document.getElementById('theme-audio');if(!audio)return;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let frame=0,box=null,track=null,heart=null,chars=[],lines=[],active=null,currentLine=null;
 function bind(){
  box=document.querySelector('.lyrics-window');track=box?.querySelector('.lyrics-track');chars=box?[...box.querySelectorAll('[data-start]')]:[];lines=box?[...box.querySelectorAll('.lyric-line')]:[];active=null;currentLine=null;
  if(track){heart=document.createElement('span');heart.className='lyric-heart-marker';heart.textContent='♥';heart.setAttribute('aria-hidden','true');track.append(heart)}else heart=null;
  render(true);
 }
 function render(force=false){
  if(!box||!box.isConnected)return;
  const time=audio.currentTime;let index=-1;
  for(let i=0;i<chars.length&&Number(chars[i].dataset.start)<=time;i++)index=i;
  const current=chars[index],next=chars[index+1],singing=current&&time<Number(current.dataset.end)?current:null;
  const line=current?.closest('.lyric-line')||lines[0];
  if(force||singing!==active){active?.classList.remove('is-current');singing?.classList.add('is-current');active=singing;chars.forEach(el=>el.classList.toggle('is-sung',time>=Number(el.dataset.end)))}
  if(force||line!==currentLine){currentLine?.classList.remove('is-current');line?.classList.add('is-current');currentLine=line;if(line){const top=line.getBoundingClientRect().top-box.getBoundingClientRect().top+box.scrollTop-(box.clientHeight-line.offsetHeight)/2;box.scrollTo({top:Math.max(0,top),behavior:force||reduced.matches?'instant':'smooth'})}}
  if(!heart)return;
  heart.hidden=!current||(!next&&time>=Number(current.dataset.end));if(heart.hidden)return;
  const origin=track.getBoundingClientRect(),a=current.getBoundingClientRect();let x=a.left-origin.left+a.width/2,y=a.top-origin.top-10;
  if(next){
   const interval=Number(next.dataset.start)-Number(current.dataset.start),duration=Math.min(.22,interval*.4);
   const progress=Math.max(0,Math.min(1,(time-(Number(next.dataset.start)-duration))/Math.max(duration,.001)));
   if(progress>0){const b=next.getBoundingClientRect();x+=(b.left-origin.left+b.width/2-x)*progress;y+=(b.top-origin.top-10-y)*progress;if(!reduced.matches)y-=Math.sin(Math.PI*progress)*16}
  }
  heart.style.left=x+'px';heart.style.top=y+'px';
 }
 function tick(){render();if(!audio.paused)frame=requestAnimationFrame(tick)}
 audio.addEventListener('play',()=>{cancelAnimationFrame(frame);tick()});audio.addEventListener('pause',()=>{cancelAnimationFrame(frame);render()});
 for(const event of ['timeupdate','seeked','loadedmetadata','ended'])audio.addEventListener(event,()=>render());
 document.addEventListener('zhiyule:navigate',bind);window.addEventListener('resize',()=>render(true));document.fonts.ready.then(()=>render(true));bind();
})();
