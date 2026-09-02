#!/usr/bin/env python3
"""Unequal-polar identity and lower-selector parameter reduction.

This is an exact replay of two all-order observations.

First, if

    M_m(d;z) = P_B[(4q-d)^m](z),

then adjoining two *unequal* positive source parameters is exactly the
composition of two normalized polar derivatives, with polar points -u and
-v.  This identity does not imply half-angle preservation: those polar
points lie inside the desired rotating half-plane, while Laguerre's theorem
gives preservation when the polar point is outside the circular region.

Second, after the forced zero is removed from a lower selector, its Duran
parameters simplify to

    m=floor(s/2)+2-a,  x=floor((d+s)/2)-floor(s/2)-1,
    B=d+ceil(s/2)-1,  A=x(x+beta),

where a=max(0,s-d-r+1) and beta is +/-1/2 according to d+s parity.
The condition sqrt(A)>m-1 is therefore an explicit parity cutoff.  Apart
from the isolated terminal degree drop (5,0,5), it never holds in the
forced region a>0.

The finite sweep below is only a transcription audit of those formulas and
counts.  The polar identity and parity inequalities are all-order algebra;
the former sector theorem/status is explicitly withdrawn.
"""

from __future__ import annotations

import hashlib
import json
from math import comb
from pathlib import Path

import sympy as sp

from verify_lower_qsharp_reduction import selector_gamma


HERE = Path(__file__).resolve().parent
REPORT = HERE / "unequal_outlier_polar_sector_subregion_exact_20260812.json"
q, z, dvar = sp.symbols("q z d")


def falling(order: int) -> sp.Expr:
    return sp.prod((z - j for j in range(order)), start=sp.Integer(1))


def rising(base: sp.Expr, order: int) -> sp.Expr:
    return sp.prod((base + j for j in range(order)), start=sp.Integer(1))


def normalized_pochhammer(source: sp.Expr, base: sp.Expr) -> sp.Poly:
    source_poly = sp.Poly(sp.expand(source), q)
    return sp.Poly(
        sp.expand(sum(
            source_poly.nth(k) * falling(k) / rising(base, k)
            for k in range(source_poly.degree() + 1)
        )),
        dvar,
    )


def unequal_polar_replay() -> list[dict[str, object]]:
    B, u, v = sp.symbols("B u v", positive=True)
    n = sp.Symbol("n", integer=True, positive=True)
    f = sp.Function("f")(dvar)
    first_generic = f - (dvar + u) * sp.diff(f, dvar) / n
    composed_generic = sp.expand(
        first_generic
        - (dvar + v) * sp.diff(first_generic, dvar) / (n - 1)
    )
    closed_generic = sp.expand(
        f
        - (2 * dvar + u + v) * sp.diff(f, dvar) / n
        + (dvar + u) * (dvar + v) * sp.diff(f, dvar, 2)
        / (n * (n - 1))
    )
    assert sp.simplify(composed_generic - closed_generic) == 0
    records: list[dict[str, object]] = []
    # A numerical-rational parameter specialization keeps this independent
    # transform replay fast; the all-order identity itself was proved above
    # with an arbitrary differentiable f and follows under P_B by linearity.
    B0 = sp.Rational(11, 3)
    u0 = sp.Rational(2, 3)
    v0 = sp.Rational(3, 5)
    for rank in range(0, 8):
        degree = rank + 2
        M = normalized_pochhammer((4 * q - dvar) ** degree, B0).as_expr()

        # The normalized polar derivative of a degree-n polynomial at a is
        # P_a^(n)f=f-(d-a)f'/n.  The first application has degree n-1.
        first = sp.expand(M - (dvar + u0) * sp.diff(M, dvar) / degree)
        composed = sp.expand(
            first
            - (dvar + v0) * sp.diff(first, dvar) / (degree - 1)
        )
        closed_form = sp.expand(
            M
            - (2 * dvar + u0 + v0) * sp.diff(M, dvar) / degree
            + (dvar + u0) * (dvar + v0) * sp.diff(M, dvar, 2)
            / (degree * (degree - 1))
        )
        actual = normalized_pochhammer(
            (q + u0 / 4) * (q + v0 / 4) * (4 * q - dvar) ** rank,
            B0,
        ).as_expr()
        assert sp.factor(composed - closed_form) == 0
        assert sp.factor(closed_form - 16 * actual) == 0
        records.append({
            "rank": rank,
            "degree": degree,
            "successive_polar_identity": True,
        })
    return records


def parity_proof_replay() -> dict[str, object]:
    D, k = sp.symbols("D k", integer=True, nonnegative=True)

    # Four parity classes (d parity, s parity).  In each, x and beta give A,
    # and the integer comparison sqrt(A)>m-1 reduces to the stated k cutoff
    # on the unforced rows a=0.
    classes = [
        {
            "parity": "d_even_s_even",
            "D_min": 3,
            "d": 2 * D,
            "s": 2 * k,
            "x": D - 1,
            "beta": sp.Rational(-1, 2),
            "k_max": D - 3,
            "negative_barrier_margin_at_cutoff": 7 * D**2 + 2 * D - 25,
        },
        {
            "parity": "d_even_s_odd",
            "D_min": 3,
            "d": 2 * D,
            "s": 2 * k + 1,
            "x": D - 1,
            "beta": sp.Rational(1, 2),
            "k_max": D - 2,
            "negative_barrier_margin_at_cutoff": 7 * D**2 + 6 * D - 17,
        },
        {
            "parity": "d_odd_s_even",
            "D_min": 2,
            "d": 2 * D + 1,
            "s": 2 * k,
            "x": D - 1,
            "beta": sp.Rational(1, 2),
            "k_max": D - 2,
            "negative_barrier_margin_at_cutoff": 7 * D**2 + 6 * D - 17,
        },
        {
            "parity": "d_odd_s_odd",
            "D_min": 2,
            "d": 2 * D + 1,
            "s": 2 * k + 1,
            "x": D,
            "beta": sp.Rational(-1, 2),
            "k_max": D - 2,
            "negative_barrier_margin_at_cutoff": 7 * D**2 + 16 * D - 16,
        },
    ]

    for record in classes:
        x = record["x"]
        beta = record["beta"]
        A = sp.expand(x * (x + beta))
        # At the largest allowed k, B-3=d+ceil(s/2)-4.  The displayed
        # polynomial is exactly 16*A-(B-3)^2 and is positive in the
        # admissible d>=5 range of the parity class.
        kval = record["k_max"]
        d_expr = record["d"]
        s_expr = record["s"].subs(k, kval)
        ceil_half_s = sp.ceiling(s_expr / 2)
        margin = sp.factor(16 * A - (d_expr + ceil_half_s - 4) ** 2)
        assert sp.factor(margin - record["negative_barrier_margin_at_cutoff"]) == 0
        # Directly verify the integer cutoff at its two boundary values.
        m_minus_one = k + 1
        at_cutoff = sp.factor((A - m_minus_one**2).subs(k, kval))
        after_cutoff = sp.factor((A - m_minus_one**2).subs(k, kval + 1))
        D0 = sp.Symbol("D0", integer=True, nonnegative=True)
        cutoff_shifted = sp.Poly(
            sp.expand(at_cutoff.subs(D, D0 + record["D_min"])), D0
        )
        after_shifted = sp.Poly(
            sp.expand((-after_cutoff).subs(D, D0 + record["D_min"])), D0
        )
        assert all(coefficient > 0 for coefficient in cutoff_shifted.all_coeffs())
        assert all(coefficient > 0 for coefficient in after_shifted.all_coeffs())
        record["A"] = str(A)
        record["unforced_cutoff"] = f"k<={record['k_max']}"
        record["barrier_square_margin_at_cutoff"] = str(margin)
        record["radius_square_margin_at_cutoff"] = str(at_cutoff)
        record["radius_square_deficit_after_cutoff"] = str(-after_cutoff)
        for key in (
            "d", "s", "x", "beta", "k_max",
            "negative_barrier_margin_at_cutoff",
        ):
            record[key] = str(record[key])

    # In the forced range, s=d+r-1+a and 1<=a<=r+1.  The generic degree
    # formula gives m-1>=floor(d/2), while every one of the four radii is
    # strictly smaller than floor(d/2).  The sole degree-formula exception is
    # the separately direct cell (5,0,5).
    return {
        "classes": classes,
        "forced_region_bound": (
            "m-1>=floor(d/2)>sqrt(A) for every a>0, except the isolated "
            "terminal degree drop (d,r,s)=(5,0,5)"
        ),
    }


def finite_lower_sweep(max_d: int = 50) -> dict[str, object]:
    total = 0
    radius_subregion = 0
    radius_and_barrier = 0
    forced_radius_subregion: list[dict[str, int]] = []
    formula_exceptions: list[dict[str, int]] = []
    by_d: list[dict[str, int]] = []
    for d in range(5, max_d + 1):
        d_total = d_radius = 0
        for r in range(d - 4):
            N = d + r
            for row_s in range(r + 1, N + r + 1):
                a = max(0, row_s - N + 1)
                expected_raw_degree = row_s // 2 + 2
                # The sole terminal cancellation in the full lower cone.
                raw_degree = (
                    3 if (d, r, row_s) == (5, 0, 5)
                    else expected_raw_degree
                )
                if (d, r, row_s) == (5, 0, 5):
                    formula_exceptions.append({
                        "d": d, "r": r, "row_s": row_s,
                        "raw_degree": raw_degree,
                        "expected_raw_degree": expected_raw_degree,
                    })
                m = raw_degree - a
                if m < 2:
                    continue
                P = d + row_s
                p_effective = P - 2 * a
                n = p_effective // 2
                beta = sp.Rational(1, 2) if p_effective % 2 else sp.Rational(-1, 2)
                x = n - m + 1
                A = sp.Integer(x) * (x + beta)
                B = P - a - m + 1

                if not (d == 5 and r == 0 and row_s == 5):
                    assert m == row_s // 2 + 2 - a
                    assert x == (d + row_s) // 2 - row_s // 2 - 1
                    assert B == d + (row_s + 1) // 2 - 1

                total += 1
                d_total += 1
                radius_ok = A > (m - 1) ** 2
                barrier_ok = 16 * A > (B - 3) ** 2
                if radius_ok:
                    radius_subregion += 1
                    d_radius += 1
                    if a > 0:
                        forced_radius_subregion.append({
                            "d": d, "r": r, "row_s": row_s, "a": a, "m": m
                        })
                if radius_ok and barrier_ok:
                    radius_and_barrier += 1
                assert not radius_ok or barrier_ok
        by_d.append({"d": d, "eligible_cells": d_total, "radius_subregion": d_radius})

    assert formula_exceptions == [{
        "d": 5, "r": 0, "row_s": 5, "raw_degree": 3,
        "expected_raw_degree": 4,
    }]
    assert forced_radius_subregion == [{
        "d": 5, "r": 0, "row_s": 5, "a": 1, "m": 2,
    }]
    assert radius_subregion == radius_and_barrier
    # Independent exact construction check for the degree formula on a
    # compact but nontrivial lower diamond.
    degree_transcription_cells = 0
    for d in range(5, 21):
        for r in range(d - 4):
            N = d + r
            for row_s in range(r + 1, N + r + 1):
                actual_degree = len(selector_gamma(N, row_s)) - 1
                expected = row_s // 2 + 2
                if (d, r, row_s) == (5, 0, 5):
                    expected = 3
                assert actual_degree == expected
                degree_transcription_cells += 1
    return {
        "range": f"5<=d<={max_d}, 0<=r<=d-5, r<s<=d+2r",
        "eligible_cells_m_at_least_2": total,
        "radius_subregion_cells": radius_subregion,
        "complement_cells": total - radius_subregion,
        "fraction_closed": str(sp.Rational(radius_subregion, total)),
        "radius_implies_negative_barrier_in_replay": True,
        "formula_exceptions": formula_exceptions,
        "forced_radius_subregion": forced_radius_subregion,
        "degree_formula_transcription_cells_d_le_20": degree_transcription_cells,
        "by_d": by_d,
    }


def main() -> None:
    polar = unequal_polar_replay()
    parity = parity_proof_replay()
    sweep = finite_lower_sweep()
    payload = {
        "kind": "unequal_outlier_polar_sector_lower_subregion",
        "date": "2026-08-12",
        "status": "PASS_EXACT_UNEQUAL_POLAR_IDENTITY_AND_PARAMETER_REDUCTION_ONLY",
        "theorem_status": (
            "WITHDRAWN: the former sector conclusion used Laguerre's theorem "
            "with polar points inside the circular region. The replay now "
            "certifies only the exact polar identity, parity cutoff, real "
            "barrier implication, and finite transcription counts."
        ),
        "unequal_polar_identity": (
            "P_(-v)^(m-1) P_(-u)^m M_m = M_m-(2d+u+v)M_m'/m "
            "+(d+u)(d+v)M_m''/[m(m-1)]"
        ),
        "scope_warning": (
            "Both the candidate radius subregion and its unbounded high-depth "
            "complement still need a valid analytic proof."
        ),
        "polar_replays": polar,
        "lower_parity_reduction": parity,
        "finite_transcription_sweep": sweep,
    }
    payload["source_sha256"] = hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper()
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "status": payload["status"],
        "polar_ranks": len(polar),
        "eligible_cells": sweep["eligible_cells_m_at_least_2"],
        "radius_subregion_cells": sweep["radius_subregion_cells"],
        "complement_cells": sweep["complement_cells"],
        "source_sha256": payload["source_sha256"],
        "report": str(REPORT),
    }, indent=2))


if __name__ == "__main__":
    main()
