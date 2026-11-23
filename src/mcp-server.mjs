#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { startHttpBridge } from './http-bridge.mjs';
import { BRIDGE_PORT, OfficeStore } from './store.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HTML_PATH = path.resolve(__dirname, '..', 'dist', 'office-app.html');
const APP_URI = 'ui://pixel-office/app.html';
const APP_MIME = 'text/html;profile=mcp-app';

const store = new OfficeStore({ bridgePort: BRIDGE_PORT });

function formatNumber(n) {
  return Number(n || 0).toLocaleString('pt-BR');
}

function buildSummaryText(snapshot) {
  const { stats, agents, bridgeUrl, analytics, progression, projectsAndRepos, alerts } = snapshot;
  const lines = [
    `Pixel Office v4.0 ativo (${bridgeUrl}) · Lv ${progression?.level || 1} (${formatNumber(progression?.xp)} XP).`,
    `Agentes: ${stats.total} total (${stats.active} ativos agora · ${stats.antigravityCount} Antigravity · ${stats.geminiWebCount} Gemini Web) · ${projectsAndRepos?.length || 0} repos/projetos.`,
    `Consumo 5h: ${formatNumber(analytics?.window5h?.totalTokens)} tokens · 24h: ${formatNumber(analytics?.window24h?.totalTokens)} tokens (economia de cache: ${analytics?.cacheSavingsPct || 0}% · ~\$${(analytics?.window24h?.estimatedUsd || 0).toFixed(4)}).`,
  ];
  if (alerts && alerts.length > 0) {
    lines.push(`Alertas ativos (${alerts.length}): ${alerts.map((a) => a.message).join(' | ')}`);
  }
  if (agents.length > 0) {
    lines.push('');
    lines.push('Sessões recentes:');
    for (const a of agents.slice(0, 8)) {
      const origin = a.source === 'gemini-web' ? 'Gemini Web' : 'Antigravity';
      const detail = a.currentTool ? ` (${a.currentTool})` : '';
      lines.push(`- [${origin}] ${a.room} · ${a.title} — estado: ${a.state}${detail}`);
    }
  } else {
    lines.push('');
    lines.push('Nenhuma sessão recente detectada ainda. Abra uma conversa ou conecte a extensão do Gemini Web.');
  }
  return lines.join('\n');
}

function readAppHtml() {
  try {
    return fs.readFileSync(HTML_PATH, 'utf8');
  } catch (err) {
    return `<!doctype html><html><body><h1>Pixel Office UI não compilada</h1><p>${String(err.message)}</p></body></html>`;
  }
}

const server = new Server(
  { name: 'pixel-office', version: '4.0.0' },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

server.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources: [
    {
      uri: APP_URI,
      name: 'Pixel Office UI',
      description: 'Escritório virtual em pixel art v3.0 para Antigravity, Gemini Web e GitHub/Projetos',
      mimeType: APP_MIME,
      _meta: {
        ui: {
          prefersBorder: false,
        },
      },
    },
  ],
}));

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const uri = request.params?.uri;
  if (uri !== APP_URI) {
    throw new Error(`Unknown resource URI: ${uri}`);
  }
  return {
    contents: [
      {
        uri: APP_URI,
        mimeType: APP_MIME,
        text: readAppHtml(),
        _meta: {
          ui: {
            prefersBorder: false,
          },
        },
      },
    ],
  };
});

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'open_pixel_office',
      title: 'Pixel Office',
      description:
        'Abre o escritório virtual em pixel art em tempo real para acompanhar agentes do Antigravity, abas do Gemini Web, repositórios GitHub/Projetos, consumo 5h/24h/7d, Replay e Kanban.',
      inputSchema: {
        type: 'object',
        properties: {
          filter: {
            type: 'string',
            enum: ['all', 'antigravity', 'gemini-web'],
            description: 'Filtro inicial opcional de plataforma.',
          },
          theme: {
            type: 'string',
            enum: ['auto', 'day', 'night', 'cyber', 'christmas'],
            description: 'Tema visual inicial opcional do escritório.',
          },
        },
      },
      _meta: {
        ui: {
          resourceUri: APP_URI,
        },
        'com.google.antigravity/ui': {
          entrypoints: [
            { type: 'aux_pane', title: 'Pixel Office' },
            { type: 'global', title: 'Pixel Office' },
          ],
        },
      },
    },
    {
      name: 'get_office_state',
      title: 'Get Pixel Office State',
      description: 'Retorna o snapshot v2.0 atualizado de agentes, salas, repos, consumo e métricas.',
      inputSchema: { type: 'object', properties: {} },
      _meta: { ui: { visibility: ['app'] } },
    },
    {
      name: 'clear_offline_agents',
      title: 'Clear Offline Agents',
      description: 'Remove sessões offline e inativas do escritório.',
      inputSchema: { type: 'object', properties: {} },
      _meta: { ui: { visibility: ['app'] } },
    },
    {
      name: 'update_office_prefs',
      title: 'Update Pixel Office Prefs',
      description: 'Atualiza preferências, mascote, limites de consumo e customizações manuais.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: true },
      _meta: { ui: { visibility: ['app'] } },
    },
    {
      name: 'manage_office_room',
      title: 'Manage Office Room',
      description: 'Cria, renomeia, redefine ou remove salas do escritório.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: true },
      _meta: { ui: { visibility: ['app'] } },
    },
    {
      name: 'manage_kanban',
      title: 'Manage Kanban',
      description: 'Cria, move ou exclui tarefas no Kanban do escritório.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: true },
      _meta: { ui: { visibility: ['app'] } },
    },
    {
      name: 'refresh_repos',
      title: 'Refresh GitHub and Projects',
      description: 'Reescaneia projetos do Antigravity e repositórios Git/GitHub locais.',
      inputSchema: { type: 'object', properties: {} },
      _meta: { ui: { visibility: ['app'] } },
    },
    {
      name: 'get_office_summary',
      title: 'Resumo do Pixel Office',
      description:
        'Retorna um resumo em texto dos agentes ativos no Antigravity e no Gemini Web, consumo de tokens, alertas e repositórios.',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'get_daily_report',
      title: 'Relatório do Dia (Markdown)',
      description:
        'Gera o relatório em Markdown da atividade de hoje no Antigravity, Gemini Web, repositórios e Kanban.',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'consolidate_office_memory',
      title: 'Sonhar / Consolidar Memórias',
      description:
        'Reconsolida memórias do escritório (compacta events.jsonl, limpa sessões offline/cache antigo) e ativa o estado Sonhando nos avatares.',
      inputSchema: {
        type: 'object',
        properties: {
          agentId: {
            type: 'string',
            description: 'ID opcional de um agente específico para entrar em estado Sonhando.',
          },
        },
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const name = request.params?.name;
  const args = request.params?.arguments || {};

  if (name === 'open_pixel_office') {
    const snapshot = store.getSnapshot();
    return {
      content: [{ type: 'text', text: buildSummaryText(snapshot) }],
      structuredContent: snapshot,
    };
  }

  if (name === 'get_office_state') {
    const snapshot = store.getSnapshot();
    return {
      content: [{ type: 'text', text: 'ok' }],
      structuredContent: snapshot,
    };
  }

  if (name === 'clear_offline_agents') {
    const snapshot = store.clearOffline();
    return {
      content: [{ type: 'text', text: 'Sessões offline removidas.' }],
      structuredContent: snapshot,
    };
  }

  if (name === 'update_office_prefs') {
    const snapshot = store.updatePrefs(args);
    return {
      content: [{ type: 'text', text: 'Preferências atualizadas.' }],
      structuredContent: snapshot,
    };
  }

  if (name === 'manage_office_room') {
    const snapshot = store.manageRoom(args);
    return {
      content: [{ type: 'text', text: 'Sala atualizada.' }],
      structuredContent: snapshot,
    };
  }

  if (name === 'manage_kanban') {
    const snapshot = store.manageKanban(args);
    return {
      content: [{ type: 'text', text: 'Kanban atualizado.' }],
      structuredContent: snapshot,
    };
  }

  if (name === 'refresh_repos') {
    const snapshot = store.refreshRepos();
    return {
      content: [{ type: 'text', text: 'Repositórios atualizados.' }],
      structuredContent: snapshot,
    };
  }

  if (name === 'get_office_summary') {
    const snapshot = store.getSnapshot();
    return {
      content: [{ type: 'text', text: buildSummaryText(snapshot) }],
    };
  }

  if (name === 'get_daily_report') {
    return {
      content: [{ type: 'text', text: store.generateDailyReport() }],
    };
  }

  if (name === 'consolidate_office_memory') {
    const result = store.consolidateMemory(args);
    const { compactedLines, clearedOffline, prunedCache } = result.stats;
    return {
      content: [
        {
          type: 'text',
          text: `Estado Sonhando ativado! Memórias consolidadas (${compactedLines} linhas compactadas, ${clearedOffline} sessões offline limpas, ${prunedCache} entradas antigas removidas).`,
        },
      ],
      structuredContent: result.snapshot,
    };
  }

  throw new Error(`Unknown tool: ${name}`);
});

async function main() {
  const bridge = await startHttpBridge({
    store,
    htmlPath: HTML_PATH,
    port: BRIDGE_PORT,
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[pixel-office] MCP server v4.0 ready on stdio');

  const shutdown = async () => {
    try {
      await bridge.stop?.();
    } catch {
      // ignore
    }
    process.exit(0);
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('[pixel-office] MCP server fatal error:', err);
  process.exit(1);
});
