import { getAgentPersonality } from './social-engine.js';
import {
  drawArcadeCabinet,
  drawAtlasSprite,
  drawBookcase,
  drawBush,
  drawCar,
  drawChibiAvatar,
  drawChristmasTree,
  drawFloorLamp,
  drawLamppost,
  drawLoungeTV,
  drawNamePill,
  drawOfficeChair,
  drawPetSprite,
  drawPingPongTable,
  drawPottedPlant,
  drawSofa,
  drawSpeechBubble,
  drawTopDownSprite,
  drawTree,
  drawWorkstation,
  ensureOfficeAtlas,
  ensureTopDownAtlas,
  outlinedBox,
  px,
} from './world-sprites.js';

export const STATE_LABELS_PT = {
  thinking: 'Pensando',
  coding: 'Editando',
  reading: 'Lendo',
  terminal: 'Terminal',
  subagents: 'Subagentes',
  waiting: 'Precisa de você',
  typing: 'Digitando',
  done: 'Concluído',
  idle: 'Ocioso',
  dreaming: 'Sonhando',
  error: 'Erro',
  offline: 'Offline',
};

const ROOM_W = 304;
const ROOM_H = 224;
const CORRIDOR_H = 52;
const WALL_H = 44;
const LEFT_GRASS = 160;
const RIGHT_GRASS = 160;
const TOP_GRASS = 84;
const BOTTOM_CAMPUS = 140;

const WORLD_PALETTES = {
  day: {
    key: 'day',
    grassA: '#5f9443',
    grassB: '#56883c',
    grassSpec: '#72aa52',
    path: '#cdbba0',
    road: '#273041',
    sidewalk: '#cbd5e1',
    wallOuter: '#2d3748',
    wallTop: '#dbd4c3',
    wallBottom: '#efe9d8',
    floorWoodA: '#d4b282',
    floorWoodB: '#c8a372',
    floorTileA: '#e2e8f0',
    floorTileB: '#cfd8e3',
    floorCorridorA: '#e7e1d5',
    floorCorridorB: '#dcd4c5',
    nightTint: null,
    isNight: false,
  },
  dusk: {
    key: 'dusk',
    grassA: '#4e793e',
    grassB: '#466f37',
    grassSpec: '#5f8f4d',
    path: '#b4a087',
    road: '#212b3d',
    sidewalk: '#94a3b8',
    wallOuter: '#27303f',
    wallTop: '#cfc7b5',
    wallBottom: '#e5decb',
    floorWoodA: '#cca878',
    floorWoodB: '#be9a6b',
    floorTileA: '#dbe3ec',
    floorTileB: '#c3cedb',
    floorCorridorA: '#dcd6c8',
    floorCorridorB: '#cfc8b8',
    nightTint: 'rgba(30, 27, 75, 0.20)',
    isNight: true,
  },
  night: {
    key: 'night',
    grassA: '#264734',
    grassB: '#213f2e',
    grassSpec: '#305740',
    path: '#6b635a',
    road: '#131926',
    sidewalk: '#475569',
    wallOuter: '#1a2332',
    wallTop: '#cfc6b4',
    wallBottom: '#e7e0ce',
    floorWoodA: '#cca775',
    floorWoodB: '#bf9968',
    floorTileA: '#dbe3ec',
    floorTileB: '#c5d0dd',
    floorCorridorA: '#ddd6c7',
    floorCorridorB: '#d0c8b8',
    nightTint: 'rgba(8, 14, 30, 0.44)',
    isNight: true,
  },
  cyber: {
    key: 'cyber',
    grassA: '#132438',
    grassB: '#0f1d2e',
    grassSpec: '#1e3a5f',
    path: '#312e81',
    road: '#090d1a',
    sidewalk: '#1e293b',
    wallOuter: '#6d28d9',
    wallTop: '#1e1b4b',
    wallBottom: '#2e1065',
    floorWoodA: '#1c2538',
    floorWoodB: '#161e2f',
    floorTileA: '#1e293b',
    floorTileB: '#131c2e',
    floorCorridorA: '#1e293b',
    floorCorridorB: '#162033',
    nightTint: 'rgba(15, 7, 38, 0.30)',
    isNight: true,
  },
  christmas: {
    key: 'christmas',
    grassA: '#3b6e4c',
    grassB: '#336243',
    grassSpec: '#4a855f',
    path: '#9ca3af',
    road: '#1f2937',
    sidewalk: '#94a3b8',
    wallOuter: '#334155',
    wallTop: '#dfd7c5',
    wallBottom: '#f1ebe0',
    floorWoodA: '#d4b483',
    floorWoodB: '#caa774',
    floorTileA: '#e2e8f0',
    floorTileB: '#cbd5e1',
    floorCorridorA: '#e5e0d5',
    floorCorridorB: '#dad3c4',
    nightTint: 'rgba(12, 20, 42, 0.25)',
    isNight: true,
    christmas: true,
  },
};

function makeOffscreenPattern(size, drawFn) {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const g = c.getContext('2d');
  drawFn(g, size);
  return c;
}

export function createDemoSnapshot(tickSec) {
  const now = Date.now();
  const s1 = ['coding', 'terminal', 'coding', 'thinking'][Math.floor(tickSec / 4) % 4];
  const s2 = ['waiting', 'coding', 'waiting', 'done'][Math.floor(tickSec / 6) % 4];
  const gemState = ['thinking', 'done', 'idle', 'typing'][Math.floor(tickSec / 5) % 4];

  const agents = [
    {
      id: 'demo-ag-rafaela',
      shortId: 'demo-raf',
      source: 'antigravity',
      personaName: 'Rafaela',
      title: 'Rodar testes E2E',
      autoTitle: 'Rodar testes E2E',
      roomId: 'ag:pixel-office',
      room: 'pixel-office',
      workspacePath: '~/projetos/pixel-office',
      model: 'gemini-4-hydrogen-xhigh',
      state: 'terminal',
      sleeping: false,
      dreamLabel: '',
      currentTool: 'run_command',
      toolSummary: 'npm test',
      toolStartedAt: now - 65000,
      lastUserInput: 'Executar suíte completa e verificar cobertura',
      errorMessage: '',
      inputTokens: 84200,
      cacheTokens: 215000,
      outputTokens: 9650,
      toolCount: 24,
      recentTools: [{ name: 'run_command', summary: 'npm test', ts: now - 65000, error: false }],
      subagents: [],
      subagentDetails: [],
      customLook: null,
      startedAt: now - 25 * 60 * 1000,
      lastActivityAt: now - 1000,
    },
    {
      id: 'demo-ag-isabela',
      shortId: 'demo-isa',
      source: 'antigravity',
      personaName: 'Isabela',
      title: 'Refinar pixel art',
      autoTitle: 'Refinar pixel art',
      roomId: 'ag:pixel-office',
      room: 'pixel-office',
      workspacePath: '~/projetos/pixel-office',
      model: 'gemini-4-neon-xhigh',
      state: s1,
      sleeping: false,
      dreamLabel: '',
      currentTool: s1 === 'coding' ? 'write_file' : 'run_command',
      toolSummary: 'world-sprites.js',
      toolStartedAt: s1 === 'terminal' ? now - 3200 : null,
      lastUserInput: 'Atualizar sombreamento 60 FPS e móveis do campus',
      errorMessage: '',
      inputTokens: 62100,
      cacheTokens: 112000,
      outputTokens: 11800,
      toolCount: 19,
      recentTools: [{ name: 'write_file', summary: 'world-sprites.js', ts: now - 4000, error: false }],
      subagents: [],
      subagentDetails: [],
      customLook: null,
      startedAt: now - 18 * 60 * 1000,
      lastActivityAt: now - 1500,
    },
    {
      id: 'demo-ag-vicente',
      shortId: 'demo-vic',
      source: 'antigravity',
      personaName: 'Vicente',
      title: 'Orquestrar subagentes',
      autoTitle: 'Orquestrar subagentes',
      roomId: 'ag:pixel-office',
      room: 'pixel-office',
      workspacePath: '~/projetos/pixel-office',
      model: 'gemini-pro-orchestrator-neon',
      state: 'subagents',
      sleeping: false,
      dreamLabel: '',
      currentTool: 'invoke_subagent',
      toolSummary: '3 frentes paralelas',
      toolStartedAt: null,
      lastUserInput: 'Analisar telemetria por modelo e validar bundle',
      errorMessage: '',
      inputTokens: 42400,
      cacheTokens: 62400,
      outputTokens: 6020,
      toolCount: 16,
      recentTools: [{ name: 'invoke_subagent', summary: '3 Workers em paralelo', ts: now - 2000, error: false }],
      subagents: ['test-runner', 'Explore', 'Plan'],
      subagentDetails: [
        { id: 'demo-sub-sabrina', name: 'Sabrina', role: 'test-runner', state: 'working' },
        { id: 'demo-sub-joaquim', name: 'Joaquim', role: 'Explore', state: 'working' },
        { id: 'demo-sub-enzo', name: 'Enzo', role: 'Plan', state: 'working' },
      ],
      customLook: null,
      startedAt: now - 12 * 60 * 1000,
      lastActivityAt: now - 1200,
    },
    {
      id: 'demo-ag-bianca',
      shortId: 'demo-bia',
      source: 'antigravity',
      personaName: 'Bianca',
      title: 'Aprovar comando de deploy',
      autoTitle: 'Aprovar comando de deploy',
      roomId: 'ag:app-mobile',
      room: 'app-mobile',
      workspacePath: '~/projetos/app-mobile',
      model: 'gemini-4-hydrogen-xhigh',
      state: s2,
      sleeping: false,
      dreamLabel: '',
      currentTool: s2 === 'waiting' ? 'ask_permission' : 'write_file',
      toolSummary: s2 === 'waiting' ? 'Aprovar permissão' : 'deploy.yml',
      toolStartedAt: now - 12000,
      lastUserInput: 'Publicar nova versão do pipeline de build',
      errorMessage: '',
      inputTokens: 31500,
      cacheTokens: 48400,
      outputTokens: 4200,
      toolCount: 11,
      recentTools: [{ name: 'ask_permission', summary: 'git push origin main', ts: now - 12000, error: false }],
      subagents: [],
      subagentDetails: [],
      customLook: null,
      startedAt: now - 15 * 60 * 1000,
      lastActivityAt: now - 2000,
    },
    {
      id: 'demo-ag-jonas',
      shortId: 'demo-jon',
      source: 'antigravity',
      personaName: 'Jonas',
      title: 'Consolidando memórias',
      autoTitle: 'Consolidando memórias',
      roomId: 'ag:app-mobile',
      room: 'app-mobile',
      workspacePath: '~/projetos/api-pagamentos',
      model: 'gemini-flash-worker-agy',
      state: 'dreaming',
      sleeping: false,
      dreamLabel: 'Reconsolidando memórias e limpando logs antigos',
      currentTool: 'consolidate_memory',
      toolSummary: '',
      toolStartedAt: null,
      lastUserInput: 'Organizar base de conhecimento e limpar cache antigo',
      errorMessage: '',
      inputTokens: 19400,
      cacheTokens: 29000,
      outputTokens: 2100,
      toolCount: 9,
      recentTools: [],
      subagents: [],
      subagentDetails: [],
      customLook: null,
      startedAt: now - 35 * 60 * 1000,
      lastActivityAt: now - 8000,
    },
    {
      id: 'demo-ag-aline',
      shortId: 'demo-ali',
      source: 'antigravity',
      personaName: 'Aline',
      title: 'Intervalo social',
      autoTitle: 'Intervalo social',
      roomId: 'ag:pixel-office',
      room: 'pixel-office',
      workspacePath: '~/projetos/pixel-office',
      model: 'gemini-flash-worker-agy',
      state: 'idle',
      sleeping: false,
      dreamLabel: '',
      currentTool: '',
      toolSummary: '',
      toolStartedAt: null,
      lastUserInput: 'Revisar layout do corredor central',
      errorMessage: '',
      inputTokens: 14200,
      cacheTokens: 21000,
      outputTokens: 1850,
      toolCount: 7,
      recentTools: [],
      subagents: [],
      subagentDetails: [],
      customLook: null,
      startedAt: now - 40 * 60 * 1000,
      lastActivityAt: now - 120000,
    },
    {
      id: 'demo-ag-mateus',
      shortId: 'demo-mat',
      source: 'antigravity',
      personaName: 'Mateus',
      title: 'Sessão em pausa (ociosa)',
      autoTitle: 'Sessão em pausa (ociosa)',
      roomId: 'ag:app-mobile',
      room: 'app-mobile',
      workspacePath: '~/projetos/app-mobile',
      model: 'gemini-flash-worker-agy',
      state: 'idle',
      sleeping: true,
      dreamLabel: '',
      currentTool: '',
      toolSummary: '',
      toolStartedAt: null,
      lastUserInput: 'Aguardando próxima instrução',
      errorMessage: '',
      inputTokens: 8200,
      cacheTokens: 12000,
      outputTokens: 1100,
      toolCount: 4,
      recentTools: [],
      subagents: [],
      subagentDetails: [],
      customLook: null,
      startedAt: now - 55 * 60 * 1000,
      lastActivityAt: now - 10 * 60 * 1000,
    },
    {
      id: 'demo-gem-luan',
      shortId: 'tab-42',
      source: 'gemini-web',
      tabId: 42,
      url: 'https://gemini.google.com/app',
      personaName: 'Luan',
      title: 'Ideias de Interface Pixel Art',
      autoTitle: 'Ideias de Interface Pixel Art',
      roomId: 'gemini:Gemini Web',
      room: 'Gemini Web',
      workspacePath: 'https://gemini.google.com/app',
      model: 'Gemini Web Pro',
      state: gemState === 'thinking' ? 'thinking' : 'idle',
      sleeping: false,
      dreamLabel: '',
      currentTool: gemState === 'thinking' ? 'generate_response' : '',
      toolSummary: '',
      toolStartedAt: null,
      lastUserInput: 'Sugira ideias de vida social para avatares no escritório',
      errorMessage: '',
      inputTokens: 0,
      cacheTokens: 0,
      outputTokens: 0,
      toolCount: 8,
      recentTools: [],
      subagents: [],
      subagentDetails: [],
      customLook: null,
      startedAt: now - 22 * 60 * 1000,
      lastActivityAt: now - 90000,
    },
  ];

  const demoRepos = [
    {
      id: 'demo-repo-1',
      name: 'app-mobile',
      path: '~/projetos/app-mobile',
      kind: 'github',
      githubSlug: 'exemplo/app-mobile',
      githubUrl: 'https://github.com/exemplo/app-mobile',
      branch: 'main',
      dirtyCount: 0,
      lastCommitHash: 'a4f9c21',
      lastCommitAt: now - 3600000,
      lastCommitMsg: 'feat: improve onboarding flow',
      exists: true,
      sourceProjectName: 'app-mobile',
    },
    {
      id: 'demo-repo-2',
      name: 'api-pagamentos',
      path: '~/projetos/api-pagamentos',
      kind: 'git-local',
      githubSlug: '',
      githubUrl: '',
      branch: 'main',
      dirtyCount: 2,
      lastCommitHash: '1e09ef6',
      lastCommitAt: now - 3100000,
      lastCommitMsg: 'fix(checkout): refine webhook retry',
      exists: true,
      sourceProjectName: 'api-pagamentos',
    },
    {
      id: 'demo-repo-3',
      name: 'docs-portal',
      path: '~/projetos/docs-portal',
      kind: 'project',
      githubSlug: '',
      githubUrl: '',
      branch: '',
      dirtyCount: 0,
      lastCommitHash: '',
      lastCommitAt: null,
      lastCommitMsg: '',
      exists: true,
      sourceProjectName: 'docs-portal',
    },
  ];

  return {
    version: '4.0.0',
    updatedAt: now,
    bridgeUrl: 'http://127.0.0.1:4748',
    extensionPath: '~/.gemini/config/plugins/pixel-office/chrome-extension',
    prefs: {
      petType: 'cyberfox',
      officeTheme: 'auto',
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
      kanban: [
        { id: 'kb-d1', title: 'Testar Vida Social e Sonhando', room: 'pixel-office', status: 'doing', createdAt: now - 600000, updatedAt: now },
        { id: 'kb-d2', title: 'Conectar repo api-pagamentos no GitHub', room: 'api-pagamentos', status: 'todo', createdAt: now - 900000, updatedAt: now },
        { id: 'kb-d3', title: 'Atualizar campus gráfico v4.0', room: 'pixel-office', status: 'done', createdAt: now - 1200000, updatedAt: now },
      ],
      extraRepoPaths: [],
    },
    stats: {
      total: agents.length,
      active: 4,
      antigravityCount: 7,
      geminiWebCount: 1,
      totalInputTokens: 262000,
      totalOutputTokens: 36670,
      totalCacheTokens: 438800,
      totalToolCalls: 100,
    },
    analytics: {
      window5h: { inputTokens: 3780000, cacheTokens: 28120000, outputTokens: 282000, totalTokens: 4062000, toolCalls: 345, estimatedUsd: 16.26 },
      window24h: { inputTokens: 9840000, cacheTokens: 66590000, outputTokens: 899000, totalTokens: 10739000, toolCalls: 884, estimatedUsd: 41.93 },
      window7d: { inputTokens: 53250000, cacheTokens: 263060000, outputTokens: 2740000, totalTokens: 55990000, toolCalls: 2577, estimatedUsd: 138.92 },
      reset5hInMs: 92 * 60000,
      reset7dInMs: 4 * 86400000 + 11 * 3600000,
      byModel: [
        { model: 'gemini-4-hydrogen-xhigh', steps24h: 120, totalTokens24h: 4120000, cacheTokens24h: 28400000, totalTokens7d: 21500000, estimatedUsd24h: 18.4 },
        { model: 'gemini-flash-worker-agy', steps24h: 180, totalTokens24h: 3140000, cacheTokens24h: 18200000, totalTokens7d: 16800000, estimatedUsd24h: 6.12 },
        { model: 'gemini-4-neon-xhigh', steps24h: 88, totalTokens24h: 2180000, cacheTokens24h: 12900000, totalTokens7d: 10900000, estimatedUsd24h: 11.3 },
      ],
      cacheSavingsPct: 87,
      geminiMsgs24h: 36,
      productivity: {
        activeMinutesToday: 58,
        idleMinutesToday: 42,
        categoryCounts: { coding: 130, reading: 157, terminal: 52, subagents: 6, thinking: 16 },
      },
    },
    alerts: [],
    progression: {
      xp: 3650,
      level: 6,
      prevLevelXp: 3000,
      nextLevelXp: 4320,
      unlockedFurniture: ['coffee', 'plant', 'whiteboard', 'server', 'aquarium', 'espresso', 'arcade', 'trophies'],
    },
    projectsAndRepos: demoRepos,
    rooms: [
      { id: 'ag:pixel-office', name: 'pixel-office', autoName: 'pixel-office', kind: 'antigravity', accentColor: '', isCustom: false, agentIds: ['demo-ag-rafaela', 'demo-ag-isabela', 'demo-ag-vicente', 'demo-ag-aline'], constructingUntil: 0 },
      { id: 'ag:app-mobile', name: 'app-mobile', autoName: 'app-mobile', kind: 'antigravity', accentColor: '', isCustom: false, agentIds: ['demo-ag-bianca', 'demo-ag-jonas', 'demo-ag-mateus'], constructingUntil: 0 },
      { id: 'gemini:Gemini Web', name: 'Gemini Web', autoName: 'Gemini Web', kind: 'gemini-web', accentColor: '', isCustom: false, agentIds: ['demo-gem-luan'], constructingUntil: 0 },
      { id: 'github:repos', name: 'GitHub & Projetos', autoName: 'GitHub & Projetos', kind: 'github-hub', accentColor: '#00d992', isCustom: false, agentIds: [], repos: demoRepos, constructingUntil: 0 },
    ],
    agents,
    feed: [
      { ts: now - 1000, source: 'antigravity', agentId: 'demo-ag-isabela', label: 'pixel-office', state: 'coding', message: 'write_file: world-sprites.js' },
      { ts: now - 3000, source: 'antigravity', agentId: 'demo-ag-bianca', label: 'app-mobile', state: 'waiting', message: 'Precisa de você: aprovar uma permissão' },
      { ts: now - 6000, source: 'antigravity', agentId: 'demo-ag-jonas', label: 'Memória', state: 'dreaming', message: '💭 Reconsolidando memórias e limpando logs antigos…' },
      { ts: now - 10000, source: 'gemini-web', agentId: 'demo-gem-luan', label: 'Gemini Web', state: gemState, message: 'Aba ativa no Chrome/Edge' },
    ],
    timeline: [
      { ts: now - 1200000, source: 'antigravity', agentId: 'demo-ag-isabela', agentTitle: 'Isabela', room: 'pixel-office', state: 'thinking', toolName: '', summary: 'Planejando v4.0' },
      { ts: now - 600000, source: 'antigravity', agentId: 'demo-ag-isabela', agentTitle: 'Isabela', room: 'pixel-office', state: 'coding', toolName: 'write_file', summary: 'world-sprites.js' },
      { ts: now - 300000, source: 'antigravity', agentId: 'demo-ag-jonas', agentTitle: 'Jonas', room: 'app-mobile', state: 'dreaming', toolName: 'consolidate_memory', summary: 'Sonhando' },
      { ts: now - 60000, source: 'antigravity', agentId: 'demo-ag-bianca', agentTitle: 'Bianca', room: 'app-mobile', state: 'waiting', toolName: 'ask_permission', summary: 'Aprovar permissão' },
    ],
  };
}

export class OfficeCanvasRenderer {
  constructor(canvas, viewport, socialEngine, options = {}) {
    this.canvas = canvas;
    this.viewport = viewport;
    this.social = socialEngine;
    this.onSocialFeed = options.onSocialFeed || null;
    this.onSound = options.onSound || null;
    this.onZoomChange = options.onZoomChange || null;
    this.ctx = canvas.getContext('2d');

    this.theme = 'auto';
    this.zoom = 1;
    this.panX = 0;
    this.panY = 0;
    this.hasFittedOnce = false;
    this.userMovedCamera = false;
    this.followAgentId = null;
    this.selectedAgentId = null;
    this.filter = 'all';
    this.snapshot = null;

    this.hitboxes = [];
    this.patternCache = new Map();
    this.agentMotion = new Map();
    this.petMotion = {
      x: LEFT_GRASS + 180,
      y: TOP_GRASS + ROOM_H + 26,
      targetX: LEFT_GRASS + 320,
      targetY: TOP_GRASS + ROOM_H + 26,
      dir: 1,
      nextRoamAt: 0,
      reactionUntil: 0,
    };
    this.lastWorldSize = { w: 1232, h: 724, buildingW: 912, buildingH: 500 };

    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.onMotionChange = (e) => {
      this.reducedMotion = e.matches;
      this.draw();
    };
    this.motionQuery.addEventListener('change', this.onMotionChange);

    this.resizeObserver =
      typeof ResizeObserver !== 'undefined' && this.viewport
        ? new ResizeObserver(() => {
            if (!this.userMovedCamera && this.hasFittedOnce) {
              this.fitToView();
            } else {
              this.draw();
            }
          })
        : null;
    this.resizeObserver?.observe(this.viewport);

    this.rafId = null;
    this.lastFrameAt = performance.now();
    this.dt = 0.016;
    ensureOfficeAtlas(() => this.draw());
    ensureTopDownAtlas(() => this.draw());
    this.setupPointerCamera();
  }

  getPatterns(ctx, pal) {
    if (this.patternCache.has(pal.key)) {
      return this.patternCache.get(pal.key);
    }

    const grassCanvas = makeOffscreenPattern(64, (g) => {
      px(g, 0, 0, 64, 64, pal.grassA);
      px(g, 0, 0, 32, 32, pal.grassB);
      px(g, 32, 32, 32, 32, pal.grassB);
      const tufts = [[6, 8], [22, 18], [40, 10], [52, 26], [14, 42], [44, 52], [28, 56]];
      for (const [tx, ty] of tufts) {
        px(g, tx, ty, 2, 2, pal.grassSpec);
        px(g, tx + 3, ty + 1, 2, 1, pal.grassSpec);
      }
      px(g, 18, 48, 2, 2, pal.isNight ? '#a7f3d0' : '#fef08a');
      px(g, 50, 14, 2, 2, pal.isNight ? '#bae6fd' : '#f8fafc');
    });

    const woodCanvas = makeOffscreenPattern(32, (g) => {
      px(g, 0, 0, 32, 32, pal.floorWoodA);
      px(g, 0, 8, 32, 8, pal.floorWoodB);
      px(g, 0, 24, 32, 8, pal.floorWoodB);
      for (const py of [7, 15, 23, 31]) {
        px(g, 0, py, 32, 1, 'rgba(69, 26, 3, 0.24)');
        px(g, 0, py - 6, 32, 1, 'rgba(255, 255, 255, 0.09)');
      }
      px(g, 10, 0, 1, 8, 'rgba(69, 26, 3, 0.26)');
      px(g, 24, 8, 1, 8, 'rgba(69, 26, 3, 0.26)');
      px(g, 6, 16, 1, 8, 'rgba(69, 26, 3, 0.26)');
      px(g, 20, 24, 1, 8, 'rgba(69, 26, 3, 0.26)');
    });

    const tileCanvas = makeOffscreenPattern(32, (g) => {
      px(g, 0, 0, 32, 32, pal.floorTileA);
      px(g, 0, 0, 16, 16, pal.floorTileB);
      px(g, 16, 16, 16, 16, pal.floorTileB);
      px(g, 0, 15, 32, 1, 'rgba(15, 23, 42, 0.12)');
      px(g, 15, 0, 1, 32, 'rgba(15, 23, 42, 0.12)');
      px(g, 1, 1, 14, 1, 'rgba(255, 255, 255, 0.22)');
      px(g, 17, 17, 14, 1, 'rgba(255, 255, 255, 0.22)');
    });

    const corridorCanvas = makeOffscreenPattern(32, (g) => {
      px(g, 0, 0, 32, 32, pal.floorCorridorA);
      for (let y = 0; y < 32; y += 2) {
        for (let x = 0; x < 32; x += 2) {
          const zig = (((x >> 1) + (y >> 1)) % 8 < 4) ^ ((((x >> 1) - (y >> 1) + 64) % 8) < 4);
          if (zig) px(g, x, y, 2, 2, pal.floorCorridorB);
          if (((x >> 1) + (y >> 1)) % 4 === 0) px(g, x, y, 2, 1, 'rgba(15, 23, 42, 0.07)');
        }
      }
    });

    const entry = {
      grass: ctx.createPattern(grassCanvas, 'repeat'),
      wood: ctx.createPattern(woodCanvas, 'repeat'),
      tile: ctx.createPattern(tileCanvas, 'repeat'),
      corridor: ctx.createPattern(corridorCanvas, 'repeat'),
    };
    this.patternCache.set(pal.key, entry);
    return entry;
  }

  setupPointerCamera() {
    let dragging = false;
    let startX = 0;
    let startY = 0;
    let startPanX = 0;
    let startPanY = 0;
    this.suppressNextClick = false;

    this.canvas.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      dragging = true;
      startX = e.clientX;
      startY = e.clientY;
      startPanX = this.panX;
      startPanY = this.panY;
      this.suppressNextClick = false;
      this.canvas.setPointerCapture?.(e.pointerId);
    });

    this.canvas.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (Math.hypot(dx, dy) > 4) {
        this.suppressNextClick = true;
        this.userMovedCamera = true;
        this.followAgentId = null;
        this.panX = startPanX + dx;
        this.panY = startPanY + dy;
        this.draw();
      }
    });

    const endDrag = () => {
      dragging = false;
    };
    this.canvas.addEventListener('pointerup', endDrag);
    this.canvas.addEventListener('pointercancel', endDrag);

    this.canvas.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        const rect = this.canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const worldX = (mx - this.panX) / this.zoom;
        const worldY = (my - this.panY) / this.zoom;

        const factor = e.deltaY < 0 ? 1.12 : 0.89;
        const nextZoom = Math.max(0.42, Math.min(2.4, Number((this.zoom * factor).toFixed(2))));
        this.userMovedCamera = true;
        this.zoom = nextZoom;
        this.panX = mx - worldX * nextZoom;
        this.panY = my - worldY * nextZoom;
        this.onZoomChange?.(this.zoom);
        this.draw();
      },
      { passive: false }
    );
  }

  resolveVisualTheme() {
    if (this.theme !== 'auto') {
      return WORLD_PALETTES[this.theme] || WORLD_PALETTES.night;
    }
    const hour = new Date().getHours();
    if (hour >= 19 || hour <= 5) return WORLD_PALETTES.night;
    if (hour === 6 || hour === 17 || hour === 18) return WORLD_PALETTES.dusk;
    return WORLD_PALETTES.day;
  }

  setTheme(theme) {
    if (theme === 'auto' || WORLD_PALETTES[theme]) {
      this.theme = theme;
      this.draw();
    }
  }

  setZoom(zoom, { markManual = true } = {}) {
    if (markManual) this.userMovedCamera = true;
    const cx = (this.viewport?.clientWidth || 800) / 2;
    const cy = (this.viewport?.clientHeight || 500) / 2;
    const worldX = (cx - this.panX) / this.zoom;
    const worldY = (cy - this.panY) / this.zoom;
    this.zoom = Math.max(0.42, Math.min(2.4, Number(zoom.toFixed(2))));
    this.panX = cx - worldX * this.zoom;
    this.panY = cy - worldY * this.zoom;
    this.onZoomChange?.(this.zoom);
    this.draw();
  }

  fitToView() {
    const vw = Math.max(300, this.viewport?.clientWidth || 800);
    const vh = Math.max(240, this.viewport?.clientHeight || 500);
    const bw = (this.lastWorldSize.buildingW || 912) + 120;
    const bh = (this.lastWorldSize.buildingH || 500) + 120;
    const zoom = Math.max(0.44, Math.min(1.4, Math.min(vw / bw, vh / bh)));
    this.userMovedCamera = false;
    this.zoom = Number(zoom.toFixed(2));
    this.panX = Math.round((vw - this.lastWorldSize.w * this.zoom) / 2);
    this.panY = Math.round((vh - this.lastWorldSize.h * this.zoom) / 2);
    this.followAgentId = null;
    this.onZoomChange?.(this.zoom);
    this.draw();
  }

  centerOnAgent(agentId) {
    const m = this.agentMotion.get(agentId);
    if (!m) return;
    this.userMovedCamera = true;
    const vw = this.viewport?.clientWidth || 800;
    const vh = this.viewport?.clientHeight || 500;
    this.panX = Math.round(vw / 2 - m.x * this.zoom);
    this.panY = Math.round(vh / 2 - m.y * this.zoom);
    this.draw();
  }

  setFollowAgent(agentId) {
    this.followAgentId = agentId || null;
    if (agentId) {
      this.userMovedCamera = true;
      this.centerOnAgent(agentId);
    }
    this.draw();
  }

  setFilter(filter) {
    this.filter = filter || 'all';
    this.draw();
  }

  setSelectedAgentId(id) {
    this.selectedAgentId = id || null;
    this.draw();
  }

  setSnapshot(snapshot) {
    const prevBuildingW = this.lastWorldSize.buildingW || 0;
    this.snapshot = snapshot;
    const layout = this.computeLayout();
    this.lastWorldSize = {
      w: layout.worldW,
      h: layout.worldH,
      buildingW: layout.buildingW,
      buildingH: layout.buildingH,
    };
    const hasContent = Boolean(snapshot?.rooms?.length || snapshot?.agents?.length);
    if (!this.hasFittedOnce || (hasContent && !this.userMovedCamera && layout.buildingW > prevBuildingW)) {
      if (hasContent) this.hasFittedOnce = true;
      this.fitToView();
      return;
    }
    this.draw();
  }

  triggerPetHappy() {
    this.petMotion.reactionUntil = Date.now() + 2600;
    this.draw();
  }

  start() {
    if (this.rafId !== null) return;
    this.lastFrameAt = performance.now();
    const loop = (now) => {
      const dt = Math.min(0.05, Math.max(0.004, (now - this.lastFrameAt) / 1000));
      this.lastFrameAt = now;
      this.dt = dt;
      if (!this.reducedMotion) {
        this.draw();
      }
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  stop() {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.motionQuery.removeEventListener('change', this.onMotionChange);
    this.resizeObserver?.disconnect();
  }

  getHitAt(cssX, cssY) {
    if (this.suppressNextClick) return null;
    const wx = (cssX - this.panX) / this.zoom;
    const wy = (cssY - this.panY) / this.zoom;
    for (let i = this.hitboxes.length - 1; i >= 0; i -= 1) {
      const box = this.hitboxes[i];
      if (wx >= box.x && wx <= box.x + box.w && wy >= box.y && wy <= box.y + box.h) {
        return box;
      }
    }
    return null;
  }

  computeLayout() {
    const allAgents = this.snapshot?.agents || [];
    const filteredAgents =
      this.filter === 'all'
        ? allAgents
        : allAgents.filter((a) => a.source === this.filter);
    const agentById = new Map(filteredAgents.map((a) => [a.id, a]));

    const sourceRooms = this.snapshot?.rooms || [];
    const dynamicRooms = [];
    for (const r of sourceRooms) {
      if (r.kind === 'github-hub') {
        if (this.filter !== 'gemini-web') dynamicRooms.push({ ...r, members: [] });
        continue;
      }
      const members = (r.agentIds || []).map((id) => agentById.get(id)).filter(Boolean);
      if (members.length > 0 || (r.isCustom && this.filter === 'all')) {
        dynamicRooms.push({ ...r, members });
      }
    }

    const bx = LEFT_GRASS;
    const by = TOP_GRASS;
    const corridorY = by + ROOM_H;
    const corridorMidY = corridorY + CORRIDOR_H / 2;

    const commonRooms = [
      { id: 'common:recepcao', name: 'Recepção', kind: 'common-reception', x: bx, y: by, w: ROOM_W, h: ROOM_H, isTop: true },
      { id: 'common:copa', name: 'Copa', kind: 'common-copa', x: bx + ROOM_W, y: by, w: ROOM_W, h: ROOM_H, isTop: true },
      { id: 'common:banheiros', name: 'Banheiros', kind: 'common-bath', x: bx, y: corridorY + CORRIDOR_H, w: ROOM_W, h: ROOM_H, isTop: false },
      { id: 'common:lounge', name: 'Lounge', kind: 'common-lounge', x: bx + ROOM_W, y: corridorY + CORRIDOR_H, w: ROOM_W, h: ROOM_H, isTop: false },
    ];

    const wingCols = Math.max(1, Math.ceil(dynamicRooms.length / 2));
    const placedWing = [];

    for (let idx = 0; idx < wingCols * 2; idx += 1) {
      const col = Math.floor(idx / 2) + 2;
      const isTop = idx % 2 === 0;
      const rx = bx + col * ROOM_W;
      const ry = isTop ? by : corridorY + CORRIDOR_H;
      const r = dynamicRooms[idx];

      if (r) {
        placedWing.push({ ...r, x: rx, y: ry, w: ROOM_W, h: ROOM_H, isTop });
      } else {
        placedWing.push({
          id: `patio-${idx}`,
          name: 'Jardim',
          kind: 'patio-deck',
          x: rx,
          y: ry,
          w: ROOM_W,
          h: ROOM_H,
          isTop,
          members: [],
        });
      }
    }

    const allRooms = [...commonRooms, ...placedWing].map((r) => ({
      ...r,
      door: {
        x: r.x + r.w / 2,
        y: r.isTop ? corridorY + 6 : corridorY + CORRIDOR_H - 6,
      },
    }));

    const buildingW = (2 + wingCols) * ROOM_W;
    const buildingH = ROOM_H * 2 + CORRIDOR_H;
    const worldW = LEFT_GRASS + buildingW + RIGHT_GRASS;
    const worldH = TOP_GRASS + buildingH + BOTTOM_CAMPUS;

    const commonAnchors = {
      copa: { roomId: 'common:copa', x: bx + ROOM_W + 150, y: by + 132 },
      mirror: { roomId: 'common:banheiros', x: bx + 84, y: corridorY + CORRIDOR_H + 86 },
      tv: { roomId: 'common:lounge', x: bx + ROOM_W + 86, y: corridorY + CORRIDOR_H + 132 },
      arcade: { roomId: 'common:lounge', x: bx + ROOM_W + 250, y: corridorY + CORRIDOR_H + 88 },
      pingpong: { roomId: 'common:lounge', x: bx + ROOM_W + 220, y: corridorY + CORRIDOR_H + 154 },
      jokenpo: { roomId: 'common:recepcao', x: bx + 138, y: by + 168 },
      chat: { roomId: 'common:recepcao', x: bx + 216, y: by + 158 },
    };

    return {
      bx,
      by,
      corridorY,
      corridorMidY,
      buildingW,
      buildingH,
      worldW,
      worldH,
      allRooms,
      filteredAgents,
      commonAnchors,
    };
  }

  moveAlongCorridor(motion, targetRoom, targetX, targetY, corridorMidY, roomsById) {
    if (this.reducedMotion) {
      return { roomId: targetRoom.id, x: targetX, y: targetY, moving: false, dir: 1 };
    }

    const currRoom = roomsById.get(motion.roomId) || targetRoom;
    let wpX = targetX;
    let wpY = targetY;
    let nextRoomId = motion.roomId || targetRoom.id;

    if (currRoom.id !== targetRoom.id) {
      if (Math.abs(motion.y - corridorMidY) > 6 && Math.abs(motion.x - currRoom.door.x) > 8) {
        wpX = currRoom.door.x;
        wpY = currRoom.door.y;
      } else if (Math.abs(motion.y - corridorMidY) > 6 && Math.abs(motion.x - targetRoom.door.x) > 12) {
        wpX = currRoom.door.x;
        wpY = corridorMidY;
      } else if (Math.abs(motion.x - targetRoom.door.x) > 8) {
        wpX = targetRoom.door.x;
        wpY = corridorMidY;
      } else {
        wpX = targetRoom.door.x;
        wpY = targetRoom.door.y;
        nextRoomId = targetRoom.id;
      }
    }

    const dx = wpX - motion.x;
    const dy = wpY - motion.y;
    const dist = Math.hypot(dx, dy);
    if (dist <= 2.0) {
      if (nextRoomId !== targetRoom.id) {
        return { roomId: nextRoomId, x: wpX, y: wpY, moving: true, dir: motion.dir };
      }
      return { roomId: targetRoom.id, x: wpX, y: wpY, moving: wpX !== targetX || wpY !== targetY, dir: motion.dir };
    }

    const speed = 104 * (this.dt || 0.016);
    const step = Math.min(dist, speed);
    return {
      roomId: nextRoomId,
      x: motion.x + (dx / dist) * step,
      y: motion.y + (dy / dist) * step,
      moving: true,
      dir: Math.abs(dx) > 0.6 ? (dx >= 0 ? 1 : -1) : motion.dir || 1,
    };
  }

  draw() {
    if (!this.ctx || !this.canvas || !this.viewport) return;
    try {
      this.drawFrame();
    } catch (err) {
      console.error('[pixel-office] canvas draw error:', err);
    }
  }

  drawFrame() {
    const ctx = this.ctx;
    const pal = this.resolveVisualTheme();
    const patterns = this.getPatterns(ctx, pal);
    const now = Date.now();
    const tick = this.reducedMotion ? 0 : Math.floor(now / 180);

    const layout = this.computeLayout();
    this.lastWorldSize = {
      w: layout.worldW,
      h: layout.worldH,
      buildingW: layout.buildingW,
      buildingH: layout.buildingH,
    };

    if (this.social) {
      this.social.update(layout.filteredAgents, layout.commonAnchors, now, {
        socialEnabled: this.snapshot?.prefs?.socialEnabled !== false,
        onSocialFeed: this.onSocialFeed,
        onSound: this.onSound,
      });
    }

    const vw = Math.max(300, this.viewport.clientWidth || 800);
    const vh = Math.max(240, this.viewport.clientHeight || 500);
    const dpr = Math.min(2, window.devicePixelRatio || 1);

    if (this.canvas.width !== Math.floor(vw * dpr) || this.canvas.height !== Math.floor(vh * dpr)) {
      this.canvas.width = Math.floor(vw * dpr);
      this.canvas.height = Math.floor(vh * dpr);
      this.canvas.style.width = `${vw}px`;
      this.canvas.style.height = `${vh}px`;
    }

    if (this.followAgentId) {
      const m = this.agentMotion.get(this.followAgentId);
      if (m) {
        const targetPanX = vw / 2 - m.x * this.zoom;
        const targetPanY = vh / 2 - m.y * this.zoom;
        const alpha = 1 - Math.exp(-9 * (this.dt || 0.016));
        this.panX += (targetPanX - this.panX) * alpha;
        this.panY += (targetPanY - this.panY) * alpha;
      }
    }

    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    px(ctx, 0, 0, vw, vh, pal.grassB);

    ctx.translate(this.panX, this.panY);
    ctx.scale(this.zoom, this.zoom);
    ctx.imageSmoothingEnabled = false;

    this.hitboxes = [];

    // 1. Outdoor Campus (textured grass, trees, road, walkway)
    this.drawOutdoorCampus(ctx, layout, pal, patterns, tick);

    // 2. Building shell + Central Corridor
    this.drawBuildingCore(ctx, layout, pal, patterns);

    // 3. Rooms & Layered Interiors
    const unlocked = new Set(this.snapshot?.progression?.unlockedFurniture || ['coffee', 'plant']);
    const roomsById = new Map(layout.allRooms.map((r) => [r.id, r]));
    const activeCircles = this.social ? this.social.getActiveCircles() : [];

    for (const room of layout.allRooms) {
      this.drawRoom(ctx, room, pal, patterns, tick, unlocked, activeCircles);
    }

    // 4. Night ambient tint strictly outside building
    if (pal.nightTint) {
      ctx.fillStyle = pal.nightTint;
      ctx.fillRect(0, 0, layout.worldW, layout.by);
      ctx.fillRect(0, layout.by, layout.bx, layout.buildingH);
      ctx.fillRect(layout.bx + layout.buildingW, layout.by, RIGHT_GRASS, layout.buildingH);
      ctx.fillRect(0, layout.by + layout.buildingH, layout.worldW, BOTTOM_CAMPUS);
    }

    // 5. Outdoor lamps & gliding cars (drawn over night tint so headlights glow)
    this.drawStreetLightsAndCars(ctx, layout, pal, now);

    // 6. Agents & Subagents smoothly traversing corridor + rooms
    this.drawAllAgents(ctx, layout, roomsById, pal, tick, now);

    // 7. Roaming Pixel Mascot
    this.drawRoamingPet(ctx, layout, pal, tick, now);

    // 8. Floating coins from social victories / completed work
    if (this.social) {
      for (const coin of this.social.getFloatingCoins(now)) {
        const age = (now - coin.bornAt) / 1800;
        const m = this.agentMotion.get(coin.agentId);
        const cx = m ? m.x : coin.x;
        const cy = (m ? m.y : coin.y) - 26 - age * 24;
        ctx.save();
        ctx.globalAlpha = Math.max(0, 1 - age);
        ctx.fillStyle = coin.color;
        ctx.font = '700 11px Inter, "Segoe UI", sans-serif';
        ctx.fillText(coin.text, cx - 14, cy);
        ctx.restore();
      }
    }

    ctx.restore();
  }

  drawOutdoorCampus(ctx, layout, pal, patterns, tick) {
    const { worldW, worldH, bx, by, buildingW, buildingH, corridorY } = layout;

    ctx.fillStyle = patterns.grass;
    ctx.fillRect(0, 0, worldW, worldH - BOTTOM_CAMPUS + 26);

    // Stone walkway leading up to main entrance
    const walkX = bx - 58;
    px(ctx, walkX, corridorY, 58, CORRIDOR_H, pal.path);
    px(ctx, walkX, corridorY, 36, buildingH - ROOM_H + 34, pal.path);
    for (let py = corridorY + 12; py < by + buildingH + 20; py += 18) {
      px(ctx, walkX + 4, py, 28, 2, 'rgba(0,0,0,0.08)');
    }

    // Entrance "PO" illuminated totem
    outlinedBox(ctx, bx - 18, corridorY - 14, 14, 26, '#0f1011', '#23252a');
    px(ctx, bx - 17, corridorY - 13, 12, 2, '#5e6ad2');
    ctx.fillStyle = '#f7f8f8';
    ctx.font = 'bold 8px Inter, Consolas, sans-serif';
    ctx.fillText('PO', bx - 16.5, corridorY - 2);

    // Lush trees & bushes framing the grounds
    const treeSpots = [
      [48, 52, true],
      [250, 44, false],
      [510, 46, true],
      [790, 44, false],
      [worldW - 64, 52, true],
      [62, 195, false],
      [48, 385, true],
      [worldW - 62, 200, false],
      [worldW - 68, 380, true],
    ];
    for (const [tx, ty, pine] of treeSpots) {
      if (tx < worldW - 22) drawTree(ctx, tx, ty, pine);
    }

    const bushSpots = [
      [bx + 54, by - 11],
      [bx + 320, by - 11],
      [bx + buildingW - 68, by - 11],
      [bx + 54, by + buildingH + 11],
      [bx + 330, by + buildingH + 11],
    ];
    for (const [bxx, byy] of bushSpots) {
      drawBush(ctx, bxx, byy);
    }

    // Sidewalk & dark avenue
    const sideY = by + buildingH + 22;
    px(ctx, 0, sideY, worldW, 22, pal.sidewalk);
    px(ctx, 0, sideY + 20, worldW, 2, 'rgba(0,0,0,0.22)');
    px(ctx, 0, sideY + 22, worldW, 96, pal.road);
    for (let rx = 14; rx < worldW; rx += 46) {
      px(ctx, rx, sideY + 68, 24, 4, '#eab308');
    }

    if (pal.isNight) {
      for (let i = 0; i < 6; i += 1) {
        const fx = 42 + ((i * 197 + tick * 2) % (worldW - 84));
        const fy = 40 + ((i * 89 + (tick % 12)) % (by + buildingH));
        if (fx < bx || fx > bx + buildingW || fy < by) {
          px(ctx, fx, fy, 3, 3, tick % 8 < 4 ? '#fde047' : 'rgba(253,224,71,0.35)');
        }
      }
    }
  }

  drawStreetLightsAndCars(ctx, layout, pal, now) {
    const sideY = layout.by + layout.buildingH + 22;
    for (let lx = 96; lx < layout.worldW - 60; lx += 196) {
      drawLamppost(ctx, lx, sideY + 15, pal.isNight);
    }

    const span = layout.worldW + 140;
    const carX1 = ((now * 0.055) % span) - 70;
    const carX2 = ((now * 0.038 + 460) % span) - 70;
    const carX3 = layout.worldW + 70 - ((now * 0.044) % span);
    drawCar(ctx, carX1, sideY + 42, '#ef4444', 1, pal.isNight, 'car_red');
    drawCar(ctx, carX2, sideY + 62, '#facc15', 1, pal.isNight, 'car_orange');
    drawCar(ctx, carX3, sideY + 90, '#38bdf8', -1, pal.isNight, 'car_blue');
  }

  drawBuildingCore(ctx, layout, pal, patterns) {
    const { bx, by, buildingW, buildingH, corridorY } = layout;

    px(ctx, bx + 8, by + 8, buildingW, buildingH, 'rgba(0,0,0,0.38)');
    px(ctx, bx - 4, by - 4, buildingW + 8, buildingH + 8, pal.wallOuter);

    ctx.fillStyle = patterns.corridor;
    ctx.fillRect(bx, corridorY, buildingW, CORRIDOR_H);
    // Soft corridor wall edge AO shadow
    px(ctx, bx, corridorY, buildingW, 4, 'rgba(0,0,0,0.12)');

    // Glass entrance
    px(ctx, bx - 4, corridorY + 7, 8, CORRIDOR_H - 14, '#57c1ff');
    px(ctx, bx - 3, corridorY + 10, 3, CORRIDOR_H - 20, 'rgba(255,255,255,0.45)');

    // Corridor bench & plants
    outlinedBox(ctx, bx + 328, corridorY + 11, 34, 12, '#92400e', '#2b1b0e');
    drawPottedPlant(ctx, bx + 22, corridorY + 26);
    drawPottedPlant(ctx, bx + 560, corridorY + 26);
  }

  drawRoom(ctx, room, pal, patterns, tick, unlocked, activeCircles) {
    const { x, y, w, h, isTop, kind } = room;

    if (kind === 'patio-deck') {
      ctx.fillStyle = patterns.grass;
      ctx.fillRect(x, y, w, h);
      // Cedar wood terrace deck with shadow & plank seams
      px(ctx, x + 22, y + 22, w - 40, h - 38, 'rgba(0,0,0,0.28)');
      outlinedBox(ctx, x + 18, y + 18, w - 36, h - 36, '#9a4406', '#451a03');
      px(ctx, x + 20, y + 20, w - 40, h - 40, '#b45309');
      for (let py = y + 28; py < y + h - 22; py += 8) {
        px(ctx, x + 20, py, w - 40, 1, 'rgba(69,26,3,0.42)');
        px(ctx, x + 20, py + 1, w - 40, 1, 'rgba(255,255,255,0.08)');
      }
      // String lights across patio top
      px(ctx, x + 22, y + 26, w - 44, 1, '#1e293b');
      for (let lx = x + 32; lx < x + w - 28; lx += 24) {
        px(ctx, lx - 2, y + 25, 6, 6, 'rgba(250, 204, 21, 0.25)');
        px(ctx, lx, y + 27, 2, 3, '#fef08a');
      }
      // Striped bistro umbrellas from 16x16 PNG tileset atlas
      for (const [ux, key] of [
        [x + 88, 'bistroRed'],
        [x + w - 88, 'bistroBlue'],
      ]) {
        px(ctx, ux - 20, y + h / 2 + 16, 40, 7, 'rgba(0,0,0,0.25)');
        if (!drawAtlasSprite(ctx, key, ux - 24, y + h / 2 - 22, 48, 44)) {
          outlinedBox(ctx, ux - 16, y + h / 2 - 16, 32, 32, '#f8fafc', '#334155');
          px(ctx, ux - 16, y + h / 2 - 6, 32, 8, '#ef4444');
        }
      }
      drawPottedPlant(ctx, x + 32, y + h - 34);
      drawPottedPlant(ctx, x + w - 32, y + h - 34);
      if (pal.christmas) drawChristmasTree(ctx, x + w / 2, y + 58, tick);
      return;
    }

    // Room wall & frame
    px(ctx, x, y, w, h, pal.wallOuter);
    const isTileFloor = kind === 'common-copa' || kind === 'common-bath';

    // Pattern floor fill first
    const floorY = y + WALL_H;
    const floorH = h - WALL_H - 2;
    ctx.save();
    ctx.translate(x + 2, floorY);
    ctx.fillStyle = isTileFloor ? patterns.tile : patterns.wood;
    ctx.fillRect(0, 0, w - 4, floorH);
    ctx.restore();

    // 3/4 Architectural Wall rendered from 16x16 PNG Tileset Atlas
    const isModernWall = kind === 'common-lounge' || kind === 'gemini-web' || kind === 'github-hub';
    const baseWallKey = isModernWall ? 'wallAcoustic' : 'wallWainscot';
    const tileW = 20;
    let drewAtlasWall = false;
    for (let tx = x + 2; tx < x + w - 4; tx += tileW) {
      const colIdx = Math.round((tx - x) / tileW);
      let tileKey = baseWallKey;
      if (!isModernWall && (colIdx === 2 || colIdx === 12)) {
        tileKey = 'wallWindow';
      } else if (!isModernWall && colIdx === 4 && kind !== 'common-copa') {
        tileKey = 'wallPainting';
      }
      const dw = Math.min(tileW, x + w - 2 - tx);
      if (drawAtlasSprite(ctx, tileKey, tx, y + 2, dw, WALL_H - 2)) {
        drewAtlasWall = true;
        if (tileKey === 'wallWindow' && !pal.isNight) {
          px(ctx, tx + 2, floorY + 1, dw - 4, 16, 'rgba(254, 240, 138, 0.16)');
        }
      }
    }
    if (!drewAtlasWall) {
      px(ctx, x + 2, y + 2, w - 4, WALL_H - 2, pal.wallTop);
      px(ctx, x + 2, y + 18, w - 4, WALL_H - 18, pal.wallBottom);
      px(ctx, x + 2, y + WALL_H - 3, w - 4, 3, pal.wallOuter);
    }

    // Top wall ambient occlusion shadow on floor
    px(ctx, x + 2, floorY, w - 4, 6, 'rgba(0,0,0,0.16)');

    // Glass partition wall accents with diagonal cyan/white reflections on corridor side
    const glassY = isTop ? y + h - 4 : y;
    px(ctx, x + 12, glassY, w / 2 - 38, 4, '#0f172a');
    px(ctx, x + 14, glassY + 1, w / 2 - 42, 2, 'rgba(103, 232, 249, 0.45)');
    px(ctx, x + w / 2 + 26, glassY, w / 2 - 38, 4, '#0f172a');
    px(ctx, x + w / 2 + 28, glassY + 1, w / 2 - 42, 2, 'rgba(103, 232, 249, 0.45)');
    for (let gx = x + 24; gx < x + w - 28; gx += 36) {
      if (Math.abs(gx - (x + w / 2)) > 28) {
        px(ctx, gx, glassY + 1, 10, 1, 'rgba(255, 255, 255, 0.78)');
      }
    }

    // Open doorway into corridor
    const doorW = 44;
    const doorX = x + w / 2 - doorW / 2;
    const doorY = isTop ? y + h - 4 : y - 2;
    ctx.save();
    ctx.fillStyle = patterns.corridor;
    ctx.fillRect(doorX, doorY, doorW, 6);
    ctx.restore();

    // Christmas festive red carpet & tree
    if (pal.christmas) {
      px(ctx, x + 32, y + 74, w - 64, h - 102, '#991b1b');
      px(ctx, x + 36, y + 78, w - 72, h - 110, '#b91c1c');
      drawChristmasTree(ctx, x + w - 28, y + 56, tick);
    }

    // Obsidian hairline room nameplate
    const pillW = Math.min(w - 28, 204);
    const pillX = x + w / 2 - pillW / 2;
    const pillY = y + 7;
    const isGem = kind === 'gemini-web' || kind === 'gemini';
    const isGh = kind === 'github-hub';
    const accent =
      room.accentColor || (isGem ? '#a855f7' : isGh ? '#00d992' : '#5e6ad2');

    ctx.save();
    ctx.fillStyle = 'rgba(13, 14, 17, 0.94)';
    ctx.strokeStyle = '#23252a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(pillX, pillY, pillW, 19, 5);
    ctx.fill();
    ctx.stroke();
    px(ctx, pillX + 2, pillY + 1, pillW - 4, 1, 'rgba(255,255,255,0.1)');
    px(ctx, pillX + 4, pillY + 4, 3, 11, accent);

    ctx.fillStyle = '#f7f8f8';
    ctx.font = '600 10.5px Inter, "Segoe UI", sans-serif';
    ctx.textBaseline = 'middle';
    const countSuffix = room.members?.length ? ` · ${room.members.length}` : '';
    ctx.fillText((room.name + countSuffix).slice(0, 24), pillX + 12, pillY + 10);
    ctx.restore();

    if (!kind.startsWith('common-') && !isGh) {
      this.hitboxes.push({
        type: 'room',
        x: pillX,
        y: pillY,
        w: pillW,
        h: 19,
        room,
      });
    }

    if (kind === 'common-reception') {
      this.drawReceptionInterior(ctx, x, y, w, h, pal);
    } else if (kind === 'common-copa') {
      this.drawCopaInterior(ctx, x, y, tick);
    } else if (kind === 'common-bath') {
      this.drawBathroomInterior(ctx, x, y, activeCircles);
    } else if (kind === 'common-lounge') {
      this.drawLoungeInterior(ctx, x, y, pal, tick, unlocked, activeCircles);
    } else if (isGh) {
      this.drawGitHubPods(ctx, room);
    } else {
      this.drawProjectRoomInterior(ctx, room, pal, tick, unlocked);
    }

    if (room.constructingUntil && room.constructingUntil > Date.now()) {
      this.drawBuilderOverlay(ctx, room, tick);
    }
  }

  drawReceptionInterior(ctx, x, y, w, h, pal) {
    // Glowing wall sign & clock
    outlinedBox(ctx, x + 98, y + 27, 108, 15, '#0f1011', '#451a03');
    ctx.fillStyle = '#00d992';
    ctx.font = 'bold 9px Inter, Consolas, sans-serif';
    ctx.fillText('PIXEL OFFICE', x + 120, y + 35);
    drawTopDownSprite(ctx, 'clock', x + 226, y + 22, 18, 18);

    // Water cooler & top-down plants
    if (!drawTopDownSprite(ctx, 'water_dispenser', x + 62, y + 36, 22, 42)) {
      drawAtlasSprite(ctx, 'waterCooler', x + 64, y + 36, 22, 42);
    }
    drawPottedPlant(ctx, x + 26, y + 72);
    if (!pal.christmas) drawPottedPlant(ctx, x + w - 26, y + 72);

    // Woven crimson Persian rug with golden border in waiting lounge
    outlinedBox(ctx, x + 24, y + 114, 134, 72, '#991b1b', '#d97706');
    outlinedBox(ctx, x + 28, y + 118, 126, 64, '#b91c1c', '#fde047');
    px(ctx, x + 36, y + 126, 110, 48, '#7f1d1d');

    // Waiting lounge sofa + top-down coffee table with mug
    drawSofa(ctx, x + 46, y + 124, 86, 26, '#d97706');
    if (!drawTopDownSprite(ctx, 'coffee_table', x + 66, y + 160, 44, 22)) {
      outlinedBox(ctx, x + 64, y + 162, 50, 16, '#c88a51', '#451a03');
      px(ctx, x + 72, y + 165, 12, 8, '#38bdf8');
      px(ctx, x + 94, y + 166, 8, 6, '#fef08a');
    }
    drawTopDownSprite(ctx, 'mug', x + 82, y + 156, 16, 16);

    // Reception counter + open laptop + trash bin
    px(ctx, x + 178, y + 112, 92, 6, 'rgba(0,0,0,0.24)');
    if (!drawAtlasSprite(ctx, 'receptionDesk', x + 176, y + 66, 96, 52)) {
      outlinedBox(ctx, x + 176, y + 76, 92, 26, '#d97706', '#451a03');
    }
    drawTopDownSprite(ctx, 'laptop_open', x + 214, y + 64, 20, 20);
    drawTopDownSprite(ctx, 'trash_bin', x + 272, y + 86, 18, 18);
  }

  drawCopaInterior(ctx, x, y, tick) {
    // Woven kitchen runner mat + wall clock
    outlinedBox(ctx, x + 24, y + 84, 152, 16, '#0f766e', '#5eead4');
    drawTopDownSprite(ctx, 'clock', x + 24, y + 18, 18, 18);

    // Kitchen sink counter + Red Italian Espresso Bar + Double Stainless Fridge + Water dispenser
    if (!drawAtlasSprite(ctx, 'kitchenSink', x + 20, y + 36, 92, 48)) {
      outlinedBox(ctx, x + 20, y + 46, 92, 22, '#e2e8f0', '#475569');
    }
    if (!drawAtlasSprite(ctx, 'espressoBar', x + 116, y + 36, 62, 48)) {
      outlinedBox(ctx, x + 116, y + 40, 26, 30, '#ef4444', '#7f1d1d');
    }
    // Animated espresso steam
    px(ctx, x + 134, y + 34 - (tick % 3), 3, 3, 'rgba(248, 250, 252, 0.75)');
    drawAtlasSprite(ctx, 'fridge', x + 182, y + 32, 54, 52);
    if (!drawTopDownSprite(ctx, 'water_dispenser', x + 242, y + 38, 22, 42)) {
      drawAtlasSprite(ctx, 'waterCooler', x + 242, y + 38, 22, 42);
    }
    drawTopDownSprite(ctx, 'trash_bin', x + 270, y + 58, 18, 18);
    drawPottedPlant(ctx, x + 280, y + 98, true);

    // Communal oak dining table with chairs + Ghostpixxells Top-Down pixel dishes + coffee mug
    for (let sx = x + 78; sx < x + 224; sx += 34) {
      outlinedBox(ctx, sx, y + 106, 18, 10, '#b45309', '#451a03');
      px(ctx, sx + 2, y + 107, 14, 3, '#f59e0b');
      outlinedBox(ctx, sx, y + 164, 18, 10, '#b45309', '#451a03');
      px(ctx, sx + 2, y + 165, 14, 3, '#f59e0b');
    }
    px(ctx, x + 64, y + 160, 176, 6, 'rgba(0,0,0,0.24)');
    if (!drawAtlasSprite(ctx, 'diningTable', x + 62, y + 112, 180, 54)) {
      outlinedBox(ctx, x + 64, y + 118, 176, 32, '#c88a51', '#451a03');
    }
    drawTopDownSprite(ctx, 'mug', x + 68, y + 123, 16, 16);
    drawTopDownSprite(ctx, 'food_donut', x + 90, y + 119, 24, 24);
    drawTopDownSprite(ctx, 'food_burger', x + 120, y + 119, 24, 24);
    drawTopDownSprite(ctx, 'food_cake', x + 150, y + 119, 24, 24);
    drawTopDownSprite(ctx, 'food_cookies', x + 180, y + 119, 24, 24);
    drawTopDownSprite(ctx, 'food_pie', x + 208, y + 120, 22, 22);
  }

  drawBathroomInterior(ctx, x, y, activeCircles) {
    const mirrorCircle = activeCircles.find((c) => c.kind === 'mirror');
    // Teal vanity runner mat
    outlinedBox(ctx, x + 74, y + 66, 22, 92, '#0f766e', '#2dd4bf');

    for (let sy = y + 52; sy <= y + 108; sy += 54) {
      if (!drawAtlasSprite(ctx, 'bathVanity', x + 16, sy - 10, 52, 48)) {
        outlinedBox(ctx, x + 24, sy, 26, 20, '#f8fafc', '#64748b');
        outlinedBox(ctx, x + 16, sy - 12, 30, 11, '#57c1ff', '#0284c7');
      }
      if (mirrorCircle) {
        px(ctx, x + 38, sy - 3, 8, 8, '#f4c7a1');
        px(ctx, x + 40, sy - 1, 2, 2, '#0f172a');
        px(ctx, x + 44, sy - 1, 2, 2, '#0f172a');
      }
    }
    for (let sx = x + 138; sx < x + 276; sx += 46) {
      px(ctx, sx + 2, y + 106, 40, 5, 'rgba(0,0,0,0.2)');
      if (!drawAtlasSprite(ctx, 'bathStall', sx, y + 48, 42, 60)) {
        outlinedBox(ctx, sx, y + 54, 36, 52, '#cbd5e1', '#475569');
      }
    }
    drawPottedPlant(ctx, x + 34, y + 188);
    drawPottedPlant(ctx, x + 268, y + 188);
  }

  drawLoungeInterior(ctx, x, y, pal, tick, unlocked, activeCircles) {
    // Panoramic glowing Coral-Reef Aquarium built into Lounge wall
    drawAtlasSprite(ctx, 'aquarium', x + 14, y + 16, 62, 36);
    px(ctx, x + 16, y + 48, 58, 10, 'rgba(56, 189, 248, 0.22)');

    // Geometric teal & gold bordered Lounge rug
    outlinedBox(ctx, x + 18, y + 88, 134, 100, '#0f766e', '#14b8a6');
    outlinedBox(ctx, x + 22, y + 92, 126, 92, '#115e59', '#5eead4');
    px(ctx, x + 30, y + 100, 110, 76, '#134e4a');

    const tvCircle = activeCircles.find((c) => c.kind === 'tv');
    drawLoungeTV(ctx, x + 108, y + 46, tick, tvCircle?.show || 'futebol', true);
    drawSofa(ctx, x + 42, y + 132, 84, 26, '#3b82f6');
    // Top-Down coffee table + colorful poufs
    if (!drawTopDownSprite(ctx, 'coffee_table', x + 58, y + 102, 48, 22)) {
      outlinedBox(ctx, x + 56, y + 104, 54, 18, '#bae6fd', '#0284c7');
      px(ctx, x + 60, y + 107, 16, 4, 'rgba(255,255,255,0.65)');
    }
    outlinedBox(ctx, x + 46, y + 170, 16, 14, '#ef4444', '#7f1d1d');
    outlinedBox(ctx, x + 76, y + 170, 16, 14, '#3b82f6', '#1e3a8a');
    outlinedBox(ctx, x + 106, y + 170, 16, 14, '#eab308', '#713f12');

    drawBookcase(ctx, x + 164, y + 46);
    drawArcadeCabinet(ctx, x + 206, y + 42, tick, '#5b21b6', 'arcade_main');
    drawArcadeCabinet(ctx, x + 238, y + 42, tick + 3, '#7c3aed', 'arcade_pinball');
    drawArcadeCabinet(ctx, x + 268, y + 42, tick + 5, '#0284c7', 'arcade_main');
    drawTopDownSprite(ctx, 'coffee_table', x + 162, y + 108, 42, 22);
    drawTopDownSprite(ctx, 'mug', x + 175, y + 104, 16, 16);
    drawPottedPlant(ctx, x + 176, y + 148, true);

    const ppActive = activeCircles.some((c) => c.kind === 'pingpong');
    drawPingPongTable(ctx, x + 230, y + 162, tick, ppActive);
    drawFloorLamp(ctx, x + 26, y + 72, pal.isNight);
  }

  drawProjectRoomInterior(ctx, room, pal, tick, unlocked) {
    const { x, y, w, h, members = [], kind } = room;
    const isModern = kind === 'gemini-web' || kind === 'gemini';

    // Warm bordered studio carpet
    if (pal.christmas) {
      outlinedBox(ctx, x + 28, y + 66, w - 56, h - 88, '#991b1b', '#f59e0b');
    } else if (isModern) {
      outlinedBox(ctx, x + 28, y + 66, w - 56, h - 88, 'rgba(30, 41, 59, 0.55)', 'rgba(139, 92, 246, 0.45)');
      px(ctx, x + 32, y + 70, w - 64, h - 96, 'rgba(15, 23, 42, 0.35)');
    } else {
      outlinedBox(ctx, x + 28, y + 66, w - 56, h - 88, 'rgba(120, 53, 15, 0.24)', 'rgba(217, 119, 6, 0.45)');
      px(ctx, x + 32, y + 70, w - 64, h - 96, 'rgba(180, 83, 9, 0.16)');
    }

    // Top-Down whiteboard, clock, filing cabinet, server rack, bookcase, printer & trash bin
    if (!drawTopDownSprite(ctx, 'whiteboard', x + 22, y + 18, 44, 42)) {
      drawAtlasSprite(ctx, 'whiteboard', x + 18, y + 24, 72, 24);
    }
    drawTopDownSprite(ctx, 'clock', x + 106, y + 18, 18, 18);
    drawTopDownSprite(ctx, 'filing_cabinet', x + 150, y + 20, 20, 40);
    if (drawAtlasSprite(ctx, 'serverRack', x + 214, y + 20, 22, 42)) {
      px(ctx, x + 218, y + 28 + (tick % 4) * 5, 3, 2, tick % 2 === 0 ? '#00d992' : '#38bdf8');
    }
    drawBookcase(ctx, x + w - 54, y + 46);
    drawFloorLamp(ctx, x + 18, y + 68, pal.isNight);
    drawTopDownSprite(ctx, 'printer', x + 10, y + 116, 20, 20);
    drawTopDownSprite(ctx, 'trash_bin', x + w - 26, y + 116, 16, 16);
    drawPottedPlant(ctx, x + w - 24, y + h - 30);

    if (unlocked.has('aquarium')) {
      drawAtlasSprite(ctx, 'aquarium', x + 14, y + h - 46, 54, 34);
    }

    const deskSlots = this.getProjectDeskSlots(room);
    for (let i = 0; i < deskSlots.length; i += 1) {
      const slot = deskSlots[i];
      const occupant = members[i];
      const scrColor =
        !occupant || occupant.state === 'idle' || occupant.state === 'dreaming' || occupant.sleeping
          ? '#0f172a'
          : occupant.state === 'waiting'
            ? '#ffc533'
            : occupant.state === 'terminal'
              ? '#00d992'
              : '#57c1ff';
      drawWorkstation(ctx, slot.deskX, slot.deskY, scrColor, tick, Boolean(occupant && !occupant.sleeping), isModern);
      drawOfficeChair(ctx, slot.seatX, slot.seatY, slot.seatY < slot.deskY);
    }
  }

  getProjectDeskSlots(room) {
    const { x, y } = room;
    return [
      { deskX: x + 46, deskY: y + 92, seatX: x + 78, seatY: y + 80 },
      { deskX: x + 182, deskY: y + 92, seatX: x + 214, seatY: y + 80 },
      { deskX: x + 46, deskY: y + 156, seatX: x + 78, seatY: y + 174 },
      { deskX: x + 182, deskY: y + 156, seatX: x + 214, seatY: y + 174 },
    ];
  }

  drawGitHubPods(ctx, room) {
    const repos = (room.repos || []).slice(0, 6);
    const podW = 132;
    const podH = 48;
    repos.forEach((repo, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const px0 = room.x + 14 + col * (podW + 12);
      const py0 = room.y + WALL_H + 10 + row * 54;

      outlinedBox(ctx, px0, py0, podW, podH, '#0f1011', '#23252a');
      const kindColor =
        repo.kind === 'github'
          ? '#00d992'
          : repo.kind === 'git-local'
            ? '#57c1ff'
            : '#a855f7';
      px(ctx, px0 + 1, py0 + 1, podW - 2, 1, 'rgba(255,255,255,0.08)');
      px(ctx, px0, py0, 4, podH, kindColor);
      const led = !repo.exists ? '#62666d' : repo.dirtyCount > 0 ? '#ffc533' : '#00d992';
      px(ctx, px0 + podW - 11, py0 + 7, 5, 5, led);

      ctx.fillStyle = kindColor;
      ctx.font = 'bold 8.5px Inter, Consolas, sans-serif';
      ctx.fillText(repo.kind === 'github' ? 'GH' : repo.kind === 'git-local' ? 'GIT' : 'PRJ', px0 + 9, py0 + 14);

      ctx.fillStyle = '#f7f8f8';
      ctx.font = '600 10px Inter, "Segoe UI", sans-serif';
      ctx.fillText(repo.name.slice(0, 14), px0 + 34, py0 + 14);

      ctx.fillStyle = '#8a8f98';
      ctx.font = '9px Inter, Consolas, sans-serif';
      ctx.fillText((repo.branch || repo.sourceProjectName || 'projeto').slice(0, 19), px0 + 9, py0 + 34);

      this.hitboxes.push({ type: 'repo', x: px0, y: py0, w: podW, h: podH, repo });
    });
  }

  drawBuilderOverlay(ctx, room, tick) {
    const cx = room.x + room.w / 2;
    const cy = room.y + room.h / 2;
    px(ctx, room.x + 12, room.y + WALL_H + 4, room.w - 24, 4, '#ffc533');
    const swing = tick % 4 < 2 ? -5 : 2;
    outlinedBox(ctx, cx - 7, cy - 12, 14, 12, '#f1c29b');
    outlinedBox(ctx, cx - 9, cy - 17, 18, 6, '#facc15');
    outlinedBox(ctx, cx - 8, cy, 16, 12, '#f97316');
    px(ctx, cx + 8, cy - 2 + swing, 4, 8, '#94a3b8');
    px(ctx, cx + 6, cy - 6 + swing, 8, 4, '#cbd5e1');
    drawSpeechBubble(ctx, cx, cy - 22, 'Construindo sala!', 'waiting');
  }

  drawAllAgents(ctx, layout, roomsById, pal, tick, now) {
    const { allRooms, corridorMidY } = layout;

    for (const room of allRooms) {
      if (!room.members || room.members.length === 0) continue;
      const slots = this.getProjectDeskSlots(room);

      room.members.forEach((agent, idx) => {
        const slot = slots[idx % slots.length];
        const socialTarget =
          agent.state === 'idle' && !agent.sleeping && this.social
            ? this.social.getTargetForAgent(agent.id)
            : null;

        let targetRoom = room;
        let targetX = slot.seatX;
        let targetY = slot.seatY;
        let seated = true;

        if (agent.sleeping) {
          targetRoom = room;
          targetX = slot.seatX;
          targetY = slot.seatY;
          seated = true;
        } else if (socialTarget && roomsById.has(socialTarget.roomId)) {
          targetRoom = roomsById.get(socialTarget.roomId);
          targetX = socialTarget.x;
          targetY = socialTarget.y;
          seated = false;
        } else if (agent.state === 'dreaming') {
          targetRoom = roomsById.get('common:lounge') || room;
          targetX = targetRoom.x + 70 + (idx % 3) * 28;
          targetY = targetRoom.y + 148;
          seated = false;
        } else if (agent.state === 'reading') {
          targetX = room.x + room.w - 60;
          targetY = room.y + WALL_H + 46;
          seated = false;
        } else if (agent.state === 'idle') {
          targetRoom = roomsById.get('common:copa') || room;
          targetX = targetRoom.x + 92 + (idx % 3) * 38;
          targetY = targetRoom.y + 140;
          seated = false;
        }

        const prev = this.agentMotion.get(agent.id) || {
          roomId: targetRoom.id,
          x: targetX,
          y: targetY,
          dir: 1,
        };
        const next = this.moveAlongCorridor(
          prev,
          targetRoom,
          targetX,
          targetY,
          corridorMidY,
          roomsById
        );
        this.agentMotion.set(agent.id, next);

        const personality = getAgentPersonality(agent);
        const shellElapsedSec =
          agent.toolStartedAt && !['idle', 'done', 'dreaming'].includes(agent.state)
            ? Math.floor((now - agent.toolStartedAt) / 1000)
            : 0;

        if (this.selectedAgentId === agent.id) {
          ctx.save();
          ctx.strokeStyle = '#5e6ad2';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.roundRect(Math.round(next.x - 16), Math.round(next.y - 26), 32, 43, 6);
          ctx.stroke();
          ctx.restore();
        }

        drawChibiAvatar(ctx, next.x, next.y, agent, {
          tick,
          walking: next.moving,
          dir: socialTarget?.facingDir || next.dir,
          christmas: Boolean(pal.christmas),
          seated: seated && !next.moving,
          shellElapsedSec,
        });

        if (agent.state === 'subagents' && agent.subagentDetails?.length) {
          agent.subagentDetails.slice(0, 2).forEach((sub, sIdx) => {
            const sx = next.x + (sIdx === 0 ? -32 : 32);
            const sy = next.y + 8;
            drawChibiAvatar(
              ctx,
              sx,
              sy,
              { id: sub.id, personaName: sub.name, source: 'antigravity', state: 'coding' },
              { tick: tick + sIdx, scale: 0.78, seated: true, christmas: Boolean(pal.christmas) }
            );
            drawNamePill(ctx, sx, sy + 13, sub.name, 'S', '#c084fc');
          });
        }

        const badgeChar = agent.source === 'gemini-web' ? '✦' : 'A';
        const badgeColor = agent.source === 'gemini-web' ? '#c084fc' : '#57c1ff';
        drawNamePill(ctx, next.x, next.y + 15, personality.displayName, badgeChar, badgeColor);

        const socialBubble = this.social?.getAgentBubble(agent.id, now);
        if (agent.state === 'waiting') {
          drawSpeechBubble(ctx, next.x, next.y - 24, agent.toolSummary || 'Precisa de você!', 'waiting');
        } else if (agent.state === 'dreaming') {
          drawSpeechBubble(ctx, next.x, next.y - 45, 'Consolidando memórias', 'dreaming');
        } else if (agent.state === 'error') {
          drawSpeechBubble(ctx, next.x, next.y - 24, 'Erro na execução!', 'error');
        } else if (socialBubble) {
          drawSpeechBubble(ctx, next.x, next.y - 24, socialBubble.text, socialBubble.kind);
        } else if (!next.moving && !['idle', 'done'].includes(agent.state)) {
          const text = agent.toolSummary
            ? `${STATE_LABELS_PT[agent.state]} ${agent.toolSummary}`
            : STATE_LABELS_PT[agent.state] || agent.state;
          drawSpeechBubble(ctx, next.x, next.y - 24, text, 'work');
        }

        this.hitboxes.push({
          type: 'agent',
          x: next.x - 18,
          y: next.y - 28,
          w: 36,
          h: 56,
          agent,
        });
      });
    }
  }

  drawRoamingPet(ctx, layout, pal, tick, now) {
    const petType = this.snapshot?.prefs?.petType || 'cyberfox';
    if (petType === 'none') return;

    const agents = layout.filteredAgents;
    const waiting = agents.find((a) => a.state === 'waiting' || a.state === 'error');
    const dreaming = agents.find((a) => a.state === 'dreaming');
    const done = agents.find((a) => a.state === 'done');
    const active = agents.filter((a) => !['idle', 'offline'].includes(a.state)).length;

    let mood = 'walk';
    if (now < this.petMotion.reactionUntil || done) mood = 'happy';
    else if (waiting) {
      mood = 'alert';
      const m = this.agentMotion.get(waiting.id);
      if (m) {
        this.petMotion.targetX = m.x - 24;
        this.petMotion.targetY = m.y + 8;
      }
    } else if (dreaming) {
      mood = 'dream';
      const m = this.agentMotion.get(dreaming.id);
      if (m) {
        this.petMotion.targetX = m.x + 24;
        this.petMotion.targetY = m.y + 8;
      }
    } else if (active === 0 && agents.length > 0) {
      mood = 'sleep';
    } else if (now >= this.petMotion.nextRoamAt) {
      this.petMotion.targetX =
        layout.bx + 44 + (Math.random() * Math.max(120, layout.buildingW - 88));
      this.petMotion.targetY = layout.corridorMidY + 4;
      this.petMotion.nextRoamAt = now + 5000;
    }

    if (!this.reducedMotion) {
      const dx = this.petMotion.targetX - this.petMotion.x;
      const dy = this.petMotion.targetY - this.petMotion.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 2) {
        const step = Math.min(dist, 58 * (this.dt || 0.016));
        this.petMotion.x += (dx / dist) * step;
        this.petMotion.y += (dy / dist) * step;
        if (Math.abs(dx) > 0.6) this.petMotion.dir = dx >= 0 ? 1 : -1;
      } else if (mood === 'walk') {
        mood = active > 0 ? 'happy' : 'sleep';
      }
    }

    drawPetSprite(
      ctx,
      this.petMotion.x,
      this.petMotion.y,
      petType,
      mood,
      tick,
      this.petMotion.dir,
      1.18
    );

    this.hitboxes.push({
      type: 'pet',
      x: this.petMotion.x - 16,
      y: this.petMotion.y - 20,
      w: 32,
      h: 30,
      petType,
    });
  }
}
