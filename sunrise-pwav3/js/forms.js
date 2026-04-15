// forms.js — Daily report, leads, feedback, follow-up, status toggle, message, export perf
let clCount=0;

// ── DAILY FORM ──
function toggleDesig() {
  const d=$('f-desig').value;
  const sf=$('fld-sales'),df=$('fld-dig');
  if(sf){sf.style.display=(d==='Sales'||d==='Telecaller')?'flex':'none';sf.style.flexDirection='column';}
  if(df){df.style.display=d==='Digital'?'flex':'none';df.style.flexDirection='column';}
}
async function submitDaily() {
  const name=trim($('f-name').value),desig=$('f-desig').value;
  if(!name) return showToast('Enter your name','e');
  if(!desig) return showToast('Select designation','e');
  const btn=$('daily-btn');
  setLoading(btn,true,'');
  const body={action:'submitDaily',username:me(),userID:myUID(),employeeName:name,designation:desig,
    email:trim($('f-email').value),targetsCompleted:$('f-tgt').value,scheduledDate:$('f-sched').value||''};
  if(desig==='Digital'){body.createdPosts=trim($('f-pt').value);body.postCounts=trim($('f-pct').value);body.postUploads=$('f-pu').value;}
  else{body.totalCalls=$('f-tc').value||0;body.connectedCalls=$('f-cc').value||0;body.visits=$('f-vi').value||0;body.bookings=$('f-bk').value||0;body.positiveClients=$('f-pc').value||0;}
  try {
    const d=await apiPost(body);
    if(d.success){showToast('Daily report submitted! ✅','s');clearDailyForm();goSec('dash');}
    else showToast(d.message||'Submission failed','e');
  } catch { showToast('Network error','e'); }
  setLoading(btn,false,'<i data-lucide="send" style="width:15px;height:15px"></i>Submit Daily Report');
  lucide.createIcons();
}
function clearDailyForm(){
  ['f-tc','f-cc','f-vi','f-bk','f-pc','f-pt','f-pct','f-pu','f-email','f-sched'].forEach(id=>{const e=$(id);if(e)e.value='';});
  const ft=$('f-tgt');if(ft)ft.value='Yes';
}

// ── MULTI-CLIENT LEADS ──
function addCl(){
  clCount++;const id=clCount;
  const div=document.createElement('div');div.className='cl-row';div.id='cl-'+id;
  div.innerHTML=`
    <div style="display:flex;justify-content:space-between;align-items:center">
      <span style="font-size:10px;font-weight:900;text-transform:uppercase;color:var(--muted)">Client ${id}</span>
      ${id>1?`<button onclick="rmCl(${id})" style="background:none;border:none;cursor:pointer;color:var(--red);display:flex;align-items:center;gap:4px;font-size:10px;font-weight:800"><i data-lucide="trash-2" style="width:13px;height:13px"></i>Remove</button>`:''}
    </div>
    <div class="g2">
      <div><label class="lbl">Client Name *</label><input id="cn-${id}" type="text" class="inp" placeholder="Full name"/></div>
      <div><label class="lbl">Contact No *</label><input id="cp-${id}" type="tel" class="inp" placeholder="10-digit" maxlength="10" inputmode="numeric"/></div>
    </div>
    <div><label class="lbl">Feedback / Remarks</label><textarea id="cf-${id}" class="inp" rows="2" placeholder="What was discussed?"></textarea></div>
    <div class="g2">
      <div><label class="lbl">Schedule Date</label><input id="cd-${id}" type="date" class="inp"/></div>
      <div><label class="lbl">Schedule Time</label><input id="ct-${id}" type="time" class="inp"/></div>
    </div>`;
  $('cl-wrap').appendChild(div);lucide.createIcons();
}
function rmCl(id){const el=$('cl-'+id);if(el)el.remove();}

async function submitLeads(){
  const name=trim($('l-name').value);
  if(!name) return showToast('Enter your name','e');
  const rows=$('cl-wrap').querySelectorAll('.cl-row');
  const clients=[];let ok=true;
  rows.forEach(r=>{
    const id=r.id.replace('cl-','');
    const cn=trim($(`cn-${id}`)?.value||''),ph=trim($(`cp-${id}`)?.value||'');
    const fb=trim($(`cf-${id}`)?.value||''),sd=$(`cd-${id}`)?.value||'',st=$(`ct-${id}`)?.value||'';
    if(!cn||!ph){ok=false;return;}if(ph.length!==10){ok=false;return;}
    clients.push({clientName:cn,contactNo:ph,feedback:fb,scheduledDate:sd,scheduledTime:st});
  });
  if(!ok) return showToast('Fill all names & valid 10-digit numbers','e');
  if(!clients.length) return showToast('Add at least one client','e');
  const btn=$('lead-btn'); setLoading(btn,true,'');
  try {
    const d=await apiPost({action:'submitLead',username:me(),userID:myUID(),employeeName:name,email:trim($('l-email').value),clients});
    if(d.success){showToast(`${clients.length} lead(s) submitted! ⭐`,'s');$('cl-wrap').innerHTML='';clCount=0;addCl();const le=$('l-email');if(le)le.value='';goSec('dash');}
    else showToast(d.message||'Failed','e');
  } catch { showToast('Network error','e'); }
  setLoading(btn,false,'<i data-lucide="star" style="width:15px;height:15px"></i>Submit Leads');
  lucide.createIcons();
}

// ── FOLLOW-UP ──
async function addFollowUp(rowIdx,uname){
  if(!rowIdx) return showToast('Cannot track this entry','w');
  try {
    const d=await apiPost({action:'addFollowUp',rowIndex:rowIdx,username:me()||uname});
    if(d.success){showToast(`Follow-up #${d.followUpCount} added! 📞`,'s');fetchAll();}
    else showToast(d.message||'Error','e');
  } catch { showToast('Network error','e'); }
}

// ── STATUS TOGGLE (positive ↔ negative) ──
async function toggleLeadStatus(rowIdx,newStatus){
  if(!rowIdx) return showToast('Cannot update this entry','w');
  if(!confirm(newStatus==='negative'?'Mark this client as NEGATIVE (not interested)?':'Mark this client back as POSITIVE?')) return;
  try {
    const d=await apiPost({action:'updateLeadStatus',rowIndex:rowIdx,status:newStatus,username:me()});
    if(d.success){showToast(newStatus==='negative'?'Client marked Negative ✗':'Client marked Positive ✓','s');fetchAll();}
    else showToast(d.message||'Error','e');
  } catch { showToast('Network error','e'); }
}

// ── FEEDBACK ──
function openFeedback(rowIdx,clientName,histEnc){
  $('fb-row-idx').value=rowIdx; $('fb-client-name').textContent=clientName; $('fb-new').value='';
  try {
    const hist=JSON.parse(decodeURIComponent(histEnc)||'[]');
    $('fb-hist').innerHTML=hist.length?hist.map(h=>`<div class="fb-item">${trim(h.text)}<div class="fb-ts">${h.ts||''}</div></div>`).join(''):'<div style="font-size:11px;color:var(--muted)">No previous feedback.</div>';
  } catch { $('fb-hist').innerHTML='<div style="font-size:11px;color:var(--muted)">Error loading history.</div>'; }
  openM('m-fb');
}
async function saveFeedback(){
  const rowIdx=num($('fb-row-idx').value),text=trim($('fb-new').value);
  if(!rowIdx) return showToast('Invalid row','e'); if(!text) return showToast('Enter feedback','e');
  try {
    const d=await apiPost({action:'updateFeedback',rowIndex:rowIdx,feedback:text,username:me()});
    if(d.success){showToast('Feedback updated! ✅','s');closeM('m-fb');fetchAll();}
    else showToast(d.message||'Error','e');
  } catch { showToast('Network error','e'); }
}

// ── MESSAGE MODAL ──
function openMsg(clientName,ph,agent){
  const wa=fillTpl(cfg.WA_Template||DEFAULT_WA,clientName,ph,agent);
  const sms=fillTpl(cfg.SMS_Template||DEFAULT_SMS,clientName,ph,agent);
  const em=fillTpl(cfg.Email_Template||DEFAULT_EM,clientName,ph,agent);
  const subj=fillTpl(cfg.Email_Subject||DEFAULT_SUBJ,clientName,ph,agent);
  const phWA=ph.length===10?'91'+ph:ph;
  $('m-msg-title').textContent='Message — '+clientName;
  $('msg-prev').textContent=wa;
  $('msg-wa').href=`https://wa.me/${phWA}?text=${enc(wa)}`;
  $('msg-sms').href=`sms:${ph}?body=${enc(sms)}`;
  $('msg-em').href=`mailto:?subject=${enc(subj)}&body=${enc(em)}`;
  openM('m-msg');lucide.createIcons();
}

// ── EVENT DELEGATION ──
document.addEventListener('click',function(e){
  const btn=e.target.closest('[data-action]'); if(!btn)return;
  const action=btn.dataset.action;
  if(action==='followup')     addFollowUp(parseInt(btn.dataset.row)||0,btn.dataset.uname||'');
  else if(action==='toggle-status') toggleLeadStatus(parseInt(btn.dataset.row)||0,btn.dataset.status||'negative');
  else if(action==='feedback')      openFeedback(parseInt(btn.dataset.row)||0,decodeURIComponent(btn.dataset.client||''),btn.dataset.hist||'%5B%5D');
  else if(action==='msg')           openMsg(decodeURIComponent(btn.dataset.client||''),btn.dataset.ph||'',decodeURIComponent(btn.dataset.agent||''));
});

// ── EXPORT PERFORMANCE TABLE (XLSX + PDF) ──
function exportPerfXLSX(){
  const ranked=window._lastRanked;
  if(!ranked||!ranked.length) return showToast('No performance data to export','e');
  const wb=XLSX.utils.book_new();
  const data=ranked.map((p,i)=>[i+1,p.name,p.uid,p.desig,p.team,p.c,p.cc,p.v,p.b,p.p,p.fu]);
  const ws=XLSX.utils.aoa_to_sheet([['Rank','Agent','UserID','Designation','Team','Calls','Connected','Visits','Bookings','+ve Clients','Follow-ups'],...data]);
  XLSX.utils.book_append_sheet(wb,ws,'Performance Ranking');
  const fn=`SunriseRealty_Perf_${flt}_${new Date().toISOString().slice(0,10)}.xlsx`;
  XLSX.writeFile(wb,fn); showToast('Performance Excel exported! ✅','s');
}
function exportPerfPDF(){
  const ranked=window._lastRanked;
  if(!ranked||!ranked.length) return showToast('No performance data to export','e');
  const w=window.open('','_blank'); if(!w) return showToast('Allow popups','w');
  const fltLabel={today:'Today',yesterday:'Yesterday',week:'This Week',lastweek:'Last Week',month:'This Month',year:'This Year',range:'Date Range',all:'All Time'}[flt]||flt;
  const rows=ranked.map((p,i)=>`<tr><td>${i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1}</td><td>${p.name}</td><td style="font-family:monospace;font-size:10px">${p.uid}</td><td>${p.desig}</td><td>${p.team}</td><td>${p.c}</td><td>${p.cc}</td><td>${p.v}</td><td style="font-weight:bold;color:#059669">${p.b}</td><td>${p.p}</td><td>${p.fu}</td></tr>`).join('');
  const html=`<!DOCTYPE html><html><head><title>Performance Report</title><style>body{font-family:Arial,sans-serif;padding:20px}h1{color:#d97706;margin-bottom:4px}p{color:#666;font-size:12px;margin-bottom:16px}table{width:100%;border-collapse:collapse}th{background:#f59e0b;color:#000;padding:8px;font-size:11px;text-align:left}td{padding:7px 8px;border-bottom:1px solid #eee;font-size:11px}.footer{margin-top:24px;font-size:10px;color:#999;text-align:center}@media print{.no-print{display:none}}</style></head><body><h1>🌅 Sunrise Realty — Performance Report</h1><p>Filter: ${fltLabel} &nbsp;|&nbsp; Designation: ${dFlt} &nbsp;|&nbsp; Team: ${tFlt||'All'} &nbsp;|&nbsp; Generated: ${new Date().toLocaleString('en-IN')}</p><table><thead><tr><th>#</th><th>Agent</th><th>UserID</th><th>Desig</th><th>Team</th><th>Calls</th><th>Conn</th><th>Visits</th><th>Bookings</th><th>+ve</th><th>F/Up</th></tr></thead><tbody>${rows}</tbody></table><div class="footer">Sunrise Realty, Pune &middot; Confidential &middot; Do not distribute</div><br/><button class="no-print" onclick="window.print()" style="padding:10px 20px;background:#f59e0b;border:none;border-radius:8px;font-weight:bold;cursor:pointer;font-size:14px">🖨️ Print / Save as PDF</button></body></html>`;
  w.document.write(html);w.document.close();showToast('PDF preview opened','s');
}

// ── EXPORT FULL DATA (XLSX + PDF) ──
function exportXLSX(){
  if(!GD) return showToast('No data','e');
  try {
    const wb=XLSX.utils.book_new();
    const d1=(GD.dailyTracking||[]).map(r=>[r.Timestamp||'',r.EmployeeName||'',r.UserID||'',r.Username||'',r.Designation||'',r.TotalCalls||0,r.ConnectedCalls||0,r.Visits||0,r.Bookings||0,r.TargetsCompleted||'',r.PositiveClients||0]);
    XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([['Timestamp','Employee','UserID','Username','Designation','Calls','Connected','Visits','Bookings','Target','Positive'],...d1]),'Daily Tracking');
    const d2=(GD.positiveLeads||[]).map(r=>[r.Timestamp||'',r.EmployeeName||'',r.UserID||'',r.Username||'',r.ClientName||'',r.ContactNo||'',r.Feedback||'',r.Status||'positive',r.ScheduledDate||'',r.ScheduledTime||'',r.FollowUpCount||0]);
    XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([['Timestamp','Agent','UserID','Username','Client','Phone','Feedback','Status','SchedDate','SchedTime','FollowUps'],...d2]),'Positive Leads');
    XLSX.writeFile(wb,'SunriseRealty_'+new Date().toISOString().slice(0,10)+'.xlsx');
    showToast('Excel exported! ✅','s');
  } catch(err){ showToast('Export failed: '+err.message,'e'); }
}
function exportPDF(){
  if(!GD) return showToast('No data','e');
  const w=window.open('','_blank'); if(!w) return showToast('Allow popups','w');
  const rows=(GD.dailyTracking||[]).map(r=>`<tr><td>${r.Timestamp||''}</td><td>${r.EmployeeName||''}</td><td>${r.Designation||''}</td><td>${r.TotalCalls||0}</td><td>${r.Visits||0}</td><td>${r.Bookings||0}</td></tr>`).join('');
  const lrows=(GD.positiveLeads||[]).map(r=>`<tr><td>${r.Timestamp||''}</td><td>${r.EmployeeName||''}</td><td>${r.ClientName||''}</td><td>${r.ContactNo||''}</td><td>${r.Status||'positive'}</td><td>${r.FollowUpCount||0}</td></tr>`).join('');
  const ts=new Date().toLocaleString('en-IN');
  let html=`<!DOCTYPE html><html><head><title>Sunrise Realty Report</title><style>body{font-family:Arial,sans-serif;padding:20px}h1{color:#d97706}h2{margin-top:20px;color:#444}table{width:100%;border-collapse:collapse;margin-top:10px}th{background:#f59e0b;color:#000;padding:8px;font-size:11px;text-align:left}td{padding:7px 8px;border-bottom:1px solid #eee;font-size:11px}.footer{margin-top:30px;font-size:10px;color:#999;text-align:center}@media print{.no-print{display:none}}</style></head><body>`;
  html+=`<h1>🌅 Sunrise Realty — Export Report</h1><p style="color:#666;font-size:12px">Generated: ${ts}</p>`;
  html+=`<h2>Daily Tracking</h2><table><thead><tr><th>Timestamp</th><th>Employee</th><th>Designation</th><th>Calls</th><th>Visits</th><th>Bookings</th></tr></thead><tbody>${rows}</tbody></table>`;
  html+=`<h2>Positive Leads</h2><table><thead><tr><th>Timestamp</th><th>Agent</th><th>Client</th><th>Phone</th><th>Status</th><th>Follow-ups</th></tr></thead><tbody>${lrows}</tbody></table>`;
  html+=`<div class="footer">Sunrise Realty, Pune · Confidential</div><br/><button class="no-print" onclick="window.print()" style="padding:10px 20px;background:#f59e0b;border:none;border-radius:8px;font-weight:bold;cursor:pointer;font-size:14px">Print / Save as PDF</button></body></html>`;
  w.document.write(html);w.document.close();showToast('PDF preview opened','s');
}
