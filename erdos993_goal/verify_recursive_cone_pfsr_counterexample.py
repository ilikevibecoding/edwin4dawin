#!/usr/bin/env python3
"""Verify an exact abstract recursive-cone counterexample to PFSR.

The C,D coefficient windows are obtained by rationalizing the floating
optimizer's rank-200 witness.  They satisfy coefficientwise D<=C,
the exact recurrences F=C+xD and T=F+xC, all available curvature-box
constraints, nonnegative lower reserves, and three smaller C12
inequalities.  Nevertheless R_T-zeta^2<0.

The windows need not be independence-polynomial windows of forests.
This is a negative control for a scalar induction-closure proof, not a
graph counterexample and not a counterexample to Erdős Problem 993.
"""

from __future__ import annotations

import json
from fractions import Fraction
from pathlib import Path


SOURCE = Path(
    "full_square_recursive_cone_optimization_strict_20260729.json"
)
OUTPUT = Path(
    "recursive_cone_pfsr_counterexample_certificate_20260729.json"
)


def q(value: object) -> Fraction:
    return Fraction(str(value))


def window_from_means(
    base_rank: int,
    means: list[Fraction],
) -> dict[int, Fraction]:
    out = {base_rank: Fraction(1)}
    for offset, mean in enumerate(means):
        rank = base_rank + offset + 1
        out[rank] = out[rank - 1] * mean / rank
    return out


def sigma(
    poly: dict[int, Fraction],
    rank: int,
) -> Fraction:
    return (
        1
        + rank * poly[rank] / poly[rank - 1]
        - (rank + 1) * poly[rank + 1] / poly[rank]
    )


def main() -> None:
    source = json.loads(SOURCE.read_text(encoding="utf-8"))
    detail = source["champion"]["detail"]
    r = int(detail["r"])
    k = r + 1
    c_means = [q(value) for value in detail["C_means"]]
    d_means = [q(value) for value in detail["D_means"]]
    d_scale = q(detail["D_scale"])

    c = window_from_means(r - 2, c_means)
    d_unit = window_from_means(r - 3, d_means)
    d = {
        rank: d_scale * value
        for rank, value in d_unit.items()
    }
    f = {
        rank: c[rank] + d[rank - 1]
        for rank in range(r - 1, r + 3)
    }
    t = {
        rank: f[rank] + c[rank - 1]
        for rank in range(r, r + 3)
    }

    bm, b = f[r - 1], f[r]
    a, ap = t[r], t[r + 1]
    u = r * b / bm
    v = k * ap / a
    zeta = v - Fraction(k, r) * u
    q_c = sigma(c, r)
    q_c_next = sigma(c, k)
    q_d = sigma(d, r - 1)
    q_d_next = sigma(d, r)
    q_f = sigma(f, r)
    q_f_next = sigma(f, k)
    q_t = sigma(t, k)
    reserve_f = r - u + u * q_f
    reserve_t = k - v + v * q_t
    pfsr_margin = reserve_t - zeta * zeta

    checks = {
        "D_coefficientwise_below_C": all(
            d[rank] <= c[rank]
            for rank in range(r - 2, r + 2)
        ),
        "all_coefficients_positive": all(
            value > 0
            for poly in (c, d, f, t)
            for value in poly.values()
        ),
        "live_negative_cross": zeta > 0 and v > k,
        "all_curvatures_in_0_4": all(
            0 <= value <= 4
            for value in (
                q_c,
                q_c_next,
                q_d,
                q_d_next,
                q_f,
                q_f_next,
                q_t,
            )
        ),
        "lower_reserves_nonnegative": (
            reserve_f >= 0 and reserve_t >= 0
        ),
        "C12_T_over_C": 2 * k * q_t >= r * q_c,
        "C12_F_over_D_current": (
            2 * r * q_f >= (r - 1) * q_d
        ),
        "C12_F_over_D_next": (
            2 * k * q_f_next >= r * q_d_next
        ),
        "PFSR_fails_strictly": pfsr_margin < 0,
    }
    if not all(checks.values()):
        raise AssertionError(checks)

    report = {
        "status": (
            "PASS_EXACT_ABSTRACT_RECURSIVE_CONE_COUNTEREXAMPLE_TO_PFSR"
        ),
        "scope_warning": (
            "The exact positive coefficient windows need not be "
            "realizable by forest independence polynomials.  This "
            "rejects only a proof from the listed scalar constraints."
        ),
        "rank_r": r,
        "checks": checks,
        "exact_values": {
            "u": str(u),
            "v": str(v),
            "zeta": str(zeta),
            "q_C": str(q_c),
            "q_C_next": str(q_c_next),
            "q_D": str(q_d),
            "q_D_next": str(q_d_next),
            "q_F": str(q_f),
            "q_F_next": str(q_f_next),
            "q_T": str(q_t),
            "R_F": str(reserve_f),
            "R_T": str(reserve_t),
            "PFSR_margin": str(pfsr_margin),
        },
        "decimal_diagnostics": {
            "zeta": float(zeta),
            "R_F": float(reserve_f),
            "R_T": float(reserve_t),
            "PFSR_margin": float(pfsr_margin),
        },
        "rationalized_inputs": {
            "C_means": [str(value) for value in c_means],
            "D_means": [str(value) for value in d_means],
            "D_scale": str(d_scale),
        },
    }
    OUTPUT.write_text(
        json.dumps(report, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
