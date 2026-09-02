#!/usr/bin/env python3
"""Exact central QPIRD scan in the asymptotically tight star-fork family.

For A=(1+x)^m+x and E=A^t, the relevant coefficients are evaluated
without expanding E:

    [x^r]E = sum_j binom(t,j) binom(m(t-j),r-j).

The rooted pair is

    P=E+x(1+x)^(mt), C=(1+x)^2 P, D=E.

Only a window around the exact coefficient-weighted mean of B is
examined.  This is a falsification/asymptotic diagnostic, not a proof
that ranks outside the window are harmless.
"""

from __future__ import annotations

import argparse
import json
import math
import sys
from fractions import Fraction
from pathlib import Path

sys.set_int_max_str_digits(0)


def falling(value: int, length: int) -> int:
    result = 1
    for offset in range(length):
        result *= value - offset
    return result


def e_coefficient(m: int, t: int, rank: int) -> int:
    if rank < 0 or rank > m * t:
        return 0
    term = math.comb(m * t, rank)
    total = term
    maximum_j = min(t, rank, (m * t - rank) // (m - 1))
    for j in range(maximum_j):
        n = m * (t - j)
        k = rank - j
        numerator = (
            (t - j)
            * k
            * falling(n - k, m - 1)
        )
        denominator = (j + 1) * falling(n, m)
        term = term * numerator // denominator
        total += term
    return total


def coefficient_bundle(
    m: int, t: int, low: int, high: int
) -> dict[str, dict[int, int]]:
    ranks = range(low - 4, high + 5)
    e = {r: e_coefficient(m, t, r) for r in ranks}
    mt = m * t

    def l(r: int) -> int:
        return math.comb(mt, r) if 0 <= r <= mt else 0

    p = {r: e[r] + l(r - 1) for r in ranks}

    def get(values: dict[int, int], rank: int) -> int:
        return values.get(rank, 0)

    c = {
        r: get(p, r) + 2 * get(p, r - 1) + get(p, r - 2)
        for r in range(low - 2, high + 4)
    }
    d = e
    h = {
        r: get(c, r) + get(d, r) + get(d, r - 1)
        for r in range(low - 1, high + 3)
    }
    b = {
        r: (
            get(c, r)
            + get(c, r - 1)
            + get(d, r - 1)
            + get(d, r - 2)
        )
        for r in range(low, high + 2)
    }
    return {"E": e, "P": p, "C": c, "D": d, "H": h, "B": b}


def exact_b_mean(m: int, t: int) -> Fraction:
    branch_total = 2**m + 1
    e0 = branch_total**t
    e1 = t * (m * 2 ** (m - 1) + 1) * branch_total ** (t - 1)
    l0 = 2 ** (m * t)
    p0 = e0 + l0
    p1 = e1 + l0 * (1 + Fraction(m * t, 2))
    c0 = 4 * p0
    c1 = 4 * p1 + 4 * p0
    s0 = c0 + e0
    s1 = c1 + e0 + e1
    return Fraction(1, 2) + Fraction(s1, s0)


def stable_float(value: Fraction) -> float:
    shift = max(
        0,
        max(
            abs(value.numerator).bit_length(),
            value.denominator.bit_length(),
        )
        - 52,
    )
    numerator = value.numerator
    sign = -1 if numerator < 0 else 1
    return sign * (
        (abs(numerator) >> shift) / (value.denominator >> shift)
    )


def scan_point(m: int, t: int, radius: int) -> dict:
    mean = exact_b_mean(m, t)
    center = mean.numerator // mean.denominator
    low = max(1, center - radius)
    high = min(m * t + 3, center + radius)
    values = coefficient_bundle(m, t, low, high)
    c, h, b = values["C"], values["H"], values["B"]
    best = None
    operative = []
    for k in range(low, high + 1):
        if b[k + 1] < b[k] or c[k] <= 0 or h[k - 1] <= 0:
            continue
        numerator = (
            (k + 1) * c[k] * h[k]
            - ((k + 1) * c[k + 1] + c[k]) * h[k - 1]
        )
        denominator = c[k] * h[k - 1]
        margin = Fraction(numerator, denominator)
        u = Fraction(k * c[k], c[k - 1])
        w = Fraction((k + 1) * c[k + 1], c[k])
        v = Fraction((k + 1) * h[k], h[k - 1])
        first_margin = v - u
        pird_margin = v - w
        half_payment_margin = 2 * v - 1 - u - w
        item = {
            "k": k,
            "margin": str(margin),
            "decimal": stable_float(margin),
            "numerator_sign": (
                -1 if numerator < 0 else (1 if numerator > 0 else 0)
            ),
            "v_minus_u_decimal": stable_float(first_margin),
            "v_minus_u_sign": (
                -1
                if first_margin < 0
                else (1 if first_margin > 0 else 0)
            ),
            "pird_margin_decimal": stable_float(pird_margin),
            "pird_margin_sign": (
                -1
                if pird_margin < 0
                else (1 if pird_margin > 0 else 0)
            ),
            "half_payment_margin_decimal": stable_float(
                half_payment_margin
            ),
            "half_payment_margin_sign": (
                -1
                if half_payment_margin < 0
                else (1 if half_payment_margin > 0 else 0)
            ),
            "B_rise": b[k + 1] - b[k],
        }
        operative.append(item)
        if best is None or margin < best[0]:
            best = (margin, item)
    return {
        "m": m,
        "t": t,
        "t_over_2_to_m": t / (2**m),
        "B_mean_floor": center,
        "window": [low, high],
        "operative_ranks_in_window": len(operative),
        "minimum": best[1] if best else None,
    }


def validate_formula() -> bool:
    from flint import fmpz_poly

    one_plus_x = fmpz_poly([1, 1])
    x = fmpz_poly([0, 1])
    for m in range(2, 7):
        for t in range(1, 9):
            expanded = (one_plus_x**m + x) ** t
            for rank in range(m * t + 1):
                if int(expanded[rank]) != e_coefficient(m, t, rank):
                    return False
    return True


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--minimum-m", type=int, default=3)
    parser.add_argument("--maximum-m", type=int, default=12)
    parser.add_argument("--lambda-start", type=int, default=10)
    parser.add_argument("--lambda-stop", type=int, default=40)
    parser.add_argument("--lambda-denominator", type=int, default=20)
    parser.add_argument("--window-radius", type=int, default=8)
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("qpird_star_fork_transition_20260729.json"),
    )
    args = parser.parse_args()

    formula_validated = validate_formula()
    points = []
    global_best = None
    first_qpird_failure = None
    first_half_payment_failure = None
    first_pird_failure = None
    for m in range(args.minimum_m, args.maximum_m + 1):
        seen_t = set()
        m_best = None
        for numerator in range(
            args.lambda_start, args.lambda_stop + 1
        ):
            t = max(
                1,
                (2**m * numerator) // args.lambda_denominator,
            )
            if t in seen_t:
                continue
            seen_t.add(t)
            point = scan_point(m, t, args.window_radius)
            points.append(point)
            if point["minimum"] is None:
                continue
            margin = Fraction(point["minimum"]["margin"])
            if m_best is None or margin < m_best[0]:
                m_best = (margin, point)
            if global_best is None or margin < global_best[0]:
                global_best = (margin, point)
            minimum = point["minimum"]
            if margin < 0 and first_qpird_failure is None:
                first_qpird_failure = point
            if (
                minimum["half_payment_margin_sign"] < 0
                and first_half_payment_failure is None
            ):
                first_half_payment_failure = point
            if (
                minimum["pird_margin_sign"] < 0
                and first_pird_failure is None
            ):
                first_pird_failure = point
                break
        if m_best:
            print(
                f"m={m}: min={stable_float(m_best[0]):.12g}, "
                f"t={m_best[1]['t']}, "
                f"k={m_best[1]['minimum']['k']}",
                flush=True,
            )
        if first_pird_failure is not None:
            break

    report = {
        "status": (
            "PIRD_COUNTEREXAMPLE"
            if first_pird_failure is not None
            else (
                "HALF_PAYMENT_COUNTEREXAMPLE"
                if first_half_payment_failure is not None
                else (
                    "QPIRD_COUNTEREXAMPLE"
                    if first_qpird_failure is not None
                    else "PASS_CENTRAL_WINDOW_NOT_PROOF"
                )
            )
        ),
        "coefficient_formula_validated": formula_validated,
        "minimum_m": args.minimum_m,
        "maximum_m": args.maximum_m,
        "lambda_grid": [
            args.lambda_start,
            args.lambda_stop,
            args.lambda_denominator,
        ],
        "window_radius": args.window_radius,
        "points_checked": len(points),
        "global_minimum": global_best[1] if global_best else None,
        "first_qpird_failure": first_qpird_failure,
        "first_half_payment_failure": first_half_payment_failure,
        "first_pird_failure": first_pird_failure,
        "points": points,
    }
    args.output.write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps({k: v for k, v in report.items() if k != "points"}, indent=2))


if __name__ == "__main__":
    main()
