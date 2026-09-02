#!/usr/bin/env python3
"""Exact no-go replay for a chamber-only full-fibre split theorem.

This does not refute the split inequality on genuine reflection windows.
It proves that the displayed coarse chamber inequalities do not imply it:
the exact Euler last-negative-layer constraint is indispensable.
"""

from __future__ import annotations

import json
import math
from collections import defaultdict
from fractions import Fraction
from pathlib import Path

from probe_affine_bridge_reaggregated_boundary_layers import outer, sources
from verify_affine_bridge_laguerre_jensen_reduction import (
    atom_weighted_value,
    reserve_core,
)


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "affine_bridge_split_chamber_counterexample_exact_20260813.json"


def homogeneous(poly: dict[tuple[int, int], int], target: int, h: int) -> int:
    return sum(
        math.comb(h, u) * poly.get((target - u, target - h + u), 0)
        for u in range(h + 1)
    )


def ratio_record(value: Fraction) -> dict[str, int | float]:
    return {
        "numerator": value.numerator,
        "denominator": value.denominator,
        "decimal": float(value),
    }


def main() -> None:
    # A literal bottom/odd path fibre.  The source monomial z^5 w^4 has
    # positive specialized weight in the actual reserve core.
    package, parity = "bottom", 1
    m, x, n, h, p, q = 3, 62, 55, 4, 5, 4
    a, b, D = m + x - 1, 2 * m + parity, m + n + 4
    E = 2 * a + b
    alpha = 2 * D - (p + q) - b
    excess = E - alpha
    defect = n - 2 * h - 2
    source_q = alpha - n - 2 * h

    specialized_sources: defaultdict[tuple[int, int], int] = defaultdict(int)
    for monomial, coefficient in reserve_core(package, parity).terms():
        p0, q0, _c_power, m_power, x_power = monomial
        specialized_sources[p0, q0] += (
            int(coefficient) * m**m_power * x**x_power
        )
    source_weight = specialized_sources[p, q]
    assert source_weight == 12 > 0

    row: list[int] = []
    for j in range(h - 1, h + 3):
        value = 0
        for v in range(b + 1):
            value += math.comb(b, v) * atom_weighted_value(
                n,
                a + v,
                a + b - v,
                D - p - v,
                D - q - b + v,
                j,
            )
        row.append(value)
    merged_row = [
        math.comb(n, j) * 2 ** (j + b) * math.comb(E, alpha - j)
        for j in range(h - 1, h + 3)
    ]
    conditional = [Fraction(row[i], merged_row[i]) for i in range(4)]
    correction = (
        conditional[1] ** 3
        * conditional[3]
        / (conditional[0] * conditional[2] ** 3)
    )
    proposed_bound = 1 - Fraction(1, h * E * E)
    normalized_loss = (1 - correction) * h * E * E
    assert defect == 45 >= 12
    assert source_q == 45 >= 1
    assert 0 <= excess <= 2 * h + 11 * defect
    assert correction < proposed_bound
    assert normalized_loss > 1

    # Reconstruct the exact Euler sign source at the same path point/order.
    # The target used by the Euler probe is m+r+5=D with r=n-1.
    q_source, r_source = sources(package, parity)
    _, q_outer, r_outer = outer(
        package, parity, (m, x), q_source, r_source, D
    )
    euler_values = [
        homogeneous(q_outer, D, j) + j * homogeneous(r_outer, D, j)
        for j in range(n + 1)
    ]
    negative_layers = [j for j, value in enumerate(euler_values) if value < 0]
    assert negative_layers == [0, 1, 2, 3]
    terminal_negative = 3
    required_reflection_h = [
        terminal_negative - ell - 1
        for ell in range(1, terminal_negative - 1)
    ]
    assert required_reflection_h == [1]
    assert h not in required_reflection_h

    result = {
        "status": "PASS_EXACT_CHAMBER_ONLY_SPLIT_BOUND_COUNTEREXAMPLE",
        "interpretation": (
            "The coarse chamber s>=12, q>=1, T<=2h+11s does not imply "
            "C_h>=1-1/(hE^2). This witness is not a genuine reflection "
            "window: the exact last negative Euler layer is 3, so only h=1 "
            "is required, while the split failure is at h=4."
        ),
        "parameters": {
            "package": package,
            "parity": parity,
            "m": m,
            "x": x,
            "n": n,
            "h": h,
            "p": p,
            "q_source_monomial": q,
            "source_weight": source_weight,
            "a": a,
            "b": b,
            "D": D,
            "E": E,
            "alpha": alpha,
            "s": defect,
            "q_defect": source_q,
            "T_excess": excess,
        },
        "full_fibre_row_h_minus_1_through_h_plus_2": row,
        "merged_row_h_minus_1_through_h_plus_2": merged_row,
        "split_correction_C_h": ratio_record(correction),
        "proposed_lower_bound": ratio_record(proposed_bound),
        "normalized_loss_hE2_times_1_minus_C": ratio_record(normalized_loss),
        "euler_values_0_through_4": euler_values[:5],
        "negative_euler_layers": negative_layers,
        "terminal_negative": terminal_negative,
        "required_reflection_h": required_reflection_h,
        "warning": (
            "This is a theorem-level obstruction to a chamber-only proof, "
            "not a counterexample on an actual required reflection window."
        ),
    }
    OUTPUT.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
