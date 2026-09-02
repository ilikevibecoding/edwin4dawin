#!/usr/bin/env python3
"""Exact scan of the one-deep half-payment inequality on Galvin trees.

Let

    e=(1+2x)^t, b=(1+x)^t, A=e+xb,
    E=A^m, P=E+x e^m.

The rooted inward tree has independence polynomial P and root-deletion
polynomial E.  Attach q direct leaf branches at the outer support, so

    C=(1+x)^q P, D=E,
    B=(1+x)(C+xD).

The script scans every operative prefix rank and computes the payment
ratio

    eta = -C_k S_k / ((C_{k-1}+D_{k-1}+D_{k-2}) G_k(C))

using exact integers.  Coefficients of A^m are streamed with

    A (A^m)' = m A' A^m,

so memory use is bounded by deg(A), even for large m.
"""

from __future__ import annotations

import argparse
import json
import math
import sys
from collections import deque
from fractions import Fraction
from pathlib import Path

from flint import fmpz


if hasattr(sys, "set_int_max_str_digits"):
    sys.set_int_max_str_digits(0)


def stable_decimal(numerator: int | fmpz, denominator: int | fmpz) -> float:
    """Return a safe binary-float approximation to a nonnegative ratio."""
    n = int(numerator)
    d = int(denominator)
    if d <= 0:
        raise ValueError("denominator must be positive")
    shift = max(0, max(n.bit_length(), d.bit_length()) - 52)
    return (n >> shift) / (d >> shift)


def scan(t: int, m: int, minimum_rank: int, direct_leaves: int = 2) -> dict:
    base = [
        fmpz(
            math.comb(t, rank) * (1 << rank)
            + (
                math.comb(t, rank - 1)
                if 1 <= rank <= t + 1
                else 0
            )
        )
        for rank in range(t + 2)
    ]
    base_degree = t + 1
    e_degree = m * base_degree
    q_degree = t * m
    maximum_k = e_degree + direct_leaves

    recent_e: deque[fmpz] = deque([fmpz(1)], maxlen=base_degree)
    local_e: deque[fmpz] = deque(maxlen=7)
    local_p: deque[fmpz] = deque(maxlen=max(7, direct_leaves + 2))
    local_c: deque[fmpz] = deque(maxlen=7)
    local_b: deque[fmpz] = deque(maxlen=7)

    q_previous = fmpz(0)
    q_current = fmpz(1)

    checks = 0
    negative_drift = 0
    negative_gsb = 0
    negative_minor = 0
    half_payment_failures = 0
    maximum_payment: Fraction | None = None
    maximum_item: dict | None = None
    minimum_v_minus_u: Fraction | None = None
    minimum_v_minus_u_item: dict | None = None
    maximum_negative_drift_w_minus_u: Fraction | None = None
    maximum_negative_drift_w_minus_u_item: dict | None = None
    v_below_u = 0
    negative_drift_w_above_u_minus_one = 0
    minimum_v_minus_w_minus_one: Fraction | None = None
    minimum_v_minus_w_minus_one_item: dict | None = None
    v_below_w_plus_one = 0
    first_failure: dict | None = None

    for n in range(0, maximum_k + 2):
        if n == 0:
            e_current = fmpz(1)
        elif n <= e_degree:
            total = fmpz(0)
            available = len(recent_e)
            for j in range(1, min(base_degree, available) + 1):
                total += (
                    ((m + 1) * j - n)
                    * base[j]
                    * recent_e[-j]
                )
            e_current, remainder = divmod(total, n)
            if remainder != 0 or e_current < 0:
                raise ArithmeticError(
                    f"coefficient recurrence failed at n={n}"
                )
            recent_e.append(e_current)
        else:
            e_current = fmpz(0)

        if n == 0:
            q_current = fmpz(1)
        elif n <= q_degree:
            numerator = q_current * (2 * (q_degree - n + 1))
            q_current, remainder = divmod(numerator, n)
            if remainder != 0:
                raise ArithmeticError(
                    f"binomial recurrence failed at n={n}"
                )
        else:
            q_current = fmpz(0)

        p_current = e_current + (q_previous if n >= 1 else 0)
        p_window = list(local_p)
        c_current = fmpz(0)
        for j in range(0, direct_leaves + 1):
            if j == 0:
                p_term = p_current
            elif j <= len(p_window):
                p_term = p_window[-j]
            else:
                p_term = fmpz(0)
            c_current += math.comb(direct_leaves, j) * p_term

        c_previous = local_c[-1] if len(local_c) >= 1 else fmpz(0)
        e_previous = local_e[-1] if len(local_e) >= 1 else fmpz(0)
        e_previous2 = local_e[-2] if len(local_e) >= 2 else fmpz(0)
        b_current = (
            c_current + c_previous + e_previous + e_previous2
        )

        local_e.append(e_current)
        local_p.append(p_current)
        local_c.append(c_current)
        local_b.append(b_current)

        q_previous = q_current

        # At stream index n, every coefficient needed at k=n-1 is known.
        k = n - 1
        if k < minimum_rank or len(local_c) < 4 or len(local_b) < 2:
            continue

        cm = local_c[-3]
        c = local_c[-2]
        cp = local_c[-1]
        dm2 = local_e[-4]
        dm1 = local_e[-3]
        d = local_e[-2]
        b_k = local_b[-2]
        b_kp1 = local_b[-1]

        if c <= 0 or cm <= 0 or b_kp1 < b_k:
            continue

        drift = (
            (k + 1) * cm * (c + d + dm1)
            - (k * c + cm) * (cm + dm1 + dm2)
        )
        gsb = k * c * c + cm * c - (k + 1) * cm * cp
        minor = (
            c * c
            - cm * cp
            + c * (d + dm1)
            - cp * (dm1 + dm2)
        )
        compensation = c * drift + (cm + dm1 + dm2) * gsb
        if compensation != (k + 1) * cm * minor:
            raise AssertionError(f"compensation identity failed at k={k}")
        half_margin = 2 * c * drift + (cm + dm1 + dm2) * gsb
        u_mean = Fraction(int(k * c), int(cm))
        w_mean = Fraction(int((k + 1) * cp), int(c))
        v_mean = Fraction(
            int((k + 1) * (c + d + dm1)),
            int(cm + dm1 + dm2),
        )
        v_minus_u = v_mean - u_mean
        v_minus_w_minus_one = v_mean - w_mean - 1

        checks += 1
        if drift < 0:
            negative_drift += 1
        if gsb < 0:
            negative_gsb += 1
        if minor < 0:
            negative_minor += 1
        if half_margin < 0:
            half_payment_failures += 1
            if first_failure is None:
                first_failure = {
                    "k": k,
                    "drift": str(drift),
                    "gsb": str(gsb),
                    "minor": str(minor),
                    "half_margin": str(half_margin),
                }
        if v_mean < u_mean:
            v_below_u += 1
        if v_mean < w_mean + 1:
            v_below_w_plus_one += 1
        if (
            minimum_v_minus_w_minus_one is None
            or v_minus_w_minus_one < minimum_v_minus_w_minus_one
        ):
            minimum_v_minus_w_minus_one = v_minus_w_minus_one
            minimum_v_minus_w_minus_one_item = {
                "k": k,
                "decimal": stable_decimal(
                    v_minus_w_minus_one.numerator,
                    v_minus_w_minus_one.denominator,
                ),
                "v_minus_u": stable_decimal(
                    v_minus_u.numerator, v_minus_u.denominator
                ),
            }
        if (
            minimum_v_minus_u is None
            or v_minus_u < minimum_v_minus_u
        ):
            minimum_v_minus_u = v_minus_u
            minimum_v_minus_u_item = {
                "k": k,
                "decimal": stable_decimal(
                    v_minus_u.numerator, v_minus_u.denominator
                ),
                "drift_negative": drift < 0,
                "w_minus_u": stable_decimal(
                    (w_mean - u_mean).numerator,
                    (w_mean - u_mean).denominator,
                ),
            }
        if drift < 0:
            w_minus_u = w_mean - u_mean
            if w_minus_u > -1:
                negative_drift_w_above_u_minus_one += 1
            if (
                maximum_negative_drift_w_minus_u is None
                or w_minus_u > maximum_negative_drift_w_minus_u
            ):
                maximum_negative_drift_w_minus_u = w_minus_u
                maximum_negative_drift_w_minus_u_item = {
                    "k": k,
                    "decimal": stable_decimal(
                        w_minus_u.numerator,
                        w_minus_u.denominator,
                    ),
                    "v_minus_u": stable_decimal(
                        v_minus_u.numerator,
                        v_minus_u.denominator,
                    ),
                }

        if drift < 0 and gsb > 0:
            payment = Fraction(
                int(-c * drift),
                int((cm + dm1 + dm2) * gsb),
            )
            if maximum_payment is None or payment > maximum_payment:
                maximum_payment = payment
                maximum_item = {
                    "k": k,
                    "numerator": str(payment.numerator),
                    "denominator": str(payment.denominator),
                    "decimal": stable_decimal(
                        payment.numerator, payment.denominator
                    ),
                    "half_margin_positive": half_margin >= 0,
                    "prefix_gap_sign": (
                        1 if b_kp1 > b_k else 0
                    ),
                    "extension_means": {
                        "u": stable_decimal(
                            u_mean.numerator, u_mean.denominator
                        ),
                        "w": stable_decimal(
                            w_mean.numerator, w_mean.denominator
                        ),
                        "v": stable_decimal(
                            v_mean.numerator, v_mean.denominator
                        ),
                        "v_minus_u": stable_decimal(
                            (v_mean - u_mean).numerator,
                            (v_mean - u_mean).denominator,
                        ),
                        "v_minus_w": stable_decimal(
                            (v_mean - w_mean).numerator,
                            (v_mean - w_mean).denominator,
                        ),
                        "ts_margin": stable_decimal(
                            (
                                2 * v_mean
                                - 1
                                - u_mean
                                - w_mean
                            ).numerator,
                            (
                                2 * v_mean
                                - 1
                                - u_mean
                                - w_mean
                            ).denominator,
                        ),
                    },
                }

    return {
        "family": {
            "t": t,
            "m": m,
            "side_star_leaves": [0] * direct_leaves,
            "order": 2 + m * (1 + 2 * t) + direct_leaves + 1,
            "alpha_inward": m * (t + 1) + 1,
        },
        "minimum_rank": minimum_rank,
        "operative_prefix_checks": checks,
        "negative_weighted_deletion_drift": negative_drift,
        "negative_gsb": negative_gsb,
        "negative_pird_minor": negative_minor,
        "half_payment_failures": half_payment_failures,
        "maximum_payment": maximum_item,
        "minimum_v_minus_u": minimum_v_minus_u_item,
        "v_below_u": v_below_u,
        "v_below_w_plus_one": v_below_w_plus_one,
        "minimum_v_minus_w_minus_one": (
            minimum_v_minus_w_minus_one_item
        ),
        "maximum_negative_drift_w_minus_u": (
            maximum_negative_drift_w_minus_u_item
        ),
        "negative_drift_w_above_u_minus_one": (
            negative_drift_w_above_u_minus_one
        ),
        "first_failure": first_failure,
        "status": (
            "PASS_NOT_PROOF"
            if negative_gsb == 0
            and negative_minor == 0
            and half_payment_failures == 0
            else "FAIL"
        ),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--t", type=int, required=True)
    parser.add_argument("--m", type=int, required=True)
    parser.add_argument("--minimum-rank", type=int, default=6)
    parser.add_argument("--direct-leaves", type=int, default=2)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()

    report = scan(
        args.t, args.m, args.minimum_rank, args.direct_leaves
    )
    rendered = json.dumps(report, indent=2) + "\n"
    if args.output is not None:
        args.output.write_text(rendered, encoding="utf-8")
    print(rendered, end="")


if __name__ == "__main__":
    main()
