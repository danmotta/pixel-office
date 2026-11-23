---
name: pixel-office
description: >-
  Abre e consulta o escritório virtual em pixel art (Pixel Office v4.0) para
  monitorar sessões do Antigravity, abas do Gemini Web (gemini.google.com),
  repositórios GitHub/Projetos, consumo real 5h/24h/7d por modelo com reset
  countdown, Vida Social com personalidades e moedinhas, estados Dormindo vs.
  Sonhando (reconsolidação de memória), Paleta Ctrl+K, Replay, Kanban e Mascote.
  Use quando o usuário pedir para abrir o Pixel Office, ver o status visual dos
  agentes, consolidar memórias, gerar relatório do dia ou conectar o Gemini Web.
---

# Pixel Office v4.0

O **Pixel Office v4.0** exibe um campus completo em pixel art a 60 FPS (estilo Habblaud / Stardew Valley / Antigravity Pet) com HUD flutuante em 1 linha, ícones SVG, vidro fosco leve e Paleta de Comandos (`Ctrl+K`):
- Campus completo com texturas cacheadas, luz/sombra suave, árvores, rua com carros, postes que acendem à noite, Recepção, Copa, Banheiros com espelho, Lounge (TV, pingue-pongue e fliperamas), corredor central, salas dinâmicas do **Antigravity**, estúdio **Gemini Web** (`gemini.google.com`), hub **GitHub & Projetos** e varanda de descanso;
- **Limites Reais & Por Modelo**: calibrado por padrão em `6M/5h · 15M/24h · 80M/7d · 100t Gemini Web` (com presets `Meu ritmo`, `AI Pro`, `Ultra` e `Sem teto`), countdown até reset de janela, alertas alternáveis e quebra por modelo LLM;
- **Dormindo vs. Sonhando**: `Dormindo` continua indicando avatares ociosos (`Zzz`); `Sonhando` (`💭`) representa a reconsolidação de memórias e limpeza de registros antigos (ativado automaticamente em atividade de conhecimento/compactação ou pelo botão **Sonhar** / ferramenta `consolidate_office_memory`);
- **Vida Social e Personalidade**: nomes brasileiros determinísticos, 14 traços de personalidade, bordões, amigos/rivais, economia de *moedinhas* com extrato, partidas de pingue-pongue, jokenpô, TV, fliperama e papo na copa pelo corredor central;
- **Paleta Rápida (`Ctrl+K`) & Expansão**: atalhos `/`, `[`, `O`, `0`, `+`, `-`, `F`, `R`, `Ctrl+K`, `?`, notificações do Windows, Replay 24h, Kanban, Mini-Pet flutuante e customização de sala/avatar.

## Ferramentas disponíveis

- `open_pixel_office`: Abre a interface interativa do Pixel Office diretamente no painel lateral ou barra lateral do Antigravity e retorna o snapshot completo.
- `consolidate_office_memory`: Dispara o ciclo **Sonhando** (reconsolidação de memórias e limpeza de sessões/eventos antigos) para todos os agentes ou um `agentId` específico.
- `get_office_summary`: Retorna um resumo em texto das sessões ativas no Antigravity e no Gemini Web, consumo de tokens, alertas e repositórios.
- `get_daily_report`: Gera o relatório completo do dia em Markdown (consumo, economia de cache, sessões, GitHub/Projetos e Kanban).

## Onde o usuário pode visualizar

1. **Dentro do Antigravity**: Pelo botão `+` no painel lateral ou pela barra lateral esquerda em **Pixel Office**, ou chamando `open_pixel_office`.
2. **No navegador**: Em `http://127.0.0.1:4748` (com suporte a **Mini-Pet** flutuante sempre no topo e notificações nativas do Windows).
3. **Conectar o Gemini Web (`gemini.google.com`)**:
   - Abra `chrome://extensions` (Chrome) ou `edge://extensions` (Edge).
   - Ative **Modo do desenvolvedor** e clique em **Carregar sem compactação**.
   - Selecione `~/.gemini/config/plugins/pixel-office/chrome-extension` (no Windows: `%USERPROFILE%\.gemini\config\plugins\pixel-office\chrome-extension`).
