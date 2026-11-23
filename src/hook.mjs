#!/usr/bin/env node
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';

const DATA_DIR =
  process.env.PIXEL_OFFICE_DATA_DIR ||
  path.join(os.homedir(), '.gemini', 'antigravity', 'pixel-office-data');
const EVENTS_FILE = path.join(DATA_DIR, 'events.jsonl');
const BRIDGE_PORT = Number(process.env.PIXEL_OFFICE_PORT || 4748);

function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    let settled = false;
    const done = () => {
      if (!settled) {
        settled = true;
        resolve(data);
      }
    };
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      data += chunk;
    });
    process.stdin.on('end', done);
    process.stdin.on('error', done);
    // Safety guard if stdin is left open without EOF
    setTimeout(done, 400).unref();
  });
}

function cleanUserPrompt(raw) {
  if (typeof raw !== 'string' || !raw.trim()) return '';
  let text = raw;
  const userReqMatch = text.match(/<USER_REQUEST>\s*([\s\S]*?)\s*<\/USER_REQUEST>/i);
  if (userReqMatch) {
    text = userReqMatch[1];
  } else {
    text = text.replace(/<ADDITIONAL_METADATA>[\s\S]*?<\/ADDITIONAL_METADATA>/gi, '');
    text = text.replace(/<\/?USER_REQUEST>/gi, '');
  }
  text = text.replace(/\s+/g, ' ').trim();
  return text.length > 240 ? `${text.slice(0, 237)}...` : text;
}

function summarizeToolArgs(toolCall) {
  if (!toolCall || typeof toolCall !== 'object') return '';
  const args = toolCall.args;
  if (!args || typeof args !== 'object') return '';

  const candidates = [
    args.CommandLine,
    args.Path,
    args.AbsolutePath,
    args.TargetFile,
    args.DirectoryPath,
    args.Query,
    args.query,
    args.Url,
    args.Role,
    args.TypeName,
    args.ToolName,
    args.ServerName,
    args.Pattern,
    args.Description,
    args.name,
    args.action,
  ];

  for (const val of candidates) {
    if (typeof val === 'string' && val.trim()) {
      const oneLine = val.replace(/\s+/g, ' ').trim();
      return oneLine.length > 100 ? `${oneLine.slice(0, 97)}...` : oneLine;
    }
  }

  if (Array.isArray(args.Subagents) && args.Subagents.length > 0) {
    const roles = args.Subagents.map((s) => s?.Role || s?.TypeName).filter(Boolean);
    if (roles.length > 0) {
      const joined = roles.join(', ');
      return joined.length > 100 ? `${joined.slice(0, 97)}...` : joined;
    }
  }

  if (Array.isArray(args.questions) && args.questions.length > 0) {
    const q = args.questions[0]?.question;
    if (typeof q === 'string' && q.trim()) {
      const oneLine = q.replace(/\s+/g, ' ').trim();
      return oneLine.length > 100 ? `${oneLine.slice(0, 97)}...` : oneLine;
    }
  }

  return '';
}

function buildHookResponse(eventName) {
  if (eventName === 'PreToolUse') {
    return { decision: 'allow' };
  }
  if (eventName === 'Stop') {
    return { decision: 'stop' };
  }
  return {};
}

function postToBridge(record) {
  return new Promise((resolve) => {
    const body = JSON.stringify(record);
    let finished = false;
    const finish = () => {
      if (!finished) {
        finished = true;
        resolve();
      }
    };

    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: BRIDGE_PORT,
        path: '/api/hook-event',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
        timeout: 150,
      },
      (res) => {
        res.resume();
        res.on('end', finish);
      }
    );

    req.on('timeout', () => {
      req.destroy();
      finish();
    });
    req.on('error', finish);
    req.setTimeout(150);

    try {
      req.write(body);
      req.end();
    } catch {
      finish();
    }

    setTimeout(() => {
      try {
        req.destroy();
      } catch {
        // ignore
      }
      finish();
    }, 150).unref();
  });
}

async function main() {
  const rawInput = await readStdin();
  let payload = {};
  if (rawInput && rawInput.trim()) {
    try {
      const parsed = JSON.parse(rawInput);
      if (parsed && typeof parsed === 'object') {
        payload = parsed;
      }
    } catch {
      payload = {};
    }
  }

  const eventName =
    typeof payload.hookEventName === 'string' ? payload.hookEventName.trim() : '';

  const responsePayload = buildHookResponse(eventName);

  // Always write clean JSON contract to stdout first.
  process.stdout.write(`${JSON.stringify(responsePayload)}\n`);

  if (!eventName && !payload.conversationId) {
    return;
  }

  const record = {
    ts: Date.now(),
    eventId: `${Date.now()}-${process.pid}-${Math.random().toString(36).slice(2, 8)}`,
    source: 'antigravity',
    event: eventName || 'Unknown',
    conversationId:
      typeof payload.conversationId === 'string' ? payload.conversationId : '',
    workspacePaths: Array.isArray(payload.workspacePaths)
      ? payload.workspacePaths.filter((p) => typeof p === 'string')
      : [],
    cwd: typeof payload.cwd === 'string' ? payload.cwd : '',
    modelName: typeof payload.modelName === 'string' ? payload.modelName : '',
    lastUserInput: cleanUserPrompt(payload.lastUserInput),
    toolName:
      payload.toolCall && typeof payload.toolCall.name === 'string'
        ? payload.toolCall.name
        : '',
    toolId:
      payload.toolCall && typeof payload.toolCall.id === 'string'
        ? payload.toolCall.id
        : '',
    toolSummary: summarizeToolArgs(payload.toolCall),
    toolError: typeof payload.error === 'string' && payload.error ? payload.error : null,
    terminationReason:
      typeof payload.terminationReason === 'string' ? payload.terminationReason : '',
    fullyIdle:
      typeof payload.fullyIdle === 'boolean' ? payload.fullyIdle : undefined,
    transcriptPath:
      typeof payload.transcriptPath === 'string' ? payload.transcriptPath : '',
  };

  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.appendFileSync(EVENTS_FILE, `${JSON.stringify(record)}\n`, 'utf8');
  } catch {
    // Never fail hook execution on logging error
  }

  await postToBridge(record);
}

main().catch(() => {
  try {
    process.stdout.write('{}\n');
  } catch {
    // ignore
  }
});
