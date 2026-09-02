#!/usr/bin/env python3
"""Fail-closed seal for the checked-i256 four-cubic-star leaf producer."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
RAW = ROOT / "rank8_delta03_e4_four_cubic_star_leaf_i256_raw_root_20260823.txt"
OUTPUT = ROOT / "rank8_delta03_e4_four_cubic_star_leaf_all_order_exact_root_20260823.json"
EXPECTED = {
    "rank8_delta03_e4_skeleton_root_partition_exact_agent_20260823.json":
        "E68D35E2CA3D5E061AACB7D45CD5B5D5A5ABA61FB0F8621111367E0CC1BA8F28",
    "rank8_delta03_e4_skeleton_root_partition_independent_audit_agent_20260823.json":
        "207813C6F056BA63945B0025A0E1E907117F2CD09DA88891BD0F7820636C065C",
    "rank8_delta03_e4_skeletons_order27_exact_agent_20260823.json":
        "257C7549AFEB4BB70ACAAA3DE416A27E5C14565EBEB4A56BC0E2343629498C8E",
    "rank8_delta03_e4_skeletons_order27_independent_audit_agent_20260823.json":
        "FFC1EE49014697148539AC7701DCA1446C33D483C491F96DE8E298B6B93DB4E6",
    "rank8_delta03_e4_bistar_complete_exact_agent_20260823.json":
        "67D0D9288F3C276523B6B2C91F68D0216E32C259C5D179E56F920E392D39E6A4",
    "rank8_delta03_e4_bistar_complete_independent_audit_agent_20260823.json":
        "094E8B7C13737C20037A0BB162A16D3351E5B4553D41EEC9914B9E46757CDF4F",
    "rank8_delta03_e4_four_cubic_star_center_branch_all_order_exact_root_20260823.json":
        "0D9F29ACA9AD714C77841A91111A4542546E18190C6600EEBCA315EA8DC0508C",
    "rank8_delta03_e4_four_cubic_star_center_branch_all_order_independent_audit_root_20260823.json":
        "8043EEBCE2D48F340AAC9D99FB9ABCB10004933209F588AFDC407008BC3534C5",
    "certify_rank8_delta03_e4_four_cubic_star_leaf_newton_reduction_root.py":
        "76F9EF729173B929AD304388731A00E275E640CCA002C7B063C94CA8BA515E9D",
    "rank8_delta03_e4_four_cubic_star_leaf_newton_reduction_exact_root_20260823.json":
        "985070390050F9F77AD5C3CF6643F83405EB3B1EBDBAEE5CCFF03136101FB1D1",
    "rank8_delta03_e4_literal_i256_audit_common_agent.rs":
        "BB9C7E541959A256F4B215C32675D1C1F617DBC097E4B2194A3B0735A16938B6",
    "rank8_delta03_e3_cubic_exact_i256_core_root.rs":
        "7502104CEE850E1B621EF35B88B56530D35195703372306F94AF8671A040AD1F",
    "rank8_delta01_e3_cubic_exact_i256_core_agent.rs":
        "B9A7398612EC8A77378CEB6CFE42FA461E45AB34381F978621608417677763E0",
    "produce_rank8_delta03_e4_four_cubic_star_leaf_i256_root.rs":
        "0B37475501316E536C4E6A49FC59365295174623A5F6596830B792C744215258",
    "produce_rank8_delta03_e4_four_cubic_star_leaf_i256_root.exe":
        "C1CF8E68BFAFBC5108F1CC267CE68E47A9D3DDD6AB7C8DD64A84FAE51153EF40",
    "rank8_delta03_e4_four_cubic_star_leaf_i256_raw_root_20260823.txt":
        "6CEC13FAE86478313B6FA7CB9713CEE2184E30A926880DFD3E141EC10E0AAD20",
}


def sha256(path_value: Path) -> str:
    return hashlib.sha256(path_value.read_bytes()).hexdigest().upper()


def main() -> None:
    assert "FILL_RAW" not in EXPECTED.values()
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    lines = RAW.read_text(encoding="utf-8").splitlines()
    assert lines[0] == "PASS_I256_FOUR_CUBIC_STAR_LEAF_PRODUCER"
    rows = dict(line.split(" ", 1) for line in lines[1:])
    assert set(rows) == {
        "COUNTS", "UNSEEN", "LITERAL_SPOT_CHECKS",
        "COEFFICIENT_MERKLE_STREAM", "FINITE_MERKLE_STREAM",
    }
    assert rows["COUNTS"] == "3198132 2939106 8091467 1 8091468"
    assert rows["UNSEEN"] == "32365872"
    assert rows["LITERAL_SPOT_CHECKS"] == "192"
    assert len(rows["COEFFICIENT_MERKLE_STREAM"]) == 64
    assert len(rows["FINITE_MERKLE_STREAM"]) == 64
    payload = {
        "schema": "rank8-delta03-e4-four-cubic-star-leaf-all-order-exact-root-v1",
        "status": "PASS_EXACT_RANK8_DELTA03_E4_FOUR_CUBIC_STAR_LEAF_N27_PLUS",
        "theorem": "For a terminal leaf root in every four-cubic-star e=4 subdivision and every n>=27, Delta0 through Delta3 are strictly positive.",
        "root_orbit": "four_cubic_star:leaf",
        "quotient_counts": {
            "all_short_total": 3_198_132,
            "all_short_n27_plus": 2_939_106,
            "mixed_rays": 8_091_467,
            "all_long_rays": 1,
            "non_all_short_rays": 8_091_468,
        },
        "rank_ray_samples": 8_091_468 * 4 * 29,
        "samples_per_rank_ray": 29,
        "degree_bounds": {"0": 28, "1": 28, "2": 27, "3": 26},
        "newton_gate": "d0>0,d1>0,d2..d_degree>=0, zero above the exact degree, plus checked unseen S=29 equality on every rank-ray",
        "unseen_S29_rank_checks": 32_365_872,
        "literal_formula_spot_checks": 192,
        "coefficient_merkle_stream_sha256": rows["COEFFICIENT_MERKLE_STREAM"],
        "finite_merkle_stream_sha256": rows["FINITE_MERKLE_STREAM"],
        "arithmetic": "six-thread checked signed i256 residual/Newton arithmetic and checked i128 independence-vector arithmetic",
        "immutable_input_hashes": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": "Exactly four_cubic_star:leaf; no other root orbit is credited.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("FINITE", payload["quotient_counts"]["all_short_n27_plus"])
    print("RAYS", payload["quotient_counts"]["non_all_short_rays"])
    print("STREAM", payload["coefficient_merkle_stream_sha256"], payload["finite_merkle_stream_sha256"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
