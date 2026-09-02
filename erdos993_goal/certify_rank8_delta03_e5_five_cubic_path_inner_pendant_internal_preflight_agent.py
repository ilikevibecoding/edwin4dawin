#!/usr/bin/env python3
"""Fail-closed preflight for path:inner_pendant_internal CUDA engines."""

from __future__ import annotations

import hashlib
import json
import os
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / (
    "rank8_delta03_e5_five_cubic_path_inner_pendant_internal_"
    "preflight_exact_agent_20260825.json"
)
EXPECTED = {
    "rank8_delta03_e5_skeleton_root_partition_exact_agent_20260823.json":
        "A2E5E67E7852E2E663DE8092803C8FB889796E29E5888FB62994B9063E5A374F",
    "rank8_delta03_e5_skeleton_root_partition_independent_audit_agent_20260823.json":
        "E1096D465A47A425CCB37DB5C648EEB988389B03B0214757C62E2B4EF097BFF7",
    "rank8_terminal_delta03_finite_n27_wrom_threaded_exact_root_20260823.json":
        "213ADB30A53D575D0CF39B5A5953A74305A8D38AB2A488350FCF35F5FCF70787",
    "rank8_terminal_delta03_finite_n27_wrom_threaded_independent_audit_root_20260823.json":
        "BDA50403AD39A58884746A7345D7B403B286E0B5877947E9155061FDEAF4D02D",
    "certify_rank8_delta03_e5_five_cubic_path_inner_pendant_internal_newton_reduction_agent.py":
        "1F8772AF2B064F65CCF813EFBF62594B87C22B5642517AC8F996DFF46183B44E",
    "rank8_delta03_e5_five_cubic_path_inner_pendant_internal_newton_reduction_exact_agent_20260825.json":
        "9EA925187F9FFCCB9C6D0A1AC504DE5D46EB9DE573CAA9A976F015C26D008C37",
    "benchmark_rank8_cuda_path_center_formula_agent.py":
        "5765A4A1E0D865195FD3FEA8B7AA4F236FECA7223A3E4E413D0C26B1D0229508",
    "benchmark_rank8_cuda_path_center_pendant_internal_formula_agent.py":
        "E39A65FE559D70062EDAAF0E760B7345C5E35A6CB9CFC0B6D854CDF848653CC8",
    "probe_rank8_delta03_e5_five_cubic_path_internal_root_shape_agent.py":
        "B7D1796565C4A2875DB1692E1D1C422C10ADC2A73E7ADBE6DE50C91073D2677C",
    "benchmark_rank8_cuda_path_inner_pendant_internal_formula_agent.py":
        "3375CA9FC94BD2453FB9185EAA9D6A91A752AE22ACEB8FB001A22DFE0AB9F0A7",
    "audit_rank8_cuda_path_inner_pendant_internal_formula_independent_agent.py":
        "0018B5F1B0E626EAC6EFF6F4A89866962521411DBFA655799FBD737A86C72532",
    "run_rank8_cuda_ordered_halves_internal_rays_driver_agent.py":
        "F2DC6C7037DFA3B1B0C5747FF73549EA75BAA712069B14AEECCB628AA55C00CF",
    "run_rank8_cuda_ordered_halves_internal_finite_driver_agent.py":
        "3CB7E22D66F66209B31D474C9B78D0942495D516151E9E58F8F355B5F6777931",
    "run_rank8_cuda_unordered_halves_internal_rays_driver_agent.py":
        "3A3FDA406198BB6A3E84AE4E34328D9CCB61429E3B95BD974CFDF70A0935A353",
    "run_rank8_cuda_unordered_halves_internal_finite_driver_agent.py":
        "BC1BAC333ECE253E3397D6E215D5742CF05132AB225160A6AF1773A66B3A8935",
}

PRIMARY_CODE = r'''
import numpy as np
from numba import cuda
import benchmark_rank8_cuda_path_inner_pendant_internal_formula_agent as f
p = f.base.primes31()
rows, varying, shifts = f.random_rays(4)
out = cuda.device_array(4 * f.PRIME_COUNT * f.RANKS * f.POINTS, dtype=np.uint32)
f.evaluate_kernel[2, 64](cuda.to_device(rows), cuda.to_device(varying), cuda.to_device(shifts), cuda.to_device(np.asarray(p, dtype=np.uint32)), out)
residues = out.copy_to_host()
print("PRIMARY", f.literal_check(rows, varying, shifts, p, residues, checks=4), int(residues.astype(np.uint64).sum(dtype=np.uint64)))
'''

AUDIT_CODE = r'''
import numpy as np
from numba import cuda
import audit_rank8_cuda_path_inner_pendant_internal_formula_independent_agent as f
p = f.audit_primes31()
rows, varying, shifts = f.random_rays(4)
out = cuda.device_array(4 * f.PRIME_COUNT * f.RANKS * f.POINTS, dtype=np.uint32)
f.evaluate_rays_kernel[2, 64](cuda.to_device(rows), cuda.to_device(varying), cuda.to_device(shifts), cuda.to_device(np.asarray(p, dtype=np.uint32)), out)
residues = out.copy_to_host()
print("AUDIT", f.literal_checks(rows, varying, shifts, p, residues, checks=4), int(residues.astype(np.uint64).sum(dtype=np.uint64)))
'''


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def simulate(code: str) -> str:
    environment = os.environ.copy()
    environment["NUMBA_ENABLE_CUDASIM"] = "1"
    completed = subprocess.run(
        [sys.executable, "-c", code],
        cwd=ROOT,
        env=environment,
        check=True,
        capture_output=True,
        text=True,
        timeout=300,
    )
    assert completed.stderr == ""
    return completed.stdout.strip()


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    primary = simulate(PRIMARY_CODE)
    audit = simulate(AUDIT_CODE)
    assert primary == "PRIMARY 432 4449689468674"
    assert audit == "AUDIT 432 2739721113033"
    reduction = json.loads(
        (ROOT / (
            "rank8_delta03_e5_five_cubic_path_inner_pendant_internal_"
            "newton_reduction_exact_agent_20260825.json"
        )).read_text(encoding="utf-8")
    )
    assert reduction["quotient_counts"] == {
        "all_short": 1_600_967_592,
        "order27": 1_513_615,
        "finite": 1_597_435_864,
        "mixed": 7_210_740_823,
        "all_long": 1,
        "total": 8_811_708_416,
        "rays": 7_210_740_824,
    }
    payload = {
        "schema": (
            "rank8-delta03-e5-five-cubic-path-inner-pendant-internal-"
            "preflight-agent-v1"
        ),
        "status": (
            "PASS_EXACT_PREFLIGHT_E5_FIVE_CUBIC_PATH_"
            "INNER_PENDANT_INTERNAL_PRIMARY_AUDIT_LITERAL_MATCH"
        ),
        "root_orbit": "five_cubic_path:inner_pendant_internal",
        "exact_workload": {
            "canonical_keys": 8_811_708_416,
            "all_short": 1_600_967_592,
            "eligible_finite_n28_plus": 1_597_435_864,
            "mixed_rays": 7_210_740_823,
            "all_long_rays": 1,
            "total_rays": 7_210_740_824,
            "formula_evaluations_per_engine": 210_708_919_760,
        },
        "simulator_checks": {
            "primary_literal_residues": 432,
            "independent_literal_residues": 432,
            "primary_checksum": 4_449_689_468_674,
            "independent_checksum": 2_739_721_113_033,
            "disjoint_crt_prime_bases": True,
        },
        "independence": (
            "The primary center/outer-arm factorization and independent "
            "root-directed message formula use different transcriptions and "
            "disjoint CRT prime bases; each is checked directly against "
            "generic literal tree and deletion-forest dynamic programming."
        ),
        "immutable_input_hashes": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": (
            "Preflight only. Full primary and independent exhaustive passes "
            "are required before orbit credit."
        ),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
