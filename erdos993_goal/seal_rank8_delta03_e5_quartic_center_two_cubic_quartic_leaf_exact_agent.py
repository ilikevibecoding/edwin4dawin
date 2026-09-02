#!/usr/bin/env python3
"""Fail-closed seal for the e=5 quartic-leaf checked-i256 producer."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
RAW = ROOT / "rank8_delta03_e5_quartic_center_two_cubic_quartic_leaf_i256_raw_agent_20260823.txt"
OUTPUT = ROOT / "rank8_delta03_e5_quartic_center_two_cubic_quartic_leaf_all_order_exact_agent_20260823.json"
EXPECTED = {
    "rank8_delta03_e5_skeleton_root_partition_exact_agent_20260823.json": "A2E5E67E7852E2E663DE8092803C8FB889796E29E5888FB62994B9063E5A374F",
    "rank8_delta03_e5_skeleton_root_partition_independent_audit_agent_20260823.json": "E1096D465A47A425CCB37DB5C648EEB988389B03B0214757C62E2B4EF097BFF7",
    "certify_rank8_delta03_e5_quartic_center_two_cubic_quartic_leaf_newton_reduction_agent.py": "0FCEA510998EA4ABBB45D09261D7954FD7ADE2C942B1CAD061CC4C86B7376B8E",
    "rank8_delta03_e5_quartic_center_two_cubic_quartic_leaf_newton_reduction_exact_agent_20260823.json": "51E4E7647988CF358152A52444CD25638E342E20421977269F00C279C77F228E",
    "certify_rank8_delta03_e5_quartic_center_two_cubic_quartic_leaf_preflight_agent.py": "758AE68CD3A42876C9D36B2ADB91CB09A2388E54D05850E3376FC1D824218DE8",
    "rank8_delta03_e5_quartic_center_two_cubic_quartic_leaf_preflight_exact_agent_20260823.json": "9D0631DC951B361E72039AFF46FB1BFF271AF249A9B4B07DD14C7ABD554687DC",
    "rank8_delta03_e4_literal_i256_audit_common_agent.rs": "BB9C7E541959A256F4B215C32675D1C1F617DBC097E4B2194A3B0735A16938B6",
    "rank8_delta03_e3_cubic_exact_i256_core_root.rs": "7502104CEE850E1B621EF35B88B56530D35195703372306F94AF8671A040AD1F",
    "rank8_delta01_e3_cubic_exact_i256_core_agent.rs": "B9A7398612EC8A77378CEB6CFE42FA461E45AB34381F978621608417677763E0",
    "produce_rank8_delta03_e5_quartic_center_two_cubic_quartic_leaf_i256_agent.rs": "B7E53FD2A4F487D952DC52C749B015A3DAD27C7409BFC09BD8B5768112139D2E",
    "produce_rank8_delta03_e5_quartic_center_two_cubic_quartic_leaf_i256_agent.exe": "495581BF9866EA5EA481B23CCA6A1DAFA438CC1006DF33310AE25CACEBF91367",
    "rank8_delta03_e5_quartic_center_two_cubic_quartic_leaf_i256_raw_agent_20260823.txt": "5C7119AACFC3D45E21ED2E7E0A362748E63D60301C358B975DB3B3B03A9892CE",
}


def sha256(path_value: Path) -> str:
    return hashlib.sha256(path_value.read_bytes()).hexdigest().upper()


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    lines = RAW.read_text(encoding="utf-8").splitlines()
    assert lines[0] == "PASS_I256_E5_QUARTIC_CENTER_TWO_CUBIC_QUARTIC_LEAF"
    rows = dict(line.split(" ", 1) for line in lines[1:])
    assert set(rows) == {
        "COUNTS", "UNSEEN", "LITERAL_CHECKS",
        "COEFFICIENT_MERKLE_STREAM", "FINITE_MERKLE_STREAM",
    }
    assert rows["COUNTS"] == "456876 324408 954323 1 954324"
    assert rows["UNSEEN"] == "3817296"
    assert rows["LITERAL_CHECKS"] == "24"
    for field in ("COEFFICIENT_MERKLE_STREAM", "FINITE_MERKLE_STREAM"):
        assert len(rows[field]) == 64
        int(rows[field], 16)
    payload = {
        "schema": "rank8-delta03-e5-quartic-center-two-cubic-quartic-leaf-all-order-exact-agent-v1",
        "status": "PASS_EXACT_RANK8_DELTA03_E5_QUARTIC_CENTER_TWO_CUBIC_QUARTIC_LEAF_N28_PLUS",
        "theorem": "For a quartic-leaf root in every subdivision of the quartic-center-two-cubic e=5 suppressed skeleton and every n>=28, Delta0 through Delta3 are strictly positive.",
        "root_orbit": "quartic_center_two_cubic:quartic_leaf",
        "quotient_counts": {
            "all_short_total": 456_876,
            "all_short_n28_plus": 324_408,
            "mixed_rays": 954_323,
            "all_long_rays": 1,
            "non_all_short_rays": 954_324,
        },
        "rank_ray_samples": 954_324 * 4 * 29,
        "samples_per_rank_ray": 29,
        "degree_bounds": {"0": 28, "1": 28, "2": 27, "3": 26},
        "newton_gate": "d0>0, d1>0, all remaining coefficients through the exact degree nonnegative, higher coefficients zero, and S=29 checked on every rank-ray",
        "unseen_S29_rank_checks": 3_817_296,
        "literal_formula_spot_checks": 24,
        "coefficient_merkle_stream_sha256": rows["COEFFICIENT_MERKLE_STREAM"],
        "finite_merkle_stream_sha256": rows["FINITE_MERKLE_STREAM"],
        "observed_primary_runtime_seconds": 56.548,
        "arithmetic": "six-thread checked signed i256 residual/Newton arithmetic and checked i128 independence-vector arithmetic",
        "immutable_input_hashes": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": "Exactly quartic_center_two_cubic:quartic_leaf for n>=28; independent audit remains required before promotion, and no other e=5 orbit is credited.",
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
