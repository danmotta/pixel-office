import {
  App,
  applyDocumentTheme,
  applyHostStyleVariables,
} from '@modelcontextprotocol/ext-apps';
import { openMiniPetWindow } from './mini-pet.js';
import {
  createDemoSnapshot,
  OfficeCanvasRenderer,
  STATE_LABELS_PT,
} from './office-canvas.js';
import { getAgentPersonality, SocialEngine } from './social-engine.js';
import { drawAvatarPortrait } from './world-sprites.js';

const BRIDGE_URL = 'http://127.0.0.1:4748';
const DEFAULT_EXT_PATH = '~/.gemini/config/plugins/pixel-office/chrome-extension';

const THEME_LABELS = {
  auto: 'Auto',
  day: 'Dia',
  night: 'Noite',
  cyber: 'Cyber',
  christmas: 'Natal',
};
const THEME_ORDER = ['auto', 'day', 'night', 'cyber', 'christmas'];

const els = {
  viewport: document.getElementById('canvas-viewport'),
  canvas: document.getElementById('office-canvas'),
  emptyState: document.getElementById('canvas-empty'),
  tooltip: document.getElementById('canvas-tooltip'),

  btnToggleSidebar: document.getElementById('btn-toggle-sidebar'),
  connPill: document.getElementById('conn-pill'),
  connPillText: document.getElementById('conn-pill-text'),
  xpPill: document.getElementById('xp-pill'),
  themePill: document.getElementById('theme-pill'),

  statRooms: document.getElementById('stat-rooms'),
  statAgents: document.getElementById('stat-agents'),
  statActive: document.getElementById('stat-active'),
  statSubagents: document.getElementById('stat-subagents'),
  statShells: document.getElementById('stat-shells'),
  statWaiting: document.getElementById('stat-waiting'),
  kpiShellsWrap: document.getElementById('kpi-shells-wrap'),
  kpiWaitingWrap: document.getElementById('kpi-waiting-wrap'),

  meterAgBtn: document.getElementById('meter-ag-btn'),
  meterGemBtn: document.getElementById('meter-gem-btn'),
  meterAg5hFill: document.getElementById('meter-ag-5h-fill'),
  meterAg5hPct: document.getElementById('meter-ag-5h-pct'),
  meterAg5hVal: document.getElementById('meter-ag-5h-val'),
  meterAg7dFill: document.getElementById('meter-ag-7d-fill'),
  meterAg7dPct: document.getElementById('meter-ag-7d-pct'),
  meterAg7dVal: document.getElementById('meter-ag-7d-val'),
  meterGem24hFill: document.getElementById('meter-gem-24h-fill'),
  meterGem24hPct: document.getElementById('meter-gem-24h-pct'),
  meterAg5hReset: document.getElementById('meter-ag-5h-reset'),
  meterAg7dReset: document.getElementById('meter-ag-7d-reset'),
  meterGem24hVal: document.getElementById('meter-gem-24h-val'),
  meterCacheFill: document.getElementById('meter-cache-fill'),
  meterCachePct: document.getElementById('meter-cache-pct'),
  meterGemTabs: document.getElementById('meter-gem-tabs'),

  btnFit: document.getElementById('btn-fit'),
  btnZoomOut: document.getElementById('btn-zoom-out'),
  btnZoomIn: document.getElementById('btn-zoom-in'),
  zoomLabel: document.getElementById('zoom-label'),
  btnAddRoom: document.getElementById('btn-add-room'),
  btnDream: document.getElementById('btn-dream'),
  btnTools: document.getElementById('btn-tools'),
  btnDemo: document.getElementById('btn-demo'),
  btnCmdPalette: document.getElementById('btn-cmd-palette'),
  btnSettings: document.getElementById('btn-settings'),
  btnHelp: document.getElementById('btn-help'),
  btnEmptyDemo: document.getElementById('btn-empty-demo'),
  btnEmptyGemini: document.getElementById('btn-empty-gemini'),

  alertBanner: document.getElementById('alert-banner'),
  alertBannerText: document.getElementById('alert-banner-text'),
  btnDismissAlert: document.getElementById('btn-dismiss-alert'),
  replayBanner: document.getElementById('replay-banner'),
  replayBannerText: document.getElementById('replay-banner-text'),
  btnBannerReplayLive: document.getElementById('btn-banner-replay-live'),

  leftSidebar: document.getElementById('left-sidebar'),
  sidebarSummary: document.getElementById('sidebar-summary'),
  searchInput: document.getElementById('search-input'),
  sidebarRooms: document.getElementById('sidebar-rooms'),
  sidebarRepoCount: document.getElementById('sidebar-repo-count'),
  btnClearOffline: document.getElementById('btn-clear-offline'),
  btnOpenRepos: document.getElementById('btn-open-repos'),

  rightDrawer: document.getElementById('right-drawer'),
  btnCloseDrawer: document.getElementById('btn-close-drawer'),
  drawerPortrait: document.getElementById('drawer-portrait'),
  drawerName: document.getElementById('drawer-name'),
  drawerRolePill: document.getElementById('drawer-role-pill'),
  drawerSourceBadge: document.getElementById('drawer-source-badge'),
  drawerModel: document.getElementById('drawer-model'),
  drawerRoom: document.getElementById('drawer-room'),
  drawerPrompt: document.getElementById('drawer-prompt'),
  drawerStateDot: document.getElementById('drawer-state-dot'),
  drawerStateText: document.getElementById('drawer-state-text'),
  drawerTimeText: document.getElementById('drawer-time-text'),
  btnFollowAgent: document.getElementById('btn-follow-agent'),
  btnCenterAgent: document.getElementById('btn-center-agent'),
  btnDreamAgent: document.getElementById('btn-dream-agent'),
  btnDrawerOpenUrl: document.getElementById('btn-drawer-open-url'),
  drawerNowTool: document.getElementById('drawer-now-tool'),
  drawerNowAge: document.getElementById('drawer-now-age'),
  drawerTechDetails: document.getElementById('drawer-tech-details'),
  drawerTokensGrid: document.getElementById('drawer-tokens-grid'),
  dlgTokIn: document.getElementById('dlg-tok-in'),
  dlgTokCache: document.getElementById('dlg-tok-cache'),
  dlgTokOut: document.getElementById('dlg-tok-out'),
  dlgToolCount: document.getElementById('dlg-tool-count'),
  dlgToolsList: document.getElementById('dlg-tools-list'),

  socialCoinsHeader: document.getElementById('social-coins-header'),
  socialCoinsBig: document.getElementById('social-coins-big'),
  socialCoinsSub: document.getElementById('social-coins-sub'),
  socialRecord: document.getElementById('social-record'),
  socialActivityLine: document.getElementById('social-activity-line'),
  socialTraitsList: document.getElementById('social-traits-list'),
  socialCatchphrase: document.getElementById('social-catchphrase'),
  socialRelations: document.getElementById('social-relations'),
  socialLedgerList: document.getElementById('social-ledger-list'),

  drawerSubagentsSection: document.getElementById('drawer-subagents-section'),
  drawerSubagentsCount: document.getElementById('drawer-subagents-count'),
  drawerSubagentsList: document.getElementById('drawer-subagents-list'),
  agentMessageForm: document.getElementById('agent-message-form'),
  agentMessageInput: document.getElementById('agent-message-input'),
  agentMessageStatus: document.getElementById('agent-message-status'),

  avatarCustomDetails: document.getElementById('avatar-custom-details'),
  avatarCustomForm: document.getElementById('avatar-custom-form'),
  avNickname: document.getElementById('av-nickname'),
  avHairStyle: document.getElementById('av-hair-style'),
  avShirt: document.getElementById('av-shirt'),
  avAccessory: document.getElementById('av-accessory'),
  avRoom: document.getElementById('av-room'),
  btnAvReset: document.getElementById('btn-av-reset'),

  bottomFeed: document.getElementById('bottom-feed'),
  feedHeaderBar: document.getElementById('feed-header-bar'),
  btnToggleFeed: document.getElementById('btn-toggle-feed'),
  feedCountPill: document.getElementById('feed-count-pill'),
  activityFeed: document.getElementById('activity-feed'),

  attentionToast: document.getElementById('attention-toast'),
  attentionToastText: document.getElementById('attention-toast-text'),
  btnToastRespond: document.getElementById('btn-toast-respond'),
  btnToastDismiss: document.getElementById('btn-toast-dismiss'),

  toolsDialog: document.getElementById('tools-dialog'),
  usageSummary: document.getElementById('usage-summary'),
  tabCountRepos: document.getElementById('tab-count-repos'),
  btnRefreshRepos: document.getElementById('btn-refresh-repos'),
  addRepoForm: document.getElementById('add-repo-form'),
  inputRepoPath: document.getElementById('input-repo-path'),
  reposList: document.getElementById('repos-list'),
  kanbanAddForm: document.getElementById('kanban-add-form'),
  kanbanTitleInput: document.getElementById('kanban-title-input'),
  kanbanRoomInput: document.getElementById('kanban-room-input'),
  kanbanBoard: document.getElementById('kanban-board'),
  btnReplayToggle: document.getElementById('btn-replay-toggle'),
  btnReplayLive: document.getElementById('btn-replay-live'),
  replaySpeed: document.getElementById('replay-speed'),
  replaySlider: document.getElementById('replay-slider'),
  replayStatus: document.getElementById('replay-status'),
  replayEventsList: document.getElementById('replay-events-list'),

  roomDialog: document.getElementById('room-dialog'),
  roomDialogTitle: document.getElementById('room-dialog-title'),
  roomForm: document.getElementById('room-form'),
  roomNameInput: document.getElementById('room-name-input'),
  roomKindInput: document.getElementById('room-kind-input'),
  roomColorInput: document.getElementById('room-color-input'),
  btnRoomSave: document.getElementById('btn-room-save'),
  btnRoomReset: document.getElementById('btn-room-reset'),
  btnRoomDelete: document.getElementById('btn-room-delete'),

  cmdDialog: document.getElementById('cmd-dialog'),
  cmdInput: document.getElementById('cmd-input'),
  cmdList: document.getElementById('cmd-list'),

  settingsDialog: document.getElementById('settings-dialog'),
  settingsForm: document.getElementById('settings-form'),
  cfgTheme: document.getElementById('cfg-theme'),
  cfgSocialEnabled: document.getElementById('cfg-social-enabled'),
  cfgBudgetAlerts: document.getElementById('cfg-budget-alerts'),
  btnNotif: document.getElementById('btn-notif'),
  btnSound: document.getElementById('btn-sound'),
  cfgPetType: document.getElementById('cfg-pet-type'),
  cfgTok5h: document.getElementById('cfg-tok-5h'),
  cfgTok24h: document.getElementById('cfg-tok-24h'),
  cfgTok7d: document.getElementById('cfg-tok-7d'),
  cfgGem24h: document.getElementById('cfg-gem-24h'),
  cfgLongSec: document.getElementById('cfg-long-sec'),

  repoDialog: document.getElementById('repo-dialog'),
  repoDialogBadge: document.getElementById('repo-dialog-badge'),
  repoDialogTitle: document.getElementById('repo-dialog-title'),
  repoDlgKind: document.getElementById('repo-dlg-kind'),
  repoDlgBranch: document.getElementById('repo-dlg-branch'),
  repoDlgDirty: document.getElementById('repo-dlg-dirty'),
  repoDlgSource: document.getElementById('repo-dlg-source'),
  repoDlgPath: document.getElementById('repo-dlg-path'),
  repoCommitBlock: document.getElementById('repo-commit-block'),
  repoDlgCommit: document.getElementById('repo-dlg-commit'),
  repoGithubBlock: document.getElementById('repo-github-block'),
  repoDlgSlug: document.getElementById('repo-dlg-slug'),
  btnOpenGithub: document.getElementById('btn-open-github'),

  geminiHelpDialog: document.getElementById('gemini-help-dialog'),
  geminiConnStatus: document.getElementById('gemini-conn-status'),
  extPathCode: document.getElementById('ext-path-code'),
  btnCopyExtPath: document.getElementById('btn-copy-ext-path'),
  copyExtFeedback: document.getElementById('copy-ext-feedback'),

  helpDialog: document.getElementById('help-dialog'),
};

const appState = {
  mode: 'connecting',
  mcpApp: null,
  hostCaps: null,
  demoMode: false,
  demoDreamMap: new Map(),
  soundEnabled: false,
  notifEnabled: false,
  filter: 'all',
  searchQuery: '',
  officeTheme: 'auto',
  zoom: 1,
  liveSnapshot: null,
  selectedAgentId: null,
  editingRoom: null,
  selectedRepoUrl: '',
  prevAgentStates: new Map(),
  firedAlertIds: new Set(),
  dismissedWaitingKeys: new Set(),
  dismissedAlertSig: '',
  currentToastAgentId: null,
  currentToastKey: null,
  socialFeedItems: [],
  cmdItems: [],
  cmdIndex: 0,
  lastCmdCloseAt: 0,
  audioCtx: null,
  demoTimer: null,
  pollTimer: null,
  pollInFlight: false,
  sseSource: null,
  replayActive: false,
  replayPlaying: false,
  replayIndex: 0,
  replayTimer: null,
  selectTabFn: null,
  lastSidebarSig: '',
  lastFeedSig: '',
  lastDrawerSig: '',
  lastToolsSig: '',
  lastServerTheme: null,
  lastSseAt: 0,
  forceRefreshFn: null,
  liveTickTimer: null,
};

function getExtensionPath() {
  return appState.liveSnapshot?.extensionPath || DEFAULT_EXT_PATH;
}

const socialEngine = new SocialEngine();

const renderer = new OfficeCanvasRenderer(els.canvas, els.viewport, socialEngine, {
  onSocialFeed: (ev) => {
    appState.socialFeedItems.unshift(ev);
    if (appState.socialFeedItems.length > 35) appState.socialFeedItems.length = 35;
    if (!appState.replayActive) {
      const snap = getEffectiveSnapshot();
      renderFeed(snap);
    }
  },
  onSound: (kind) => playBeep(kind),
  onZoomChange: (zoom) => {
    appState.zoom = zoom;
    els.zoomLabel.textContent = `${Math.round(zoom * 100)}%`;
  },
});
renderer.start();

function safeStorageGet(key, fallback) {
  try {
    const val = window.localStorage.getItem(key);
    return val !== null ? val : fallback;
  } catch {
    return fallback;
  }
}

function safeStorageSet(key, val) {
  try {
    window.localStorage.setItem(key, val);
  } catch {
    // Opaque MCP App iframe origin forbids localStorage
  }
}

function formatNumber(n) {
  return Number(n || 0).toLocaleString('pt-BR');
}

function formatCompactTokens(n) {
  const num = Number(n || 0);
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}k`;
  return String(num);
}

function formatRelativeTime(ts) {
  if (!ts) return '-';
  const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (diffSec < 10) return 'agora';
  if (diffSec < 60) return `há ${diffSec}s`;
  const mins = Math.floor(diffSec / 60);
  if (mins < 60) return `há ${mins}m`;
  const hrs = Math.floor(mins / 60);
  return `há ${hrs}h`;
}

function formatDurationMMSS(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatClock(ts) {
  try {
    return new Date(ts).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return '';
  }
}

function isShellAgent(agent) {
  if (!agent) return false;
  if (agent.state === 'terminal') return true;
  if (['coding', 'reading', 'thinking'].includes(agent.state)) {
    return /run_command|bash|shell|terminal|command/i.test(agent.currentTool || '');
  }
  return false;
}

function getAgentDisplayName(agent) {
  return getAgentPersonality(agent).displayName;
}

function getAgentStatusLabel(agent) {
  if (!agent) return '-';
  if (agent.sleeping) return 'Dormindo (ocioso)';
  if (agent.state === 'dreaming') return 'Sonhando (memória)';
  return STATE_LABELS_PT[agent.state] || agent.state;
}

function getStateDotColor(agent) {
  if (agent.sleeping) return '#64748b';
  if (agent.state === 'dreaming') return '#a855f7';
  if (agent.state === 'waiting') return '#facc15';
  if (agent.state === 'error') return '#f43f5e';
  if (agent.state === 'done') return '#4ade80';
  if (agent.state === 'terminal') return '#2dd4bf';
  if (agent.state === 'idle') return '#94a3b8';
  return '#38bdf8';
}

function playBeep(kind) {
  if (!appState.soundEnabled) return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    if (!appState.audioCtx) appState.audioCtx = new AudioCtx();
    const ctx = appState.audioCtx;
    if (ctx.state === 'suspended') ctx.resume();

    let notes = [523, 659, 784];
    let vol = 0.035;
    if (kind === 'waiting') notes = [660, 880];
    else if (kind === 'coin') notes = [988, 1319];
    else if (kind === 'pingpong') {
      notes = [740];
      vol = 0.015;
    } else if (kind === 'dream') {
      notes = [440, 554, 659];
      vol = 0.025;
    }

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = kind === 'pingpong' || kind === 'dream' ? 'triangle' : 'square';
      osc.frequency.value = freq;
      const start = ctx.currentTime + i * 0.075;
      gain.gain.setValueAtTime(vol, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.07);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.075);
    });
  } catch {
    // Ignore WebAudio restrictions
  }
}

function fireDesktopNotification(title, body, tag) {
  if (!appState.notifEnabled || typeof Notification === 'undefined') return;
  if (Notification.permission !== 'granted') return;
  try {
    const n = new Notification(title, { body, tag });
    n.onclick = () => {
      try {
        window.focus();
      } catch {
        // ignore
      }
      n.close();
    };
  } catch {
    // Some embedded webviews disallow Notification constructor
  }
}

function setConnPill(text, statusClass) {
  if (els.connPillText) els.connPillText.textContent = text;
  else els.connPill.textContent = text;
  els.connPill.className = `conn-pill ${statusClass}`;
}

function updateLiveTimers() {
  const now = Date.now();
  for (const el of document.querySelectorAll('[data-shell-since]')) {
    const since = Number(el.dataset.shellSince || 0);
    if (since > 0) el.textContent = formatDurationMMSS(now - since);
  }
  for (const el of document.querySelectorAll('[data-rel-ts]')) {
    const ts = Number(el.dataset.relTs || 0);
    if (ts > 0) el.textContent = formatRelativeTime(ts);
  }
}

function getBaseUrl() {
  return window.location.protocol.startsWith('http')
    ? window.location.origin
    : BRIDGE_URL;
}

async function callMutation(mcpTool, mcpArgs, httpPath, httpBody) {
  try {
    if (appState.mcpApp && appState.hostCaps?.serverTools) {
      const res = await appState.mcpApp.callServerTool({
        name: mcpTool,
        arguments: mcpArgs || {},
      });
      if (res?.structuredContent) handleIncomingSnapshot(res.structuredContent);
      return res?.structuredContent || null;
    }
    const resp = await fetch(`${getBaseUrl()}${httpPath}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(httpBody || {}),
    });
    const data = await resp.json();
    if (data?.snapshot) handleIncomingSnapshot(data.snapshot);
    return data?.snapshot || null;
  } catch {
    return null;
  }
}

function buildReplaySnapshot(baseSnap, index) {
  const timeline = baseSnap.timeline || [];
  if (timeline.length === 0) return baseSnap;
  const clampedIdx = Math.max(0, Math.min(timeline.length - 1, index));
  const slice = timeline.slice(0, clampedIdx + 1);
  const currentTs = timeline[clampedIdx].ts;

  const lastStateByAgent = new Map();
  for (const ev of slice) {
    lastStateByAgent.set(ev.agentId, ev);
  }

  const agents = (baseSnap.agents || []).map((a) => {
    const ev = lastStateByAgent.get(a.id);
    if (!ev) return { ...a, state: 'idle', sleeping: true, currentTool: '' };
    return {
      ...a,
      state: ev.state || 'idle',
      sleeping: ev.state === 'idle' && currentTs - ev.ts > 120000,
      currentTool: ev.toolName || '',
      toolSummary: ev.summary || '',
      lastActivityAt: ev.ts,
    };
  });

  return {
    ...baseSnap,
    agents,
    feed: slice
      .slice(-24)
      .reverse()
      .map((ev) => ({
        ts: ev.ts,
        source: ev.source,
        agentId: ev.agentId,
        label: ev.agentTitle || ev.room,
        state: ev.state,
        message: `${ev.toolName ? `${ev.toolName}: ` : ''}${ev.summary || ev.state}`,
      })),
  };
}

function getEffectiveSnapshot() {
  let base = appState.demoMode
    ? createDemoSnapshot(Math.floor(Date.now() / 1000))
    : appState.liveSnapshot || {
        version: '4.0.0',
        updatedAt: Date.now(),
        bridgeUrl: BRIDGE_URL,
        prefs: {
          petType: 'cyberfox',
          officeTheme: appState.officeTheme,
          socialEnabled: true,
          budgetAlertsEnabled: true,
          customRooms: [],
          roomOverrides: {},
          avatarOverrides: {},
          budgets: {
            tokens5h: 6000000,
            tokens24h: 15000000,
            tokens7d: 80000000,
            geminiMsgs24h: 100,
            longTaskWarnSec: 180,
          },
          kanban: [],
          extraRepoPaths: [],
        },
        stats: {
          total: 0,
          active: 0,
          antigravityCount: 0,
          geminiWebCount: 0,
          totalInputTokens: 0,
          totalOutputTokens: 0,
          totalCacheTokens: 0,
          totalToolCalls: 0,
        },
        analytics: {
          window5h: { inputTokens: 0, cacheTokens: 0, outputTokens: 0, totalTokens: 0, toolCalls: 0, estimatedUsd: 0 },
          window24h: { inputTokens: 0, cacheTokens: 0, outputTokens: 0, totalTokens: 0, toolCalls: 0, estimatedUsd: 0 },
          window7d: { inputTokens: 0, cacheTokens: 0, outputTokens: 0, totalTokens: 0, toolCalls: 0, estimatedUsd: 0 },
          reset5hInMs: 0,
          reset7dInMs: 0,
          byModel: [],
          cacheSavingsPct: 0,
          geminiMsgs24h: 0,
          productivity: { activeMinutesToday: 0, idleMinutesToday: 0, categoryCounts: {} },
        },
        alerts: [],
        progression: {
          xp: 0,
          level: 1,
          prevLevelXp: 0,
          nextLevelXp: 120,
          unlockedFurniture: ['coffee', 'plant'],
        },
        projectsAndRepos: [],
        rooms: [],
        agents: [],
        feed: [],
        timeline: [],
      };

  if (appState.demoMode && appState.demoDreamMap.size > 0) {
    const now = Date.now();
    base = {
      ...base,
      agents: base.agents.map((a) => {
        const until = appState.demoDreamMap.get(a.id) || 0;
        if (until > now) {
          return {
            ...a,
            state: 'dreaming',
            sleeping: false,
            dreamLabel: 'Reconsolidando memórias e limpando logs antigos',
          };
        }
        return a;
      }),
    };
  }

  if (appState.replayActive) {
    return buildReplaySnapshot(base, appState.replayIndex);
  }
  return base;
}

function formatCountdownShort(ms) {
  const totalMin = Math.max(0, Math.ceil((Number(ms) || 0) / 60000));
  if (totalMin <= 0) return '';
  if (totalMin < 60) return `⟳${totalMin}m`;
  const totalH = Math.floor(totalMin / 60);
  const remMin = totalMin % 60;
  if (totalH < 24) return `⟳${totalH}h${remMin > 0 ? String(remMin).padStart(2, '0') : ''}`;
  const days = Math.floor(totalH / 24);
  const remH = totalH % 24;
  return `⟳${days}d${remH}h`;
}

function updateSegMeter(fillEl, pctEl, valEl, used, limit, valText) {
  if (!fillEl || !pctEl) return;
  if (!limit || limit <= 0) {
    fillEl.style.width = used > 0 ? '14%' : '0%';
    fillEl.className = 'seg-fill';
    pctEl.textContent = 'Livre';
    if (valEl) valEl.textContent = valText;
    return;
  }
  const pct = Math.min(100, Math.round((used / limit) * 100));
  fillEl.style.width = `${pct}%`;
  fillEl.className = 'seg-fill';
  if (pct >= 90) fillEl.classList.add('level-high');
  else if (pct >= 70) fillEl.classList.add('level-warn');
  pctEl.textContent = `${pct}%`;
  if (valEl) valEl.textContent = valText;
}

function renderTopHud(snap) {
  const agents = snap.agents || [];
  const activeAgents = agents.filter((a) =>
    ['thinking', 'coding', 'reading', 'terminal', 'subagents', 'waiting', 'typing'].includes(a.state)
  );
  const subCount = agents.reduce(
    (sum, a) => sum + (a.subagentDetails?.length || a.subagents?.length || 0),
    0
  );
  const shellCount = agents.filter(isShellAgent).length;
  const waitingCount = agents.filter((a) => a.state === 'waiting' || a.state === 'error').length;
  const projectRoomsCount = (snap.rooms || []).filter((r) => r.kind !== 'github-hub').length;

  els.statRooms.textContent = String(5 + projectRoomsCount);
  els.statAgents.textContent = String(agents.length);
  els.statActive.textContent = String(activeAgents.length);
  els.statSubagents.textContent = String(subCount);
  els.statShells.textContent = String(shellCount);
  els.statWaiting.textContent = String(waitingCount);
  els.kpiShellsWrap.classList.toggle('has-value', shellCount > 0);
  els.kpiWaitingWrap.classList.toggle('has-value', waitingCount > 0);

  const prog = snap.progression || {};
  els.xpPill.textContent = `Lv ${prog.level || 1}`;
  els.xpPill.title = `${formatNumber(prog.xp || 0)} XP · Próximo nível: ${formatNumber(prog.nextLevelXp || 120)} XP`;

  const budgets = snap.prefs?.budgets || {};
  const w5 = snap.analytics?.window5h || {};
  const w7 = snap.analytics?.window7d || {};
  const gem24h = snap.analytics?.geminiMsgs24h || 0;
  const cachePct = snap.analytics?.cacheSavingsPct || 0;

  updateSegMeter(
    els.meterAg5hFill,
    els.meterAg5hPct,
    els.meterAg5hVal,
    w5.totalTokens || 0,
    budgets.tokens5h ?? 6000000,
    formatCompactTokens(w5.totalTokens || 0)
  );
  updateSegMeter(
    els.meterAg7dFill,
    els.meterAg7dPct,
    els.meterAg7dVal,
    w7.totalTokens || 0,
    budgets.tokens7d ?? 80000000,
    formatCompactTokens(w7.totalTokens || 0)
  );
  if (els.meterAg5hReset) {
    const r5 = snap.analytics?.reset5hInMs || 0;
    els.meterAg5hReset.textContent = r5 > 0 ? formatCountdownShort(r5) : '';
  }
  if (els.meterAg7dReset) {
    const r7 = snap.analytics?.reset7dInMs || 0;
    els.meterAg7dReset.textContent = r7 > 0 ? formatCountdownShort(r7) : '';
  }
  updateSegMeter(
    els.meterGem24hFill,
    els.meterGem24hPct,
    els.meterGem24hVal,
    gem24h,
    budgets.geminiMsgs24h ?? 100,
    `${gem24h}t`
  );
  els.meterCacheFill.style.width = `${Math.min(100, cachePct)}%`;
  els.meterCachePct.textContent = `${cachePct}%`;
  els.meterGemTabs.textContent = `${snap.stats?.geminiWebCount || 0} abas`;
}

function renderLeftSidebar(snap, force = false) {
  const agents = snap.agents || [];
  const rooms = snap.rooms || [];
  const q = appState.searchQuery.trim().toLowerCase();
  const isChristmas = appState.officeTheme === 'christmas';

  const filteredAgents = agents.filter((a) => {
    if (appState.filter !== 'all' && a.source !== appState.filter) return false;
    if (!q) return true;
    const p = getAgentPersonality(a);
    const hay = `${p.displayName} ${a.title} ${a.room} ${a.model} ${a.currentTool || ''}`.toLowerCase();
    return hay.includes(q);
  });

  const sig = JSON.stringify([
    appState.demoMode,
    appState.filter,
    q,
    appState.officeTheme,
    appState.selectedAgentId,
    (snap.projectsAndRepos || []).length,
    rooms.map((r) => `${r.id}|${r.name}|${r.isCustom ? 1 : 0}|${(r.agentIds || []).join(',')}`),
    filteredAgents.map((a) => [
      a.id,
      a.personaName,
      a.title,
      a.roomId,
      a.state,
      a.sleeping,
      a.dreamLabel,
      a.currentTool,
      a.toolSummary,
      a.toolStartedAt,
      a.toolCount,
      socialEngine.getAgentSocialProfile(a, agents).currentActivity || '',
      a.subagentDetails?.map((s) => `${s.id}:${s.role}`).join(',') || '',
    ]),
  ]);

  if (!force && sig === appState.lastSidebarSig) return;
  appState.lastSidebarSig = sig;

  const byRoom = new Map();
  for (const r of rooms) {
    if (r.kind === 'github-hub') continue;
    byRoom.set(r.id, { room: r, agents: [] });
  }
  for (const a of filteredAgents) {
    if (!byRoom.has(a.roomId)) {
      byRoom.set(a.roomId, {
        room: { id: a.roomId, name: a.room || 'Geral', kind: a.source },
        agents: [],
      });
    }
    byRoom.get(a.roomId).agents.push(a);
  }

  els.sidebarSummary.textContent = appState.demoMode
    ? 'Demo v4'
    : `${filteredAgents.length} visíveis`;
  els.sidebarRepoCount.textContent = String((snap.projectsAndRepos || []).length);
  els.sidebarRooms.replaceChildren();

  let renderedCount = 0;
  for (const group of byRoom.values()) {
    if (q && group.agents.length === 0) continue;
    if (appState.filter !== 'all' && group.agents.length === 0) continue;
    if (group.agents.length === 0 && !group.room.isCustom) continue;
    renderedCount += 1;

    const card = document.createElement('div');
    card.className = 'room-group-card';

    const head = document.createElement('div');
    head.className = 'room-group-head';
    head.title = 'Clique para editar ou personalizar sala';
    head.addEventListener('click', () => {
      if (group.room.kind !== 'github-hub') openRoomDialog(group.room);
    });

    const nameWrap = document.createElement('div');
    nameWrap.className = 'room-group-name';
    const rName = document.createElement('span');
    rName.textContent = group.room.name;
    const rCount = document.createElement('span');
    rCount.className = 'room-count-pill';
    rCount.textContent = String(group.agents.length);
    nameWrap.append(rName, rCount);

    const badges = document.createElement('div');
    badges.className = 'room-badges';
    if (group.agents.some((a) => a.source === 'antigravity')) {
      const b = document.createElement('span');
      b.className = 'micro-badge micro-ag';
      b.textContent = 'AG';
      badges.appendChild(b);
    }
    if (group.agents.some((a) => a.source === 'gemini-web')) {
      const b = document.createElement('span');
      b.className = 'micro-badge micro-gem';
      b.textContent = 'G';
      badges.appendChild(b);
    }

    head.append(nameWrap, badges);
    card.appendChild(head);

    const firstWithPath = group.agents.find((a) => a.workspacePath);
    if (firstWithPath) {
      const sub = document.createElement('div');
      sub.className = 'room-subpath';
      sub.textContent = firstWithPath.workspacePath;
      card.appendChild(sub);
    }

    const totalTools = group.agents.reduce((s, a) => s + (a.toolCount || 0), 0);
    const bar = document.createElement('div');
    bar.className = 'room-progress-bar';
    const fill = document.createElement('div');
    fill.className = 'room-progress-fill';
    fill.style.width = `${Math.min(100, Math.max(8, totalTools * 4))}%`;
    bar.appendChild(fill);
    card.appendChild(bar);

    const list = document.createElement('div');
    list.className = 'sidebar-agent-list';

    if (group.agents.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'muted-micro';
      empty.textContent = 'Sala vazia — pronta para receber agentes';
      list.appendChild(empty);
    }

    for (const agent of group.agents) {
      const personality = getAgentPersonality(agent);
      const socialProf = socialEngine.getAgentSocialProfile(agent, agents);

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'sidebar-agent-btn';
      if (agent.id === appState.selectedAgentId) btn.classList.add('is-selected');

      const miniCanvas = document.createElement('canvas');
      miniCanvas.width = 26;
      miniCanvas.height = 26;
      miniCanvas.className = 'mini-portrait';
      drawAvatarPortrait(miniCanvas, agent, isChristmas);

      const info = document.createElement('div');
      info.className = 'sb-agent-info';

      const top = document.createElement('div');
      top.className = 'sb-agent-top';

      const nWrap = document.createElement('div');
      nWrap.className = 'sb-agent-name-wrap';

      const nSpan = document.createElement('span');
      nSpan.className = 'sb-agent-name';
      nSpan.textContent = personality.displayName;

      const sTag = document.createElement('span');
      sTag.className = `micro-badge ${agent.source === 'gemini-web' ? 'micro-gem' : 'micro-ag'}`;
      sTag.textContent = agent.source === 'gemini-web' ? 'G' : 'AG';

      nWrap.append(nSpan, sTag);

      const roleWrap = document.createElement('span');
      roleWrap.className = 'sb-role-lbl';
      roleWrap.textContent = 'Principal';

      top.append(nWrap, roleWrap);

      const stLine = document.createElement('div');
      stLine.className = 'sb-status-line';
      if (agent.sleeping) {
        stLine.textContent = '😴 Dormindo (ocioso)';
      } else if (agent.state === 'dreaming') {
        stLine.textContent = `💭 ${agent.dreamLabel || 'Sonhando (memória)'}`;
      } else if (agent.state === 'waiting' || agent.state === 'error') {
        stLine.textContent = `✋ ${agent.toolSummary || STATE_LABELS_PT[agent.state]}`;
      } else if (isShellAgent(agent)) {
        stLine.textContent = `⏳ ${agent.toolSummary || agent.currentTool || 'Terminal'}`;
        if (agent.toolStartedAt) {
          const sep = document.createTextNode(' · ');
          const tm = document.createElement('span');
          tm.dataset.shellSince = String(agent.toolStartedAt);
          tm.textContent = formatDurationMMSS(Date.now() - agent.toolStartedAt);
          stLine.append(sep, tm);
        }
      } else if (['coding', 'reading', 'thinking', 'subagents', 'typing'].includes(agent.state)) {
        const icon =
          agent.state === 'coding' ? '✏️ ' : agent.state === 'reading' ? '📖 ' : agent.state === 'subagents' ? '👥 ' : '🧠 ';
        stLine.textContent = `${icon}${agent.toolSummary || agent.currentTool || STATE_LABELS_PT[agent.state]}`;
      } else if (socialProf.currentActivity) {
        stLine.textContent = `☕ ${socialProf.currentActivity}`;
      } else {
        stLine.textContent = STATE_LABELS_PT[agent.state] || agent.state;
      }

      info.append(top, stLine);

      const sq = document.createElement('span');
      sq.className = `state-sq st-${agent.sleeping ? 'sleeping' : agent.state}`;

      btn.append(miniCanvas, info, sq);
      btn.addEventListener('click', () => selectAgent(agent.id, { centerCamera: true }));
      list.appendChild(btn);

      const subs = agent.subagentDetails?.length
        ? agent.subagentDetails
        : (agent.subagents || []).map((id, idx) => ({ id, name: `Subagente ${idx + 1}`, role: 'Worker', state: 'working' }));

      if (subs.length > 0) {
        const subTree = document.createElement('div');
        subTree.className = 'subagent-tree';
        for (const sub of subs.slice(0, 4)) {
          const row = document.createElement('div');
          row.className = 'subagent-mini-row';
          const sn = document.createElement('span');
          sn.textContent = sub.name || 'Subagente';
          const sr = document.createElement('span');
          sr.className = 'subagent-role-tag';
          sr.textContent = sub.role || 'Worker';
          row.append(sn, sr);
          subTree.appendChild(row);
        }
        list.appendChild(subTree);
      }
    }

    card.appendChild(list);
    els.sidebarRooms.appendChild(card);
  }

  if (renderedCount === 0) {
    const empty = document.createElement('p');
    empty.className = 'muted-micro';
    empty.style.padding = '8px 4px';
    empty.textContent = q
      ? 'Nenhum agente encontrado para essa busca.'
      : 'Nenhum agente ativo ou recente neste filtro.';
    els.sidebarRooms.appendChild(empty);
  }
}

function renderFeed(snap, force = false) {
  const merged = [...appState.socialFeedItems, ...(snap.feed || [])]
    .sort((a, b) => (b.ts || 0) - (a.ts || 0))
    .slice(0, 32);

  const feedSig = JSON.stringify(
    merged.map((m) => `${m.ts}|${m.agentId || ''}|${m.state || ''}|${m.message || ''}`)
  );
  if (!force && feedSig === appState.lastFeedSig) return;
  appState.lastFeedSig = feedSig;

  els.feedCountPill.textContent = String(merged.length);
  els.activityFeed.replaceChildren();

  if (merged.length === 0) {
    const li = document.createElement('li');
    li.className = 'feed-row';
    li.textContent = 'Aguardando eventos do Antigravity, Gemini Web ou Vida Social…';
    els.activityFeed.appendChild(li);
    return;
  }

  const agentById = new Map((snap.agents || []).map((a) => [a.id, a]));
  for (const item of merged) {
    const li = document.createElement('li');
    li.className = 'feed-row';
    const agent = item.agentId ? agentById.get(item.agentId) : null;
    const whoText = agent
      ? getAgentDisplayName(agent)
      : item.label || (item.source === 'gemini-web' ? 'Gemini Web' : 'Escritório');

    const tsSpan = document.createElement('span');
    tsSpan.className = 'feed-ts';
    tsSpan.textContent = formatClock(item.ts);

    const whoSpan = document.createElement('span');
    whoSpan.className = 'feed-who';
    whoSpan.textContent = whoText;

    const roomSpan = document.createElement('span');
    roomSpan.className = 'feed-room';
    roomSpan.textContent = agent?.room || item.label || item.source || '';

    const msgSpan = document.createElement('span');
    msgSpan.className = 'feed-msg';
    msgSpan.textContent = item.message || item.state || '';

    li.append(tsSpan, whoSpan, roomSpan, msgSpan);
    if (agent) {
      li.addEventListener('click', () => selectAgent(agent.id, { centerCamera: true }));
    }
    els.activityFeed.appendChild(li);
  }
}

function populateRightDrawer(agentId, snap, resetCustomForm = true) {
  const agent = (snap.agents || []).find((a) => a.id === agentId);
  if (!agent) {
    closeRightDrawer();
    return;
  }

  const isGem = agent.source === 'gemini-web';
  const isChristmas = appState.officeTheme === 'christmas';
  const socialProf = socialEngine.getAgentSocialProfile(agent, snap.agents || []);

  const drawerSig = JSON.stringify([
    agent.id,
    socialProf.personality.displayName,
    agent.room,
    agent.model,
    agent.state,
    agent.sleeping,
    agent.dreamLabel,
    agent.currentTool,
    agent.toolSummary,
    agent.toolStartedAt,
    agent.lastActivityAt,
    agent.lastUserInput,
    agent.inputTokens,
    agent.cacheTokens,
    agent.outputTokens,
    agent.toolCount,
    agent.recentTools?.length || 0,
    agent.recentTools?.[0]?.ts || 0,
    socialProf.coins,
    socialProf.wins,
    socialProf.losses,
    socialProf.ledger?.length || 0,
    socialProf.currentActivity || '',
    agent.subagentDetails?.length || 0,
    renderer.followAgentId === agent.id,
    isChristmas,
  ]);

  if (!resetCustomForm && drawerSig === appState.lastDrawerSig) {
    return;
  }
  appState.lastDrawerSig = drawerSig;

  drawAvatarPortrait(els.drawerPortrait, agent, isChristmas);
  els.drawerName.textContent = socialProf.personality.displayName;
  els.drawerRolePill.textContent = 'Agente principal';
  els.drawerSourceBadge.textContent = isGem ? 'Gemini Web' : 'Antigravity';
  els.drawerSourceBadge.className = `source-tag ${isGem ? 'is-gem' : ''}`;
  els.drawerModel.textContent = agent.model || (isGem ? 'Gemini Web' : '-');
  els.drawerRoom.textContent = agent.room || '-';
  els.drawerPrompt.textContent =
    agent.lastUserInput || agent.errorMessage || agent.title || 'Sem prompt registrado ainda.';

  els.drawerStateDot.style.background = getStateDotColor(agent);
  els.drawerStateText.textContent = getAgentStatusLabel(agent);
  els.drawerTimeText.dataset.relTs = String(agent.lastActivityAt || '');
  els.drawerTimeText.textContent = formatRelativeTime(agent.lastActivityAt);

  const isFollowing = renderer.followAgentId === agent.id;
  els.btnFollowAgent.setAttribute('aria-pressed', isFollowing ? 'true' : 'false');
  els.btnFollowAgent.classList.toggle('is-active', isFollowing);

  const canOpenLink = !appState.mcpApp || Boolean(appState.hostCaps?.openLinks);
  els.btnDrawerOpenUrl.hidden = !isGem || !agent.url || !canOpenLink;

  // Agora
  if (agent.state === 'dreaming') {
    els.drawerNowTool.textContent = `💭 ${agent.dreamLabel || 'Reconsolidando memórias e limpando logs antigos'}`;
    delete els.drawerNowAge.dataset.shellSince;
    els.drawerNowAge.textContent = '';
  } else if (agent.sleeping) {
    els.drawerNowTool.textContent = '😴 Cochilando (aguardando próximo comando)';
    delete els.drawerNowAge.dataset.shellSince;
    els.drawerNowAge.textContent = formatRelativeTime(agent.lastActivityAt);
  } else if (agent.currentTool) {
    els.drawerNowTool.textContent = `${agent.currentTool}${agent.toolSummary ? `: ${agent.toolSummary}` : ''}`;
    if (agent.toolStartedAt) {
      els.drawerNowAge.dataset.shellSince = String(agent.toolStartedAt);
      els.drawerNowAge.textContent = formatDurationMMSS(Date.now() - agent.toolStartedAt);
    } else {
      delete els.drawerNowAge.dataset.shellSince;
      els.drawerNowAge.textContent = '';
    }
  } else {
    els.drawerNowTool.textContent = socialProf.currentActivity || getAgentStatusLabel(agent);
    delete els.drawerNowAge.dataset.shellSince;
    els.drawerNowAge.textContent = '';
  }

  els.drawerTokensGrid.hidden = isGem;
  els.dlgTokIn.textContent = formatNumber(agent.inputTokens);
  els.dlgTokCache.textContent = formatNumber(agent.cacheTokens);
  els.dlgTokOut.textContent = formatNumber(agent.outputTokens);
  els.dlgToolCount.textContent = formatNumber(agent.toolCount);

  els.dlgToolsList.replaceChildren();
  for (const t of agent.recentTools || []) {
    const li = document.createElement('li');
    li.textContent = t.summary ? `${t.name} — ${t.summary}` : t.name;
    els.dlgToolsList.appendChild(li);
  }
  if (!agent.recentTools?.length) {
    const li = document.createElement('li');
    li.textContent = 'Nenhuma ferramenta recente registrada.';
    els.dlgToolsList.appendChild(li);
  }

  // Vida Social
  els.socialCoinsHeader.textContent = `🪙 ${socialProf.coins}`;
  els.socialCoinsBig.textContent = `${socialProf.coins} moedinhas`;
  const earnedWork = (socialProf.ledger || [])
    .filter((l) => l.delta > 0)
    .reduce((s, l) => s + l.delta, 0);
  els.socialCoinsSub.textContent = `+${earnedWork} ganhos no escritório`;
  els.socialRecord.textContent =
    socialProf.wins || socialProf.losses
      ? `${socialProf.wins}V · ${socialProf.losses}D`
      : 'Sem partidas ainda';

  if (socialProf.currentActivity) {
    els.socialActivityLine.hidden = false;
    els.socialActivityLine.textContent = `Agora: ${socialProf.currentActivity}`;
  } else {
    els.socialActivityLine.hidden = true;
  }

  els.socialTraitsList.replaceChildren();
  for (const tr of socialProf.personality.traits) {
    const chip = document.createElement('span');
    chip.className = 'trait-chip';
    chip.title = tr.desc;
    chip.style.borderColor = tr.color;
    chip.textContent = `${tr.icon} ${tr.label}`;
    els.socialTraitsList.appendChild(chip);
  }

  els.socialCatchphrase.textContent = `Bordão: "${socialProf.personality.catchphrase}"`;

  els.socialRelations.replaceChildren();
  if (socialProf.friends.length > 0) {
    const line = document.createElement('div');
    line.className = 'relation-line';
    const lbl = document.createElement('span');
    lbl.className = 'muted-micro';
    lbl.textContent = '🤝 Amigos';
    line.appendChild(lbl);
    for (const f of socialProf.friends) {
      const chip = document.createElement('span');
      chip.className = 'rel-chip';
      chip.textContent = f.name;
      line.appendChild(chip);
    }
    els.socialRelations.appendChild(line);
  }
  if (socialProf.rivals.length > 0) {
    const line = document.createElement('div');
    line.className = 'relation-line';
    const lbl = document.createElement('span');
    lbl.className = 'muted-micro';
    lbl.textContent = '⚔️ Rivalidades';
    line.appendChild(lbl);
    for (const r of socialProf.rivals) {
      const chip = document.createElement('span');
      chip.className = 'rel-chip';
      const sc = socialProf.rivalScores?.[r.name];
      chip.textContent = sc ? `${r.name} (${sc.wins}×${sc.losses})` : r.name;
      line.appendChild(chip);
    }
    els.socialRelations.appendChild(line);
  }

  els.socialLedgerList.replaceChildren();
  for (const entry of (socialProf.ledger || []).slice(0, 10)) {
    const li = document.createElement('li');
    const signSpan = document.createElement('span');
    signSpan.className = entry.delta >= 0 ? 'ledger-pos' : 'ledger-neg';
    signSpan.textContent = `${entry.delta >= 0 ? '+' : '−'}🪙${Math.abs(entry.delta)} `;
    const textSpan = document.createElement('span');
    textSpan.textContent = entry.reason || 'Movimentação';
    li.append(signSpan, textSpan);
    els.socialLedgerList.appendChild(li);
  }

  // Subagents
  const subs = agent.subagentDetails || [];
  els.drawerSubagentsSection.hidden = subs.length === 0;
  els.drawerSubagentsCount.textContent = String(subs.length);
  els.drawerSubagentsList.replaceChildren();
  for (const sub of subs) {
    const li = document.createElement('li');
    li.textContent = `${sub.name} · ${sub.role || 'Worker'}${sub.prompt ? ` — ${sub.prompt}` : ''}`;
    els.drawerSubagentsList.appendChild(li);
  }

  const canSendMessage =
    Boolean(appState.mcpApp) &&
    Boolean(appState.hostCaps?.message) &&
    !isGem &&
    !appState.demoMode;
  els.agentMessageForm.hidden = !canSendMessage;

  if (resetCustomForm) {
    els.agentMessageStatus.textContent = '';
    const ov = agent.customLook || {};
    els.avNickname.value = ov.nickname || '';
    els.avHairStyle.value = ov.hairStyle || '';
    els.avShirt.value = ov.shirt || '';
    els.avAccessory.value = ov.accessory || '';

    els.avRoom.replaceChildren();
    const autoOpt = document.createElement('option');
    autoOpt.value = '';
    autoOpt.textContent = 'Automático (por projeto)';
    els.avRoom.appendChild(autoOpt);
    for (const r of snap.rooms || []) {
      if (r.kind === 'github-hub') continue;
      const opt = document.createElement('option');
      opt.value = r.id;
      opt.textContent = r.name;
      els.avRoom.appendChild(opt);
    }
    els.avRoom.value = ov.roomId || '';
  }
}

function selectAgent(agentId, { centerCamera = true } = {}) {
  appState.selectedAgentId = agentId;
  renderer.setSelectedAgentId(agentId);
  if (centerCamera) renderer.centerOnAgent(agentId);
  els.rightDrawer.hidden = false;
  document.body.classList.add('drawer-open');
  populateRightDrawer(agentId, getEffectiveSnapshot(), true);
  renderLeftSidebar(getEffectiveSnapshot());
}

function closeRightDrawer() {
  appState.selectedAgentId = null;
  renderer.setSelectedAgentId(null);
  renderer.setFollowAgent(null);
  els.rightDrawer.hidden = true;
  document.body.classList.remove('drawer-open');
  if (appState.liveSnapshot || appState.demoMode) {
    renderLeftSidebar(getEffectiveSnapshot());
  }
}

function renderAttentionToast(snap) {
  const waitingAgent = (snap.agents || []).find((a) => {
    if (a.state !== 'waiting' && a.state !== 'error') return false;
    const key = `${a.id}:${a.toolStartedAt || a.lastActivityAt}`;
    return !appState.dismissedWaitingKeys.has(key);
  });

  if (!waitingAgent) {
    els.attentionToast.hidden = true;
    appState.currentToastAgentId = null;
    appState.currentToastKey = null;
    return;
  }

  const key = `${waitingAgent.id}:${waitingAgent.toolStartedAt || waitingAgent.lastActivityAt}`;
  appState.currentToastAgentId = waitingAgent.id;
  appState.currentToastKey = key;
  const name = getAgentDisplayName(waitingAgent);
  const action =
    waitingAgent.toolSummary ||
    (waitingAgent.state === 'error' ? waitingAgent.errorMessage || 'erro na execução' : 'aprovar uma permissão');
  els.attentionToastText.textContent = `${name} precisa de você em ${waitingAgent.room}: ${action}`;
  els.attentionToast.hidden = false;
}

function buildDailyMarkdownLocal(snap) {
  const { analytics, progression, projectsAndRepos, agents, prefs } = snap;
  const todayStr = new Date().toLocaleDateString('pt-BR');
  const w24 = analytics.window24h;
  const w5 = analytics.window5h;
  const lines = [
    `# Resumo do Dia — Pixel Office (${todayStr})`,
    `- **Nível:** Lv ${progression.level} (${formatNumber(progression.xp)} XP)`,
    `- **Tempo ativo hoje:** ~${analytics.productivity.activeMinutesToday} min`,
    `- **Tokens 5h / 24h:** ${formatNumber(w5.totalTokens)} / ${formatNumber(w24.totalTokens)} (Cache: ${analytics.cacheSavingsPct}% · ~\$${w24.estimatedUsd.toFixed(4)})`,
    `- **Gemini Web (24h):** ${analytics.geminiMsgs24h} turnos`,
    '',
    `## Sessões (${agents.length})`,
    ...agents.map((a) => `- **${getAgentDisplayName(a)}** (${a.title} · ${a.room} · ${a.source})`),
    '',
    `## GitHub & Projetos (${projectsAndRepos.length})`,
    ...projectsAndRepos.map((r) => `- **${r.name}** (${r.githubSlug || r.kind}${r.branch ? ` · ${r.branch}` : ''})`),
  ];
  if ((prefs.kanban || []).length > 0) {
    lines.push('', '## Kanban');
    for (const k of prefs.kanban) {
      lines.push(`- [${k.status === 'done' ? 'x' : ' '}] (${k.status}) ${k.title}`);
    }
  }
  return lines.join('\n');
}

function renderUsageTab(snap) {
  els.usageSummary.replaceChildren();
  const { analytics, prefs, alerts, progression } = snap;
  const budgets = prefs?.budgets || {};

  const makeBox = (title) => {
    const box = document.createElement('div');
    box.className = 'metric-box';
    const h3 = document.createElement('h3');
    h3.textContent = title;
    box.appendChild(h3);
    return box;
  };

  const budgetBox = makeBox('Limites & Metas Pessoais (Tokens / Turnos)');
  const r5Label = analytics.reset5hInMs > 0 ? ` · ${formatCountdownShort(analytics.reset5hInMs)}` : '';
  const r7Label = analytics.reset7dInMs > 0 ? ` · ${formatCountdownShort(analytics.reset7dInMs)}` : '';
  const rows = [
    [`Janela 5h${r5Label}`, analytics.window5h?.totalTokens || 0, budgets.tokens5h ?? 6000000],
    ['Hoje / 24h (tokens)', analytics.window24h?.totalTokens || 0, budgets.tokens24h ?? 15000000],
    [`Semanal 7d${r7Label}`, analytics.window7d?.totalTokens || 0, budgets.tokens7d ?? 80000000],
    ['Gemini Web (24h)', analytics.geminiMsgs24h || 0, budgets.geminiMsgs24h ?? 100],
  ];

  for (const [label, used, limit] of rows) {
    const unlimited = !limit || limit <= 0;
    const pct = unlimited ? 0 : Math.min(100, Math.round((used / limit) * 100));
    const row = document.createElement('div');
    row.className = 'budget-row';

    const head = document.createElement('div');
    head.className = 'budget-head';
    const lSpan = document.createElement('span');
    lSpan.textContent = label;
    const vSpan = document.createElement('span');
    vSpan.textContent = unlimited
      ? `${formatCompactTokens(used)} / Sem teto`
      : `${formatCompactTokens(used)} / ${formatCompactTokens(limit)} (${pct}%)`;
    head.append(lSpan, vSpan);

    const track = document.createElement('div');
    track.className = 'progress-track';
    const fill = document.createElement('div');
    fill.className = 'progress-fill';
    if (!unlimited) {
      if (pct >= 90) fill.classList.add('level-high');
      else if (pct >= 70) fill.classList.add('level-warn');
      fill.style.width = `${pct}%`;
    } else {
      fill.style.width = used > 0 ? '14%' : '0%';
    }
    track.appendChild(fill);

    row.append(head, track);
    budgetBox.appendChild(row);
  }

  const note = document.createElement('p');
  note.className = 'helper-note';
  note.textContent = `Economia de Cache (24h): ${analytics.cacheSavingsPct || 0}% · Estimativa 24h: ~\$${(analytics.window24h?.estimatedUsd || 0).toFixed(2)} USD`;
  budgetBox.appendChild(note);

  const modelBox = makeBox('Consumo por Modelo (24h / 7d)');
  const models = Array.isArray(analytics.byModel) ? analytics.byModel : [];
  if (models.length === 0) {
    const emptyModel = document.createElement('p');
    emptyModel.className = 'helper-note';
    emptyModel.textContent = 'Nenhum uso por modelo registrado nesta janela.';
    modelBox.appendChild(emptyModel);
  } else {
    const list = document.createElement('div');
    list.className = 'model-usage-list';
    const maxTok7d = Math.max(1, ...models.map((m) => m.totalTokens7d || m.totalTokens24h || 0));
    for (const m of models) {
      const mRow = document.createElement('div');
      mRow.className = 'model-row';

      const mHead = document.createElement('div');
      mHead.className = 'model-row-head';
      const mName = document.createElement('strong');
      mName.textContent = m.model || 'Desconhecido';
      const mStats = document.createElement('span');
      const usdTxt = m.estimatedUsd24h > 0 ? ` · ~\$${m.estimatedUsd24h.toFixed(2)}` : '';
      mStats.textContent = `${formatCompactTokens(m.totalTokens24h || 0)} 24h · ${formatCompactTokens(m.totalTokens7d || 0)} 7d${usdTxt}`;
      mHead.append(mName, mStats);

      const mTrack = document.createElement('div');
      mTrack.className = 'model-bar-track';
      const mFill = document.createElement('div');
      mFill.className = 'model-bar-fill';
      const wPct = Math.max(4, Math.round(((m.totalTokens7d || m.totalTokens24h || 0) / maxTok7d) * 100));
      mFill.style.width = `${wPct}%`;
      mTrack.appendChild(mFill);

      mRow.append(mHead, mTrack);
      list.appendChild(mRow);
    }
    modelBox.appendChild(list);
  }

  const prodBox = makeBox('Produtividade & XP');
  const grid = document.createElement('div');
  grid.className = 'metric-grid';
  const cats = analytics.productivity?.categoryCounts || {};
  const kvs = [
    ['Tempo Ativo Hoje', `~${analytics.productivity?.activeMinutesToday || 0} min`],
    ['Nível / XP', `Lv ${progression.level} (${formatNumber(progression.xp)} XP)`],
    ['Editando / Terminal', `${cats.coding || 0} / ${cats.terminal || 0}`],
    ['Lendo / Pensando', `${cats.reading || 0} / ${cats.thinking || 0}`],
  ];
  for (const [k, v] of kvs) {
    const kv = document.createElement('div');
    kv.className = 'metric-kv';
    const sp = document.createElement('span');
    sp.textContent = k;
    const st = document.createElement('strong');
    st.textContent = v;
    kv.append(sp, st);
    grid.appendChild(kv);
  }
  prodBox.appendChild(grid);

  const furnNote = document.createElement('p');
  furnNote.className = 'helper-note';
  furnNote.style.marginTop = '6px';
  furnNote.textContent = `Móveis desbloqueados: ${(progression.unlockedFurniture || []).join(', ')}`;
  prodBox.appendChild(furnNote);

  const alertsBox = makeBox(`Alertas Ativos (${alerts.length})`);
  if (alerts.length === 0) {
    const ok = document.createElement('p');
    ok.className = 'helper-note';
    ok.textContent = 'Nenhum alerta de consumo ou shell travado no momento.';
    alertsBox.appendChild(ok);
  } else {
    for (const al of alerts) {
      const p = document.createElement('p');
      p.className = 'helper-note';
      p.textContent = `• ${al.message}`;
      alertsBox.appendChild(p);
    }
  }

  const actionsRow = document.createElement('div');
  actionsRow.className = 'custom-actions';

  const btnReport = document.createElement('button');
  btnReport.type = 'button';
  btnReport.className = 'pill-btn pill-btn-accent';
  btnReport.textContent = 'Copiar Resumo do Dia (MD)';

  const reportMsg = document.createElement('span');
  reportMsg.className = 'helper-note';

  btnReport.addEventListener('click', async () => {
    let markdown = '';
    if (!appState.demoMode && !appState.mcpApp) {
      try {
        const res = await fetch(`${getBaseUrl()}/api/daily-report`);
        const data = await res.json();
        if (data?.markdown) markdown = data.markdown;
      } catch {
        // fallback
      }
    }
    if (!markdown) markdown = buildDailyMarkdownLocal(snap);
    try {
      await navigator.clipboard.writeText(markdown);
      reportMsg.textContent = 'Resumo copiado!';
    } catch {
      reportMsg.textContent = 'Falha ao acessar área de transferência.';
    }
  });

  const btnLimits = document.createElement('button');
  btnLimits.type = 'button';
  btnLimits.className = 'pill-btn';
  btnLimits.textContent = 'Editar Limites';
  btnLimits.addEventListener('click', () => {
    els.toolsDialog.close();
    openSettingsDialog();
  });

  actionsRow.append(btnReport, btnLimits, reportMsg);
  els.usageSummary.append(budgetBox, modelBox, prodBox, alertsBox, actionsRow);
}

function renderReposTab(snap) {
  const repos = snap.projectsAndRepos || [];
  els.tabCountRepos.textContent = String(repos.length);
  els.reposList.replaceChildren();

  if (repos.length === 0) {
    const li = document.createElement('li');
    li.className = 'muted-micro';
    li.textContent = 'Nenhum repositório ou projeto separado encontrado.';
    els.reposList.appendChild(li);
    return;
  }

  for (const repo of repos) {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'repo-card-btn';

    const top = document.createElement('div');
    top.className = 'sb-agent-top';

    const name = document.createElement('strong');
    name.textContent = repo.name;

    const tag = document.createElement('span');
    tag.className = `micro-badge ${repo.kind === 'github' ? 'micro-gem' : 'micro-ag'}`;
    tag.textContent =
      repo.kind === 'github'
        ? 'GitHub'
        : repo.kind === 'git-local'
          ? 'Git'
          : 'Projeto';

    top.append(name, tag);

    const meta = document.createElement('div');
    meta.className = 'muted-micro';
    meta.style.marginTop = '4px';
    meta.textContent = repo.githubSlug || `${repo.branch || 'local'}${repo.dirtyCount ? ` · ${repo.dirtyCount} mod.` : ''}`;

    btn.append(top, meta);
    btn.addEventListener('click', () => openRepoInspector(repo));
    li.appendChild(btn);
    els.reposList.appendChild(li);
  }
}

function renderKanbanTab(snap) {
  const items = snap.prefs?.kanban || [];
  const cols = [
    { key: 'todo', title: 'A Fazer' },
    { key: 'doing', title: 'Fazendo' },
    { key: 'done', title: 'Feito' },
  ];

  els.kanbanBoard.replaceChildren();
  for (const col of cols) {
    const box = document.createElement('div');
    box.className = 'kanban-col';
    const h4 = document.createElement('h4');
    const colItems = items.filter((i) => i.status === col.key);
    h4.textContent = `${col.title} (${colItems.length})`;
    box.appendChild(h4);

    const list = document.createElement('div');
    list.className = 'kanban-list';

    if (colItems.length === 0) {
      const emp = document.createElement('div');
      emp.className = 'muted-micro';
      emp.textContent = 'Vazio';
      list.appendChild(emp);
    } else {
      for (const item of colItems) {
        const card = document.createElement('div');
        card.className = 'kanban-card';

        const title = document.createElement('div');
        title.textContent = item.title;

        const foot = document.createElement('div');
        foot.className = 'kanban-foot';

        const roomSpan = document.createElement('span');
        roomSpan.className = 'muted-micro';
        roomSpan.textContent = item.room || 'Geral';

        const btns = document.createElement('div');
        btns.style.display = 'flex';
        btns.style.gap = '4px';

        const nextStatus = col.key === 'todo' ? 'doing' : col.key === 'doing' ? 'done' : 'todo';
        const btnMove = document.createElement('button');
        btnMove.type = 'button';
        btnMove.className = 'icon-btn-sm';
        btnMove.title = `Mover para ${nextStatus}`;
        btnMove.textContent = col.key === 'done' ? '↺' : '→';
        btnMove.addEventListener('click', () => {
          void callMutation(
            'manage_kanban',
            { action: 'move', id: item.id, status: nextStatus },
            '/api/kanban',
            { action: 'move', id: item.id, status: nextStatus }
          );
        });

        const btnDel = document.createElement('button');
        btnDel.type = 'button';
        btnDel.className = 'icon-btn-sm';
        btnDel.title = 'Excluir tarefa';
        btnDel.textContent = '×';
        btnDel.addEventListener('click', () => {
          void callMutation(
            'manage_kanban',
            { action: 'delete', id: item.id },
            '/api/kanban',
            { action: 'delete', id: item.id }
          );
        });

        btns.append(btnMove, btnDel);
        foot.append(roomSpan, btns);
        card.append(title, foot);
        list.appendChild(card);
      }
    }

    box.appendChild(list);
    els.kanbanBoard.appendChild(box);
  }
}

function renderReplayTab(snap) {
  const timeline = snap.timeline || [];
  els.replaySlider.max = String(Math.max(0, timeline.length - 1));
  if (!appState.replayActive) {
    appState.replayIndex = Math.max(0, timeline.length - 1);
    els.replaySlider.value = String(appState.replayIndex);
  }

  els.btnReplayLive.hidden = !appState.replayActive;
  els.btnReplayToggle.textContent = appState.replayPlaying ? 'Pausar' : 'Reproduzir';

  if (timeline.length === 0) {
    els.replayStatus.textContent = 'Ainda não há eventos registrados nas últimas 24h.';
  } else {
    const curr = timeline[Math.min(appState.replayIndex, timeline.length - 1)];
    els.replayStatus.textContent = appState.replayActive
      ? `Replay (${appState.replayIndex + 1}/${timeline.length}) · ${formatClock(curr.ts)} — ${curr.agentTitle}: ${curr.summary}`
      : `${timeline.length} eventos disponíveis nas últimas 24h.`;
  }

  els.replayBanner.hidden = !appState.replayActive;
  if (appState.replayActive && timeline.length > 0) {
    const curr = timeline[Math.min(appState.replayIndex, timeline.length - 1)];
    els.replayBannerText.textContent = `Replay (${appState.replayIndex + 1}/${timeline.length}) · ${formatClock(curr.ts)}`;
  }

  els.replayEventsList.replaceChildren();
  const visible = timeline.slice(Math.max(0, appState.replayIndex - 8), appState.replayIndex + 1).reverse();
  for (const ev of visible) {
    const li = document.createElement('li');
    li.className = 'replay-item';
    li.textContent = `${formatClock(ev.ts)} · ${ev.agentTitle || ev.room} (${ev.state}) — ${ev.summary || ev.toolName || ''}`;
    els.replayEventsList.appendChild(li);
  }
}

function renderAll() {
  const snap = getEffectiveSnapshot();
  const { stats, agents, alerts, rooms, prefs } = snap;

  if (alerts && alerts.length > 0 && prefs?.budgetAlertsEnabled !== false) {
    const alertText = alerts.map((a) => a.message).join('  |  ');
    if (appState.dismissedAlertSig === alertText) {
      els.alertBanner.hidden = true;
    } else {
      els.alertBanner.hidden = false;
      els.alertBannerText.textContent = alertText;
    }
  } else {
    appState.dismissedAlertSig = '';
    els.alertBanner.hidden = true;
  }

  els.emptyState.hidden = (rooms || []).length > 0 || (agents || []).length > 0;

  els.geminiConnStatus.textContent =
    (stats.geminiWebCount || 0) > 0
      ? `${stats.geminiWebCount} aba(s) do Gemini Web conectada(s) agora!`
      : 'Nenhuma aba do Gemini Web conectada ainda.';
  if (els.extPathCode) els.extPathCode.textContent = getExtensionPath();

  renderer.setSnapshot(snap);
  renderTopHud(snap);
  renderLeftSidebar(snap);
  renderFeed(snap);
  renderAttentionToast(snap);

  if (els.toolsDialog.open) {
    const toolsSig = JSON.stringify([
      snap.analytics?.window5h?.totalTokens,
      snap.analytics?.window7d?.totalTokens,
      snap.analytics?.geminiMsgs24h,
      (snap.analytics?.byModel || []).length,
      snap.alerts?.length,
      (snap.projectsAndRepos || []).map((r) => `${r.id}:${r.dirtyCount}:${r.branch}`),
      (snap.prefs?.kanban || []).map((k) => `${k.id}:${k.status}:${k.updatedAt}`),
      (snap.timeline || []).length,
      appState.replayActive,
      appState.replayPlaying,
      appState.replayIndex,
    ]);
    if (toolsSig !== appState.lastToolsSig) {
      appState.lastToolsSig = toolsSig;
      renderUsageTab(snap);
      renderReposTab(snap);
      renderKanbanTab(snap);
      renderReplayTab(snap);
    }
  }

  if (appState.selectedAgentId && !els.rightDrawer.hidden) {
    populateRightDrawer(appState.selectedAgentId, snap, false);
  }
}

function handleIncomingSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') return;
  if (!appState.demoMode && Array.isArray(snapshot.agents)) {
    for (const a of snapshot.agents) {
      const prev = appState.prevAgentStates.get(a.id);
      if (prev && prev !== a.state) {
        const who = getAgentDisplayName(a);
        if (a.state === 'waiting') {
          playBeep('waiting');
          fireDesktopNotification(
            `Atenção: ${who}`,
            `${a.room} está aguardando sua resposta/permissão.`,
            `wait-${a.id}`
          );
        } else if (a.state === 'done') {
          playBeep('done');
          fireDesktopNotification(
            `Concluído: ${who}`,
            `${a.room} finalizou a tarefa.`,
            `done-${a.id}`
          );
        } else if (a.state === 'dreaming') {
          playBeep('dream');
        }
      }
      appState.prevAgentStates.set(a.id, a.state);
    }

    for (const al of snapshot.alerts || []) {
      if (!appState.firedAlertIds.has(al.id)) {
        appState.firedAlertIds.add(al.id);
        fireDesktopNotification('Pixel Office · Alerta', al.message, al.id);
      }
    }
  }

  const serverTheme = snapshot.prefs?.officeTheme;
  if (serverTheme && serverTheme !== appState.lastServerTheme) {
    appState.lastServerTheme = serverTheme;
    applyOfficeTheme(serverTheme, false);
  }

  appState.liveSnapshot = snapshot;
  renderAll();
}

function applyOfficeTheme(theme, persist = true) {
  if (!THEME_ORDER.includes(theme)) return;
  appState.officeTheme = theme;
  safeStorageSet('pixel-office-theme-v3', theme);
  if (els.themePill) els.themePill.textContent = THEME_LABELS[theme] || theme;
  renderer.setTheme(theme);
  if (appState.liveSnapshot || appState.demoMode) {
    renderAll();
  }
  if (persist && !appState.demoMode) {
    appState.lastServerTheme = theme;
    void callMutation(
      'update_office_prefs',
      { officeTheme: theme },
      '/api/prefs',
      { officeTheme: theme }
    );
  }
}

function openToolsDialog(tabKey = 'usage') {
  const snap = getEffectiveSnapshot();
  renderUsageTab(snap);
  renderReposTab(snap);
  renderKanbanTab(snap);
  renderReplayTab(snap);
  if (appState.selectTabFn) {
    const tabBtn = document.querySelector(`[role="tab"][data-tab="${tabKey}"]`);
    if (tabBtn) appState.selectTabFn(tabBtn, false);
  }
  if (!els.toolsDialog.open) els.toolsDialog.showModal();
}

function openRoomDialog(existingRoom = null) {
  appState.editingRoom = existingRoom;
  if (existingRoom) {
    els.roomDialogTitle.textContent = `Personalizar Sala: ${existingRoom.name}`;
    els.roomNameInput.value = existingRoom.name || '';
    els.roomKindInput.value =
      existingRoom.kind === 'gemini-web' ? 'gemini' : existingRoom.kind || 'dev';
    els.roomColorInput.value = existingRoom.accentColor || '#38bdf8';
    els.btnRoomSave.textContent = 'Salvar Sala';
    els.btnRoomReset.hidden = Boolean(existingRoom.isCustom);
    els.btnRoomDelete.hidden = !existingRoom.isCustom;
  } else {
    els.roomDialogTitle.textContent = 'Construir Nova Sala';
    els.roomNameInput.value = '';
    els.roomKindInput.value = 'dev';
    els.roomColorInput.value = '#38bdf8';
    els.btnRoomSave.textContent = 'Construir Sala';
    els.btnRoomReset.hidden = true;
    els.btnRoomDelete.hidden = true;
  }
  if (!els.roomDialog.open) els.roomDialog.showModal();
}

function openSettingsDialog() {
  const prefs = getEffectiveSnapshot().prefs || {};
  const b = prefs.budgets || {};
  els.cfgTheme.value = prefs.officeTheme || appState.officeTheme || 'auto';
  els.cfgSocialEnabled.checked = prefs.socialEnabled !== false;
  if (els.cfgBudgetAlerts) els.cfgBudgetAlerts.checked = prefs.budgetAlertsEnabled !== false;
  els.cfgPetType.value = prefs.petType || 'cyberfox';
  els.cfgTok5h.value = String(b.tokens5h ?? 6000000);
  els.cfgTok24h.value = String(b.tokens24h ?? 15000000);
  els.cfgTok7d.value = String(b.tokens7d ?? 80000000);
  els.cfgGem24h.value = String(b.geminiMsgs24h ?? 100);
  els.cfgLongSec.value = String(b.longTaskWarnSec ?? 180);
  if (!els.settingsDialog.open) els.settingsDialog.showModal();
}

function openRepoInspector(repo) {
  const isGh = repo.kind === 'github';
  els.repoDialogBadge.textContent = isGh ? 'GitHub' : repo.kind === 'git-local' ? 'Git' : 'Projeto';
  els.repoDialogBadge.className = `platform-badge ${isGh ? 'badge-gem' : ''}`;
  els.repoDialogTitle.textContent = repo.name || 'Repositório';
  els.repoDlgKind.textContent = isGh
    ? 'GitHub conectado'
    : repo.kind === 'git-local'
      ? 'Repositório Git local'
      : 'Projeto Antigravity';
  els.repoDlgBranch.textContent = repo.branch || '-';
  els.repoDlgDirty.textContent =
    repo.dirtyCount > 0 ? `${repo.dirtyCount} arquivo(s) pendente(s)` : 'Limpo';
  els.repoDlgSource.textContent = repo.sourceProjectName || '-';
  els.repoDlgPath.textContent = repo.path || '-';

  if (repo.lastCommitHash || repo.lastCommitMsg) {
    els.repoCommitBlock.hidden = false;
    els.repoDlgCommit.textContent = `${repo.lastCommitHash} — ${repo.lastCommitMsg}`;
  } else {
    els.repoCommitBlock.hidden = true;
  }

  appState.selectedRepoUrl = repo.githubUrl || '';
  els.repoGithubBlock.hidden = !repo.githubUrl;
  els.repoDlgSlug.textContent = repo.githubSlug || '';
  if (!els.repoDialog.open) els.repoDialog.showModal();
}

async function openExternalUrl(url) {
  if (!url) return;
  if (appState.mcpApp && appState.hostCaps?.openLinks) {
    try {
      await appState.mcpApp.openLink({ url });
      return;
    } catch {
      // Fallback
    }
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}

function triggerDreamConsolidation(agentId = null) {
  if (appState.demoMode) {
    const snap = getEffectiveSnapshot();
    const until = Date.now() + 16000;
    const targets = agentId
      ? (snap.agents || []).filter((a) => a.id === agentId)
      : (snap.agents || []).filter((a) => !['thinking', 'coding', 'waiting'].includes(a.state));
    const list = targets.length > 0 ? targets : (snap.agents || []).slice(0, 2);
    for (const a of list) appState.demoDreamMap.set(a.id, until);
    playBeep('dream');
    appState.socialFeedItems.unshift({
      ts: Date.now(),
      source: 'antigravity',
      agentId: list[0]?.id,
      label: 'Memória',
      state: 'dreaming',
      message: '💭 Reconsolidando memórias e limpando caches antigos…',
    });
    renderAll();
    return;
  }

  playBeep('dream');
  const args = agentId ? { agentId } : {};
  void callMutation('consolidate_office_memory', args, '/api/consolidate', args);
}

function setupAccessibleTabs() {
  const tablist = document.querySelector('[role="tablist"]');
  const tabs = Array.from(document.querySelectorAll('[role="tab"]'));
  const panels = Array.from(document.querySelectorAll('[role="tabpanel"]'));

  const selectTab = (targetTab, moveFocus = false) => {
    const key = targetTab.dataset.tab;
    for (const tab of tabs) {
      const active = tab === targetTab;
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
      tab.toggleAttribute('focusgroupstart', active);
    }
    for (const panel of panels) {
      const match = panel.id === `panel-${key}`;
      panel.hidden = match ? false : 'until-found';
      panel.tabIndex = match ? 0 : -1;
    }
    targetTab.scrollIntoView({ block: 'nearest', inline: 'nearest', container: 'nearest' });
    if (moveFocus) targetTab.focus();
  };

  appState.selectTabFn = selectTab;

  for (const tab of tabs) {
    tab.addEventListener('click', () => selectTab(tab, false));
  }

  for (const panel of panels) {
    panel.addEventListener('beforematch', () => {
      const id = panel.getAttribute('aria-labelledby');
      const ownerTab = tabs.find((t) => t.id === id);
      if (ownerTab) selectTab(ownerTab, false);
    });
  }

  if (tablist && !Object.hasOwn(HTMLElement.prototype, 'focusGroup')) {
    tablist.addEventListener('keydown', (e) => {
      const idx = tabs.indexOf(document.activeElement);
      if (idx === -1) return;
      let nextIdx = -1;
      if (e.key === 'ArrowRight') nextIdx = (idx + 1) % tabs.length;
      else if (e.key === 'ArrowLeft') nextIdx = (idx - 1 + tabs.length) % tabs.length;
      else if (e.key === 'Home') nextIdx = 0;
      else if (e.key === 'End') nextIdx = tabs.length - 1;
      if (nextIdx >= 0) {
        e.preventDefault();
        selectTab(tabs[nextIdx], true);
      }
    });
  }
}

function setupModalFallbacks() {
  const dialogs = [
    els.toolsDialog,
    els.roomDialog,
    els.settingsDialog,
    els.repoDialog,
    els.geminiHelpDialog,
    els.helpDialog,
    els.cmdDialog,
  ].filter(Boolean);
  for (const dialog of dialogs) {
    dialog.addEventListener('close', () => {
      dialog.returnValue = '';
      if (dialog === els.roomDialog) appState.editingRoom = null;
    });
  }

  if (!('closedBy' in HTMLDialogElement.prototype)) {
    const outside = (e, dialog) => {
      const r = dialog.getBoundingClientRect();
      return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
    };
    for (const dialog of document.querySelectorAll('dialog[closedby="any"]')) {
      let pressedOutside = false;
      dialog.addEventListener('pointerdown', (e) => {
        pressedOutside = outside(e, dialog);
      });
      dialog.addEventListener('pointerup', (e) => {
        if (pressedOutside && outside(e, dialog)) dialog.close();
      });
    }
  }
}

function setupControls() {
  const topHud = document.querySelector('.top-hud');
  const syncHudBottom = () => {
    if (!topHud) return;
    const rect = topHud.getBoundingClientRect();
    document.documentElement.style.setProperty(
      '--hud-bottom',
      `${Math.ceil(rect.bottom + 8)}px`
    );
  };
  syncHudBottom();
  if (topHud && typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(syncHudBottom).observe(topHud);
  }

  const savedTheme = safeStorageGet('pixel-office-theme-v3', 'auto');
  applyOfficeTheme(savedTheme, false);

  if (window.innerWidth < 880) {
    document.body.classList.add('sidebar-collapsed');
    els.btnToggleSidebar.setAttribute('aria-expanded', 'false');
  }

  const toggleSidebar = () => {
    const collapsed = document.body.classList.toggle('sidebar-collapsed');
    els.btnToggleSidebar.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
  };
  els.btnToggleSidebar.addEventListener('click', toggleSidebar);

  const toggleFeed = () => {
    const collapsed = els.bottomFeed.classList.toggle('is-collapsed');
    els.btnToggleFeed.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
    els.btnToggleFeed.textContent = collapsed ? '⌃' : '⌄';
  };
  els.btnToggleFeed.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleFeed();
  });
  els.feedHeaderBar.addEventListener('click', toggleFeed);

  els.themePill.addEventListener('click', () => {
    const idx = THEME_ORDER.indexOf(appState.officeTheme);
    const next = THEME_ORDER[(idx + 1) % THEME_ORDER.length];
    applyOfficeTheme(next, true);
  });

  document.querySelectorAll('[data-filter]').forEach((btn) => {
    btn.addEventListener('click', () => {
      appState.filter = btn.dataset.filter || 'all';
      document.querySelectorAll('[data-filter]').forEach((b) => {
        b.classList.toggle('is-active', b === btn);
      });
      renderer.setFilter(appState.filter);
      renderAll();
    });
  });

  els.searchInput.addEventListener('input', () => {
    appState.searchQuery = els.searchInput.value;
    renderLeftSidebar(getEffectiveSnapshot());
  });

  els.btnFit.addEventListener('click', () => renderer.fitToView());
  els.btnZoomOut.addEventListener('click', () => renderer.setZoom(appState.zoom - 0.15));
  els.btnZoomIn.addEventListener('click', () => renderer.setZoom(appState.zoom + 0.15));

  els.btnAddRoom.addEventListener('click', () => openRoomDialog(null));
  els.btnDream.addEventListener('click', () => triggerDreamConsolidation(null));
  els.btnTools.addEventListener('click', () => openToolsDialog('usage'));
  els.meterAgBtn.addEventListener('click', () => openToolsDialog('usage'));
  els.meterGemBtn.addEventListener('click', () => openToolsDialog('usage'));
  els.btnOpenRepos.addEventListener('click', () => openToolsDialog('repos'));
  els.btnSettings.addEventListener('click', openSettingsDialog);
  els.btnHelp.addEventListener('click', () => {
    if (!els.helpDialog.open) els.helpDialog.showModal();
  });

  els.btnDismissAlert?.addEventListener('click', () => {
    appState.dismissedAlertSig = els.alertBannerText?.textContent || '';
    if (els.alertBanner) els.alertBanner.hidden = true;
  });

  els.btnCloseDrawer.addEventListener('click', closeRightDrawer);
  els.btnCenterAgent.addEventListener('click', () => {
    if (appState.selectedAgentId) renderer.centerOnAgent(appState.selectedAgentId);
  });
  els.btnFollowAgent.addEventListener('click', () => {
    if (!appState.selectedAgentId) return;
    const next = renderer.followAgentId === appState.selectedAgentId ? null : appState.selectedAgentId;
    renderer.setFollowAgent(next);
    els.btnFollowAgent.setAttribute('aria-pressed', next ? 'true' : 'false');
    els.btnFollowAgent.classList.toggle('is-active', Boolean(next));
  });
  els.btnDreamAgent.addEventListener('click', () => {
    if (appState.selectedAgentId) triggerDreamConsolidation(appState.selectedAgentId);
  });
  els.btnDrawerOpenUrl.addEventListener('click', () => {
    const a = (getEffectiveSnapshot().agents || []).find((x) => x.id === appState.selectedAgentId);
    if (a?.url) void openExternalUrl(a.url);
  });

  const openMiniPet = async () => {
    if (appState.mcpApp) {
      await openExternalUrl(`${appState.liveSnapshot?.bridgeUrl || BRIDGE_URL}/?minipet=1`);
      return;
    }
    await openMiniPetWindow({
      getState: () => getEffectiveSnapshot(),
      onFocusMain: () => renderAll(),
    });
  };

  const toggleNotifications = async () => {
    if (typeof Notification === 'undefined') {
      els.btnNotif.textContent = 'Notif: N/D';
      return;
    }
    if (!appState.notifEnabled) {
      let perm = Notification.permission;
      if (perm === 'default') perm = await Notification.requestPermission();
      if (perm === 'granted') {
        appState.notifEnabled = true;
        els.btnNotif.setAttribute('aria-pressed', 'true');
        els.btnNotif.textContent = 'Notificações Windows: On';
        fireDesktopNotification('Pixel Office', 'Notificações ativadas!', 'notif-on');
      } else {
        els.btnNotif.textContent = 'Notificações Windows: Bloqueadas';
      }
    } else {
      appState.notifEnabled = false;
      els.btnNotif.setAttribute('aria-pressed', 'false');
      els.btnNotif.textContent = 'Notificações Windows: Off';
    }
  };
  els.btnNotif.addEventListener('click', () => void toggleNotifications());

  const toggleSound = () => {
    appState.soundEnabled = !appState.soundEnabled;
    els.btnSound.setAttribute('aria-pressed', appState.soundEnabled ? 'true' : 'false');
    els.btnSound.textContent = appState.soundEnabled ? 'Sons 8-bit: On' : 'Sons 8-bit: Off';
    if (appState.soundEnabled) playBeep('done');
  };
  els.btnSound.addEventListener('click', toggleSound);

  const toggleDemo = () => {
    appState.demoMode = !appState.demoMode;
    els.btnDemo.setAttribute('aria-pressed', appState.demoMode ? 'true' : 'false');
    if (appState.demoMode) {
      renderer.hasFittedOnce = false;
      if (!appState.demoTimer) {
        appState.demoTimer = setInterval(() => {
          if (appState.demoMode) renderAll();
        }, 1000);
      }
    } else if (appState.demoTimer) {
      clearInterval(appState.demoTimer);
      appState.demoTimer = null;
      appState.demoDreamMap.clear();
    }
    renderAll();
  };
  els.btnDemo.addEventListener('click', toggleDemo);
  els.btnEmptyDemo.addEventListener('click', () => {
    if (!appState.demoMode) toggleDemo();
  });

  els.btnClearOffline.addEventListener('click', async () => {
    if (appState.demoMode) return;
    await callMutation('clear_offline_agents', {}, '/api/clear-offline', {});
  });

  const openGeminiGuide = () => {
    if (els.extPathCode) els.extPathCode.textContent = getExtensionPath();
    els.copyExtFeedback.textContent = '';
    if (!els.geminiHelpDialog.open) els.geminiHelpDialog.showModal();
  };
  els.btnEmptyGemini.addEventListener('click', openGeminiGuide);

  els.btnCopyExtPath.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(getExtensionPath());
      els.copyExtFeedback.textContent = 'Caminho copiado!';
    } catch {
      els.copyExtFeedback.textContent = 'Copie manualmente o caminho acima.';
    }
  });

  const buildCommandItems = () => {
    const snap = getEffectiveSnapshot();
    const items = [
      { id: 'room-new', title: '+ Construir / editar sala no campus', sub: 'Expandir escritório com nova sala', shortcut: '', run: () => openRoomDialog(null) },
      { id: 'tab-usage', title: 'Consumo, Modelos (5h / 7d) & Cache', sub: 'Abrir analytics detalhados por modelo', shortcut: '', run: () => openToolsDialog('usage') },
      { id: 'tab-repos', title: 'Repositórios GitHub & Projetos', sub: 'Status Git, branch e arquivos pendentes', shortcut: '', run: () => openToolsDialog('repos') },
      { id: 'tab-kanban', title: 'Quadro Kanban do escritório', sub: 'Tarefas A fazer / Fazendo / Concluído', shortcut: '', run: () => openToolsDialog('kanban') },
      { id: 'tab-replay', title: 'Replay Temporal (24h)', sub: 'Reproduzir atividade das últimas 24 horas', shortcut: '', run: () => openToolsDialog('replay') },
      { id: 'dream-now', title: 'Reconsolidar memórias agora (Sonhando)', sub: 'Compactar contexto e arquivar obsoletos', shortcut: '', run: () => triggerDreamConsolidation(null) },
      { id: 'settings', title: 'Configurações, Limites reais & Mascote', sub: 'Presets de orçamento, alertas e tema', shortcut: '', run: openSettingsDialog },
      { id: 'minipet', title: 'Abrir Mini-Pet flutuante', sub: 'Janela compacta Always-on-Top / PiP', shortcut: '', run: () => void openMiniPet() },
      { id: 'gemini-ext', title: 'Conectar extensão Gemini Web', sub: 'Monitorar abas e turnos do Gemini', shortcut: '', run: openGeminiGuide },
      { id: 'toggle-demo', title: appState.demoMode ? 'Desativar Simulação / Demo v4' : 'Ativar Simulação / Demo v4', sub: 'Alternar entre escritório real e simulação', shortcut: '', run: toggleDemo },
      { id: 'cycle-theme', title: `Ciclar tema visual (${appState.officeTheme})`, sub: 'Auto / Dia / Noite / Natal', shortcut: '', run: () => els.themePill?.click() },
      { id: 'toggle-sound', title: appState.soundEnabled ? 'Desativar Sons 8-bit' : 'Ativar Sons 8-bit', sub: 'Audio feedback discreto', shortcut: '', run: toggleSound },
      { id: 'toggle-notif', title: appState.notifEnabled ? 'Desativar Notificações Windows' : 'Ativar Notificações Windows', sub: 'Alertar quando um agente pedir você', shortcut: '', run: () => void toggleNotifications() },
      { id: 'fit-view', title: 'Enquadrar campus inteiro', sub: 'Centralizar mapa e ajustar zoom', shortcut: '0', run: () => renderer.fitToView() },
      { id: 'toggle-sidebar', title: 'Alternar barra lateral do Escritório', sub: 'Mostrar ou recolher lista de agentes', shortcut: '[', run: toggleSidebar },
      { id: 'toggle-feed', title: 'Alternar Feed de Atividade', sub: 'Expandir ou recolher log ao vivo', shortcut: 'O', run: toggleFeed },
      { id: 'refresh-now', title: 'Forçar atualização agora', sub: 'Sincronizar estado com o servidor local', shortcut: 'R', run: () => void appState.forceRefreshFn?.() },
    ];
    if (appState.hostCaps?.openLinks) {
      items.push({
        id: 'open-browser',
        title: 'Abrir Pixel Office em tela cheia no navegador',
        sub: appState.liveSnapshot?.bridgeUrl || BRIDGE_URL,
        shortcut: '',
        run: () => void openExternalUrl(appState.liveSnapshot?.bridgeUrl || BRIDGE_URL),
      });
    }
    if (!appState.demoMode) {
      items.push({
        id: 'clear-offline',
        title: 'Limpar avatares offline e concluídos',
        sub: 'Remover sessões antigas do painel',
        shortcut: '',
        run: () => void callMutation('clear_offline_agents', {}, '/api/clear-offline', {}),
      });
    }
    for (const a of (snap.agents || []).slice(0, 16)) {
      items.push({
        id: `agent-${a.id}`,
        title: `Focar avatar: ${getAgentDisplayName(a)}`,
        sub: `${a.room || 'Escritório'} · ${getAgentStatusLabel(a)}`,
        shortcut: '',
        run: () => selectAgent(a.id, { centerCamera: true }),
      });
    }
    return items;
  };

  const renderCommandPalette = () => {
    if (!els.cmdList) return;
    const q = (els.cmdInput?.value || '').trim().toLowerCase();
    const all = buildCommandItems();
    const filtered = q
      ? all.filter((it) => `${it.title} ${it.sub}`.toLowerCase().includes(q))
      : all;
    appState.cmdItems = filtered;
    appState.cmdIndex = filtered.length > 0 ? Math.max(0, Math.min(appState.cmdIndex, filtered.length - 1)) : 0;

    els.cmdList.replaceChildren();
    if (filtered.length === 0) {
      const emptyLi = document.createElement('li');
      emptyLi.className = 'muted-micro';
      emptyLi.style.padding = '12px';
      emptyLi.textContent = 'Nenhum comando correspondente encontrado.';
      els.cmdList.appendChild(emptyLi);
      return;
    }
    filtered.forEach((item, idx) => {
      const li = document.createElement('li');
      li.className = `cmd-item${idx === appState.cmdIndex ? ' is-active' : ''}`;
      li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', idx === appState.cmdIndex ? 'true' : 'false');
      li.dataset.cmdIdx = String(idx);

      const main = document.createElement('div');
      main.className = 'cmd-item-main';
      const title = document.createElement('span');
      title.className = 'cmd-item-title';
      title.textContent = item.title;
      const sub = document.createElement('span');
      sub.className = 'cmd-item-sub';
      sub.textContent = item.sub;
      main.append(title, sub);
      li.appendChild(main);

      if (item.shortcut) {
        const kbd = document.createElement('kbd');
        kbd.textContent = item.shortcut;
        li.appendChild(kbd);
      }
      els.cmdList.appendChild(li);
    });
    const activeEl = els.cmdList.querySelector('.cmd-item.is-active');
    activeEl?.scrollIntoView({ block: 'nearest' });
  };

  const executeCommandAt = (idx) => {
    const item = appState.cmdItems[idx];
    if (!item) return;
    appState.lastCmdCloseAt = Date.now();
    els.cmdDialog?.close();
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    setTimeout(() => item.run?.(), 0);
  };

  const openCommandPalette = () => {
    if (!els.cmdDialog) return;
    if (Date.now() - appState.lastCmdCloseAt < 180) return;
    if (els.cmdDialog.open) {
      els.cmdDialog.close();
      return;
    }
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    if (els.cmdInput) els.cmdInput.value = '';
    appState.cmdIndex = 0;
    renderCommandPalette();
    els.cmdDialog.showModal();
    requestAnimationFrame(() => els.cmdInput?.focus());
  };

  els.btnCmdPalette?.addEventListener('click', openCommandPalette);
  els.cmdInput?.addEventListener('input', () => {
    appState.cmdIndex = 0;
    renderCommandPalette();
  });
  els.cmdInput?.addEventListener('keydown', (e) => {
    const total = appState.cmdItems.length;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (total > 0) {
        appState.cmdIndex = (appState.cmdIndex + 1) % total;
        renderCommandPalette();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (total > 0) {
        appState.cmdIndex = (appState.cmdIndex - 1 + total) % total;
        renderCommandPalette();
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      executeCommandAt(appState.cmdIndex);
    }
  });
  els.cmdList?.addEventListener('click', (e) => {
    const li = e.target.closest('.cmd-item[data-cmd-idx]');
    if (!li) return;
    executeCommandAt(Number(li.dataset.cmdIdx));
  });
  els.btnOpenGithub.addEventListener('click', () => {
    if (appState.selectedRepoUrl) void openExternalUrl(appState.selectedRepoUrl);
  });

  els.btnToastRespond.addEventListener('click', () => {
    if (appState.currentToastAgentId) {
      selectAgent(appState.currentToastAgentId, { centerCamera: true });
    }
  });
  els.btnToastDismiss.addEventListener('click', () => {
    if (appState.currentToastKey) {
      appState.dismissedWaitingKeys.add(appState.currentToastKey);
      els.attentionToast.hidden = true;
    }
  });

  // Repos refresh & add extra folder
  els.btnRefreshRepos.addEventListener('click', () => {
    void callMutation('refresh_repos', {}, '/api/repos/refresh', {});
  });

  els.addRepoForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const folder = els.inputRepoPath.value.trim();
    if (!folder) return;
    await callMutation(
      'update_office_prefs',
      { addRepoPath: folder },
      '/api/prefs',
      { addRepoPath: folder }
    );
    els.inputRepoPath.value = '';
  });

  // Kanban add
  els.kanbanAddForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = els.kanbanTitleInput.value.trim();
    const room = els.kanbanRoomInput.value.trim() || 'Geral';
    if (!title) return;
    await callMutation(
      'manage_kanban',
      { action: 'create', title, room, status: 'todo' },
      '/api/kanban',
      { action: 'create', title, room, status: 'todo' }
    );
    els.kanbanTitleInput.value = '';
  });

  // Replay controls
  const stopReplayTimer = () => {
    if (appState.replayTimer) {
      clearInterval(appState.replayTimer);
      appState.replayTimer = null;
    }
    appState.replayPlaying = false;
  };

  const exitReplay = () => {
    stopReplayTimer();
    appState.replayActive = false;
    renderAll();
  };

  els.btnReplayToggle.addEventListener('click', () => {
    const timeline = getEffectiveSnapshot().timeline || [];
    if (timeline.length === 0) return;
    if (appState.replayPlaying) {
      stopReplayTimer();
      renderAll();
      return;
    }
    if (!appState.replayActive || appState.replayIndex >= timeline.length - 1) {
      appState.replayActive = true;
      appState.replayIndex = 0;
    }
    appState.replayPlaying = true;
    const speed = Number(els.replaySpeed.value || 1);
    const intervalMs = Math.max(180, Math.round(900 / speed));
    appState.replayTimer = setInterval(() => {
      const len = (appState.demoMode ? createDemoSnapshot(1).timeline : appState.liveSnapshot?.timeline || []).length;
      if (appState.replayIndex >= len - 1) {
        stopReplayTimer();
      } else {
        appState.replayIndex += 1;
        els.replaySlider.value = String(appState.replayIndex);
      }
      renderAll();
    }, intervalMs);
    renderAll();
  });

  els.btnReplayLive.addEventListener('click', exitReplay);
  els.btnBannerReplayLive.addEventListener('click', exitReplay);

  els.replaySlider.addEventListener('input', () => {
    stopReplayTimer();
    appState.replayActive = true;
    appState.replayIndex = Number(els.replaySlider.value || 0);
    renderAll();
  });

  // Avatar customization form
  els.avatarCustomForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!appState.selectedAgentId) return;
    const ov = {
      nickname: els.avNickname.value.trim(),
      hairStyle: els.avHairStyle.value,
      shirt: els.avShirt.value,
      accessory: els.avAccessory.value,
      roomId: els.avRoom.value,
    };
    await callMutation(
      'update_office_prefs',
      { avatarOverrides: { [appState.selectedAgentId]: ov } },
      '/api/prefs',
      { avatarOverrides: { [appState.selectedAgentId]: ov } }
    );
  });

  els.btnAvReset.addEventListener('click', async () => {
    if (!appState.selectedAgentId) return;
    await callMutation(
      'update_office_prefs',
      { avatarOverrides: { [appState.selectedAgentId]: null } },
      '/api/prefs',
      { avatarOverrides: { [appState.selectedAgentId]: null } }
    );
    els.avNickname.value = '';
    els.avHairStyle.value = '';
    els.avShirt.value = '';
    els.avAccessory.value = '';
    els.avRoom.value = '';
  });

  // Room form
  els.roomForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = els.roomNameInput.value.trim();
    const kind = els.roomKindInput.value;
    const accentColor = els.roomColorInput.value;
    if (!name) return;

    if (appState.editingRoom) {
      await callMutation(
        'manage_office_room',
        { action: 'rename', id: appState.editingRoom.id, name, kind, accentColor },
        '/api/rooms',
        { action: 'rename', id: appState.editingRoom.id, name, kind, accentColor }
      );
    } else {
      await callMutation(
        'manage_office_room',
        { action: 'create', name, kind, accentColor },
        '/api/rooms',
        { action: 'create', name, kind, accentColor }
      );
    }
    els.roomDialog.close();
  });

  els.btnRoomReset.addEventListener('click', async () => {
    if (!appState.editingRoom) return;
    await callMutation(
      'manage_office_room',
      { action: 'reset', id: appState.editingRoom.id },
      '/api/rooms',
      { action: 'reset', id: appState.editingRoom.id }
    );
    els.roomDialog.close();
  });

  els.btnRoomDelete.addEventListener('click', async () => {
    if (!appState.editingRoom?.isCustom) return;
    await callMutation(
      'manage_office_room',
      { action: 'delete', id: appState.editingRoom.id },
      '/api/rooms',
      { action: 'delete', id: appState.editingRoom.id }
    );
    els.roomDialog.close();
  });

  const BUDGET_PRESETS = {
    real: { tok5h: 6000000, tok24h: 15000000, tok7d: 80000000, gem24h: 100 },
    pro: { tok5h: 5000000, tok24h: 12000000, tok7d: 60000000, gem24h: 100 },
    ultra: { tok5h: 15000000, tok24h: 40000000, tok7d: 200000000, gem24h: 250 },
    free: { tok5h: 0, tok24h: 0, tok7d: 0, gem24h: 0 },
  };
  document.querySelectorAll('[data-budget-preset]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const preset = BUDGET_PRESETS[btn.dataset.budgetPreset];
      if (!preset) return;
      els.cfgTok5h.value = String(preset.tok5h);
      els.cfgTok24h.value = String(preset.tok24h);
      els.cfgTok7d.value = String(preset.tok7d);
      els.cfgGem24h.value = String(preset.gem24h);
    });
  });

  // Settings form
  els.settingsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const selectedTheme = els.cfgTheme.value || 'auto';
    applyOfficeTheme(selectedTheme, false);
    const parseNonNeg = (val, fallback) => {
      const n = Number(val);
      return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
    };
    appState.dismissedAlertSig = '';
    const patch = {
      officeTheme: selectedTheme,
      socialEnabled: Boolean(els.cfgSocialEnabled.checked),
      budgetAlertsEnabled: Boolean(els.cfgBudgetAlerts ? els.cfgBudgetAlerts.checked : true),
      petType: els.cfgPetType.value,
      budgets: {
        tokens5h: parseNonNeg(els.cfgTok5h.value, 6000000),
        tokens24h: parseNonNeg(els.cfgTok24h.value, 15000000),
        tokens7d: parseNonNeg(els.cfgTok7d.value, 80000000),
        geminiMsgs24h: parseNonNeg(els.cfgGem24h.value, 100),
        longTaskWarnSec: Math.max(15, parseNonNeg(els.cfgLongSec.value, 180)),
      },
    };
    await callMutation('update_office_prefs', patch, '/api/prefs', patch);
    els.settingsDialog.close();
  });

  // Direct message in Antigravity MCP App
  els.agentMessageForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = els.agentMessageInput.value.trim();
    if (!msg || !appState.mcpApp) return;
    els.agentMessageStatus.textContent = 'Enviando mensagem…';
    try {
      await appState.mcpApp.sendMessage({
        role: 'user',
        content: [{ type: 'text', text: msg }],
      });
      els.agentMessageInput.value = '';
      els.agentMessageStatus.textContent = 'Mensagem enviada para a conversa!';
    } catch (err) {
      els.agentMessageStatus.textContent = `Não foi possível enviar: ${err.message}`;
    }
  });

  // Canvas hover & click hit-testing
  els.canvas.addEventListener('mousemove', (e) => {
    const rect = els.canvas.getBoundingClientRect();
    const hit = renderer.getHitAt(e.clientX - rect.left, e.clientY - rect.top);
    if (!hit) {
      els.tooltip.hidden = true;
      return;
    }

    if (hit.type === 'agent') {
      const a = hit.agent;
      const who = getAgentDisplayName(a);
      const stateLabel = getAgentStatusLabel(a);
      els.tooltip.textContent = `${who}\n${a.room} · ${stateLabel}${a.currentTool ? ` (${a.currentTool})` : ''}`;
    } else if (hit.type === 'repo') {
      const r = hit.repo;
      els.tooltip.textContent = `${r.name}\n${r.githubSlug || r.branch || 'Projeto'} · Clique para detalhes`;
    } else if (hit.type === 'room') {
      els.tooltip.textContent = `Sala: ${hit.room.name}\nClique para personalizar`;
    } else if (hit.type === 'pet') {
      els.tooltip.textContent = `Mascote (${hit.petType})\nClique para configurar`;
    }

    els.tooltip.hidden = false;
    const vpRect = els.viewport.getBoundingClientRect();
    const left = Math.min(vpRect.width - 250, Math.max(8, e.clientX - vpRect.left + 14));
    const top = Math.min(vpRect.height - 60, Math.max(8, e.clientY - vpRect.top + 14));
    els.tooltip.style.left = `${left}px`;
    els.tooltip.style.top = `${top}px`;
  });

  els.canvas.addEventListener('mouseleave', () => {
    els.tooltip.hidden = true;
  });

  els.canvas.addEventListener('click', (e) => {
    if (renderer.suppressNextClick) return;
    const rect = els.canvas.getBoundingClientRect();
    const hit = renderer.getHitAt(e.clientX - rect.left, e.clientY - rect.top);
    if (!hit) return;
    if (hit.type === 'agent') {
      selectAgent(hit.agent.id, { centerCamera: false });
    } else if (hit.type === 'repo') {
      openRepoInspector(hit.repo);
    } else if (hit.type === 'room' && hit.room.kind !== 'github-hub') {
      openRoomDialog(hit.room);
    } else if (hit.type === 'pet') {
      renderer.triggerPetHappy();
      openSettingsDialog();
    }
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      openCommandPalette();
      return;
    }
    const tag = document.activeElement?.tagName;
    const isTyping = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

    if (e.key === 'Escape') {
      if (!document.querySelector('dialog[open]') && !els.rightDrawer.hidden) {
        closeRightDrawer();
      }
      return;
    }
    if (isTyping || e.ctrlKey || e.metaKey || e.altKey) return;

    if (e.key === '/') {
      e.preventDefault();
      if (document.body.classList.contains('sidebar-collapsed')) toggleSidebar();
      els.searchInput.focus();
      els.searchInput.select();
    } else if (e.key === '[' || e.key === ']') {
      e.preventDefault();
      toggleSidebar();
    } else if (e.key.toLowerCase() === 'o') {
      e.preventDefault();
      toggleFeed();
    } else if (e.key === '0') {
      e.preventDefault();
      renderer.fitToView();
    } else if (e.key === '+' || e.key === '=') {
      e.preventDefault();
      renderer.setZoom(appState.zoom + 0.15);
    } else if (e.key === '-') {
      e.preventDefault();
      renderer.setZoom(appState.zoom - 0.15);
    } else if (e.key.toLowerCase() === 'r') {
      e.preventDefault();
      void appState.forceRefreshFn?.();
    } else if (e.key.toLowerCase() === 'f') {
      e.preventDefault();
      if (appState.selectedAgentId) {
        els.btnFollowAgent.click();
      } else {
        const firstActive = (getEffectiveSnapshot().agents || [])[0];
        if (firstActive) {
          selectAgent(firstActive.id, { centerCamera: true });
          renderer.setFollowAgent(firstActive.id);
        }
      }
    } else if (e.key === '?') {
      e.preventDefault();
      if (!els.helpDialog.open) els.helpDialog.showModal();
    }
  });
}

async function startStandaloneSse() {
  appState.mode = 'sse';
  const base = getBaseUrl();

  const fetchStateOnce = async () => {
    try {
      const res = await fetch(`${base}/api/state`, { cache: 'no-store' });
      if (res.ok) {
        appState.lastSseAt = Date.now();
        handleIncomingSnapshot(await res.json());
        setConnPill('Ao Vivo', 'status-live');
      }
    } catch {
      // will retry via SSE or fallback tick
    }
  };

  await fetchStateOnce();

  const connectSse = () => {
    if (appState.sseSource) {
      try {
        appState.sseSource.close();
      } catch {
        // ignore
      }
    }
    const es = new EventSource(`${base}/api/events`);
    appState.sseSource = es;

    es.onopen = () => {
      appState.mode = 'sse';
      appState.lastSseAt = Date.now();
      setConnPill('Ao Vivo', 'status-live');
    };

    es.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data);
        appState.lastSseAt = Date.now();
        setConnPill('Ao Vivo', 'status-live');
        handleIncomingSnapshot(data);
      } catch {
        // ignore parse error
      }
    };

    es.onerror = () => {
      appState.mode = 'reconnecting';
      setConnPill('Reconectando…', 'status-reconnecting');
    };
  };

  connectSse();

  appState.forceRefreshFn = async () => {
    await fetchStateOnce();
    if (!appState.sseSource || appState.sseSource.readyState === EventSource.CLOSED) {
      connectSse();
    }
  };

  if (appState.pollTimer) clearInterval(appState.pollTimer);
  appState.pollTimer = setInterval(() => {
    if (document.hidden || appState.demoMode || appState.replayActive) return;
    if (Date.now() - appState.lastSseAt > 5000) {
      void fetchStateOnce();
    }
  }, 5000);
}

async function initTransport() {
  const isEmbedded = window.self !== window.top;
  if (!isEmbedded) {
    await startStandaloneSse();
    if (new URLSearchParams(window.location.search).get('minipet') === '1') {
      els.alertBanner.hidden = false;
      els.alertBannerText.textContent =
        'Clique no botão "Pet" na barra superior para destacar o Mini-Pet flutuante sempre no topo!';
    }
    return;
  }

  const app = new App({ name: 'Pixel Office', version: '4.0.0' }, {});

  app.ontoolinput = (params) => {
    const args = params?.arguments;
    if (args?.filter && ['all', 'antigravity', 'gemini-web'].includes(args.filter)) {
      appState.filter = args.filter;
      renderer.setFilter(args.filter);
      document.querySelectorAll('[data-filter]').forEach((b) => {
        b.classList.toggle('is-active', b.dataset.filter === args.filter);
      });
    }
    if (args?.theme && THEME_ORDER.includes(args.theme)) {
      applyOfficeTheme(args.theme, false);
    }
  };

  app.ontoolresult = (result) => {
    if (result?.structuredContent) handleIncomingSnapshot(result.structuredContent);
  };

  app.onhostcontextchanged = (ctx) => {
    if (ctx?.theme) applyDocumentTheme(ctx.theme);
    if (ctx?.styles?.variables) applyHostStyleVariables(ctx.styles.variables);
  };

  try {
    await Promise.race([
      app.connect(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('MCP connect timeout')), 2500)),
    ]);
  } catch {
    await startStandaloneSse();
    return;
  }

  appState.mcpApp = app;
  appState.mode = 'mcp';
  appState.hostCaps = app.getHostCapabilities() || {};
  const ctx = app.getHostContext();
  if (ctx?.theme) applyDocumentTheme(ctx.theme);
  if (ctx?.styles?.variables) applyHostStyleVariables(ctx.styles.variables);

  setConnPill('Ao Vivo', 'status-live');

  const pollOnce = async (force = false) => {
    if (!force && (document.hidden || appState.demoMode || appState.replayActive)) {
      return;
    }
    if (appState.pollInFlight) return;
    if (!appState.hostCaps?.serverTools) return;
    appState.pollInFlight = true;
    try {
      const res = await Promise.race([
        app.callServerTool({
          name: 'get_office_state',
          arguments: {},
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('MCP poll timeout')), 4000)),
      ]);
      if (res?.structuredContent) handleIncomingSnapshot(res.structuredContent);
      setConnPill('Ao Vivo', 'status-live');
    } catch {
      setConnPill('Reconectando…', 'status-reconnecting');
    } finally {
      appState.pollInFlight = false;
    }
  };

  appState.forceRefreshFn = () => pollOnce(true);
  void pollOnce(true);
  if (appState.pollTimer) clearInterval(appState.pollTimer);
  appState.pollTimer = setInterval(() => void pollOnce(false), 1200);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) void pollOnce(false);
  });
}

window.addEventListener('error', (ev) => {
  console.error('[pixel-office] runtime error:', ev?.error || ev?.message);
});

try {
  setupAccessibleTabs();
  setupModalFallbacks();
  setupControls();
  renderAll();
} catch (err) {
  console.error('[pixel-office] ui init error:', err);
}

appState.liveTickTimer = setInterval(updateLiveTimers, 1000);
void initTransport();
