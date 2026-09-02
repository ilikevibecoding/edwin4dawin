#!/usr/bin/env python3
"""Fail-closed all-order assembly of the CUDA center-branch primary pass."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "rank8_delta03_e5_five_cubic_path_center_branch_cuda_primary_exact_agent_20260825.json"
EXPECTED = {
    "scan_rank8_delta03_e5_five_cubic_path_center_branch_cuda_rays_agent.py":
        "7FC95848D70851964418CCA5FAD0B7EEE242FB15390184B1FD479EB4E8ED14E3",
    "rank8_delta03_e5_five_cubic_path_center_branch_cuda_rays_checkpoint_agent_20260825.json":
        "07B2A3B3402ABA5F0853934E71913408DAA3E73C944114BD88EA50E45BAAD481",
    "rank8_delta03_e5_five_cubic_path_center_branch_cuda_rays_exact_agent_20260825.json":
        "D18D7153A0BC4A5E5F70C6F1F0C6E31FBD783F1734E7A361B5D766C99D582B0B",
    "scan_rank8_delta03_e5_five_cubic_path_center_branch_cuda_finite_agent.py":
        "A246CD487484177B647AE6200ECBDA52E789D55CA736365CDF0F437226C9B349",
    "rank8_delta03_e5_five_cubic_path_center_branch_cuda_finite_checkpoint_agent_20260825.json":
        "A8E51752AB97EA60A868810F819B200A13DF81F2D62C0115CFA270AF63F3F3F8",
    "rank8_delta03_e5_five_cubic_path_center_branch_cuda_finite_exact_agent_20260825.json":
        "D735D481EE5C54BC885D84CCE47732D2655848D9CA6837720D5948C9512B522D",
    "certify_rank8_delta03_e5_five_cubic_path_center_branch_newton_reduction_agent.py":
        "E966426A32A4648AC1164C0BA92342B8CB3D6B5C52E2AFED8CA021382685C37F",
    "rank8_delta03_e5_five_cubic_path_center_branch_newton_reduction_exact_agent_20260825.json":
        "01AD31A3D91E6FE8AA2A3F467AD7C3EA9C0E7BD0AF2BA7B31884B92DEBAE00BF",
    "certify_rank8_delta03_e5_five_cubic_path_center_branch_preflight_agent.py":
        "A69EC993E889EEC1101B1C89D6BCC127912D9F377DFD032B2FF01CC2EC93ECCD",
    "rank8_delta03_e5_five_cubic_path_center_branch_preflight_exact_agent_20260825.json":
        "080A8181CA621B9A0122003FF0ACC4FCEF55D00EA7452ECD8ADAF97F4D325A64",
    "rank8_terminal_delta03_finite_n27_wrom_threaded_exact_root_20260823.json":
        "213ADB30A53D575D0CF39B5A5953A74305A8D38AB2A488350FCF35F5FCF70787",
    "rank8_terminal_delta03_finite_n27_wrom_threaded_independent_audit_root_20260823.json":
        "BDA50403AD39A58884746A7345D7B403B286E0B5877947E9155061FDEAF4D02D",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str):
    return json.loads((ROOT / name).read_text(encoding="utf-8"))


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    rays = load("rank8_delta03_e5_five_cubic_path_center_branch_cuda_rays_exact_agent_20260825.json")
    finite = load("rank8_delta03_e5_five_cubic_path_center_branch_cuda_finite_exact_agent_20260825.json")
    reduction = load("rank8_delta03_e5_five_cubic_path_center_branch_newton_reduction_exact_agent_20260825.json")
    preflight = load("rank8_delta03_e5_five_cubic_path_center_branch_preflight_exact_agent_20260825.json")
    n27 = load("rank8_terminal_delta03_finite_n27_wrom_threaded_exact_root_20260823.json")
    n27_audit = load("rank8_terminal_delta03_finite_n27_wrom_threaded_independent_audit_root_20260823.json")
    assert rays["status"] == "PASS_EXACT_CUDA_I256_CRT_E5_FIVE_CUBIC_PATH_CENTER_BRANCH_RAYS"
    assert finite["status"] == "PASS_EXACT_CUDA_I256_CRT_E5_FIVE_CUBIC_PATH_CENTER_BRANCH_FINITE"
    assert reduction["status"] == "PASS_EXACT_RANK8_DELTA03_E5_FIVE_CUBIC_PATH_CENTER_BRANCH_TRANSFER_NEWTON_REDUCTION"
    assert preflight["status"] == "PASS_EXACT_PREFLIGHT_E5_FIVE_CUBIC_PATH_CENTER_BRANCH_PRIMARY_AUDIT_MATCH"
    counts = reduction["quotient_counts"]
    assert counts == {
        "all_short": 114_373_350,
        "order27": 467_085,
        "finite": 113_140_669,
        "mixed": 436_402_329,
        "all_long": 1,
        "total": 550_775_680,
        "rays": 436_402_330,
    }
    assert rays["totals"]["patterns"] == finite["totals"]["patterns"] == counts["total"]
    assert rays["totals"]["rays"] == counts["rays"]
    assert rays["totals"]["all_short"] == finite["totals"]["all_short"] == counts["all_short"]
    assert rays["totals"]["finite"] == finite["totals"]["finite"] == counts["finite"]
    assert rays["totals"]["order27"] == finite["totals"]["order27"] == counts["order27"]
    assert rays["totals"]["gate_failures"] == 0
    assert rays["totals"]["bound_failures"] == 0
    assert rays["totals"]["negative_classifications"] == 0
    assert finite["totals"]["positive_values"] == 4 * counts["finite"]
    assert finite["totals"]["nonpositive_values"] == 0
    assert finite["totals"]["bound_failures"] == 0
    assert n27["status"].startswith("PASS") and n27_audit["status"].startswith("PASS")
    assert reduction["shared_order27_evidence"]["nonpositive_by_delta"] == [0, 0, 0, 0]
    payload = {
        "schema": "rank8-delta03-e5-five-cubic-path-center-branch-cuda-primary-exact-agent-v1",
        "status": "PASS_PRIMARY_EXACT_ALL_ORDER_E5_FIVE_CUBIC_PATH_CENTER_BRANCH",
        "root_orbit": "five_cubic_path:center_branch",
        "canonical_coordinate_patterns": counts["total"],
        "n28_plus_newton_rays": counts["rays"],
        "n28_plus_all_short_finite_patterns": counts["finite"],
        "all_short_order27_patterns": counts["order27"],
        "ray_active_coefficient_checks": (
            rays["totals"]["positive_active_coefficients"]
            + rays["totals"]["zero_active_coefficients"]
        ),
        "finite_delta_checks": finite["totals"]["positive_values"],
        "nonpositive_or_bound_failures": 0,
        "conclusion": (
            "The primary exact CUDA/CRT engine proves Delta_0 through Delta_3 positive for every canonical five_cubic_path:center_branch instance at every order; n<=27 is supplied by the shared independently audited finite census."
        ),
        "immutable_input_hashes": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": (
            "Primary all-order closure only. The orbit receives official master-ledger credit only after a full independent audit report is sealed."
        ),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
