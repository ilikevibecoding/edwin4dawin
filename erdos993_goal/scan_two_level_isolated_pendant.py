#!/usr/bin/env python3
"""Stress the isolated-pendant cascade on two-level tree factors.

For H=T_(m,t), use G=H union K2, so F=H and T=H union K1.
The exact two-level polynomial is

    I(H;x)=((1+x)^t+x)^m+x(1+x)^(tm).
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from fractions import Fraction
from pathlib import Path

from flint import fmpz_poly


if hasattr(sys, "set_int_max_str_digits"):
    sys.set_int_max_str_digits(0)

X = fmpz_poly([0, 1])
ONE = fmpz_poly([1])


def coefficient(poly, rank: int) -> int:
    return int(poly[rank]) if 0 <= rank <= poly.degree() else 0


def ceil_div(a: int, b: int) -> int:
    return (a + b - 1) // b


def stable_float(value: Fraction) -> float:
    shift = max(
        0,
        max(
            value.numerator.bit_length(),
            value.denominator.bit_length(),
        )
        - 52,
    )
    return (
        value.numerator >> shift
    ) / (value.denominator >> shift)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-t", type=int, default=30)
    parser.add_argument("--max-m", type=int, default=500)
    parser.add_argument("--min-rank", type=int, default=7)
    parser.add_argument("--tail-ranks", type=int, default=0)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()

    names = (
        "one_step_upper",
        "ISO_reserve_F",
        "linear_compensation",
        "strong_ISO_reserve_cascade",
        "c12",
    )
    minima: dict[str, tuple[Fraction, dict] | None] = {
        name: None for name in names
    }
    first_failures = {name: None for name in names}
    checks = 0
    started = time.time()

    for t in range(1, args.max_t + 1):
        branch = (ONE + X) ** t + X
        for m in range(1, args.max_m + 1):
            bpoly = branch**m + X * (ONE + X) ** (t * m)
            # H has order 1+m(t+1), alpha tm+1.  G=H union K2.
            order_g = 3 + m * (t + 1)
            alpha_g = t * m + 2
            cutoff = ceil_div(
                alpha_g * (order_g - 1), alpha_g + order_g
            )
            start = args.min_rank
            if args.tail_ranks:
                start = max(start, cutoff - args.tail_ranks)
            for rank in range(start, cutoff):
                r = rank - 1
                bm = coefficient(bpoly, r - 1)
                b = coefficient(bpoly, r)
                bp = coefficient(bpoly, rank)
                bpp = coefficient(bpoly, rank + 1)
                # Coefficients of (1+x)B.
                a = b + bm
                ap = bp + b
                app = bpp + bp
                if min(a, ap, bm, b) <= 0:
                    continue
                checks += 1
                u = Fraction(r * b, bm)
                w = Fraction(rank * bp, b)
                v = Fraction(rank * ap, a)
                y = Fraction((rank + 1) * app, ap)
                q_t = 1 + v - y
                q_f = 1 + u - w
                h = 2 * rank * q_t - r * q_f
                epsilon = max(Fraction(0), w - v)
                d = u + 1 - v
                reserve_t = rank - v + v * q_t
                reserve_f = r - u + u * q_f
                cascade = (
                    2 * rank * reserve_t
                    - r * v * reserve_f / u
                )
                strong = (
                    cascade
                    - (r + 2 + Fraction(r * r, u)) * d
                    - 2 * rank * r * epsilon
                )
                values = {
                    "one_step_upper": d,
                    "ISO_reserve_F": reserve_f,
                    "linear_compensation":
                        v * h - 2 * rank * r * epsilon,
                    "strong_ISO_reserve_cascade": strong,
                    "c12": h,
                }
                item = {
                    "t": t,
                    "m": m,
                    "order_G": order_g,
                    "alpha_G": alpha_g,
                    "rank": rank,
                    "cutoff": cutoff,
                    "u": str(u),
                    "w": str(w),
                    "v": str(v),
                    "q_T": str(q_t),
                    "q_F": str(q_f),
                }
                for name, value in values.items():
                    old = minima[name]
                    if old is None or value < old[0]:
                        minima[name] = (value, item)
                    if value < 0 and first_failures[name] is None:
                        first_failures[name] = item | {
                            "value": str(value)
                        }
        print(f"t={t}: checks={checks:,}", flush=True)

    report = {
        "status": (
            "FAIL"
            if any(first_failures.values())
            else "PASS_NOT_PROOF"
        ),
        "parameters": {
            key: str(value) if isinstance(value, Path) else value
            for key, value in vars(args).items()
        },
        "checks": checks,
        "minima": {
            name: (
                None
                if entry is None
                else {
                    "exact": str(entry[0]),
                    "decimal": stable_float(entry[0]),
                    "witness": entry[1],
                }
            )
            for name, entry in minima.items()
        },
        "first_failures": first_failures,
        "elapsed_seconds": time.time() - started,
    }
    args.out.write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
