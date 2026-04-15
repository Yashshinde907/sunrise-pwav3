// loader.js — Reusable PWA Loader (global, progress bar, skeleton, button)
const Loader = {
  _prog: null,
  startProgress() {
    const b=$('top-progress'); if(!b)return;
    b.style.width='0%'; b.style.opacity='1'; b.style.display='block';
    let w=5;
    clearInterval(this._prog);
    this._prog=setInterval(()=>{ w=Math.min(w+Math.random()*9,88); b.style.width=w+'%'; },130);
  },
  finishProgress() {
    clearInterval(this._prog);
    const b=$('top-progress'); if(!b)return;
    b.style.width='100%';
    setTimeout(()=>{ b.style.opacity='0'; setTimeout(()=>{ b.style.width='0'; b.style.opacity='1'; },350); },280);
  },
  showContent(id, type='list') {
    const el=$(id); if(!el)return; el.setAttribute('aria-busy','true');
    const rows=4;
    if(type==='table') {
      el.innerHTML=`<div class="sk-wrap">${Array(rows).fill(0).map((_,i)=>`<div class="sk-row" style="animation-delay:${i*.07}s"><div class="sk-c sk-w30"></div><div class="sk-c sk-w50"></div><div class="sk-c sk-w15"></div><div class="sk-c sk-w20"></div></div>`).join('')}</div>`;
    } else if(type==='cards') {
      el.innerHTML=`<div class="sk-cards">${Array(rows).fill(0).map((_,i)=>`<div class="sk-card" style="animation-delay:${i*.08}s"><div class="sk-l sk-w70"></div><div class="sk-l sk-w50"></div><div class="sk-l sk-w40"></div></div>`).join('')}</div>`;
    } else {
      el.innerHTML=Array(rows).fill(0).map((_,i)=>`<div class="sk-item" style="animation-delay:${i*.1}s"><div class="sk-l sk-w80"></div><div class="sk-l sk-w55"></div></div>`).join('');
    }
  },
  hideContent(id) { const el=$(id); if(el) el.removeAttribute('aria-busy'); },
  showSection(id) {
    // Route transition: briefly show skeleton in main area
    Loader.startProgress();
    const el=$(id); if(!el)return;
    el.style.opacity='0';
    setTimeout(()=>{ el.style.opacity='1'; el.style.transition='opacity .18s'; },80);
  }
};
