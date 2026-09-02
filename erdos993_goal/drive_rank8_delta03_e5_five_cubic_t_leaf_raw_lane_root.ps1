param(
    [Parameter(Mandatory = $true)]
    [int]$WaitForLaneProcessId,

    [int64]$ProcessorAffinity = 63
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Python = (Get-Command python).Source
$Log = Join-Path $Root "e5_five_cubic_t_leaf_raw_lane_root_20260825.txt"

function Write-LaneLog([string]$Message) {
    Add-Content -LiteralPath $Log -Value "$(Get-Date -Format o) $Message"
}

function Invoke-PythonChecked([string[]]$Arguments) {
    Write-LaneLog "RUN python $($Arguments -join ' ')"
    $lines = & $Python @Arguments 2>&1
    foreach ($line in $lines) {
        Write-LaneLog "PYTHON $line"
    }
    if ($LASTEXITCODE -ne 0) {
        throw "Python failed with exit code ${LASTEXITCODE}: $($Arguments -join ' ')"
    }
}

function Require-PassLine([string]$Path, [string]$Expected) {
    if (-not (Test-Path -LiteralPath $Path)) {
        throw "Missing raw output: $Path"
    }
    $first = Get-Content -LiteralPath $Path -TotalCount 1
    if ($first -ne $Expected) {
        throw "Raw-output gate failed: expected '$Expected', got '$first'"
    }
}

function Run-RawStage(
    [string]$ExecutableName,
    [string]$OutputName,
    [string]$ErrorName,
    [string]$ExpectedPass,
    [string]$Stage
) {
    $output = Join-Path $Root $OutputName
    if (Test-Path -LiteralPath $output) {
        Require-PassLine $output $ExpectedPass
        Write-LaneLog "REUSE_${Stage} PASS_EXISTING_RAW"
        return
    }
    $errorOutput = Join-Path $Root $ErrorName
    $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
    $process = Start-Process `
        -FilePath (Join-Path $Root $ExecutableName) `
        -WorkingDirectory $Root `
        -RedirectStandardOutput $output `
        -RedirectStandardError $errorOutput `
        -WindowStyle Hidden `
        -PassThru
    $process.ProcessorAffinity = [IntPtr]$ProcessorAffinity
    $process.PriorityClass = "AboveNormal"
    Write-LaneLog "START_${Stage} PID=$($process.Id) AFFINITY=$ProcessorAffinity"
    $process.WaitForExit()
    $stopwatch.Stop()
    if ($process.ExitCode -ne 0) {
        throw "$Stage failed with exit code $($process.ExitCode)"
    }
    Require-PassLine $output $ExpectedPass
    Write-LaneLog "PASS_${Stage} RUNTIME_SECONDS=$($stopwatch.Elapsed.TotalSeconds)"
}

function Run-Orbit(
    [string]$Stem,
    [string]$Token,
    [string]$PrimaryDate,
    [string]$AuditDate
) {
    Invoke-PythonChecked @(
        (Join-Path $Root ("certify_rank8_delta03_e5_five_cubic_t_" + $Stem + "_preflight_agent.py"))
    )
    Run-RawStage `
        ("produce_rank8_delta03_e5_five_cubic_t_" + $Stem + "_i256_agent.exe") `
        ("rank8_delta03_e5_five_cubic_t_" + $Stem + "_i256_raw_agent_" + $PrimaryDate + ".txt") `
        ("rank8_delta03_e5_five_cubic_t_" + $Stem + "_primary_stderr_agent_20260825.txt") `
        ("PASS_I256_E5_FIVE_CUBIC_T_" + $Token) `
        ($Token + "_PRIMARY")
    Run-RawStage `
        ("audit_rank8_delta03_e5_five_cubic_t_" + $Stem + "_literal_i256_agent.exe") `
        ("rank8_delta03_e5_five_cubic_t_" + $Stem + "_literal_i256_raw_agent_" + $AuditDate + ".txt") `
        ("rank8_delta03_e5_five_cubic_t_" + $Stem + "_audit_stderr_agent_20260825.txt") `
        ("PASS_INDEPENDENT_LITERAL_I256_E5_FIVE_CUBIC_T_" + $Token) `
        ($Token + "_AUDIT")
}

try {
    Write-LaneLog "WAIT_EXISTING_LANE PID=$WaitForLaneProcessId"
    $existing = Get-Process -Id $WaitForLaneProcessId -ErrorAction SilentlyContinue
    if ($null -ne $existing) {
        $existing.WaitForExit()
    }
    Write-LaneLog "PASS_EXISTING_LANE_RELEASED_CPU"

    Run-Orbit "middle_leaf" "MIDDLE_LEAF" "20260823" "20260823"
    Run-Orbit "long_outer_leaf" "LONG_OUTER_LEAF" "20260823" "20260824"
    Run-Orbit "short_outer_leaf" "SHORT_OUTER_LEAF" "20260824" "20260824"
    Write-LaneLog "PASS_T_LEAF_RAW_LANE_COMPLETE"
    exit 0
}
catch {
    Write-LaneLog "FAIL $($_.Exception.Message)"
    exit 1
}
