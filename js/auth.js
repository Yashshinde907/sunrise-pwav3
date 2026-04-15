// auth.js — Login, Signup, Logout, Heartbeat, Profile Drawer

// ── SCREEN SWITCHER (login / signup) ──
function showScreen(s) {
  $('login-scr').style.display  = s==='login'  ? 'flex':'none';
  $('signup-scr').style.display = s==='signup' ? 'flex':'none';
}

// ── LOGIN ──
async function doLogin() {
  const u=trim($('un').value), p=trim($('pw').value);
  $('login-err').style.display='none'; $('login-lock').style.display='none';
  if(!u||!p) return showToast('Enter username & password','e');
  const btn=$('login-btn'); btn.disabled=true; btn.innerHTML=loaderHtml('Verifying…');
  try {
    const d=await apiFetch(`${API}?action=login&user=${enc(u)}&pass=${enc(p)}`);
    if(d.success) {
      ls('sr_auth','1'); ls('sr_user',trim(u));
      ls('sr_uid',  trim(d.userID||''));
      ls('sr_role', trim(d.role||''));
      ls('sr_desig',trim(d.designation||''));
      ls('sr_name', trim(d.fullName||u));
      ls('sr_team', trim(d.team||''));
      ls('sr_phone',trim(d.phone||''));
      ls('sr_email',trim(d.email||''));
      $('login-scr').style.display='none';
      $('app').style.display='block';
      bootApp();
    } else if(d.locked) {
      $('login-lock').style.display='block';
    } else {
      $('login-err').style.display='block';
    }
  } catch { showToast('Network error — check connection','e'); }
  btn.textContent='Access Dashboard'; btn.disabled=false;
  lucide.createIcons();
}

// ── SIGNUP ──
async function doSignup() {
  const un=trim($('su-un').value).toLowerCase();
  const pw=trim($('su-pw').value);
  const fn=trim($('su-fn').value);
  const ph=trim($('su-ph').value);
  const em=trim($('su-em').value);
  const dg=$('su-desig').value;
  const serr=$('su-err'); if(serr) serr.style.display='none';
  if(!un||!pw||!fn||!dg) { if(serr){serr.textContent='Fill all required fields';serr.style.display='block';} return; }
  if(pw.length<4) { if(serr){serr.textContent='Password min 4 characters';serr.style.display='block';} return; }
  if(ph&&ph.length!==10) { if(serr){serr.textContent='Phone must be 10 digits';serr.style.display='block';} return; }
  const btn=$('su-btn'); btn.disabled=true; btn.innerHTML=loaderHtml('Creating…');
  const uid=generateUID();
  try {
    const d=await apiPost({
      action:'addUser', adminUser:'signup',
      userID:uid, username:un, password:pw,
      role:'Agent', designation:dg,
      fullName:fn, phone:ph, email:em, team:''
    });
    if(d.success) {
      showToast('Account created! Please login.','s');
      showScreen('login');
      $('un').value=un;
    } else {
      if(serr){serr.textContent=d.message||'Signup failed';serr.style.display='block';}
    }
  } catch { showToast('Network error','e'); }
  btn.textContent='Create Account'; btn.disabled=false;
  lucide.createIcons();
}

// ── LOGOUT ──
function doLogout() {
  clearInterval(APP.syncTimer); clearInterval(APP.heartTimer);
  localStorage.clear(); location.reload();
}

// ── HEARTBEAT ──
function startHeartbeat() {
  clearInterval(APP.heartTimer);
  APP.heartTimer=setInterval(async()=>{
    try {
      const d=await apiFetch(`${API}?action=heartbeat&user=${enc(me())}`);
      if(d&&d.forceLogout){showToast('Logged out by admin','e');setTimeout(doLogout,2200);}
    } catch {}
  }, HEARTBEAT_MS);
}

// ── PROFILE DRAWER ──
function toggleDrawer() {
  const d=$('profile-drawer'),b=$('drawer-bg');
  const open=d&&d.classList.contains('open');
  if(!open) closeMenu();
  if(d) d.classList.toggle('open',!open);
  if(b) b.style.display=open?'none':'block';
}
function closeDrawer() {
  const d=$('profile-drawer'),b=$('drawer-bg');
  if(d) d.classList.remove('open'); if(b) b.style.display='none';
}
function populateDrawer() {
  const name=ls('sr_name')||me(), av=name.charAt(0).toUpperCase();
  const pa=$('profile-av'); if(pa) pa.textContent=av;
  const da=$('drawer-av');  if(da) da.textContent=av;
  const dn=$('drawer-name');if(dn) dn.textContent=name;
  const duid=$('drawer-uid');if(duid) duid.textContent='ID: '+(myUID()||'—');
  const dr=$('drawer-role');if(dr) dr.textContent=myRole();
  const dd=$('drawer-desig');if(dd) dd.textContent=myDesig();
  const ph=ls('sr_phone'),em=ls('sr_email'),team=ls('sr_team');
  let info='';
  if(ph)   info+=`<div class="dr-row"><span class="dr-lbl">Phone</span><span>${ph}</span></div>`;
  if(em)   info+=`<div class="dr-row"><span class="dr-lbl">Email</span><span style="word-break:break-all;font-size:10px">${em}</span></div>`;
  if(team) info+=`<div class="dr-row"><span class="dr-lbl">Team</span><span class="badge b-blue">${team}</span></div>`;
  const di=$('drawer-info'); if(di) di.innerHTML=info||'<div style="font-size:11px;color:var(--muted)">No extra info</div>';
}
