param(
    [Parameter(Mandatory = $true)]
    [int]$AuditProcessId
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Python = (Get-Command python).Source
$LaneLog = Join-Path $Root 'e5_lane_b_handoff_stdout_agent_20260825.txt'
$Log = Join-Path $Root 'e5_five_cubic_t_short_outer_branch_dynamic_seal_v2_root_20260825.txt'
$DynamicSeal = Join-Path $Root 'run_rank8_delta03_e5_five_cubic_t_dynamic_seal_v2_agent.py'
$ExpectedDynamicSealHash = '1DC61F6ED9CBC36D26472531F359992A459087A13A2DFEA4C13E6185D2826B64'

function Stamp([string]$Message) {
    Add-Content -LiteralPath $Log -Value "$(Get-Date -Format o) $Message"
}

function Get-Sha256([string]$Name) {
    return (Get-FileHash -Algorithm SHA256 -LiteralPath (Join-Path $Root $Name)).Hash
}

function Require-PassLine([string]$Name, [string]$Expected) {
    $path = Join-Path $Root $Name
    if (-not (Test-Path -LiteralPath $path)) {
        throw "Missing raw output: $Name"
    }
    $first = Get-Content -LiteralPath $path -TotalCount 1
    if ($first -ne $Expected) {
        throw "Raw-output gate failed for ${Name}: $first"
    }
}

function Require-JsonStatus([string]$Name, [string]$Expected) {
    $path = Join-Path $Root $Name
    if (-not (Test-Path -LiteralPath $path)) {
        throw "Missing report: $Name"
    }
    $payload = Get-Content -Raw -LiteralPath $path | ConvertFrom-Json
    if ($payload.status -ne $Expected) {
        throw "Unexpected status in ${Name}: $($payload.status)"
    }
}

function Invoke-PythonChecked([string[]]$Arguments) {
    Stamp "RUN python $($Arguments -join ' ')"
    $lines = & $Python @Arguments 2>&1
    foreach ($line in $lines) {
        Stamp "PYTHON $line"
    }
    if ($LASTEXITCODE -ne 0) {
        throw "Python failed with exit code ${LASTEXITCODE}: $($Arguments -join ' ')"
    }
}

function Get-AuditRuntimeSeconds() {
    for ($attempt = 0; $attempt -lt 60; $attempt++) {
        if (Test-Path -LiteralPath $LaneLog) {
            $lines = Get-Content -LiteralPath $LaneLog
            $start = $lines | Where-Object {
                $_ -match '^START AUDIT short_outer_branch .* AT='
            } | Select-Object -Last 1
            $pass = $lines | Where-Object {
                $_ -match '^PASS AUDIT short_outer_branch AT='
            } | Select-Object -Last 1
            if (($null -ne $start) -and ($null -ne $pass)) {
                $startText = ($start -split ' AT=', 2)[1]
                $passText = ($pass -split ' AT=', 2)[1]
                $startTime = [DateTimeOffset]::Parse(
                    $startText,
                    [Globalization.CultureInfo]::InvariantCulture,
                    [Globalization.DateTimeStyles]::RoundtripKind
                )
                $passTime = [DateTimeOffset]::Parse(
                    $passText,
                    [Globalization.CultureInfo]::InvariantCulture,
                    [Globalization.DateTimeStyles]::RoundtripKind
                )
                $seconds = ($passTime - $startTime).TotalSeconds
                if ($seconds -le 0) {
                    throw "Invalid audit runtime from lane log: $seconds"
                }
                return $seconds
            }
        }
        Start-Sleep -Seconds 1
    }
    throw 'Timed out waiting for exact short-outer-branch audit runtime markers'
}

try {
    Stamp "BEGIN WAIT_AUDIT_PID=$AuditProcessId"
    if (Get-Process -Id $AuditProcessId -ErrorAction SilentlyContinue) {
        Wait-Process -Id $AuditProcessId
    }
    $runtime = Get-AuditRuntimeSeconds
    $raw = 'rank8_delta03_e5_five_cubic_t_short_outer_branch_literal_i256_raw_agent_20260823.txt'
    Require-PassLine $raw 'PASS_INDEPENDENT_LITERAL_I256_E5_FIVE_CUBIC_T_SHORT_OUTER_BRANCH'

    $primarySealer = 'seal_rank8_delta03_e5_five_cubic_t_short_outer_branch_exact_agent.py'
    $primaryReport = 'rank8_delta03_e5_five_cubic_t_short_outer_branch_all_order_exact_agent_20260823.json'
    Require-JsonStatus $primaryReport 'PASS_EXACT_RANK8_DELTA03_E5_FIVE_CUBIC_T_SHORT_OUTER_BRANCH_N28_PLUS'
    $primarySealerHash = Get-Sha256 $primarySealer
    $primaryReportHash = Get-Sha256 $primaryReport
    $rawHash = Get-Sha256 $raw
    if ((Get-Sha256 (Split-Path -Leaf $DynamicSeal)) -ne $ExpectedDynamicSealHash) {
        throw 'Dynamic sealer v2 source hash drift'
    }

    Invoke-PythonChecked @(
        $DynamicSeal,
        'short_outer_branch',
        'audit',
        '--expected-raw-sha256', $rawHash,
        '--observed-runtime-seconds', $runtime.ToString([Globalization.CultureInfo]::InvariantCulture),
        '--expected-primary-sealer-sha256', $primarySealerHash,
        '--expected-primary-report-sha256', $primaryReportHash
    )
    $auditSealer = 'seal_rank8_delta03_e5_five_cubic_t_short_outer_branch_independent_audit_agent.py'
    $auditReport = 'rank8_delta03_e5_five_cubic_t_short_outer_branch_all_order_independent_audit_agent_20260823.json'
    Require-JsonStatus $auditReport 'PASS_INDEPENDENT_RANK8_DELTA03_E5_FIVE_CUBIC_T_SHORT_OUTER_BRANCH_N28_PLUS_AUDIT'
    $auditSealerHash = Get-Sha256 $auditSealer
    $auditReportHash = Get-Sha256 $auditReport

    Invoke-PythonChecked @(
        $DynamicSeal,
        'short_outer_branch',
        'theorem',
        '--expected-primary-sealer-sha256', $primarySealerHash,
        '--expected-primary-report-sha256', $primaryReportHash,
        '--expected-audit-sealer-sha256', $auditSealerHash,
        '--expected-audit-report-sha256', $auditReportHash
    )
    $theorem = 'rank8_delta03_e5_five_cubic_t_short_outer_branch_n27_plus_exact_agent_20260823.json'
    Require-JsonStatus $theorem 'PASS_EXACT_AND_INDEPENDENT_RANK8_DELTA03_E5_FIVE_CUBIC_T_SHORT_OUTER_BRANCH_N27_PLUS'
    Stamp "PASS_READY_FOR_MASTER_INTEGRATION RUNTIME_SECONDS=$runtime RAW_SHA256=$rawHash AUDIT_SHA256=$auditReportHash THEOREM_SHA256=$((Get-Sha256 $theorem))"
    exit 0
} catch {
    Stamp "FAIL TYPE=$($_.Exception.GetType().Name) MESSAGE=$($_.Exception.Message)"
    exit 1
}
