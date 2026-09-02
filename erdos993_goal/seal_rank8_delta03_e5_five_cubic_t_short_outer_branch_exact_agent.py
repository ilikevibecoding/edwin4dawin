#!/usr/bin/env python3
"""Fail-closed seal for the e=5 five-cubic-T short-outer-branch producer."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
RAW = ROOT / (
    "rank8_delta03_e5_five_cubic_t_short_outer_branch_"
    "i256_raw_agent_20260823.txt"
)
OUTPUT = ROOT / (
    "rank8_delta03_e5_five_cubic_t_short_outer_branch_"
    "all_order_exact_agent_20260823.json"
)
EXPECTED = {
    "rank8_delta03_e5_skeleton_root_partition_exact_agent_20260823.json":
        "A2E5E67E7852E2E663DE8092803C8FB889796E29E5888FB62994B9063E5A374F",
    "rank8_delta03_e5_skeleton_root_partition_independent_audit_agent_20260823.json":
        "E1096D465A47A425CCB37DB5C648EEB988389B03B0214757C62E2B4EF097BFF7",
    "certify_rank8_delta03_e5_five_cubic_t_short_outer_branch_newton_reduction_agent.py":
        "A954A6105562B862BCD5E7EBCAFC87FFCA4E4CC911EBA477A5656AD216AC6ED9",
    "rank8_delta03_e5_five_cubic_t_short_outer_branch_newton_reduction_exact_agent_20260823.json":
        "1D0F0561D9EB49CD4E576443AB3A556A4A23A1C835B0D3E4C5D44EEDFB28B3BC",
    "certify_rank8_delta03_e5_five_cubic_t_short_outer_branch_preflight_agent.py":
        "1DA3A25C6F47AC9FBB69789BA8898F14697E263433305710D2D8A16E1C9270AB",
    "rank8_delta03_e5_five_cubic_t_short_outer_branch_preflight_exact_agent_20260823.json":
        "C4C122F5360E38401BD5B788054D23B56905FC7CF180DEE1461903F038A8D393",
    "rank8_delta03_e4_literal_i256_audit_common_agent.rs":
        "BB9C7E541959A256F4B215C32675D1C1F617DBC097E4B2194A3B0735A16938B6",
    "rank8_delta03_e3_cubic_exact_i256_core_root.rs":
        "7502104CEE850E1B621EF35B88B56530D35195703372306F94AF8671A040AD1F",
    "rank8_delta01_e3_cubic_exact_i256_core_agent.rs":
        "B9A7398612EC8A77378CEB6CFE42FA461E45AB34381F978621608417677763E0",
    "produce_rank8_delta03_e5_five_cubic_t_short_outer_branch_i256_agent.rs":
        "3FAE9E06B987109EECB33F0200336943B70B9389F0BCC3BB30E7653E03926780",
    "produce_rank8_delta03_e5_five_cubic_t_short_outer_branch_i256_agent.exe":
        "B6F4EC687EBC29A36D3B64F0602B52565918ACF823BF4BBE7C94FAD37B4F376E",
    "rank8_delta03_e5_five_cubic_t_short_outer_branch_i256_raw_agent_20260823.txt":
        "E403E33ACFD3B86E5CB0F5CC73A16FECF031B469E843CAF736C150321E59A0FA",
}
OBSERVED_RUNTIME_SECONDS = 22_685.0959153


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    assert OBSERVED_RUNTIME_SECONDS is not None
    assert not any(value.startswith("FILL_") for value in EXPECTED.values())
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    lines = RAW.read_text(encoding="utf-8").splitlines()
    assert lines[0] == "PASS_I256_E5_FIVE_CUBIC_T_SHORT_OUTER_BRANCH"
    rows = dict(line.split(" ", 1) for line in lines[1:])
    assert set(rows) == {
        "COUNTS",
        "UNSEEN",
        "LITERAL_CHECKS",
        "COEFFICIENT_MERKLE_STREAM",
        "FINITE_MERKLE_STREAM",
    }
    assert rows["COUNTS"] == "133413966 131875095 495993777 1 495993778"
    assert rows["UNSEEN"] == "1983975112"
    assert rows["LITERAL_CHECKS"] == "24"
    for field in ("COEFFICIENT_MERKLE_STREAM", "FINITE_MERKLE_STREAM"):
        assert len(rows[field]) == 64
        int(rows[field], 16)
    payload = {
        "schema": (
            "rank8-delta03-e5-five-cubic-t-short-outer-branch-"
            "all-order-exact-agent-v1"
        ),
        "status": (
            "PASS_EXACT_RANK8_DELTA03_E5_FIVE_CUBIC_T_"
            "SHORT_OUTER_BRANCH_N28_PLUS"
        ),
        "theorem": (
            "For a short-outer-branch root in every subdivision of the "
            "five-cubic-T e=5 suppressed skeleton and every n>=28, Delta0 "
            "through Delta3 are strictly positive."
        ),
        "root_orbit": "five_cubic_t:short_outer_branch",
        "quotient_counts": {
            "all_short_total": 133_413_966,
            "all_short_n28_plus": 131_875_095,
            "mixed_rays": 495_993_777,
            "all_long_rays": 1,
            "non_all_short_rays": 495_993_778,
        },
        "rank_ray_samples": 57_535_278_248,
        "samples_per_rank_ray": 29,
        "degree_bounds": {"0": 28, "1": 28, "2": 27, "3": 26},
        "newton_gate": (
            "d0>0, d1>0, all remaining coefficients through the exact "
            "degree nonnegative, higher coefficients zero, and S=29 checked "
            "on every rank-ray"
        ),
        "unseen_S29_rank_checks": 1_983_975_112,
        "literal_formula_spot_checks": 24,
        "coefficient_merkle_stream_sha256": rows["COEFFICIENT_MERKLE_STREAM"],
        "finite_merkle_stream_sha256": rows["FINITE_MERKLE_STREAM"],
        "observed_primary_runtime_seconds": OBSERVED_RUNTIME_SECONDS,
        "arithmetic": (
            "six-thread checked signed i256 residual/Newton arithmetic, "
            "checked i128 independence-vector arithmetic, and constant-memory "
            "ordered shard digests"
        ),
        "immutable_input_hashes": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": (
            "Exactly five_cubic_t:short_outer_branch for n>=28; independent "
            "audit remains required before promotion, and no other e=5 orbit "
            "is credited."
        ),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print(
        "STREAM",
        payload["coefficient_merkle_stream_sha256"],
        payload["finite_merkle_stream_sha256"],
    )
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
