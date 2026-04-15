// admin.js — Users, Teams, Audit, Backup/Restore, Settings
let editUser=null;

function openM(id){const el=$(id);if(el){el.classList.add('open');lucide.createIcons();}}
function closeM(id){const el=$(id);if(el)el.classList.remove('open');}
document.addEventListener('click',e=>{if(e.target.classList.contains('modal-bg'))e.target.classList.remove('open');});

// ── SETTINGS ──
function loadSettings(){
  const sc=$('s-ct'),sb=$('s-bt'),sw=$('s-wa'),ss=$('s-sms'),se=$('s-esubj'),sem=$('s-email');
  if(sc)sc.value=cfg.Call_Target||50; if(sb)sb.value=cfg.Booking_Target||2;
  if(sw)sw.value=cfg.WA_Template||''; if(ss)ss.value=cfg.SMS_Template||'';
  if(se)se.value=cfg.Email_Subject||''; if(sem)sem.value=cfg.Email_Template||'';
}
async function saveSettings(){
  try{const d=await apiPost({action:'updateSettings',adminUser:me(),callTarget:$('s-ct').value,bookingTarget:$('s-bt').value});if(d.success){showToast('Targets saved!','s');fetchAll();}else showToast('Error','e');}catch{showToast('Network error','e');}
}
async function saveTemplates(){
  try{const d=await apiPost({action:'updateSettings',adminUser:me(),callTarget:$('s-ct').value,bookingTarget:$('s-bt').value,waTemplate:$('s-wa').value,smsTemplate:$('s-sms').value,emailSubject:$('s-esubj').value,emailTemplate:$('s-email').value});if(d.success){showToast('Templates saved!','s');fetchAll();}else showToast('Error','e');}catch{showToast('Network error','e');}
}

// ── USERS ──
function renderUsers(){
  if(!GD||!$('users-body'))return;
  const tbody=$('users-body'); tbody.innerHTML='';
  const users=GD.users||[];
  if(!users.length){tbody.innerHTML=`<tr><td colspan="7" class="empty">No users</td></tr>`;return;}
  users.forEach(u=>{
    const locked=u.status==='locked';
    tbody.innerHTML+=`<tr>
      <td><div style="font-weight:900;color:#fff;font-size:11px">${u.username}</div><div style="font-size:8.5px;color:var(--muted)">${u.fullName||''}</div></td>
      <td style="font-size:9px;color:var(--muted);font-family:monospace">${u.userID||'—'}</td>
      <td><span class="badge ${u.role==='Admin'?'b-gold':'b-gray'}">${u.role}</span></td>
      <td><span class="badge b-blue">${u.designation||'—'}</span></td>
      <td style="color:var(--muted);font-size:10px">${u.team||'—'}</td>
      <td><span class="badge ${locked?'b-red':'b-grn'}">${locked?'🔒':'✓'}</span></td>
      <td class="c"><div style="display:flex;gap:4px;justify-content:center">
        <button onclick='editUserFn("${u.username}")' class="btn btn-ghost btn-icon" title="Edit"><i data-lucide="pencil" style="width:12px;height:12px"></i></button>
        <button onclick='doLock("${u.username}",${!locked})' class="btn btn-ghost btn-icon" style="color:${locked?'var(--grn)':'var(--gold)'}" title="${locked?'Unlock':'Lock'}">${locked?'🔓':'🔒'}</button>
        <button onclick='doForce("${u.username}")' class="btn btn-ghost btn-icon" title="Force Logout"><i data-lucide="log-out" style="width:12px;height:12px;color:var(--blue)"></i></button>
        ${u.username!==me()?`<button onclick='doRemove("${u.username}")' class="btn btn-red btn-icon" title="Remove"><i data-lucide="trash-2" style="width:12px;height:12px"></i></button>`:''}
      </div></td>
    </tr>`;
  });
  lucide.createIcons();
}
function openAddUser(){
  editUser=null;$('m-user-title').textContent='Add User';$('mu-save').textContent='Save User';
  ['mu-un','mu-pw','mu-fn','mu-ph','mu-em'].forEach(id=>{const e=$(id);if(e)e.value='';});
  $('mu-role').value='Agent';$('mu-desig').value='';$('mu-un').disabled=false;
  populateTeamSel('mu-team','');openM('m-user');
}
function editUserFn(uname){
  if(!GD)return; const u=(GD.users||[]).find(x=>x.username===uname); if(!u)return;
  editUser=uname;$('m-user-title').textContent='Edit User';$('mu-save').textContent='Update';
  $('mu-un').value=u.username;$('mu-un').disabled=true;$('mu-pw').value='';
  $('mu-fn').value=u.fullName||'';$('mu-ph').value=u.phone||'';$('mu-em').value=u.email||'';
  $('mu-role').value=u.role||'Agent';$('mu-desig').value=u.designation||'';
  populateTeamSel('mu-team',u.team||'');openM('m-user');
}
function populateTeamSel(selId,current){
  const sel=$(selId);if(!sel)return;
  sel.innerHTML='<option value="">No Team</option>';
  (GD&&GD.teams||[]).forEach(t=>{
    const o=document.createElement('option');o.value=t.teamName;o.textContent=t.teamName;
    if(t.teamName===current)o.selected=true;sel.appendChild(o);
  });
}
async function saveUser(){
  const uname=trim($('mu-un').value).toLowerCase();
  if(!uname)return showToast('Username required','e');
  const pw=trim($('mu-pw').value);
  const body={action:editUser?'updateUser':'addUser',adminUser:me(),username:uname,
    fullName:trim($('mu-fn').value),phone:trim($('mu-ph').value),
    email:trim($('mu-em').value),role:$('mu-role').value,
    designation:$('mu-desig').value,team:$('mu-team').value};
  if(pw)body.password=pw;
  // For new user, generate UserID
  if(!editUser)body.userID=generateUID();
  try{const d=await apiPost(body);if(d.success){showToast(d.message+(d.userID?` (ID: ${d.userID})`:''),'s');closeM('m-user');fetchAll();}else showToast(d.message||'Error','e');}catch{showToast('Network error','e');}
}
async function doLock(uname,lock){
  if(!confirm(`${lock?'Lock':'Unlock'} user "${uname}"?`))return;
  try{const d=await apiPost({action:'lockUser',adminUser:me(),username:uname,lock});if(d.success){showToast(d.message,'s');fetchAll();}}catch{showToast('Network error','e');}
}
async function doForce(uname){
  if(!confirm(`Force logout "${uname}"?`))return;
  try{const d=await apiPost({action:'forceLogout',adminUser:me(),username:uname});if(d.success)showToast('Force-logged out','s');}catch{showToast('Network error','e');}
}
async function doRemove(uname){
  if(!confirm(`Permanently remove "${uname}"?`))return;
  try{const d=await apiPost({action:'removeUser',adminUser:me(),username:uname});if(d.success){showToast('User removed','s');fetchAll();}else showToast(d.message,'e');}catch{showToast('Network error','e');}
}

// ── TEAMS ──
function renderTeams(){
  if(!GD||!$('teams-list'))return;
  const wrap=$('teams-list');wrap.innerHTML='';
  const teams=GD.teams||[];
  if(!teams.length){wrap.innerHTML=`<div class="empty">No teams yet. Create one!</div>`;return;}
  teams.forEach(t=>{
    const div=document.createElement('div');div.className='card';div.style.padding='16px';
    div.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px">
      <div><div style="font-weight:900;color:#fff;font-size:13.5px">${t.teamName}</div>${t.description?`<div style="font-size:10px;color:var(--muted);margin-top:2px">${t.description}</div>`:''}</div>
      <div style="display:flex;gap:5px">
        <button onclick='openTeam("${t.teamName}")' class="btn btn-ghost btn-sm">Edit</button>
        <button onclick='deleteTeam("${t.teamName}")' class="btn btn-red btn-sm">Del</button>
      </div></div>
      <div style="display:flex;flex-wrap:wrap;gap:5px">${(t.members||[]).map(m=>`<span class="badge b-blue">${m}</span>`).join('')||'<span style="font-size:10px;color:var(--muted)">No members</span>'}</div>`;
    wrap.appendChild(div);
  });
}
function openTeam(tname){
  const t=tname?(GD&&GD.teams||[]).find(x=>x.teamName===tname):null;
  $('m-team-title').textContent=t?'Edit Team':'Create Team';
  $('mt-name').value=t?t.teamName:'';$('mt-name').disabled=!!t;$('mt-desc').value=t?t.description||'':'';
  const wrap=$('mt-members');wrap.innerHTML='';
  const sel=t?(t.members||[]):[];
  (GD&&GD.users||[]).forEach(u=>{
    const lbl=document.createElement('label');
    lbl.style.cssText='display:flex;align-items:center;gap:8px;padding:8px;border-radius:8px;background:rgba(255,255,255,.03);cursor:pointer;font-size:12px;font-weight:700;color:var(--text)';
    lbl.innerHTML=`<input type="checkbox" value="${u.username}" ${sel.includes(u.username)?'checked':''} style="accent-color:var(--gold);width:14px;height:14px"> ${u.fullName||u.username} <span class="badge b-gray" style="margin-left:auto">${u.designation||'—'}</span>`;
    wrap.appendChild(lbl);
  });
  openM('m-team');
}
async function saveTeam(){
  const name=trim($('mt-name').value);if(!name)return showToast('Team name required','e');
  const members=[...$('mt-members').querySelectorAll('input:checked')].map(c=>c.value);
  try{const d=await apiPost({action:'saveTeam',adminUser:me(),teamName:name,description:trim($('mt-desc').value),members});if(d.success){showToast(d.message,'s');closeM('m-team');fetchAll();}else showToast('Error','e');}catch{showToast('Network error','e');}
}
async function deleteTeam(name){
  if(!confirm(`Delete team "${name}"?`))return;
  try{const d=await apiPost({action:'deleteTeam',adminUser:me(),teamName:name});if(d.success){showToast('Team deleted','s');fetchAll();}}catch{showToast('Network error','e');}
}

// ── AUDIT ──
async function fetchAudit(){
  const tbody=$('audit-body');if(!tbody)return;
  tbody.innerHTML=`<tr><td colspan="4" class="empty">Loading…</td></tr>`;
  try{
    const d=await apiFetch(`${API}?action=audit`);
    tbody.innerHTML='';
    if(d.success&&d.logs&&d.logs.length){
      d.logs.forEach(l=>{
        const act=(l[2]||'');
        const col=act.includes('FAIL')||act.includes('BLOCK')||act.includes('REMOVE')||act.includes('LOCK')?'var(--red)':act.includes('SUCCESS')||act.includes('ADD')||act.includes('UNLOCK')?'var(--grn)':act.includes('FORCE')||act.includes('UPDATE')?'var(--gold)':'var(--muted)';
        tbody.innerHTML+=`<tr><td style="color:var(--muted);font-size:9.5px;white-space:nowrap">${l[0]||''}</td><td style="font-weight:800;color:#fff">${l[1]||''}</td><td style="color:${col};font-weight:800;font-size:10px">${act}</td><td style="color:var(--muted);font-size:10px">${l[3]||''}</td></tr>`;
      });
    } else tbody.innerHTML=`<tr><td colspan="4" class="empty">No logs</td></tr>`;
  }catch{tbody.innerHTML=`<tr><td colspan="4" style="text-align:center;padding:20px;color:var(--red)">Failed to load</td></tr>`;}
}

// ── BACKUP ──
async function createBackup(){
  showToast('Creating backup…','w');
  try{const d=await apiPost({action:'createBackup',adminUser:me()});if(d.success){showToast('Backup created: '+d.backupID,'s');fetchBackups();}else showToast('Backup failed','e');}catch{showToast('Network error','e');}
}
async function fetchBackups(){
  const tbody=$('backup-body');if(!tbody)return;
  tbody.innerHTML=`<tr><td colspan="4" class="empty">Loading…</td></tr>`;
  try{
    const d=await apiFetch(`${API}?action=backup`);tbody.innerHTML='';
    if(d.success&&d.backups&&d.backups.length){
      d.backups.forEach(b=>{
        tbody.innerHTML+=`<tr><td style="font-family:monospace;font-size:10px;color:var(--gold)">${b.id}</td><td style="font-size:10px;color:#cbd5e1">${b.timestamp}</td><td><span class="badge b-grn">${b.type}</span></td><td class="c"><button onclick='restoreBackup("${b.id}")' class="btn btn-ghost btn-sm" style="font-size:9px;padding:5px 10px;min-height:30px">Restore</button></td></tr>`;
      });
    } else tbody.innerHTML=`<tr><td colspan="4" class="empty">No backups yet</td></tr>`;
  }catch{tbody.innerHTML=`<tr><td colspan="4" style="text-align:center;padding:20px;color:var(--red)">Failed to load</td></tr>`;}
}
async function restoreBackup(backupID){
  if(!confirm('Restore backup '+backupID+'?\n\nThis will overwrite Settings and Teams. Daily records are preserved. Continue?'))return;
  showToast('Restoring…','w');
  try{const d=await apiPost({action:'restoreBackup',adminUser:me(),backupID});if(d.success){showToast('Backup restored! ✅','s');fetchAll();}else showToast(d.message||'Restore failed','e');}catch{showToast('Network error','e');}
}
