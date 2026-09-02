param(
    [Parameter(Mandatory = $true)]
    [int]$RawLaneProcessId
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Python = (Get-Command python).Source
$RawLog = Join-Path $Root "e5_five_cubic_t_leaf_raw_lane_root_20260825.txt"
$Log = Join-Path $Root "e5_five_cubic_t_leaf_dynamic_seal_chain_root_20260825.txt"
$DynamicSeal = Join-Path $Root "run_rank8_delta03_e5_five_cubic_t_leaf_dynamic_seal_agent.py"
$ExpectedDynamicSealHash = "A9E51C632CBBD12F0867C694B16A9D7C63523EEDEBD085BEDA700D708B03C8D2"

function Write-ChainLog([string]$Message) {
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

function Require-JsonStatus([string]$Name, [string]$ExpectedStatus) {
    $path = Join-Path $Root $Name
    if (-not (Test-Path -LiteralPath $path)) {
        throw "Missing report: $Name"
    }
    $report = Get-Content -Raw -LiteralPath $path | ConvertFrom-Json
    if ($report.status -ne $ExpectedStatus) {
        throw "Unexpected status in ${Name}: $($report.status)"
    }
}

function Invoke-PythonChecked([string[]]$Arguments) {
    Write-ChainLog "RUN python $($Arguments -join ' ')"
    $lines = & $Python @Arguments 2>&1
    foreach ($line in $lines) {
        Write-ChainLog "PYTHON $line"
    }
    if ($LASTEXITCODE -ne 0) {
        throw "Python failed with exit code ${LASTEXITCODE}: $($Arguments -join ' ')"
    }
}

function Get-ObservedRuntime([string]$Stage) {
    $line = Get-Content -LiteralPath $RawLog | Where-Object {
        $_ -match " PASS_${Stage} RUNTIME_SECONDS="
    } | Select-Object -Last 1
    if ($null -eq $line) {
        throw "Missing runtime record for $Stage"
    }
    $text = ($line -split "RUNTIME_SECONDS=", 2)[1]
    $value = [double]::Parse(
        $text,
        [System.Globalization.CultureInfo]::InvariantCulture
    )
    if ($value -le 0) {
        throw "Invalid runtime for ${Stage}: $value"
    }
    return $value
}

function Run-OrbitSeal(
    [string]$Stem,
    [string]$Token,
    [string]$PrimaryRawDate,
    [string]$AuditRawDate,
    [string]$ReportDate
) {
    $primaryRaw = "rank8_delta03_e5_five_cubic_t_${Stem}_i256_raw_agent_${PrimaryRawDate}.txt"
    $auditRaw = "rank8_delta03_e5_five_cubic_t_${Stem}_literal_i256_raw_agent_${AuditRawDate}.txt"
    Require-PassLine $primaryRaw "PASS_I256_E5_FIVE_CUBIC_T_${Token}"
    Require-PassLine $auditRaw "PASS_INDEPENDENT_LITERAL_I256_E5_FIVE_CUBIC_T_${Token}"
    $primaryRuntime = Get-ObservedRuntime "${Token}_PRIMARY"
    $auditRuntime = Get-ObservedRuntime "${Token}_AUDIT"
    $primaryRawHash = Get-Sha256 $primaryRaw
    $auditRawHash = Get-Sha256 $auditRaw

    Invoke-PythonChecked @(
        $DynamicSeal,
        $Stem,
        "primary",
        "--expected-raw-sha256", $primaryRawHash,
        "--observed-runtime-seconds", $primaryRuntime.ToString(
            [System.Globalization.CultureInfo]::InvariantCulture
        )
    )
    $primaryReport = "rank8_delta03_e5_five_cubic_t_${Stem}_all_order_exact_agent_${ReportDate}.json"
    Require-JsonStatus $primaryReport "PASS_EXACT_RANK8_DELTA03_E5_FIVE_CUBIC_T_${Token}_N28_PLUS"
    $primarySealer = "seal_rank8_delta03_e5_five_cubic_t_${Stem}_exact_agent.py"
    $primarySealerHash = Get-Sha256 $primarySealer
    $primaryReportHash = Get-Sha256 $primaryReport

    Invoke-PythonChecked @(
        $DynamicSeal,
        $Stem,
        "audit",
        "--expected-raw-sha256", $auditRawHash,
        "--observed-runtime-seconds", $auditRuntime.ToString(
            [System.Globalization.CultureInfo]::InvariantCulture
        ),
        "--expected-primary-sealer-sha256", $primarySealerHash,
        "--expected-primary-report-sha256", $primaryReportHash
    )
    $auditReport = "rank8_delta03_e5_five_cubic_t_${Stem}_all_order_independent_audit_agent_${ReportDate}.json"
    Require-JsonStatus $auditReport "PASS_INDEPENDENT_RANK8_DELTA03_E5_FIVE_CUBIC_T_${Token}_N28_PLUS_AUDIT"
    $auditSealer = "seal_rank8_delta03_e5_five_cubic_t_${Stem}_independent_audit_agent.py"
    $auditSealerHash = Get-Sha256 $auditSealer
    $auditReportHash = Get-Sha256 $auditReport

    Invoke-PythonChecked @(
        $DynamicSeal,
        $Stem,
        "theorem",
        "--expected-primary-sealer-sha256", $primarySealerHash,
        "--expected-primary-report-sha256", $primaryReportHash,
        "--expected-audit-sealer-sha256", $auditSealerHash,
        "--expected-audit-report-sha256", $auditReportHash
    )
    $theorem = "rank8_delta03_e5_five_cubic_t_${Stem}_n27_plus_exact_agent_${ReportDate}.json"
    Require-JsonStatus $theorem "PASS_EXACT_AND_INDEPENDENT_RANK8_DELTA03_E5_FIVE_CUBIC_T_${Token}_N27_PLUS"
    Write-ChainLog "PASS_${Token}_READY_FOR_MASTER_INTEGRATION"
}

try {
    Write-ChainLog "WAIT_RAW_LANE PID=$RawLaneProcessId"
    $rawProcess = Get-Process -Id $RawLaneProcessId -ErrorAction SilentlyContinue
    if ($null -ne $rawProcess) {
        $rawProcess.WaitForExit()
    }
    if (-not (Test-Path -LiteralPath $RawLog)) {
        throw "Missing raw-lane log"
    }
    $rawTail = Get-Content -LiteralPath $RawLog -Tail 1
    if ($rawTail -notmatch " PASS_T_LEAF_RAW_LANE_COMPLETE$") {
        throw "Raw lane did not reach its exact completion gate: $rawTail"
    }
    if ((Get-Sha256 (Split-Path -Leaf $DynamicSeal)) -ne $ExpectedDynamicSealHash) {
        throw "Dynamic sealer source hash drift"
    }
    Write-ChainLog "PASS_RAW_LANE_AND_DYNAMIC_SEAL_HASH"

    Run-OrbitSeal "middle_leaf" "MIDDLE_LEAF" "20260823" "20260823" "20260823"
    Run-OrbitSeal "long_outer_leaf" "LONG_OUTER_LEAF" "20260823" "20260824" "20260824"
    Run-OrbitSeal "short_outer_leaf" "SHORT_OUTER_LEAF" "20260824" "20260824" "20260824"
    Write-ChainLog "PASS_T_LEAF_CHAIN_READY_FOR_MASTER_INTEGRATION"
    exit 0
}
catch {
    Write-ChainLog "FAIL $($_.Exception.Message)"
    exit 1
}
