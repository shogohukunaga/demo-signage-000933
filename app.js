/* Original implementation based on measured layout/timing; no reference code reused. */
const menu=document.querySelector('#menu'), opener=document.querySelector('.menu-toggle');
opener?.addEventListener('click',()=>{menu.showModal();opener.setAttribute('aria-expanded','true');document.body.style.overflow='hidden'});
function closeMenu(){menu.close();opener.setAttribute('aria-expanded','false');document.body.style.overflow='';opener.focus({preventScroll:true})}
document.querySelector('.menu-close')?.addEventListener('click',closeMenu);
menu?.addEventListener('cancel',e=>{e.preventDefault();closeMenu()});
menu?.querySelectorAll('a').forEach(a=>a.addEventListener('click',closeMenu));
const preference=matchMedia('(prefers-reduced-motion: reduce)');
let paused=preference.matches, pending=false;
const motionButton=document.querySelector('.motion-toggle');
function applyPreference(){
 document.documentElement.classList.toggle('motion-off',paused);
 if(motionButton){motionButton.textContent=paused?'動きを再開':'動きを止める';motionButton.setAttribute('aria-pressed',String(paused))}
 schedule();
}
motionButton?.addEventListener('click',()=>{paused=!paused;applyPreference()});
preference.addEventListener('change',e=>{paused=e.matches;applyPreference()});
function splitLetters(element){
 let index=0;
 function split(node){
  if(node.nodeType===Node.TEXT_NODE){
   const frag=document.createDocumentFragment();
   for(const c of node.textContent){const span=document.createElement('span');span.className='char';span.textContent=c;span.style.setProperty('--i',index);span.style.setProperty('--dx',((index*7)%19-9)+'px');span.style.setProperty('--dy',((index*11)%19-9)+'px');frag.append(span);index++}
   node.replaceWith(frag);
  }else if(node.nodeType===Node.ELEMENT_NODE&&node.tagName!=='BR'){[...node.childNodes].forEach(split)}
 }
 [...element.childNodes].forEach(split);
}
document.querySelectorAll('.split-line,.blur-heading').forEach(splitLetters);
document.documentElement.classList.add('motion-ready');
const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{
 if(entry.isIntersecting){entry.target.classList.add('revealed');observer.unobserve(entry.target)}
}),{rootMargin:'0px 0px -15% 0px'});
document.querySelectorAll('.blur-heading,.story-heading,.sign-head,.journal-head').forEach(el=>observer.observe(el));
const zooms=[...document.querySelectorAll('[data-zoom]')];
const floating=[...document.querySelectorAll('.parallax')];
const ink=document.querySelector('.ink-text');
const lightStart=document.querySelector('#signs'),lightEnd=document.querySelector('#process');
const bound=v=>Math.max(0,Math.min(1,v));
function update(){
 pending=false;
 const height=innerHeight;
 for(const el of zooms){
  const r=el.getBoundingClientRect(), amount=bound((height-r.top)/(height*.5+r.height));
  const scale=paused?1:Number(el.dataset.zoom)+(1-Number(el.dataset.zoom))*amount;
  el.querySelector('img').style.transform='scale('+scale.toFixed(4)+')';
 }
 for(const el of floating){const r=el.parentElement.getBoundingClientRect();const progress=bound((height-r.top)/(height+r.height));el.style.transform=paused||innerWidth<701?'none':'translateY('+((progress-.5)*innerWidth*.045).toFixed(1)+'px)'}
 if(ink){const r=ink.getBoundingClientRect();ink.style.opacity=paused?'1':String(.3+.7*bound((height*.85-r.top)/(height*.35)))}
 if(lightStart&&lightEnd){document.body.classList.toggle('light-zone',lightStart.getBoundingClientRect().top<height*.5&&lightEnd.getBoundingClientRect().bottom>height*.5)}
}
function schedule(){if(!pending){pending=true;requestAnimationFrame(update)}}
addEventListener('scroll',schedule,{passive:true});addEventListener('resize',schedule);
applyPreference();
const pictures=[...document.querySelectorAll('.process-pictures img')],processLinks=[...document.querySelectorAll('[data-picture]')];
function selectPicture(link){pictures.forEach((img,i)=>img.classList.toggle('active',i===Number(link.dataset.picture)));processLinks.forEach(a=>a.classList.toggle('current',a===link))}
processLinks.forEach(link=>{link.addEventListener('mouseenter',()=>selectPicture(link));link.addEventListener('focus',()=>selectPicture(link))});
if(processLinks[0])selectPicture(processLinks[0]);
