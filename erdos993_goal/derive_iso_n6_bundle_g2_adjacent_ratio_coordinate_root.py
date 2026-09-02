#!/usr/bin/env python3
"""Exact factorial-ratio coordinate lift for adjacent no-parent rank-six g2."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
INPUT = HERE / "iso_n6_bundle_g2_no_parent_occupation_exact_root_20260831.json"
OUTPUT = HERE / "iso_n6_bundle_g2_adjacent_ratio_coordinate_exact_root_20260831.json"
MARKER = "DERIVED_EXACT_ISO_N6_BUNDLE_G2_ADJACENT_RATIO_COORDINATE_ROOT"
SCALE = 1290240


def main():
    source = json.loads(INPUT.read_text(encoding="utf-8"))
    assert source["marker"] == "DERIVED_EXACT_ISO_N6_BUNDLE_G2_NO_PARENT_OCCUPATION_ROOT"
    a = sp.symbols("a0:8", nonnegative=True)
    b = sp.symbols("b0:7", nonnegative=True)
    c = sp.symbols("c0:7", nonnegative=True)
    locals_ = {str(x): x for x in (*a, *b, *c)}
    adjacent = sp.expand(sum(
        sp.sympify(source["pieces"][label], locals=locals_)
        for label in ("A2", "L2_AB", "L2_AC", "K2_BC")
    ))

    n = sp.Symbol("N", positive=True)
    ratios = sp.symbols("R1:7", nonnegative=True)
    r1, r2, r3, r4, r5, r6 = ratios
    arow = (
        sp.Integer(1), n, r1 / 4,
        r1 * r2 / (24 * n),
        r1 * r2 * r3 / (192 * n**2),
        r1 * r2 * r3 * r4 / (1920 * n**3),
        r1 * r2 * r3 * r4 * r5 / (23040 * n**4),
        r1 * r2 * r3 * r4 * r5 * r6 / (322560 * n**5),
    )
    specialized = sp.expand(adjacent.subs(dict(zip(a, arow))))
    scaled = sp.cancel(SCALE * n**5 * specialized)
    numerator, denominator = sp.fraction(scaled)
    assert denominator == 1
    numerator = sp.expand(numerator)
    live = (*b[2:7], *c[2:7])
    polynomial = sp.Poly(numerator, *live)
    degrees = {str(x): polynomial.degree(x) for x in live}
    assert all(degree <= 1 for degree in degrees.values())

    edge = sp.Symbol("e", nonnegative=True)
    sticks = sp.symbols("s0:5", nonnegative=True)
    s0, s1, s2, s3, s4 = sticks
    exact_r1 = 2 * n * (n - 1) - 4 * edge
    budget = exact_r1 - 4 * n
    terminal = budget * s0
    d5 = budget * (1 - s0) * s1
    d4 = budget * (1 - s0) * (1 - s1) * s2
    d3 = budget * (1 - s0) * (1 - s1) * (1 - s2) * s3
    d2 = budget * (1 - s0) * (1 - s1) * (1 - s2) * (1 - s3) * s4
    d1 = budget * (1 - s0) * (1 - s1) * (1 - s2) * (1 - s3) * (1 - s4)
    reconstructed = (
        terminal + 4 * n + d5 + d4 + d3 + d2 + d1,
        terminal + 4 * n + d5 + d4 + d3 + d2,
        terminal + 3 * n + d5 + d4 + d3,
        terminal + 2 * n + d5 + d4,
        terminal + n + d5,
        terminal,
    )
    assert sp.expand(reconstructed[0] - exact_r1) == 0
    drops = tuple(sp.expand(reconstructed[index] - reconstructed[index + 1]) for index in range(5))
    expected_drops = (d1, n + d2, n + d3, n + d4, n + d5)
    assert all(sp.expand(left - right) == 0 for left, right in zip(drops, expected_drops))

    # Do not fully expand the five-dimensional stick substitution here.  The
    # unexpanded substitution is an exact ring homomorphism, while forcing it
    # into one enormous Poly consumes gigabytes without proving a sign claim.
    # The downstream Bernstein producer performs the substitution branchwise.
    parameterization_stream = "|".join(str(value) for value in reconstructed)
    report = {
        "marker": MARKER, "rank": 6, "coefficient": "g2",
        "scope": "adjacent marks in canonical no_parent_k0 mode; exact algebra only",
        "normalized_A_row": [str(x) for x in arow],
        "positive_multiplier": f"{SCALE}*N^5",
        "scaled_terms_before_drop_parameterization": len(sp.Poly(numerator).terms()),
        "scaled_expression_sha256": hashlib.sha256(str(numerator).encode()).hexdigest().upper(),
        "B_C_live_degrees": degrees,
        "all_ten_B_C_variables_multi_affine": True,
        "ratio_input": (
            "For an N-vertex forest A with N>=13, the proved Q3,Q4,Q5,Q6 reserves give "
            "delta2,delta3,delta4,delta5>=1; delta1>=0."
        ),
        "edge_identity": "R1=N*rho1=2*N*(N-1)-4*e(A)",
        "mandatory_drop_budget": "R1-4*N",
        "stick_coordinates": {
            "terminal": str(terminal), "D5": str(d5), "D4": str(d4),
            "D3": str(d3), "D2": str(d2), "D1": str(d1),
        },
        "reconstructed_ratios": [str(x) for x in reconstructed],
        "drop_identities": [str(x) for x in drops],
        "parameterization_expansion_deferred": True,
        "parameterization_stream_sha256": hashlib.sha256(parameterization_stream.encode()).hexdigest().upper(),
        "status": "exact ratio-coordinate reduction; Bernstein sign certificate remains open",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "scaled_terms": report["scaled_terms_before_drop_parameterization"],
        "parameterization_expansion_deferred": report["parameterization_expansion_deferred"],
        "live_degrees": degrees,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
