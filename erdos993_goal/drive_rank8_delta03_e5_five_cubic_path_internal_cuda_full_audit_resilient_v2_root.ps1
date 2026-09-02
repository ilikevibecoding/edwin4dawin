param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('inner_pendant', 'inner_spine', 'outer_spine', 'outer_pendant')]
    [string]$Orbit,

    [Parameter(Mandatory = $true)]
    [int]$OriginalControllerProcessId,

    [int]$MaxBatchesPerProcess = 40,
    [int]$MaxNoProgressFailures = 3
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Python = (Get-Command python).Source
$DriverName = 'run_rank8_cuda_full_internal_audit_driver_agent.py'
$ExpectedDriverSha256 = '6725E387E7E738F12EABF51F6D437BDAE53CB00242E802E838A8345C4D00A726'
$BatchSize = [int64]750000

$Configs = @{
    inner_pendant = @{
        Total = [int64]8811708416
        Rays = [int64]7210740824
        AllShort = [int64]1600967592
        Finite = [int64]1597435864
        Order27 = [int64]1513615
        AuditSha256 = '087537A230CEF9C71E05DB6EB3A7C9346276CF66D1AAFDBC529860D1D6024CBB'
        ChainSha256 = 'C7CF0E3385029A16C517048CF82D194B928C5513B3F491DE774900DDE26122C0'
        ChainWaitParameter = 'CenterPendantChainProcessId'
    }
    inner_spine = @{
        Total = [int64]8811708416
        Rays = [int64]7210740824
        AllShort = [int64]1600967592
        Finite = [int64]1597435864
        Order27 = [int64]1513615
        AuditSha256 = '1F1E46F0BA7B331E156B4A20B2741C8121D04914CD18A6D14807EB9D68CBD284'
        ChainSha256 = '1B891D0AA6096CB19E17122B4B8388E3AB04B1ACF6BAA0B3021882F8DF028A9D'
        ChainWaitParameter = 'InnerPendantChainProcessId'
    }
    outer_spine = @{
        Total = [int64]8811708416
        Rays = [int64]7210740824
        AllShort = [int64]1600967592
        Finite = [int64]1597435864
        Order27 = [int64]1513615
        AuditSha256 = '893CEE12DE1704B7FBF807B826624DE0BCA937C8226299FF529D2F2DB3ED9187'
        ChainSha256 = '6EAE1A6A75B96826B8FEA59ADA8381A4EECDF89B256B487DFECA87E5AC84DED8'
        ChainWaitParameter = 'InnerSpineChainProcessId'
    }
    outer_pendant = @{
        Total = [int64]15420489728
        Rays = [int64]12675973856
        AllShort = [int64]2744515872
        Finite = [int64]2739018464
        Order27 = [int64]2393416
        AuditSha256 = 'D98FB5F832E2A357B4FE835CDEF673D0D686BBC2154F172E8859248BA6DE3A9B'
        ChainSha256 = 'FC5D74DA7C44FD6C7E8ABEF9448B80163F3D96416125747E6D80DE50DBB14248'
        ChainWaitParameter = 'OuterSpineChainProcessId'
    }
}

$Config = $Configs[$Orbit]
$Token = ($Orbit + '_internal').ToUpperInvariant()
$SchemaOrbit = ($Orbit -replace '_', '-') + '-internal'
$AuditName = "audit_rank8_delta03_e5_five_cubic_path_${Orbit}_internal_cuda_full_agent.py"
$ChainName = "drive_rank8_delta03_e5_five_cubic_path_${Orbit}_internal_cuda_chain_root.ps1"
$PrimaryName = "rank8_delta03_e5_five_cubic_path_${Orbit}_internal_cuda_primary_exact_agent_20260825.json"
$CheckpointName = "rank8_delta03_e5_five_cubic_path_${Orbit}_internal_cuda_full_audit_checkpoint_agent_20260825.json"
$AuditReportName = "rank8_delta03_e5_five_cubic_path_${Orbit}_internal_cuda_full_independent_audit_agent_20260825.json"
$TheoremName = "rank8_delta03_e5_five_cubic_path_${Orbit}_internal_n27_plus_exact_agent_20260825.json"
$Audit = Join-Path $Root $AuditName
$Chain = Join-Path $Root $ChainName
$Primary = Join-Path $Root $PrimaryName
$Checkpoint = Join-Path $Root $CheckpointName
$AuditReport = Join-Path $Root $AuditReportName
$Theorem = Join-Path $Root $TheoremName
$Log = Join-Path $Root "e5_five_cubic_path_${Orbit}_internal_cuda_full_audit_resilient_v2_root_20260825.txt"

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

function Read-Checkpoint([string]$PrimarySha256) {
    if (-not (Test-Path -LiteralPath $Checkpoint)) {
        return [pscustomobject]@{ Cursor = [int64]0; Sha256 = 'MISSING'; Payload = $null }
    }
    $payload = Get-Content -Raw -LiteralPath $Checkpoint | ConvertFrom-Json
    $expectedSchema = "rank8-delta03-e5-five-cubic-path-${SchemaOrbit}-cuda-full-audit-checkpoint-v1"
    if ($payload.schema -ne $expectedSchema) {
        throw "Unexpected checkpoint schema: $($payload.schema)"
    }
    if ([int64]$payload.batch_size -ne $BatchSize) {
        throw "Unexpected checkpoint batch size: $($payload.batch_size)"
    }
    if ($payload.dependencies.$PrimaryName -ne $PrimarySha256) {
        throw 'Checkpoint does not pin the current primary report hash'
    }
    $cursor = [int64]0
    $patterns = [int64]0
    $rays = [int64]0
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
        foreach ($key in 'ray_gate_failures', 'ray_bound_failures', 'ray_negative_classifications', 'finite_nonpositive_values', 'finite_bound_failures') {
            if ([int64]$batch.$key -ne 0) {
                throw "Checkpoint batch contains nonzero ${key} at $cursor"
            }
        }
        if ([int64]$batch.finite_positive_values -ne (4 * [int64]$batch.finite)) {
            throw "Checkpoint finite-positive count mismatch at $cursor"
        }
        $cursor = [int64]$batch.stop
        $patterns += [int64]$batch.patterns
        $rays += [int64]$batch.rays
        $allShort += [int64]$batch.all_short
        $finite += [int64]$batch.finite
        $order27 += [int64]$batch.order27
    }
    if ([int64]$payload.cursor -ne $cursor) {
        throw "Checkpoint cursor/manifest mismatch: $($payload.cursor) != $cursor"
    }
    if (([int64]$payload.totals.patterns -ne $patterns) -or
        ([int64]$payload.totals.rays -ne $rays) -or
        ([int64]$payload.totals.all_short -ne $allShort) -or
        ([int64]$payload.totals.finite -ne $finite) -or
        ([int64]$payload.totals.order27 -ne $order27)) {
        throw 'Checkpoint aggregate totals do not match the batch manifest'
    }
    foreach ($key in 'ray_gate_failures', 'ray_bound_failures', 'ray_negative_classifications', 'finite_nonpositive_values', 'finite_bound_failures') {
        if ([int64]$payload.totals.$key -ne 0) {
            throw "Checkpoint contains nonzero ${key}: $($payload.totals.$key)"
        }
    }
    if ([int64]$payload.totals.finite_positive_values -ne (4 * $finite)) {
        throw 'Checkpoint finite-positive totals do not match the batch manifest'
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
        $Audit = $Config.AuditSha256
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

    $primaryPayload = Require-JsonStatus $Primary "PASS_PRIMARY_EXACT_ALL_ORDER_E5_FIVE_CUBIC_PATH_${Token}"
    if ($primaryPayload.root_orbit -ne "five_cubic_path:${Orbit}_internal") {
        throw "Unexpected primary root orbit: $($primaryPayload.root_orbit)"
    }
    if ([int64]$primaryPayload.canonical_coordinate_patterns -ne [int64]$Config.Total) {
        throw "Unexpected primary total: $($primaryPayload.canonical_coordinate_patterns)"
    }
    if ([int64]$primaryPayload.n28_plus_newton_rays -ne [int64]$Config.Rays) {
        throw "Unexpected primary ray total: $($primaryPayload.n28_plus_newton_rays)"
    }
    if ([int64]$primaryPayload.n28_plus_all_short_finite_patterns -ne [int64]$Config.Finite) {
        throw "Unexpected primary finite total: $($primaryPayload.n28_plus_all_short_finite_patterns)"
    }
    if ([int64]$primaryPayload.all_short_order27_patterns -ne [int64]$Config.Order27) {
        throw "Unexpected primary order-27 total: $($primaryPayload.all_short_order27_patterns)"
    }
    if ([int64]$primaryPayload.nonpositive_or_bound_failures -ne 0) {
        throw "Primary report contains failures: $($primaryPayload.nonpositive_or_bound_failures)"
    }
    $primarySha256 = Get-Sha256 $Primary
    if ((Test-Path -LiteralPath $AuditReport) -and -not (Test-Path -LiteralPath $Checkpoint)) {
        throw 'Audit report exists without its pinned checkpoint'
    }

    $attempt = 0
    $noProgressFailures = 0
    $forceSingleBatchReplay = $false
    while ($true) {
        $before = Read-Checkpoint $primarySha256
        if ($before.Cursor -eq [int64]$Config.Total) {
            break
        }
        $attempt++
        $batchLimit = if ($forceSingleBatchReplay) { 1 } else { $MaxBatchesPerProcess }
        $expectedReplayStop = [Math]::Min([int64]$Config.Total, $before.Cursor + $BatchSize)
        Stamp "ATTEMPT=$attempt MODE=$(if ($forceSingleBatchReplay) {'REPLAY'} else {'SEGMENT'}) MAX_BATCHES=$batchLimit START_CURSOR=$($before.Cursor) CHECKPOINT_SHA256=$($before.Sha256)"
        $lines = & $Python $Audit '--expected-primary-report-sha256' $primarySha256 '--max-batches' "$batchLimit" 2>&1
        $exitCode = $LASTEXITCODE
        foreach ($line in $lines) { Stamp "AUDITOR $line" }
        $after = Read-Checkpoint $primarySha256
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
                throw "Auditor failed without checkpoint progress 3 consecutive times at interval [$($before.Cursor),$expectedReplayStop)"
            }
            continue
        }

        if ($exitCode -ne 0) {
            if ($progress -eq 0) { $noProgressFailures++ } else { $noProgressFailures = 0 }
            $failedStart = $after.Cursor
            $failedStop = [Math]::Min([int64]$Config.Total, $failedStart + $BatchSize)
            Stamp "REPLAY_REQUIRED INTERVAL=[$failedStart,$failedStop) NO_PROGRESS_FAILURES=$noProgressFailures"
            if ($noProgressFailures -ge 3) {
                throw "Auditor failed without checkpoint progress 3 consecutive times at interval [$failedStart,$failedStop)"
            }
            $forceSingleBatchReplay = $true
            continue
        }
        $noProgressFailures = 0
        if ($progress -eq 0) {
            throw 'Auditor exited successfully without progress before total completion'
        }
    }

    $finalCheckpoint = Read-Checkpoint $primarySha256
    $auditPayload = Require-JsonStatus $AuditReport "PASS_FULL_INDEPENDENT_CUDA_AUDIT_E5_FIVE_CUBIC_PATH_${Token}"
    if ($auditPayload.root_orbit -ne "five_cubic_path:${Orbit}_internal") {
        throw "Unexpected audit root orbit: $($auditPayload.root_orbit)"
    }
    if ($auditPayload.checkpoint_sha256 -ne $finalCheckpoint.Sha256) {
        throw 'Audit report does not pin the final checkpoint hash'
    }
    if ($auditPayload.source_sha256 -ne $Config.AuditSha256) {
        throw "Audit report source pin mismatch: $($auditPayload.source_sha256)"
    }
    if ($auditPayload.driver_sha256 -ne $ExpectedDriverSha256) {
        throw "Audit report driver pin mismatch: $($auditPayload.driver_sha256)"
    }
    if ($auditPayload.immutable_input_hashes.$PrimaryName -ne $primarySha256) {
        throw 'Audit report does not pin the current primary report hash'
    }
    if (([int64]$auditPayload.totals.patterns -ne [int64]$Config.Total) -or
        ([int64]$auditPayload.totals.rays -ne [int64]$Config.Rays) -or
        ([int64]$auditPayload.totals.all_short -ne [int64]$Config.AllShort) -or
        ([int64]$auditPayload.totals.finite -ne [int64]$Config.Finite) -or
        ([int64]$auditPayload.totals.order27 -ne [int64]$Config.Order27)) {
        throw 'Audit report aggregate totals mismatch'
    }
    foreach ($key in 'ray_gate_failures', 'ray_bound_failures', 'ray_negative_classifications', 'finite_nonpositive_values', 'finite_bound_failures') {
        if ([int64]$auditPayload.totals.$key -ne 0) {
            throw "Audit report contains nonzero ${key}: $($auditPayload.totals.$key)"
        }
    }
    if ([int64]$auditPayload.totals.finite_positive_values -ne (4 * [int64]$Config.Finite)) {
        throw 'Audit report finite-positive total mismatch'
    }
    Stamp "PASS_AUDIT_REPORT SHA256=$(Get-Sha256 $AuditReport) CHECKPOINT_SHA256=$($finalCheckpoint.Sha256) PRIMARY_SHA256=$primarySha256"

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
