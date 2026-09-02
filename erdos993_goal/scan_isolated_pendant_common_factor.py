#!/usr/bin/env python3
"""Audit terminal inequalities after adjoining a disjoint K2.

Given a forest H with polynomial B, let G=H disjoint-union K2 and
choose the K2 as the terminal pendant pair.  Then

    F=H,             I(F)=B,
    T=H union K1,    I(T)=(1+x)B.

This is the cleanest disconnected-forest stress test.  It turns
terminal drift into the elementary ISO reserve of B and checks whether
the strong ISO-reserve cascade survives arbitrary common factors.
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from fractions import Fraction
from pathlib import Path


if hasattr(sys, "set_int_max_str_digits"):
    sys.set_int_max_str_digits(0)


def ceil_div(a: int, b: int) -> int:
    return (a + b - 1) // b


def add_isolated(poly: list[int]) -> list[int]:
    result = [0] * (len(poly) + 1)
    for rank, value in enumerate(poly):
        result[rank] += value
        result[rank + 1] += value
    return result


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
    parser.add_argument(
        "--corpus",
        type=Path,
        default=Path("patternboost60_polynomial_corpus_20260726.json"),
    )
    parser.add_argument("--records", type=int, default=43_595)
    parser.add_argument("--min-rank", type=int, default=7)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()

    started = time.time()
    source = json.loads(args.corpus.read_text(encoding="utf-8"))
    records = source["records"][: args.records]
    checks = 0
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

    for record_index, record in enumerate(records):
        bpoly = [int(value) for value in record["polynomial"]]
        tpoly = add_isolated(bpoly)
        order_f = int(record.get("order", 60))
        alpha_f = len(bpoly) - 1
        # G=H union K2.
        order_g = order_f + 2
        alpha_g = alpha_f + 1
        cutoff = ceil_div(
            alpha_g * (order_g - 1), alpha_g + order_g
        )
        for rank in range(args.min_rank, cutoff):
            r = rank - 1
            if rank + 1 >= len(tpoly) or rank >= len(bpoly):
                continue
            a = tpoly[r]
            ap = tpoly[rank]
            app = tpoly[rank + 1]
            bm = bpoly[r - 1]
            b = bpoly[r]
            bp = bpoly[rank]
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
                "record_index": record_index,
                "first_line": record.get("first_line"),
                "order_F": order_f,
                "alpha_F": alpha_f,
                "order_G": order_g,
                "alpha_G": alpha_g,
                "rank": rank,
                "cutoff": cutoff,
                "u": str(u),
                "w": str(w),
                "v": str(v),
                "q_T": str(q_t),
                "q_F": str(q_f),
                "prufer_code_one_based":
                    record.get("prufer_code_one_based"),
            }
            for name, value in values.items():
                old = minima[name]
                if old is None or value < old[0]:
                    minima[name] = (value, item)
                if value < 0 and first_failures[name] is None:
                    first_failures[name] = item | {
                        "value": str(value)
                    }

    report = {
        "status": (
            "FAIL"
            if any(first_failures.values())
            else "PASS_NOT_PROOF"
        ),
        "parameters": {
            "corpus": str(args.corpus),
            "records": args.records,
            "min_rank": args.min_rank,
        },
        "records": len(records),
        "rank_checks": checks,
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
