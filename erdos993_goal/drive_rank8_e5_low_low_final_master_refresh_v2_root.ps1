param(
    [Parameter(Mandatory = $true)]
    [int]$LowLowRefreshProcessId
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Log = Join-Path $Root 'rank8_e5_low_low_final_master_refresh_v2_root_20260825.txt'
$Refresh = Join-Path $Root 'drive_rank8_low_low_registry_master_refresh_after_sweep_root.ps1'
$Master = Join-Path $Root 'rank8_forest_q8_pgc_master_integration_ledger_agent_20260823.json'
$MasterAudit = Join-Path $Root 'rank8_forest_q8_pgc_master_integration_ledger_independent_audit_agent_20260823.json'
$Registry = Join-Path $Root 'rank8_low_low_a23_mixed_cross_outer_registry_agent_20260823.json'
$RegistryAudit = Join-Path $Root 'rank8_low_low_a23_mixed_cross_outer_registry_independent_audit_agent_20260823.json'

$ExpectedSources = @{
    'drive_rank8_low_low_registry_master_refresh_after_sweep_root.ps1' = 'F96D48F6EBF8F90A10BA05005BA0CB9F285085FA2DDC1D2F50C10D797F71DBE8'
    'assemble_rank8_forest_q8_pgc_master_integration_ledger_agent.py' = '4602AC48A7602F0DAC48E149DBD5A84071E8A010AF8A2C856FFC9D89C2A96B78'
    'audit_rank8_forest_q8_pgc_master_integration_ledger_agent.py' = '327383D2D8C6071AA58D06FB7B42EF2A23DAB676C0CE37ABF7B3F14F2B748D3B'
    'build_rank8_low_low_a23_mixed_cross_outer_registry_agent.py' = '2262D79F18D2E0B8F51F93A2DC961BB25FCA4052FF75A999554B814507F178F5'
    'audit_rank8_low_low_a23_mixed_cross_outer_registry_agent.py' = '7578E660F8CAB35319CAEBE072A36C16365B6B695A092DD7FC3186B992E40D5A'
}

$RequiredNewE5Orbits = @(
    'five_cubic_path:center_pendant_internal',
    'five_cubic_path:inner_pendant_internal',
    'five_cubic_path:inner_spine_internal',
    'five_cubic_path:outer_spine_internal',
    'five_cubic_path:outer_pendant_internal',
    'five_cubic_t:center_middle_spine_internal',
    'five_cubic_t:middle_pendant_internal',
    'five_cubic_t:long_outer_pendant_internal',
    'five_cubic_t:short_outer_branch',
    'five_cubic_t:middle_long_outer_spine_internal',
    'five_cubic_t:center_short_outer_spine_internal',
    'five_cubic_t:short_outer_pendant_internal',
    'five_cubic_t:middle_leaf',
    'five_cubic_t:long_outer_leaf',
    'five_cubic_t:short_outer_leaf'
)

$TheoremDates = @{
    'five_cubic_path:center_pendant_internal' = '20260825'
    'five_cubic_path:inner_pendant_internal' = '20260825'
    'five_cubic_path:inner_spine_internal' = '20260825'
    'five_cubic_path:outer_spine_internal' = '20260825'
    'five_cubic_path:outer_pendant_internal' = '20260825'
    'five_cubic_t:center_middle_spine_internal' = '20260824'
    'five_cubic_t:middle_pendant_internal' = '20260824'
    'five_cubic_t:long_outer_pendant_internal' = '20260824'
    'five_cubic_t:short_outer_branch' = '20260823'
    'five_cubic_t:middle_long_outer_spine_internal' = '20260824'
    'five_cubic_t:center_short_outer_spine_internal' = '20260824'
    'five_cubic_t:short_outer_pendant_internal' = '20260824'
    'five_cubic_t:middle_leaf' = '20260823'
    'five_cubic_t:long_outer_leaf' = '20260824'
    'five_cubic_t:short_outer_leaf' = '20260824'
}

function Stamp([string]$Message) {
    Add-Content -LiteralPath $Log -Value "$(Get-Date -Format o) $Message"
}

function Get-Sha256([string]$Path) {
    return (Get-FileHash -Algorithm SHA256 -LiteralPath $Path).Hash
}

function Theorem-Description([string]$OrbitDescription) {
    $parts = $OrbitDescription.Split(':')
    $family = $parts[0]
    $orbit = $parts[1]
    $date = $TheoremDates[$OrbitDescription]
    if ($null -eq $date) {
        throw "No pinned theorem date for orbit $OrbitDescription"
    }
    return [pscustomobject]@{
        Path = Join-Path $Root "rank8_delta03_e5_${family}_${orbit}_n27_plus_exact_agent_${date}.json"
        Status = "PASS_EXACT_AND_INDEPENDENT_RANK8_DELTA03_E5_$($family.ToUpperInvariant())_$($orbit.ToUpperInvariant())_N27_PLUS"
        Orbit = $OrbitDescription
    }
}

try {
    foreach ($entry in $ExpectedSources.GetEnumerator()) {
        $path = Join-Path $Root $entry.Key
        $actual = Get-Sha256 $path
        if ($actual -ne $entry.Value) {
            throw "Pinned source drift for $($entry.Key): $actual"
        }
    }
    Stamp "BEGIN WAIT_LOW_LOW_REFRESH_PID=$LowLowRefreshProcessId REQUIRED_NEW_E5_THEOREMS=$($RequiredNewE5Orbits.Count)"
    $lowLowProcess = Get-Process -Id $LowLowRefreshProcessId -ErrorAction SilentlyContinue
    if ($null -ne $lowLowProcess) {
        $lowLowProcess.WaitForExit()
    }

    if (-not (Test-Path -LiteralPath $Registry) -or -not (Test-Path -LiteralPath $RegistryAudit)) {
        throw 'Low/low refresh exited without registry and independent audit artifacts'
    }
    $registryPayload = Get-Content -Raw -LiteralPath $Registry | ConvertFrom-Json
    $registryAuditPayload = Get-Content -Raw -LiteralPath $RegistryAudit | ConvertFrom-Json
    if (($registryPayload.sealed_and_independently_audited -ne 124) -or
        ($registryPayload.producer_sealed_audit_missing -ne 0) -or
        ($registryPayload.missing_producer_and_audit -ne 0)) {
        throw 'Low/low refresh exited without exact registry completion 124/124'
    }
    if ($registryAuditPayload.status -ne 'PASS_INDEPENDENT_HASH_PINNED_REGISTRY_EXACT_124_CELL_DOMAIN_AND_EVIDENCE_REPLAY') {
        throw "Unexpected low/low registry audit status: $($registryAuditPayload.status)"
    }
    if ($registryAuditPayload.registry_sha256 -ne (Get-Sha256 $Registry)) {
        throw 'Low/low registry audit does not pin the current registry'
    }
    Stamp "PASS_LOW_LOW_124 REGISTRY_SHA256=$(Get-Sha256 $Registry) AUDIT_SHA256=$(Get-Sha256 $RegistryAudit)"

    $lastReady = -1
    while ($true) {
        $ready = 0
        foreach ($orbit in $RequiredNewE5Orbits) {
            $theorem = Theorem-Description $orbit
            if (-not (Test-Path -LiteralPath $theorem.Path)) {
                continue
            }
            $payload = Get-Content -Raw -LiteralPath $theorem.Path | ConvertFrom-Json
            if ($payload.status -ne $theorem.Status) {
                throw "Unexpected theorem status for $($theorem.Orbit): $($payload.status)"
            }
            if ($payload.root_orbit -ne $theorem.Orbit) {
                throw "Unexpected root orbit in theorem $($theorem.Path): $($payload.root_orbit)"
            }
            $ready++
        }
        if ($ready -ne $lastReady) {
            Stamp "WAIT_E5_THEOREMS READY=$ready/$($RequiredNewE5Orbits.Count)"
            $lastReady = $ready
        }
        if ($ready -eq $RequiredNewE5Orbits.Count) {
            break
        }
        Start-Sleep -Seconds 30
    }
    Stamp 'PASS_ALL_15_NEW_E5_THEOREMS_PRESENT'

    & 'pwsh.exe' -NoProfile -File $Refresh
    if ($LASTEXITCODE -ne 0) {
        throw "Final registry/master refresh exited with code $LASTEXITCODE"
    }
    if (-not (Test-Path -LiteralPath $Master) -or -not (Test-Path -LiteralPath $MasterAudit)) {
        throw 'Final refresh exited without master and independent-audit artifacts'
    }
    $masterPayload = Get-Content -Raw -LiteralPath $Master | ConvertFrom-Json
    $masterAuditPayload = Get-Content -Raw -LiteralPath $MasterAudit | ConvertFrom-Json
    $registryState = $masterPayload.low_low_exact_state.nested_mixed_cross_certificate_registry
    if (($registryState.sealed_and_independently_audited -ne 124) -or
        ($registryState.producer_sealed_audit_missing -ne 0) -or
        ($registryState.missing_producer_and_audit -ne 0)) {
        throw 'Final master did not ingest exact low/low registry completion 124/124'
    }
    $e5Row = @($masterPayload.connected_Q8_exact_state.open_no_overlap_partition_for_n28_plus |
        Where-Object { $_.case -eq 'degree_surplus_e5_Delta0_3' })
    if ($e5Row.Count -ne 1) {
        throw "Final master contains $($e5Row.Count) e5 partition rows"
    }
    if (($e5Row[0].all_order_sealed_and_audited_count -ne 42) -or
        ($e5Row[0].open_orbit_count -ne 0) -or
        (@($e5Row[0].incomplete_uncredited_orbits).Count -ne 0)) {
        throw 'Final master did not reach exact e5 closure 42/42 with zero open or incomplete orbits'
    }
    if ($masterAuditPayload.status -ne 'PASS_INDEPENDENT_FAIL_CLOSED_MASTER_LEDGER_REPLAY_WITH_E2_AND_ALL_ROOT_N27_SEALED_GLOBAL_THEOREMS_STILL_OPEN') {
        throw "Unexpected master audit status: $($masterAuditPayload.status)"
    }
    if (($masterAuditPayload.connected_partition_rederived.e5_all_order_audited_root_orbits -ne 42) -or
        ($masterAuditPayload.connected_partition_rederived.e5_all_order_open_root_orbits -ne 0) -or
        ($masterAuditPayload.low_low_rederived.registry_states.SEALED_AND_INDEPENDENTLY_AUDITED -ne 124)) {
        throw 'Independent master audit did not replay exact e5 42/42 and low/low 124/124 closure'
    }
    Stamp "PASS_FINAL_E5_LOW_LOW_MASTER MASTER_SHA256=$(Get-Sha256 $Master) AUDIT_SHA256=$(Get-Sha256 $MasterAudit)"
    exit 0
} catch {
    Stamp "FAIL TYPE=$($_.Exception.GetType().Name) MESSAGE=$($_.Exception.Message)"
    exit 1
}
