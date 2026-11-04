/*
 * The intro runs from a small static script in the page head (see `introScript`), not from the
 * React bundle: on a slow phone the bundle arrives seconds after the page, and the pen would sit
 * still until the CSS failsafe hid it. The head script starts drawing as soon as the overlay is
 * in the page.
 *
 * <html data-intro> tracks it: unset while playing, "leaving" while the overlay fades, "seen" once
 * gone (CSS hides the overlay). The hero listens for the "ws-intro-done" event, fired as the fade starts.
 */

const WRITE_MS = 2000; // pen writing
const HOLD_MS = 250; // finished wordmark rests
const FADE_MS = 350; // overlay fades out
/** Longest a page waits for the intro before going ahead anyway (matches the CSS failsafe). */
const WAIT_LIMIT_MS = 4500;

/** Calls `done` once the intro has finished (at once if it already has, or never plays). Returns a cleanup. */
export function onIntroDone(done: () => void): () => void {
  const html = document.documentElement;
  const playing = !!document.querySelector(".ws-preloader") && !html.dataset.intro;
  if (!playing) {
    done();
    return () => {};
  }
  let fired = false;
  const fire = () => {
    if (fired) return;
    fired = true;
    window.clearTimeout(timer);
    window.removeEventListener("ws-intro-done", fire);
    done();
  };
  window.addEventListener("ws-intro-done", fire);
  const timer = window.setTimeout(fire, WAIT_LIMIT_MS);
  return () => {
    fired = true;
    window.clearTimeout(timer);
    window.removeEventListener("ws-intro-done", fire);
  };
}

// Static, our own code only (allowed by docs/GUIDE.md as "the static intro script"). Plays once per tab
// session; reduced-motion visitors see the finished wordmark briefly. Pages without the overlay
// (admin) are left alone.
export const introScript = `(function(){
var d=document.documentElement;
try{if(sessionStorage.getItem('ws-intro')){d.dataset.intro='seen';return}}catch(e){}
function start(el){
el.classList.add('is-running');
d.style.overflow='hidden';
var ps=[].slice.call(el.querySelectorAll('mask path')),nib=el.querySelector('[data-nib]');
var ls=ps.map(function(p){return p.getTotalLength()}),tot=ls.reduce(function(a,b){return a+b},0);
function finish(){
d.style.overflow='';d.dataset.intro='leaving';el.style.opacity='0';
try{sessionStorage.setItem('ws-intro','1')}catch(e){}
window.dispatchEvent(new Event('ws-intro-done'));
setTimeout(function(){d.dataset.intro='seen'},${FADE_MS});
}
if(matchMedia('(prefers-reduced-motion: reduce)').matches){
ps.forEach(function(p){p.style.strokeDashoffset='0';p.style.visibility='visible'});
if(nib)nib.style.opacity='0';
setTimeout(finish,700);return;
}
var t0=0;
function ease(t){return t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2}
function tick(now){
if(!t0)t0=now;
var pr=ease(Math.min(1,(now-t0)/${WRITE_MS})),dr=pr*tot,pt=null;
for(var i=0;i<ps.length;i++){
var L=ls[i],v=Math.max(0,Math.min(L,dr));
ps[i].style.strokeDashoffset=String(1-v/L);
ps[i].style.visibility=v>0?'visible':'hidden';
if(!pt&&dr<L)pt=ps[i].getPointAtLength(Math.max(0,v));
dr-=L;
}
if(nib){if(pt)nib.setAttribute('transform','translate('+pt.x+' '+pt.y+')');else nib.style.opacity='0'}
if(pr<1)requestAnimationFrame(tick);else setTimeout(finish,${HOLD_MS});
}
requestAnimationFrame(tick);
}
function find(){
var el=document.querySelector('.ws-preloader');
if(el)start(el);else if(document.readyState==='loading')requestAnimationFrame(find);
}
find();
})();`;

export const INTRO_FADE_MS = FADE_MS;
