# Pasta de Tilesets PNG (`16x16` / `32x32`) — Pixel Office

Esta pasta armazena o atlas de tilesets em PNG usado pelo **Pixel Office**:

- `office-atlas-16x16.png` + `atlas-map.json`: Atlas `16x16` padrão de arquitetura/mobiliário (paredes 3/4, janelas, tapetes, bancadas, aquário, quadros, fliperamas e mesa de ping-pong), embutido automaticamente em `dist/office-app.html`.
- `topdown-atlas.png` + `topdown-atlas-map.json`: Atlas **Top-Down 3/4** unificado (`384x336`, 44 sprites) empacotado via `scripts/pack-topdown-atlas.ps1` a partir de pacotes locais (*Modern Office 16x16*, *LimeZu Modern Interiors* personagens `Adam`/`Alex`/`Amelia`/`Bob` idle+walk, *Ghostpixxells Pixel Food* e *Carset Collection* veículos L/R) e embutido em `dist/office-app.html`.

## Como importar pacotes externos do LimeZu, Kenney.nl ou Itch.io

1. Baixe qualquer pacote `.zip` ou `.png` de:
   - **LimeZu Modern Office:** https://limezu.itch.io/modern-office
   - **LimeZu Modern Interiors (inclui versão Free Teaser):** https://limezu.itch.io/moderninteriors
   - **Kenney.nl (CC0):** https://kenney.nl/assets/roguelike-modern-city ou https://kenney.nl/assets/roguelike-rpg-pack
   - **Itch.io Free Pixel Art:** https://itch.io/game-assets/free/tag-pixel-art
2. Solte o arquivo `.png` (ou extraia o `.zip`) dentro desta pasta `assets/tilesets/` (ou deixe na sua pasta `Downloads`) e peça no chat do Antigravity: *"Mapeie o tileset que coloquei na pasta"*.
