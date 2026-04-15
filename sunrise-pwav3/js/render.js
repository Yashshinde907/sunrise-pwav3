// render.js — Dashboard, chart, leads feed
// KEY: UserID is primary dedup key; falls back to lowercase username if UserID empty
let _chart=null;

function _key(row) {
  // Use UserID if present, else username. This prevents double-counting same person.
  const uid=trim(row.UserID||'');
  const uname=trim(row.Username||row.EmployeeName||'').toLowerCase();
  return uid||uname;
}

function renderDash() {
  if(!GD) return;
  const admin=isAdmin(), myUser=trim(me()).toLowerCase(), myUid=myUID();
  const srch=trim(($('srch')?$('srch').value:'')||'').toLowerCase();
  const uMap={};
  (GD.users||[]).forEach(u=>{ uMap[trim(u.username).toLowerCase()]=u; if(u.userID) uMap[trim(u.userID)]=u; });

  // ── Aggregate daily by UserID (unique per person) ──
  const perf={};
  (GD.dailyTracking||[]).forEach(row=>{
    const uid  =trim(row.UserID||'');
    const uname=trim(row.Username||'').toLowerCase();
    if(!uname&&!uid) return;
    if(!inRng(row.Timestamp||row.Date)) return;
    const isMe=(uname===myUser)||(uid&&uid===myUid);
    if(!admin&&!isMe) return;
    const u=uMap[uid]||uMap[uname]||{};
    const desig=trim(row.Designation||u.designation||'');
    if(dFlt!=='all'&&desig!==dFlt) return;
    if(tFlt&&trim(u.team||'')!==tFlt) return;
    const key=uid||uname; // UNIQUE KEY per person
    if(!perf[key]) perf[key]={
      name:u.fullName||u.username||uname, uid:uid||'—',
      desig, team:trim(u.team||''), c:0,cc:0,v:0,b:0,p:0,fu:0
    };
    perf[key].c +=num(row.TotalCalls);
    perf[key].cc+=num(row.ConnectedCalls);
    perf[key].v +=num(row.Visits);
    perf[key].b +=num(row.Bookings);
    perf[key].p +=num(row.PositiveClients);
  });

  // Aggregate follow-ups from leads
  (GD.positiveLeads||[]).forEach(l=>{
    const uid=trim(l.UserID||''), uname=trim(l.Username||'').toLowerCase();
    const key=uid||uname;
    if(perf[key]) perf[key].fu+=num(l.FollowUpCount);
  });

  // KPI totals
  let tC=0,tCC=0,tV=0,tB=0,tP=0;
  Object.values(perf).forEach(p=>{tC+=p.c;tCC+=p.cc;tV+=p.v;tB+=p.b;tP+=p.p;});

  // Net positive leads (non-negative status from feed, filtered)
  const netPos=(GD.positiveLeads||[]).filter(l=>{
    const uid=trim(l.UserID||''), uname=trim(l.Username||'').toLowerCase();
    const isMe=(uname===myUser)||(uid&&uid===myUid);
    if(!admin&&!isMe) return false;
    if(!inRng(l.Timestamp||l.Date)) return false;
    const u=uMap[uid]||uMap[uname]||{};
    if(dFlt!=='all'&&trim(u.designation||'')!==dFlt) return false;
    if(tFlt&&trim(u.team||'')!==tFlt) return false;
    return trim(l.Status||'positive').toLowerCase()!=='negative';
  }).length;

  const sc=$('s-calls'); if(sc) sc.textContent=tC.toLocaleString();
  const scc=$('s-conn'); if(scc) scc.textContent=tCC.toLocaleString()+' connected';
  const sv=$('s-visits');if(sv) sv.textContent=tV.toLocaleString();
  const sb=$('s-books'); if(sb) sb.textContent=tB.toLocaleString();
  const sp=$('s-pos');   if(sp) sp.textContent=netPos.toLocaleString();
  const bt=Number(cfg.Booking_Target)||2;
  const pct=bt>0?Math.min(100,(tB/bt)*100):0;
  const bp=$('book-prog'); if(bp) bp.style.width=pct+'%';
  const bgt=$('book-tgt');if(bgt) bgt.textContent='of '+bt+' target';

  // Performance table (hidden for Digital designation)
  const myDes=myDesig().toLowerCase();
  const perfSec=$('perf-sec');
  if(perfSec) perfSec.style.display=(myDes==='digital')?'none':'flex';

  // Ranked table
  const tbody=$('perf-body');
  if(tbody) {
    tbody.innerHTML='';
    const ranked=Object.values(perf)
      .filter(p=>!srch||trim(p.name).toLowerCase().includes(srch)||trim(p.uid).toLowerCase().includes(srch))
      .sort((a,b)=>b.b-a.b||b.v-a.v||b.p-a.p||b.fu-a.fu||b.cc-a.cc);
    // Store for export
    window._lastRanked=ranked; window._lastFlt={flt,dFlt,tFlt};
    if(!ranked.length) {
      tbody.innerHTML=`<tr><td colspan="10" class="empty">No data for this period</td></tr>`;
    } else {
      ranked.forEach((p,i)=>{
        const rk=i===0?`<span class="r1">🥇 1</span>`:i===1?`<span class="r2">🥈 2</span>`:i===2?`<span class="r3">🥉 3</span>`:`<span style="font-size:11px;color:var(--muted);font-weight:900">${i+1}</span>`;
        const db=p.desig==='Sales'?'b-gold':p.desig==='Digital'?'b-blue':'b-gray';
        tbody.innerHTML+=`<tr>
          <td class="c">${rk}</td>
          <td style="color:#fff;font-weight:900;min-width:90px">${p.name}
            <div style="font-size:8px;color:var(--muted);font-family:monospace">${p.uid}</div></td>
          <td><span class="badge ${db}">${p.desig||'—'}</span></td>
          <td style="color:var(--muted);font-size:10px;white-space:nowrap">${p.team||'—'}</td>
          <td class="c" style="color:#cbd5e1">${p.c}</td>
          <td class="c" style="color:var(--blue)">${p.cc}</td>
          <td class="c">${p.v}</td>
          <td class="c" style="color:var(--grn);font-weight:900">${p.b}</td>
          <td class="c" style="color:var(--gold)">${p.p}</td>
          <td class="c" style="color:var(--blue)">${p.fu}</td>
        </tr>`;
      });
    }
    if(admin) renderChart(ranked);
  }
  renderLeadsFeed(uMap,myUser,myUid,admin,srch);
}

function renderLeadsFeed(uMap,myUser,myUid,admin,srch) {
  const wrap=$('leads-wrap'),noEl=$('no-leads');
  if(!wrap)return; wrap.innerHTML=''; let cnt=0;
  const leads=[...(GD.positiveLeads||[])].reverse();
  leads.forEach(l=>{
    const uid  =trim(l.UserID||'');
    const uname=trim(l.Username||'').toLowerCase();
    const isMe =(uname===myUser)||(uid&&uid===myUid);
    if(!inRng(l.Timestamp||l.Date)) return;
    if(!admin&&!isMe) return;
    const u=uMap[uid]||uMap[uname]||{};
    if(dFlt!=='all'&&trim(u.designation||'')!==dFlt) return;
    if(tFlt&&trim(u.team||'')!==tFlt) return;
    const clName=trim(l.ClientName||'').toLowerCase();
    if(srch&&!uname.includes(srch)&&!trim(u.fullName||'').toLowerCase().includes(srch)&&!clName.includes(srch)) return;
    cnt++;
    const ph=trim(l.ContactNo||'').replace(/\D/g,'');
    const phWA=ph.length===10?'91'+ph:ph;
    const agentName=u.fullName||l.EmployeeName||uname;
    const sd=trim(l.ScheduledDate||''),st=trim(l.ScheduledTime||'');
    const schedInfo=(sd||st)?` <span class="badge b-blue">📅 ${sd} ${st}</span>`:'';
    const fuCount=num(l.FollowUpCount), rowIdx=l._rowIndex||0;
    const hist=trim(l.FeedbackHistory||'[]');
    const isNeg=trim(l.Status||'positive').toLowerCase()==='negative';
    const fb=trim(l.Feedback||'');
    wrap.innerHTML+=`
    <div class="card lead-card${isNeg?' negative':''} fade-up">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
        <div style="min-width:0;flex:1">
          <div style="font-weight:900;color:#fff;font-size:13px;text-transform:uppercase;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${trim(l.ClientName)||'—'}</div>
          <div style="font-size:8.5px;font-weight:800;color:var(--gold);text-transform:uppercase;margin-top:2px">Agent: ${agentName}</div>
        </div>
        <span class="badge ${isNeg?'b-red':'b-grn'}" style="flex-shrink:0">${isNeg?'✗ Negative':'✓ Positive'}</span>
      </div>
      ${fb?`<div style="font-size:12px;color:#cbd5e1;font-style:italic;background:rgba(0,0,0,.18);border-radius:10px;padding:10px 13px;border:1px solid var(--border);word-break:break-word">"${fb}"</div>`:''}
      <div style="font-size:8.5px;color:var(--muted);font-weight:800;text-transform:uppercase;display:flex;align-items:center;flex-wrap:wrap;gap:4px">
        ${trim(l.Timestamp||l.Date||'')}${schedInfo}
        ${fuCount?`<span class="badge b-blue">📞 ${fuCount} follow-up${fuCount>1?'s':''}</span>`:''}
      </div>
      <div class="lead-actions">
        <a href="tel:${ph}" class="la-btn la-gold">📞 Call</a>
        <a href="https://wa.me/${phWA}" target="_blank" class="la-btn la-wa">💬 WA</a>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:7px">
        <button data-action="followup" data-row="${rowIdx}" data-uname="${uname}" class="act-btn act-blue">📞 +Follow Up</button>
        <button data-action="toggle-status" data-row="${rowIdx}" data-status="${isNeg?'positive':'negative'}" class="act-btn ${isNeg?'act-grn':'act-red'}">${isNeg?'✓ Mark +ve':'✗ Mark -ve'}</button>
      </div>
      <button data-action="feedback" data-row="${rowIdx}" data-client="${enc(trim(l.ClientName))}" data-hist="${enc(hist)}" class="act-btn act-ghost" style="width:100%">✏️ View / Add Feedback</button>
      <button data-action="msg" data-client="${enc(trim(l.ClientName))}" data-ph="${ph}" data-agent="${enc(agentName)}" class="act-btn act-ghost" style="width:100%">✉️ Send Template Message</button>
    </div>`;
  });
  if(noEl) noEl.style.display=cnt?'none':'block';
  lucide.createIcons();
}

function renderChart(ranked) {
  if(!ranked.length)return; const ctx=$('perf-chart'); if(!ctx)return;
  if(_chart){_chart.destroy();_chart=null;}
  _chart=new Chart(ctx.getContext('2d'),{
    type:'bar',
    data:{
      labels:ranked.map(p=>trim(p.name).split(' ')[0]),
      datasets:[
        {label:'Calls',   data:ranked.map(p=>p.c),backgroundColor:'rgba(245,158,11,.78)',borderRadius:5},
        {label:'Visits',  data:ranked.map(p=>p.v),backgroundColor:'rgba(59,130,246,.75)', borderRadius:5},
        {label:'Bookings',data:ranked.map(p=>p.b),backgroundColor:'rgba(16,185,129,.85)',borderRadius:5}
      ]
    },
    options:{responsive:true,maintainAspectRatio:true,
      plugins:{legend:{labels:{color:'#94a3b8',font:{size:10,weight:'bold'},boxWidth:12}}},
      scales:{x:{ticks:{color:'#64748b',font:{size:9,weight:'bold'}},grid:{color:'rgba(255,255,255,.03)'}},
              y:{ticks:{color:'#64748b',font:{size:9}},grid:{color:'rgba(255,255,255,.03)'}}}}
  });
}
