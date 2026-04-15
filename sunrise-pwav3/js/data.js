// data.js — Data fetch, sync, all filters (Today/Yesterday/Week/LastWeek/Month/Year/Range/All)
let GD=null, cfg={Call_Target:50,Booking_Target:2,WA_Template:'',SMS_Template:'',Email_Template:'',Email_Subject:''};
let flt='today', dFlt='all', tFlt='', isRangeOpen=false;

async function fetchAll() {
  Loader.startProgress();
  try {
    const d=await apiFetch(`${API}?action=data`);
    if(d.success) {
      GD=d; cfg=Object.assign(cfg,d.settings||{});
      loadSettings(); renderDash(); renderUsers(); renderTeams(); buildTeamPills();
      APP.lastSync=new Date();
      const st=$('sync-txt'); if(st) st.textContent='Synced '+fmtTime(APP.lastSync);
    }
  } catch { const st=$('sync-txt'); if(st) st.textContent='Sync failed'; }
  finally { Loader.finishProgress(); }
}

function startSync() { clearInterval(APP.syncTimer); APP.syncTimer=setInterval(fetchAll,SYNC_MS); }

async function manualRefresh() {
  const btn=$('refresh-btn'); if(btn) btn.classList.add('spinning');
  await fetchAll(); startSync();
  setTimeout(()=>{ const b=$('refresh-btn'); if(b) b.classList.remove('spinning'); },700);
}

// ── FILTERS ──
function setF(f) {
  flt=f; $$('.pill[id^="fp-"]').forEach(b=>b.classList.remove('on'));
  if(f==='range') { const rb=$('fp-range-btn'); if(rb) rb.classList.add('on'); }
  else {
    isRangeOpen=false;
    const rbox=$('rng-box'); if(rbox) rbox.style.display='none';
    const el=$('fp-'+f); if(el) el.classList.add('on');
  }
  renderDash();
}
function toggleRng() {
  isRangeOpen=!isRangeOpen;
  const rbox=$('rng-box'); if(rbox) rbox.style.display=isRangeOpen?'block':'none';
  if(isRangeOpen) {
    $$('.pill[id^="fp-"]').forEach(b=>b.classList.remove('on'));
    const rb=$('fp-range-btn'); if(rb) rb.classList.add('on'); flt='range';
  } else {
    const rb=$('fp-range-btn'); if(rb) rb.classList.remove('on');
    const df=$('d-from'),dt=$('d-to'); if(df)df.value=''; if(dt)dt.value='';
    setF('today');
  }
}
function setDF(d) {
  dFlt=d; $$('.pill[id^="df-"]').forEach(b=>b.classList.remove('on'));
  const el=$('df-'+d); if(el) el.classList.add('on'); renderDash();
}
function buildTeamPills() {
  if(!GD) return; const wrap=$('team-pills'); if(!wrap)return; wrap.innerHTML='';
  const allBtn=document.createElement('button');
  allBtn.className='pill on'; allBtn.id='tf-all'; allBtn.textContent='All Teams';
  allBtn.onclick=()=>{ tFlt=''; wrap.querySelectorAll('.pill').forEach(b=>b.classList.remove('on')); allBtn.classList.add('on'); renderDash(); };
  wrap.appendChild(allBtn);
  (GD.teams||[]).forEach(t=>{
    const b=document.createElement('button');
    b.className='pill'; b.id='tf-'+t.teamName.replace(/\s+/g,'-'); b.textContent=t.teamName;
    b.onclick=()=>{ tFlt=t.teamName; wrap.querySelectorAll('.pill').forEach(x=>x.classList.remove('on')); b.classList.add('on'); renderDash(); };
    wrap.appendChild(b);
  });
}

// ── DATE RANGE with LAST WEEK (Mon–Sun) ──
function inRng(ds) {
  if(flt==='all') return true;
  if(!ds) return false;
  const rd=new Date(ds); rd.setHours(0,0,0,0);
  const now=new Date(); now.setHours(0,0,0,0);
  if(flt==='today')    return rd.getTime()===now.getTime();
  if(flt==='yesterday'){ const y=new Date(now); y.setDate(now.getDate()-1); return rd.getTime()===y.getTime(); }
  if(flt==='week')     { const s=new Date(now); s.setDate(now.getDate()-now.getDay()); return rd>=s; }
  if(flt==='lastweek') {
    const day=now.getDay(); // 0=Sun
    const daysBack=day===0?6:day+6; // days back to last Monday
    const mon=new Date(now); mon.setDate(now.getDate()-daysBack);
    const sun=new Date(mon); sun.setDate(mon.getDate()+6); sun.setHours(23,59,59,999);
    return rd>=mon && rd<=sun;
  }
  if(flt==='month')  return rd.getMonth()===now.getMonth()&&rd.getFullYear()===now.getFullYear();
  if(flt==='year')   return rd.getFullYear()===now.getFullYear();
  if(flt==='range') {
    const fv=$('d-from')?$('d-from').value:'', tv=$('d-to')?$('d-to').value:'';
    if(!fv||!tv) return true;
    const sd=new Date(fv); sd.setHours(0,0,0,0); const ed=new Date(tv); ed.setHours(23,59,59,999);
    return rd>=sd&&rd<=ed;
  }
  return true;
}
