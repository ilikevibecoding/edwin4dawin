param(
    [int]$MaxBatchesPerProcess = 40,
    [int]$MaxNoProgressFailures = 3
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Python = (Get-Command python).Source
$Scanner = Join-Path $Root 'scan_rank8_delta03_e5_five_cubic_path_center_pendant_internal_cuda_rays_agent.py'
$Checkpoint = Join-Path $Root 'rank8_delta03_e5_five_cubic_path_center_pendant_internal_cuda_rays_checkpoint_agent_20260825.json'
$RayReport = Join-Path $Root 'rank8_delta03_e5_five_cubic_path_center_pendant_internal_cuda_rays_exact_agent_20260825.json'
$Reduction = Join-Path $Root 'rank8_delta03_e5_five_cubic_path_center_pendant_internal_newton_reduction_exact_agent_20260825.json'
$Chain = Join-Path $Root 'drive_rank8_delta03_e5_five_cubic_path_center_pendant_internal_cuda_chain_root.ps1'
$Log = Join-Path $Root 'e5_five_cubic_path_center_pendant_internal_cuda_resilient_v2_root_20260825.txt'

$ExpectedSources = @{
    'scan_rank8_delta03_e5_five_cubic_path_center_pendant_internal_cuda_rays_agent.py' = '00B70518FF28FAFC17E924B08C8CA73F86E6902629A3D2BCBB30615271B62429'
    'run_rank8_cuda_unordered_halves_internal_rays_driver_agent.py' = '3A3FDA406198BB6A3E84AE4E34328D9CCB61429E3B95BD974CFDF70A0935A353'
    'benchmark_rank8_cuda_path_center_pendant_internal_formula_agent.py' = 'E39A65FE559D70062EDAAF0E760B7345C5E35A6CB9CFC0B6D854CDF848653CC8'
}

function Stamp([string]$Message) {
    Add-Content -LiteralPath $Log -Value "$(Get-Date -Format o) $Message"
}

function Get-Sha256([string]$Path) {
    return (Get-FileHash -Algorithm SHA256 -LiteralPath $Path).Hash
}

function Read-Checkpoint() {
    if (-not (Test-Path -LiteralPath $Checkpoint)) {
        throw "Missing checkpoint: $Checkpoint"
    }
    $payload = Get-Content -Raw -LiteralPath $Checkpoint | ConvertFrom-Json
    if ($payload.schema -ne 'rank8-delta03-e5-five-cubic-path-center-pendant-internal-cuda-rays-agent-checkpoint-v1') {
        throw "Unexpected checkpoint schema: $($payload.schema)"
    }
    if ($payload.batch_size -ne 750000) {
        throw "Unexpected checkpoint batch size: $($payload.batch_size)"
    }
    foreach ($key in 'gate_failures','bound_failures','negative_classifications') {
        if ($payload.totals.$key -ne 0) {
            throw "Checkpoint contains nonzero ${key}: $($payload.totals.$key)"
        }
    }
    return $payload
}

try {
    if (($MaxBatchesPerProcess -lt 1) -or ($MaxBatchesPerProcess -gt 100)) {
        throw "MaxBatchesPerProcess must be in 1..100"
    }
    if ($MaxNoProgressFailures -lt 1) {
        throw "MaxNoProgressFailures must be positive"
    }
    foreach ($entry in $ExpectedSources.GetEnumerator()) {
        $path = Join-Path $Root $entry.Key
        $actual = Get-Sha256 $path
        if ($actual -ne $entry.Value) {
            throw "Pinned source drift for $($entry.Key): $actual"
        }
    }
    $total = (Get-Content -Raw -LiteralPath $Reduction | ConvertFrom-Json).quotient_counts.total
    if ($total -ne 4406205440) {
        throw "Unexpected total ray-domain patterns: $total"
    }
    Stamp "BEGIN TOTAL=$total MAX_BATCHES_PER_PROCESS=$MaxBatchesPerProcess"

    $attempt = 0
    $noProgressFailures = 0
    while ($true) {
        $before = Read-Checkpoint
        if ($before.cursor -eq $total) {
            break
        }
        if ($before.cursor -gt $total) {
            throw "Checkpoint cursor exceeds total: $($before.cursor) > $total"
        }
        $attempt++
        Stamp "ATTEMPT=$attempt START_CURSOR=$($before.cursor) CHECKPOINT_SHA256=$(Get-Sha256 $Checkpoint)"
        $lines = & $Python $Scanner '--max-batches' "$MaxBatchesPerProcess" 2>&1
        $exitCode = $LASTEXITCODE
        foreach ($line in $lines) {
            Stamp "SCANNER $line"
        }
        $after = Read-Checkpoint
        if ($after.cursor -lt $before.cursor) {
            throw "Checkpoint cursor regressed: $($before.cursor) -> $($after.cursor)"
        }
        $progress = $after.cursor - $before.cursor
        Stamp "ATTEMPT=$attempt EXIT=$exitCode END_CURSOR=$($after.cursor) PROGRESS=$progress CHECKPOINT_SHA256=$(Get-Sha256 $Checkpoint)"
        if ($exitCode -ne 0) {
            if ($progress -eq 0) {
                $noProgressFailures++
            } else {
                $noProgressFailures = 0
            }
            if ($noProgressFailures -ge $MaxNoProgressFailures) {
                throw "Scanner failed without checkpoint progress $noProgressFailures consecutive times"
            }
            Stamp "RECOVERABLE_FRESH_PROCESS_RETRY NO_PROGRESS_FAILURES=$noProgressFailures"
            continue
        }
        $noProgressFailures = 0
        if ($progress -eq 0) {
            throw 'Scanner exited successfully without progress before total completion'
        }
    }

    if (-not (Test-Path -LiteralPath $RayReport)) {
        throw "Completed checkpoint lacks ray report: $RayReport"
    }
    $rayPayload = Get-Content -Raw -LiteralPath $RayReport | ConvertFrom-Json
    if ($rayPayload.status -ne 'PASS_EXACT_CUDA_I256_CRT_E5_FIVE_CUBIC_PATH_CENTER_PENDANT_INTERNAL_RAYS') {
        throw "Unexpected ray-report status: $($rayPayload.status)"
    }
    if ($rayPayload.checkpoint_sha256 -ne (Get-Sha256 $Checkpoint)) {
        throw 'Ray report does not pin the final checkpoint hash'
    }
    Stamp "PASS_RAY_REPORT SHA256=$(Get-Sha256 $RayReport) CHECKPOINT_SHA256=$(Get-Sha256 $Checkpoint)"

    & 'pwsh.exe' -NoProfile -File $Chain -OuterChainProcessId 2147483647
    if ($LASTEXITCODE -ne 0) {
        throw "Downstream center-pendant seal chain exited with code $LASTEXITCODE"
    }
    $theorem = Join-Path $Root 'rank8_delta03_e5_five_cubic_path_center_pendant_internal_n27_plus_exact_agent_20260825.json'
    if (-not (Test-Path -LiteralPath $theorem)) {
        throw "Missing final theorem: $theorem"
    }
    $theoremPayload = Get-Content -Raw -LiteralPath $theorem | ConvertFrom-Json
    if ($theoremPayload.status -ne 'PASS_EXACT_AND_INDEPENDENT_RANK8_DELTA03_E5_FIVE_CUBIC_PATH_CENTER_PENDANT_INTERNAL_N27_PLUS') {
        throw "Unexpected final theorem status: $($theoremPayload.status)"
    }
    Stamp "PASS_READY_FOR_NEXT_GPU_ORBIT THEOREM_SHA256=$(Get-Sha256 $theorem)"
    exit 0
} catch {
    Stamp "FAIL TYPE=$($_.Exception.GetType().Name) MESSAGE=$($_.Exception.Message)"
    exit 1
}
