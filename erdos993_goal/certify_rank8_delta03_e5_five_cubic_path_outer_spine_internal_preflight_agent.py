#!/usr/bin/env python3
"""Fail-closed preflight for path:outer_spine_internal CUDA engines."""

from __future__ import annotations

import hashlib
import json
import os
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / (
    "rank8_delta03_e5_five_cubic_path_outer_spine_internal_"
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
    "certify_rank8_delta03_e5_five_cubic_path_outer_spine_internal_newton_reduction_agent.py":
        "555B020CE558AAABFFC7BABC29E03FBA1CDE953CD54247B76CFB8DF35EB46B7A",
    "rank8_delta03_e5_five_cubic_path_outer_spine_internal_newton_reduction_exact_agent_20260825.json":
        "0E9295E728708E2A2F3B3489C740BB5CAE0F060A3D8950117DD65DA1072FBBB2",
    "benchmark_rank8_cuda_path_center_formula_agent.py":
        "5765A4A1E0D865195FD3FEA8B7AA4F236FECA7223A3E4E413D0C26B1D0229508",
    "benchmark_rank8_cuda_path_center_pendant_internal_formula_agent.py":
        "E39A65FE559D70062EDAAF0E760B7345C5E35A6CB9CFC0B6D854CDF848653CC8",
    "audit_rank8_cuda_path_center_pendant_internal_formula_independent_agent.py":
        "46F2C992B04FEF9AF26DCA17599BCA271329C3F5CE3FA7ADCCE11A28E193B8F9",
    "probe_rank8_delta03_e5_five_cubic_path_internal_root_shape_agent.py":
        "B7D1796565C4A2875DB1692E1D1C422C10ADC2A73E7ADBE6DE50C91073D2677C",
    "benchmark_rank8_cuda_path_outer_spine_internal_formula_agent.py":
        "49E9B33FD62E4CA79E134D5ECCA6E4C05B0F802BE9B64C681E36006C98FB3DFB",
    "audit_rank8_cuda_path_outer_spine_internal_formula_independent_agent.py":
        "BDCED567EF2AB545E1D5270F271BD325759159BB80E0D51817D3311C45D2B0F6",
    "run_rank8_cuda_path_outer_spine_internal_rays_driver_agent.py":
        "407EC8E3B09572B290E700FE36C0E4290FB54DCCF91ED855C762BB461BE7836A",
    "run_rank8_cuda_path_outer_spine_internal_finite_driver_agent.py":
        "BC6ABD6A4A7FD1FFD1D27816586C39DED4881F71FF7BBFA1C92E717738C66085",
    "run_rank8_cuda_path_inner_spine_internal_rays_driver_agent.py":
        "EF01B40C79F4DD702DB4F94A7936C06F2CEA7935E1CE72A55290703B3DEE804D",
    "run_rank8_cuda_path_inner_spine_internal_finite_driver_agent.py":
        "2E305EAD87B6A6E7A4F36245F4E462121B62F1F94D876E4182DEBA7E4F45C9F8",
    "run_rank8_cuda_unordered_halves_internal_rays_driver_agent.py":
        "3A3FDA406198BB6A3E84AE4E34328D9CCB61429E3B95BD974CFDF70A0935A353",
    "run_rank8_cuda_unordered_halves_internal_finite_driver_agent.py":
        "BC1BAC333ECE253E3397D6E215D5742CF05132AB225160A6AF1773A66B3A8935",
}

PRIMARY_CODE = r'''
import numpy as np
from numba import cuda
import benchmark_rank8_cuda_path_outer_spine_internal_formula_agent as f
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
import audit_rank8_cuda_path_outer_spine_internal_formula_independent_agent as f
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
    assert primary == "PRIMARY 432 4459457843871"
    assert audit == "AUDIT 432 2265548627545"
    reduction_report = json.loads(
        (ROOT / (
            "rank8_delta03_e5_five_cubic_path_outer_spine_internal_"
            "newton_reduction_exact_agent_20260825.json"
        )).read_text(encoding="utf-8")
    )
    assert reduction_report["quotient_counts"] == {
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
            "rank8-delta03-e5-five-cubic-path-outer-spine-internal-"
            "preflight-agent-v1"
        ),
        "status": (
            "PASS_EXACT_PREFLIGHT_E5_FIVE_CUBIC_PATH_"
            "OUTER_SPINE_INTERNAL_PRIMARY_AUDIT_LITERAL_MATCH"
        ),
        "root_orbit": "five_cubic_path:outer_spine_internal",
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
            "primary_checksum": 4_459_457_843_871,
            "independent_checksum": 2_265_548_627_545,
            "disjoint_crt_prime_bases": True,
        },
        "independence": (
            "The primary two-sided root factorization and independent "
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
