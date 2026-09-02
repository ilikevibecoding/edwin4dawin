#!/usr/bin/env python3
"""Exact four-endpoint reduction for adjacent no-parent rank-six g2.

The induced rows B,C lie coefficientwise below A.  The g2 derivatives in
b5,b6,c5,c6 are strictly negative, so replacing those four coefficients by
their A ceilings gives a lower bound.  The remaining expression is affine in
each of b4,c4.  The universal forest Q3 theorem and path minimality therefore
reduce the sign problem to four exact endpoint expressions.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
INPUT = HERE / "iso_n6_bundle_g2_no_parent_occupation_exact_root_20260831.json"
OUTPUT = HERE / "iso_n6_bundle_g2_adjacent_q3_endpoint_reduction_exact_root_20260831.json"
MARKER = "DERIVED_EXACT_ISO_N6_BUNDLE_G2_ADJACENT_Q3_ENDPOINT_REDUCTION_ROOT"

DEPENDENCIES = {
    "RANK3_THREE_HALVES_FOREST_CERTIFICATE_2026-07-27.md":
        "0CAD18D9D3EDDF05581AC7909CB1F52932FE43FB522CD24AF55D9F61395DB3DE",
    "verify_rank3_three_halves_forest_certificate.py":
        "F78396D95B3CF18C73E5A1586E1B712731E319D9530D01A1AFDA3856CFBAD76D",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def choose_polynomial(value, rank):
    out = sp.Integer(1)
    for offset in range(rank):
        out *= value - offset
    return sp.expand(out / sp.factorial(rank))


def main():
    assert {name: sha256(HERE / name) for name in DEPENDENCIES} == DEPENDENCIES
    source = json.loads(INPUT.read_text(encoding="utf-8"))
    assert source["marker"] == "DERIVED_EXACT_ISO_N6_BUNDLE_G2_NO_PARENT_OCCUPATION_ROOT"
    a = sp.symbols("a0:8", nonnegative=True)
    b = sp.symbols("b0:7", nonnegative=True)
    c = sp.symbols("c0:7", nonnegative=True)
    locals_ = {str(x): x for x in (*a, *b, *c)}
    expression = sp.expand(sum(
        sp.sympify(source["pieces"][label], locals=locals_)
        for label in ("A2", "L2_AB", "L2_AC", "K2_BC")
    ))

    derivatives = {str(variable): sp.factor(sp.diff(expression, variable))
                   for variable in (b[5], b[6], c[5], c[6])}
    expected = {
        "b5": -16*a[1] - 9*a[2] - 7*c[1],
        "b6": -7*a[1],
        "c5": -16*a[1] - 9*a[2] - 7*b[1],
        "c6": -7*a[1],
    }
    assert all(sp.expand(derivatives[name] - value) == 0 for name, value in expected.items())
    lowered = sp.expand(expression.subs({b[5]: a[5], b[6]: a[6],
                                         c[5]: a[5], c[6]: a[6]}))
    assert sp.Poly(lowered, b[4], c[4]).degree(b[4]) <= 1
    assert sp.Poly(lowered, b[4], c[4]).degree(c[4]) <= 1

    path_b4 = choose_polynomial(b[1] - 3, 4)
    path_c4 = choose_polynomial(c[1] - 3, 4)
    q3_b4 = sp.cancel(b[3] * (6*b[3] - b[2]) / (8*b[2]))
    q3_c4 = sp.cancel(c[3] * (6*c[3] - c[2]) / (8*c[2]))
    endpoints = {}
    for upper_b in (0, 1):
        for upper_c in (0, 1):
            endpoint = sp.cancel(lowered.subs({
                b[4]: q3_b4 if upper_b else path_b4,
                c[4]: q3_c4 if upper_c else path_c4,
            }))
            numerator, denominator = sp.fraction(endpoint)
            numerator = sp.expand(numerator)
            endpoints[f"B{'Q3' if upper_b else 'PATH'}_C{'Q3' if upper_c else 'PATH'}"] = {
                "numerator_terms": len(sp.Poly(numerator).terms()),
                "denominator": str(denominator),
                "numerator_sha256": hashlib.sha256(str(numerator).encode()).hexdigest().upper(),
                "degrees_b2_b3_c2_c3": {
                    str(variable): sp.Poly(numerator, variable).degree()
                    for variable in (b[2], b[3], c[2], c[3])
                },
            }

    # Pascal verifies the path-minimal induction step:
    # L(m-1,k)+L(m-2,k-1)=L(m,k), L(m,k)=C(m-k+1,k).
    m, k = sp.symbols("m k", integer=True, nonnegative=True)
    path_induction_rank4 = sp.expand(
        choose_polynomial((m - 1) - 4 + 1, 4)
        + choose_polynomial((m - 2) - 3 + 1, 3)
        - choose_polynomial(m - 4 + 1, 4)
    )
    assert path_induction_rank4 == 0

    report = {
        "marker": MARKER,
        "rank": 6,
        "coefficient": "g2",
        "scope": "adjacent marks in canonical no_parent_k0 mode; exact reduction, not final sign theorem",
        "induced_containment": "0<=b_k,c_k<=a_k coefficientwise",
        "strictly_nonpositive_derivatives": {name: str(value) for name, value in derivatives.items()},
        "ceiling_substitution": "b5=c5=a5 and b6=c6=a6 gives a lower bound",
        "remaining_b4_c4_biaffine": True,
        "q3_upper_bounds": {
            "B": "b4 <= b3*(6*b3-b2)/(8*b2)",
            "C": "c4 <= c3*(6*c3-c2)/(8*c2)",
            "source": "universal forest Q3>=0 theorem",
        },
        "path_lower_bounds": {
            "B": str(path_b4), "C": str(path_c4),
            "induction_pascal_residual_rank4": str(path_induction_rank4),
        },
        "endpoint_count": len(endpoints),
        "endpoints": endpoints,
        "dependencies_sha256": DEPENDENCIES,
        "status": "exact four-endpoint reduction; endpoint positivity remains open",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({"marker": MARKER, "derivatives": report["strictly_nonpositive_derivatives"],
                      "endpoint_count": 4, "endpoints": endpoints}, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
