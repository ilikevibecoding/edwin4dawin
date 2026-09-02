param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('A', 'B')]
    [string]$Lane,

    [Parameter(Mandatory = $true)]
    [int]$LaneProcessId
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Python = (Get-Command python).Source
$LaneLog = Join-Path $Root "e5_lane_$($Lane.ToLower())_handoff_stdout_agent_20260825.txt"
$Log = Join-Path $Root "e5_five_cubic_t_lane_$($Lane.ToLower())_dynamic_seal_v2_root_20260825.txt"
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

function Get-StageRuntimeSeconds([string]$Stage, [string]$Stem) {
    if (-not (Test-Path -LiteralPath $LaneLog)) {
        throw "Missing lane log: $LaneLog"
    }
    $lines = Get-Content -LiteralPath $LaneLog
    $start = $lines | Where-Object {
        $_ -match "^START $Stage $Stem .* AT="
    } | Select-Object -Last 1
    $pass = $lines | Where-Object {
        $_ -match "^PASS $Stage $Stem AT="
    } | Select-Object -Last 1
    if (($null -eq $start) -or ($null -eq $pass)) {
        throw "Missing runtime markers for $Stage $Stem"
    }
    $startTime = [DateTimeOffset]::Parse(
        ($start -split ' AT=', 2)[1],
        [Globalization.CultureInfo]::InvariantCulture,
        [Globalization.DateTimeStyles]::RoundtripKind
    )
    $passTime = [DateTimeOffset]::Parse(
        ($pass -split ' AT=', 2)[1],
        [Globalization.CultureInfo]::InvariantCulture,
        [Globalization.DateTimeStyles]::RoundtripKind
    )
    $seconds = ($passTime - $startTime).TotalSeconds
    if ($seconds -le 0) {
        throw "Invalid runtime for $Stage ${Stem}: $seconds"
    }
    return $seconds
}

function Run-OrbitSeal([hashtable]$Config) {
    $stem = $Config.Stem
    $token = $Config.Token
    $rawDate = $Config.RawDate
    $reportDate = $Config.ReportDate
    $primaryRaw = "rank8_delta03_e5_five_cubic_t_${stem}_i256_raw_agent_${rawDate}.txt"
    $auditRaw = "rank8_delta03_e5_five_cubic_t_${stem}_literal_i256_raw_agent_${rawDate}.txt"
    Require-PassLine $primaryRaw "PASS_I256_E5_FIVE_CUBIC_T_${token}"
    Require-PassLine $auditRaw "PASS_INDEPENDENT_LITERAL_I256_E5_FIVE_CUBIC_T_${token}"

    $primarySealer = "seal_rank8_delta03_e5_five_cubic_t_${stem}_exact_agent.py"
    $primaryReport = "rank8_delta03_e5_five_cubic_t_${stem}_all_order_exact_agent_${reportDate}.json"
    if (-not $Config.PrimaryPresealed) {
        $primaryRuntime = Get-StageRuntimeSeconds 'PRIMARY' $stem
        Invoke-PythonChecked @(
            $DynamicSeal,
            $stem,
            'primary',
            '--expected-raw-sha256', (Get-Sha256 $primaryRaw),
            '--observed-runtime-seconds', $primaryRuntime.ToString([Globalization.CultureInfo]::InvariantCulture)
        )
    }
    Require-JsonStatus $primaryReport "PASS_EXACT_RANK8_DELTA03_E5_FIVE_CUBIC_T_${token}_N28_PLUS"
    $primarySealerHash = Get-Sha256 $primarySealer
    $primaryReportHash = Get-Sha256 $primaryReport

    $auditRuntime = Get-StageRuntimeSeconds 'AUDIT' $stem
    Invoke-PythonChecked @(
        $DynamicSeal,
        $stem,
        'audit',
        '--expected-raw-sha256', (Get-Sha256 $auditRaw),
        '--observed-runtime-seconds', $auditRuntime.ToString([Globalization.CultureInfo]::InvariantCulture),
        '--expected-primary-sealer-sha256', $primarySealerHash,
        '--expected-primary-report-sha256', $primaryReportHash
    )
    $auditSealer = "seal_rank8_delta03_e5_five_cubic_t_${stem}_independent_audit_agent.py"
    $auditReport = "rank8_delta03_e5_five_cubic_t_${stem}_all_order_independent_audit_agent_${reportDate}.json"
    Require-JsonStatus $auditReport "PASS_INDEPENDENT_RANK8_DELTA03_E5_FIVE_CUBIC_T_${token}_N28_PLUS_AUDIT"
    $auditSealerHash = Get-Sha256 $auditSealer
    $auditReportHash = Get-Sha256 $auditReport

    Invoke-PythonChecked @(
        $DynamicSeal,
        $stem,
        'theorem',
        '--expected-primary-sealer-sha256', $primarySealerHash,
        '--expected-primary-report-sha256', $primaryReportHash,
        '--expected-audit-sealer-sha256', $auditSealerHash,
        '--expected-audit-report-sha256', $auditReportHash
    )
    $theorem = "rank8_delta03_e5_five_cubic_t_${stem}_n27_plus_exact_agent_${reportDate}.json"
    Require-JsonStatus $theorem "PASS_EXACT_AND_INDEPENDENT_RANK8_DELTA03_E5_FIVE_CUBIC_T_${token}_N27_PLUS"
    Stamp "PASS_ORBIT STEM=$stem PRIMARY_SHA256=$primaryReportHash AUDIT_SHA256=$auditReportHash THEOREM_SHA256=$((Get-Sha256 $theorem))"
}

$LaneA = @(
    @{Stem='center_middle_spine_internal';Token='CENTER_MIDDLE_SPINE_INTERNAL';RawDate='20260824';ReportDate='20260824';PrimaryPresealed=$false},
    @{Stem='middle_pendant_internal';Token='MIDDLE_PENDANT_INTERNAL';RawDate='20260824';ReportDate='20260824';PrimaryPresealed=$false},
    @{Stem='long_outer_pendant_internal';Token='LONG_OUTER_PENDANT_INTERNAL';RawDate='20260824';ReportDate='20260824';PrimaryPresealed=$false}
)
$LaneB = @(
    @{Stem='short_outer_branch';Token='SHORT_OUTER_BRANCH';RawDate='20260823';ReportDate='20260823';PrimaryPresealed=$true},
    @{Stem='middle_long_outer_spine_internal';Token='MIDDLE_LONG_OUTER_SPINE_INTERNAL';RawDate='20260824';ReportDate='20260824';PrimaryPresealed=$false},
    @{Stem='center_short_outer_spine_internal';Token='CENTER_SHORT_OUTER_SPINE_INTERNAL';RawDate='20260824';ReportDate='20260824';PrimaryPresealed=$false},
    @{Stem='short_outer_pendant_internal';Token='SHORT_OUTER_PENDANT_INTERNAL';RawDate='20260824';ReportDate='20260824';PrimaryPresealed=$false}
)

try {
    Stamp "BEGIN LANE=$Lane WAIT_PID=$LaneProcessId"
    if (Get-Process -Id $LaneProcessId -ErrorAction SilentlyContinue) {
        Wait-Process -Id $LaneProcessId
    }
    if ((Get-Sha256 (Split-Path -Leaf $DynamicSeal)) -ne $ExpectedDynamicSealHash) {
        throw 'Dynamic sealer v2 source hash drift'
    }
    $tail = Get-Content -LiteralPath $LaneLog -Tail 1
    if ($tail -notmatch "^LANE $Lane COMPLETE AT=") {
        throw "Raw lane did not reach completion gate: $tail"
    }
    $configs = if ($Lane -eq 'A') { $LaneA } else { $LaneB }
    foreach ($config in $configs) {
        Run-OrbitSeal $config
    }
    Stamp "PASS_LANE_${Lane}_READY_FOR_MASTER_INTEGRATION ORBITS=$($configs.Count)"
    exit 0
} catch {
    Stamp "FAIL TYPE=$($_.Exception.GetType().Name) MESSAGE=$($_.Exception.Message)"
    exit 1
}
