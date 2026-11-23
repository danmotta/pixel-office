import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const DEFAULT_CACHE_TTL_MS = 20000;
const MAX_SCAN_DEPTH = 2;
const MAX_DIRS_PER_ROOT = 350;
const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  '.venv',
  'venv',
  'target',
  'appdata',
  '$recycle.bin',
  'system volume information',
]);

function getProjectsConfigDir() {
  if (process.env.PIXEL_OFFICE_PROJECTS_DIR) {
    return process.env.PIXEL_OFFICE_PROJECTS_DIR;
  }
  return path.join(os.homedir(), '.gemini', 'config', 'projects');
}

export function decodeFileUri(uri) {
  if (typeof uri !== 'string' || !uri.trim()) return '';
  let raw = uri.trim();
  if (raw.startsWith('file://')) {
    raw = raw.slice('file://'.length);
  }
  try {
    raw = decodeURIComponent(raw);
  } catch {
    // keep raw if malformed percent encoding
  }
  // Handle Windows file:///C:/... -> /C:/... -> C:/...
  raw = raw.replace(/^\/([A-Za-z]:)/, '$1');
  return path.normalize(raw);
}

export function parseGitHubRemote(remoteUrl) {
  if (typeof remoteUrl !== 'string' || !remoteUrl.trim()) {
    return { githubSlug: '', githubUrl: '' };
  }
  const clean = remoteUrl.trim();
  const httpsMatch = clean.match(
    /^https?:\/\/(?:www\.)?github\.com\/([^/]+)\/([^/]+?)(?:\.git)?\/?$/i
  );
  if (httpsMatch) {
    const slug = `${httpsMatch[1]}/${httpsMatch[2]}`;
    return { githubSlug: slug, githubUrl: `https://github.com/${slug}` };
  }
  const sshMatch = clean.match(
    /^(?:ssh:\/\/)?git@github\.com[:/]([^/]+)\/([^/]+?)(?:\.git)?\/?$/i
  );
  if (sshMatch) {
    const slug = `${sshMatch[1]}/${sshMatch[2]}`;
    return { githubSlug: slug, githubUrl: `https://github.com/${slug}` };
  }
  return { githubSlug: '', githubUrl: '' };
}

function runGit(repoPath, args) {
  try {
    return execFileSync('git', ['-C', repoPath, ...args], {
      encoding: 'utf8',
      timeout: 1500,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
}

function inspectGitRepo(repoPath, sourceProjectName) {
  const branch =
    runGit(repoPath, ['branch', '--show-current']) ||
    runGit(repoPath, ['rev-parse', '--abbrev-ref', 'HEAD']) ||
    'HEAD';
  const originUrl = runGit(repoPath, ['remote', 'get-url', 'origin']);
  const { githubSlug, githubUrl } = parseGitHubRemote(originUrl);
  const statusOut = runGit(repoPath, ['status', '--porcelain']);
  const dirtyCount = statusOut
    ? statusOut.split(/\r?\n/).filter((l) => l.trim().length > 0).length
    : 0;
  const logRaw = runGit(repoPath, ['log', '-1', '--format=%h\x1f%ct\x1f%s']);
  let lastCommitHash = '';
  let lastCommitAt = null;
  let lastCommitMsg = '';
  if (logRaw) {
    const [hash, tsSec, msg] = logRaw.split('\x1f');
    lastCommitHash = hash || '';
    const parsedSec = Number(tsSec);
    if (Number.isFinite(parsedSec) && parsedSec > 0) {
      lastCommitAt = parsedSec * 1000;
    }
    lastCommitMsg = (msg || '').slice(0, 100);
  }

  const name = githubSlug ? githubSlug.split('/')[1] : path.basename(repoPath);
  const kind = githubSlug ? 'github' : 'git-local';

  return {
    id: `repo:${path.resolve(repoPath).toLowerCase()}`,
    name: name || path.basename(repoPath),
    path: path.resolve(repoPath),
    kind,
    githubSlug,
    githubUrl,
    branch,
    dirtyCount,
    lastCommitHash,
    lastCommitAt,
    lastCommitMsg,
    exists: true,
    sourceProjectName: sourceProjectName || '',
  };
}

function readAntigravityProjects() {
  const dir = getProjectsConfigDir();
  const projects = [];
  let entries;
  try {
    if (!fs.existsSync(dir)) return projects;
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return projects;
  }

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.json')) continue;
    if (entry.name === 'outside-of-project.json') continue;
    try {
      const parsed = JSON.parse(fs.readFileSync(path.join(dir, entry.name), 'utf8'));
      if (!parsed || parsed.sidecar) continue;
      const resources = parsed.projectResources?.resources;
      const folderPaths = [];
      if (Array.isArray(resources)) {
        for (const r of resources) {
          if (r && typeof r.folderUri === 'string') {
            const decoded = decodeFileUri(r.folderUri);
            if (decoded) folderPaths.push(decoded);
          }
        }
      }
      projects.push({
        id: parsed.id || entry.name.replace(/\.json$/i, ''),
        name: parsed.name || path.basename(folderPaths[0] || entry.name),
        folderPaths,
      });
    } catch {
      // ignore invalid project json
    }
  }
  return projects;
}

function findGitReposInRoot(rootPath, maxDepth = MAX_SCAN_DEPTH) {
  const found = [];
  if (!rootPath || !fs.existsSync(rootPath)) return found;

  let visited = 0;
  const queue = [{ dir: path.resolve(rootPath), depth: 0 }];

  while (queue.length > 0 && visited < MAX_DIRS_PER_ROOT) {
    const { dir, depth } = queue.shift();
    visited += 1;

    try {
      const gitMarker = path.join(dir, '.git');
      if (fs.existsSync(gitMarker)) {
        found.push(dir);
        // Do not recurse inside a git repo looking for nested sub-repos unless root itself
        if (depth > 0) continue;
      }
      if (depth >= maxDepth) continue;

      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const lower = entry.name.toLowerCase();
        if (entry.name.startsWith('.') || SKIP_DIRS.has(lower)) continue;
        queue.push({ dir: path.join(dir, entry.name), depth: depth + 1 });
      }
    } catch {
      // ignore permission errors on user directories
    }
  }

  return found;
}

export class ProjectsScanner {
  constructor(options = {}) {
    this.cacheTtlMs = options.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS;
    this.lastScanAt = 0;
    this.lastExtraKey = '';
    this.cachedItems = [];
  }

  scan({ extraPaths = [], force = false } = {}) {
    const now = Date.now();
    const extraKey = JSON.stringify(extraPaths || []);
    if (
      !force &&
      this.cachedItems.length > 0 &&
      extraKey === this.lastExtraKey &&
      now - this.lastScanAt < this.cacheTtlMs
    ) {
      return this.cachedItems;
    }

    const projects = readAntigravityProjects();
    const repoMap = new Map(); // normalized path -> { path, sourceProjectName }

    const registerRepo = (repoPath, sourceProjectName) => {
      const key = path.resolve(repoPath).toLowerCase();
      if (!repoMap.has(key)) {
        repoMap.set(key, { path: path.resolve(repoPath), sourceProjectName });
      }
    };

    for (const proj of projects) {
      for (const folder of proj.folderPaths) {
        const repos = findGitReposInRoot(folder, MAX_SCAN_DEPTH);
        for (const repoPath of repos) {
          registerRepo(repoPath, proj.name);
        }
      }
    }

    for (const extra of extraPaths || []) {
      const repos = findGitReposInRoot(extra, MAX_SCAN_DEPTH);
      if (repos.length > 0) {
        for (const repoPath of repos) {
          registerRepo(repoPath, 'Pasta Adicionada');
        }
      } else if (extra && fs.existsSync(extra)) {
        registerRepo(extra, 'Pasta Adicionada');
      }
    }

    const items = [];
    const representedPaths = new Set();

    for (const [key, entry] of repoMap.entries()) {
      representedPaths.add(key);
      if (fs.existsSync(path.join(entry.path, '.git'))) {
        items.push(inspectGitRepo(entry.path, entry.sourceProjectName));
      } else {
        items.push({
          id: `proj:${key}`,
          name: path.basename(entry.path),
          path: entry.path,
          kind: 'project',
          githubSlug: '',
          githubUrl: '',
          branch: '',
          dirtyCount: 0,
          lastCommitHash: '',
          lastCommitAt: null,
          lastCommitMsg: '',
          exists: true,
          sourceProjectName: entry.sourceProjectName || '',
        });
      }
    }

    // Add separated Antigravity single-folder projects that are not git repos themselves
    for (const proj of projects) {
      if (proj.folderPaths.length !== 1) continue;
      const folder = path.resolve(proj.folderPaths[0]);
      const key = folder.toLowerCase();
      if (representedPaths.has(key)) continue;
      representedPaths.add(key);
      items.push({
        id: `proj:${proj.id}`,
        name: proj.name,
        path: folder,
        kind: 'project',
        githubSlug: '',
        githubUrl: '',
        branch: '',
        dirtyCount: 0,
        lastCommitHash: '',
        lastCommitAt: null,
        lastCommitMsg: '',
        exists: fs.existsSync(folder),
        sourceProjectName: proj.name,
      });
    }

    const kindOrder = { github: 0, 'git-local': 1, project: 2 };
    items.sort((a, b) => {
      const ka = kindOrder[a.kind] ?? 3;
      const kb = kindOrder[b.kind] ?? 3;
      if (ka !== kb) return ka - kb;
      return a.name.localeCompare(b.name, 'pt-BR');
    });

    this.cachedItems = items;
    this.lastScanAt = now;
    this.lastExtraKey = extraKey;
    return items;
  }
}
