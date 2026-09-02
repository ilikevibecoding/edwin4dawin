#!/usr/bin/env python3
"""Assemble an exact all-order theorem certificate for one homogeneous layer."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

from analyze_group_arbitrary_layer_schur_pattern import derive_selector


HERE = Path(__file__).resolve().parent


def digest(value: object) -> str:
    return hashlib.sha256(str(value).encode()).hexdigest()


def load(path: Path) -> dict[str, object]:
    return json.loads(path.read_text(encoding="utf-8"))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--layer", type=int, required=True)
    parser.add_argument("--ordinal", required=True)
    parser.add_argument("--upper", type=Path, required=True)
    parser.add_argument("--parity", type=Path, required=True)
    parser.add_argument("--boundaries", type=Path, required=True)
    parser.add_argument("--verification", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    layer = args.layer
    tail_order = layer // 2 + 2
    upper = load(args.upper)
    assert upper["status"] == "ARBITRARY_LAYER_SCHUR_PATTERN_AUDIT"
    assert len(upper["records"]) == 1
    upper_record = upper["records"][0]
    assert upper_record["layer_deficit"] == layer
    assert upper_record["tail_order"] == tail_order
    assert all(item["identity"] for item in upper_record["simple_couplings"])
    assert (
        len(upper_record["simple_couplings"])
        + len(upper_record["nonsimple_couplings"])
        == tail_order - 1
    )
    for coupling in upper_record["nonsimple_couplings"]:
        assert coupling["numerator_coefficientwise_positive"]
        assert coupling["denominator_coefficientwise_positive"]

    parity = load(args.parity)
    assert parity["status"] == f"EXACT_S{layer}_UPPER_PARITY_IDENTITY"
    assert all(parity[f"A{tail_order}_coefficient_identities"])
    assert all(parity[f"B{tail_order - 1}_coefficient_identities"])

    boundaries = load(args.boundaries)
    assert boundaries["status"] == f"EXACT_S{layer}_BOUNDARY_POSITIVE_JACOBI_AUDIT"
    assert len(boundaries["cases"]) == 2 * layer
    for case in boundaries["cases"]:
        assert len(case["couplings"]) == tail_order - 1
        for coupling in case["couplings"]:
            assert coupling["numerator_coefficientwise_positive"]
            assert coupling["denominator_coefficientwise_positive"]

    verification = load(args.verification)
    assert verification["status"] == f"PASS_EXACT_S{layer}_TAIL_THEOREM_CROSSCHECK"
    assert verification["comparison_count"] > 0
    assert verification["small_base_case_count"] > 0

    p, alpha, selector = derive_selector(layer)
    assert len(selector) == tail_order + 1
    status = f"ALL_ORDER_{args.ordinal.upper()}_HOMOGENEOUS_LAYER_THEOREM"
    report = {
        "status": status,
        "layer_deficit": layer,
        "selector_degree": tail_order,
        "selector_derived_directly_from_defect_sum": True,
        "selector_variables": [str(p), str(alpha)],
        "selector_coefficient_digests": [digest(value) for value in selector],
        "upper_positive_jacobi_couplings": upper_record,
        "upper_parities_identical": True,
        "boundary_family_count": len(boundaries["cases"]),
        "boundary_positive_jacobi_families": boundaries["cases"],
        "exact_symbolic_to_row_comparison_count": verification["comparison_count"],
        "small_base_cases": verification["small_base_cases"],
        "small_base_case_count": verification["small_base_case_count"],
        "proof_consequence": (
            f"Every s={layer} residual row is the characteristic polynomial "
            "of a real symmetric Jacobi extension and has strictly negative "
            "roots throughout 2d-N>=5."
        ),
    }
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"status": status, "report": str(args.output)}, indent=2))


if __name__ == "__main__":
    main()
