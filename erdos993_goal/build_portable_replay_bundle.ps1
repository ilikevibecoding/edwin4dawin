$ErrorActionPreference = 'Stop'

$proofRoot = $PSScriptRoot
$portableRoot = Join-Path $proofRoot 'portable'
$stageRoot = Join-Path $portableRoot 'erdos993_rank6_replay_2026-09-02_v2'
$zipPath = Join-Path $portableRoot 'erdos993_rank6_replay_2026-09-02_v2.zip'
$handoffPath = Join-Path $proofRoot 'ERDOS993_OTHER_MODEL_HANDOFF_2026-09-02.md'

if (Test-Path -LiteralPath $stageRoot) {
    throw "Staging directory already exists: $stageRoot"
}
if (Test-Path -LiteralPath $zipPath) {
    throw "Archive already exists: $zipPath"
}

New-Item -ItemType Directory -Path $stageRoot -Force | Out-Null

$selected = [System.Collections.Generic.HashSet[string]]::new(
    [System.StringComparer]::OrdinalIgnoreCase
)
$queue = [System.Collections.Generic.Queue[string]]::new()

function Add-LocalFile([string] $name) {
    if ([string]::IsNullOrWhiteSpace($name)) {
        return
    }
    $candidate = Join-Path $proofRoot $name
    if ((Test-Path -LiteralPath $candidate -PathType Leaf) -and $selected.Add($name)) {
        $queue.Enqueue($name)
    }
}

@(
    'ERDOS993_OTHER_MODEL_HANDOFF_2026-09-02.md'
    'PORTABLE_REPLAY_README_2026-09-02.md'
    'verify_portable_manifest.py'
    'requirements-lock.txt'
    'build_portable_replay_bundle.ps1'
    'ADVERSARIAL_TREE_DP_SEARCH_2026-08-13.md'
    'CHECKPOINT_2026-07-23.md'
    'CHORDAL_DRIFT_AND_ISO_RESERVE_CASCADE_2026-07-28.md'
    'DENOMINATOR_FREE_LEAF_MONOTONICITY_CANDIDATE_2026-07-29.md'
    'assemble_iso_all_forest_n4_independent_g1_bernstein.py'
    'iso_all_forest_n4_independent_assembly_g1_bernstein_20260829.json'
    'assemble_iso_n6_bundle_g2_g10_root.py'
    'audit_iso_n6_bundle_g2_complete_independent_root.py'
    'audit_iso_n6_bundle_g2_g10_independent_root.py'
    'iso_n6_bundle_g2_all_geometries_all_parent_modes_assembled_exact_root_20260831.json'
    'iso_n6_bundle_g2_complete_independent_audit_exact_root_20260831.json'
    'iso_n6_bundle_g2_g10_independent_audit_exact_root_20260831.json'
    'verify_terminal_q3_payment_newton_tail_independent_agent.py'
    'terminal_q3_payment_newton_tail_independent_20260828.json'
) | ForEach-Object { Add-LocalFile $_ }

$handoffText = Get-Content -LiteralPath $handoffPath -Raw
[regex]::Matches($handoffText, '[A-Za-z0-9_.-]+\.(?:py|json|md|txt)') |
    ForEach-Object { Add-LocalFile $_.Value }

while ($queue.Count -gt 0) {
    $name = $queue.Dequeue()
    $extension = [IO.Path]::GetExtension($name)
    if ($extension -notin @('.py', '.md', '.txt')) {
        continue
    }

    $sourceText = Get-Content -LiteralPath (Join-Path $proofRoot $name) -Raw
    if ($extension -eq '.py') {
        foreach ($match in [regex]::Matches(
            $sourceText,
            '(?m)^\s*from\s+([A-Za-z_][A-Za-z0-9_\.]*)\s+import'
        )) {
            Add-LocalFile ($match.Groups[1].Value.Replace('.', '\') + '.py')
        }
        foreach ($match in [regex]::Matches(
            $sourceText,
            '(?m)^\s*import\s+([A-Za-z_][A-Za-z0-9_\.]*)'
        )) {
            Add-LocalFile ($match.Groups[1].Value.Replace('.', '\') + '.py')
        }
    }
    foreach ($match in [regex]::Matches(
        $sourceText,
        '[A-Za-z0-9_.-]+\.(?:py|json|md|txt|npz|csv)'
    )) {
        Add-LocalFile $match.Value
    }
}

foreach ($name in $selected) {
    $source = Join-Path $proofRoot $name
    $destination = Join-Path $stageRoot $name
    $destinationParent = Split-Path -Parent $destination
    if (-not (Test-Path -LiteralPath $destinationParent)) {
        New-Item -ItemType Directory -Path $destinationParent -Force | Out-Null
    }
    Copy-Item -LiteralPath $source -Destination $destination
}

$extraFiles = @{
    'external_brettrey_erdos993\DECISIONS.md' =
        'context\external_brettrey_erdos993_DECISIONS.md'
    'external_brettrey_erdos993\notes\literature\ramos_sun_li_strategy_map_2026-07-03.md' =
        'context\ramos_sun_li_strategy_map_2026-07-03.md'
}
foreach ($entry in $extraFiles.GetEnumerator()) {
    $source = Join-Path $proofRoot $entry.Key
    if (-not (Test-Path -LiteralPath $source -PathType Leaf)) {
        continue
    }
    $destination = Join-Path $stageRoot $entry.Value
    $destinationParent = Split-Path -Parent $destination
    New-Item -ItemType Directory -Path $destinationParent -Force | Out-Null
    Copy-Item -LiteralPath $source -Destination $destination
}

$legacySource = Join-Path $proofRoot 'external_brettrey_erdos993\gpt_attack\erdos993_open_handoff_2026-07-22'
$legacyDestination = Join-Path $stageRoot 'legacy_self_contained_handoff'
New-Item -ItemType Directory -Path $legacyDestination -Force | Out-Null
Get-ChildItem -LiteralPath $legacySource -File | ForEach-Object {
    Copy-Item -LiteralPath $_.FullName -Destination $legacyDestination
}

$manifestPath = Join-Path $stageRoot 'MANIFEST_SHA256.txt'
$manifestLines = Get-ChildItem -LiteralPath $stageRoot -Recurse -File |
    Where-Object { $_.FullName -ne $manifestPath } |
    Sort-Object FullName |
    ForEach-Object {
        $relative = [IO.Path]::GetRelativePath($stageRoot, $_.FullName).Replace('\', '/')
        $hash = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash
        "$hash  $relative"
    }
[IO.File]::WriteAllLines(
    $manifestPath,
    $manifestLines,
    [Text.UTF8Encoding]::new($false)
)

$verifyOutput = & python (Join-Path $stageRoot 'verify_portable_manifest.py') 2>&1
if ($LASTEXITCODE -ne 0) {
    throw "Manifest verification failed: $verifyOutput"
}

Compress-Archive -Path (Join-Path $stageRoot '*') -DestinationPath $zipPath `
    -CompressionLevel Optimal

$zip = Get-Item -LiteralPath $zipPath
$zipHash = (Get-FileHash -LiteralPath $zipPath -Algorithm SHA256).Hash
$allFiles = Get-ChildItem -LiteralPath $stageRoot -Recurse -File

Write-Output $verifyOutput
Write-Output "STAGE=$stageRoot"
Write-Output "FILES=$($allFiles.Count)"
Write-Output "UNCOMPRESSED_MB=$([math]::Round(($allFiles | Measure-Object Length -Sum).Sum / 1MB, 2))"
Write-Output "ZIP=$zipPath"
Write-Output "ZIP_MB=$([math]::Round($zip.Length / 1MB, 2))"
Write-Output "ZIP_SHA256=$zipHash"
