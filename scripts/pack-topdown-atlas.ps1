# Empacota sprites Top-Down 3/4 de pacotes locais em assets/tilesets/topdown-atlas.png
# e gera assets/tilesets/topdown-atlas-map.json para o Pixel Office.
$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.IO.Compression.FileSystem

$rootDir = Split-Path -Parent $PSScriptRoot
$outDir = Join-Path $rootDir 'assets\tilesets'
$outPng = Join-Path $outDir 'topdown-atlas.png'
$outMap = Join-Path $outDir 'topdown-atlas-map.json'
$dlDir = Join-Path $env:USERPROFILE 'Downloads'

$officeZipPath = Join-Path $dlDir 'modern-office-tileset-16x16-free-sample.zip'
$limezuZipPath = Join-Path $dlDir 'Modern_Interiors_Free_v2.2.zip'
$foodZipPath   = Join-Path $dlDir 'Ghostpixxells_pixelfood.zip'
$carsZipPath   = Join-Path $dlDir 'Carset Collection.zip'

foreach ($zp in @($officeZipPath, $limezuZipPath, $foodZipPath, $carsZipPath)) {
  if (-not (Test-Path $zp)) {
    throw "Pacote obrigatorio nao encontrado: $zp"
  }
}

New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$atlasW = 384
$atlasH = 336
$atlas = New-Object System.Drawing.Bitmap($atlasW, $atlasH, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($atlas)
$g.Clear([System.Drawing.Color]::Transparent)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::None
$g.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceOver

$map = [ordered]@{}

function Open-ZipEntryBitmap([System.IO.Compression.ZipArchive]$zip, [string]$entryPattern) {
  $entry = $zip.Entries | Where-Object {
    $_.FullName -eq $entryPattern -or $_.FullName -like "*/$entryPattern"
  } | Select-Object -First 1
  if (-not $entry) {
    throw "Entrada nao encontrada no ZIP: $entryPattern"
  }
  $stream = $entry.Open()
  try {
    $ms = New-Object System.IO.MemoryStream
    $stream.CopyTo($ms)
    $ms.Position = 0
    return (New-Object System.Drawing.Bitmap($ms))
  } finally {
    $stream.Dispose()
  }
}

function Add-RegionToAtlas([string]$key, [System.Drawing.Bitmap]$src, [int]$sx, [int]$sy, [int]$sw, [int]$sh, [int]$dx, [int]$dy) {
  $dstRect = New-Object System.Drawing.Rectangle($dx, $dy, $sw, $sh)
  $srcRect = New-Object System.Drawing.Rectangle($sx, $sy, $sw, $sh)
  $g.DrawImage($src, $dstRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)
  $map[$key] = [ordered]@{ x = $dx; y = $dy; w = $sw; h = $sh }
}

$officeZip = [System.IO.Compression.ZipFile]::OpenRead($officeZipPath)
$limezuZip = [System.IO.Compression.ZipFile]::OpenRead($limezuZipPath)
$foodZip   = [System.IO.Compression.ZipFile]::OpenRead($foodZipPath)
$carsZip   = [System.IO.Compression.ZipFile]::OpenRead($carsZipPath)

try {
  # Linha 0 (y = 0..16): tiles e itens pequenos 16x16 + mesa de centro 32x16
  $officeRow0 = @(
    @{ key = 'floor_wood';   entry = 'tiles/floor_wood.png';      x = 0;   y = 0; w = 16; h = 16 },
    @{ key = 'floor_carpet'; entry = 'tiles/floor_carpet.png';    x = 16;  y = 0; w = 16; h = 16 },
    @{ key = 'floor_tile';   entry = 'tiles/floor_tile.png';      x = 32;  y = 0; w = 16; h = 16 },
    @{ key = 'wall_lower';   entry = 'tiles/wall_lower.png';      x = 48;  y = 0; w = 16; h = 16 },
    @{ key = 'wall_cap_top'; entry = 'tiles/wall_cap_top.png';    x = 64;  y = 0; w = 16; h = 16 },
    @{ key = 'plant_small';  entry = 'objects/plant_small.png';   x = 80;  y = 0; w = 16; h = 16 },
    @{ key = 'printer';      entry = 'objects/printer.png';       x = 96;  y = 0; w = 16; h = 16 },
    @{ key = 'clock';        entry = 'objects/clock.png';         x = 112; y = 0; w = 16; h = 16 },
    @{ key = 'trash_bin';    entry = 'objects/trash_bin.png';     x = 128; y = 0; w = 16; h = 16 },
    @{ key = 'mug';          entry = 'objects/mug.png';           x = 144; y = 0; w = 16; h = 16 },
    @{ key = 'laptop_open';  entry = 'objects/laptop_open.png';   x = 160; y = 0; w = 16; h = 16 },
    @{ key = 'coffee_table'; entry = 'objects/coffee_table.png';  x = 176; y = 0; w = 32; h = 16 }
  )

  # Linha 1 (y = 16..48): mobiliario 32px de altura
  $officeRow1 = @(
    @{ key = 'desk_monitor';    entry = 'objects/desk_monitor.png';      x = 0;   y = 16; w = 32; h = 32 },
    @{ key = 'desk';            entry = 'objects/desk.png';              x = 32;  y = 16; w = 32; h = 32 },
    @{ key = 'chair_up';        entry = 'objects/chair_office_up.png';   x = 64;  y = 16; w = 16; h = 32 },
    @{ key = 'chair_down';      entry = 'objects/chair_office_down.png'; x = 80;  y = 16; w = 16; h = 32 },
    @{ key = 'filing_cabinet';  entry = 'objects/filing_cabinet.png';    x = 96;  y = 16; w = 16; h = 32 },
    @{ key = 'plant_big';       entry = 'objects/plant_big.png';         x = 112; y = 16; w = 32; h = 32 },
    @{ key = 'water_dispenser'; entry = 'objects/water_dispenser.png';   x = 144; y = 16; w = 16; h = 32 },
    @{ key = 'whiteboard';      entry = 'objects/whiteboard.png';        x = 160; y = 16; w = 32; h = 32 },
    @{ key = 'window';          entry = 'objects/window.png';            x = 192; y = 16; w = 32; h = 32 },
    @{ key = 'sofa';            entry = 'objects/sofa.png';              x = 224; y = 16; w = 48; h = 32 },
    @{ key = 'box_stack';       entry = 'objects/box_stack.png';         x = 272; y = 16; w = 16; h = 32 }
  )

  # Linha 2 (y = 48..96): pecas altas 48px
  $officeRow2 = @(
    @{ key = 'bookshelf'; entry = 'objects/bookshelf.png'; x = 0;  y = 48; w = 32; h = 48 },
    @{ key = 'door_wood'; entry = 'objects/door_wood.png'; x = 32; y = 48; w = 16; h = 48 }
  )

  foreach ($item in ($officeRow0 + $officeRow1 + $officeRow2)) {
    $bmp = Open-ZipEntryBitmap $officeZip $item.entry
    try {
      Add-RegionToAtlas $item.key $bmp 0 0 $item.w $item.h $item.x $item.y
    } finally {
      $bmp.Dispose()
    }
  }

  # Comida top-down 32x32 na Linha 2 (y = 48..80, x = 48..208)
  $foods = @(
    @{ key = 'food_donut';   entry = '35_donut_dish.png';         x = 48 },
    @{ key = 'food_burger';  entry = '16_burger_dish.png';        x = 80 },
    @{ key = 'food_cake';    entry = '31_chocolatecake_dish.png'; x = 112 },
    @{ key = 'food_cookies'; entry = '29_cookies_dish.png';       x = 144 },
    @{ key = 'food_pie';     entry = '06_apple_pie_dish.png';     x = 176 }
  )
  foreach ($f in $foods) {
    $bmp = Open-ZipEntryBitmap $foodZip $f.entry
    try {
      Add-RegionToAtlas $f.key $bmp 0 0 32 32 $f.x 48
    } finally {
      $bmp.Dispose()
    }
  }

  # Personagens LimeZu animados (idle 64x32 [R,U,L,D] + walk 128x32 [4 Right, 4 Left])
  $chars = @(
    @{ name = 'Adam';   key = 'adam';   dx = 0;   dy = 96 },
    @{ name = 'Amelia'; key = 'amelia'; dx = 192; dy = 96 },
    @{ name = 'Alex';   key = 'alex';   dx = 0;   dy = 128 },
    @{ name = 'Bob';    key = 'bob';    dx = 192; dy = 128 }
  )
  foreach ($ch in $chars) {
    $idleBmp = Open-ZipEntryBitmap $limezuZip ("Modern tiles_Free/Characters_free/" + $ch.name + "_idle_16x16.png")
    $runBmp  = Open-ZipEntryBitmap $limezuZip ("Modern tiles_Free/Characters_free/" + $ch.name + "_run_16x16.png")
    try {
      Add-RegionToAtlas ("char_" + $ch.key + "_idle") $idleBmp 0 0 64 32 $ch.dx $ch.dy
      # Tira walk combina 4 frames Right (x=0..64) + 4 frames Left (x=192..256)
      $walkKey = "char_" + $ch.key + "_walk"
      $walkX = $ch.dx + 64
      $g.DrawImage($runBmp, (New-Object System.Drawing.Rectangle($walkX, $ch.dy, 64, 32)), (New-Object System.Drawing.Rectangle(0, 0, 64, 32)), [System.Drawing.GraphicsUnit]::Pixel)
      $g.DrawImage($runBmp, (New-Object System.Drawing.Rectangle(($walkX + 64), $ch.dy, 64, 32)), (New-Object System.Drawing.Rectangle(192, 0, 64, 32)), [System.Drawing.GraphicsUnit]::Pixel)
      $map[$walkKey] = [ordered]@{ x = $walkX; y = $ch.dy; w = 128; h = 32 }
    } finally {
      $idleBmp.Dispose()
      $runBmp.Dispose()
    }
  }

  # Carros top-down (Carset Collection: 115x71 por frame; col 1 = frame central; row 1 y=71 Left, row 2 y=142 Right)
  # IMPORTANTE: aspas simples preservam '$ModernPlus' literal no PowerShell.
  $cars = @(
    @{ key = 'car_red';    entry = 'Carset Collection/Compact Vehicle 1/$ModernPlus Car - Compact Vehicle I Red.png';    dx = 0 },
    @{ key = 'car_blue';   entry = 'Carset Collection/Compact Vehicle 1/$ModernPlus Car - Compact Vehicle I Blue.png';   dx = 115 },
    @{ key = 'car_orange'; entry = 'Carset Collection/Compact Vehicle 1/$ModernPlus Car - Compact Vehicle I Orange.png'; dx = 230 }
  )
  foreach ($car in $cars) {
    $carBmp = Open-ZipEntryBitmap $carsZip $car.entry
    try {
      Add-RegionToAtlas ($car.key + '_l') $carBmp 115 71  115 71 $car.dx 176
      Add-RegionToAtlas ($car.key + '_r') $carBmp 115 142 115 71 $car.dx 256
    } finally {
      $carBmp.Dispose()
    }
  }

  $atlas.Save($outPng, [System.Drawing.Imaging.ImageFormat]::Png)
  $json = $map | ConvertTo-Json -Depth 4
  [System.IO.File]::WriteAllText($outMap, $json, [System.Text.UTF8Encoding]::new($false))
  Write-Host "Gerado $outPng ($($atlasW)x$($atlasH)) com $($map.Count) sprites e mapa $outMap"
} finally {
  $officeZip.Dispose()
  $limezuZip.Dispose()
  $foodZip.Dispose()
  $carsZip.Dispose()
  $g.Dispose()
  $atlas.Dispose()
}
