#!/usr/bin/env python3
"""Independent literal-tree replay of the Delta3 e=1 near=4 certificate."""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path

from literal_tree_dp_audit_rank8_e1_old_root_machinery_agent_20260825 import (
    audit_certificate,
)


HERE = Path(__file__).resolve().parent
CERTIFICATE = HERE / "rank8_delta3_e1_old_root_near4_complete_exact_agent_20260825.json"
OUTPUT = HERE / "rank8_delta3_e1_old_root_near4_complete_independent_audit_agent_20260825.json"
PINNED = {
    "verify_rank8_q8_terminal_reduction.py":
        "389216D19951A28784C46E57393F1F9CD5BBE41625DCD317C664F701EC2EC4B7",
    "literal_tree_dp_audit_rank8_e1_old_root_machinery_agent_20260825.py":
        "3285637D2B4E95D8C4CB5510F3E5161BEEA2FDE5869EF79265378AA709FC9140",
    "prove_rank8_delta3_e1_old_root_near4_complete_agent_20260825.py":
        "137C432F6D9443BCF3899BD51C209626E218576006768AFBA2CF13451B5FB670",
    "rank8_delta3_e1_old_root_near4_complete_exact_agent_20260825.json":
        "E69F15296143D84C1D2B85086751628B9EEC05504055B9947389EC2CBC385878",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def atomic_json(path: Path, payload: dict[str, object]) -> None:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, path)


def main() -> None:
    actual_hashes = {name: sha256(HERE / name) for name in PINNED}
    assert actual_hashes == PINNED, (actual_hashes, PINNED)
    certificate = json.loads(CERTIFICATE.read_text(encoding="utf-8"))
    assert certificate["source_order_condition"] == (
        "tail+2*short+difference>=15"
    )
    replay = audit_certificate(
        certificate,
        expected_status=(
            "PASS_EXACT_DELTA3_E1_OLD_ROOT_NEAR4_ALL_ORDER_ALL_EXTENSIONS"
        ),
        rank=3,
        near=4,
        threshold=15,
        degree=26,
        split=5,
    )
    assert replay["source_expression_terms"] == certificate[
        "source_expression_terms"
    ]
    assert replay["replayed"] == {
        "original_partition_cells": 240,
        "original_coefficientwise_cells": 183,
        "original_mixed_cells": 57,
        "univariate_refined_cells": 30,
        "bivariate_bulk_tensors": 24,
        "bivariate_fixed_short_rays": 60,
        "trivariate_partition_regions": 93,
        "literal_finite_prefix_values": 180,
        "shifted_ray_newton_coefficients": 2430,
        "all_stored_ordered_coefficient_digests_matched": True,
        "all_stored_literal_prefixes_matched": True,
        "all_original_obstructions_covered_exactly_once": True,
        "all_proving_newton_coefficients_nonnegative": True,
        "all_proving_origins_positive": True,
    }
    payload = {
        "schema": "rank8-delta3-e1-old-root-near4-complete-independent-audit-agent-v1",
        "status": "PASS_INDEPENDENT_GENERIC_TREE_DP_DELTA3_E1_OLD_ROOT_NEAR4_COMPLETE",
        "audited_theorem_status": certificate["status"],
        **replay,
        "dependency_sha256": actual_hashes,
        "proof_boundary": certificate["proof_boundary"],
        "source_sha256": sha256(Path(__file__)),
    }
    atomic_json(OUTPUT, payload)
    print(payload["status"])
    print("REPLAYED", payload["replayed"])
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
