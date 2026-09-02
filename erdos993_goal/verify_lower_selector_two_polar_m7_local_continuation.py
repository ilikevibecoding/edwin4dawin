#!/usr/bin/env python3
"""Rigorous replay for the actual-selector m=7 two-polar local theorem."""

from __future__ import annotations

import hashlib
import json
from fractions import Fraction
from pathlib import Path

import sympy as sp
from flint import acb_poly, arb, arb_poly, ctx, fmpz_poly

from probe_lower_selector_tail3_flint_full import selector_gamma


HERE = Path(__file__).resolve().parent
REPORT = HERE / "lower_selector_two_polar_m7_local_continuation_exact_20260813.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def enumerate_m7_cells() -> list[dict[str, object]]:
    """Enumerate the complete near-sector m=7 chart from integer definitions."""
    cells: list[dict[str, object]] = []
    # e=2m-d is 0,1,2 in the four near-sector charts, hence d=12,13,14.
    for d0 in range(12, 15):
        for forest_r in range(d0 - 4):
            path_n = d0 + forest_r
            for row_s in range(forest_r + 1, path_n + forest_r + 1):
                forced = max(0, row_s - path_n + 1)
                gamma = selector_gamma(path_n, row_s)[forced:]
                m = len(gamma) - 1
                if m != 7:
                    continue
                p_eff = d0 + row_s - 2 * forced
                x = p_eff // 2 - m + 1
                beta_num = 1 if p_eff % 2 else -1
                A = Fraction(x * (2 * x + beta_num), 2)
                if not ((m - 2) ** 2 < A < (m - 1) ** 2):
                    continue
                k = m - 1
                K = d0 + row_s - forced - 1
                B = K - k + 1
                cells.append(
                    {
                        "d": d0,
                        "forest_r": forest_r,
                        "s": row_s,
                        "a": forced,
                        "m": m,
                        "A": A,
                        "B": B,
                        "gamma": gamma,
                    }
                )
    assert len(cells) == 52
    assert {(2 * 7 - int(c["d"]), int(c["s"]) % 2) for c in cells} == {
        (0, 0),
        (1, 0),
        (1, 1),
        (2, 1),
    }
    return cells


def exact_selector_sturm(cells: list[dict[str, object]]) -> dict[str, object]:
    """Exact QQ Sturm counts: every selector has precisely two positive roots."""
    t = sp.symbols("t")
    counts: dict[str, int] = {}
    for cell in cells:
        polynomial = sp.Poly(
            sum(sp.Integer(value) * t**j for j, value in enumerate(cell["gamma"])),
            t,
        )
        positive = int(polynomial.count_roots(0, sp.oo))
        negative = int(polynomial.count_roots(-sp.oo, 0))
        assert (positive, negative) == (2, 5)
        key = f"d={cell['d']},r={cell['forest_r']},s={cell['s']},a={cell['a']}"
        counts[key] = positive
    return {
        "method": "exact rational Sturm count",
        "cells": len(cells),
        "positive_roots_per_cell": 2,
        "negative_roots_per_cell": 5,
        "count_records_sha256": hashlib.sha256(
            json.dumps(counts, sort_keys=True).encode("utf-8")
        ).hexdigest().upper(),
    }


def anchor_polynomials(
    B: int, R: arb, r: int, u: arb, v: arb
) -> tuple[arb_poly, arb_poly]:
    """Return F(d;R) and F_z(d;R), with the exact degree drop imposed."""
    X = arb_poly([0, 1])
    quadratic = X * X + 4 * X
    M = [arb_poly([1]), arb_poly([4 * R / B, -1])]
    Mz = [arb_poly([0]), arb_poly([arb(4) / B])]
    for j in range(1, r + 2):
        coefficient = arb_poly([4 * (R - j), -(B + 2 * j)])
        scale = arb(1) / (B + j)
        M.append(scale * (coefficient * M[j] - j * quadratic * M[j - 1]))
        Mz.append(
            scale
            * (4 * M[j] + coefficient * Mz[j] - j * quadratic * Mz[j - 1])
        )
    first = arb_poly([u + v, 2])
    second = arb_poly([u * v, u + v, 1])
    raw_f = M[r + 2] + first * M[r + 1] + second * M[r]
    raw_fz = Mz[r + 2] + first * Mz[r + 1] + second * Mz[r]
    # Algebraically the top two coefficients cancel.  Truncating only those
    # two zero balls avoids treating rounding radii as spurious coefficients.
    return (
        arb_poly([raw_f[j] for j in range(r + 1)]),
        arb_poly([raw_fz[j] for j in range(r + 1)]),
    )


def certified_anchor_velocity(cells: list[dict[str, object]]) -> dict[str, object]:
    """Certified balls for every actual selector pair and every anchor branch."""
    ctx.prec = 256
    total_roots = 0
    smallest_velocity_lower = float("inf")
    smallest_root_lower = float("inf")
    sharp_cell: dict[str, object] | None = None
    records: list[dict[str, object]] = []

    for cell in cells:
        exact_gamma = fmpz_poly(cell["gamma"])
        selector_balls = exact_gamma.complex_roots()
        positive = [
            zero.real
            for zero, multiplicity in selector_balls
            if multiplicity == 1 and zero.imag == 0 and zero.real > 0
        ]
        assert len(positive) == 2
        positive.sort(key=float)
        u, v = 1 / positive[0], 1 / positive[1]

        A = cell["A"]
        assert isinstance(A, Fraction)
        R = (arb(A.numerator) / A.denominator).sqrt()
        r = 5
        f, fz = anchor_polynomials(int(cell["B"]), R, r, u, v)
        roots = acb_poly(f).roots(arb(2) ** -80, maxprec=2048)
        assert len(roots) == r
        fd = f.derivative()
        cell_velocity_lower = float("inf")
        for root in roots:
            # A unique conjugation-invariant isolating ball meeting the real
            # axis contains a real root of this real polynomial.
            assert root.imag.contains(0)
            x = root.real
            assert x > 0
            velocity = -(2 * R * fz(x) + x * fd(x)) / fd(x)
            assert velocity > 0
            root_lower = float(x.lower())
            velocity_lower = float(velocity.lower())
            smallest_root_lower = min(smallest_root_lower, root_lower)
            cell_velocity_lower = min(cell_velocity_lower, velocity_lower)
            if velocity_lower < smallest_velocity_lower:
                smallest_velocity_lower = velocity_lower
                sharp_cell = {
                    "d": cell["d"],
                    "forest_r": cell["forest_r"],
                    "s": cell["s"],
                    "a": cell["a"],
                    "velocity_lower": velocity_lower,
                }
            total_roots += 1
        records.append(
            {
                "cell": [cell["d"], cell["forest_r"], cell["s"], cell["a"]],
                "certified_roots": len(roots),
                "minimum_velocity_lower": cell_velocity_lower,
            }
        )

    assert total_roots == 260
    assert sharp_cell is not None
    return {
        "method": "Arb certified complex-root balls from exact integer selector input",
        "precision_bits": ctx.prec,
        "cells": len(cells),
        "anchor_roots": total_roots,
        "all_anchor_roots_simple_positive": True,
        "all_rotating_height_derivatives_positive": True,
        "smallest_root_certified_lower": smallest_root_lower,
        "smallest_velocity_certified_lower": smallest_velocity_lower,
        "smallest_velocity_cell": sharp_cell,
        "records_sha256": hashlib.sha256(
            json.dumps(records, sort_keys=True).encode("utf-8")
        ).hexdigest().upper(),
    }


def symbolic_velocity_identity() -> dict[str, object]:
    psi, R, d = sp.symbols("psi R d", real=True)
    Fd, Fz = sp.symbols("F_d F_z", nonzero=True, real=True)
    dprime = -2 * sp.I * R * Fz / Fd
    height_derivative = sp.simplify(sp.im(dprime - sp.I * d))
    assert sp.factor(height_derivative + (2 * R * Fz + d * Fd) / Fd) == 0
    return {
        "height": "Im(exp(-I*psi)*d(psi))",
        "anchor_derivative": "-(2*R*F_z+d*F_d)/F_d",
        "implicit_function_condition": "F_d nonzero",
    }


def failure_shields() -> dict[str, object]:
    q, d = sp.symbols("q d")
    B = sp.Integer(31)
    z = sp.Rational(21, 20) * sp.I
    u = sp.Rational(1, 8)
    v = sp.Rational(3, 25)

    def transform(source: sp.Expr) -> sp.Expr:
        output = sp.S.Zero
        poly = sp.Poly(sp.expand(source), q)
        for j in range(poly.degree() + 1):
            output += (
                poly.nth(j)
                * sp.prod(z - h for h in range(j))
                / sp.prod(B + h for h in range(j))
            )
        return sp.factor(output)

    H = sp.factor(4 * transform((q + u / 4) * (4 * q - d) ** 2))
    J = sp.factor(16 * transform((q + u / 4) * (q + v / 4) * (4 * q - d)))
    assert sp.factor(J - (H - (d + v) * sp.diff(H, d) / 2)) == 0
    root = sp.factor(sp.solve(J, d)[0])
    height = sp.factor(sp.im(root) - sp.re(root))
    assert height == -sp.Rational(52321997, 613547880)

    # Preserve the independent exact same-parameter no-go by replaying its
    # quadratic-field Sturm certificate from the existing standalone source.
    from verify_lower_selector_near_sector_core_compression import (
        exact_rotation_shortcut_counterexample,
    )

    generic = exact_rotation_shortcut_counterexample()
    assert generic["rotated_height_derivative"] == "negative"
    return {
        "unequal_k2_exact_root": str(root),
        "unequal_k2_scaled_height": str(height),
        "generic_m7_equal_polar_shortcut": generic,
        "logical_use": (
            "The local theorem is restricted to the actual selector pair; "
            "neither strip membership nor anchor positivity is substituted."
        ),
    }


def main() -> None:
    cells = enumerate_m7_cells()
    payload = {
        "kind": "lower_selector_actual_two_polar_m7_local_continuation",
        "date": "2026-08-13",
        "status": "PASS_RIGOROUS_ACTUAL_SELECTOR_M7_TWO_POLAR_LOCAL_CONTINUATION",
        "theorem": (
            "There is epsilon_7>0 such that all 52 actual lower-selector "
            "near-sector cells with m=7 have Im(exp(-i psi)d)>0 for every "
            "zero and every 0<=psi<epsilon_7."
        ),
        "proof_logic": (
            "Exact Sturm counts isolate the two selector roots; certified "
            "balls prove all 260 anchor roots simple positive and every "
            "anchor height derivative positive. The analytic implicit "
            "function theorem gives one open interval per branch, and the "
            "finite minimum gives epsilon_7."
        ),
        "symbolic_velocity": symbolic_velocity_identity(),
        "cell_enumeration": {
            "count": len(cells),
            "d_values": [12, 13, 14],
            "parity_types": [[0, 0], [1, 0], [1, 1], [2, 1]],
        },
        "selector_sturm": exact_selector_sturm(cells),
        "anchor_velocity_certificate": certified_anchor_velocity(cells),
        "failure_shields": failure_shields(),
        "scope": {
            "actual_selector_pair_only": True,
            "m": 7,
            "uniform_epsilon_is_existential_not_optimized": True,
            "full_rotating_arc_closed": False,
            "m_ge_8_closed": False,
            "erdos_993_solved": False,
        },
    }
    payload["source_sha256"] = sha256(Path(__file__))
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("cells", payload["cell_enumeration"]["count"])
    print("anchor_roots", payload["anchor_velocity_certificate"]["anchor_roots"])
    print(
        "smallest_velocity_certified_lower",
        payload["anchor_velocity_certificate"]["smallest_velocity_certified_lower"],
    )
    print("source_sha256", payload["source_sha256"])
    print("report", REPORT)


if __name__ == "__main__":
    main()
