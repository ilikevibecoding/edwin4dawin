"""Exact certificate for the first positive-PF inner repeated collision.

For the odd reserve index r=8 and the boundary filter u=v=1, the normalized
Jensen/Turan discriminant K has a root

    y = 0.553104532669235...

inside the strip z=(r+5)y<r+5.  At this root D0,D2,E are positive and
K=4 D0 D2-E^2=0, so the null kernel is a repeated positive linear factor.
This script proves exactly that the derivative product of the two adjacent
rows is positive.  Thus the collision is benign even though it disproves the
stronger proposed statement that no positive-PF collision occurs inside the
strip.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from certify_pf_length3_inner_fixed_order_bernstein import (
    U,
    V,
    Y,
    normalized_inner_polynomials,
)
from prove_quartic_minimal_compatibility_resultants import X, window_polynomial


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "pf_length3_first_inner_repeated_collision_exact_20260807.json"


def primitive_digest(poly: sp.Poly) -> str:
    _, cleared = poly.clear_denoms(convert=True)
    _, primitive = cleared.primitive()
    coefficients = ",".join(map(str, primitive.all_coeffs()))
    return hashlib.sha256(coefficients.encode("ascii")).hexdigest()


def constant_sign_on_interval(poly: sp.Poly, left: sp.Rational, right: sp.Rational) -> int:
    """Return the rigorously constant sign of ``poly`` on [left,right]."""

    assert poly.eval(left) != 0 and poly.eval(right) != 0
    assert sp.polys.polytools.count_roots(poly, left, right) == 0
    value = poly.eval((left + right) / 2)
    assert value != 0
    return 1 if value > 0 else -1


def main() -> None:
    parity, reserve_index = "odd", 8
    p, alpha, normalized = normalized_inner_polynomials(
        parity, reserve_index, ordered_triangle=False
    )
    substitutions = {U: 1, V: 1}
    k = sp.Poly(normalized["K"].as_expr().subs(substitutions), Y, domain=sp.QQ)
    factorization = sp.factor_list(k.as_expr())
    assert factorization[0] != 0
    assert len(factorization[1]) == 1
    defining_polynomial = sp.Poly(factorization[1][0][0], Y, domain=sp.QQ)
    assert factorization[1][0][1] == 1
    assert defining_polynomial.degree() == 58
    assert sp.gcd(defining_polynomial, defining_polynomial.diff()).degree() == 0

    # A short decimal interval is used only through its exact rational bounds.
    left = sp.Rational(553104532669, 10**12)
    right = sp.Rational(553104532670, 10**12)
    assert 0 < left < right < 1
    assert sp.polys.polytools.count_roots(defining_polynomial, left, right) == 1

    normalized_minors = {
        name: sp.Poly(normalized[name].as_expr().subs(substitutions), Y, domain=sp.QQ)
        for name in ("D0", "D2", "E")
    }
    normalized_signs = {
        name: constant_sign_on_interval(poly, left, right)
        for name, poly in normalized_minors.items()
    }
    assert normalized_signs == {"D0": 1, "D2": 1, "E": 1}

    z = sp.Integer(reserve_index + 5) * Y
    gamma = [sp.Integer(1), sp.Integer(-2), sp.Integer(1)]
    rows = [
        sp.Poly(
            X**j * window_polynomial(p - 2 * j, alpha + j, gamma).as_expr(),
            X,
            domain=sp.QQ,
        )
        for j in range(4)
    ]
    values = [
        sp.Poly(row.as_expr().subs(X, -z), Y, domain=sp.QQ) for row in rows
    ]
    h0, h1, h2, h3 = [value.as_expr() for value in values]
    d0 = sp.Poly(h1**2 - h0 * h2, Y, domain=sp.QQ)
    d2 = sp.Poly(h2**2 - h1 * h3, Y, domain=sp.QQ)
    e = sp.Poly(h0 * h3 - h1 * h2, Y, domain=sp.QQ)
    raw_signs = {
        "D0": constant_sign_on_interval(d0, left, right),
        "D2": constant_sign_on_interval(d2, left, right),
        "E": constant_sign_on_interval(e, left, right),
    }
    assert raw_signs == {"D0": 1, "D2": 1, "E": 1}

    raw_k = sp.Poly(4 * d0.as_expr() * d2.as_expr() - e.as_expr() ** 2, Y, domain=sp.QQ)
    assert sp.rem(raw_k, defining_polynomial).is_zero

    # [D2,E,D0] is the exact null vector of both adjacent row triples.
    collision0 = sp.Poly(d2.as_expr() * h0 + e.as_expr() * h1 + d0.as_expr() * h2, Y)
    collision1 = sp.Poly(d2.as_expr() * h1 + e.as_expr() * h2 + d0.as_expr() * h3, Y)
    assert collision0.is_zero and collision1.is_zero

    derivatives = [row.diff().as_expr().subs(X, -z) for row in rows]
    orientation0 = sp.Poly(
        d2.as_expr() * derivatives[0]
        + e.as_expr() * derivatives[1]
        + d0.as_expr() * derivatives[2],
        Y,
        domain=sp.QQ,
    )
    orientation1 = sp.Poly(
        d2.as_expr() * derivatives[1]
        + e.as_expr() * derivatives[2]
        + d0.as_expr() * derivatives[3],
        Y,
        domain=sp.QQ,
    )
    orientation_signs = [
        constant_sign_on_interval(orientation0, left, right),
        constant_sign_on_interval(orientation1, left, right),
    ]
    assert orientation_signs == [-1, -1]

    midpoint = (left + right) / 2
    report = {
        "status": "PASS_EXACT_PF_LENGTH3_FIRST_INNER_REPEATED_COLLISION",
        "parameters": {
            "parity": parity,
            "reserve_index": reserve_index,
            "p": p,
            "alpha": alpha,
            "u": 1,
            "v": 1,
            "z_scale": reserve_index + 5,
        },
        "algebraic_collision": {
            "defining_polynomial_degree": defining_polynomial.degree(),
            "isolating_interval": [str(left), str(right)],
            "y_midpoint_approx": float(midpoint),
            "z_midpoint_approx": float((reserve_index + 5) * midpoint),
            "unique_root_in_interval": True,
            "K_vanishes_at_root": True,
        },
        "exact_checks": {
            "D0_D2_E_strictly_positive": True,
            "positive_repeated_factor": True,
            "both_adjacent_rows_vanish_at_collision": True,
            "orientation_factor_signs": orientation_signs,
            "derivative_product_strictly_positive": True,
        },
        "digests": {
            "defining_polynomial": primitive_digest(defining_polynomial),
            "D0": primitive_digest(d0),
            "D2": primitive_digest(d2),
            "E": primitive_digest(e),
            "orientation0": primitive_digest(orientation0),
            "orientation1": primitive_digest(orientation1),
        },
        "logical_implication": (
            "The first detected positive-PF repeated collision in the inner strip "
            "is genuine but benign: both derivative orientation factors have the "
            "same strict sign, so their product is positive."
        ),
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print("PASS_EXACT_PF_LENGTH3_FIRST_INNER_REPEATED_COLLISION")
    print(OUTPUT)


if __name__ == "__main__":
    main()
