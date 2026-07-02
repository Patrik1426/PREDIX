<#
  test-transform.ps1 — Test automático del despivote (transform-edomex.ps1).
  Crea un fixture sintético en temp, corre el transform REAL contra él y verifica el contrato:
    - ancho → largo (1 fila por mes no vacío)
    - omite meses en blanco
    - mes nombre → número
    - respeta campos entrecomillados con coma interna
    - víctimas conserva sexo + rango_edad

  Uso: powershell -ExecutionPolicy Bypass -File scripts\test-transform.ps1
  Exit 0 = pasa, 1 = falla.
#>

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName Microsoft.VisualBasic
$enc = New-Object System.Text.UTF8Encoding($false)
$script:fails = 0
function Assert($cond, $msg) {
  if ($cond) { Write-Output "  [OK] $msg" } else { Write-Output "  [X]  $msg"; $script:fails++ }
}

# ── Fixture temporal ──
$tmp = Join-Path $env:TEMP ("transform-test-" + [guid]::NewGuid().ToString('N').Substring(0,8))
$inDir = Join-Path $tmp "in"; $outDir = Join-Path $tmp "out"
New-Item -ItemType Directory -Force $inDir | Out-Null

# Delitos (21 cols): 9 base + 12 meses
$delHdr = "Anio,Clave_Ent,Entidad,Cve. Municipio,Municipio,Bien juridico,Tipo,Subtipo,Modalidad,Enero,Febrero,Marzo,Abril,Mayo,Junio,Julio,Agosto,Septiembre,Octubre,Noviembre,Diciembre"
$delRows = @(
  # Enero=1, Febrero=0, Marzo=2, resto vacío → 3 filas largas
  '2015,15,Mexico,15001,TestMuni,La vida,Homicidio,Homicidio doloso,Con arma de fuego,1,0,2,,,,,,,,,',
  # todos los meses vacíos → 0 filas
  '2016,15,Mexico,15002,OtroMuni,El patrimonio,Robo,Robo X,Sin violencia,,,,,,,,,,,,',
  # modalidad con coma interna (entrecomillada), Enero=5 → 1 fila
  '2016,15,Mexico,15003,"Muni, Dos",El patrimonio,Robo,Robo de maquinaria,"Robo de cables, tubos Con violencia",5,,,,,,,,,,,'
)
[System.IO.File]::WriteAllLines((Join-Path $inDir "EDOMEX_test-delitos.csv"), (@($delHdr) + $delRows), $enc)

# Víctimas (23 cols): 9 base + sexo + rango + 12 meses
$vicHdr = "Anio,Clave_Ent,Entidad,Cve. Municipio,Municipio,Bien juridico,Tipo,Subtipo,Modalidad,Sexo,Rango de edad,Enero,Febrero,Marzo,Abril,Mayo,Junio,Julio,Agosto,Septiembre,Octubre,Noviembre,Diciembre"
# Enero=3, resto vacío → 1 fila
$vicRow = '2026,15,Mexico,15004,MuniV,El patrimonio,Lesiones,Lesiones X,ModX,Hombre,18 a 29,3,,,,,,,,,,,'
[System.IO.File]::WriteAllLines((Join-Path $inDir "EDOMEX_test-Victimas.csv"), (@($vicHdr) + $vicRow), $enc)

# ── Correr el transform REAL sobre el fixture ──
& (Join-Path $PSScriptRoot "transform-edomex.ps1") -InDir $inDir -OutDir $outDir | Out-Null

# ── Leer salida (,$rows preserva el array; evita unwrap de 1 elemento) ──
function Read-Long([string]$path) {
  $p = New-Object Microsoft.VisualBasic.FileIO.TextFieldParser($path, [System.Text.Encoding]::UTF8)
  $p.SetDelimiters(','); $p.HasFieldsEnclosedInQuotes = $true
  $null = $p.ReadFields()
  $rows = @()
  while (-not $p.EndOfData) { $rows += ,($p.ReadFields()) }
  $p.Close(); return ,$rows
}
$del = Read-Long (Join-Path $outDir "delitos_long.csv")
$vic = Read-Long (Join-Path $outDir "victimas_long.csv")

# ── Aserciones (@() fuerza array; [0] toma la fila, luego [idx] el campo) ──
Write-Output "== Test transform =="
Assert ($del.Count -eq 4) "delitos: 4 filas largas (3+0+1), obtenido=$($del.Count)"

$m3 = @($del | Where-Object { $_[4] -eq '15001' -and $_[1] -eq '3' })
Assert ($m3.Count -eq 1 -and $m3[0][11] -eq '2') "delitos: 15001 mes=3 cantidad=2 (despivote + mes a numero)"

$f2 = @($del | Where-Object { $_[4] -eq '15002' })
Assert ($f2.Count -eq 0) "delitos: fila con meses vacios NO genera filas (no se imputa 0)"

$mc = @($del | Where-Object { $_[4] -eq '15003' })
Assert ($mc.Count -eq 1 -and $mc[0][5] -eq 'Muni, Dos') "delitos: campo entrecomillado 'Muni, Dos' preservado (RFC-4180)"
Assert ($mc.Count -eq 1 -and $mc[0][9] -eq 'Robo de cables, tubos Con violencia' -and $mc[0][11] -eq '5') "delitos: modalidad con coma intacta, cantidad=5"

Assert ($vic.Count -eq 1) "victimas: 1 fila larga, obtenido=$($vic.Count)"
Assert ($vic.Count -eq 1 -and $vic[0][10] -eq 'Hombre' -and $vic[0][11] -eq '18 a 29' -and $vic[0][13] -eq '3') "victimas: conserva sexo='Hombre', rango='18 a 29', cantidad=3"

# ── Limpieza ──
Remove-Item -Recurse -Force $tmp

Write-Output ""
if ($script:fails -eq 0) { Write-Output "RESULTADO: TODOS LOS TESTS PASARON"; exit 0 }
else { Write-Output "RESULTADO: $script:fails TEST(S) FALLARON"; exit 1 }
