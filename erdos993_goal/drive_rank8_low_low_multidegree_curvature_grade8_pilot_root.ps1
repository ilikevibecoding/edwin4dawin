$ErrorActionPreference = 'Stop'

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Log = Join-Path $Root 'rank8_low_low_multidegree_curvature_grade8_pilot_root_20260825.txt'
$SmokePid = 92196
$PilotDirectory = Join-Path $Root '_multidegree_grades8_13_20260825'
$ScratchDirectory = Join-Path $Root '_multidegree_audit_scratch_20260825'
New-Item -ItemType Directory -Path $PilotDirectory -Force | Out-Null
New-Item -ItemType Directory -Path $ScratchDirectory -Force | Out-Null

function Stamp([string]$Message) {
    $line = "$(Get-Date -Format o) $Message"
    Add-Content -LiteralPath $Log -Value $line
}

function Run-Python(
    [string[]]$Arguments,
    [string]$Stdout,
    [string]$Stderr,
    [long]$Affinity
) {
    Stamp "RUN python $($Arguments -join ' ')"
    $process = Start-Process -FilePath 'python' -ArgumentList $Arguments `
        -WorkingDirectory $Root -WindowStyle Hidden `
        -RedirectStandardOutput $Stdout -RedirectStandardError $Stderr -PassThru
    try {
        $process.ProcessorAffinity = $Affinity
        $process.PriorityClass = 'BelowNormal'
    } catch {
        Stamp "PROCESS_TUNING_WARNING PID=$($process.Id) $($_.Exception.Message)"
    }
    Stamp "START PID=$($process.Id)"
    $process.WaitForExit()
    $process.Refresh()
    Stamp "EXIT PID=$($process.Id) CODE=$($process.ExitCode)"
    if ($process.ExitCode -ne 0) {
        throw "python failed with exit code $($process.ExitCode)"
    }
}

Stamp 'BEGIN'
if (Get-Process -Id $SmokePid -ErrorAction SilentlyContinue) {
    Stamp "WAIT_MULTIDEGREE_GRADE2_SMOKE PID=$SmokePid"
    Wait-Process -Id $SmokePid
}

$SmokeDirectory = Join-Path $Root '_multidegree_smoke_grade2_20260825'
$SmokeJob = Join-Path $SmokeDirectory 'rank8_low_low_a23_mixed_cross_curvature_grade2_multidegree_family_job_agent_20260823.json'
if (-not (Test-Path -LiteralPath $SmokeJob)) {
    throw "grade2 smoke did not produce its job: $SmokeJob"
}
$smoke = Get-Content -Raw -LiteralPath $SmokeJob | ConvertFrom-Json
if ($smoke.status -ne 'PASS_EXACT_DISTINCT_FACES_FAMILY_GRADE_ALL_REQUIRED_ROWS_NONNEGATIVE') {
    throw "grade2 smoke status was $($smoke.status)"
}
$SmokeHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $SmokeJob).Hash
Stamp "GRADE2_SMOKE_PASS JOB_SHA256=$SmokeHash"

$EquivalenceOutput = Join-Path $Root 'rank8_low_low_a23_mixed_cross_multidegree_curvature_grade2_sealed_equivalence_audit_agent_20260825.json'
Run-Python -Arguments @(
    'audit_rank8_low_low_a23_mixed_cross_multidegree_sealed_equivalence_agent.py',
    '--producer-job', $SmokeJob,
    '--expected-producer-job-sha256', $SmokeHash,
    '--output', $EquivalenceOutput
) -Stdout (Join-Path $Root 'rank8_low_low_multidegree_grade2_equivalence_stdout_agent_20260825.txt') `
  -Stderr (Join-Path $Root 'rank8_low_low_multidegree_grade2_equivalence_stderr_agent_20260825.txt') `
  -Affinity 4096
$equivalence = Get-Content -Raw -LiteralPath $EquivalenceOutput | ConvertFrom-Json
if ($equivalence.status -ne 'PASS_EXACT_MULTIDEGREE_ALL_FOUR_CELLS_MATCH_SEALED_INDEPENDENT_REFERENCES') {
    throw "grade2 equivalence status was $($equivalence.status)"
}
Stamp "GRADE2_EQUIVALENCE_PASS SHA256=$((Get-FileHash -Algorithm SHA256 -LiteralPath $EquivalenceOutput).Hash)"

$IndependentOutput = Join-Path $Root 'rank8_low_low_a23_mixed_cross_multidegree_curvature_grade2_independent_audit_agent_20260825.json'
Run-Python -Arguments @(
    'audit_rank8_low_low_a23_mixed_cross_multidegree_family_independent_agent.py',
    '--family', 'curvature',
    '--degree', '2',
    '--producer-job', $SmokeJob,
    '--expected-producer-job-sha256', $SmokeHash,
    '--output', $IndependentOutput,
    '--scratch-directory', $ScratchDirectory,
    '--hard-private-limit-bytes', '4000000000'
) -Stdout (Join-Path $Root 'rank8_low_low_multidegree_grade2_independent_stdout_agent_20260825.txt') `
  -Stderr (Join-Path $Root 'rank8_low_low_multidegree_grade2_independent_stderr_agent_20260825.txt') `
  -Affinity 4096
$independent = Get-Content -Raw -LiteralPath $IndependentOutput | ConvertFrom-Json
if ($independent.status -ne 'PASS_INDEPENDENT_FORMAL_TWO_GRADING_ATOM_EXTERNAL_MERGE_ALL_FOUR_CELLS_EXACT') {
    throw "grade2 independent status was $($independent.status)"
}
Stamp "GRADE2_INDEPENDENT_PASS SHA256=$((Get-FileHash -Algorithm SHA256 -LiteralPath $IndependentOutput).Hash)"

$PilotStdout = Join-Path $Root 'rank8_low_low_multidegree_curvature_grade8_primary_stdout_agent_20260825.txt'
$PilotStderr = Join-Path $Root 'rank8_low_low_multidegree_curvature_grade8_primary_stderr_agent_20260825.txt'
Run-Python -Arguments @(
    'probe_rank8_low_low_a23_mixed_cross_multidegree_family_stream_agent.py',
    '--family', 'curvature',
    '--degree', '8',
    '--output-directory', $PilotDirectory,
    '--private-limit', '8000000000'
) -Stdout $PilotStdout -Stderr $PilotStderr -Affinity 4096
$PilotJob = Join-Path $PilotDirectory 'rank8_low_low_a23_mixed_cross_curvature_grade8_multidegree_family_job_agent_20260823.json'
$pilot = Get-Content -Raw -LiteralPath $PilotJob | ConvertFrom-Json
if ($pilot.status -ne 'PASS_EXACT_DISTINCT_FACES_FAMILY_GRADE_ALL_REQUIRED_ROWS_NONNEGATIVE') {
    throw "grade8 curvature producer status was $($pilot.status)"
}
$PilotHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $PilotJob).Hash
Stamp "CURVATURE_GRADE8_PRIMARY_PASS JOB_SHA256=$PilotHash"

$PilotAudit = Join-Path $Root 'rank8_low_low_a23_mixed_cross_multidegree_curvature_grade8_independent_audit_agent_20260825.json'
Run-Python -Arguments @(
    'audit_rank8_low_low_a23_mixed_cross_multidegree_family_independent_agent.py',
    '--family', 'curvature',
    '--degree', '8',
    '--producer-job', $PilotJob,
    '--expected-producer-job-sha256', $PilotHash,
    '--output', $PilotAudit,
    '--scratch-directory', $ScratchDirectory,
    '--hard-private-limit-bytes', '8000000000'
) -Stdout (Join-Path $Root 'rank8_low_low_multidegree_curvature_grade8_independent_stdout_agent_20260825.txt') `
  -Stderr (Join-Path $Root 'rank8_low_low_multidegree_curvature_grade8_independent_stderr_agent_20260825.txt') `
  -Affinity 4096
$audit = Get-Content -Raw -LiteralPath $PilotAudit | ConvertFrom-Json
if ($audit.status -ne 'PASS_INDEPENDENT_FORMAL_TWO_GRADING_ATOM_EXTERNAL_MERGE_ALL_FOUR_CELLS_EXACT') {
    throw "grade8 curvature independent status was $($audit.status)"
}
Stamp "CURVATURE_GRADE8_INDEPENDENT_PASS SHA256=$((Get-FileHash -Algorithm SHA256 -LiteralPath $PilotAudit).Hash)"
$PilotAuditHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $PilotAudit).Hash
$PilotAssembler = Join-Path $Root 'rank8_low_low_a23_mixed_cross_multidegree_curvature_grade8_assembler_agent_20260825.json'
Run-Python -Arguments @(
    'assemble_rank8_low_low_a23_mixed_cross_multidegree_family_grade_agent.py',
    '--family', 'curvature',
    '--degree', '8',
    '--producer-job', $PilotJob,
    '--expected-producer-job-sha256', $PilotHash,
    '--independent-audit', $PilotAudit,
    '--expected-independent-audit-sha256', $PilotAuditHash,
    '--output', $PilotAssembler
) -Stdout (Join-Path $Root 'rank8_low_low_multidegree_curvature_grade8_assembler_stdout_agent_20260825.txt') `
  -Stderr (Join-Path $Root 'rank8_low_low_multidegree_curvature_grade8_assembler_stderr_agent_20260825.txt') `
  -Affinity 4096
$assembled = Get-Content -Raw -LiteralPath $PilotAssembler | ConvertFrom-Json
if ($assembled.status -ne 'PASS_HASH_PINNED_BOTH_FACES_FAMILY_GRADE_ALL_ROWS_INDEPENDENTLY_AUDITED') {
    throw "grade8 curvature assembler status was $($assembled.status)"
}
Stamp "CURVATURE_GRADE8_ASSEMBLER_PASS SHA256=$((Get-FileHash -Algorithm SHA256 -LiteralPath $PilotAssembler).Hash)"
Stamp 'PASS_COMPLETE_CURVATURE_GRADE8_PILOT'
