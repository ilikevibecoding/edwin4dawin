"""Certified-ball audit of endpoint K_c root velocities on the forest cone."""

from __future__ import annotations

import hashlib
import json
from fractions import Fraction
from math import comb, lcm
from pathlib import Path

from flint import ctx, fmpz_poly

from verify_aligned_endpoint_three_ray_reduction import add, mixed_gamma


HERE = Path(__file__).resolve().parent
REPORT = HERE / "endpoint_kc_forest_root_coherence_exact_20260813.json"
ctx.prec = 240


def path(M: int) -> list[Fraction]:
    return [Fraction(comb(2 * M - i - 1, i)) for i in range(M)]


def integer_poly(poly: list[Fraction]) -> fmpz_poly:
    denominator = 1
    for value in poly:
        denominator = lcm(denominator, value.denominator)
    return fmpz_poly([
        value.numerator * (denominator // value.denominator) for value in poly
    ])


def strip_common_zero(poly: list[Fraction]) -> list[Fraction]:
    poly = list(poly)
    while len(poly) > 1 and poly[0] == 0:
        poly.pop(0)
    while len(poly) > 1 and poly[-1] == 0:
        poly.pop()
    return poly


def velocity_signs(K: list[Fraction], H: list[Fraction]) -> list[int]:
    K_int = integer_poly(strip_common_zero(K))
    H_int = integer_poly(strip_common_zero(H))
    derivative = K_int.derivative()
    roots = K_int.complex_roots()
    assert roots and all(root.imag.contains(0) for root, _ in roots)
    signs = []
    for root, multiplicity in roots:
        assert multiplicity == 1
        x = root.real
        numerator = -H_int(x)
        denominator = derivative(x)
        assert not numerator.contains(0)
        assert not denominator.contains(0)
        quotient = numerator / denominator
        assert not quotient.contains(0)
        signs.append(1 if float(quotient.mid()) > 0 else -1)
    return signs


def rays(N: int, s: int, u: Fraction) -> tuple[list[Fraction], ...]:
    P, C, D = path(N), path(N - 1), path(N - 2)
    V, W = add(P, C, -1), add(C, D, -1)
    E = add(mixed_gamma(C, C, s), mixed_gamma(D, D, s), u)
    F = add(mixed_gamma(C, V, s), mixed_gamma(D, W, s), u)
    G = add(mixed_gamma(V, V, s), mixed_gamma(W, W, s), u)
    return E, F, G


def cell_signs(N: int, s: int, u: Fraction, c: Fraction) -> list[int]:
    E, F, G = rays(N, s, u)
    K = add(add(E, F, 2 * c), G, c * c)
    H = add(F, G, c)
    return velocity_signs(K, H)


def main() -> None:
    u_values = [Fraction(1, 10**6), Fraction(1, 1000), Fraction(1),
                Fraction(1000), Fraction(10**6)]
    c_values = [Fraction(0), Fraction(1, 1000), Fraction(1, 10),
                Fraction(1), Fraction(10), Fraction(1000)]
    excess_values = [0, 1, 5, 20, 100]
    cells = roots = positive_cells = negative_cells = 0
    for s in range(2, 31):
        for excess in excess_values:
            N = 2 * s + 5 + excess
            for u in u_values:
                for c in c_values:
                    signs = cell_signs(N, s, u, c)
                    assert len(set(signs)) == 1
                    positive_cells += signs[0] > 0
                    negative_cells += signs[0] < 0
                    cells += 1
                    roots += len(signs)

    # The grid deliberately missed narrow transition bands.  Root coherence
    # is false even in the forest cone at the following exact rational cells.
    forest_counterexamples = []
    for N, s, u, c, expected in (
        (13, 4, Fraction(1), Fraction(6, 5), [-1, 1]),
        (17, 6, Fraction(1), Fraction(119, 100), [-1, -1, 1]),
        (21, 8, Fraction(1), Fraction(6, 5), [-1, -1, 1, 1]),
    ):
        signs = cell_signs(N, s, u, c)
        assert signs == expected
        forest_counterexamples.append({
            "cell": {"N": N, "s": s, "u": str(u), "c": str(c)},
            "certified_velocity_signs": signs,
            "forest_boundary_check": f"N=2s+5={2*s+5}",
        })

    out_of_cone_signs = cell_signs(5, 4, Fraction(1, 10**6), Fraction(1))
    assert out_of_cone_signs == [-1, 1]

    payload = {
        "status": "PASS_CERTIFIED_ENDPOINT_KC_FOREST_ROOT_COHERENCE_AUDIT",
        "forest_range": {
            "s": [2, 30],
            "N": "2s+5+excess",
            "excess_values": excess_values,
            "u_values": [str(value) for value in u_values],
            "c_values": [str(value) for value in c_values],
        },
        "certified_cells": cells,
        "certified_simple_roots": roots,
        "all_positive_velocity_cells": positive_cells,
        "all_negative_velocity_cells": negative_cells,
        "mixed_velocity_cells_on_stated_grid": 0,
        "forest_cone_counterexamples_between_grid_values": forest_counterexamples,
        "out_of_cone_counterexample": {
            "cell": {"N": 5, "s": 4, "u": "1/1000000", "c": "1"},
            "certified_velocity_signs": out_of_cone_signs,
            "reason_outside_cone": "5 < 2*4+5",
        },
        "scope": (
            "Each root is enclosed by a FLINT certified complex ball; all "
            "imaginary balls contain zero, every root is simple, and interval "
            "evaluation of -H/K_t with H=F+cG excludes zero. The listed "
            "forest-cone counterexamples between grid values prove that global "
            "root coherence and a fixed-sign Wronskian theorem are false. The "
            "grid result must not be extrapolated."
        ),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(payload, indent=2))
    print(REPORT)


if __name__ == "__main__":
    main()
