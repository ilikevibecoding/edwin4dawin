"""Exact finite audit of the PF length-three collision invariant.

At a common root x of

    Q_0=a_0 G_0+a_1 G_1+a_2 G_2,
    Q_1=a_0 G_1+a_1 G_2+a_2 G_3,

the weight vector is proportional to ``(D2,E,D0)``, where

    D0=G1^2-G0*G2, D2=G2^2-G1*G3, E=G0*G3-G1*G2.

A positive PF triple would require the three entries to have one sign and
``H=E^2-4*D0*D2>=0``.  This script uses exact rational root isolation to
audit that implication over finite boundary orders and parameter cells.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from fractions import Fraction
from pathlib import Path

import sympy as sp

from prove_quartic_minimal_compatibility_resultants import X, window_polynomial


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "pf_length3_nullvector_invariant_exact_audit_20260806.json"


def digest(poly: sp.Poly) -> str:
    _, cleared = poly.clear_denoms(convert=True)
    _, primitive = cleared.primitive()
    return hashlib.sha256(",".join(map(str, primitive.all_coeffs())).encode("ascii")).hexdigest()


def sign(value) -> int:
    return 1 if value > 0 else -1 if value < 0 else 0


def negative_root_intervals(poly: sp.Poly):
    output = []
    for (left, right), multiplicity in sp.polys.polytools.intervals(
        poly, eps=sp.Rational(1, 10) ** 20
    ):
        left, right = sp.Rational(left), sp.Rational(right)
        if right < 0:
            output.append((left, right, multiplicity))
    return output


def one_case(parity: str, reserve_index: int, u: Fraction, v: Fraction) -> dict:
    if parity == "odd":
        p, alpha = 2 * reserve_index + 17, 2 * reserve_index
    else:
        p, alpha = 2 * reserve_index + 18, 2 * reserve_index + 1
    gamma = [sp.Integer(1), -(sp.Rational(u) + sp.Rational(v)), sp.Rational(u * v)]
    rows = [
        sp.Poly(
            X**j * window_polynomial(p - 2 * j, alpha + j, gamma).as_expr(),
            X,
            domain=sp.QQ,
        )
        for j in range(4)
    ]
    source_one = window_polynomial(p, alpha, [sp.Integer(1)])
    d0 = sp.Poly(rows[1].as_expr() ** 2 - rows[0].as_expr() * rows[2].as_expr(), X)
    d2 = sp.Poly(rows[2].as_expr() ** 2 - rows[1].as_expr() * rows[3].as_expr(), X)
    e = sp.Poly(rows[0].as_expr() * rows[3].as_expr() - rows[1].as_expr() * rows[2].as_expr(), X)
    h = sp.Poly(e.as_expr() ** 2 - 4 * d0.as_expr() * d2.as_expr(), X)
    collision_derivative0 = sp.Poly(
        d2.as_expr() * rows[0].diff().as_expr()
        + e.as_expr() * rows[1].diff().as_expr()
        + d0.as_expr() * rows[2].diff().as_expr(),
        X,
    )
    collision_derivative1 = sp.Poly(
        d2.as_expr() * rows[1].diff().as_expr()
        + e.as_expr() * rows[2].diff().as_expr()
        + d0.as_expr() * rows[3].diff().as_expr(),
        X,
    )
    derivative_product = sp.Poly(
        collision_derivative0.as_expr() * collision_derivative1.as_expr(), X
    )

    common = sp.gcd(h, sp.Poly(d0.as_expr() * d2.as_expr() * e.as_expr(), X))
    # The forced x powers are harmless: positive PF weights cannot give x=0.
    assert sp.Poly(common, X).terms() == [((sp.degree(common, X),), sp.LC(sp.Poly(common, X)))]

    critical = sp.Poly(d0.as_expr() * d2.as_expr() * e.as_expr() * h.as_expr(), X)
    valuation = min(power[0] for power, coefficient in critical.terms())
    residual = sp.Poly(sp.cancel(critical.as_expr() / X**valuation), X).sqf_part()
    roots = negative_root_intervals(residual)
    assert all(multiplicity == 1 for _, _, multiplicity in roots)

    boundaries = [(left, right) for left, right, _ in roots]
    samples = []
    if boundaries:
        samples.append(boundaries[0][0] - max(1, abs(boundaries[0][0])))
        for first, second in zip(boundaries, boundaries[1:]):
            assert first[1] < second[0]
            samples.append((first[1] + second[0]) / 2)
        samples.append(boundaries[-1][1] / 2)
    else:
        samples.append(sp.Rational(-1))

    pf_open_cells = 0
    equal_index_collision_cells = 0
    collision_root_indices = []
    for point in samples:
        values = [d0.eval(point), d2.eval(point), e.eval(point), h.eval(point)]
        same = abs(sum(sign(value) for value in values[:3])) == 3
        if same and values[3] >= 0:
            pf_open_cells += 1
            orientation = 1 if values[0] > 0 else -1
            weights = [
                orientation * values[1],
                orientation * values[2],
                orientation * values[0],
            ]
            assert all(weight > 0 for weight in weights)
            assert weights[1] ** 2 > 4 * weights[0] * weights[2]
            q0 = sp.Poly(
                sum(weights[j] * rows[j].as_expr() for j in range(3)),
                X,
                domain=sp.QQ,
            )
            q1 = sp.Poly(
                sum(weights[j] * rows[j + 1].as_expr() for j in range(3)),
                X,
                domain=sp.QQ,
            )
            assert q0.eval(point) == q1.eval(point) == 0
            below0 = sp.polys.polytools.count_roots(q0, -sp.oo, point)
            below1 = sp.polys.polytools.count_roots(q1, -sp.oo, point)
            assert below0 == below1
            assert sp.polys.polytools.count_roots(source_one, -sp.oo, point) == 0
            assert q0.diff().eval(point) * q1.diff().eval(point) > 0
            equal_index_collision_cells += 1
            collision_root_indices.append(int(below0) + 1)

    pf_equality_roots = 0
    h_roots = negative_root_intervals(h)
    for left, right, multiplicity in h_roots:
        assert multiplicity == 1
        point = (left + right) / 2
        signs = []
        for minor in (d0, d2, e):
            assert sp.polys.polytools.count_roots(minor, left, right) == 0
            signs.append(sign(minor.eval(point)))
        if abs(sum(signs)) == 3:
            assert sp.polys.polytools.count_roots(derivative_product, left, right) == 0
            assert derivative_product.eval(point) > 0
            assert sp.polys.polytools.count_roots(source_one, -sp.oo, right) == 0
            pf_equality_roots += 1

    return {
        "parity": parity,
        "reserve_index": reserve_index,
        "p": p,
        "alpha": alpha,
        "u": str(u),
        "v": str(v),
        "degrees": {"D0": d0.degree(), "D2": d2.degree(), "E": e.degree(), "H": h.degree()},
        "negative_critical_root_count": len(roots),
        "negative_H_root_count": len(h_roots),
        "pf_open_collision_cell_count": pf_open_cells,
        "equal_index_collision_cell_count": equal_index_collision_cells,
        "open_collision_root_indices": collision_root_indices,
        "all_pf_collisions_left_of_source_ground_root": True,
        "pf_equality_collision_count": pf_equality_roots,
        "digests": {"D0": digest(d0), "D2": digest(d2), "E": digest(e), "H": digest(h)},
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-r", type=int, default=2)
    parser.add_argument("--output", type=Path, default=OUTPUT)
    args = parser.parse_args()
    unit = [Fraction(1, 10), Fraction(1, 2), Fraction(1)]
    cases = []
    for parity in ("odd", "even"):
        for reserve_index in range(args.max_r + 1):
            for i, u in enumerate(unit):
                for v in unit[i:]:
                    cases.append(one_case(parity, reserve_index, u, v))
    report = {
        "status": "EXACT_FINITE_PF_LENGTH3_NULLVECTOR_INVARIANT_AUDIT",
        "identity": {
            "kernel_vector": "(a0,a1,a2) proportional to (D2,E,D0)",
            "pf_discriminant": "H=E^2-4*D0*D2",
        },
        "scope": {
            "max_reserve_index": args.max_r,
            "u_v_values": [str(value) for value in unit],
            "case_count": len(cases),
            "negative_critical_root_count": sum(item["negative_critical_root_count"] for item in cases),
            "negative_H_root_count": sum(item["negative_H_root_count"] for item in cases),
            "pf_open_collision_cell_count": sum(item["pf_open_collision_cell_count"] for item in cases),
            "equal_index_collision_cell_count": sum(item["equal_index_collision_cell_count"] for item in cases),
            "pf_equality_collision_count": sum(item["pf_equality_collision_count"] for item in cases),
            "open_collision_root_indices": sorted(
                {index for item in cases for index in item["open_collision_root_indices"]}
            ),
            "all_pf_collisions_left_of_source_ground_root": True,
        },
        "logical_status": (
            "Finite exact evidence that every PF common-root collision is an "
            "equal-index collision, detected by equal exact root counts and a "
            "positive derivative product.  The kernel-vector identity is "
            "all-order algebra; the collision-index implication remains to be "
            "proved uniformly."
        ),
        "cases": cases,
    }
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(args.output)


if __name__ == "__main__":
    main()
