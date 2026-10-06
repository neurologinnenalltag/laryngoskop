/* EKG-Quiz – Teilnehmerseite.
   Freier Modus (ohne ?runde=): eigenes Tempo, Antworten zählen in Runde „offen“.
   Live-Modus (mit ?runde=xyz): die vortragende Person gibt Fragen frei und löst auf (ergebnis.html). */
(function(){
  'use strict';
  const SB_URL = 'https://jzsxzdjssxtgzylnntiq.supabase.co', SB_KEY = 'sb_publishable_vsqhwmlF5-Iby8n0oyyM9w_Z_yq9Wly';
  const {DECK, figSVG} = window.EKG;
  const QS = DECK.filter(x => x.t !== 'slide');
  const byN = n => QS.find(q => q.n === n);
  const PAL = {fg:'var(--fg)',muted:'var(--muted)',paper:'var(--paper)',grid:'var(--grid)',gridBold:'var(--grid-b)',trace:'var(--trace)',accent:'var(--accent)',surface:'var(--surface)',wall:'var(--wall)',mark:'var(--hi)',markFg:'#1c1416'};
  const L = ['A','B','C','D','E','F'];
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

  const rawRunde = new URLSearchParams(location.search).get('runde');
  const LIVE = !!rawRunde;
  const RUNDE = (String(rawRunde || '').toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 40)) || 'offen';

  /* ---------- lokaler Zustand ---------- */
  const KEY = 'ekg-quiz-v1' + (LIVE ? ':' + RUNDE : '');
  let st = {i:0, a:{}};
  try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && typeof s.i === 'number' && s.a) st = s; } catch(e){}
  if (st.i < 0 || st.i > QS.length) st.i = 0;
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch(e){} };

  /* ---------- anonyme Übermittlung ---------- */
  const GERAET = (() => { try { let g = localStorage.getItem('lk-geraet'); if (!g) { g = (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36)); localStorage.setItem('lk-geraet', g); } return g; } catch (e) { return 'tmp-' + Math.random().toString(36).slice(2); } })();
  const QKEY = 'lk-queue';
  const queue = () => { try { return JSON.parse(localStorage.getItem(QKEY) || '[]'); } catch (e) { return []; } };
  const setQueue = q => { try { localStorage.setItem(QKEY, JSON.stringify(q)); } catch (e) {} };
  let flushing = false;
  async function flush() {
    if (flushing) return; flushing = true;
    for (const item of queue()) {
      let drop = false;
      try {
        const r = await fetch(SB_URL + '/rest/v1/antworten?on_conflict=runde,geraet,frage', { method: 'POST',
          headers: { apikey: SB_KEY, 'Content-Type': 'application/json', Prefer: 'resolution=ignore-duplicates,return=minimal' },
          body: JSON.stringify(item) });
        drop = r.ok || (r.status >= 400 && r.status < 500);   // 4xx: abgelehnt (z. B. Frage nicht mehr offen) → nicht erneut senden
      } catch (e) { /* offline: später erneut */ }
      if (drop) setQueue(queue().filter(x => !(x.runde === item.runde && x.frage === item.frage && x.geraet === item.geraet)));
    }
    flushing = false;
  }
  function report(q, a) {
    const antwort = q.t === 'mc' ? { pick: a.pick } : q.t === 'sel' ? { v: a.v } : { seq: a.seq };
    const list = queue().filter(x => !(x.runde === RUNDE && x.frage === q.n));
    list.push({ runde: RUNDE, geraet: GERAET, frage: q.n, antwort, richtig: result(q, a) });
    setQueue(list); flush();
  }
  window.addEventListener('online', flush);

  /* ---------- Live-Steuerung ---------- */
  let ctl = null, ctlOk = true;
  async function poll() {
    try {
      const r = await fetch(SB_URL + '/rest/v1/steuerung?select=frage,aufgeloest,reset_nr&runde=eq.' + encodeURIComponent(RUNDE), { headers: { apikey: SB_KEY } });
      if (!r.ok) throw new Error(r.status);
      const row = (await r.json())[0] || { frage: 0, aufgeloest: false, reset_nr: 0 };
      ctlOk = true;
      if (st.reset !== row.reset_nr) { st = { i: 0, a: {}, reset: row.reset_nr }; save(); }
      const changed = !ctl || ctl.frage !== row.frage || ctl.aufgeloest !== row.aufgeloest;
      ctl = row;
      if (changed) { render(); window.scrollTo(0, 0); } else status();
    } catch (e) { ctlOk = false; status(); }
  }

  /* ---------- Darstellung ---------- */
  function shuffled(arr, seed){ const a = arr.map((v,i)=>i); let x = seed*9301+49297; for(let i=a.length-1;i>0;i--){ x=(x*9301+49297)%233280; const j=Math.floor(x/233280*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } if(a.every((v,i)=>v===i)) a.push(a.shift()); return a; }
  const pool = q => [...new Set(q.rows.map(r=>r[1]))].sort((a,b)=>a.localeCompare(b,'de'));
  function result(q, a){
    if(q.t==='mc') return a.pick===q.correct;
    if(q.t==='sel') return q.rows.every((r,k)=>(a.v||[])[k]===r[1]);
    const s = a.seq || []; return s.length===q.items.length && s.every((v,k)=>v===k); }
  const answered = (q, a) => !!a && (LIVE ? !!a.sent : !!a.done);
  function figs(q){ let h='';
    if(q.fig) h += `<div class="fig${q.fig.k==='strip'?'':' small'}">${figSVG(q.fig,PAL)}</div>`;
    if(q.figs) h += `<div class="figs">${q.figs.map(f=>`<div class="fig">${figSVG(f,PAL)}</div>`).join('')}</div>`;
    return h; }
  const why = (q, ok) => `<div class="why ${ok?'good':'bad'}" role="status"><b>${ok?'Richtig.':'Nicht ganz.'}</b>${esc(q.why)}</div>`;

  /* Auflösung: a darf leer sein (Live-Modus, nicht beantwortet) */
  function solved(q, a){
    const none = LIVE && !a.sent ? `<p class="hint" style="text-align:left">Sie haben diese Frage nicht beantwortet. So wäre es richtig:</p>` : '';
    if(q.t==='mc') return none + `<div class="opts">${q.opts.map((o,k)=>{ const c = k===q.correct?' good':(k===a.pick?' bad':''); const tag = k===q.correct?'richtig':(k===a.pick?'Ihre Wahl':''); return `<div class="opt o${L[k]}${c}" style="border:1.5px solid var(--line);border-radius:12px;padding:12px 14px"><span class="l">${L[k]}</span><span class="x">${esc(o)}</span>${tag?`<span class="tag">${tag}</span>`:''}</div>`; }).join('')}</div>` + (none ? `<div class="why"><b>Erklärung</b>${esc(q.why)}</div>` : why(q, result(q,a)));
    if(q.t==='sel'){ const v = a.v || [];
      return none + `<div class="rows">${q.rows.map((r,k)=>{ const ok = v[k]===r[1];
        return `<div class="r${ok?' good':' bad'}"><label>${esc(r[0])}</label><select disabled><option>${esc(v[k]||'–')}</option></select><span class="res">${ok?'richtig':'richtig wäre: '+esc(r[1])}</span></div>`; }).join('')}</div>` + (none ? `<div class="why"><b>Erklärung</b>${esc(q.why)}</div>` : why(q, result(q,a))); }
    const seq = a.seq && a.seq.length ? a.seq : null;
    if(!seq) return none + `<ol class="seq">${q.items.map(it=>`<li class="good">${esc(it)}</li>`).join('')}</ol><div class="why"><b>Erklärung</b>${esc(q.why)}</div>`;
    return `<ol class="seq">${seq.map((v,k)=>`<li class="${v===k?'good':'bad'}">${esc(q.items[v])}${v===k?'':' – gehört an Stelle '+(v+1)}</li>`).join('')}</ol>` + why(q, result(q,a));
  }

  function asking(q, a){
    const submit = LIVE ? 'Antwort abgeben' : 'Prüfen';
    if(q.t==='mc'){
      if(a.pick!=null) return `<div class="tile o${L[a.pick]}"><b>${L[a.pick]}</b><span>${esc(q.opts[a.pick])}</span></div><div class="rowbtn"><button type="button" class="ghost" data-act="unpick">Antwort ändern</button><button type="button" class="primary" data-act="done">${LIVE?'Antwort abgeben':'Auflösung zeigen'}</button></div>`;
      return `<div class="opts">${q.opts.map((o,k)=>`<button type="button" class="opt o${L[k]}" data-act="pick" data-k="${k}"><span class="l">${L[k]}</span><span class="x">${esc(o)}</span></button>`).join('')}</div>`;
    }
    if(q.t==='sel'){ const P = pool(q), v = a.v || [];
      return `<div class="rows">${q.rows.map((r,k)=>`<div class="r"><label for="s-${q.n}-${k}">${esc(r[0])}</label><select id="s-${q.n}-${k}" data-k="${k}"><option value="">– auswählen –</option>${P.map(p=>`<option${v[k]===p?' selected':''}>${esc(p)}</option>`).join('')}</select></div>`).join('')}</div><button type="button" class="primary" data-act="done">${submit}</button>`;
    }
    const ord = shuffled(q.items, q.n), seq = a.seq || [], rest = ord.filter(v=>!seq.includes(v));
    return (seq.length ? `<ol class="seq">${seq.map(v=>`<li>${esc(q.items[v])}</li>`).join('')}</ol>` : `<div class="empty">Tippen Sie die Schritte in der richtigen Reihenfolge an.</div>`) +
      `<div class="opts">${rest.map(v=>`<button type="button" data-act="add" data-k="${v}">${esc(q.items[v])}</button>`).join('')}</div>` +
      `<div class="rowbtn"><button type="button" class="ghost" data-act="reset"${seq.length?'':' disabled'}>Zurücksetzen</button><button type="button" class="primary" data-act="done"${rest.length?' disabled':''}>${submit}</button></div>`;
  }

  function waitingCard(q, a){
    const mine = q.t==='mc' && a.pick!=null ? `<div class="tile o${L[a.pick]}"><b>${L[a.pick]}</b><span>${esc(q.opts[a.pick])}</span></div>` : '';
    return mine + `<div class="why good" role="status"><b>Antwort abgegeben.</b>Die Auflösung folgt gleich auf diesem Bildschirm.</div>`;
  }

  function card(q, inner){ return `<section class="card"><div class="meta"><span class="num">Frage ${q.n}</span><span class="sec">${esc(q.sec)}</span></div><h1>${esc(q.q)}</h1>${figs(q)}${inner}</section>`; }

  function status(){
    if (!LIVE) return;
    const done = Object.values(st.a).filter(a=>a.sent).length;
    $('score').textContent = (ctlOk ? '● live' : '○ Verbindung wird gesucht …') + (done ? ` · ${done} beantwortet` : '');
  }

  function renderLive(){
    document.querySelector('.jump').hidden = true;
    document.querySelector('nav').hidden = true;
    document.querySelector('.bar').hidden = true;
    status();
    const q = ctl && ctl.frage ? byN(ctl.frage) : null;
    if (!q) { $('main').innerHTML = `<section class="card"><h1>Gleich geht es los.</h1><p>Die erste Frage erscheint automatisch auf diesem Bildschirm, sobald sie freigegeben ist. Sie müssen nichts neu laden.</p><p class="hint" style="text-align:left">Ihre Antworten werden anonym ausgewertet, ohne Namen oder andere Angaben zu Ihrer Person.</p></section>`; return; }
    const a = st.a[q.n] || {};
    $('main').innerHTML = card(q, ctl.aufgeloest ? solved(q, a) : a.sent ? waitingCard(q, a) : asking(q, a));
  }

  function renderFree(){
    const done = QS.filter(q=>answered(q, st.a[q.n])).length, right = QS.filter(q=>answered(q, st.a[q.n]) && result(q, st.a[q.n])).length;
    $('score').textContent = done ? `${right} von ${done} richtig` : `${QS.length} Fragen`;
    $('bar').style.width = (100*done/QS.length)+'%';
    $('jump').value = String(st.i);
    $('prev').disabled = st.i===0;
    $('next').textContent = st.i>=QS.length-1 ? (st.i===QS.length ? 'Zur ersten Frage' : 'Auswertung') : 'Weiter';
    if(st.i===QS.length){
      $('main').innerHTML = `<section class="card end"><h1>Ihre Auswertung</h1><div class="big">${right} / ${QS.length}</div><p>${done<QS.length?`Sie haben ${done} von ${QS.length} Fragen beantwortet.`:'Sie haben alle Fragen beantwortet.'} Zum Wiederholen können Sie alle Antworten löschen und von vorn beginnen.</p><p class="hint" style="text-align:left">Ihre Antworten wurden anonym für die gemeinsame Auswertung übermittelt, ohne Namen oder andere Angaben zu Ihrer Person. Gezählt wird jeweils Ihre erste Antwort.</p><div class="rowbtn"><button type="button" class="ghost" data-act="${st.ask?'wipe':'ask'}">${st.ask?'Wirklich alle Antworten löschen':'Antworten löschen'}</button></div></section>`;
      return; }
    const q = QS[st.i], a = st.a[q.n] || {};
    $('main').innerHTML = card(q, a.done ? solved(q, a) : asking(q, a));
  }
  const render = () => LIVE ? renderLive() : renderFree();
  const current = () => LIVE ? (ctl && ctl.frage ? byN(ctl.frage) : null) : QS[st.i];

  /* ---------- Bedienung ---------- */
  $('jump').innerHTML = QS.map((q,k)=>`<option value="${k}">Frage ${q.n}</option>`).join('') + `<option value="${QS.length}">Auswertung</option>`;
  $('jump').addEventListener('change', e => { st.i = +e.target.value; st.ask=false; save(); render(); window.scrollTo(0,0); });
  $('prev').addEventListener('click', () => { if(st.i>0){ st.i--; st.ask=false; save(); render(); window.scrollTo(0,0);} });
  $('next').addEventListener('click', () => { st.i = st.i>=QS.length ? 0 : st.i+1; st.ask=false; save(); render(); window.scrollTo(0,0); });
  $('main').addEventListener('change', e => { const s = e.target.closest('select'); const q = current(); if(!s || !q) return; const a = st.a[q.n] || (st.a[q.n] = {}); if (answered(q, a)) return; a.v = a.v || []; a.v[+s.dataset.k] = s.value; save(); });
  $('main').addEventListener('click', e => { const b = e.target.closest('[data-act]'); if(!b) return; const act = b.dataset.act;
    if(act==='ask'){ st.ask=true; render(); return; }
    if(act==='wipe'){ st = {i:0,a:{}}; save(); render(); return; }
    const q = current(); if (!q) return;
    if (LIVE && ctl && ctl.aufgeloest) return;
    const a = st.a[q.n] || (st.a[q.n] = {});
    if (answered(q, a)) return;
    if(act==='pick') a.pick = +b.dataset.k;
    else if(act==='unpick') delete a.pick;
    else if(act==='add'){ a.seq = a.seq || []; a.seq.push(+b.dataset.k); }
    else if(act==='reset') a.seq = [];
    else if(act==='done'){
      if(q.t==='sel') a.v = q.rows.map((r,k)=>(a.v||[])[k]||'');
      if(LIVE) a.sent = true; else a.done = true;
      report(q, a);
    }
    save(); render(); });

  if (LIVE) { renderLive(); poll(); setInterval(poll, 2500); document.addEventListener('visibilitychange', () => { if (!document.hidden) poll(); }); }
  else renderFree();
  flush();
})();
