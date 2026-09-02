param(
    [Parameter(Mandatory = $true)]
    [int]$RayProcessId
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Python = (Get-Command python).Source
$Log = Join-Path $Root "e5_five_cubic_path_outer_leaf_cuda_chain_root_20260825.txt"

function Write-ChainLog([string]$Message) {
    $line = "$(Get-Date -Format o) $Message"
    Add-Content -LiteralPath $Log -Value $line
}

function Get-Sha256([string]$Name) {
    return (Get-FileHash -Algorithm SHA256 -LiteralPath (Join-Path $Root $Name)).Hash
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

try {
    Write-ChainLog "WAIT_RAY PID=$RayProcessId"
    $rayProcess = Get-Process -Id $RayProcessId -ErrorAction SilentlyContinue
    if ($null -ne $rayProcess) {
        $rayProcess.WaitForExit()
    }
    Require-JsonStatus `
        "rank8_delta03_e5_five_cubic_path_outer_leaf_cuda_rays_exact_agent_20260825.json" `
        "PASS_EXACT_CUDA_I256_CRT_E5_FIVE_CUBIC_PATH_OUTER_LEAF_RAYS"
    Write-ChainLog "PASS_RAY"

    $finiteOut = Join-Path $Root "e5_five_cubic_path_outer_leaf_cuda_finite_stdout_agent_20260825.txt"
    $finiteErr = Join-Path $Root "e5_five_cubic_path_outer_leaf_cuda_finite_stderr_agent_20260825.txt"
    $finiteScript = Join-Path $Root "scan_rank8_delta03_e5_five_cubic_path_outer_leaf_cuda_finite_agent.py"
    $finiteProcess = Start-Process `
        -FilePath $Python `
        -ArgumentList @($finiteScript) `
        -WorkingDirectory $Root `
        -RedirectStandardOutput $finiteOut `
        -RedirectStandardError $finiteErr `
        -WindowStyle Hidden `
        -PassThru
    Write-ChainLog "START_FINITE PID=$($finiteProcess.Id)"
    $finiteProcess.WaitForExit()
    if ($finiteProcess.ExitCode -ne 0) {
        throw "Finite scan failed with exit code $($finiteProcess.ExitCode)"
    }
    Require-JsonStatus `
        "rank8_delta03_e5_five_cubic_path_outer_leaf_cuda_finite_exact_agent_20260825.json" `
        "PASS_EXACT_CUDA_I256_CRT_E5_FIVE_CUBIC_PATH_OUTER_LEAF_FINITE"
    Write-ChainLog "PASS_FINITE"

    $rayCheckpointHash = Get-Sha256 "rank8_delta03_e5_five_cubic_path_outer_leaf_cuda_rays_checkpoint_agent_20260825.json"
    $rayReportHash = Get-Sha256 "rank8_delta03_e5_five_cubic_path_outer_leaf_cuda_rays_exact_agent_20260825.json"
    $finiteCheckpointHash = Get-Sha256 "rank8_delta03_e5_five_cubic_path_outer_leaf_cuda_finite_checkpoint_agent_20260825.json"
    $finiteReportHash = Get-Sha256 "rank8_delta03_e5_five_cubic_path_outer_leaf_cuda_finite_exact_agent_20260825.json"
    Invoke-PythonChecked @(
        (Join-Path $Root "assemble_rank8_delta03_e5_five_cubic_path_outer_leaf_cuda_primary_agent.py"),
        "--expected-ray-checkpoint-sha256", $rayCheckpointHash,
        "--expected-ray-report-sha256", $rayReportHash,
        "--expected-finite-checkpoint-sha256", $finiteCheckpointHash,
        "--expected-finite-report-sha256", $finiteReportHash
    )
    Require-JsonStatus `
        "rank8_delta03_e5_five_cubic_path_outer_leaf_cuda_primary_exact_agent_20260825.json" `
        "PASS_PRIMARY_EXACT_ALL_ORDER_E5_FIVE_CUBIC_PATH_OUTER_LEAF"
    $cudaPrimaryHash = Get-Sha256 "rank8_delta03_e5_five_cubic_path_outer_leaf_cuda_primary_exact_agent_20260825.json"
    Invoke-PythonChecked @(
        (Join-Path $Root "seal_rank8_delta03_e5_five_cubic_path_outer_leaf_exact_agent.py"),
        "--expected-primary-report-sha256", $cudaPrimaryHash
    )
    Require-JsonStatus `
        "rank8_delta03_e5_five_cubic_path_outer_leaf_all_order_exact_agent_20260825.json" `
        "PASS_EXACT_RANK8_DELTA03_E5_FIVE_CUBIC_PATH_OUTER_LEAF_N28_PLUS"
    Write-ChainLog "PASS_PRIMARY_SEAL"

    $auditOut = Join-Path $Root "e5_five_cubic_path_outer_leaf_cuda_full_audit_stdout_agent_20260825.txt"
    $auditErr = Join-Path $Root "e5_five_cubic_path_outer_leaf_cuda_full_audit_stderr_agent_20260825.txt"
    $auditScript = Join-Path $Root "audit_rank8_delta03_e5_five_cubic_path_outer_leaf_cuda_full_agent.py"
    $auditProcess = Start-Process `
        -FilePath $Python `
        -ArgumentList @($auditScript, "--expected-primary-report-sha256", $cudaPrimaryHash) `
        -WorkingDirectory $Root `
        -RedirectStandardOutput $auditOut `
        -RedirectStandardError $auditErr `
        -WindowStyle Hidden `
        -PassThru
    Write-ChainLog "START_AUDIT PID=$($auditProcess.Id)"
    $auditProcess.WaitForExit()
    if ($auditProcess.ExitCode -ne 0) {
        throw "Independent audit failed with exit code $($auditProcess.ExitCode)"
    }
    Require-JsonStatus `
        "rank8_delta03_e5_five_cubic_path_outer_leaf_cuda_full_independent_audit_agent_20260825.json" `
        "PASS_FULL_INDEPENDENT_CUDA_AUDIT_E5_FIVE_CUBIC_PATH_OUTER_LEAF"
    Write-ChainLog "PASS_RAW_AUDIT"

    $primarySealHash = Get-Sha256 "rank8_delta03_e5_five_cubic_path_outer_leaf_all_order_exact_agent_20260825.json"
    $rawAuditHash = Get-Sha256 "rank8_delta03_e5_five_cubic_path_outer_leaf_cuda_full_independent_audit_agent_20260825.json"
    $auditCheckpointHash = Get-Sha256 "rank8_delta03_e5_five_cubic_path_outer_leaf_cuda_full_audit_checkpoint_agent_20260825.json"
    Invoke-PythonChecked @(
        (Join-Path $Root "seal_rank8_delta03_e5_five_cubic_path_outer_leaf_independent_audit_agent.py"),
        "--expected-primary-report-sha256", $primarySealHash,
        "--expected-raw-audit-sha256", $rawAuditHash,
        "--expected-checkpoint-sha256", $auditCheckpointHash
    )
    Require-JsonStatus `
        "rank8_delta03_e5_five_cubic_path_outer_leaf_all_order_independent_audit_agent_20260825.json" `
        "PASS_INDEPENDENT_RANK8_DELTA03_E5_FIVE_CUBIC_PATH_OUTER_LEAF_N28_PLUS_AUDIT"

    $auditSealHash = Get-Sha256 "rank8_delta03_e5_five_cubic_path_outer_leaf_all_order_independent_audit_agent_20260825.json"
    Invoke-PythonChecked @(
        (Join-Path $Root "assemble_rank8_delta03_e5_five_cubic_path_outer_leaf_n27_plus_agent.py"),
        "--expected-primary-report-sha256", $primarySealHash,
        "--expected-audit-report-sha256", $auditSealHash
    )
    Require-JsonStatus `
        "rank8_delta03_e5_five_cubic_path_outer_leaf_n27_plus_exact_agent_20260825.json" `
        "PASS_EXACT_AND_INDEPENDENT_RANK8_DELTA03_E5_FIVE_CUBIC_PATH_OUTER_LEAF_N27_PLUS"
    Write-ChainLog "PASS_CHAIN_READY_FOR_MASTER_INTEGRATION"
    exit 0
}
catch {
    Write-ChainLog "FAIL $($_.Exception.Message)"
    exit 1
}
