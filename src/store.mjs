import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DATA_DIR, PrefsStore } from './prefs-store.mjs';
import { ProjectsScanner } from './projects-scanner.mjs';

const STORE_DIRNAME = path.dirname(fileURLToPath(import.meta.url));
export const PLUGIN_ROOT = path.resolve(STORE_DIRNAME, '..');
export const EXTENSION_DIR = path.join(PLUGIN_ROOT, 'chrome-extension');

export { DATA_DIR };
export const EVENTS_FILE = path.join(DATA_DIR, 'events.jsonl');
export const SNAPSHOT_FILE = path.join(DATA_DIR, 'snapshot.json');
export const BRIDGE_PORT = Number(process.env.PIXEL_OFFICE_PORT || 4748);

const MAX_EVENTS_BYTES = 2 * 1024 * 1024;
const KEEP_COMPACT_LINES = 400;
const BRAIN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const OFFICE_ACTIVE_AGE_MS = 24 * 60 * 60 * 1000;
const BRAIN_MAX_DIRS = 60;
const GEMINI_OFFLINE_MS = 5 * 60 * 1000;
const DONE_TO_IDLE_MS = 45 * 1000;
const SLEEP_IDLE_MS = 5 * 60 * 1000;
const WAIT_THRESHOLD_MS = 8 * 1000;
const CONSTRUCTION_DURATION_MS = 4500;
const DREAM_DURATION_MS = 18000;
const KNOWLEDGE_RECENT_MS = 90000;
const FEED_LIMIT = 40;
const TIMELINE_LIMIT = 180;

const BRAZILIAN_NAMES = [
  'Rafaela',
  'Isabela',
  'Vicente',
  'Bianca',
  'Jonas',
  'Aline',
  'Marina',
  'Henrique',
  'Luan',
  'Sabrina',
  'Joaquim',
  'Enzo',
  'Lia',
  'Bruna',
  'Iara',
  'Danilo',
  'Camila',
  'Mateus',
  'Letícia',
  'Tiago',
];

export function assignAgentPersonaName(id) {
  const str = String(id || 'agent');
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return BRAZILIAN_NAMES[(h >>> 0) % BRAZILIAN_NAMES.length];
}

const CODING_TOOLS = new Set([
  'write_file',
  'write_to_file',
  'edit_file',
  'replace_file_content',
  'multi_replace_file_content',
]);

const READING_TOOLS = new Set([
  'read_file',
  'view_file',
  'list_dir',
  'find_by_name',
  'grep_search',
  'search_web',
  'read_url_content',
  'search_marketplace',
]);

const TERMINAL_TOOLS = new Set(['run_command', 'manage_task', 'schedule']);

const SUBAGENT_TOOLS = new Set([
  'invoke_subagent',
  'define_subagent',
  'swarm',
  'send_message',
  'run_workflow',
]);

const WAITING_TOOLS = new Set(['ask_question', 'ask_permission']);

export function mapToolToState(toolName) {
  if (!toolName) return 'coding';
  if (WAITING_TOOLS.has(toolName)) return 'waiting';
  if (CODING_TOOLS.has(toolName)) return 'coding';
  if (READING_TOOLS.has(toolName)) return 'reading';
  if (TERMINAL_TOOLS.has(toolName)) return 'terminal';
  if (SUBAGENT_TOOLS.has(toolName)) return 'subagents';
  return 'coding';
}

function mapToolCategory(toolName) {
  const s = mapToolToState(toolName);
  if (s === 'reading' || s === 'terminal' || s === 'subagents') return s;
  if (s === 'waiting') return 'thinking';
  return 'coding';
}

export function cleanUserText(raw) {
  if (typeof raw !== 'string' || !raw.trim()) return '';
  let text = raw;
  const userReqMatch = text.match(/<USER_REQUEST>\s*([\s\S]*?)\s*<\/USER_REQUEST>/i);
  if (userReqMatch) {
    text = userReqMatch[1];
  } else {
    text = text.replace(/<ADDITIONAL_METADATA>[\s\S]*?<\/ADDITIONAL_METADATA>/gi, '');
    text = text.replace(/<USER_SETTINGS_CHANGE>[\s\S]*?<\/USER_SETTINGS_CHANGE>/gi, '');
    text = text.replace(/<\/?USER_REQUEST>/gi, '');
  }
  text = text.replace(/\s+/g, ' ').trim();
  return text.length > 240 ? `${text.slice(0, 237)}...` : text;
}

function unquoteJsonArg(val) {
  if (typeof val !== 'string') return '';
  const trimmed = val.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith('[') && trimmed.endsWith(']'))
  ) {
    try {
      const parsed = JSON.parse(trimmed);
      if (typeof parsed === 'string') return parsed;
      if (Array.isArray(parsed)) return parsed.join(', ');
    } catch {
      // fall back to raw
    }
  }
  return trimmed;
}

function extractToolSummaryFromArgs(args) {
  if (!args || typeof args !== 'object') return '';
  const keys = [
    'Role',
    'Path',
    'AbsolutePath',
    'TargetFile',
    'CommandLine',
    'DirectoryPath',
    'Query',
    'query',
    'Url',
    'ToolName',
    'Pattern',
    'toolSummary',
  ];
  for (const key of keys) {
    if (args[key] !== undefined) {
      const text = unquoteJsonArg(String(args[key])).replace(/\s+/g, ' ').trim();
      if (text) return text.length > 90 ? `${text.slice(0, 87)}...` : text;
    }
  }
  return '';
}

function shortProjectName(workspacePaths, cwd) {
  const candidate =
    (Array.isArray(workspacePaths) && workspacePaths.find((p) => p && p.trim())) ||
    (typeof cwd === 'string' && cwd.trim()) ||
    '';
  if (!candidate) return 'Sem Workspace';
  const cleaned = candidate.replace(/[\\/]+$/, '');
  const base = path.basename(cleaned);
  return base || cleaned;
}

function isUuidLike(name) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(name);
}

function getBrainDirs() {
  if (process.env.PIXEL_OFFICE_BRAIN_DIRS) {
    return process.env.PIXEL_OFFICE_BRAIN_DIRS.split(path.delimiter).filter(Boolean);
  }
  const home = os.homedir();
  return [
    path.join(home, '.gemini', 'antigravity', 'brain'),
    path.join(home, '.gemini', 'antigravity-ide', 'brain'),
  ];
}

function estimateStepCostUsd(model, inTok, cacheTok, outTok) {
  const isFlash = /flash|lite/i.test(model || '');
  const inRate = isFlash ? 0.3 : 1.25;
  const cacheRate = isFlash ? 0.075 : 0.31;
  const outRate = isFlash ? 2.5 : 10.0;
  return (
    (inTok * inRate + cacheTok * cacheRate + outTok * outRate) /
    1_000_000
  );
}

function computeUnlockedFurniture(level) {
  const items = ['coffee', 'plant'];
  if (level >= 2) items.push('whiteboard', 'server');
  if (level >= 3) items.push('aquarium');
  if (level >= 4) items.push('espresso');
  if (level >= 5) items.push('arcade');
  if (level >= 6) items.push('trophies');
  return items;
}

function matchWorkspaceToRepo(workspacePath, repos) {
  if (!workspacePath || !Array.isArray(repos) || repos.length === 0) return null;
  const normWs = path.resolve(workspacePath).toLowerCase();
  let best = null;
  for (const repo of repos) {
    if (!repo.path) continue;
    const normRepo = path.resolve(repo.path).toLowerCase();
    if (
      normWs === normRepo ||
      normWs.startsWith(normRepo + path.sep) ||
      normRepo.startsWith(normWs + path.sep)
    ) {
      if (!best || normRepo.length > best.path.length) {
        best = repo;
      }
    }
  }
  return best;
}

export class OfficeStore {
  constructor(options = {}) {
    this.dataDir = options.dataDir || DATA_DIR;
    this.eventsFile = path.join(this.dataDir, 'events.jsonl');
    this.snapshotFile = path.join(this.dataDir, 'snapshot.json');
    this.bridgePort = Number(options.bridgePort || BRIDGE_PORT);
    this.prefsStore = new PrefsStore({ dataDir: this.dataDir });
    this.projectsScanner = new ProjectsScanner();

    this.eventsOffset = 0;
    this.eventsPartial = '';
    this.hookSessions = new Map();
    this.geminiSessions = new Map();
    this.geminiMessageEvents = [];
    this.transcriptCache = new Map();
    this.feed = [];
    this.eventTimeline = [];
    this.prunedBefore = 0;
    this.hiddenSessionIds = new Set();
    this.seenEventKeys = new Set();
    this.bootedAt = Date.now();
    this.roomFirstSeen = new Map();
    this.initializedRooms = false;
    this.dreamingUntil = 0;
    this.dreamingTargetId = null;
    this.dreamingLabel = '';
    this.lastKnowledgeCheckAt = 0;
    this.lastKnowledgeMaxMtimeMs = 0;

    this.ensureDataDir();
    this.loadSnapshotSeed();
    this.syncEvents();
  }

  ensureDataDir() {
    try {
      fs.mkdirSync(this.dataDir, { recursive: true });
    } catch {
      // ignore
    }
  }

  loadSnapshotSeed() {
    try {
      if (!fs.existsSync(this.snapshotFile)) return;
      const raw = fs.readFileSync(this.snapshotFile, 'utf8');
      const data = JSON.parse(raw);
      if (data && typeof data === 'object' && typeof data.prunedBefore === 'number') {
        this.prunedBefore = data.prunedBefore;
      }
    } catch {
      // ignore corrupted seed
    }
  }

  appendEventToDisk(record) {
    try {
      this.ensureDataDir();
      fs.appendFileSync(this.eventsFile, `${JSON.stringify(record)}\n`, 'utf8');
    } catch {
      // ignore write failure
    }
  }

  pushFeed(entry) {
    this.feed.unshift(entry);
    if (this.feed.length > FEED_LIMIT) {
      this.feed.length = FEED_LIMIT;
    }
  }

  pushTimeline(entry) {
    this.eventTimeline.push(entry);
    if (this.eventTimeline.length > 500) {
      this.eventTimeline.splice(0, this.eventTimeline.length - 400);
    }
  }

  syncEvents() {
    let stat;
    try {
      if (!fs.existsSync(this.eventsFile)) return false;
      stat = fs.statSync(this.eventsFile);
    } catch {
      return false;
    }

    if (stat.size < this.eventsOffset) {
      this.eventsOffset = 0;
      this.eventsPartial = '';
      this.hookSessions.clear();
      this.geminiSessions.clear();
      this.geminiMessageEvents = [];
      this.feed = [];
      this.eventTimeline = [];
      this.seenEventKeys.clear();
    }

    if (stat.size === this.eventsOffset) {
      return false;
    }

    let changed = false;
    try {
      const length = stat.size - this.eventsOffset;
      const fd = fs.openSync(this.eventsFile, 'r');
      try {
        const buffer = Buffer.allocUnsafe(length);
        const bytesRead = fs.readSync(fd, buffer, 0, length, this.eventsOffset);
        this.eventsOffset += bytesRead;
        const text = this.eventsPartial + buffer.toString('utf8', 0, bytesRead);
        const lines = text.split('\n');
        this.eventsPartial = lines.pop() ?? '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            const record = JSON.parse(trimmed);
            this.applyEventRecord(record, { persist: false });
            changed = true;
          } catch {
            // ignore malformed JSONL line
          }
        }
      } finally {
        fs.closeSync(fd);
      }

      if (stat.size > MAX_EVENTS_BYTES) {
        this.compactEventsFile();
      }
    } catch {
      // ignore read race
    }
    return changed;
  }

  compactEventsFile() {
    try {
      const content = fs.readFileSync(this.eventsFile, 'utf8');
      const lines = content.split('\n').filter((l) => l.trim().length > 0);
      const tail = lines.slice(-KEEP_COMPACT_LINES);
      const tmp = `${this.eventsFile}.tmp.${process.pid}`;
      const body = tail.length ? `${tail.join('\n')}\n` : '';
      fs.writeFileSync(tmp, body, 'utf8');
      fs.renameSync(tmp, this.eventsFile);
      this.eventsOffset = Buffer.byteLength(body, 'utf8');
      this.eventsPartial = '';
    } catch {
      // ignore compaction errors
    }
  }

  applyEventRecord(record, { persist = false } = {}) {
    if (!record || typeof record !== 'object') return;
    if (record.source !== 'gemini-web') {
      const dedupKey = record.eventId
        ? `id:${record.eventId}`
        : `${record.source || ''}|${record.event || ''}|${record.conversationId || record.id || ''}|${record.toolId || ''}|${record.ts || ''}`;
      if (this.seenEventKeys.has(dedupKey)) return;
      this.seenEventKeys.add(dedupKey);
      if (this.seenEventKeys.size > 600) {
        const first = this.seenEventKeys.values().next().value;
        if (first !== undefined) this.seenEventKeys.delete(first);
      }
    }
    if (persist) {
      this.appendEventToDisk(record);
      try {
        if (fs.existsSync(this.eventsFile)) {
          this.eventsOffset = fs.statSync(this.eventsFile).size;
          this.eventsPartial = '';
        }
      } catch {
        // ignore
      }
    }

    if (record.source === 'gemini-web') {
      this.applyGeminiRecord(record);
      return;
    }

    if (record.event === 'ClearOffline') {
      this.prunedBefore = Math.max(this.prunedBefore, Number(record.ts || Date.now()));
      if (Array.isArray(record.hiddenIds)) {
        for (const id of record.hiddenIds) {
          this.hiddenSessionIds.add(id);
          this.geminiSessions.delete(id);
        }
      }
      return;
    }

    this.applyAntigravityRecord(record);
  }

  applyAntigravityRecord(record) {
    const convId =
      typeof record.conversationId === 'string' && record.conversationId.trim()
        ? record.conversationId.trim()
        : '';
    if (!convId) return;

    this.hiddenSessionIds.delete(convId);
    const ts = Number(record.ts || Date.now());
    let session = this.hookSessions.get(convId);
    if (!session) {
      session = {
        id: convId,
        source: 'antigravity',
        workspacePaths: [],
        cwd: '',
        room: 'Sem Workspace',
        model: '',
        lastUserInput: '',
        state: 'idle',
        currentTool: '',
        toolSummary: '',
        toolStartedAt: null,
        pendingToolId: '',
        recentTools: [],
        subagents: [],
        startedAt: ts,
        lastActivityAt: ts,
        lastHookEvent: '',
        transcriptPath: '',
        errorMessage: '',
        hookToolCount: 0,
      };
      this.hookSessions.set(convId, session);
    }

    if (Array.isArray(record.workspacePaths) && record.workspacePaths.length > 0) {
      session.workspacePaths = record.workspacePaths;
    }
    if (record.cwd) session.cwd = record.cwd;
    const resolvedRoom = shortProjectName(session.workspacePaths, session.cwd);
    if (resolvedRoom !== 'Sem Workspace' || session.room === 'Sem Workspace') {
      session.room = resolvedRoom;
    }
    if (record.modelName) session.model = record.modelName;
    if (record.lastUserInput) session.lastUserInput = cleanUserText(record.lastUserInput);
    if (record.transcriptPath) session.transcriptPath = record.transcriptPath;
    session.lastActivityAt = Math.max(session.lastActivityAt, ts);
    session.lastHookEvent = record.event || '';

    const evt = record.event;
    if (evt === 'SessionStart') {
      session.state = 'thinking';
      session.currentTool = '';
      session.toolSummary = '';
      session.toolStartedAt = null;
      session.errorMessage = '';
      this.pushFeed({
        ts,
        source: 'antigravity',
        agentId: convId,
        label: session.room,
        state: 'thinking',
        message: 'Sessão iniciada no Antigravity',
      });
      this.pushTimeline({
        ts,
        source: 'antigravity',
        agentId: convId,
        room: session.room,
        state: 'thinking',
        toolName: '',
        summary: 'Sessão iniciada',
      });
    } else if (evt === 'PreInvocation') {
      session.state = 'thinking';
      session.currentTool = '';
      session.toolSummary = '';
      session.toolStartedAt = null;
      session.errorMessage = '';
    } else if (evt === 'PreToolUse') {
      const toolName = record.toolName || 'tool';
      const nextState = mapToolToState(toolName);
      session.state = nextState;
      session.currentTool = toolName;
      session.toolSummary = record.toolSummary || '';
      session.toolStartedAt = ts;
      session.pendingToolId = record.toolId || '';
      session.hookToolCount += 1;
      session.recentTools.unshift({
        name: toolName,
        summary: record.toolSummary || '',
        ts,
        error: false,
      });
      if (session.recentTools.length > 10) session.recentTools.length = 10;

      if (toolName === 'invoke_subagent' && record.toolSummary) {
        if (!session.subagents.includes(record.toolSummary)) {
          session.subagents.push(record.toolSummary);
          if (session.subagents.length > 6) session.subagents.shift();
        }
      }

      this.pushFeed({
        ts,
        source: 'antigravity',
        agentId: convId,
        label: session.room,
        state: nextState,
        message: record.toolSummary ? `${toolName}: ${record.toolSummary}` : toolName,
      });
      this.pushTimeline({
        ts,
        source: 'antigravity',
        agentId: convId,
        room: session.room,
        state: nextState,
        toolName,
        summary: record.toolSummary || toolName,
      });
    } else if (evt === 'PostToolUse') {
      session.toolStartedAt = null;
      session.pendingToolId = '';
      if (record.toolError) {
        session.state = 'error';
        session.errorMessage = String(record.toolError).slice(0, 140);
        if (session.recentTools[0]) session.recentTools[0].error = true;
      } else {
        session.state = 'thinking';
        session.errorMessage = '';
      }
    } else if (evt === 'PostInvocation') {
      if (session.state !== 'error') {
        session.state = 'thinking';
      }
    } else if (evt === 'Stop') {
      session.toolStartedAt = null;
      session.currentTool = '';
      session.toolSummary = '';
      if (record.toolError || record.terminationReason === 'ERROR') {
        session.state = 'error';
        session.errorMessage = record.toolError || 'Erro na execução';
      } else {
        session.state = 'done';
        session.errorMessage = '';
      }
      this.pushFeed({
        ts,
        source: 'antigravity',
        agentId: convId,
        label: session.room,
        state: session.state,
        message:
          session.state === 'error'
            ? `Erro: ${session.errorMessage}`
            : 'Turno concluído',
      });
      this.pushTimeline({
        ts,
        source: 'antigravity',
        agentId: convId,
        room: session.room,
        state: session.state,
        toolName: '',
        summary: session.state === 'error' ? session.errorMessage : 'Concluído',
      });
    }
  }

  applyGeminiRecord(record) {
    const tabId = record.tabId != null ? String(record.tabId) : '';
    const rawId = record.id || (tabId ? `gemini-tab-${tabId}` : '');
    if (!rawId) return;

    const ts = Number(record.ts || Date.now());
    const evt = record.event || 'heartbeat';

    if (evt === 'tab_closed') {
      const existing = this.geminiSessions.get(rawId);
      if (existing) {
        existing.state = 'offline';
        existing.lastActivityAt = ts;
        existing.closedAt = ts;
        this.pushFeed({
          ts,
          source: 'gemini-web',
          agentId: rawId,
          label: existing.title || 'Gemini Web',
          state: 'offline',
          message: 'Aba do Gemini Web fechada',
        });
        this.pushTimeline({
          ts,
          source: 'gemini-web',
          agentId: rawId,
          room: 'Gemini Web',
          state: 'offline',
          toolName: '',
          summary: 'Aba fechada',
        });
      }
      return;
    }

    this.hiddenSessionIds.delete(rawId);
    let session = this.geminiSessions.get(rawId);
    const prevState = session?.state;
    const prevTurnCount = session?.turnCount || 0;
    if (!session) {
      session = {
        id: rawId,
        source: 'gemini-web',
        tabId: tabId ? Number(tabId) : null,
        room: 'Gemini Web',
        title: 'Gemini Web',
        url: 'https://gemini.google.com/app',
        model: 'Gemini Web',
        state: 'idle',
        turnCount: 0,
        lastUserInput: '',
        startedAt: ts,
        lastActivityAt: ts,
        lastHeartbeatAt: ts,
        closedAt: null,
      };
      this.geminiSessions.set(rawId, session);
    }

    if (record.title) session.title = String(record.title).slice(0, 120);
    if (record.url) session.url = String(record.url);
    if (record.model) session.model = String(record.model).slice(0, 60);
    if (typeof record.promptPreview === 'string' && record.promptPreview.trim()) {
      session.lastUserInput = record.promptPreview.trim().slice(0, 240);
    }
    if (typeof record.responseCount === 'number') {
      session.turnCount = Math.max(session.turnCount, record.responseCount);
    }

    const nextState = ['thinking', 'typing', 'done', 'idle', 'error'].includes(record.state)
      ? record.state
      : 'idle';

    const hadActivity =
      evt !== 'heartbeat' ||
      prevState !== nextState ||
      ['thinking', 'typing', 'done'].includes(nextState) ||
      session.turnCount > prevTurnCount;

    session.state = nextState;
    session.lastHeartbeatAt = ts;
    if (hadActivity) {
      session.lastActivityAt = ts;
    }
    session.closedAt = null;

    if (
      (nextState === 'thinking' && prevState !== 'thinking') ||
      session.turnCount > prevTurnCount
    ) {
      this.geminiMessageEvents.push({ ts, id: rawId });
      if (this.geminiMessageEvents.length > 1000) {
        this.geminiMessageEvents.splice(0, this.geminiMessageEvents.length - 500);
      }
    }

    if (prevState !== nextState && (nextState === 'thinking' || nextState === 'done')) {
      this.pushFeed({
        ts,
        source: 'gemini-web',
        agentId: rawId,
        label: session.title || 'Gemini Web',
        state: nextState,
        message:
          nextState === 'thinking'
            ? `Respondendo em "${session.title}"`
            : `Resposta concluída em "${session.title}"`,
      });
      this.pushTimeline({
        ts,
        source: 'gemini-web',
        agentId: rawId,
        room: 'Gemini Web',
        state: nextState,
        toolName: 'generate_response',
        summary: session.title || 'Gemini Web',
      });
    }
  }

  ingestHookEvent(payload) {
    this.syncEvents();
    this.applyEventRecord(
      { ...payload, source: 'antigravity', ts: payload.ts || Date.now() },
      { persist: false }
    );
    return this.getSnapshot();
  }

  ingestGeminiEvent(payload) {
    this.syncEvents();
    const record = {
      ts: Number(payload.ts || Date.now()),
      source: 'gemini-web',
      event: payload.event || 'state_change',
      tabId: payload.tabId,
      id: payload.id,
      title: payload.title || 'Gemini Web',
      url: payload.url || 'https://gemini.google.com/app',
      model: payload.model || 'Gemini Web',
      state: payload.state || 'idle',
      promptPreview: payload.promptPreview || '',
      responseCount:
        typeof payload.responseCount === 'number' ? payload.responseCount : undefined,
    };
    this.applyEventRecord(record, { persist: true });
    return this.getSnapshot();
  }

  updatePrefs(patch) {
    this.prefsStore.update(patch);
    return this.getSnapshot();
  }

  manageRoom(body = {}) {
    if (body.action === 'delete' && body.id) {
      this.prefsStore.deleteRoom(body.id);
    } else if (body.action === 'create') {
      const room = this.prefsStore.createRoom(body);
      this.roomFirstSeen.set(room.id, room.createdAt);
    } else if (body.action === 'rename' && body.id) {
      this.prefsStore.update({
        roomOverrides: {
          [body.id]: {
            displayName: body.name ?? body.displayName,
            accentColor: body.accentColor,
            kind: body.kind,
          },
        },
      });
    } else if (body.action === 'reset' && body.id) {
      this.prefsStore.update({ roomOverrides: { [body.id]: null } });
    }
    return this.getSnapshot();
  }

  manageKanban(body = {}) {
    this.prefsStore.upsertKanban(body);
    return this.getSnapshot();
  }

  refreshRepos() {
    const prefs = this.prefsStore.get();
    this.projectsScanner.scan({ extraPaths: prefs.extraRepoPaths, force: true });
    return this.getSnapshot();
  }

  checkKnowledgeUpdated(now) {
    if (now - this.lastKnowledgeCheckAt < 5000) {
      return now - this.lastKnowledgeMaxMtimeMs < KNOWLEDGE_RECENT_MS;
    }
    this.lastKnowledgeCheckAt = now;
    const knowledgeDir = path.join(os.homedir(), '.gemini', 'antigravity', 'knowledge');
    let maxMtime = 0;
    try {
      if (fs.existsSync(knowledgeDir)) {
        const stat = fs.statSync(knowledgeDir);
        maxMtime = Math.max(maxMtime, stat.mtimeMs);
        const entries = fs.readdirSync(knowledgeDir, { withFileTypes: true });
        for (const entry of entries) {
          try {
            const st = fs.statSync(path.join(knowledgeDir, entry.name));
            maxMtime = Math.max(maxMtime, st.mtimeMs);
          } catch {
            // ignore entry stat error
          }
        }
      }
    } catch {
      // ignore knowledge dir error
    }
    this.lastKnowledgeMaxMtimeMs = maxMtime;
    return maxMtime > 0 && now - maxMtime < KNOWLEDGE_RECENT_MS;
  }

  consolidateMemory({ agentId } = {}) {
    const now = Date.now();

    // 1. Compact events.jsonl to keep only recent history
    let compactedLines = 0;
    try {
      if (fs.existsSync(this.eventsFile)) {
        const content = fs.readFileSync(this.eventsFile, 'utf8');
        const lines = content.split('\n').filter((l) => l.trim().length > 0);
        if (lines.length > KEEP_COMPACT_LINES) {
          compactedLines = lines.length - KEEP_COMPACT_LINES;
          const tail = lines.slice(-KEEP_COMPACT_LINES);
          const tmp = `${this.eventsFile}.tmp.${process.pid}`;
          const body = `${tail.join('\n')}\n`;
          fs.writeFileSync(tmp, body, 'utf8');
          fs.renameSync(tmp, this.eventsFile);
          this.eventsOffset = Buffer.byteLength(body, 'utf8');
          this.eventsPartial = '';
        }
      }
    } catch {
      // ignore compaction error
    }

    // 2. Evict transcript cache older than 7 days
    let prunedCache = 0;
    for (const [filePath, cached] of this.transcriptCache.entries()) {
      if (now - (cached?.mtimeMs || 0) > BRAIN_MAX_AGE_MS) {
        this.transcriptCache.delete(filePath);
        prunedCache += 1;
      }
    }

    // 3. Clear offline Gemini tabs & old inactive sessions
    let clearedOffline = 0;
    const beforeCount = this.geminiSessions.size + this.hiddenSessionIds.size;
    this.clearOffline();
    const afterCount = this.geminiSessions.size + this.hiddenSessionIds.size;
    clearedOffline = Math.abs(afterCount - beforeCount);

    // 4. Activate dreaming state
    this.dreamingUntil = now + DREAM_DURATION_MS;
    this.dreamingTargetId = agentId || 'all-idle';
    this.dreamingLabel = 'Reconsolidando memórias e eliminando dados antigos';

    this.pushFeed({
      ts: now,
      source: 'antigravity',
      agentId: agentId || 'office',
      label: 'Memória',
      state: 'dreaming',
      message: '💭 Reconsolidando memórias e eliminando coisas velhas…',
    });

    this.pushTimeline({
      ts: now,
      source: 'antigravity',
      agentId: agentId || 'office',
      room: 'Escritório',
      state: 'dreaming',
      toolName: 'consolidate_memory',
      summary: 'Sonhando · reconsolidando memórias',
    });

    return {
      ok: true,
      stats: { compactedLines, clearedOffline, prunedCache },
      snapshot: this.getSnapshot(),
    };
  }

  clearOffline() {
    const now = Date.now();
    const hiddenIds = [];
    for (const [id, session] of this.geminiSessions.entries()) {
      const stale =
        session.state === 'offline' ||
        now - (session.lastHeartbeatAt || session.lastActivityAt) > GEMINI_OFFLINE_MS;
      if (stale) {
        this.geminiSessions.delete(id);
        hiddenIds.push(id);
      }
    }
    const staleThreshold = 60 * 60 * 1000;
    for (const [id, session] of this.hookSessions.entries()) {
      if (now - session.lastActivityAt > staleThreshold) {
        this.hiddenSessionIds.add(id);
        hiddenIds.push(id);
      }
    }
    const transcripts = this.scanBrainTranscripts();
    for (const t of transcripts) {
      if (now - t.lastActivityAt > staleThreshold) {
        this.hiddenSessionIds.add(t.id);
        hiddenIds.push(t.id);
      }
    }
    this.prunedBefore = now;
    this.applyEventRecord(
      {
        ts: now,
        source: 'system',
        event: 'ClearOffline',
        hiddenIds,
      },
      { persist: true }
    );
    try {
      fs.writeFileSync(
        this.snapshotFile,
        JSON.stringify({ prunedBefore: this.prunedBefore }, null, 2),
        'utf8'
      );
    } catch {
      // ignore
    }
    return this.getSnapshot();
  }

  scanBrainTranscripts() {
    const now = Date.now();
    const candidates = [];

    for (const brainDir of getBrainDirs()) {
      let entries;
      try {
        if (!fs.existsSync(brainDir)) continue;
        entries = fs.readdirSync(brainDir, { withFileTypes: true });
      } catch {
        continue;
      }

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        if (entry.name.startsWith('.') || entry.name === 'tempmediaStorage') continue;
        if (!isUuidLike(entry.name)) continue;

        const convDir = path.join(brainDir, entry.name);
        const logPath = path.join(convDir, '.system_generated', 'logs', 'transcript.jsonl');
        const fallbackPath = path.join(convDir, 'transcript.jsonl');
        const targetPath = fs.existsSync(logPath)
          ? logPath
          : fs.existsSync(fallbackPath)
            ? fallbackPath
            : null;
        if (!targetPath) continue;

        try {
          const stat = fs.statSync(targetPath);
          if (now - stat.mtimeMs > BRAIN_MAX_AGE_MS) continue;
          candidates.push({
            id: entry.name,
            filePath: targetPath,
            size: stat.size,
            mtimeMs: stat.mtimeMs,
          });
        } catch {
          // ignore unreadable directory
        }
      }
    }

    candidates.sort((a, b) => b.mtimeMs - a.mtimeMs);
    const top = candidates.slice(0, BRAIN_MAX_DIRS);
    const results = [];

    for (const item of top) {
      const cached = this.transcriptCache.get(item.filePath);
      if (cached && cached.size === item.size && cached.mtimeMs === item.mtimeMs) {
        results.push(cached.summary);
        continue;
      }
      const summary = this.parseTranscriptFile(item.id, item.filePath, item.mtimeMs);
      this.transcriptCache.set(item.filePath, {
        size: item.size,
        mtimeMs: item.mtimeMs,
        summary,
      });
      results.push(summary);
    }

    return results;
  }

  parseTranscriptFile(convId, filePath, mtimeMs) {
    let raw = '';
    try {
      raw = fs.readFileSync(filePath, 'utf8');
    } catch {
      return {
        id: convId,
        model: '',
        firstUserInput: '',
        lastUserInput: '',
        inputTokens: 0,
        cacheTokens: 0,
        outputTokens: 0,
        toolCount: 0,
        recentTools: [],
        subagents: [],
        startedAt: mtimeMs,
        lastActivityAt: mtimeMs,
        lastStepType: '',
        lastStepStatus: '',
        stepMetrics: [],
        timelineEvents: [],
      };
    }

    let model = '';
    let firstUserInput = '';
    let lastUserInput = '';
    let inputTokens = 0;
    let cacheTokens = 0;
    let outputTokens = 0;
    let toolCount = 0;
    let startedAt = mtimeMs;
    let lastActivityAt = mtimeMs;
    let lastStepType = '';
    let lastStepStatus = '';
    let lastToolName = '';
    let lastToolSummary = '';
    let lastMemoryStepTs = 0;
    const recentTools = [];
    const subagents = [];
    const subagentDetails = [];
    const stepMetrics = [];
    const timelineEvents = [];

    const cutoff24h = Date.now() - OFFICE_ACTIVE_AGE_MS;
    const lines = raw.split('\n');
    let sawFirstTs = false;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      let step;
      try {
        step = JSON.parse(trimmed);
      } catch {
        continue;
      }

      const parsedTs = step.created_at ? Date.parse(step.created_at) : NaN;
      const stepTs = Number.isNaN(parsedTs) ? mtimeMs : parsedTs;
      if (!Number.isNaN(parsedTs)) {
        if (!sawFirstTs) {
          startedAt = parsedTs;
          sawFirstTs = true;
        }
        lastActivityAt = Math.max(lastActivityAt, parsedTs);
      }

      lastStepType = step.type || lastStepType;
      lastStepStatus = step.status || lastStepStatus;

      if (
        typeof step.type === 'string' &&
        /COMPACT|SUMMAR|MEMORY|KNOWLEDGE/i.test(step.type)
      ) {
        lastMemoryStepTs = Math.max(lastMemoryStepTs, stepTs);
      }

      if (step.type === 'USER_INPUT' && typeof step.content === 'string') {
        const cleaned = cleanUserText(step.content);
        if (cleaned) {
          if (!firstUserInput) firstUserInput = cleaned;
          lastUserInput = cleaned;
        }
        if (stepTs >= cutoff24h) {
          stepMetrics.push({
            ts: stepTs,
            model,
            inTok: 0,
            cacheTok: 0,
            outTok: 0,
            toolCount: 0,
            categories: ['thinking'],
          });
        }
      } else if (step.type === 'PLANNER_RESPONSE') {
        if (typeof step.model === 'string' && step.model) {
          model = step.model;
        }
        const inTok = typeof step.input_tokens === 'number' ? step.input_tokens : 0;
        const cacheTok =
          typeof step.cache_read_tokens === 'number' ? step.cache_read_tokens : 0;
        const outTok = typeof step.output_tokens === 'number' ? step.output_tokens : 0;
        inputTokens += inTok;
        cacheTokens += cacheTok;
        outputTokens += outTok;

        const categories = [];
        let stepTools = 0;

        if (Array.isArray(step.tool_calls)) {
          for (const tc of step.tool_calls) {
            if (!tc || !tc.name) continue;
            toolCount += 1;
            stepTools += 1;
            const tSummary = extractToolSummaryFromArgs(tc.args);
            lastToolName = tc.name;
            lastToolSummary = tSummary;
            categories.push(mapToolCategory(tc.name));

            recentTools.unshift({
              name: tc.name,
              summary: tSummary,
              ts: stepTs,
              error: false,
            });
            if (recentTools.length > 10) recentTools.length = 10;

            if (tc.name === 'invoke_subagent' && tc.args) {
              const role = unquoteJsonArg(String(tc.args.Role || tc.args.TypeName || ''));
              if (role && !subagents.includes(role)) {
                subagents.push(role);
                if (subagents.length > 6) subagents.shift();
                const subId = `${convId}:sub:${role}`;
                subagentDetails.push({
                  id: subId,
                  name: assignAgentPersonaName(subId),
                  role,
                  state: Date.now() - stepTs < 45000 ? 'working' : 'done',
                });
                if (subagentDetails.length > 6) subagentDetails.shift();
              }
            }

            if (stepTs >= cutoff24h) {
              timelineEvents.push({
                ts: stepTs,
                source: 'antigravity',
                agentId: convId,
                state: mapToolToState(tc.name),
                toolName: tc.name,
                summary: tSummary || tc.name,
              });
            }
          }
        } else {
          categories.push('thinking');
        }

        stepMetrics.push({
          ts: stepTs,
          model,
          inTok,
          cacheTok,
          outTok,
          toolCount: stepTools,
          categories,
        });
      }
    }

    lastActivityAt = Math.max(lastActivityAt, mtimeMs);

    return {
      id: convId,
      model,
      firstUserInput,
      lastUserInput,
      inputTokens,
      cacheTokens,
      outputTokens,
      toolCount,
      recentTools,
      subagents,
      subagentDetails,
      startedAt,
      lastActivityAt,
      lastMemoryStepTs,
      lastStepType,
      lastStepStatus,
      lastToolName,
      lastToolSummary,
      stepMetrics,
      timelineEvents,
    };
  }

  deriveAntigravityLiveState(hookSession, transcript, now, knowledgeActive = false) {
    if (hookSession) {
      let state = hookSession.state || 'idle';
      const elapsed = now - hookSession.lastActivityAt;

      const isPromptTool = /ask_question|ask_user|request_permission|notify_user|permission/i.test(
        hookSession.currentTool || ''
      );
      if (isPromptTool && state !== 'waiting' && state !== 'error' && state !== 'done') {
        state = 'waiting';
      } else if (
        hookSession.toolStartedAt &&
        state !== 'terminal' &&
        now - hookSession.toolStartedAt > 30000 &&
        state !== 'waiting' &&
        state !== 'error' &&
        state !== 'done'
      ) {
        state = 'waiting';
      }

      if (state === 'done' && elapsed > DONE_TO_IDLE_MS) {
        state = 'idle';
      } else if (
        ['thinking', 'coding', 'reading', 'terminal', 'subagents'].includes(state) &&
        elapsed > 3 * 60 * 1000
      ) {
        state = 'idle';
      }

      if (
        this.dreamingUntil > now &&
        (this.dreamingTargetId === hookSession.id ||
          (this.dreamingTargetId === 'all-idle' &&
            (state === 'idle' || state === 'done')))
      ) {
        return {
          state: 'dreaming',
          sleeping: false,
          dreamLabel: this.dreamingLabel || 'Reconsolidando memórias',
        };
      }

      if (
        state === 'idle' &&
        ((transcript?.lastMemoryStepTs && now - transcript.lastMemoryStepTs < 45000) ||
          knowledgeActive)
      ) {
        return {
          state: 'dreaming',
          sleeping: false,
          dreamLabel: knowledgeActive
            ? 'Reconsolidando memórias (Knowledge)'
            : 'Compactando contexto antigo',
        };
      }

      return {
        state,
        sleeping: state === 'idle' && elapsed > SLEEP_IDLE_MS,
        dreamLabel: '',
      };
    }

    if (transcript) {
      const elapsed = now - transcript.lastActivityAt;
      if (
        this.dreamingUntil > now &&
        (this.dreamingTargetId === transcript.id ||
          (this.dreamingTargetId === 'all-idle' && elapsed > DONE_TO_IDLE_MS))
      ) {
        return {
          state: 'dreaming',
          sleeping: false,
          dreamLabel: this.dreamingLabel || 'Reconsolidando memórias',
        };
      }
      if (transcript.lastMemoryStepTs && now - transcript.lastMemoryStepTs < 45000) {
        return {
          state: 'dreaming',
          sleeping: false,
          dreamLabel: 'Compactando contexto antigo',
        };
      }
      if (elapsed <= 20 * 1000) {
        if (transcript.lastStepType === 'USER_INPUT') {
          return { state: 'thinking', sleeping: false, dreamLabel: '' };
        }
        if (transcript.lastToolName) {
          return {
            state: mapToolToState(transcript.lastToolName),
            sleeping: false,
            dreamLabel: '',
          };
        }
        return { state: 'thinking', sleeping: false, dreamLabel: '' };
      }
      if (elapsed <= 60 * 1000) {
        return { state: 'done', sleeping: false, dreamLabel: '' };
      }
      if (knowledgeActive) {
        return {
          state: 'dreaming',
          sleeping: false,
          dreamLabel: 'Reconsolidando memórias (Knowledge)',
        };
      }
      return { state: 'idle', sleeping: elapsed > SLEEP_IDLE_MS, dreamLabel: '' };
    }

    return { state: 'idle', sleeping: true, dreamLabel: '' };
  }

  computeAnalytics(transcripts, now, prefs) {
    const t5h = now - 5 * 60 * 60 * 1000;
    const t24h = now - 24 * 60 * 60 * 1000;
    const t7d = now - 7 * 24 * 60 * 60 * 1000;
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const todayStartMs = startOfDay.getTime();

    const makeWin = () => ({
      inputTokens: 0,
      cacheTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      toolCalls: 0,
      estimatedUsd: 0,
    });

    const window5h = makeWin();
    const window24h = makeWin();
    const window7d = makeWin();

    const addToWin = (win, step) => {
      win.inputTokens += step.inTok;
      win.cacheTokens += step.cacheTok;
      win.outputTokens += step.outTok;
      win.totalTokens += step.inTok + step.outTok;
      win.toolCalls += step.toolCount;
      win.estimatedUsd += estimateStepCostUsd(
        step.model,
        step.inTok,
        step.cacheTok,
        step.outTok
      );
    };

    const activeMinutesSet = new Set();
    const categoryCounts = {
      coding: 0,
      reading: 0,
      terminal: 0,
      subagents: 0,
      thinking: 0,
    };
    let earliest5hTs = 0;
    let earliest7dTs = 0;
    const modelMap = new Map();

    for (const tr of transcripts) {
      for (const step of tr.stepMetrics || []) {
        if (step.ts >= t7d) {
          addToWin(window7d, step);
          if (!earliest7dTs || step.ts < earliest7dTs) earliest7dTs = step.ts;
          const mKey = step.model || 'Antigravity';
          let m = modelMap.get(mKey);
          if (!m) {
            m = {
              model: mKey,
              steps24h: 0,
              totalTokens24h: 0,
              cacheTokens24h: 0,
              totalTokens7d: 0,
              estimatedUsd24h: 0,
            };
            modelMap.set(mKey, m);
          }
          m.totalTokens7d += step.inTok + step.outTok;
          if (step.ts >= t24h) {
            m.steps24h += 1;
            m.totalTokens24h += step.inTok + step.outTok;
            m.cacheTokens24h += step.cacheTok;
            m.estimatedUsd24h += estimateStepCostUsd(
              step.model,
              step.inTok,
              step.cacheTok,
              step.outTok
            );
          }
        }
        if (step.ts >= t24h) addToWin(window24h, step);
        if (step.ts >= t5h) {
          addToWin(window5h, step);
          if (!earliest5hTs || step.ts < earliest5hTs) earliest5hTs = step.ts;
        }
        if (step.ts >= todayStartMs) {
          activeMinutesSet.add(Math.floor(step.ts / 60000));
          for (const cat of step.categories || []) {
            if (cat in categoryCounts) categoryCounts[cat] += 1;
          }
        }
      }
    }

    const reset5hInMs = earliest5hTs ? Math.max(0, earliest5hTs + 5 * 3600000 - now) : 0;
    const reset7dInMs = earliest7dTs ? Math.max(0, earliest7dTs + 7 * 86400000 - now) : 0;
    const byModel = Array.from(modelMap.values())
      .map((m) => ({
        ...m,
        estimatedUsd24h: Number(m.estimatedUsd24h.toFixed(4)),
      }))
      .sort((a, b) => b.totalTokens7d - a.totalTokens7d)
      .slice(0, 8);

    for (const win of [window5h, window24h, window7d]) {
      win.estimatedUsd = Number(win.estimatedUsd.toFixed(4));
    }

    const cacheSavingsPct = Math.round(
      (window24h.cacheTokens / Math.max(1, window24h.inputTokens + window24h.cacheTokens)) * 100
    );

    const recentGemEvents = this.geminiMessageEvents.filter((e) => e.ts >= t24h);
    const geminiTurnsSum = Array.from(this.geminiSessions.values()).reduce(
      (sum, s) => sum + (s.lastActivityAt >= t24h ? s.turnCount || 0 : 0),
      0
    );
    const geminiMsgs24h = Math.max(recentGemEvents.length, geminiTurnsSum);

    const activeMinutesToday = activeMinutesSet.size;
    const elapsedTodayMin = Math.max(
      activeMinutesToday,
      Math.floor((now - todayStartMs) / 60000)
    );
    const idleMinutesToday = Math.max(
      0,
      Math.min(elapsedTodayMin - activeMinutesToday, Math.max(0, activeMinutesToday * 2))
    );

    // Alerts
    const alerts = [];
    const checkBudget = (id, label, used, limit) => {
      if (prefs.budgetAlertsEnabled === false) return;
      if (!limit || limit <= 0) return;
      const pct = Math.round((used / limit) * 100);
      if (pct >= 80) {
        const level = pct >= 100 ? 'limit' : pct >= 95 ? 'high' : 'warn';
        alerts.push({
          id,
          kind: 'budget',
          metric: label,
          pct,
          used,
          limit,
          level,
          message: `${label} atingiu ${pct}% do limite configurado (${used.toLocaleString('pt-BR')} / ${limit.toLocaleString('pt-BR')}).`,
        });
      }
    };

    checkBudget('budget-5h', 'Janela 5h (tokens)', window5h.totalTokens, prefs.budgets.tokens5h);
    checkBudget('budget-24h', 'Hoje / 24h (tokens)', window24h.totalTokens, prefs.budgets.tokens24h);
    checkBudget('budget-7d', 'Semanal / 7d (tokens)', window7d.totalTokens, prefs.budgets.tokens7d);
    checkBudget(
      'budget-gemini',
      'Gemini Web (turnos 24h)',
      geminiMsgs24h,
      prefs.budgets.geminiMsgs24h
    );

    const longWarnMs = (prefs.budgets.longTaskWarnSec || 120) * 1000;
    for (const hook of this.hookSessions.values()) {
      if (
        hook.toolStartedAt &&
        now - hook.toolStartedAt >= longWarnMs &&
        hook.state !== 'done' &&
        hook.state !== 'idle' &&
        hook.state !== 'error'
      ) {
        const elapsedSec = Math.round((now - hook.toolStartedAt) / 1000);
        alerts.push({
          id: `long-${hook.id}-${hook.toolStartedAt}`,
          kind: 'long_task',
          agentId: hook.id,
          agentTitle: hook.room || hook.id.slice(0, 8),
          toolName: hook.currentTool || 'ferramenta',
          elapsedSec,
          level: 'warn',
          message: `Tarefa "${hook.currentTool || 'ferramenta'}" em ${hook.room} rodando há ${elapsedSec}s.`,
        });
      }
    }

    // Progression / XP
    const doneKanban = (prefs.kanban || []).filter((k) => k.status === 'done').length;
    const xp = Math.max(
      0,
      Math.round(
        window7d.toolCalls * 15 +
          transcripts.length * 40 +
          (prefs.customRooms?.length || 0) * 30 +
          doneKanban * 25
      )
    );
    const level = Math.floor(Math.sqrt(xp / 120)) + 1;
    const prevLevelXp = (level - 1) * (level - 1) * 120;
    const nextLevelXp = level * level * 120;

    return {
      analytics: {
        window5h,
        window24h,
        window7d,
        reset5hInMs,
        reset7dInMs,
        byModel,
        cacheSavingsPct,
        geminiMsgs24h,
        productivity: {
          activeMinutesToday,
          idleMinutesToday,
          categoryCounts,
        },
      },
      alerts,
      progression: {
        xp,
        level,
        prevLevelXp,
        nextLevelXp,
        unlockedFurniture: computeUnlockedFurniture(level),
      },
    };
  }

  buildTimeline(transcripts, agentsById, now) {
    const cutoff24h = now - OFFICE_ACTIVE_AGE_MS;
    const items = [];
    for (const ev of this.eventTimeline) {
      if (ev.ts >= cutoff24h) {
        const agent = agentsById.get(ev.agentId);
        items.push({
          ...ev,
          agentTitle: agent?.title || ev.agentId?.slice(0, 8) || 'Agente',
        });
      }
    }
    for (const tr of transcripts) {
      if (tr.lastActivityAt < cutoff24h) continue;
      const agent = agentsById.get(tr.id);
      for (const ev of tr.timelineEvents || []) {
        items.push({
          ...ev,
          room: agent?.room || 'Antigravity',
          agentTitle: agent?.title || tr.id.slice(0, 8),
        });
      }
    }
    items.sort((a, b) => a.ts - b.ts);

    // Deduplicate identical consecutive events per agent within 1s
    const compact = [];
    for (const item of items) {
      const prev = compact[compact.length - 1];
      if (
        prev &&
        prev.agentId === item.agentId &&
        prev.state === item.state &&
        prev.toolName === item.toolName &&
        Math.abs(item.ts - prev.ts) < 1000
      ) {
        continue;
      }
      compact.push(item);
    }

    if (compact.length <= TIMELINE_LIMIT) return compact;
    const step = compact.length / TIMELINE_LIMIT;
    const sampled = [];
    for (let i = 0; i < TIMELINE_LIMIT; i += 1) {
      sampled.push(compact[Math.floor(i * step)]);
    }
    return sampled;
  }

  getSnapshot() {
    this.syncEvents();
    const now = Date.now();
    const prefs = this.prefsStore.get();
    const projectsAndRepos = this.projectsScanner.scan({
      extraPaths: prefs.extraRepoPaths,
    });
    const transcripts = this.scanBrainTranscripts();
    const transcriptMap = new Map(transcripts.map((t) => [t.id, t]));
    const allAntigravityIds = new Set([
      ...this.hookSessions.keys(),
      ...transcriptMap.keys(),
    ]);

    const { analytics, alerts, progression } = this.computeAnalytics(
      transcripts,
      now,
      prefs
    );

    const knowledgeActive = this.checkKnowledgeUpdated(now);
    let knowledgeAssigned = false;

    const agents = [];

    for (const convId of allAntigravityIds) {
      const hook = this.hookSessions.get(convId);
      const tr = transcriptMap.get(convId);
      const lastActivityAt = Math.max(
        hook?.lastActivityAt || 0,
        tr?.lastActivityAt || 0
      );

      // Keep office desks focused on recent 24h sessions
      if (now - lastActivityAt > OFFICE_ACTIVE_AGE_MS) continue;
      if (this.hiddenSessionIds.has(convId) && lastActivityAt <= this.prunedBefore) {
        continue;
      }

      const { state, sleeping, dreamLabel } = this.deriveAntigravityLiveState(
        hook,
        tr,
        now,
        knowledgeActive && !knowledgeAssigned
      );
      if (state === 'dreaming' && knowledgeActive && !knowledgeAssigned) {
        knowledgeAssigned = true;
      }

      const workspacePath = hook?.workspacePaths?.[0] || hook?.cwd || '';
      const matchedRepo = matchWorkspaceToRepo(workspacePath, projectsAndRepos);

      let autoRoom =
        matchedRepo?.name ||
        (hook?.room && hook.room !== 'Sem Workspace' ? hook.room : 'Antigravity');

      const titleSource = tr?.firstUserInput || hook?.lastUserInput || tr?.lastUserInput;
      const autoTitle = titleSource
        ? titleSource.slice(0, 48)
        : `Sessão ${convId.slice(0, 8)}`;

      const avatarOv = prefs.avatarOverrides?.[convId] || null;
      const roomKey = avatarOv?.roomId || `ag:${autoRoom}`;

      const recentTools =
        hook?.recentTools?.length > 0 ? hook.recentTools : tr?.recentTools || [];
      const subagents = Array.from(
        new Set([...(hook?.subagents || []), ...(tr?.subagents || [])])
      );

      const subagentDetailsMap = new Map();
      for (const sd of tr?.subagentDetails || []) {
        subagentDetailsMap.set(sd.role, sd);
      }
      for (const role of hook?.subagents || []) {
        if (!subagentDetailsMap.has(role)) {
          const subId = `${convId}:sub:${role}`;
          subagentDetailsMap.set(role, {
            id: subId,
            name: assignAgentPersonaName(subId),
            role,
            state: state === 'subagents' ? 'working' : 'done',
          });
        }
      }
      const subagentDetails = Array.from(subagentDetailsMap.values());

      agents.push({
        id: convId,
        shortId: convId.slice(0, 8),
        source: 'antigravity',
        personaName: assignAgentPersonaName(convId),
        title: avatarOv?.nickname || autoTitle,
        autoTitle,
        roomId: roomKey,
        room: autoRoom,
        workspacePath,
        model: hook?.model || tr?.model || 'Antigravity',
        state,
        sleeping,
        dreamLabel,
        currentTool: hook?.currentTool || (state !== 'idle' && state !== 'dreaming' ? tr?.lastToolName || '' : ''),
        toolSummary: hook?.toolSummary || (state !== 'idle' && state !== 'dreaming' ? tr?.lastToolSummary || '' : ''),
        toolStartedAt: hook?.toolStartedAt || null,
        lastUserInput: hook?.lastUserInput || tr?.lastUserInput || '',
        errorMessage: hook?.errorMessage || '',
        inputTokens: tr?.inputTokens || 0,
        cacheTokens: tr?.cacheTokens || 0,
        outputTokens: tr?.outputTokens || 0,
        toolCount: Math.max(tr?.toolCount || 0, hook?.hookToolCount || 0),
        recentTools,
        subagents,
        subagentDetails,
        customLook: avatarOv || null,
        startedAt: Math.min(
          hook?.startedAt || Number.MAX_SAFE_INTEGER,
          tr?.startedAt || Number.MAX_SAFE_INTEGER
        ),
        lastActivityAt,
      });
    }

    for (const gem of this.geminiSessions.values()) {
      const elapsed = now - (gem.lastHeartbeatAt || gem.lastActivityAt);
      let state = gem.state || 'idle';
      if (state !== 'offline' && elapsed > GEMINI_OFFLINE_MS) {
        state = 'offline';
      } else if (state === 'done' && now - gem.lastActivityAt > DONE_TO_IDLE_MS) {
        state = 'idle';
      }

      let dreamLabel = '';
      if (
        this.dreamingUntil > now &&
        state !== 'offline' &&
        (this.dreamingTargetId === gem.id ||
          (this.dreamingTargetId === 'all-idle' && (state === 'idle' || state === 'done')))
      ) {
        state = 'dreaming';
        dreamLabel = this.dreamingLabel || 'Reconsolidando memórias';
      }

      const avatarOv = prefs.avatarOverrides?.[gem.id] || null;
      const autoTitle = gem.title || 'Gemini Web';

      agents.push({
        id: gem.id,
        shortId: gem.tabId ? `tab-${gem.tabId}` : gem.id.slice(0, 8),
        source: 'gemini-web',
        tabId: gem.tabId,
        url: gem.url,
        personaName: assignAgentPersonaName(gem.id),
        title: avatarOv?.nickname || autoTitle,
        autoTitle,
        roomId: avatarOv?.roomId || 'gemini:Gemini Web',
        room: 'Gemini Web',
        workspacePath: gem.url,
        model: gem.model || 'Gemini Web',
        state,
        sleeping: state === 'idle' && now - gem.lastActivityAt > SLEEP_IDLE_MS,
        dreamLabel,
        currentTool: state === 'thinking' ? 'generate_response' : '',
        toolSummary: '',
        toolStartedAt: null,
        lastUserInput: gem.lastUserInput || '',
        errorMessage: '',
        inputTokens: 0,
        cacheTokens: 0,
        outputTokens: 0,
        toolCount: gem.turnCount || 0,
        recentTools: [],
        subagents: [],
        subagentDetails: [],
        customLook: avatarOv || null,
        startedAt: gem.startedAt,
        lastActivityAt: gem.lastActivityAt,
      });
    }

    agents.sort((a, b) => b.lastActivityAt - a.lastActivityAt);
    const agentsById = new Map(agents.map((a) => [a.id, a]));

    // Build rooms map (custom rooms first/preserved, plus dynamic agent rooms)
    const roomMap = new Map();

    for (const custom of prefs.customRooms || []) {
      roomMap.set(custom.id, {
        id: custom.id,
        name: custom.name,
        autoName: custom.name,
        kind: custom.kind || 'dev',
        accentColor: custom.accentColor || '#38bdf8',
        isCustom: true,
        agentIds: [],
        createdAt: custom.createdAt,
      });
    }

    for (const agent of agents) {
      let room = roomMap.get(agent.roomId);
      if (!room) {
        const isGemRoom = agent.roomId === 'gemini:Gemini Web';
        room = {
          id: agent.roomId,
          name: isGemRoom ? 'Gemini Web' : agent.room,
          autoName: isGemRoom ? 'Gemini Web' : agent.room,
          kind: isGemRoom ? 'gemini-web' : 'antigravity',
          accentColor: '',
          isCustom: false,
          agentIds: [],
        };
        roomMap.set(agent.roomId, room);
      } else {
        agent.room = room.name;
      }
      room.agentIds.push(agent.id);
    }

    // Apply room overrides + dynamic construction timers
    const rooms = [];
    for (const room of roomMap.values()) {
      const ov = prefs.roomOverrides?.[room.id];
      if (ov?.displayName) room.name = ov.displayName;
      if (ov?.accentColor) room.accentColor = ov.accentColor;
      if (ov?.kind) room.kind = ov.kind;

      if (!this.roomFirstSeen.has(room.id)) {
        const seenAt =
          room.createdAt && now - room.createdAt < CONSTRUCTION_DURATION_MS
            ? room.createdAt
            : this.initializedRooms
              ? now
              : this.bootedAt - CONSTRUCTION_DURATION_MS;
        this.roomFirstSeen.set(room.id, seenAt);
      }
      const firstSeen = this.roomFirstSeen.get(room.id);
      room.constructingUntil =
        now - firstSeen < CONSTRUCTION_DURATION_MS
          ? firstSeen + CONSTRUCTION_DURATION_MS
          : 0;
      rooms.push(room);
    }

    // Dedicated visual GitHub & Projetos room
    if (projectsAndRepos.length > 0) {
      const ghId = 'github:repos';
      const ghOv = prefs.roomOverrides?.[ghId];
      rooms.push({
        id: ghId,
        name: ghOv?.displayName || 'GitHub & Projetos',
        autoName: 'GitHub & Projetos',
        kind: 'github-hub',
        accentColor: ghOv?.accentColor || '#10b981',
        isCustom: false,
        agentIds: [],
        repos: projectsAndRepos,
        constructingUntil: 0,
      });
    }

    this.initializedRooms = true;

    const activeStates = new Set([
      'thinking',
      'coding',
      'reading',
      'terminal',
      'subagents',
      'waiting',
      'typing',
    ]);

    let antigravityCount = 0;
    let geminiWebCount = 0;
    let active = 0;
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let totalCacheTokens = 0;
    let totalToolCalls = 0;

    for (const agent of agents) {
      if (agent.source === 'gemini-web') {
        if (agent.state !== 'offline') geminiWebCount += 1;
      } else {
        antigravityCount += 1;
      }
      if (activeStates.has(agent.state)) active += 1;
      totalInputTokens += agent.inputTokens;
      totalOutputTokens += agent.outputTokens;
      totalCacheTokens += agent.cacheTokens;
      totalToolCalls += agent.toolCount;
    }

    return {
      version: '4.0.0',
      updatedAt: now,
      bridgeUrl: `http://127.0.0.1:${this.bridgePort}`,
      extensionPath: EXTENSION_DIR,
      prefs,
      stats: {
        total: agents.length,
        active,
        antigravityCount,
        geminiWebCount,
        totalInputTokens,
        totalOutputTokens,
        totalCacheTokens,
        totalToolCalls,
      },
      analytics,
      alerts,
      progression,
      projectsAndRepos,
      rooms,
      agents,
      feed: this.feed.slice(0, FEED_LIMIT),
      timeline: this.buildTimeline(transcripts, agentsById, now),
    };
  }

  generateDailyReport() {
    const snap = this.getSnapshot();
    const { analytics, progression, projectsAndRepos, agents, prefs } = snap;
    const todayStr = new Date().toLocaleDateString('pt-BR');
    const w24 = analytics.window24h;
    const w5 = analytics.window5h;
    const cats = analytics.productivity.categoryCounts;

    const lines = [
      `# Resumo do Dia — Pixel Office (${todayStr})`,
      '',
      `## Consumo & Produtividade`,
      `- **Nível do Escritório:** Lv ${progression.level} (${progression.xp} XP)`,
      `- **Tempo ativo hoje:** ~${analytics.productivity.activeMinutesToday} min (ocioso estimado: ~${analytics.productivity.idleMinutesToday} min)`,
      `- **Tokens (últimas 24h):** ${w24.totalTokens.toLocaleString('pt-BR')} (Input ${w24.inputTokens.toLocaleString('pt-BR')} · Output ${w24.outputTokens.toLocaleString('pt-BR')} · Cache ${w24.cacheTokens.toLocaleString('pt-BR')} — economia de **${analytics.cacheSavingsPct}%**)`,
      `- **Tokens (janela 5h):** ${w5.totalTokens.toLocaleString('pt-BR')} · Custo estimado (24h): ~\$${w24.estimatedUsd.toFixed(4)} USD`,
      `- **Gemini Web (24h):** ${analytics.geminiMsgs24h} turnos detectados`,
      `- **Distribuição de tarefas:** Editando (${cats.coding}) · Lendo (${cats.reading}) · Terminal (${cats.terminal}) · Subagentes (${cats.subagents}) · Pensando (${cats.thinking})`,
      '',
      `## Sessões Recentes (${agents.length})`,
    ];

    if (agents.length === 0) {
      lines.push('- Nenhuma sessão nas últimas 24h.');
    } else {
      for (const a of agents) {
        const origin = a.source === 'gemini-web' ? 'Gemini Web' : 'Antigravity';
        const tokInfo =
          a.source === 'antigravity'
            ? ` · ${(a.inputTokens + a.outputTokens).toLocaleString('pt-BR')} tokens · ${a.toolCount} tools`
            : ` · ${a.toolCount} turnos`;
        lines.push(`- **[${origin}] ${a.title}** (${a.room} · ${a.model})${tokInfo}`);
      }
    }

    lines.push('', `## GitHub & Projetos Conectados (${projectsAndRepos.length})`);
    if (projectsAndRepos.length === 0) {
      lines.push('- Nenhum repositório ou projeto encontrado.');
    } else {
      for (const r of projectsAndRepos) {
        const tag = r.kind === 'github' ? `GitHub (${r.githubSlug})` : r.kind === 'git-local' ? 'Git local' : 'Projeto Antigravity';
        const dirty = r.dirtyCount > 0 ? ` · ${r.dirtyCount} pendentes` : '';
        const branch = r.branch ? ` [${r.branch}${dirty}]` : '';
        lines.push(`- **${r.name}** — ${tag}${branch}`);
      }
    }

    const kanban = prefs.kanban || [];
    if (kanban.length > 0) {
      const done = kanban.filter((k) => k.status === 'done');
      const doing = kanban.filter((k) => k.status === 'doing');
      const todo = kanban.filter((k) => k.status === 'todo');
      lines.push('', `## Kanban (${done.length}/${kanban.length} concluídas)`);
      for (const k of [...doing, ...todo, ...done].slice(0, 12)) {
        const mark = k.status === 'done' ? 'x' : ' ';
        lines.push(`- [${mark}] (${k.status.toUpperCase()}) ${k.title} — *${k.room}*`);
      }
    }

    return lines.join('\n');
  }
}
