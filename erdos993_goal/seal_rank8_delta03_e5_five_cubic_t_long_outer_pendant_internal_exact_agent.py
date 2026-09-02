#!/usr/bin/env python3
"""Fail-closed seal for the e=5 five-cubic-T long-outer-pendant internal producer."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
RAW = ROOT / "rank8_delta03_e5_five_cubic_t_long_outer_pendant_internal_i256_raw_agent_20260824.txt"
OUTPUT = ROOT / "rank8_delta03_e5_five_cubic_t_long_outer_pendant_internal_all_order_exact_agent_20260824.json"
EXPECTED = {
    "rank8_delta03_e5_skeleton_root_partition_exact_agent_20260823.json": "A2E5E67E7852E2E663DE8092803C8FB889796E29E5888FB62994B9063E5A374F",
    "rank8_delta03_e5_skeleton_root_partition_independent_audit_agent_20260823.json": "E1096D465A47A425CCB37DB5C648EEB988389B03B0214757C62E2B4EF097BFF7",
    "certify_rank8_delta03_e5_five_cubic_t_long_outer_pendant_internal_newton_reduction_agent.py": "943568E71E533F8B2180AF31AE48AE178330EC84295A41B715A98AE638575D32",
    "rank8_delta03_e5_five_cubic_t_long_outer_pendant_internal_newton_reduction_exact_agent_20260824.json": "00B318CAD3D8604A95FACDA40C114283D5811201AC512504F4E5CC915C23B50B",
    "certify_rank8_delta03_e5_five_cubic_t_long_outer_pendant_internal_preflight_agent.py": "196CA325E69438F242CA8BDA39D3DD23C23A47FFF1032D9ED5353F445366BE98",
    "rank8_delta03_e5_five_cubic_t_long_outer_pendant_internal_preflight_exact_agent_20260824.json": "16A90D98EF9E9B7A59B5FABA420FFEA518611FBBD0C4EE1D739AFCE819999A51",
    "rank8_delta03_e4_literal_i256_audit_common_agent.rs": "BB9C7E541959A256F4B215C32675D1C1F617DBC097E4B2194A3B0735A16938B6",
    "rank8_delta03_e3_cubic_exact_i256_core_root.rs": "7502104CEE850E1B621EF35B88B56530D35195703372306F94AF8671A040AD1F",
    "rank8_delta01_e3_cubic_exact_i256_core_agent.rs": "B9A7398612EC8A77378CEB6CFE42FA461E45AB34381F978621608417677763E0",
    "produce_rank8_delta03_e5_five_cubic_t_long_outer_pendant_internal_i256_agent.rs": "FB69524D1B99DB74D7E90F91E31F634B6BD91138E30B92E01C13F7F05BA47C66",
    "produce_rank8_delta03_e5_five_cubic_t_long_outer_pendant_internal_i256_agent.exe": "1E8A3959D76861FCEDEFCC9C584AAAD8BBA88BF9923B88A20888C14CAA9C0752",
    "rank8_delta03_e5_five_cubic_t_long_outer_pendant_internal_i256_raw_agent_20260824.txt": "FILL_PRIMARY_RAW_HASH",
}
OBSERVED_RUNTIME_SECONDS = None


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    assert OBSERVED_RUNTIME_SECONDS is not None
    assert not any(value.startswith("FILL_") for value in EXPECTED.values())
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    lines = RAW.read_text(encoding="utf-8").splitlines()
    assert lines[0] == "PASS_I256_E5_FIVE_CUBIC_T_LONG_OUTER_PENDANT_INTERNAL"
    rows = dict(line.split(" ", 1) for line in lines[1:])
    assert set(rows) == {
        "COUNTS",
        "UNSEEN",
        "LITERAL_CHECKS",
        "COEFFICIENT_MERKLE_STREAM",
        "FINITE_MERKLE_STREAM",
    }
    assert rows["COUNTS"] == "805929264 804108046 3619593935 1 3619593936"
    assert rows["UNSEEN"] == "14478375744"
    assert rows["LITERAL_CHECKS"] == "24"
    for field in ("COEFFICIENT_MERKLE_STREAM", "FINITE_MERKLE_STREAM"):
        assert len(rows[field]) == 64
        int(rows[field], 16)
    payload = {
        "schema": "rank8-delta03-e5-five-cubic-t-long-outer-pendant-internal-all-order-exact-agent-v1",
        "status": "PASS_EXACT_RANK8_DELTA03_E5_FIVE_CUBIC_T_LONG_OUTER_PENDANT_INTERNAL_N28_PLUS",
        "theorem": "For a long-outer-pendant internal root in every subdivision of the five-cubic-T e=5 suppressed skeleton and every n>=28, Delta0 through Delta3 are strictly positive.",
        "root_orbit": "five_cubic_t:long_outer_pendant_internal",
        "quotient_counts": {
            "all_short_total": 805_929_264,
            "all_short_n28_plus": 804_108_046,
            "mixed_rays": 3_619_593_935,
            "all_long_rays": 1,
            "non_all_short_rays": 3_619_593_936,
        },
        "rank_ray_samples": 419_872_896_576,
        "samples_per_rank_ray": 29,
        "degree_bounds": {"0": 28, "1": 28, "2": 27, "3": 26},
        "newton_gate": "d0>0, d1>0, all remaining coefficients through the exact degree nonnegative, higher coefficients zero, and S=29 checked on every rank-ray",
        "unseen_S29_rank_checks": 14_478_375_744,
        "literal_formula_spot_checks": 24,
        "coefficient_merkle_stream_sha256": rows["COEFFICIENT_MERKLE_STREAM"],
        "finite_merkle_stream_sha256": rows["FINITE_MERKLE_STREAM"],
        "observed_primary_runtime_seconds": OBSERVED_RUNTIME_SECONDS,
        "arithmetic": "six-thread checked signed i256 residual/Newton arithmetic, checked i128 independence-vector arithmetic, and constant-memory ordered shard digests",
        "immutable_input_hashes": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": "Exactly five_cubic_t:long_outer_pendant_internal for n>=28; independent audit remains required before promotion, and no other e=5 orbit is credited.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("STREAM", payload["coefficient_merkle_stream_sha256"], payload["finite_merkle_stream_sha256"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()


