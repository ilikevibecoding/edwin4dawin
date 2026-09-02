#!/usr/bin/env python3
"""Fail-closed preflight for path:outer_pendant_internal CUDA engines."""

from __future__ import annotations

import hashlib
import json
import os
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / (
    "rank8_delta03_e5_five_cubic_path_outer_pendant_internal_"
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
    "certify_rank8_delta03_e5_five_cubic_path_outer_pendant_internal_newton_reduction_agent.py":
        "FC5C740AFFC5995250AB034E66276B154BD591D36B3412BCAA52F160DFA0FB99",
    "rank8_delta03_e5_five_cubic_path_outer_pendant_internal_newton_reduction_exact_agent_20260825.json":
        "99C5C254EBFE5B11E69250A7DE263C9DC0BBFBF936C120F4A3A0512CE307356B",
    "benchmark_rank8_cuda_path_center_formula_agent.py":
        "5765A4A1E0D865195FD3FEA8B7AA4F236FECA7223A3E4E413D0C26B1D0229508",
    "benchmark_rank8_cuda_path_center_pendant_internal_formula_agent.py":
        "E39A65FE559D70062EDAAF0E760B7345C5E35A6CB9CFC0B6D854CDF848653CC8",
    "audit_rank8_cuda_path_inner_pendant_internal_formula_independent_agent.py":
        "0018B5F1B0E626EAC6EFF6F4A89866962521411DBFA655799FBD737A86C72532",
    "probe_rank8_delta03_e5_five_cubic_path_internal_root_shape_agent.py":
        "B7D1796565C4A2875DB1692E1D1C422C10ADC2A73E7ADBE6DE50C91073D2677C",
    "benchmark_rank8_cuda_path_outer_pendant_internal_formula_agent.py":
        "4DD5408DD553B2754137A737C6F9DD5902C6B458F6A4E6EEB962CC4393BF486E",
    "audit_rank8_cuda_path_outer_pendant_internal_formula_independent_agent.py":
        "7361A56259162B512B35FE1E7163148E82694637AD2858BF9378FA5B893F4CE3",
    "run_rank8_cuda_path_outer_pendant_internal_rays_driver_agent.py":
        "77618A288F3D92491D95E9D8DCEC672D2AB58F7DA361F0FEB9FC531988034830",
    "run_rank8_cuda_path_outer_pendant_internal_finite_driver_agent.py":
        "B94895945E44C428E6A5452F2FF27D35B46B1556C81D5A13701309F5AB6B2AEE",
    "run_rank8_cuda_unordered_halves_internal_rays_driver_agent.py":
        "3A3FDA406198BB6A3E84AE4E34328D9CCB61429E3B95BD974CFDF70A0935A353",
    "run_rank8_cuda_unordered_halves_internal_finite_driver_agent.py":
        "BC1BAC333ECE253E3397D6E215D5742CF05132AB225160A6AF1773A66B3A8935",
}

PRIMARY_CODE = r'''
import numpy as np
from numba import cuda
import benchmark_rank8_cuda_path_outer_pendant_internal_formula_agent as f
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
import audit_rank8_cuda_path_outer_pendant_internal_formula_independent_agent as f
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
    assert primary == "PRIMARY 432 4474232781244"
    assert audit == "AUDIT 432 2076038480268"
    reduction_report = json.loads(
        (ROOT / (
            "rank8_delta03_e5_five_cubic_path_outer_pendant_internal_"
            "newton_reduction_exact_agent_20260825.json"
        )).read_text(encoding="utf-8")
    )
    assert reduction_report["quotient_counts"] == {
        "all_short": 2_744_515_872,
        "order27": 2_393_416,
        "finite": 2_739_018_464,
        "mixed": 12_675_973_855,
        "all_long": 1,
        "total": 15_420_489_728,
        "rays": 12_675_973_856,
    }
    payload = {
        "schema": (
            "rank8-delta03-e5-five-cubic-path-outer-pendant-internal-"
            "preflight-agent-v1"
        ),
        "status": (
            "PASS_EXACT_PREFLIGHT_E5_FIVE_CUBIC_PATH_"
            "OUTER_PENDANT_INTERNAL_PRIMARY_AUDIT_LITERAL_MATCH"
        ),
        "root_orbit": "five_cubic_path:outer_pendant_internal",
        "exact_workload": {
            "canonical_keys": 15_420_489_728,
            "all_short": 2_744_515_872,
            "eligible_finite_n28_plus": 2_739_018_464,
            "mixed_rays": 12_675_973_855,
            "all_long_rays": 1,
            "total_rays": 12_675_973_856,
            "formula_evaluations_per_engine": 370_342_260_288,
        },
        "simulator_checks": {
            "primary_literal_residues": 432,
            "independent_literal_residues": 432,
            "primary_checksum": 4_474_232_781_244,
            "independent_checksum": 2_076_038_480_268,
            "disjoint_crt_prime_bases": True,
        },
        "independence": (
            "The primary nested root factorization and independent "
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
