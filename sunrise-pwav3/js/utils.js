const $   = id  => document.getElementById(id);
const $$  = sel => document.querySelectorAll(sel);
const ls  = (k,v) => v===undefined ? (localStorage.getItem(k)||'') : localStorage.setItem(k,v);
const me      = () => ls('sr_user');
const myRole  = () => ls('sr_role');
const myUID   = () => ls('sr_uid');
const myDesig = () => ls('sr_desig');
const isAdmin = () => myRole().toLowerCase()==='admin';
const enc  = v => encodeURIComponent(v);
const num  = v => parseInt(v)||0;
const trim = v => (v||'').toString().trim();
const fillTpl = (t,n,p,a) => (t||'').replace(/\{name\}/g,n||'').replace(/\{phone\}/g,p||'').replace(/\{agent\}/g,a||'');

function fmtTime(d) {
  return (d||new Date()).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:true}).toUpperCase();
}
function loaderHtml(txt='') {
  return `<span class="btn-spin" aria-hidden="true"></span>${txt?' '+txt:''}`;
}
function setLoading(btn,on,html) {
  if(!btn)return; btn.disabled=on;
  btn.innerHTML = on ? loaderHtml('Loading…') : html;
}
async function apiFetch(url) {
  const r = await fetch(url); if(!r.ok) throw new Error('HTTP '+r.status);
  return r.json();
}
async function apiPost(body) {
  const r = await fetch(API,{method:'POST',body:JSON.stringify(body)});
  if(!r.ok) throw new Error('HTTP '+r.status); return r.json();
}
let _tt;
function showToast(msg,type='') {
  const el=$('toast'); if(!el)return;
  el.textContent=msg; el.className='on'+(type?' '+type:'');
  clearTimeout(_tt); _tt=setTimeout(()=>{el.className='';},3200);
}
