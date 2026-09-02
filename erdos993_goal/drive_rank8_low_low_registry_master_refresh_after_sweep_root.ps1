$ErrorActionPreference = 'Stop'

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Log = Join-Path $Root 'rank8_low_low_registry_master_refresh_after_sweep_root_20260825.txt'
$SweepPid = 430620
$Affinity = 4096

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
    if ($process.ExitCode -ne 0) {
        throw "python failed with exit code $($process.ExitCode)"
    }
}

try {
    Stamp 'BEGIN'
    if (Get-Process -Id $SweepPid -ErrorAction SilentlyContinue) {
        Stamp "WAIT_GRADES8_13_SWEEP PID=$SweepPid"
        Wait-Process -Id $SweepPid
    }

    $block = Join-Path $Root 'rank8_low_low_a23_mixed_cross_multidegree_grades8_13_block_assembler_agent_20260825.json'
    if (-not (Test-Path -LiteralPath $block)) {
        throw "48-cell block certificate missing: $block"
    }
    $blockPayload = Get-Content -Raw -LiteralPath $block | ConvertFrom-Json
    if ($blockPayload.status -ne 'PASS_HASH_PINNED_ALL_48_LOW_LOW_REGISTRY_CELLS_GRADES8_13') {
        throw "48-cell block status was $($blockPayload.status)"
    }
    Stamp "BLOCK_PASS SHA256=$((Get-FileHash -Algorithm SHA256 -LiteralPath $block).Hash)"

    $registryBuilder = Join-Path $Root 'build_rank8_low_low_a23_mixed_cross_outer_registry_agent.py'
    $registry = Join-Path $Root 'rank8_low_low_a23_mixed_cross_outer_registry_agent_20260823.json'
    $registryAudit = Join-Path $Root 'rank8_low_low_a23_mixed_cross_outer_registry_independent_audit_agent_20260823.json'
    Run-Python -Arguments @(
        'build_rank8_low_low_a23_mixed_cross_outer_registry_agent.py'
    ) -Stdout (Join-Path $Root 'rank8_low_low_registry_refresh_stdout_root_20260825.txt') `
      -Stderr (Join-Path $Root 'rank8_low_low_registry_refresh_stderr_root_20260825.txt')
    $registryPayload = Get-Content -Raw -LiteralPath $registry | ConvertFrom-Json
    if (($registryPayload.sealed_and_independently_audited -ne 124) -or `
        ($registryPayload.producer_sealed_audit_missing -ne 0) -or `
        ($registryPayload.missing_producer_and_audit -ne 0)) {
        throw "registry did not reach exact 124/124 completion"
    }
    $registryHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $registry).Hash
    $registryBuilderHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $registryBuilder).Hash
    Run-Python -Arguments @(
        'audit_rank8_low_low_a23_mixed_cross_outer_registry_agent.py',
        '--registry', $registry,
        '--expected-registry-sha256', $registryHash,
        '--builder-source', $registryBuilder,
        '--expected-builder-source-sha256', $registryBuilderHash,
        '--expected-audited', '124',
        '--expected-producer-only', '0',
        '--expected-missing', '0',
        '--output', $registryAudit
    ) -Stdout (Join-Path $Root 'rank8_low_low_registry_refresh_independent_stdout_root_20260825.txt') `
      -Stderr (Join-Path $Root 'rank8_low_low_registry_refresh_independent_stderr_root_20260825.txt')
    $registryAuditPayload = Get-Content -Raw -LiteralPath $registryAudit | ConvertFrom-Json
    if ($registryAuditPayload.status -ne 'PASS_INDEPENDENT_HASH_PINNED_REGISTRY_EXACT_124_CELL_DOMAIN_AND_EVIDENCE_REPLAY') {
        throw "registry independent audit status was $($registryAuditPayload.status)"
    }
    Stamp "REGISTRY_124_OF_124_PASS SHA256=$registryHash AUDIT_SHA256=$((Get-FileHash -Algorithm SHA256 -LiteralPath $registryAudit).Hash)"

    $masterBuilder = Join-Path $Root 'assemble_rank8_forest_q8_pgc_master_integration_ledger_agent.py'
    $master = Join-Path $Root 'rank8_forest_q8_pgc_master_integration_ledger_agent_20260823.json'
    $masterAudit = Join-Path $Root 'rank8_forest_q8_pgc_master_integration_ledger_independent_audit_agent_20260823.json'
    Run-Python -Arguments @(
        'assemble_rank8_forest_q8_pgc_master_integration_ledger_agent.py'
    ) -Stdout (Join-Path $Root 'rank8_master_refresh_after_low_low_stdout_root_20260825.txt') `
      -Stderr (Join-Path $Root 'rank8_master_refresh_after_low_low_stderr_root_20260825.txt')
    $masterPayload = Get-Content -Raw -LiteralPath $master | ConvertFrom-Json
    $nested = $masterPayload.low_low_exact_state.nested_mixed_cross_certificate_registry
    if (($nested.sealed_and_independently_audited -ne 124) -or `
        ($nested.producer_sealed_audit_missing -ne 0) -or `
        ($nested.missing_producer_and_audit -ne 0)) {
        throw 'master did not ingest the completed 124-cell registry'
    }
    $masterHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $master).Hash
    $masterBuilderHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $masterBuilder).Hash
    Run-Python -Arguments @(
        'audit_rank8_forest_q8_pgc_master_integration_ledger_agent.py',
        '--builder', $masterBuilder,
        '--expected-builder-sha256', $masterBuilderHash,
        '--ledger', $master,
        '--expected-ledger-sha256', $masterHash,
        '--output', $masterAudit
    ) -Stdout (Join-Path $Root 'rank8_master_refresh_after_low_low_independent_stdout_root_20260825.txt') `
      -Stderr (Join-Path $Root 'rank8_master_refresh_after_low_low_independent_stderr_root_20260825.txt')
    $masterAuditPayload = Get-Content -Raw -LiteralPath $masterAudit | ConvertFrom-Json
    if ($masterAuditPayload.status -ne 'PASS_INDEPENDENT_FAIL_CLOSED_MASTER_LEDGER_REPLAY_WITH_E2_AND_ALL_ROOT_N27_SEALED_GLOBAL_THEOREMS_STILL_OPEN') {
        throw "master independent audit status was $($masterAuditPayload.status)"
    }
    if ($masterAuditPayload.low_low_rederived.registry_states.SEALED_AND_INDEPENDENTLY_AUDITED -ne 124) {
        throw 'master independent audit did not replay registry 124/124'
    }
    Stamp "PASS_COMPLETE_REGISTRY_AND_MASTER_REFRESH MASTER_SHA256=$masterHash AUDIT_SHA256=$((Get-FileHash -Algorithm SHA256 -LiteralPath $masterAudit).Hash)"
} catch {
    Stamp "FAIL TYPE=$($_.Exception.GetType().Name) MESSAGE=$($_.Exception.Message)"
    throw
}
