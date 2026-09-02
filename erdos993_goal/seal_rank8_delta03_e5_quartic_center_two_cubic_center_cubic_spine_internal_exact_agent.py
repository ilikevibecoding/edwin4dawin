#!/usr/bin/env python3
"""Fail-closed seal for the e=5 center-cubic-spine-internal checked-i256 producer."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
RAW = ROOT / "rank8_delta03_e5_quartic_center_two_cubic_center_cubic_spine_internal_i256_raw_agent_20260823.txt"
OUTPUT = ROOT / "rank8_delta03_e5_quartic_center_two_cubic_center_cubic_spine_internal_all_order_exact_agent_20260823.json"
EXPECTED = {
    "rank8_delta03_e5_skeleton_root_partition_exact_agent_20260823.json": "A2E5E67E7852E2E663DE8092803C8FB889796E29E5888FB62994B9063E5A374F",
    "rank8_delta03_e5_skeleton_root_partition_independent_audit_agent_20260823.json": "E1096D465A47A425CCB37DB5C648EEB988389B03B0214757C62E2B4EF097BFF7",
    "certify_rank8_delta03_e5_quartic_center_two_cubic_center_cubic_spine_internal_newton_reduction_agent.py": "89FFCC0581E2ECA01295E579F2572C7303F024FDB56F5400F85DF79451C55D54",
    "rank8_delta03_e5_quartic_center_two_cubic_center_cubic_spine_internal_newton_reduction_exact_agent_20260823.json": "18BC251CA366B819BDE8B69C9999C3F08A15B9BC81623788FAF1BF90A3329901",
    "certify_rank8_delta03_e5_quartic_center_two_cubic_center_cubic_spine_internal_preflight_agent.py": "397A4B000E87B5546B8D68C87B88D159407C8C0F71A3FDCCC522251516D05D39",
    "rank8_delta03_e5_quartic_center_two_cubic_center_cubic_spine_internal_preflight_exact_agent_20260823.json": "0C9B11C44DFF10231E2AB2323A7ED1EE13BD624FFBD9B7A8301791523D91D949",
    "rank8_delta03_e4_literal_i256_audit_common_agent.rs": "BB9C7E541959A256F4B215C32675D1C1F617DBC097E4B2194A3B0735A16938B6",
    "rank8_delta03_e3_cubic_exact_i256_core_root.rs": "7502104CEE850E1B621EF35B88B56530D35195703372306F94AF8671A040AD1F",
    "rank8_delta01_e3_cubic_exact_i256_core_agent.rs": "B9A7398612EC8A77378CEB6CFE42FA461E45AB34381F978621608417677763E0",
    "produce_rank8_delta03_e5_quartic_center_two_cubic_center_cubic_spine_internal_i256_agent.rs": "D3FEB12770CAB614353D65AD369ECDAB96DDA8987E8AB495E6F57A04A596AC6F",
    "produce_rank8_delta03_e5_quartic_center_two_cubic_center_cubic_spine_internal_i256_agent.exe": "7A9B1B2D4BEF2C7490583D976C87E60C0FC960D6A6114B4C2621B5553D52B535",
    "rank8_delta03_e5_quartic_center_two_cubic_center_cubic_spine_internal_i256_raw_agent_20260823.txt": "6C64F9815ED70D4DB04E0E3D16796E147870F3B4DA6F6EB7D9194C494762927B",
}


def sha256(path_value: Path) -> str:
    return hashlib.sha256(path_value.read_bytes()).hexdigest().upper()


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    lines = RAW.read_text(encoding="utf-8").splitlines()
    assert lines[0] == "PASS_I256_E5_QUARTIC_CENTER_TWO_CUBIC_CENTER_CUBIC_SPINE_INTERNAL"
    rows = dict(line.split(" ", 1) for line in lines[1:])
    assert set(rows) == {
        "COUNTS", "UNSEEN", "LITERAL_CHECKS",
        "COEFFICIENT_MERKLE_STREAM", "FINITE_MERKLE_STREAM",
    }
    assert rows["COUNTS"] == "3176523 2771357 8062900 1 8062901"
    assert rows["UNSEEN"] == "32251604"
    assert rows["LITERAL_CHECKS"] == "217"
    for field in ("COEFFICIENT_MERKLE_STREAM", "FINITE_MERKLE_STREAM"):
        assert len(rows[field]) == 64
        int(rows[field], 16)
    payload = {
        "schema": "rank8-delta03-e5-quartic-center-two-cubic-center-cubic-spine-internal-all-order-exact-agent-v1",
        "status": "PASS_EXACT_RANK8_DELTA03_E5_QUARTIC_CENTER_TWO_CUBIC_CENTER_CUBIC_SPINE_INTERNAL_N28_PLUS",
        "theorem": "For a center-cubic-spine-internal root in every subdivision of the quartic-center-two-cubic e=5 suppressed skeleton and every n>=28, Delta0 through Delta3 are strictly positive.",
        "root_orbit": "quartic_center_two_cubic:center_cubic_spine_internal",
        "quotient_counts": {
            "all_short_total": 3_176_523,
            "all_short_n28_plus": 2_771_357,
            "mixed_rays": 8_062_900,
            "all_long_rays": 1,
            "non_all_short_rays": 8_062_901,
        },
        "rank_ray_samples": 8_062_901 * 4 * 29,
        "samples_per_rank_ray": 29,
        "degree_bounds": {"0": 28, "1": 28, "2": 27, "3": 26},
        "newton_gate": "d0>0, d1>0, all remaining coefficients through the exact degree nonnegative, higher coefficients zero, and S=29 checked on every rank-ray",
        "unseen_S29_rank_checks": 32_251_604,
        "literal_formula_spot_checks": 217,
        "coefficient_merkle_stream_sha256": rows["COEFFICIENT_MERKLE_STREAM"],
        "finite_merkle_stream_sha256": rows["FINITE_MERKLE_STREAM"],
        "observed_primary_runtime_seconds": 452.588,
        "arithmetic": "six-thread checked signed i256 residual/Newton arithmetic and checked i128 independence-vector arithmetic",
        "immutable_input_hashes": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": "Exactly quartic_center_two_cubic:center_cubic_spine_internal for n>=28; independent audit remains required before promotion, and no other e=5 orbit is credited.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("FINITE", payload["quotient_counts"]["all_short_n28_plus"])
    print("RAYS", payload["quotient_counts"]["non_all_short_rays"])
    print("STREAM", payload["coefficient_merkle_stream_sha256"], payload["finite_merkle_stream_sha256"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
