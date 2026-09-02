$ErrorActionPreference = 'Stop'

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Log = Join-Path $Root 'rank8_low_low_multidegree_grades8_13_sweep_root_20260825.txt'
$PilotPid = 372656
$OutputDirectory = Join-Path $Root '_multidegree_grades8_13_20260825'
$ScratchDirectory = Join-Path $Root '_multidegree_audit_scratch_20260825'
$Affinity = 4096
$PrivateLimit = 10000000000
New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null
New-Item -ItemType Directory -Path $ScratchDirectory -Force | Out-Null

function Stamp([string]$Message) {
    Add-Content -LiteralPath $Log -Value "$(Get-Date -Format o) $Message"
}

function Run-Python(
    [string[]]$Arguments,
    [string]$Stdout,
    [string]$Stderr
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
    # Some Windows app-execution-alias launches expose a null ExitCode even
    # after WaitForExit.  Every caller below validates its exact PASS artifact,
    # so a missing code is not itself a failure; a reported nonzero code is.
    if (($null -ne $process.ExitCode) -and ($process.ExitCode -ne 0)) {
        throw "python failed with exit code $($process.ExitCode)"
    }
}

function Get-PassJson([string]$Path, [string]$Status) {
    if (-not (Test-Path -LiteralPath $Path)) {
        return $null
    }
    try {
        $payload = Get-Content -Raw -LiteralPath $Path | ConvertFrom-Json
        if ($payload.status -eq $Status) {
            return $payload
        }
    } catch {
        Stamp "STALE_OR_INVALID_JSON PATH=$Path ERROR=$($_.Exception.Message)"
    }
    return $null
}

function Ensure-Grade([string]$Family, [int]$Degree) {
    $token = "${Family}_grade${Degree}"
    $job = Join-Path $OutputDirectory "rank8_low_low_a23_mixed_cross_${Family}_grade${Degree}_multidegree_family_job_agent_20260823.json"
    $audit = Join-Path $Root "rank8_low_low_a23_mixed_cross_multidegree_${Family}_grade${Degree}_independent_audit_agent_20260825.json"
    $assembler = Join-Path $Root "rank8_low_low_a23_mixed_cross_multidegree_${Family}_grade${Degree}_assembler_agent_20260825.json"

    $jobPayload = Get-PassJson $job 'PASS_EXACT_DISTINCT_FACES_FAMILY_GRADE_ALL_REQUIRED_ROWS_NONNEGATIVE'
    if (($null -eq $jobPayload) -or ($jobPayload.family -ne $Family) -or ($jobPayload.total_ordinary_slack_degree -ne $Degree)) {
        Run-Python -Arguments @(
            'probe_rank8_low_low_a23_mixed_cross_multidegree_family_stream_agent.py',
            '--family', $Family,
            '--degree', "$Degree",
            '--output-directory', $OutputDirectory,
            '--private-limit', "$PrivateLimit"
        ) -Stdout (Join-Path $Root "rank8_low_low_multidegree_${token}_primary_stdout_agent_20260825.txt") `
          -Stderr (Join-Path $Root "rank8_low_low_multidegree_${token}_primary_stderr_agent_20260825.txt")
        $jobPayload = Get-PassJson $job 'PASS_EXACT_DISTINCT_FACES_FAMILY_GRADE_ALL_REQUIRED_ROWS_NONNEGATIVE'
        if ($null -eq $jobPayload) {
            throw "producer did not pass for $token"
        }
    } else {
        Stamp "REUSE_PRIMARY_PASS TOKEN=$token"
    }
    $jobHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $job).Hash
    Stamp "PRIMARY_PASS TOKEN=$token SHA256=$jobHash"

    $auditPayload = Get-PassJson $audit 'PASS_INDEPENDENT_FORMAL_TWO_GRADING_ATOM_EXTERNAL_MERGE_ALL_FOUR_CELLS_EXACT'
    if (($null -eq $auditPayload) -or ($auditPayload.family -ne $Family) -or `
        ($auditPayload.total_ordinary_slack_degree -ne $Degree) -or `
        ($auditPayload.producer_job_sha256 -ne $jobHash)) {
        Run-Python -Arguments @(
            'audit_rank8_low_low_a23_mixed_cross_multidegree_family_independent_agent.py',
            '--family', $Family,
            '--degree', "$Degree",
            '--producer-job', $job,
            '--expected-producer-job-sha256', $jobHash,
            '--output', $audit,
            '--scratch-directory', $ScratchDirectory,
            '--hard-private-limit-bytes', "$PrivateLimit"
        ) -Stdout (Join-Path $Root "rank8_low_low_multidegree_${token}_independent_stdout_agent_20260825.txt") `
          -Stderr (Join-Path $Root "rank8_low_low_multidegree_${token}_independent_stderr_agent_20260825.txt")
        $auditPayload = Get-PassJson $audit 'PASS_INDEPENDENT_FORMAL_TWO_GRADING_ATOM_EXTERNAL_MERGE_ALL_FOUR_CELLS_EXACT'
        if ($null -eq $auditPayload) {
            throw "independent replay did not pass for $token"
        }
    } else {
        Stamp "REUSE_INDEPENDENT_PASS TOKEN=$token"
    }
    $auditHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $audit).Hash
    Stamp "INDEPENDENT_PASS TOKEN=$token SHA256=$auditHash"

    $assemblerPayload = Get-PassJson $assembler 'PASS_HASH_PINNED_BOTH_FACES_FAMILY_GRADE_ALL_ROWS_INDEPENDENTLY_AUDITED'
    $assemblerCurrent = ($null -ne $assemblerPayload) -and `
        ($assemblerPayload.family -eq $Family) -and `
        ($assemblerPayload.total_ordinary_slack_degree -eq $Degree) -and `
        ($assemblerPayload.producer_job.sha256 -eq $jobHash) -and `
        ($assemblerPayload.independent_audit.sha256 -eq $auditHash)
    if (-not $assemblerCurrent) {
        Run-Python -Arguments @(
            'assemble_rank8_low_low_a23_mixed_cross_multidegree_family_grade_agent.py',
            '--family', $Family,
            '--degree', "$Degree",
            '--producer-job', $job,
            '--expected-producer-job-sha256', $jobHash,
            '--independent-audit', $audit,
            '--expected-independent-audit-sha256', $auditHash,
            '--output', $assembler
        ) -Stdout (Join-Path $Root "rank8_low_low_multidegree_${token}_assembler_stdout_agent_20260825.txt") `
          -Stderr (Join-Path $Root "rank8_low_low_multidegree_${token}_assembler_stderr_agent_20260825.txt")
        $assemblerPayload = Get-PassJson $assembler 'PASS_HASH_PINNED_BOTH_FACES_FAMILY_GRADE_ALL_ROWS_INDEPENDENTLY_AUDITED'
        if ($null -eq $assemblerPayload) {
            throw "assembler did not pass for $token"
        }
    } else {
        Stamp "REUSE_ASSEMBLER_PASS TOKEN=$token"
    }
    Stamp "GRADE_COMPLETE TOKEN=$token ASSEMBLER_SHA256=$((Get-FileHash -Algorithm SHA256 -LiteralPath $assembler).Hash)"
}

try {
    Stamp 'BEGIN'
    if (Get-Process -Id $PilotPid -ErrorAction SilentlyContinue) {
        Stamp "WAIT_CURVATURE_GRADE8_PILOT PID=$PilotPid"
        Wait-Process -Id $PilotPid
    }

    $jobs = @(
        @('curvature', 8),
        @('curvature', 13),
        @('curvature', 9),
        @('curvature', 12),
        @('curvature', 10),
        @('curvature', 11),
        @('strong', 8),
        @('strong', 9),
        @('strong', 13),
        @('strong', 10),
        @('strong', 11),
        @('strong', 12)
    )
    foreach ($job in $jobs) {
        Ensure-Grade -Family $job[0] -Degree $job[1]
    }

    $block = Join-Path $Root 'rank8_low_low_a23_mixed_cross_multidegree_grades8_13_block_assembler_agent_20260825.json'
    Run-Python -Arguments @(
        'assemble_rank8_low_low_a23_mixed_cross_multidegree_grades8_13_block_agent.py',
        '--directory', $Root,
        '--output', $block
    ) -Stdout (Join-Path $Root 'rank8_low_low_multidegree_grades8_13_block_assembler_stdout_agent_20260825.txt') `
      -Stderr (Join-Path $Root 'rank8_low_low_multidegree_grades8_13_block_assembler_stderr_agent_20260825.txt')
    $blockPayload = Get-PassJson $block 'PASS_HASH_PINNED_ALL_48_LOW_LOW_REGISTRY_CELLS_GRADES8_13'
    if ($null -eq $blockPayload) {
        throw '48-cell block assembler did not pass'
    }
    Stamp "PASS_COMPLETE_ALL_48_CELLS SHA256=$((Get-FileHash -Algorithm SHA256 -LiteralPath $block).Hash)"
} catch {
    Stamp "FAIL TYPE=$($_.Exception.GetType().Name) MESSAGE=$($_.Exception.Message)"
    throw
}
