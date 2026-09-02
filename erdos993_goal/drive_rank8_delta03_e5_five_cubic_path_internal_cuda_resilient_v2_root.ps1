param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('inner_pendant', 'inner_spine', 'outer_spine', 'outer_pendant')]
    [string]$Orbit,

    [Parameter(Mandatory = $true)]
    [int]$PrerequisiteProcessId,

    [int]$MaxBatchesPerProcess = 40,
    [int]$MaxNoProgressFailures = 3
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Python = (Get-Command python).Source

$Configs = @{
    inner_pendant = @{
        Total = [int64]8811708416
        Rays = [int64]7210740824
        ScannerSha256 = 'D43C13FE0890EA22DC103F466BC741133F3AC244A1991ED4E01D6F9794C4B7EE'
        ChainSha256 = 'C7CF0E3385029A16C517048CF82D194B928C5513B3F491DE774900DDE26122C0'
        ReductionSha256 = '9EA925187F9FFCCB9C6D0A1AC504DE5D46EB9DE573CAA9A976F015C26D008C37'
        PrerequisiteOrbit = 'center_pendant'
        ChainWaitParameter = 'CenterPendantChainProcessId'
    }
    inner_spine = @{
        Total = [int64]8811708416
        Rays = [int64]7210740824
        ScannerSha256 = '4D38D7CC637066E36DF6289498D8925AA146B3DED7C8599404B46A65B987E16E'
        ChainSha256 = '1B891D0AA6096CB19E17122B4B8388E3AB04B1ACF6BAA0B3021882F8DF028A9D'
        ReductionSha256 = '1F1466B78B327DC06255B21E09765DCBA7B8AF226342FDE2EC1EC3D69861810E'
        PrerequisiteOrbit = 'inner_pendant'
        ChainWaitParameter = 'InnerPendantChainProcessId'
    }
    outer_spine = @{
        Total = [int64]8811708416
        Rays = [int64]7210740824
        ScannerSha256 = 'D43FFFC2F3F94B4FDBB56177C43A51E9CC70B67B2CE66151999A4A109A0F82BD'
        ChainSha256 = '6EAE1A6A75B96826B8FEA59ADA8381A4EECDF89B256B487DFECA87E5AC84DED8'
        ReductionSha256 = '0E9295E728708E2A2F3B3489C740BB5CAE0F060A3D8950117DD65DA1072FBBB2'
        PrerequisiteOrbit = 'inner_spine'
        ChainWaitParameter = 'InnerSpineChainProcessId'
    }
    outer_pendant = @{
        Total = [int64]15420489728
        Rays = [int64]12675973856
        ScannerSha256 = '9E6A6188A61D78DCD1AFC452185E97012A9C714514818CDF2C273D42F7E4C9EE'
        ChainSha256 = 'FC5D74DA7C44FD6C7E8ABEF9448B80163F3D96416125747E6D80DE50DBB14248'
        ReductionSha256 = '99C5C254EBFE5B11E69250A7DE263C9DC0BBFBF936C120F4A3A0512CE307356B'
        PrerequisiteOrbit = 'outer_spine'
        ChainWaitParameter = 'OuterSpineChainProcessId'
    }
}

$Config = $Configs[$Orbit]
$Token = ($Orbit + '_internal').ToUpperInvariant()
$SchemaOrbit = ($Orbit -replace '_', '-') + '-internal'
$ScannerName = "scan_rank8_delta03_e5_five_cubic_path_${Orbit}_internal_cuda_rays_agent.py"
$CheckpointName = "rank8_delta03_e5_five_cubic_path_${Orbit}_internal_cuda_rays_checkpoint_agent_20260825.json"
$RayReportName = "rank8_delta03_e5_five_cubic_path_${Orbit}_internal_cuda_rays_exact_agent_20260825.json"
$ReductionName = "rank8_delta03_e5_five_cubic_path_${Orbit}_internal_newton_reduction_exact_agent_20260825.json"
$ChainName = "drive_rank8_delta03_e5_five_cubic_path_${Orbit}_internal_cuda_chain_root.ps1"
$TheoremName = "rank8_delta03_e5_five_cubic_path_${Orbit}_internal_n27_plus_exact_agent_20260825.json"
$PrerequisiteTheoremName = "rank8_delta03_e5_five_cubic_path_$($Config.PrerequisiteOrbit)_internal_n27_plus_exact_agent_20260825.json"
$Scanner = Join-Path $Root $ScannerName
$Checkpoint = Join-Path $Root $CheckpointName
$RayReport = Join-Path $Root $RayReportName
$Reduction = Join-Path $Root $ReductionName
$Chain = Join-Path $Root $ChainName
$Theorem = Join-Path $Root $TheoremName
$PrerequisiteTheorem = Join-Path $Root $PrerequisiteTheoremName
$Log = Join-Path $Root "e5_five_cubic_path_${Orbit}_internal_cuda_resilient_v2_root_20260825.txt"
$BatchSize = [int64]750000

function Stamp([string]$Message) {
    Add-Content -LiteralPath $Log -Value "$(Get-Date -Format o) $Message"
}

function Get-Sha256([string]$Path) {
    return (Get-FileHash -Algorithm SHA256 -LiteralPath $Path).Hash
}

function Require-JsonStatus(
    [string]$Path,
    [string]$ExpectedStatus
) {
    if (-not (Test-Path -LiteralPath $Path)) {
        throw "Missing report: $Path"
    }
    $payload = Get-Content -Raw -LiteralPath $Path | ConvertFrom-Json
    if ($payload.status -ne $ExpectedStatus) {
        throw "Unexpected status in ${Path}: $($payload.status)"
    }
    return $payload
}

function Read-Checkpoint() {
    if (-not (Test-Path -LiteralPath $Checkpoint)) {
        return [pscustomobject]@{
            Cursor = [int64]0
            Sha256 = 'MISSING'
            Payload = $null
        }
    }
    $payload = Get-Content -Raw -LiteralPath $Checkpoint | ConvertFrom-Json
    $expectedSchema = "rank8-delta03-e5-five-cubic-path-${SchemaOrbit}-cuda-rays-agent-checkpoint-v1"
    if ($payload.schema -ne $expectedSchema) {
        throw "Unexpected checkpoint schema: $($payload.schema)"
    }
    if ([int64]$payload.batch_size -ne $BatchSize) {
        throw "Unexpected checkpoint batch size: $($payload.batch_size)"
    }
    $manifestCursor = [int64]0
    foreach ($batch in $payload.batches) {
        if ([int64]$batch.start -ne $manifestCursor) {
            throw "Checkpoint batch manifest gap at $manifestCursor"
        }
        if ([int64]$batch.stop -le $manifestCursor) {
            throw "Checkpoint batch manifest does not advance at $manifestCursor"
        }
        $manifestCursor = [int64]$batch.stop
    }
    if ([int64]$payload.cursor -ne $manifestCursor) {
        throw "Checkpoint cursor/manifest mismatch: $($payload.cursor) != $manifestCursor"
    }
    if ([int64]$payload.totals.patterns -ne $manifestCursor) {
        throw "Checkpoint pattern total/cursor mismatch: $($payload.totals.patterns) != $manifestCursor"
    }
    foreach ($key in 'gate_failures', 'bound_failures', 'negative_classifications') {
        if ([int64]$payload.totals.$key -ne 0) {
            throw "Checkpoint contains nonzero ${key}: $($payload.totals.$key)"
        }
    }
    if ($manifestCursor -gt [int64]$Config.Total) {
        throw "Checkpoint cursor exceeds total: $manifestCursor > $($Config.Total)"
    }
    return [pscustomobject]@{
        Cursor = $manifestCursor
        Sha256 = Get-Sha256 $Checkpoint
        Payload = $payload
    }
}

try {
    if (($MaxBatchesPerProcess -lt 1) -or ($MaxBatchesPerProcess -gt 100)) {
        throw 'MaxBatchesPerProcess must be in 1..100'
    }
    if ($MaxNoProgressFailures -ne 3) {
        throw 'MaxNoProgressFailures must remain exactly 3 for this fail-closed controller'
    }
    $pins = @{
        $ScannerName = $Config.ScannerSha256
        $ChainName = $Config.ChainSha256
        $ReductionName = $Config.ReductionSha256
    }
    foreach ($entry in $pins.GetEnumerator()) {
        $path = Join-Path $Root $entry.Key
        $actual = Get-Sha256 $path
        if ($actual -ne $entry.Value) {
            throw "Pinned source drift for $($entry.Key): $actual"
        }
    }
    $reductionPayload = Get-Content -Raw -LiteralPath $Reduction | ConvertFrom-Json
    if ([int64]$reductionPayload.quotient_counts.total -ne [int64]$Config.Total) {
        throw "Unexpected reduction total: $($reductionPayload.quotient_counts.total)"
    }
    if ([int64]$reductionPayload.quotient_counts.rays -ne [int64]$Config.Rays) {
        throw "Unexpected reduction ray count: $($reductionPayload.quotient_counts.rays)"
    }
    if ((Test-Path -LiteralPath $RayReport) -and -not (Test-Path -LiteralPath $Checkpoint)) {
        throw 'Ray report exists without its pinned checkpoint'
    }

    Stamp "BEGIN ORBIT=$Orbit TOTAL=$($Config.Total) RAYS=$($Config.Rays) PREREQUISITE_PID=$PrerequisiteProcessId MAX_BATCHES_PER_PROCESS=$MaxBatchesPerProcess"
    $previous = Get-Process -Id $PrerequisiteProcessId -ErrorAction SilentlyContinue
    if ($null -ne $previous) {
        Stamp "WAIT_PREREQUISITE PID=$PrerequisiteProcessId"
        $previous.WaitForExit()
    }
    $prerequisiteToken = ($Config.PrerequisiteOrbit + '_internal').ToUpperInvariant()
    [void](Require-JsonStatus $PrerequisiteTheorem "PASS_EXACT_AND_INDEPENDENT_RANK8_DELTA03_E5_FIVE_CUBIC_PATH_${prerequisiteToken}_N27_PLUS")
    Stamp "PASS_PREREQUISITE THEOREM_SHA256=$(Get-Sha256 $PrerequisiteTheorem)"

    $attempt = 0
    $noProgressFailures = 0
    $forceSingleBatchReplay = $false
    while ($true) {
        $before = Read-Checkpoint
        if ($before.Cursor -eq [int64]$Config.Total) {
            break
        }
        $attempt++
        $batchLimit = if ($forceSingleBatchReplay) { 1 } else { $MaxBatchesPerProcess }
        $expectedReplayStop = [Math]::Min([int64]$Config.Total, $before.Cursor + $BatchSize)
        Stamp "ATTEMPT=$attempt MODE=$(if ($forceSingleBatchReplay) {'REPLAY'} else {'SEGMENT'}) MAX_BATCHES=$batchLimit START_CURSOR=$($before.Cursor) CHECKPOINT_SHA256=$($before.Sha256)"
        $lines = & $Python $Scanner '--max-batches' "$batchLimit" 2>&1
        $exitCode = $LASTEXITCODE
        foreach ($line in $lines) {
            Stamp "SCANNER $line"
        }
        $after = Read-Checkpoint
        if ($after.Cursor -lt $before.Cursor) {
            throw "Checkpoint cursor regressed: $($before.Cursor) -> $($after.Cursor)"
        }
        $progress = $after.Cursor - $before.Cursor
        Stamp "ATTEMPT=$attempt EXIT=$exitCode END_CURSOR=$($after.Cursor) PROGRESS=$progress CHECKPOINT_SHA256=$($after.Sha256)"

        if ($forceSingleBatchReplay) {
            if (($exitCode -eq 0) -and ($after.Cursor -eq $expectedReplayStop)) {
                Stamp "REPLAY_PASS INTERVAL=[$($before.Cursor),$expectedReplayStop) CHECKPOINT_SHA256=$($after.Sha256)"
                $forceSingleBatchReplay = $false
                $noProgressFailures = 0
                continue
            }
            if (($exitCode -eq 0) -or ($progress -ne 0)) {
                throw "Replay discrepancy for interval [$($before.Cursor),$expectedReplayStop): exit=$exitCode progress=$progress"
            }
            $noProgressFailures++
            Stamp "REPLAY_NO_PROGRESS INTERVAL=[$($before.Cursor),$expectedReplayStop) COUNT=$noProgressFailures"
            if ($noProgressFailures -ge 3) {
                throw "Scanner failed without checkpoint progress 3 consecutive times at interval [$($before.Cursor),$expectedReplayStop)"
            }
            continue
        }

        if ($exitCode -ne 0) {
            if ($progress -eq 0) {
                $noProgressFailures++
            } else {
                $noProgressFailures = 0
            }
            $failedStart = $after.Cursor
            $failedStop = [Math]::Min([int64]$Config.Total, $failedStart + $BatchSize)
            Stamp "REPLAY_REQUIRED INTERVAL=[$failedStart,$failedStop) NO_PROGRESS_FAILURES=$noProgressFailures"
            if ($noProgressFailures -ge 3) {
                throw "Scanner failed without checkpoint progress 3 consecutive times at interval [$failedStart,$failedStop)"
            }
            $forceSingleBatchReplay = $true
            continue
        }
        $noProgressFailures = 0
        if ($progress -eq 0) {
            throw 'Scanner exited successfully without progress before total completion'
        }
    }

    $finalCheckpoint = Read-Checkpoint
    $rayPayload = Require-JsonStatus $RayReport "PASS_EXACT_CUDA_I256_CRT_E5_FIVE_CUBIC_PATH_${Token}_RAYS"
    if ($rayPayload.checkpoint_sha256 -ne $finalCheckpoint.Sha256) {
        throw 'Ray report does not pin the final checkpoint hash'
    }
    if ($rayPayload.source_sha256 -ne $Config.ScannerSha256) {
        throw "Ray report source pin mismatch: $($rayPayload.source_sha256)"
    }
    if ([int64]$rayPayload.totals.patterns -ne [int64]$Config.Total) {
        throw "Ray report pattern total mismatch: $($rayPayload.totals.patterns)"
    }
    if ([int64]$rayPayload.totals.rays -ne [int64]$Config.Rays) {
        throw "Ray report ray total mismatch: $($rayPayload.totals.rays)"
    }
    foreach ($key in 'gate_failures', 'bound_failures', 'negative_classifications') {
        if ([int64]$rayPayload.totals.$key -ne 0) {
            throw "Ray report contains nonzero ${key}: $($rayPayload.totals.$key)"
        }
    }
    Stamp "PASS_RAY_REPORT SHA256=$(Get-Sha256 $RayReport) CHECKPOINT_SHA256=$($finalCheckpoint.Sha256)"

    $chainArguments = @("-$($Config.ChainWaitParameter)", '2147483647')
    & 'pwsh.exe' -NoProfile -File $Chain @chainArguments
    if ($LASTEXITCODE -ne 0) {
        throw "Downstream $Orbit seal chain exited with code $LASTEXITCODE"
    }
    [void](Require-JsonStatus $Theorem "PASS_EXACT_AND_INDEPENDENT_RANK8_DELTA03_E5_FIVE_CUBIC_PATH_${Token}_N27_PLUS")
    Stamp "PASS_READY_FOR_NEXT_GPU_ORBIT THEOREM_SHA256=$(Get-Sha256 $Theorem)"
    exit 0
} catch {
    Stamp "FAIL TYPE=$($_.Exception.GetType().Name) MESSAGE=$($_.Exception.Message)"
    exit 1
}
