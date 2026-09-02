param(
    [Parameter(Mandatory = $true)]
    [ValidateSet(
        "inner_pendant_internal",
        "inner_spine_internal",
        "outer_spine_internal",
        "outer_pendant_internal"
    )]
    [string]$Layout,
    [Parameter(Mandatory = $true)]
    [int]$OriginalControllerProcessId,
    [int]$MaxBatchesPerProcess = 40,
    [int]$MaxNoProgressFailures = 3
)

$ErrorActionPreference = "Stop"
$root = "C:\Users\chris\erdos993_goal"
$python = (Get-Command python -ErrorAction Stop).Source
$scanner = Join-Path $root "scan_rank8_delta03_e5_five_cubic_path_internal_cuda_quotient_rays_agent.py"
$importer = Join-Path $root "import_rank8_delta03_e5_five_cubic_path_legacy_rays_into_quotient_checkpoint_agent.py"
$legacyCheckpoint = Join-Path $root ("rank8_delta03_e5_five_cubic_path_{0}_cuda_rays_checkpoint_agent_20260825.json" -f $Layout)
$legacyReport = Join-Path $root ("rank8_delta03_e5_five_cubic_path_{0}_cuda_rays_exact_agent_20260825.json" -f $Layout)
$quotientCheckpoint = Join-Path $root ("rank8_delta03_e5_five_cubic_path_{0}_cuda_quotient_rays_checkpoint_agent_20260825.json" -f $Layout)
$quotientReport = Join-Path $root ("rank8_delta03_e5_five_cubic_path_{0}_cuda_quotient_rays_exact_agent_20260825.json" -f $Layout)
$importReport = Join-Path $root ("rank8_delta03_e5_five_cubic_path_{0}_legacy_to_quotient_checkpoint_import_agent_20260825.json" -f $Layout)
$log = Join-Path $root ("e5_five_cubic_path_{0}_cuda_quotient_recovery_v2_root_20260825.txt" -f $Layout)
$lockPath = Join-Path $root ("e5_five_cubic_path_{0}_cuda_ray_recovery_owner.lock" -f $Layout)

$expected = @{
    "scan_rank8_delta03_e5_five_cubic_path_internal_cuda_quotient_rays_agent.py" = "73B6757090E16C7B916F2A646D26B9E69F0FB0566843D2694404DF02BFE0B60B"
    "run_rank8_cuda_opposite_half_message_quotient_chunked_rays_driver_agent.py" = "642DBA783AA5F3AF38A7360AD811036317145406743C9C0B10CE1BA177135DCE"
    "run_rank8_cuda_opposite_half_message_quotient_chunked_engine_agent.py" = "EF1B9D19E20424564AC51F8CF399612480772581E9F6B07C6B5B78573641E108"
    "run_rank8_cuda_opposite_half_message_quotient_driver_agent.py" = "F85FA0522D9DF83D344150B90D417E0F5A0DB6BCB46AE1A338C13366B7FBA864"
    "import_rank8_delta03_e5_five_cubic_path_legacy_rays_into_quotient_checkpoint_agent.py" = "64D0060AE851A9849B560E6722B102FCA9DE62E22632A311EAA9ADFEFC6638C7"
    "audit_rank8_delta03_e5_five_cubic_path_legacy_to_quotient_import_agent.py" = "341289389CBA33189AF627481327DBC6F4E78574CE3A91DE94CB127EB401408A"
    "rank8_delta03_e5_five_cubic_path_legacy_to_quotient_import_audit_agent_20260825.json" = "CC08335D549CA8143B834BE809953AF2ADFEF5AC9390615AC2514A2E7628B770"
    "rank8_delta03_e5_five_cubic_path_opposite_half_quotient_all_layouts_exact_agent_20260825.json" = "DFAF77DFFF213F5C0B1D12CA6EEEDCFB4B252493B6E452D2A93D5249CFADA2F3"
    "rank8_delta03_e5_five_cubic_path_opposite_half_quotient_full_batch_qualification_agent_20260825.json" = "49E6DBCA6E7039E090F8D82D118AB94C4E4CB3F5174E01AA3B1E601D6EE3C3B9"
}

$totalByLayout = @{
    "inner_pendant_internal" = [int64]8811708416
    "inner_spine_internal" = [int64]8811708416
    "outer_spine_internal" = [int64]8811708416
    "outer_pendant_internal" = [int64]15420489728
}
$raysByLayout = @{
    "inner_pendant_internal" = [int64]7210740824
    "inner_spine_internal" = [int64]7210740824
    "outer_spine_internal" = [int64]7210740824
    "outer_pendant_internal" = [int64]12675973856
}
$statusByLayout = @{
    "inner_pendant_internal" = "PASS_EXACT_CUDA_I256_CRT_E5_FIVE_CUBIC_PATH_INNER_PENDANT_INTERNAL_RAYS"
    "inner_spine_internal" = "PASS_EXACT_CUDA_I256_CRT_E5_FIVE_CUBIC_PATH_INNER_SPINE_INTERNAL_RAYS"
    "outer_spine_internal" = "PASS_EXACT_CUDA_I256_CRT_E5_FIVE_CUBIC_PATH_OUTER_SPINE_INTERNAL_RAYS"
    "outer_pendant_internal" = "PASS_EXACT_CUDA_I256_CRT_E5_FIVE_CUBIC_PATH_OUTER_PENDANT_INTERNAL_RAYS"
}

function Write-Log([string]$Message) {
    $line = "{0} {1}" -f (Get-Date).ToString("o"), $Message
    Add-Content -LiteralPath $log -Value $line
    Write-Output $line
}

function Get-Hash([string]$Path) {
    return (Get-FileHash -Algorithm SHA256 -LiteralPath $Path).Hash.ToUpperInvariant()
}

function Read-ImmutableJson([string]$Path) {
    $bytes = [System.IO.File]::ReadAllBytes($Path)
    $algorithm = [System.Security.Cryptography.SHA256]::Create()
    try {
        $hash = [System.Convert]::ToHexString($algorithm.ComputeHash($bytes))
    }
    finally {
        $algorithm.Dispose()
    }
    $text = [System.Text.Encoding]::UTF8.GetString($bytes)
    $value = $text | ConvertFrom-Json -Depth 100
    return [pscustomobject]@{ Hash = $hash; Value = $value }
}

function Assert-NoRayScanner {
    $legacyName = "scan_rank8_delta03_e5_five_cubic_path_{0}_cuda_rays_agent.py" -f $Layout
    $live = Get-CimInstance Win32_Process | Where-Object {
        $_.CommandLine -and (
            $_.CommandLine.Contains($legacyName) -or
            ($_.CommandLine.Contains("scan_rank8_delta03_e5_five_cubic_path_internal_cuda_quotient_rays_agent.py") -and $_.CommandLine.Contains($Layout))
        )
    }
    if ($live) {
        $description = ($live | ForEach-Object { "PID=$($_.ProcessId) $($_.CommandLine)" }) -join " | "
        throw "ray scanner already active: $description"
    }
}

function Test-CompleteReport([string]$ReportPath, [string]$CheckpointPath) {
    if (-not (Test-Path -LiteralPath $ReportPath)) {
        return $false
    }
    if (-not (Test-Path -LiteralPath $CheckpointPath)) {
        throw "report exists without checkpoint: $ReportPath"
    }
    $report = Read-ImmutableJson $ReportPath
    $checkpoint = Read-ImmutableJson $CheckpointPath
    if ($report.Value.status -ne $statusByLayout[$Layout]) {
        throw "unexpected report status: $($report.Value.status)"
    }
    if ([int64]$checkpoint.Value.cursor -ne $totalByLayout[$Layout]) {
        throw "report exists at incomplete cursor: $($checkpoint.Value.cursor)"
    }
    if ($report.Value.checkpoint_sha256 -ne $checkpoint.Hash) {
        throw "report/checkpoint hash mismatch"
    }
    if ([int64]$report.Value.totals.patterns -ne $totalByLayout[$Layout]) {
        throw "report pattern total mismatch"
    }
    if ([int64]$report.Value.totals.rays -ne $raysByLayout[$Layout]) {
        throw "report ray total mismatch"
    }
    if ([int64]$report.Value.totals.gate_failures -ne 0 -or
        [int64]$report.Value.totals.bound_failures -ne 0 -or
        [int64]$report.Value.totals.negative_classifications -ne 0) {
        throw "report contains a classification failure"
    }
    Write-Log ("COMPLETE REPORT={0} CHECKPOINT={1}" -f $report.Hash, $checkpoint.Hash)
    return $true
}

foreach ($name in $expected.Keys) {
    $path = Join-Path $root $name
    if (-not (Test-Path -LiteralPath $path)) {
        throw "missing pinned input: $path"
    }
    $actual = Get-Hash $path
    if ($actual -ne $expected[$name]) {
        throw "pinned input drift: $name expected=$($expected[$name]) actual=$actual"
    }
}

Write-Log ("WAIT ORIGINAL_CONTROLLER_PID={0}" -f $OriginalControllerProcessId)
while (Get-Process -Id $OriginalControllerProcessId -ErrorAction SilentlyContinue) {
    Start-Sleep -Seconds 20
}
Write-Log "ORIGINAL_CONTROLLER_EXITED"
Assert-NoRayScanner

if (Test-CompleteReport $legacyReport $legacyCheckpoint) {
    Write-Log "LEGACY_COMPLETE_NO_QUOTIENT_RECOVERY"
    exit 0
}
if (Test-CompleteReport $quotientReport $quotientCheckpoint) {
    Write-Log "QUOTIENT_ALREADY_COMPLETE"
    exit 0
}

$lockStream = $null
try {
    $lockStream = [System.IO.File]::Open(
        $lockPath,
        [System.IO.FileMode]::OpenOrCreate,
        [System.IO.FileAccess]::ReadWrite,
        [System.IO.FileShare]::None
    )
    Write-Log ("RECOVERY_LOCK_ACQUIRED {0}" -f $lockPath)
    Assert-NoRayScanner

    if (Test-Path -LiteralPath $legacyCheckpoint) {
        $legacy = Read-ImmutableJson $legacyCheckpoint
        if (Test-Path -LiteralPath $quotientCheckpoint) {
            $quotient = Read-ImmutableJson $quotientCheckpoint
            $expectedQuotient = $quotient.Hash
        }
        else {
            $expectedQuotient = "ABSENT"
        }
        $importStdout = Join-Path $root ("e5_five_cubic_path_{0}_legacy_to_quotient_import_stdout_20260825.txt" -f $Layout)
        $importStderr = Join-Path $root ("e5_five_cubic_path_{0}_legacy_to_quotient_import_stderr_20260825.txt" -f $Layout)
        Write-Log ("IMPORT LEGACY={0} QUOTIENT_BEFORE={1}" -f $legacy.Hash, $expectedQuotient)
        $importProcess = Start-Process -FilePath $python -WorkingDirectory $root -WindowStyle Hidden -PassThru `
            -RedirectStandardOutput $importStdout -RedirectStandardError $importStderr `
            -ArgumentList @(
                $importer,
                "--layout", $Layout,
                "--expected-legacy-checkpoint-sha256", $legacy.Hash,
                "--expected-quotient-checkpoint-sha256", $expectedQuotient
            )
        $importProcess.WaitForExit()
        if ($importProcess.ExitCode -ne 0) {
            throw "legacy import failed with exit $($importProcess.ExitCode)"
        }
        if (-not (Test-Path -LiteralPath $importReport)) {
            throw "legacy import report missing"
        }
        $importEvidence = Read-ImmutableJson $importReport
        if ($importEvidence.Value.status -ne "PASS_FAIL_CLOSED_LEGACY_PREFIX_VERIFIED_FOR_QUOTIENT_RECOVERY_NO_PROOF_SCOPE_CHANGE") {
            throw "legacy import report status mismatch"
        }
        Write-Log ("IMPORT_PASS REPORT={0} CURSOR={1}" -f $importEvidence.Hash, $importEvidence.Value.quotient_cursor_after)
    }

    $noProgress = 0
    $attempt = 0
    while ($true) {
        Assert-NoRayScanner
        if (Test-CompleteReport $quotientReport $quotientCheckpoint) {
            Write-Log "QUOTIENT_RECOVERY_COMPLETE"
            exit 0
        }
        if (Test-Path -LiteralPath $quotientCheckpoint) {
            $before = Read-ImmutableJson $quotientCheckpoint
            $beforeCursor = [int64]$before.Value.cursor
            $beforeHash = $before.Hash
        }
        else {
            $beforeCursor = [int64]0
            $beforeHash = "ABSENT"
        }
        if ($beforeCursor -ge $totalByLayout[$Layout]) {
            throw "complete cursor without a valid report"
        }
        $attempt += 1
        $stdout = Join-Path $root ("e5_five_cubic_path_{0}_cuda_quotient_recovery_attempt{1}_stdout_20260825.txt" -f $Layout, $attempt)
        $stderr = Join-Path $root ("e5_five_cubic_path_{0}_cuda_quotient_recovery_attempt{1}_stderr_20260825.txt" -f $Layout, $attempt)
        Write-Log ("START ATTEMPT={0} CURSOR={1} HASH={2}" -f $attempt, $beforeCursor, $beforeHash)
        $child = Start-Process -FilePath $python -WorkingDirectory $root -WindowStyle Hidden -PassThru `
            -RedirectStandardOutput $stdout -RedirectStandardError $stderr `
            -ArgumentList @(
                $scanner,
                "--layout", $Layout,
                "--max-batches", $MaxBatchesPerProcess
            )
        $child.WaitForExit()
        Assert-NoRayScanner
        if (-not (Test-Path -LiteralPath $quotientCheckpoint)) {
            $afterCursor = [int64]0
            $afterHash = "ABSENT"
        }
        else {
            $after = Read-ImmutableJson $quotientCheckpoint
            $afterCursor = [int64]$after.Value.cursor
            $afterHash = $after.Hash
        }
        $progress = $afterCursor - $beforeCursor
        Write-Log ("EXIT ATTEMPT={0} CODE={1} CURSOR={2} PROGRESS={3} HASH={4}" -f $attempt, $child.ExitCode, $afterCursor, $progress, $afterHash)
        if ($afterCursor -lt $beforeCursor) {
            throw "checkpoint cursor regressed"
        }
        if ($progress -eq 0) {
            $noProgress += 1
        }
        else {
            $noProgress = 0
        }
        if ($noProgress -ge $MaxNoProgressFailures) {
            throw "hard stop after $noProgress consecutive no-progress exits"
        }
    }
}
finally {
    if ($lockStream) {
        $lockStream.Dispose()
    }
}
