#!/usr/bin/env python3
"""Find an exact order cutoff for the mixed Delta1/Q7 corner.

The full n>=28 box is genuinely negative at its enlarged corner
W=A=1, U=0, K=1, V=0, Z=floor.  This script keeps n symbolic, evaluates that
same moving corner, and searches for a tail cutoff whose shifted numerator and
denominator have coefficientwise-positive power expansions.  The result only
diagnoses this corner; it is not a full tensor certificate.
"""

from __future__ import annotations

import hashlib
import json
import pickle
from pathlib import Path

import sympy as sp

from probe_rank8_delta01_source_curvatures_root import build


HERE = Path(__file__).resolve().parent
BUILDER = HERE / "probe_rank8_delta01_source_curvatures_root.py"
BUILDER_SHA256 = "C67587B658BA75E9A2DF0E42631E03A8746DA4D86420729C40D28296FE6682FF"
CACHE = HERE / "_cache_rank8_delta1_q7_lcross_source_root.pkl"
OUTPUT = HERE / "rank8_delta1_q7_lcross_worst_vertex_tail_exact_root_20260826.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load_or_build():
    assert sha256(BUILDER) == BUILDER_SHA256
    if CACHE.exists():
        cached = pickle.loads(CACHE.read_bytes())
        assert cached["builder_sha256"] == BUILDER_SHA256
        return cached["value"], cached["variables"], True
    value, variables = build(1, "q7", "lcross")
    CACHE.write_bytes(
        pickle.dumps(
            {
                "builder_sha256": BUILDER_SHA256,
                "value": value,
                "variables": variables,
            },
            protocol=pickle.HIGHEST_PROTOCOL,
        )
    )
    return value, variables, False


def shifted_coefficients(expression: sp.Expr, variable: sp.Symbol, cutoff: int):
    s = sp.symbols("s", nonnegative=True)
    shifted = sp.Poly(sp.expand(expression.subs(variable, cutoff + s)), s, domain=sp.QQ)
    return [shifted.nth(power) for power in range(shifted.degree() + 1)]


def main() -> None:
    value, (n, w, x, U, K, V, Z), cache_hit = load_or_build()
    t = 1 / n
    y = 3 + sp.Rational(546, 25) * t
    r = sp.Rational(4, 3) + sp.Rational(1008, 173) * t
    floor = (n - 19) / (n - 12)
    corner = sp.cancel(
        value.subs(
            {
                w: t * y,
                x: t * y * r,
                U: 0,
                K: 1,
                V: 0,
                Z: floor,
            }
        )
    )
    numerator, denominator = map(sp.factor, sp.fraction(corner))
    numerator_poly = sp.Poly(sp.expand(numerator), n, domain=sp.QQ)
    denominator_poly = sp.Poly(sp.expand(denominator), n, domain=sp.QQ)

    integer_values = []
    for order in range(28, 81):
        exact = sp.factor(corner.subs(n, order))
        integer_values.append(
            {
                "n": order,
                "sign": -1 if exact < 0 else (1 if exact > 0 else 0),
                "value": str(exact),
            }
        )

    sufficient_cutoff = None
    cutoff_certificate = None
    for cutoff in range(28, 501):
        numerator_coefficients = shifted_coefficients(numerator, n, cutoff)
        denominator_coefficients = shifted_coefficients(denominator, n, cutoff)
        if (
            numerator_coefficients[0] > 0
            and all(coefficient >= 0 for coefficient in numerator_coefficients)
            and denominator_coefficients[0] > 0
            and all(coefficient >= 0 for coefficient in denominator_coefficients)
        ):
            sufficient_cutoff = cutoff
            cutoff_certificate = {
                "numerator_degree": len(numerator_coefficients) - 1,
                "denominator_degree": len(denominator_coefficients) - 1,
                "numerator_minimum_shifted_power_coefficient": str(
                    min(numerator_coefficients)
                ),
                "denominator_minimum_shifted_power_coefficient": str(
                    min(denominator_coefficients)
                ),
                "numerator_zero_coefficients": sum(
                    bool(coefficient == 0) for coefficient in numerator_coefficients
                ),
                "denominator_zero_coefficients": sum(
                    bool(coefficient == 0) for coefficient in denominator_coefficients
                ),
            }
            break

    status = (
        "PASS_EXACT_WORST_VERTEX_EVENTUALLY_POSITIVE_BY_SHIFTED_POWER_COEFFICIENTS"
        if sufficient_cutoff is not None
        else "WORST_VERTEX_TAIL_CUTOFF_NOT_FOUND_THROUGH_500"
    )
    payload = {
        "schema": "rank8-delta1-q7-lcross-worst-vertex-tail-exact-root-v1",
        "status": status,
        "scope_warning": (
            "This is one moving vertex of an enlarged analytic box, not a full "
            "Delta1 tensor and not a tree counterexample or theorem."
        ),
        "moving_corner": {
            "W": 1,
            "A": 1,
            "U": 0,
            "K": 1,
            "V": 0,
            "Z": "(n-19)/(n-12)",
            "y": str(y),
            "r": str(r),
        },
        "numerator_degree_n": numerator_poly.degree(),
        "denominator_degree_n": denominator_poly.degree(),
        "numerator_factorization": str(numerator),
        "denominator_factorization": str(denominator),
        "integer_values_n28_to_n80": integer_values,
        "last_negative_integer_through_80": max(
            (row["n"] for row in integer_values if row["sign"] < 0),
            default=None,
        ),
        "first_nonnegative_integer_through_80": next(
            (row["n"] for row in integer_values if row["sign"] >= 0),
            None,
        ),
        "sufficient_all_real_tail_cutoff": sufficient_cutoff,
        "shifted_power_certificate": cutoff_certificate,
        "source_cache_hit": cache_hit,
        "immutable_inputs": {
            BUILDER.name: BUILDER_SHA256,
            "verify_rank7_terminal_broom_middle_differences.py": sha256(
                HERE / "verify_rank7_terminal_broom_middle_differences.py"
            ),
            "verify_rank8_q8_terminal_reduction.py": sha256(
                HERE / "verify_rank8_q8_terminal_reduction.py"
            ),
        },
        "source_sha256": sha256(Path(__file__)),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(status)
    print("CACHE_HIT", cache_hit)
    print("LAST_NEGATIVE_THROUGH_80", payload["last_negative_integer_through_80"])
    print("TAIL_CUTOFF", sufficient_cutoff)
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
