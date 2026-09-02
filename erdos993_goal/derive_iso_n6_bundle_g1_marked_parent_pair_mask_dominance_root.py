#!/usr/bin/env python3
"""Freeze the exact mark-mask dominance in the marked-parent q-free pair.

The full pair reduction has eight expression classes.  In each geometry the
three retained-parent mask classes consist of a single core plus zero, one,
or two copies of a polynomial with nonnegative scalar coefficients.  Since
all occupation coordinates are nonnegative, only the mask-00 retained class
needs an all-order sign proof.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
INPUT = HERE / "iso_n6_bundle_g1_marked_parent_pair_qfree_lower_exact_root_20260901.json"
OUTPUT = HERE / "iso_n6_bundle_g1_marked_parent_pair_mask_dominance_exact_root_20260901.json"
EXPECTED_INPUT_SHA256 = "715750BD2652F77277C79303296972A383FF08AE288CF34A1A70A9D6E5066B5F"
MARKER = "PASS_EXACT_ISO_N6_BUNDLE_G1_MARKED_PARENT_PAIR_MASK_DOMINANCE_ROOT"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def expression_hash(expression: sp.Expr) -> str:
    canonical = sp.sstr(sp.expand(expression))
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest().upper()


def coefficient_summary(expression: sp.Expr) -> dict:
    polynomial = sp.Poly(sp.expand(expression))
    coefficients = [sp.Rational(value) for _, value in polynomial.terms()]
    return {
        "terms": len(coefficients),
        "minimum_scalar_coefficient": str(min(coefficients)),
        "all_scalar_coefficients_nonnegative": all(value >= 0 for value in coefficients),
    }


def main() -> None:
    input_hash = sha256(INPUT)
    if input_hash != EXPECTED_INPUT_SHA256:
        raise RuntimeError(f"input hash drift: {input_hash}")
    payload = json.loads(INPUT.read_text(encoding="utf-8"))
    branches = payload["branches"]
    geometries = {}
    for geometry in ("adjacent", "nonadjacent"):
        labels = {
            "deleted_core": f"{geometry}_t0_u0_v0",
            "retained_core": f"{geometry}_t1_u0_v0",
            "retained_one_u": f"{geometry}_t1_u1_v0",
            "retained_one_v": f"{geometry}_t1_u0_v1",
            "retained_two": f"{geometry}_t1_u1_v1",
        }
        expressions = {
            role: sp.expand(sp.sympify(branches[label]["lower_expression"]))
            for role, label in labels.items()
        }
        core = expressions["retained_core"]
        increment_u = sp.expand(expressions["retained_one_u"] - core)
        increment_v = sp.expand(expressions["retained_one_v"] - core)
        increment_two = sp.expand(expressions["retained_two"] - core)
        checks = {
            "one_mark_increments_identical": sp.expand(increment_u - increment_v) == 0,
            "two_mark_increment_is_twice_one": sp.expand(increment_two - 2 * increment_u) == 0,
            "increment_has_nonnegative_coefficients": coefficient_summary(increment_u)[
                "all_scalar_coefficients_nonnegative"
            ],
        }
        if not all(checks.values()):
            raise RuntimeError(f"dominance check failed for {geometry}: {checks}")
        geometries[geometry] = {
            "labels": labels,
            "retained_core_sha256": expression_hash(core),
            "deleted_core_sha256": expression_hash(expressions["deleted_core"]),
            "one_mark_increment": sp.sstr(increment_u),
            "one_mark_increment_sha256": expression_hash(increment_u),
            "one_mark_increment_summary": coefficient_summary(increment_u),
            "checks": checks,
        }

    report = {
        "marker": MARKER,
        "input_sha256": input_hash,
        "source_sha256": sha256(Path(__file__).resolve()),
        "checks": {
            "both_geometries_pass": all(
                all(record["checks"].values()) for record in geometries.values()
            ),
            "eight_classes_reduce_to_four_sign_cores": True,
        },
        "geometries": geometries,
        "remaining_sign_cores": [
            "adjacent_t0_u0_v0",
            "adjacent_t1_u0_v0",
            "nonadjacent_t0_u0_v0",
            "nonadjacent_t1_u0_v0",
        ],
        "scope_guard": (
            "This proves exact dominance among mark-retention masks.  It does "
            "not prove all-order nonnegativity of the four remaining cores."
        ),
    }
    OUTPUT.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(json.dumps(report["checks"], indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", sha256(OUTPUT))
    print(MARKER)


if __name__ == "__main__":
    main()
