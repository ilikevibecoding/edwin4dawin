param(
    [Parameter(Mandatory = $true)]
    [ValidateSet(
        "inner_pendant_internal",
        "inner_spine_internal",
        "outer_spine_internal",
        "outer_pendant_internal"
    )]
    [string]$Layout,
    [int]$RayControllerProcessId = 0,
    [int]$FiniteBatchesPerProcess = 40,
    [int]$RawMultiplicityBatchesPerProcess = 100,
    [int]$FullAuditBatchesPerProcess = 40,
    [int]$MaxNoProgressFailures = 3,
    [string]$QualificationManifestPath,
    [string]$QualificationOutputPath
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$python = (Get-Command python -ErrorAction Stop).Source
$sourcePath = $MyInvocation.MyCommand.Path
$rayControllerSource = "drive_rank8_delta03_e5_five_cubic_path_internal_cuda_quotient_recovery_v2_root.ps1"
$rayControllerSourceHash = "25C24B1AE370EAF84DFBA9ED611F24DD341283561E18F75CC7649E531680D949"
$log = Join-Path $root ("e5_five_cubic_path_{0}_cuda_quotient_full_stage_v2_root_20260825.txt" -f $Layout)
$lockPath = Join-Path $root ("e5_five_cubic_path_{0}_cuda_quotient_full_stage_owner.lock" -f $Layout)

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
$allShortByLayout = @{
    "inner_pendant_internal" = [int64]1600967592
    "inner_spine_internal" = [int64]1600967592
    "outer_spine_internal" = [int64]1600967592
    "outer_pendant_internal" = [int64]2744515872
}
$finiteByLayout = @{
    "inner_pendant_internal" = [int64]1597435864
    "inner_spine_internal" = [int64]1597435864
    "outer_spine_internal" = [int64]1597435864
    "outer_pendant_internal" = [int64]2739018464
}
$order27ByLayout = @{
    "inner_pendant_internal" = [int64]1513615
    "inner_spine_internal" = [int64]1513615
    "outer_spine_internal" = [int64]1513615
    "outer_pendant_internal" = [int64]2393416
}
$token = $Layout.ToUpperInvariant()
$statusByStage = [ordered]@{
    "RAYS" = "PASS_EXACT_CUDA_I256_CRT_E5_FIVE_CUBIC_PATH_${token}_RAYS"
    "FINITE" = "PASS_EXACT_CUDA_I256_CRT_E5_FIVE_CUBIC_PATH_${token}_FINITE"
    "RAW_MULTIPLICITY" = "PASS_INDEPENDENT_RAW_MULTIPLICITY_AUDIT_E5_FIVE_CUBIC_PATH_${token}_QUOTIENT_RAYS"
    "PRIMARY" = "PASS_PRIMARY_EXACT_ALL_ORDER_E5_FIVE_CUBIC_PATH_${token}"
    "EXACT_SEAL" = "PASS_EXACT_RANK8_DELTA03_E5_FIVE_CUBIC_PATH_${token}_N28_PLUS"
    "FULL_RAW_AUDIT" = "PASS_FULL_INDEPENDENT_CUDA_AUDIT_E5_FIVE_CUBIC_PATH_${token}"
    "DUAL_AUDIT_SEAL" = "PASS_INDEPENDENT_RANK8_DELTA03_E5_FIVE_CUBIC_PATH_${token}_N28_PLUS_AUDIT"
    "N27_FINAL" = "PASS_EXACT_AND_INDEPENDENT_RANK8_DELTA03_E5_FIVE_CUBIC_PATH_${token}_N27_PLUS"
}
$stageOrder = @(
    "RAYS",
    "FINITE",
    "RAW_MULTIPLICITY",
    "PRIMARY",
    "EXACT_SEAL",
    "FULL_RAW_AUDIT",
    "DUAL_AUDIT_SEAL",
    "N27_FINAL"
)

$expected = @{
    $rayControllerSource = $rayControllerSourceHash
    "rank8_delta03_e5_five_cubic_path_internal_quotient_full_stage_config_agent.py" = "7A154586039D96D2BCFB9C82267D9854D2206361A65185EB1A6373C54D78BCAE"
    "audit_rank8_delta03_e5_five_cubic_path_internal_cuda_quotient_raw_multiplicity_agent.py" = "37FDA3CFE1A06DAA1A66CA824D30543D37AACA78BA71E53E77FB59288A4764D8"
    "assemble_rank8_delta03_e5_five_cubic_path_internal_cuda_quotient_primary_agent.py" = "611AA292FD778D78093783A7D67CB755FE9838A2FD1FF5E09D2F76DB297A37D6"
    "audit_rank8_delta03_e5_five_cubic_path_internal_cuda_quotient_full_agent.py" = "993864DBABE869DBAD94E3D77C178EA993A9B40C9461D37389574AF8F1B5126E"
    "seal_rank8_delta03_e5_five_cubic_path_internal_cuda_quotient_exact_agent.py" = "2EE677AEE4FC588963ABAF1386F67D987D6BA6F0C59B15CF6811D8BF69CA73A6"
    "seal_rank8_delta03_e5_five_cubic_path_internal_cuda_quotient_independent_audit_agent.py" = "C350C27F92E126BB1746A00A75ADAC50F8E49728A3ACEBA852002970205E268F"
    "assemble_rank8_delta03_e5_five_cubic_path_internal_cuda_quotient_n27_plus_agent.py" = "71C5E888041DBFD4CDC28F8AAE6ACD2918F2D589FFEA68475DF736C01E06D2FF"
    "scan_rank8_delta03_e5_five_cubic_path_internal_cuda_quotient_rays_agent.py" = "73B6757090E16C7B916F2A646D26B9E69F0FB0566843D2694404DF02BFE0B60B"
    "run_rank8_cuda_full_internal_audit_driver_agent.py" = "6725E387E7E738F12EABF51F6D437BDAE53CB00242E802E838A8345C4D00A726"
}
$finiteScannerHashByLayout = @{
    "inner_pendant_internal" = "63897FDBABA602CFDA5650C75C9E3D6941EA5AC570EC33CF00410F8A8A508A6E"
    "inner_spine_internal" = "39029364F54B5614C07384F39AC6D473E51524A3CBDFFA8846FDCED7BAABF7C0"
    "outer_spine_internal" = "305C95C0F7E4CC807729EAD40190356F86B44ED6B9B70922B98B827B23397843"
    "outer_pendant_internal" = "D0B236C22EE9F2353226511DF3B87499FD46A1826D26117F0802411AF084C43F"
}
$finiteScannerName = "scan_rank8_delta03_e5_five_cubic_path_${Layout}_cuda_finite_agent.py"
$expected[$finiteScannerName] = $finiteScannerHashByLayout[$Layout]

$qRayCheckpoint = Join-Path $root "rank8_delta03_e5_five_cubic_path_${Layout}_cuda_quotient_rays_checkpoint_agent_20260825.json"
$qRayReport = Join-Path $root "rank8_delta03_e5_five_cubic_path_${Layout}_cuda_quotient_rays_exact_agent_20260825.json"
$finiteCheckpoint = Join-Path $root "rank8_delta03_e5_five_cubic_path_${Layout}_cuda_finite_checkpoint_agent_20260825.json"
$finiteReport = Join-Path $root "rank8_delta03_e5_five_cubic_path_${Layout}_cuda_finite_exact_agent_20260825.json"
$rawCheckpoint = Join-Path $root "rank8_delta03_e5_five_cubic_path_${Layout}_cuda_quotient_raw_multiplicity_audit_checkpoint_agent_20260825.json"
$rawReport = Join-Path $root "rank8_delta03_e5_five_cubic_path_${Layout}_cuda_quotient_raw_multiplicity_audit_agent_20260825.json"
$primaryReport = Join-Path $root "rank8_delta03_e5_five_cubic_path_${Layout}_cuda_quotient_primary_exact_agent_20260825.json"
$exactReport = Join-Path $root "rank8_delta03_e5_five_cubic_path_${Layout}_cuda_quotient_all_order_exact_agent_20260825.json"
$fullCheckpoint = Join-Path $root "rank8_delta03_e5_five_cubic_path_${Layout}_cuda_quotient_full_audit_checkpoint_agent_20260825.json"
$fullReport = Join-Path $root "rank8_delta03_e5_five_cubic_path_${Layout}_cuda_quotient_full_independent_audit_agent_20260825.json"
$dualReport = Join-Path $root "rank8_delta03_e5_five_cubic_path_${Layout}_cuda_quotient_all_order_independent_audit_agent_20260825.json"
$finalReport = Join-Path $root "rank8_delta03_e5_five_cubic_path_${Layout}_cuda_quotient_n27_plus_exact_agent_20260825.json"

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

function Write-AtomicJson([string]$Path, [object]$Value) {
    $parent = Split-Path -Parent $Path
    if ($parent -and -not (Test-Path -LiteralPath $parent)) {
        New-Item -ItemType Directory -Path $parent -Force | Out-Null
    }
    $temporary = "${Path}.tmp"
    $Value | ConvertTo-Json -Depth 100 | Set-Content -LiteralPath $temporary -Encoding utf8NoBOM
    Move-Item -LiteralPath $temporary -Destination $Path -Force
}

function Write-Log([string]$Message) {
    $line = "{0} {1}" -f (Get-Date).ToString("o"), $Message
    Add-Content -LiteralPath $log -Value $line
    Write-Output $line
}

function Assert-PredecessorRecord([object]$Record) {
    if ([int]$Record.process_id -le 0) {
        throw "invalid predecessor process id"
    }
    if ([string]$Record.script_sha256 -ne $rayControllerSourceHash) {
        throw "predecessor script hash mismatch"
    }
    $command = [string]$Record.command_line
    if (-not $command.Contains($rayControllerSource)) {
        throw "predecessor command does not name the quotient ray controller"
    }
    if (-not $command.Contains("-Layout $Layout")) {
        throw "predecessor command does not bind the requested layout argument"
    }
    if (-not $command.Contains("-OriginalControllerProcessId")) {
        throw "predecessor command lacks its original-controller boundary"
    }
}

function Assert-NoCompetitorRecords([object[]]$Records) {
    $items = @($Records)
    if ($items.Count -gt 0) {
        $description = ($items | ForEach-Object {
            "PID=$($_.process_id) $($_.command_line)"
        }) -join " | "
        throw "competing proof process detected: $description"
    }
}

function Assert-StageSequence([string[]]$Stages) {
    if ($Stages.Count -ne $stageOrder.Count) {
        throw "stage sequence length mismatch"
    }
    for ($index = 0; $index -lt $stageOrder.Count; $index++) {
        if ($Stages[$index] -ne $stageOrder[$index]) {
            throw "stage order mismatch at index $index"
        }
    }
}

function Get-CompetitorRecords {
    $tokens = @(
        "scan_rank8_delta03_e5_five_cubic_path_${Layout}_cuda_rays_agent.py",
        "scan_rank8_delta03_e5_five_cubic_path_internal_cuda_quotient_rays_agent.py",
        $finiteScannerName,
        "audit_rank8_delta03_e5_five_cubic_path_${Layout}_cuda_full_agent.py",
        "audit_rank8_delta03_e5_five_cubic_path_internal_cuda_quotient_full_agent.py",
        "audit_rank8_delta03_e5_five_cubic_path_internal_cuda_quotient_raw_multiplicity_agent.py",
        "assemble_rank8_delta03_e5_five_cubic_path_internal_cuda_quotient_primary_agent.py",
        "seal_rank8_delta03_e5_five_cubic_path_internal_cuda_quotient_exact_agent.py",
        "seal_rank8_delta03_e5_five_cubic_path_internal_cuda_quotient_independent_audit_agent.py",
        "assemble_rank8_delta03_e5_five_cubic_path_internal_cuda_quotient_n27_plus_agent.py",
        "drive_rank8_delta03_e5_five_cubic_path_${Layout}_cuda_chain_root.ps1",
        $rayControllerSource,
        (Split-Path -Leaf $sourcePath)
    )
    $records = @()
    foreach ($process in (Get-CimInstance Win32_Process)) {
        if ([int]$process.ProcessId -eq $PID -or [int]$process.ProcessId -eq $RayControllerProcessId) {
            continue
        }
        $command = [string]$process.CommandLine
        if (-not $command -or -not $command.Contains($Layout)) {
            continue
        }
        $matched = $false
        foreach ($candidate in $tokens) {
            if ($command.Contains($candidate)) {
                $matched = $true
                break
            }
        }
        if ($matched) {
            $records += [pscustomobject]@{
                process_id = [int]$process.ProcessId
                command_line = $command
            }
        }
    }
    return $records
}

function Assert-NoCompetingProofProcess {
    Assert-NoCompetitorRecords @(Get-CompetitorRecords)
}

function Get-Report([string]$Path, [string]$ExpectedStatus) {
    if (-not (Test-Path -LiteralPath $Path)) {
        return $null
    }
    $evidence = Read-ImmutableJson $Path
    if ([string]$evidence.Value.status -ne $ExpectedStatus) {
        throw "unexpected status in $Path"
    }
    return $evidence
}

function Get-RayEvidence {
    $report = Get-Report $qRayReport $statusByStage["RAYS"]
    if ($null -eq $report) { return $null }
    if (-not (Test-Path -LiteralPath $qRayCheckpoint)) { throw "ray report without checkpoint" }
    $checkpoint = Read-ImmutableJson $qRayCheckpoint
    if ([int64]$checkpoint.Value.cursor -ne $totalByLayout[$Layout]) { throw "incomplete quotient ray cursor" }
    if ([string]$report.Value.checkpoint_sha256 -ne $checkpoint.Hash) { throw "quotient ray pair hash mismatch" }
    if ([int64]$report.Value.totals.patterns -ne $totalByLayout[$Layout] -or
        [int64]$report.Value.totals.rays -ne $raysByLayout[$Layout]) { throw "quotient ray totals mismatch" }
    if ([int64]$report.Value.totals.gate_failures -ne 0 -or
        [int64]$report.Value.totals.bound_failures -ne 0 -or
        [int64]$report.Value.totals.negative_classifications -ne 0) { throw "quotient ray failure count" }
    return [pscustomobject]@{ Report = $report; Checkpoint = $checkpoint }
}

function Get-FiniteEvidence {
    $report = Get-Report $finiteReport $statusByStage["FINITE"]
    if ($null -eq $report) { return $null }
    if (-not (Test-Path -LiteralPath $finiteCheckpoint)) { throw "finite report without checkpoint" }
    $checkpoint = Read-ImmutableJson $finiteCheckpoint
    if ([int64]$checkpoint.Value.cursor -ne $totalByLayout[$Layout]) { throw "incomplete finite cursor" }
    if ([string]$report.Value.checkpoint_sha256 -ne $checkpoint.Hash) { throw "finite pair hash mismatch" }
    if ([int64]$report.Value.totals.patterns -ne $totalByLayout[$Layout] -or
        [int64]$report.Value.totals.all_short -ne $allShortByLayout[$Layout] -or
        [int64]$report.Value.totals.finite -ne $finiteByLayout[$Layout] -or
        [int64]$report.Value.totals.order27 -ne $order27ByLayout[$Layout] -or
        [int64]$report.Value.totals.nonpositive_values -ne 0 -or
        [int64]$report.Value.totals.bound_failures -ne 0) { throw "finite totals mismatch" }
    return [pscustomobject]@{ Report = $report; Checkpoint = $checkpoint }
}

function Get-RawMultiplicityEvidence([string]$ExpectedRayCheckpointHash) {
    $report = Get-Report $rawReport $statusByStage["RAW_MULTIPLICITY"]
    if ($null -eq $report) { return $null }
    if (-not (Test-Path -LiteralPath $rawCheckpoint)) { throw "raw audit report without checkpoint" }
    $checkpoint = Read-ImmutableJson $rawCheckpoint
    if ([string]$report.Value.audit_checkpoint_sha256 -ne $checkpoint.Hash) { throw "raw audit pair hash mismatch" }
    if ([string]$report.Value.quotient_checkpoint_sha256 -ne $ExpectedRayCheckpointHash) { throw "raw audit does not pin ray checkpoint" }
    if ([int64]$checkpoint.Value.quotient_checkpoint_cursor -ne $totalByLayout[$Layout] -or
        [int64]$report.Value.totals.patterns -ne $totalByLayout[$Layout] -or
        [int64]$report.Value.totals.raw_rays -ne $raysByLayout[$Layout]) { throw "raw audit totals mismatch" }
    if ([int64]$report.Value.audited_batches -ne [int64]$checkpoint.Value.next_batch_index) { throw "raw audit batch mismatch" }
    return [pscustomobject]@{ Report = $report; Checkpoint = $checkpoint }
}

function Get-FullAuditEvidence {
    $report = Get-Report $fullReport $statusByStage["FULL_RAW_AUDIT"]
    if ($null -eq $report) { return $null }
    if (-not (Test-Path -LiteralPath $fullCheckpoint)) { throw "full audit report without checkpoint" }
    $checkpoint = Read-ImmutableJson $fullCheckpoint
    if ([string]$report.Value.checkpoint_sha256 -ne $checkpoint.Hash) { throw "full audit pair hash mismatch" }
    if ([int64]$checkpoint.Value.cursor -ne $totalByLayout[$Layout] -or
        [int64]$report.Value.totals.patterns -ne $totalByLayout[$Layout] -or
        [int64]$report.Value.totals.rays -ne $raysByLayout[$Layout] -or
        [int64]$report.Value.totals.finite -ne $finiteByLayout[$Layout] -or
        [int64]$report.Value.totals.ray_gate_failures -ne 0 -or
        [int64]$report.Value.totals.ray_bound_failures -ne 0 -or
        [int64]$report.Value.totals.ray_negative_classifications -ne 0 -or
        [int64]$report.Value.totals.finite_nonpositive_values -ne 0 -or
        [int64]$report.Value.totals.finite_bound_failures -ne 0) { throw "full audit totals mismatch" }
    return [pscustomobject]@{ Report = $report; Checkpoint = $checkpoint }
}

function Invoke-PythonChild([string]$Stage, [string[]]$Arguments, [int]$Attempt) {
    Assert-NoCompetingProofProcess
    $stdout = Join-Path $root ("e5_five_cubic_path_{0}_cuda_quotient_full_stage_{1}_attempt{2}_stdout_20260825.txt" -f $Layout, $Stage.ToLowerInvariant(), $Attempt)
    $stderr = Join-Path $root ("e5_five_cubic_path_{0}_cuda_quotient_full_stage_{1}_attempt{2}_stderr_20260825.txt" -f $Layout, $Stage.ToLowerInvariant(), $Attempt)
    Write-Log ("START STAGE={0} ATTEMPT={1} ARGS={2}" -f $Stage, $Attempt, ($Arguments -join " "))
    $child = Start-Process -FilePath $python -WorkingDirectory $root -WindowStyle Hidden -PassThru `
        -RedirectStandardOutput $stdout -RedirectStandardError $stderr -ArgumentList $Arguments
    $child.WaitForExit()
    $exitCode = $child.ExitCode
    Assert-NoCompetingProofProcess
    Write-Log ("EXIT STAGE={0} ATTEMPT={1} CODE={2}" -f $Stage, $Attempt, $exitCode)
    return $exitCode
}

function Invoke-Qualification([string]$ManifestPath, [string]$OutputPath) {
    $evidence = Read-ImmutableJson $ManifestPath
    $manifest = $evidence.Value
    if ([string]$manifest.schema -ne "rank8-quotient-full-stage-controller-qualification-fixture-v1") { throw "qualification schema mismatch" }
    if ($manifest.qualification_fixture -ne $true -or $manifest.no_proof_credit -ne $true) { throw "qualification guard missing" }
    if ([string]$manifest.layout -ne $Layout) { throw "qualification layout mismatch" }
    Assert-PredecessorRecord $manifest.predecessor
    Assert-NoCompetitorRecords @($manifest.competitors)
    Assert-StageSequence @($manifest.stage_sequence)
    foreach ($stage in $stageOrder) {
        if ([string]$manifest.statuses.$stage -ne $statusByStage[$stage]) { throw "qualification status mismatch at $stage" }
        $artifactHash = [string]$manifest.artifact_hashes.$stage
        if ($artifactHash -notmatch "^[0-9A-F]{64}$") { throw "qualification artifact hash malformed at $stage" }
    }
    if (-not $OutputPath) {
        Write-Output "PASS_CONTROLLER_QUALIFICATION_NO_PROOF_CREDIT"
        return
    }
    $payload = [ordered]@{
        schema = "rank8-quotient-full-stage-controller-qualification-agent-v1"
        status = "PASS_CONTROLLER_QUALIFICATION_NO_PROOF_CREDIT"
        layout = $Layout
        manifest_sha256 = $evidence.Hash
        enforced_stage_order = $stageOrder
        predecessor_identity_enforced = $true
        competing_process_guard_enforced = $true
        source_sha256 = Get-Hash $sourcePath
        scope_guard = "Isolated controller mutation qualification only; no scanner was launched and no proof artifact is credited."
    }
    Write-AtomicJson $OutputPath $payload
    Write-Output $payload.status
    Write-Output ("REPORT {0}" -f (Get-Hash $OutputPath))
}

if ($QualificationManifestPath) {
    Invoke-Qualification $QualificationManifestPath $QualificationOutputPath
    exit 0
}

if ($RayControllerProcessId -le 0) { throw "RayControllerProcessId is mandatory outside qualification mode" }
if ($FiniteBatchesPerProcess -le 0 -or $RawMultiplicityBatchesPerProcess -le 0 -or
    $FullAuditBatchesPerProcess -le 0 -or $MaxNoProgressFailures -le 0) { throw "all segment/failure limits must be positive" }
foreach ($name in $expected.Keys) {
    $path = Join-Path $root $name
    if (-not (Test-Path -LiteralPath $path)) { throw "missing pinned input: $name" }
    $actualHash = Get-Hash $path
    if ($actualHash -ne $expected[$name]) { throw "pinned input drift: $name expected=$($expected[$name]) actual=$actualHash" }
}

$predecessor = Get-CimInstance Win32_Process -Filter "ProcessId=$RayControllerProcessId"
if ($null -eq $predecessor) { throw "ray controller predecessor is not live at controller start" }
$predecessorRecord = [pscustomobject]@{
    process_id = [int]$predecessor.ProcessId
    command_line = [string]$predecessor.CommandLine
    script_sha256 = $rayControllerSourceHash
}
Assert-PredecessorRecord $predecessorRecord
$commandHashBytes = [System.Text.Encoding]::UTF8.GetBytes([string]$predecessor.CommandLine)
$commandAlgorithm = [System.Security.Cryptography.SHA256]::Create()
try { $predecessorCommandHash = [System.Convert]::ToHexString($commandAlgorithm.ComputeHash($commandHashBytes)) }
finally { $commandAlgorithm.Dispose() }
Write-Log ("WAIT RAY_CONTROLLER_PID={0} CREATION={1} COMMAND_SHA256={2}" -f $RayControllerProcessId, $predecessor.CreationDate, $predecessorCommandHash)
while (Get-Process -Id $RayControllerProcessId -ErrorAction SilentlyContinue) {
    Start-Sleep -Seconds 20
}
Write-Log "RAY_CONTROLLER_EXITED"
# Do not exempt a future process that happens to reuse the predecessor PID.
$RayControllerProcessId = 0
Assert-NoCompetingProofProcess

$lockStream = $null
try {
    $lockStream = [System.IO.File]::Open(
        $lockPath,
        [System.IO.FileMode]::OpenOrCreate,
        [System.IO.FileAccess]::ReadWrite,
        [System.IO.FileShare]::None
    )
    Write-Log ("FULL_STAGE_LOCK_ACQUIRED {0}" -f $lockPath)
    Assert-NoCompetingProofProcess

    $ray = Get-RayEvidence
    if ($null -eq $ray) { throw "ray controller exited without a complete quotient ray pair" }
    $qRayCheckpointHash = $ray.Checkpoint.Hash
    $qRayReportHash = $ray.Report.Hash
    $completedStages = @("RAYS")
    Write-Log ("STAGE_PASS RAYS REPORT={0} CHECKPOINT={1}" -f $qRayReportHash, $qRayCheckpointHash)

    $noProgress = 0
    $attempt = 0
    while ($null -eq (Get-FiniteEvidence)) {
        Assert-NoCompetingProofProcess
        if (Test-Path -LiteralPath $finiteCheckpoint) {
            $before = Read-ImmutableJson $finiteCheckpoint
            $beforeCursor = [int64]$before.Value.cursor
        }
        else { $beforeCursor = [int64]0 }
        $attempt += 1
        $code = Invoke-PythonChild "FINITE" @((Join-Path $root $finiteScannerName), "--max-batches", [string]$FiniteBatchesPerProcess) $attempt
        if ($null -ne (Get-FiniteEvidence)) { break }
        if (-not (Test-Path -LiteralPath $finiteCheckpoint)) { $afterCursor = [int64]0 }
        else { $afterCursor = [int64](Read-ImmutableJson $finiteCheckpoint).Value.cursor }
        if ($afterCursor -lt $beforeCursor) { throw "finite checkpoint cursor regressed" }
        if ($afterCursor -eq $beforeCursor) { $noProgress += 1 } else { $noProgress = 0 }
        Write-Log ("FINITE_BOUNDARY CODE={0} BEFORE={1} AFTER={2} NO_PROGRESS={3}" -f $code, $beforeCursor, $afterCursor, $noProgress)
        if ($noProgress -ge $MaxNoProgressFailures) { throw "finite hard stop after $noProgress no-progress exits" }
    }
    $finiteEvidence = Get-FiniteEvidence
    $finiteCheckpointHash = $finiteEvidence.Checkpoint.Hash
    $finiteReportHash = $finiteEvidence.Report.Hash
    $completedStages += "FINITE"
    Write-Log ("STAGE_PASS FINITE REPORT={0} CHECKPOINT={1}" -f $finiteReportHash, $finiteCheckpointHash)

    $noProgress = 0
    $attempt = 0
    while ($null -eq (Get-RawMultiplicityEvidence $qRayCheckpointHash)) {
        Assert-NoCompetingProofProcess
        if (Test-Path -LiteralPath $rawCheckpoint) {
            $before = Read-ImmutableJson $rawCheckpoint
            $beforeCursor = [int64]$before.Value.next_batch_index
        }
        else { $beforeCursor = [int64]0 }
        $attempt += 1
        $code = Invoke-PythonChild "RAW_MULTIPLICITY" @(
            (Join-Path $root "audit_rank8_delta03_e5_five_cubic_path_internal_cuda_quotient_raw_multiplicity_agent.py"),
            "--layout", $Layout,
            "--expected-quotient-ray-checkpoint-sha256", $qRayCheckpointHash,
            "--max-batches", [string]$RawMultiplicityBatchesPerProcess
        ) $attempt
        if ($null -ne (Get-RawMultiplicityEvidence $qRayCheckpointHash)) { break }
        if (-not (Test-Path -LiteralPath $rawCheckpoint)) { $afterCursor = [int64]0 }
        else { $afterCursor = [int64](Read-ImmutableJson $rawCheckpoint).Value.next_batch_index }
        if ($afterCursor -lt $beforeCursor) { throw "raw multiplicity checkpoint regressed" }
        if ($afterCursor -eq $beforeCursor) { $noProgress += 1 } else { $noProgress = 0 }
        Write-Log ("RAW_MULTIPLICITY_BOUNDARY CODE={0} BEFORE={1} AFTER={2} NO_PROGRESS={3}" -f $code, $beforeCursor, $afterCursor, $noProgress)
        if ($noProgress -ge $MaxNoProgressFailures) { throw "raw multiplicity hard stop after $noProgress no-progress exits" }
    }
    $rawEvidence = Get-RawMultiplicityEvidence $qRayCheckpointHash
    $rawCheckpointHash = $rawEvidence.Checkpoint.Hash
    $rawReportHash = $rawEvidence.Report.Hash
    $completedStages += "RAW_MULTIPLICITY"
    Write-Log ("STAGE_PASS RAW_MULTIPLICITY REPORT={0} CHECKPOINT={1}" -f $rawReportHash, $rawCheckpointHash)

    $attempt = 1
    $code = Invoke-PythonChild "PRIMARY" @(
        (Join-Path $root "assemble_rank8_delta03_e5_five_cubic_path_internal_cuda_quotient_primary_agent.py"),
        "--layout", $Layout,
        "--expected-quotient-ray-checkpoint-sha256", $qRayCheckpointHash,
        "--expected-quotient-ray-report-sha256", $qRayReportHash,
        "--expected-finite-checkpoint-sha256", $finiteCheckpointHash,
        "--expected-finite-report-sha256", $finiteReportHash,
        "--expected-raw-multiplicity-audit-checkpoint-sha256", $rawCheckpointHash,
        "--expected-raw-multiplicity-audit-sha256", $rawReportHash
    ) $attempt
    if ($code -ne 0) { throw "primary assembler failed" }
    $primary = Get-Report $primaryReport $statusByStage["PRIMARY"]
    if ($null -eq $primary) { throw "primary report missing" }
    $primaryHash = $primary.Hash
    $completedStages += "PRIMARY"
    Write-Log ("STAGE_PASS PRIMARY REPORT={0}" -f $primaryHash)

    $code = Invoke-PythonChild "EXACT_SEAL" @(
        (Join-Path $root "seal_rank8_delta03_e5_five_cubic_path_internal_cuda_quotient_exact_agent.py"),
        "--layout", $Layout,
        "--expected-primary-report-sha256", $primaryHash
    ) 1
    if ($code -ne 0) { throw "exact seal failed" }
    $exact = Get-Report $exactReport $statusByStage["EXACT_SEAL"]
    if ($null -eq $exact) { throw "exact seal report missing" }
    $exactHash = $exact.Hash
    $completedStages += "EXACT_SEAL"
    Write-Log ("STAGE_PASS EXACT_SEAL REPORT={0}" -f $exactHash)

    $noProgress = 0
    $attempt = 0
    while ($null -eq (Get-FullAuditEvidence)) {
        Assert-NoCompetingProofProcess
        if (Test-Path -LiteralPath $fullCheckpoint) {
            $beforeCursor = [int64](Read-ImmutableJson $fullCheckpoint).Value.cursor
        }
        else { $beforeCursor = [int64]0 }
        $attempt += 1
        $code = Invoke-PythonChild "FULL_RAW_AUDIT" @(
            (Join-Path $root "audit_rank8_delta03_e5_five_cubic_path_internal_cuda_quotient_full_agent.py"),
            "--layout", $Layout,
            "--expected-primary-report-sha256", $primaryHash,
            "--max-batches", [string]$FullAuditBatchesPerProcess
        ) $attempt
        if ($null -ne (Get-FullAuditEvidence)) { break }
        if (-not (Test-Path -LiteralPath $fullCheckpoint)) { $afterCursor = [int64]0 }
        else { $afterCursor = [int64](Read-ImmutableJson $fullCheckpoint).Value.cursor }
        if ($afterCursor -lt $beforeCursor) { throw "full audit checkpoint cursor regressed" }
        if ($afterCursor -eq $beforeCursor) { $noProgress += 1 } else { $noProgress = 0 }
        Write-Log ("FULL_AUDIT_BOUNDARY CODE={0} BEFORE={1} AFTER={2} NO_PROGRESS={3}" -f $code, $beforeCursor, $afterCursor, $noProgress)
        if ($noProgress -ge $MaxNoProgressFailures) { throw "full audit hard stop after $noProgress no-progress exits" }
    }
    $fullEvidence = Get-FullAuditEvidence
    $fullCheckpointHash = $fullEvidence.Checkpoint.Hash
    $fullReportHash = $fullEvidence.Report.Hash
    $completedStages += "FULL_RAW_AUDIT"
    Write-Log ("STAGE_PASS FULL_RAW_AUDIT REPORT={0} CHECKPOINT={1}" -f $fullReportHash, $fullCheckpointHash)

    $code = Invoke-PythonChild "DUAL_AUDIT_SEAL" @(
        (Join-Path $root "seal_rank8_delta03_e5_five_cubic_path_internal_cuda_quotient_independent_audit_agent.py"),
        "--layout", $Layout,
        "--expected-primary-report-sha256", $exactHash,
        "--expected-full-raw-audit-sha256", $fullReportHash,
        "--expected-full-audit-checkpoint-sha256", $fullCheckpointHash,
        "--expected-raw-multiplicity-audit-sha256", $rawReportHash,
        "--expected-raw-multiplicity-audit-checkpoint-sha256", $rawCheckpointHash
    ) 1
    if ($code -ne 0) { throw "dual audit seal failed" }
    $dual = Get-Report $dualReport $statusByStage["DUAL_AUDIT_SEAL"]
    if ($null -eq $dual) { throw "dual audit seal report missing" }
    $dualHash = $dual.Hash
    $completedStages += "DUAL_AUDIT_SEAL"
    Write-Log ("STAGE_PASS DUAL_AUDIT_SEAL REPORT={0}" -f $dualHash)

    $code = Invoke-PythonChild "N27_FINAL" @(
        (Join-Path $root "assemble_rank8_delta03_e5_five_cubic_path_internal_cuda_quotient_n27_plus_agent.py"),
        "--layout", $Layout,
        "--expected-primary-report-sha256", $exactHash,
        "--expected-audit-report-sha256", $dualHash
    ) 1
    if ($code -ne 0) { throw "N27 final assembler failed" }
    $final = Get-Report $finalReport $statusByStage["N27_FINAL"]
    if ($null -eq $final) { throw "N27 final report missing" }
    $completedStages += "N27_FINAL"
    Assert-StageSequence $completedStages
    if ((Get-Hash $qRayCheckpoint) -ne $qRayCheckpointHash -or (Get-Hash $qRayReport) -ne $qRayReportHash) {
        throw "immutable quotient ray pair drifted during full stage"
    }
    Write-Log ("PASS_FULL_STAGE N27_FINAL={0}" -f $final.Hash)
    exit 0
}
finally {
    if ($lockStream) { $lockStream.Dispose() }
}
