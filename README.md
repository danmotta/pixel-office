# Pixel Office v4.0 · Antigravity, Gemini Web & Vida Social

Escritório virtual em pixel art a 60 FPS (inspirado em **Habblaud**, **Stardew Valley**, **Antigravity Pet** e **Pixel Agents**) construído como plugin nativo para o **Antigravity**, com suporte simultâneo ao **Gemini Web** (`gemini.google.com`) via extensão Manifest V3 para Chrome/Edge e sala automática de **GitHub & Projetos**.

## Novidades da v4.0

- **Limites Reais Calibrados & Breakdown por Modelo**: janelas padrão alinhadas ao ritmo real (`6M / 5h`, `15M / 24h`, `80M / 7d`, `100 turnos Gemini`), countdown até o próximo reset (`⟳`), presets rápidos (`Meu ritmo`, `AI Pro`, `Ultra`, `Sem teto`), alertas alternáveis e consumo detalhado por modelo LLM na aba Consumo.
- **Pixel Art Rico a 60 FPS + HUD 1 Linha**: sprites multi-tom arredondados estilo indie RPG, piscar de olhos, mobiliário e texturas cacheadas com oclusão ambiente, vidro fosco leve, ícones SVG nítidos e **Paleta de Comandos rápida (`Ctrl+K`)** estilo Raycast (`+ Sala`, Mini-Pet, Gemini Web, Replay, Kanban, temas e busca de agentes).
- **Dormindo vs. Sonhando**: `Dormindo` (`Zzz`) permanece exclusivo para sessões ociosas; `Sonhando` indica reconsolidação de memórias e limpeza de caches/registros antigos (disparo automático em atividade de *knowledge* ou manual pelo botão **Sonhar** / ferramenta `consolidate_office_memory`).
- **Vida Social e Personalidade**: nomes brasileiros determinísticos, 14 traços, bordões, amigos e rivalidades, moedinhas com extrato e 7 círculos sociais (pingue-pongue, TV, fliperama, copa, jokenpô, espelho e conversa) — avatares voltam correndo quando recebem trabalho.
- **Temas Auto / Dia / Noite / Cyber / Natal + Replay 24h & Kanban**: iluminação dinâmica por horário no modo `Auto`, sprites natalinos em `Natal`, sala automática **GitHub & Projetos**, expansão `+ Sala`, móveis desbloqueáveis por XP e Mini-Pet *Picture-in-Picture*.

## Instalação Rápida (Plug-and-Play — Windows, macOS e Linux)

Requisito único: **Node.js 18+** instalado na máquina. Os bundles de interface (`dist/office-app.html`) e do servidor MCP (`dist/mcp-server.mjs`) já vão pré-compilados — **não é necessário rodar `npm install`**.

### Opção 1 — Via arquivo `.zip`
Extraia o pacote para que a pasta final fique em:
- **Windows:** `%USERPROFILE%\.gemini\config\plugins\pixel-office`
- **macOS / Linux:** `~/.gemini/config/plugins/pixel-office`

Confirme que o arquivo `plugin.json` ficou diretamente dentro de `.../plugins/pixel-office/plugin.json` e reinicie/abra o Antigravity.

### Opção 2 — Via Git (recomendado para receber atualizações)
- **macOS / Linux (bash/zsh):**
  `git clone <url-do-repo> ~/.gemini/config/plugins/pixel-office`
- **Windows (PowerShell):**
  `git clone <url-do-repo> "$env:USERPROFILE\.gemini\config\plugins\pixel-office"`

Para atualizar depois, basta rodar `git pull` dentro da pasta do plugin.

## Onde usar

1. **Dentro do Antigravity**: Pelo botão `+` no painel lateral ou na barra lateral esquerda em **Pixel Office**.
2. **No navegador**: Acesse `http://127.0.0.1:4748`.

## Instalar a extensão do Gemini Web no Chrome ou Edge

1. Abra `chrome://extensions` (Chrome) ou `edge://extensions` (Edge).
2. Ative o **Modo do desenvolvedor** (canto superior direito).
3. Clique em **Carregar sem compactação** (*Load unpacked*).
4. Selecione a subpasta `chrome-extension` dentro do plugin:
   - **Windows:** `%USERPROFILE%\.gemini\config\plugins\pixel-office\chrome-extension`
   - **macOS / Linux:** `~/.gemini/config/plugins/pixel-office/chrome-extension`
   *(Você também pode abrir a paleta `Ctrl+K` → **Conectar extensão Gemini Web** e clicar em **Copiar** para pegar o caminho exato da sua máquina).*
