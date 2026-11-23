import { drawPetSprite, px } from './world-sprites.js';

let activePipWindow = null;

export async function openMiniPetWindow({ getState, onFocusMain }) {
  if (activePipWindow && !activePipWindow.closed) {
    activePipWindow.focus();
    return { ok: true, mode: 'existing' };
  }

  let win = null;
  let mode = 'popup';

  if (
    'documentPictureInPicture' in window &&
    typeof window.documentPictureInPicture.requestWindow === 'function'
  ) {
    try {
      win = await window.documentPictureInPicture.requestWindow({
        width: 256,
        height: 280,
      });
      mode = 'pip';
    } catch {
      win = null;
    }
  }

  if (!win) {
    win = window.open(
      '',
      'pixel-office-minipet',
      'popup,width=264,height=296,resizable=yes'
    );
    mode = 'popup';
  }

  if (!win) {
    return { ok: false, error: 'Pop-up bloqueado pelo navegador.' };
  }

  activePipWindow = win;
  const doc = win.document;
  doc.title = 'Pixel Office · Mini-Pet';

  const style = doc.createElement('style');
  style.textContent = `
    :root { color-scheme: dark; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 10px;
      background: #0f172a;
      color: #f8fafc;
      font-family: ui-monospace, Consolas, monospace;
      display: flex;
      flex-direction: column;
      gap: 8px;
      height: 100vh;
      overflow: hidden;
    }
    .hdr {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 11px;
      font-weight: 700;
      color: #38bdf8;
    }
    .stage {
      background: #1e293b;
      border: 2px solid #334155;
      border-radius: 6px;
      display: flex;
      justify-content: center;
      padding: 6px;
    }
    canvas {
      image-rendering: pixelated;
      display: block;
    }
    .status {
      font-size: 11px;
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 4px;
      padding: 6px 8px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .bar-wrap {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 4px;
      padding: 5px 8px;
      font-size: 10px;
    }
    .bar-track {
      margin-top: 4px;
      height: 6px;
      background: #0f172a;
      border-radius: 3px;
      overflow: hidden;
    }
    .bar-fill {
      height: 100%;
      width: 0%;
      background: #38bdf8;
      transition: width 200ms ease;
    }
    button {
      padding: 6px 8px;
      border-radius: 4px;
      border: 1px solid #38bdf8;
      background: #0284c7;
      color: #ffffff;
      font-family: inherit;
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
    }
  `;
  doc.head.appendChild(style);

  const hdr = doc.createElement('div');
  hdr.className = 'hdr';
  const titleSpan = doc.createElement('span');
  titleSpan.textContent = 'PIXEL OFFICE PET';
  const lvSpan = doc.createElement('span');
  lvSpan.textContent = 'Lv 1';
  hdr.append(titleSpan, lvSpan);

  const stage = doc.createElement('div');
  stage.className = 'stage';
  const canvas = doc.createElement('canvas');
  canvas.width = 160;
  canvas.height = 96;
  stage.appendChild(canvas);

  const statusBox = doc.createElement('div');
  statusBox.className = 'status';
  statusBox.textContent = 'Observando agentes…';

  const barWrap = doc.createElement('div');
  barWrap.className = 'bar-wrap';
  const barLabel = doc.createElement('div');
  barLabel.textContent = 'Janela 5h: 0%';
  const barTrack = doc.createElement('div');
  barTrack.className = 'bar-track';
  const barFill = doc.createElement('div');
  barFill.className = 'bar-fill';
  barTrack.appendChild(barFill);
  barWrap.append(barLabel, barTrack);

  const btnFocus = doc.createElement('button');
  btnFocus.type = 'button';
  btnFocus.textContent = 'Focar Pixel Office';
  btnFocus.addEventListener('click', () => {
    try {
      window.focus();
      onFocusMain?.();
    } catch {
      // ignore
    }
  });

  doc.body.replaceChildren(hdr, stage, statusBox, barWrap, btnFocus);

  const ctx = canvas.getContext('2d');
  let tick = 0;

  const render = () => {
    if (win.closed) return;
    tick = (tick + 1) % 120;
    const snap = getState?.();
    if (!snap) return;

    const petType =
      snap.prefs?.petType && snap.prefs.petType !== 'none'
        ? snap.prefs.petType
        : 'cyberfox';
    const agents = snap.agents || [];
    const waiting = agents.find((a) => a.state === 'waiting' || a.state === 'error');
    const dreaming = agents.find((a) => a.state === 'dreaming');
    const done = agents.find((a) => a.state === 'done');
    const active = snap.stats?.active || 0;

    let mood = 'sleep';
    if (waiting) mood = 'alert';
    else if (done) mood = 'happy';
    else if (dreaming && active === 0) mood = 'dream';
    else if (active > 0) mood = 'walk';

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    px(ctx, 0, 74, 160, 22, '#0f172a');
    px(
      ctx,
      0,
      72,
      160,
      2,
      waiting ? '#facc15' : active > 0 ? '#38bdf8' : dreaming ? '#a855f7' : '#475569'
    );
    drawPetSprite(ctx, 80, 56, petType, mood, tick, 1, 2.2);

    lvSpan.textContent = `Lv ${snap.progression?.level || 1}`;
    if (waiting) {
      statusBox.textContent = `! Atenção: ${waiting.personaName || waiting.title}`;
      statusBox.style.borderColor = '#facc15';
    } else if (active > 0) {
      statusBox.textContent = `${active} ativo(s) · ${snap.stats?.antigravityCount || 0} AG / ${snap.stats?.geminiWebCount || 0} Gem`;
      statusBox.style.borderColor = '#38bdf8';
    } else if (dreaming) {
      statusBox.textContent = `💭 Sonhando: ${dreaming.personaName || dreaming.title}`;
      statusBox.style.borderColor = '#a855f7';
    } else {
      statusBox.textContent = `Tudo tranquilo (${agents.length} sessões)`;
      statusBox.style.borderColor = '#334155';
    }

    const used5h = snap.analytics?.window5h?.totalTokens || 0;
    const limit5h = snap.prefs?.budgets?.tokens5h ?? 6000000;
    const unlimited = !limit5h || limit5h <= 0;
    const pct = unlimited ? 0 : Math.min(100, Math.round((used5h / limit5h) * 100));
    barLabel.textContent = unlimited
      ? `Janela 5h: ${used5h.toLocaleString('pt-BR')} (Sem teto)`
      : `Janela 5h: ${pct}% (${used5h.toLocaleString('pt-BR')} / ${limit5h.toLocaleString('pt-BR')})`;
    barFill.style.width = `${unlimited ? (used5h > 0 ? 14 : 0) : pct}%`;
    barFill.style.background =
      unlimited ? '#38bdf8' : pct >= 90 ? '#f87171' : pct >= 70 ? '#facc15' : '#38bdf8';
  };

  render();
  const timer = setInterval(render, 400);

  const cleanup = () => {
    clearInterval(timer);
    activePipWindow = null;
  };
  win.addEventListener('pagehide', cleanup);
  win.addEventListener('beforeunload', cleanup);

  return { ok: true, mode };
}
