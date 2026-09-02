param(
  [Parameter(Mandatory = $true)]
  [int]$PrimaryPid
)

$ErrorActionPreference = "Stop"
$workspace = "C:\Users\chris\erdos993_goal"
Set-Location -LiteralPath $workspace

Wait-Process -Id $PrimaryPid -ErrorAction SilentlyContinue

if (-not (Test-Path -LiteralPath .\group_eleventh_homogeneous_upper_parity_20260805.json)) {
  python .\verify_group_ninth_homogeneous_upper_parity.py `
    --layer 10 `
    --output .\group_eleventh_homogeneous_upper_parity_20260805.json `
    *> .\group_eleventh_homogeneous_upper_parity_20260805.log
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

python .\analyze_group_ninth_homogeneous_boundaries.py `
  --layer 10 `
  --output .\group_eleventh_homogeneous_boundary_jacobi_20260805.json `
  *> .\group_eleventh_homogeneous_boundary_jacobi_20260805.log
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

python .\verify_group_ninth_homogeneous_tail_theorem.py `
  --layer 10 `
  --output .\group_eleventh_homogeneous_tail_verification_20260805.json `
  *> .\group_eleventh_homogeneous_tail_verification_20260805.log
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

if (Test-Path -LiteralPath .\group_eleventh_homogeneous_schur_pattern_probe_20260805.json) {
  python .\prove_group_eleventh_homogeneous_cone.py `
    *> .\group_eleventh_homogeneous_cone_theorem_20260805.log
  exit $LASTEXITCODE
}
