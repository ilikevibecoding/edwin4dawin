#!/usr/bin/env python3
"""Exact certificate against the simultaneous-proper-position threshold.

The example satisfies all of the tempting abstract hypotheses retained by
the Erdős endpoint—negative roots, a common largest double root, matching
leading coefficients, h proper with g, and h proper with g'—but its
degree-four, order-three endpoint polynomial is not real stable.
"""

from __future__ import annotations

import json
import math
from pathlib import Path

import sympy as sp


X, Y, z = sp.symbols("X Y z")
OUT = Path("double_proper_common_root_counterexample_20260802.json")


def derivative_square(poly: sp.Expr, order: int) -> sp.Expr:
    return sp.expand(sum(
        sp.binomial(order, k) * sp.diff(poly, X, k)
        * sp.diff(poly.subs(X, Y), Y, order-k)
        for k in range(order+1)
    ))


def main() -> None:
    c = sp.Rational(3978197409, 62500000)
    g = sp.expand(X**2 * (X+70) * (X+56))
    h = sp.expand(4 * X**2 * (X+c))
    gp = sp.diff(g, X)
    p = sp.Poly(sp.cancel(gp/X), X)
    q = sp.Poly(sp.cancel(h/X), X)

    assert sp.Poly(g, X).LC() == 1
    assert sp.Poly(h, X).LC() == sp.Poly(gp, X).LC() == 4
    assert sp.rem(sp.Poly(g, X), sp.Poly(X**2, X)) == 0
    assert sp.rem(sp.Poly(h, X), sp.Poly(X**2, X)) == 0
    assert 56 < c < 70

    # h/g has two positive residues after the common X^2 is cancelled.
    residue_left = sp.factor(2*(70-c)/7)
    residue_right = sp.factor(2*(c-56)/7)
    assert residue_left > 0 and residue_right > 0
    residue_identity = sp.cancel(
        residue_left/(X+70) + residue_right/(X+56) - h/g
    )
    assert residue_identity == 0

    # q/p is monotone on the real line away from its poles.  Its Wronskian
    # has positive leading coefficient and negative discriminant, hence is
    # strictly positive.  Together with the exact root order
    # alpha < -c < beta < 0 this certifies the second proper position.
    p_at_minus_c = sp.factor(p.as_expr().subs(X, -c))
    p_discriminant = sp.factor(sp.discriminant(p.as_expr(), X))
    p_sum = -sp.Rational(p.nth(1), p.nth(2))
    p_product = sp.Rational(p.nth(0), p.nth(2))
    assert p_at_minus_c < 0
    assert p_discriminant > 0 and p_sum < 0 and p_product > 0
    wronskian = sp.Poly(sp.expand(sp.diff(q.as_expr(), X)*p.as_expr()
                                  - q.as_expr()*sp.diff(p.as_expr(), X)), X)
    wronskian_discriminant = sp.factor(sp.discriminant(wronskian.as_expr(), X))
    assert wronskian.LC() > 0 and wronskian_discriminant < 0

    target = sp.expand(derivative_square(g, 3)-derivative_square(h, 1))
    line = sp.Poly(sp.expand(target.subs({X: -92+45*z, Y: -38+11*z})), z)
    real_roots = int(line.count_roots(-sp.oo, sp.oo))
    assert line.degree() == 5 and real_roots == 3
    values = [sp.Rational(line.nth(i)) for i in range(line.degree()+1)]
    denominator = sp.ilcm(*[value.q for value in values])
    integers = [int(value*denominator) for value in values]
    divisor = abs(math.gcd(*integers))
    primitive = [value//divisor for value in integers]

    report = {
        "kind": "double_proper_common_root_counterexample",
        "date": "2026-08-02",
        "status": "PASS_EXACT_COUNTEREXAMPLE",
        "false_statement": (
            "Common largest double root, matching leading coefficients, "
            "h<<g, and h<<g' imply stability at d=floor((N+3)/2) "
            "(or at d=floor(2N/3)+1)."
        ),
        "N": 4,
        "d": 3,
        "g": str(g),
        "h": str(h),
        "c": str(c),
        "h_proper_g_certificate": {
            "partial_fraction": (
                f"h/g=({residue_left})/(X+70)+({residue_right})/(X+56)"
            ),
            "both_residues_positive": True,
        },
        "h_proper_g_prime_certificate": {
            "p": str(p.as_expr()),
            "q": str(q.as_expr()),
            "root_order": "root_1(p) < -c < root_2(p) < 0",
            "p_at_minus_c": str(p_at_minus_c),
            "p_discriminant": str(p_discriminant),
            "wronskian_qprime_p_minus_q_pprime": str(wronskian.as_expr()),
            "wronskian_discriminant": str(wronskian_discriminant),
        },
        "line": {"X": "-92+45z", "Y": "-38+11z"},
        "primitive_coefficients_ascending": primitive,
        "line_degree": line.degree(),
        "exact_real_roots": real_roots,
        "nonreal_roots": line.degree()-real_roots,
        "conclusion": (
            "The actual defect-three pair needs its rigid coefficient "
            "multiplier/contiguous or deletion-contraction structure; the "
            "two proper-position relations and common double root are not enough."
        ),
    }
    OUT.write_text(json.dumps(report, indent=2)+"\n", encoding="utf-8")
    print(json.dumps({"status": report["status"],
                      "nonreal_roots": report["nonreal_roots"],
                      "output": str(OUT.resolve())}, indent=2))


if __name__ == "__main__":
    main()
