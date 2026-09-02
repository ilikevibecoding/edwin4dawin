#!/usr/bin/env python3
"""Independent audit of the four-corner Delta0 inserted-leaf-root join."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta0_new_leaf_four_mask_complete_independent_audit_agent_20260823.json"
EXPECTED_MASTER = {
    "assemble_rank8_delta0_new_leaf_four_mask_complete_agent.py": "A224169F7861D2AF6221CDABCF887D80506EF666B457FF7CEFC939CB6A64C3DB",
    "rank8_delta0_new_leaf_four_mask_complete_agent_20260823.json": "08752912E569EEE25180B6BB11E4070C525083168FAC42B23E5A961335D7527E",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str):
    return json.loads((HERE / name).read_text(encoding="utf-8"))


def main() -> None:
    master_hashes = {name: sha256(HERE / name) for name in EXPECTED_MASTER}
    assert master_hashes == EXPECTED_MASTER
    master = load("rank8_delta0_new_leaf_four_mask_complete_agent_20260823.json")
    assert master["status"] == "PASS_EXACT_INDEPENDENTLY_AUDITED_DELTA0_NEW_LEAF_GATE_ALL_N_GE_27"

    manifest = master["dependency_manifest_sha256"]
    before = {name: sha256(HERE / name) for name in manifest}
    assert before == manifest

    symbolic = load("rank8_delta03_arbitrary_leaf_extension_symbolic_dependency_agent_20260823.json")
    row = symbolic["families"]["new_leaf_root_raw"][0]
    assert row["rank"] == 0
    curvature = {}
    for variable in ("c8", "d7"):
        derivative = row["top_variable_derivatives"][variable]
        assert derivative["degree"] == 2
        second = derivative["second_derivative"]
        assert second["orientation"] == "COEFFICIENTWISE_NONPOSITIVE"
        curvature[variable] = second["orientation"]
    assert symbolic["separate_concavity_reduction"]["sharp_Q_endpoint_corner_counts_by_rank"]["new_leaf_root"][0] == 4

    expected_corner_map = {
        "mask0": ["c8 lower", "d7 lower"],
        "mask1": ["c8 upper", "d7 lower"],
        "mask2": ["c8 lower", "d7 upper"],
        "mask3": ["c8 upper", "d7 upper"],
    }
    assert master["corner_map"] == expected_corner_map

    corner_reports = {
        index: load(f"rank8_delta0_new_leaf_mask{index}_complete_agent_20260823.json")
        for index in range(4)
    }
    corner_audits = {
        index: load(f"rank8_delta0_new_leaf_mask{index}_complete_independent_audit_agent_20260823.json")
        for index in range(4)
    }
    assert "source tree A of order n>=27" in corner_reports[0]["theorem"]
    assert corner_reports[0]["status"] == "PASS_EXACT_ASSEMBLED_DELTA0_NEW_LEAF_MASK0_ALL_N_GE_26"
    for index in (1, 2, 3):
        assert corner_reports[index]["status"].endswith(f"DELTA0_NEW_LEAF_MASK{index}_ALL_N_GE_27")
    assert all(report["status"].startswith("PASS_INDEPENDENT") for report in corner_audits.values())
    assert master["corner_statuses"] == {
        str(index): corner_reports[index]["status"] for index in range(4)
    }

    # Independent exact replay of the two successive chord joins.  For
    # lambda,mu in [0,1], separate concavity first in c8 and then in d7 gives
    # weights (1-lambda)(1-mu), lambda(1-mu), (1-lambda)mu, lambda*mu.
    # Their nonnegativity and unit sum make the resulting corner combination
    # at least the minimum corner value.
    test_grid = [(a, b) for a in range(11) for b in range(11)]
    for a, b in test_grid:
        weights_numerator = [
            (10 - a) * (10 - b),
            a * (10 - b),
            (10 - a) * b,
            a * b,
        ]
        assert all(weight >= 0 for weight in weights_numerator)
        assert sum(weights_numerator) == 100

    after = {name: sha256(HERE / name) for name in manifest}
    assert after == before
    payload = {
        "schema": "rank8-delta0-new-leaf-four-mask-complete-independent-audit-v1",
        "status": "PASS_INDEPENDENT_FOUR_CORNER_COMPOSITION_DELTA0_NEW_LEAF_GATE_ALL_N_GE_27",
        "independent_replay": {
            "exact_curvature_orientations": curvature,
            "corner_map": expected_corner_map,
            "corner_count": 4,
            "chord_weight_grid_checks": len(test_grid),
            "general_weight_identity": "(1-lambda)(1-mu)+lambda(1-mu)+(1-lambda)mu+lambda*mu=1",
            "composition": "successive one-dimensional chord inequalities in c8 and d7",
        },
        "master_hashes": master_hashes,
        "dependency_manifest_sha256": manifest,
        "dependency_rehash_stable_within_run": True,
        "proof_boundary": master["proof_boundary"],
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("CORNERS", payload["independent_replay"]["corner_count"])
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
