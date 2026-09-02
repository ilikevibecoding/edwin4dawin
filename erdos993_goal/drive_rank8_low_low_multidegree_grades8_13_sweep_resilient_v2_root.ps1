param(
    [Parameter(Mandatory = $true)]
    [int]$OriginalSweepProcessId,

    [int]$MaxNoProgressFailures = 3
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$SweepName = 'drive_rank8_low_low_multidegree_grades8_13_sweep_root.ps1'
$Sweep = Join-Path $Root $SweepName
$Block = Join-Path $Root 'rank8_low_low_a23_mixed_cross_multidegree_grades8_13_block_assembler_agent_20260825.json'
$Log = Join-Path $Root 'rank8_low_low_multidegree_grades8_13_sweep_resilient_v2_root_20260825.txt'
$ExpectedBlockStatus = 'PASS_HASH_PINNED_ALL_48_LOW_LOW_REGISTRY_CELLS_GRADES8_13'
$ExpectedGradeStatus = 'PASS_HASH_PINNED_BOTH_FACES_FAMILY_GRADE_ALL_ROWS_INDEPENDENTLY_AUDITED'
$Pins = @{
    'drive_rank8_low_low_multidegree_grades8_13_sweep_root.ps1' = 'D417875BE5236025023BB294AD079BC37F90BEDC28D4F23E59E19E2232A3F4BA'
    'probe_rank8_low_low_a23_mixed_cross_multidegree_family_stream_agent.py' = 'DEE5BEAB8D84051998C377E98174D319FC6F6FD39EF4923FD47978621F169342'
    'audit_rank8_low_low_a23_mixed_cross_multidegree_family_independent_agent.py' = 'A0FA1D4C66A17B7D1030E8B0908EF0C5A700C2D1DFD4E5A35EC6FDF31B7D5F9F'
    'assemble_rank8_low_low_a23_mixed_cross_multidegree_family_grade_agent.py' = 'F1DA08B8A20B594D851C87C1637A0F261BCAD8491FC130BEF99DC836D119BCB8'
    'assemble_rank8_low_low_a23_mixed_cross_multidegree_grades8_13_block_agent.py' = 'D1AC068FD8197908B059703A13D75DEEA7712D557B6C04EF50782061E73195EB'
}
$Jobs = @(
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

function Stamp([string]$Message) {
    Add-Content -LiteralPath $Log -Value "$(Get-Date -Format o) $Message"
}

function Get-Sha256([string]$Path) {
    return (Get-FileHash -Algorithm SHA256 -LiteralPath $Path).Hash
}

function Get-SealedGradeCount() {
    $count = 0
    foreach ($job in $Jobs) {
        $family = [string]$job[0]
        $degree = [int]$job[1]
        $path = Join-Path $Root "rank8_low_low_a23_mixed_cross_multidegree_${family}_grade${degree}_assembler_agent_20260825.json"
        if (-not (Test-Path -LiteralPath $path)) {
            continue
        }
        try {
            $payload = Get-Content -Raw -LiteralPath $path | ConvertFrom-Json
            if (($payload.status -eq $ExpectedGradeStatus) -and
                ($payload.family -eq $family) -and
                ([int]$payload.total_ordinary_slack_degree -eq $degree) -and
                ([int]$payload.expected_cells -eq 4) -and
                ($payload.checks.all_negative_counts_zero -eq $true) -and
                ($payload.checks.no_cross_face_family_or_grade_credit -eq $true)) {
                $count++
            }
        } catch {
            Stamp "INVALID_GRADE_JSON FAMILY=$family DEGREE=$degree ERROR=$($_.Exception.Message)"
        }
    }
    return $count
}

function Get-BlockPass() {
    if (-not (Test-Path -LiteralPath $Block)) {
        return $null
    }
    try {
        $payload = Get-Content -Raw -LiteralPath $Block | ConvertFrom-Json
        if (($payload.status -eq $ExpectedBlockStatus) -and
            ([int]$payload.expected_grade_certificates -eq 12) -and
            ([int]$payload.expected_cells -eq 48) -and
            ($payload.grade_certificates.Count -eq 12) -and
            ($payload.assembled_cells.Count -eq 48) -and
            ($payload.source_sha256 -eq $Pins['assemble_rank8_low_low_a23_mixed_cross_multidegree_grades8_13_block_agent.py']) -and
            ($payload.checks.all_family_grade_pairs_present_exactly_once -eq $true) -and
            ($payload.checks.all_four_face_row_cells_per_family_grade_present_exactly_once -eq $true) -and
            ($payload.checks.all_producers_and_independent_replays_rehashed -eq $true) -and
            ($payload.checks.all_negative_counts_zero -eq $true) -and
            ($payload.checks.no_partial_cross_grade_credit -eq $true)) {
            return $payload
        }
    } catch {
        Stamp "INVALID_BLOCK_JSON ERROR=$($_.Exception.Message)"
    }
    return $null
}

try {
    if ($MaxNoProgressFailures -ne 3) {
        throw 'MaxNoProgressFailures must remain exactly 3 for this fail-closed controller'
    }
    foreach ($entry in $Pins.GetEnumerator()) {
        $path = Join-Path $Root $entry.Key
        $actual = Get-Sha256 $path
        if ($actual -ne $entry.Value) {
            throw "Pinned source drift for $($entry.Key): $actual"
        }
    }
    Stamp "BEGIN ORIGINAL_SWEEP_PID=$OriginalSweepProcessId"
    $original = Get-Process -Id $OriginalSweepProcessId -ErrorAction SilentlyContinue
    if ($null -ne $original) {
        Stamp "WAIT_ORIGINAL_SWEEP PID=$OriginalSweepProcessId"
        $original.WaitForExit()
    }

    $blockPayload = Get-BlockPass
    if ($null -ne $blockPayload) {
        Stamp "PASS_ALREADY_COMPLETE SEALED_GRADES=12 CELLS=48 BLOCK_SHA256=$(Get-Sha256 $Block)"
        exit 0
    }

    $attempt = 0
    $noProgressFailures = 0
    while ($true) {
        $before = Get-SealedGradeCount
        $attempt++
        Stamp "ATTEMPT=$attempt START_SEALED_GRADES=$before"
        $lines = & 'pwsh.exe' -NoProfile -File $Sweep 2>&1
        $exitCode = $LASTEXITCODE
        foreach ($line in $lines) { Stamp "SWEEP $line" }
        $after = Get-SealedGradeCount
        $blockPayload = Get-BlockPass
        Stamp "ATTEMPT=$attempt EXIT=$exitCode END_SEALED_GRADES=$after PROGRESS=$($after-$before) BLOCK_PASS=$($null -ne $blockPayload)"

        if ($exitCode -eq 0) {
            if ($null -eq $blockPayload) {
                throw 'Sweep exited successfully without a valid 48-cell block'
            }
            break
        }
        if ($after -lt $before) {
            throw "Sealed grade count regressed: $before -> $after"
        }
        if ($after -eq $before) {
            $noProgressFailures++
        } else {
            $noProgressFailures = 0
        }
        Stamp "RECOVERABLE_FRESH_PROCESS_RETRY NO_PROGRESS_FAILURES=$noProgressFailures"
        if ($noProgressFailures -ge 3) {
            throw "Sweep failed without a new sealed grade 3 consecutive times at SEALED_GRADES=$after"
        }
    }

    if ((Get-SealedGradeCount) -ne 12) {
        throw 'Valid block exists but the independent sealed-grade count is not 12'
    }
    Stamp "PASS_COMPLETE_ALL_48_CELLS SEALED_GRADES=12 BLOCK_SHA256=$(Get-Sha256 $Block)"
    exit 0
} catch {
    Stamp "FAIL TYPE=$($_.Exception.GetType().Name) MESSAGE=$($_.Exception.Message)"
    exit 1
}
