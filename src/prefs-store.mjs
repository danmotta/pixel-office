import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const DATA_DIR =
  process.env.PIXEL_OFFICE_DATA_DIR ||
  path.join(os.homedir(), '.gemini', 'antigravity', 'pixel-office-data');

const VALID_PETS = new Set(['cyberfox', 'cat', 'dragon', 'robot', 'none']);
const VALID_THEMES = new Set(['auto', 'day', 'night', 'cyber', 'christmas']);
const VALID_ROOM_KINDS = new Set(['dev', 'warroom', 'research', 'lounge', 'gemini']);
const VALID_KANBAN_STATUS = new Set(['todo', 'doing', 'done']);
const VALID_HAIR_STYLES = new Set([
  'spiky',
  'mohawk',
  'parted',
  'bob',
  'ponytail',
  'curly',
  'bun',
  'cap',
]);

export const DEFAULT_BUDGETS = {
  tokens5h: 6000000,
  tokens24h: 15000000,
  tokens7d: 80000000,
  geminiMsgs24h: 100,
  longTaskWarnSec: 180,
};

function createDefaultPrefs() {
  return {
    petType: 'cyberfox',
    officeTheme: 'auto',
    socialEnabled: true,
    budgetAlertsEnabled: true,
    customRooms: [],
    roomOverrides: {},
    avatarOverrides: {},
    budgets: { ...DEFAULT_BUDGETS },
    kanban: [],
    extraRepoPaths: [],
  };
}

function clampInt(val, min, max, fallback) {
  const n = Number(val);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
}

function sanitizeColor(val) {
  if (typeof val !== 'string') return '';
  const trimmed = val.trim();
  return /^#[0-9a-fA-F]{6}$/.test(trimmed) ? trimmed : '';
}

function sanitizeShortText(val, maxLen) {
  if (typeof val !== 'string') return '';
  return val.replace(/\s+/g, ' ').trim().slice(0, maxLen);
}

export class PrefsStore {
  constructor(options = {}) {
    this.dataDir = options.dataDir || DATA_DIR;
    this.prefsFile = path.join(this.dataDir, 'prefs.json');
    this.lastMtimeMs = null;
    this.prefs = createDefaultPrefs();
    this.load(true);
  }

  ensureDataDir() {
    try {
      fs.mkdirSync(this.dataDir, { recursive: true });
    } catch {
      // ignore
    }
  }

  normalizePrefs(raw) {
    const base = createDefaultPrefs();
    if (!raw || typeof raw !== 'object') return base;

    if (VALID_PETS.has(raw.petType)) base.petType = raw.petType;
    if (VALID_THEMES.has(raw.officeTheme)) base.officeTheme = raw.officeTheme;
    if (typeof raw.socialEnabled === 'boolean') base.socialEnabled = raw.socialEnabled;
    if (typeof raw.budgetAlertsEnabled === 'boolean') {
      base.budgetAlertsEnabled = raw.budgetAlertsEnabled;
    }

    if (Array.isArray(raw.customRooms)) {
      base.customRooms = raw.customRooms
        .filter((r) => r && typeof r.id === 'string' && typeof r.name === 'string')
        .map((r) => ({
          id: r.id.slice(0, 64),
          name: sanitizeShortText(r.name, 40) || 'Nova Sala',
          kind: VALID_ROOM_KINDS.has(r.kind) ? r.kind : 'dev',
          accentColor: sanitizeColor(r.accentColor) || '#38bdf8',
          createdAt: Number(r.createdAt) || Date.now(),
        }));
    }

    if (raw.roomOverrides && typeof raw.roomOverrides === 'object' && !Array.isArray(raw.roomOverrides)) {
      for (const [roomId, ov] of Object.entries(raw.roomOverrides)) {
        if (!ov || typeof ov !== 'object') continue;
        const clean = {};
        const displayName = sanitizeShortText(ov.displayName, 40);
        const accentColor = sanitizeColor(ov.accentColor);
        if (displayName) clean.displayName = displayName;
        if (accentColor) clean.accentColor = accentColor;
        if (VALID_ROOM_KINDS.has(ov.kind)) clean.kind = ov.kind;
        if (Object.keys(clean).length > 0) {
          base.roomOverrides[roomId] = clean;
        }
      }
    }

    if (raw.avatarOverrides && typeof raw.avatarOverrides === 'object' && !Array.isArray(raw.avatarOverrides)) {
      for (const [agentId, ov] of Object.entries(raw.avatarOverrides)) {
        if (!ov || typeof ov !== 'object') continue;
        const clean = {};
        const nickname = sanitizeShortText(ov.nickname, 36);
        const hairColor = sanitizeColor(ov.hairColor);
        const shirt = sanitizeColor(ov.shirt);
        const roomId = sanitizeShortText(ov.roomId, 64);
        if (nickname) clean.nickname = nickname;
        if (VALID_HAIR_STYLES.has(ov.hairStyle)) clean.hairStyle = ov.hairStyle;
        if (hairColor) clean.hairColor = hairColor;
        if (shirt) clean.shirt = shirt;
        if (['none', 'glasses', 'headset', 'both'].includes(ov.accessory)) {
          clean.accessory = ov.accessory;
        }
        if (roomId) clean.roomId = roomId;
        if (Object.keys(clean).length > 0) {
          base.avatarOverrides[agentId] = clean;
        }
      }
    }

    if (raw.budgets && typeof raw.budgets === 'object') {
      base.budgets = {
        tokens5h: clampInt(raw.budgets.tokens5h, 0, 200000000, DEFAULT_BUDGETS.tokens5h),
        tokens24h: clampInt(raw.budgets.tokens24h, 0, 500000000, DEFAULT_BUDGETS.tokens24h),
        tokens7d: clampInt(raw.budgets.tokens7d, 0, 2000000000, DEFAULT_BUDGETS.tokens7d),
        geminiMsgs24h: clampInt(raw.budgets.geminiMsgs24h, 0, 5000, DEFAULT_BUDGETS.geminiMsgs24h),
        longTaskWarnSec: clampInt(raw.budgets.longTaskWarnSec, 15, 3600, DEFAULT_BUDGETS.longTaskWarnSec),
      };
    }

    if (Array.isArray(raw.kanban)) {
      base.kanban = raw.kanban
        .filter((item) => item && typeof item.id === 'string' && typeof item.title === 'string')
        .slice(0, 100)
        .map((item) => ({
          id: item.id.slice(0, 64),
          title: sanitizeShortText(item.title, 120) || 'Tarefa',
          room: sanitizeShortText(item.room, 40) || 'Geral',
          status: VALID_KANBAN_STATUS.has(item.status) ? item.status : 'todo',
          createdAt: Number(item.createdAt) || Date.now(),
          updatedAt: Number(item.updatedAt) || Date.now(),
        }));
    }

    if (Array.isArray(raw.extraRepoPaths)) {
      const seen = new Set();
      for (const p of raw.extraRepoPaths) {
        if (typeof p !== 'string' || !p.trim()) continue;
        const normalized = path.normalize(p.trim());
        const key = normalized.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          base.extraRepoPaths.push(normalized);
        }
      }
    }

    return base;
  }

  load(force = false) {
    try {
      if (!fs.existsSync(this.prefsFile)) {
        if (force) this.prefs = createDefaultPrefs();
        return this.prefs;
      }
      const stat = fs.statSync(this.prefsFile);
      if (!force && this.lastMtimeMs !== null && stat.mtimeMs === this.lastMtimeMs) {
        return this.prefs;
      }
      const raw = fs.readFileSync(this.prefsFile, 'utf8');
      this.prefs = this.normalizePrefs(JSON.parse(raw));
      this.lastMtimeMs = stat.mtimeMs;
    } catch (err) {
      console.error(`[pixel-office] Failed to load prefs.json: ${err.message}`);
    }
    return this.prefs;
  }

  save() {
    try {
      this.ensureDataDir();
      const tmp = `${this.prefsFile}.tmp.${process.pid}.${Date.now()}`;
      fs.writeFileSync(tmp, JSON.stringify(this.prefs, null, 2), 'utf8');
      fs.renameSync(tmp, this.prefsFile);
      this.lastMtimeMs = fs.statSync(this.prefsFile).mtimeMs;
    } catch (err) {
      console.error(`[pixel-office] Failed to save prefs.json: ${err.message}`);
    }
  }

  get() {
    this.load(false);
    return structuredClone(this.prefs);
  }

  update(patch = {}) {
    this.load(false);
    if (!patch || typeof patch !== 'object') return this.get();

    if (VALID_PETS.has(patch.petType)) {
      this.prefs.petType = patch.petType;
    }
    if (VALID_THEMES.has(patch.officeTheme)) {
      this.prefs.officeTheme = patch.officeTheme;
    }
    if (typeof patch.socialEnabled === 'boolean') {
      this.prefs.socialEnabled = patch.socialEnabled;
    }
    if (typeof patch.budgetAlertsEnabled === 'boolean') {
      this.prefs.budgetAlertsEnabled = patch.budgetAlertsEnabled;
    }
    if (patch.budgets && typeof patch.budgets === 'object') {
      const merged = { ...this.prefs.budgets, ...patch.budgets };
      this.prefs.budgets = this.normalizePrefs({ budgets: merged }).budgets;
    }

    if (patch.roomOverrides && typeof patch.roomOverrides === 'object') {
      for (const [roomId, ov] of Object.entries(patch.roomOverrides)) {
        if (ov === null) {
          delete this.prefs.roomOverrides[roomId];
        } else if (ov && typeof ov === 'object') {
          const merged = { ...(this.prefs.roomOverrides[roomId] || {}), ...ov };
          if (ov.displayName === '') delete merged.displayName;
          if (ov.accentColor === '') delete merged.accentColor;
          if (ov.kind === '') delete merged.kind;
          const normalized = this.normalizePrefs({ roomOverrides: { [roomId]: merged } });
          if (normalized.roomOverrides[roomId]) {
            this.prefs.roomOverrides[roomId] = normalized.roomOverrides[roomId];
          } else {
            delete this.prefs.roomOverrides[roomId];
          }
        }
      }
    }

    if (patch.avatarOverrides && typeof patch.avatarOverrides === 'object') {
      for (const [agentId, ov] of Object.entries(patch.avatarOverrides)) {
        if (ov === null) {
          delete this.prefs.avatarOverrides[agentId];
        } else if (ov && typeof ov === 'object') {
          const merged = { ...(this.prefs.avatarOverrides[agentId] || {}), ...ov };
          for (const k of ['nickname', 'hairStyle', 'hairColor', 'shirt', 'accessory', 'roomId']) {
            if (ov[k] === '' || ov[k] === null) delete merged[k];
          }
          const normalized = this.normalizePrefs({ avatarOverrides: { [agentId]: merged } });
          if (normalized.avatarOverrides[agentId]) {
            this.prefs.avatarOverrides[agentId] = normalized.avatarOverrides[agentId];
          } else {
            delete this.prefs.avatarOverrides[agentId];
          }
        }
      }
    }

    if (typeof patch.addRepoPath === 'string' && patch.addRepoPath.trim()) {
      return this.addExtraRepoPath(patch.addRepoPath);
    }
    if (typeof patch.removeRepoPath === 'string' && patch.removeRepoPath.trim()) {
      return this.removeExtraRepoPath(patch.removeRepoPath);
    }

    this.save();
    return this.get();
  }

  createRoom({ name, kind, accentColor } = {}) {
    this.load(false);
    const now = Date.now();
    const room = {
      id: `custom-${now}-${Math.random().toString(36).slice(2, 6)}`,
      name: sanitizeShortText(name, 40) || 'Nova Sala',
      kind: VALID_ROOM_KINDS.has(kind) ? kind : 'dev',
      accentColor: sanitizeColor(accentColor) || '#38bdf8',
      createdAt: now,
    };
    this.prefs.customRooms.push(room);
    this.save();
    return room;
  }

  deleteRoom(roomId) {
    this.load(false);
    const before = this.prefs.customRooms.length;
    this.prefs.customRooms = this.prefs.customRooms.filter((r) => r.id !== roomId);
    delete this.prefs.roomOverrides[roomId];
    for (const [agentId, ov] of Object.entries(this.prefs.avatarOverrides)) {
      if (ov.roomId === roomId) {
        delete ov.roomId;
        if (Object.keys(ov).length === 0) {
          delete this.prefs.avatarOverrides[agentId];
        }
      }
    }
    this.save();
    return this.prefs.customRooms.length !== before;
  }

  upsertKanban({ action = 'create', id, title, room, status } = {}) {
    this.load(false);
    const now = Date.now();

    if (action === 'delete' && id) {
      this.prefs.kanban = this.prefs.kanban.filter((item) => item.id !== id);
      this.save();
      return this.get();
    }

    if (action === 'move' && id) {
      const target = this.prefs.kanban.find((item) => item.id === id);
      if (target && VALID_KANBAN_STATUS.has(status)) {
        target.status = status;
        target.updatedAt = now;
        this.save();
      }
      return this.get();
    }

    if (action === 'create') {
      const cleanTitle = sanitizeShortText(title, 120);
      if (!cleanTitle) return this.get();
      this.prefs.kanban.unshift({
        id: `kb-${now}-${Math.random().toString(36).slice(2, 6)}`,
        title: cleanTitle,
        room: sanitizeShortText(room, 40) || 'Geral',
        status: VALID_KANBAN_STATUS.has(status) ? status : 'todo',
        createdAt: now,
        updatedAt: now,
      });
      if (this.prefs.kanban.length > 100) this.prefs.kanban.length = 100;
      this.save();
    }

    return this.get();
  }

  addExtraRepoPath(folderPath) {
    this.load(false);
    const normalized = path.normalize(String(folderPath || '').trim());
    if (!normalized) return this.get();
    const key = normalized.toLowerCase();
    if (!this.prefs.extraRepoPaths.some((p) => p.toLowerCase() === key)) {
      this.prefs.extraRepoPaths.push(normalized);
      this.save();
    }
    return this.get();
  }

  removeExtraRepoPath(folderPath) {
    this.load(false);
    const key = path.normalize(String(folderPath || '').trim()).toLowerCase();
    this.prefs.extraRepoPaths = this.prefs.extraRepoPaths.filter(
      (p) => p.toLowerCase() !== key
    );
    this.save();
    return this.get();
  }
}
