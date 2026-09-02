param(
    [Parameter(Mandatory = $true)]
    [int]$SweepProcessId
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Log = Join-Path $Root 'rank8_low_low_registry_master_refresh_after_sweep_v2_root_20260825.txt'
$Original = Join-Path $Root 'drive_rank8_low_low_registry_master_refresh_after_sweep_root.ps1'

function Stamp([string]$Message) {
    Add-Content -LiteralPath $Log -Value "$(Get-Date -Format o) $Message"
}

try {
    Stamp "BEGIN WAIT_SWEEP_PID=$SweepProcessId"
    if (Get-Process -Id $SweepProcessId -ErrorAction SilentlyContinue) {
        Wait-Process -Id $SweepProcessId
    }
    $Block = Join-Path $Root 'rank8_low_low_a23_mixed_cross_multidegree_grades8_13_block_assembler_agent_20260825.json'
    if (-not (Test-Path -LiteralPath $Block)) {
        throw "Current sweep exited without the 48-cell block certificate: $Block"
    }
    $BlockPayload = Get-Content -Raw -LiteralPath $Block | ConvertFrom-Json
    if ($BlockPayload.status -ne 'PASS_HASH_PINNED_ALL_48_LOW_LOW_REGISTRY_CELLS_GRADES8_13') {
        throw "Current sweep block status was $($BlockPayload.status)"
    }
    Stamp "PASS_CURRENT_SWEEP SHA256=$((Get-FileHash -Algorithm SHA256 -LiteralPath $Block).Hash)"
    & 'pwsh.exe' -NoProfile -File $Original
    if ($LASTEXITCODE -ne 0) {
        throw "Registry/master refresh exited with code $LASTEXITCODE"
    }
    Stamp 'PASS_REFRESH_CHAIN'
    exit 0
} catch {
    Stamp "FAIL TYPE=$($_.Exception.GetType().Name) MESSAGE=$($_.Exception.Message)"
    exit 1
}
