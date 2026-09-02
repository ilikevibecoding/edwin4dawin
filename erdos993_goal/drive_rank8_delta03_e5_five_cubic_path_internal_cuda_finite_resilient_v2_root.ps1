param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('center_pendant', 'inner_pendant', 'inner_spine', 'outer_spine', 'outer_pendant')]
    [string]$Orbit,

    [Parameter(Mandatory = $true)]
    [int]$OriginalControllerProcessId,

    [int]$MaxBatchesPerProcess = 40,
    [int]$MaxNoProgressFailures = 3
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Python = (Get-Command python).Source
$DriverName = 'run_rank8_cuda_unordered_halves_internal_finite_driver_agent.py'
$ExpectedDriverSha256 = 'BC1BAC333ECE253E3397D6E215D5742CF05132AB225160A6AF1773A66B3A8935'
$BatchSize = [int64]5000000

$Configs = @{
    center_pendant = @{
        Total = [int64]4406205440
        Rays = [int64]3605591990
        AllShort = [int64]800613450
        Finite = [int64]798845124
        Order27 = [int64]757491
        FiniteScannerSha256 = 'DC762AD3EE3CB7743C86ECEEC0A485F76462D0A70998C858512CD972EA3C7E3B'
        RayScannerSha256 = '00B70518FF28FAFC17E924B08C8CA73F86E6902629A3D2BCBB30615271B62429'
        ChainSha256 = '588F979F3B5FD9452E861CCA99D7CA662F0834EEDFD6025FA2B1AB8427BC2811'
        ChainWaitParameter = 'OuterChainProcessId'
    }
    inner_pendant = @{
        Total = [int64]8811708416
        Rays = [int64]7210740824
        AllShort = [int64]1600967592
        Finite = [int64]1597435864
        Order27 = [int64]1513615
        FiniteScannerSha256 = '63897FDBABA602CFDA5650C75C9E3D6941EA5AC570EC33CF00410F8A8A508A6E'
        RayScannerSha256 = 'D43C13FE0890EA22DC103F466BC741133F3AC244A1991ED4E01D6F9794C4B7EE'
        ChainSha256 = 'C7CF0E3385029A16C517048CF82D194B928C5513B3F491DE774900DDE26122C0'
        ChainWaitParameter = 'CenterPendantChainProcessId'
    }
    inner_spine = @{
        Total = [int64]8811708416
        Rays = [int64]7210740824
        AllShort = [int64]1600967592
        Finite = [int64]1597435864
        Order27 = [int64]1513615
        FiniteScannerSha256 = '39029364F54B5614C07384F39AC6D473E51524A3CBDFFA8846FDCED7BAABF7C0'
        RayScannerSha256 = '4D38D7CC637066E36DF6289498D8925AA146B3DED7C8599404B46A65B987E16E'
        ChainSha256 = '1B891D0AA6096CB19E17122B4B8388E3AB04B1ACF6BAA0B3021882F8DF028A9D'
        ChainWaitParameter = 'InnerPendantChainProcessId'
    }
    outer_spine = @{
        Total = [int64]8811708416
        Rays = [int64]7210740824
        AllShort = [int64]1600967592
        Finite = [int64]1597435864
        Order27 = [int64]1513615
        FiniteScannerSha256 = '305C95C0F7E4CC807729EAD40190356F86B44ED6B9B70922B98B827B23397843'
        RayScannerSha256 = 'D43FFFC2F3F94B4FDBB56177C43A51E9CC70B67B2CE66151999A4A109A0F82BD'
        ChainSha256 = '6EAE1A6A75B96826B8FEA59ADA8381A4EECDF89B256B487DFECA87E5AC84DED8'
        ChainWaitParameter = 'InnerSpineChainProcessId'
    }
    outer_pendant = @{
        Total = [int64]15420489728
        Rays = [int64]12675973856
        AllShort = [int64]2744515872
        Finite = [int64]2739018464
        Order27 = [int64]2393416
        FiniteScannerSha256 = 'D0B236C22EE9F2353226511DF3B87499FD46A1826D26117F0802411AF084C43F'
        RayScannerSha256 = '9E6A6188A61D78DCD1AFC452185E97012A9C714514818CDF2C273D42F7E4C9EE'
        ChainSha256 = 'FC5D74DA7C44FD6C7E8ABEF9448B80163F3D96416125747E6D80DE50DBB14248'
        ChainWaitParameter = 'OuterSpineChainProcessId'
    }
}

$Config = $Configs[$Orbit]
$Token = ($Orbit + '_internal').ToUpperInvariant()
$SchemaOrbit = ($Orbit -replace '_', '-') + '-internal'
$ScannerName = "scan_rank8_delta03_e5_five_cubic_path_${Orbit}_internal_cuda_finite_agent.py"
$RayScannerName = "scan_rank8_delta03_e5_five_cubic_path_${Orbit}_internal_cuda_rays_agent.py"
$ChainName = "drive_rank8_delta03_e5_five_cubic_path_${Orbit}_internal_cuda_chain_root.ps1"
$RayCheckpointName = "rank8_delta03_e5_five_cubic_path_${Orbit}_internal_cuda_rays_checkpoint_agent_20260825.json"
$RayReportName = "rank8_delta03_e5_five_cubic_path_${Orbit}_internal_cuda_rays_exact_agent_20260825.json"
$CheckpointName = "rank8_delta03_e5_five_cubic_path_${Orbit}_internal_cuda_finite_checkpoint_agent_20260825.json"
$FiniteReportName = "rank8_delta03_e5_five_cubic_path_${Orbit}_internal_cuda_finite_exact_agent_20260825.json"
$TheoremName = "rank8_delta03_e5_five_cubic_path_${Orbit}_internal_n27_plus_exact_agent_20260825.json"
$Scanner = Join-Path $Root $ScannerName
$Chain = Join-Path $Root $ChainName
$RayCheckpoint = Join-Path $Root $RayCheckpointName
$RayReport = Join-Path $Root $RayReportName
$Checkpoint = Join-Path $Root $CheckpointName
$FiniteReport = Join-Path $Root $FiniteReportName
$Theorem = Join-Path $Root $TheoremName
$Log = Join-Path $Root "e5_five_cubic_path_${Orbit}_internal_cuda_finite_resilient_v2_root_20260825.txt"

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
        return [pscustomobject]@{ Cursor = [int64]0; Sha256 = 'MISSING'; Payload = $null }
    }
    $payload = Get-Content -Raw -LiteralPath $Checkpoint | ConvertFrom-Json
    $expectedSchema = "rank8-delta03-e5-five-cubic-path-${SchemaOrbit}-cuda-finite-agent-finite-checkpoint-v1"
    if ($payload.schema -ne $expectedSchema) {
        throw "Unexpected checkpoint schema: $($payload.schema)"
    }
    if ([int64]$payload.batch_size -ne $BatchSize) {
        throw "Unexpected checkpoint batch size: $($payload.batch_size)"
    }
    $cursor = [int64]0
    $patterns = [int64]0
    $allShort = [int64]0
    $finite = [int64]0
    $order27 = [int64]0
    foreach ($batch in $payload.batches) {
        if ([int64]$batch.start -ne $cursor) {
            throw "Checkpoint batch manifest gap at $cursor"
        }
        if ([int64]$batch.stop -le $cursor) {
            throw "Checkpoint batch manifest does not advance at $cursor"
        }
        if ([int64]$batch.patterns -ne ([int64]$batch.stop - [int64]$batch.start)) {
            throw "Checkpoint batch pattern mismatch at $cursor"
        }
        if ([int64]$batch.nonpositive_values -ne 0) {
            throw "Checkpoint batch contains nonpositive values at $cursor"
        }
        if ([int64]$batch.bound_failures -ne 0) {
            throw "Checkpoint batch contains bound failures at $cursor"
        }
        if ([int64]$batch.positive_values -ne (4 * [int64]$batch.finite)) {
            throw "Checkpoint positive-value count mismatch at $cursor"
        }
        $cursor = [int64]$batch.stop
        $patterns += [int64]$batch.patterns
        $allShort += [int64]$batch.all_short
        $finite += [int64]$batch.finite
        $order27 += [int64]$batch.order27
    }
    if ([int64]$payload.cursor -ne $cursor) {
        throw "Checkpoint cursor/manifest mismatch: $($payload.cursor) != $cursor"
    }
    if (([int64]$payload.totals.patterns -ne $patterns) -or
        ([int64]$payload.totals.all_short -ne $allShort) -or
        ([int64]$payload.totals.finite -ne $finite) -or
        ([int64]$payload.totals.order27 -ne $order27)) {
        throw 'Checkpoint aggregate totals do not match the batch manifest'
    }
    if ([int64]$payload.totals.positive_values -ne (4 * $finite)) {
        throw 'Checkpoint positive-value totals do not match the batch manifest'
    }
    if (([int64]$payload.totals.nonpositive_values -ne 0) -or
        ([int64]$payload.totals.bound_failures -ne 0)) {
        throw 'Checkpoint contains nonpositive values or bound failures'
    }
    if ($cursor -gt [int64]$Config.Total) {
        throw "Checkpoint cursor exceeds total: $cursor > $($Config.Total)"
    }
    return [pscustomobject]@{ Cursor = $cursor; Sha256 = Get-Sha256 $Checkpoint; Payload = $payload }
}

try {
    if (($MaxBatchesPerProcess -lt 1) -or ($MaxBatchesPerProcess -gt 100)) {
        throw 'MaxBatchesPerProcess must be in 1..100'
    }
    if ($MaxNoProgressFailures -ne 3) {
        throw 'MaxNoProgressFailures must remain exactly 3 for this fail-closed controller'
    }
    $pins = @{
        $Scanner = $Config.FiniteScannerSha256
        (Join-Path $Root $RayScannerName) = $Config.RayScannerSha256
        (Join-Path $Root $DriverName) = $ExpectedDriverSha256
        $Chain = $Config.ChainSha256
    }
    foreach ($entry in $pins.GetEnumerator()) {
        $actual = Get-Sha256 $entry.Key
        if ($actual -ne $entry.Value) {
            throw "Pinned source drift for $($entry.Key): $actual"
        }
    }

    Stamp "BEGIN ORBIT=$Orbit ORIGINAL_CONTROLLER_PID=$OriginalControllerProcessId TOTAL=$($Config.Total) MAX_BATCHES_PER_PROCESS=$MaxBatchesPerProcess"
    $original = Get-Process -Id $OriginalControllerProcessId -ErrorAction SilentlyContinue
    if ($null -ne $original) {
        Stamp "WAIT_ORIGINAL_CONTROLLER PID=$OriginalControllerProcessId"
        $original.WaitForExit()
    }
    if (Test-Path -LiteralPath $Theorem) {
        [void](Require-JsonStatus $Theorem "PASS_EXACT_AND_INDEPENDENT_RANK8_DELTA03_E5_FIVE_CUBIC_PATH_${Token}_N27_PLUS")
        Stamp "PASS_ALREADY_COMPLETE THEOREM_SHA256=$(Get-Sha256 $Theorem)"
        exit 0
    }

    $rayPayload = Require-JsonStatus $RayReport "PASS_EXACT_CUDA_I256_CRT_E5_FIVE_CUBIC_PATH_${Token}_RAYS"
    if (-not (Test-Path -LiteralPath $RayCheckpoint)) {
        throw 'Ray report exists without its checkpoint'
    }
    $rayCheckpointSha256 = Get-Sha256 $RayCheckpoint
    if ($rayPayload.checkpoint_sha256 -ne $rayCheckpointSha256) {
        throw 'Ray report does not pin its checkpoint hash'
    }
    if ($rayPayload.source_sha256 -ne $Config.RayScannerSha256) {
        throw "Ray report source pin mismatch: $($rayPayload.source_sha256)"
    }
    if (([int64]$rayPayload.totals.patterns -ne [int64]$Config.Total) -or
        ([int64]$rayPayload.totals.rays -ne [int64]$Config.Rays)) {
        throw 'Ray report aggregate totals mismatch'
    }
    foreach ($key in 'gate_failures', 'bound_failures', 'negative_classifications') {
        if ([int64]$rayPayload.totals.$key -ne 0) {
            throw "Ray report contains nonzero ${key}: $($rayPayload.totals.$key)"
        }
    }
    if ((Test-Path -LiteralPath $FiniteReport) -and -not (Test-Path -LiteralPath $Checkpoint)) {
        throw 'Finite report exists without its pinned checkpoint'
    }

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
        foreach ($line in $lines) { Stamp "SCANNER $line" }
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
                throw "Finite scanner failed without checkpoint progress 3 consecutive times at interval [$($before.Cursor),$expectedReplayStop)"
            }
            continue
        }

        if ($exitCode -ne 0) {
            if ($progress -eq 0) { $noProgressFailures++ } else { $noProgressFailures = 0 }
            $failedStart = $after.Cursor
            $failedStop = [Math]::Min([int64]$Config.Total, $failedStart + $BatchSize)
            Stamp "REPLAY_REQUIRED INTERVAL=[$failedStart,$failedStop) NO_PROGRESS_FAILURES=$noProgressFailures"
            if ($noProgressFailures -ge 3) {
                throw "Finite scanner failed without checkpoint progress 3 consecutive times at interval [$failedStart,$failedStop)"
            }
            $forceSingleBatchReplay = $true
            continue
        }
        $noProgressFailures = 0
        if ($progress -eq 0) {
            throw 'Finite scanner exited successfully without progress before total completion'
        }
    }

    $finalCheckpoint = Read-Checkpoint
    $finitePayload = Require-JsonStatus $FiniteReport "PASS_EXACT_CUDA_I256_CRT_E5_FIVE_CUBIC_PATH_${Token}_FINITE"
    if ($finitePayload.root_orbit -ne "five_cubic_path:${Orbit}_internal") {
        throw "Unexpected finite root orbit: $($finitePayload.root_orbit)"
    }
    if ($finitePayload.checkpoint_sha256 -ne $finalCheckpoint.Sha256) {
        throw 'Finite report does not pin the final checkpoint hash'
    }
    if ($finitePayload.source_sha256 -ne $Config.FiniteScannerSha256) {
        throw "Finite report source pin mismatch: $($finitePayload.source_sha256)"
    }
    if ($finitePayload.driver_sha256 -ne $ExpectedDriverSha256) {
        throw "Finite report driver pin mismatch: $($finitePayload.driver_sha256)"
    }
    if (([int64]$finitePayload.totals.patterns -ne [int64]$Config.Total) -or
        ([int64]$finitePayload.totals.all_short -ne [int64]$Config.AllShort) -or
        ([int64]$finitePayload.totals.finite -ne [int64]$Config.Finite) -or
        ([int64]$finitePayload.totals.order27 -ne [int64]$Config.Order27)) {
        throw 'Finite report aggregate totals mismatch'
    }
    if (([int64]$finitePayload.totals.positive_values -ne (4 * [int64]$Config.Finite)) -or
        ([int64]$finitePayload.totals.nonpositive_values -ne 0) -or
        ([int64]$finitePayload.totals.bound_failures -ne 0)) {
        throw 'Finite report contains a value-count or bound failure'
    }
    Stamp "PASS_FINITE_REPORT SHA256=$(Get-Sha256 $FiniteReport) CHECKPOINT_SHA256=$($finalCheckpoint.Sha256) RAY_REPORT_SHA256=$(Get-Sha256 $RayReport)"

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
