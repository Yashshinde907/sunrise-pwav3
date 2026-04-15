// main.js — App bootstrap, navigation, menu drawer, pull-to-refresh, sync clock
// Must load LAST — defines APP global used by other modules

const APP = { syncTimer:null, heartTimer:null, lastSync:null };

// window.addEventListener('load',()=>{
//   setTimeout(()=>{
//     // Loader.hideGlobal();
//     Loader.hide?.() || Loader.hideGlobal?.() || Loader.finishProgress?.();
//     if(ls('sr_auth')==='1'){
//       const appEl=$('app');if(appEl)appEl.style.display='block';
//       bootApp();
//     } else {
//       const ls2=$('login-scr');if(ls2)ls2.style.display='flex';
//     }
//     lucide.createIcons();
//   },1200);
//   if('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(()=>{});
//   initPullToRefresh();
// });

window.addEventListener('load',()=>{
  setTimeout(()=>{
    // Replace the error-prone line with the valid method used in goSec
    if(typeof Loader !== 'undefined') {
      Loader.finishProgress(); 
    }

    if(ls('sr_auth')==='1'){
      const appEl=$('app');
      if(appEl) appEl.style.display='block';
      bootApp();
    } else {
      const ls2=$('login-scr');
      if(ls2) ls2.style.display='flex';
    }
    lucide.createIcons();
  },1200);
  
  if('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(()=>{});
  initPullToRefresh();
});

function bootApp(){
  populateDrawer();
  const desig=ls('sr_desig');
  const fn=$('f-name'),ln=$('l-name');
  const name=ls('sr_name')||me();
  if(fn)fn.value=name; if(ln)ln.value=name;
  if(desig){const fd=$('f-desig');if(fd){fd.value=desig;toggleDesig();}}
  $$('.admin-el').forEach(el=>el.style.display=isAdmin()?'':'none');
  if(isAdmin()){
    const sf=$('sub-filters');if(sf)sf.style.display='flex';
    const cs=$('chart-sec');if(cs)cs.style.display='flex';
    const ps=$('perf-sec');if(ps)ps.style.display='flex';
  } else {
    // Non-digital agents can see their own perf section
    const myDes=ls('sr_desig').toLowerCase();
    const ps=$('perf-sec');if(ps)ps.style.display=myDes==='digital'?'none':'flex';
  }
  const tb=$('tab-bar');if(tb)tb.classList.add('on');
  addCl(); fetchAll(); startSync(); startHeartbeat(); startSyncClock();
}

function startSyncClock(){
  setInterval(()=>{
    if(APP.lastSync){const st=$('sync-txt');if(st)st.textContent='Synced '+fmtTime(APP.lastSync);}
  },1000);
}

// ── NAVIGATION with route transition loader ──
function goSec(sec){
  $$('.sec').forEach(s=>s.classList.remove('on'));
  $$('.tab,.nav-item,.menu-item').forEach(b=>b.classList.remove('on'));
  const el=$('sec-'+sec);if(el){el.classList.add('on');Loader.showSection('sec-'+sec);}
  const tb=$('tb-'+sec);if(tb)tb.classList.add('on');
  const sn=$('sn-'+sec);if(sn)sn.classList.add('on');
  const mn=$('mn-'+sec);if(mn)mn.classList.add('on');
  if(sec==='audit')  fetchAudit();
  if(sec==='teams')  renderTeams();
  if(sec==='users')  renderUsers();
  if(sec==='backup') fetchBackups();
  closeDrawer();closeMenu();
  window.scrollTo({top:0,behavior:'smooth'});
  lucide.createIcons();
  Loader.finishProgress();
}

// ── MENU DRAWER ──
function toggleMenu(){
  const d=$('menu-drawer'),o=$('menu-overlay');
  const open=d&&d.classList.contains('open');
  if(!open)closeDrawer();
  if(d)d.classList.toggle('open',!open);
  if(o)o.classList.toggle('open',!open);
}
function closeMenu(){
  const d=$('menu-drawer'),o=$('menu-overlay');
  if(d)d.classList.remove('open');if(o)o.classList.remove('open');
}

// ── PROFILE DRAWER (defined in auth.js, aliases here for goSec) ──
// toggleDrawer, closeDrawer defined in auth.js

// ── PULL-TO-REFRESH ──
function initPullToRefresh(){
  let startY=0,pulling=false;
  document.addEventListener('touchstart',e=>{if(window.scrollY===0)startY=e.touches[0].clientY;},{passive:true});
  document.addEventListener('touchmove',e=>{
    if(!startY)return;
    if(e.touches[0].clientY-startY>60&&!pulling){pulling=true;const ptr=$('ptr');if(ptr)ptr.classList.add('show');}
  },{passive:true});
  document.addEventListener('touchend',()=>{
    if(pulling){pulling=false;startY=0;const ptr=$('ptr');if(ptr)ptr.classList.remove('show');manualRefresh();}
  });
}
