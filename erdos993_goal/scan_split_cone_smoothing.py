#!/usr/bin/env python3
"""Smooth the split-graph TI obstruction by added constrained vertices."""

from __future__ import annotations

import argparse
import json
from fractions import Fraction
from math import comb
from pathlib import Path


def convolution(left: list[int], right: list[int]) -> list[int]:
    out = [0] * (len(left) + len(right) - 1)
    for i, a in enumerate(left):
        for j, b in enumerate(right):
            out[i + j] += a * b
    return out


def unimodal(values: list[int]) -> bool:
    peak = values.index(max(values))
    return all(
        values[index] >= values[index - 1]
        for index in range(1, peak + 1)
    ) and all(
        values[index] <= values[index - 1]
        for index in range(peak + 1, len(values))
    )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--max-isolates", type=int, default=100)
    parser.add_argument("--max-clique-size", type=int, default=100)
    parser.add_argument("--max-star-leaves", type=int, default=100)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()

    base = [comb(6, rank) for rank in range(7)]
    base[1] += 13
    first = None
    records = []
    for isolates in range(args.max_isolates + 1):
        c = convolution(
            base,
            [comb(isolates, rank) for rank in range(isolates + 1)],
        )
        a = c + [0]
        a[1] += 1  # universal root q
        b = convolution(a, [1, 1])  # isolated terminal z
        best = None
        for rank in range(1, len(b)):
            bm, br = b[rank - 1], b[rank]
            if not bm or not br or br < bm:
                continue
            u = Fraction(rank * br, bm)
            rho_previous = Fraction(
                bm - (c[rank - 1] if rank - 1 < len(c) else 0),
                bm,
            )
            rho = Fraction(
                br - (c[rank] if rank < len(c) else 0),
                br,
            )
            burden = (
                rank * (u + 1) * rho_previous
                - (rank + 1) * u * rho
            )
            if best is None or burden > best[0]:
                best = (burden, rank)
        item = {
            "isolates": isolates,
            "order_with_q_z": 21 + isolates,
            "deletion_unimodal": unimodal(c),
            "maximum_burden": str(best[0]),
            "rank": best[1],
        }
        records.append(item)
        if item["deletion_unimodal"] and best[0] > 0 and first is None:
            first = item | {"deletion_coefficients": c}

    clique_records = []
    for clique_size in range(1, args.max_clique_size + 1):
        c = convolution(base, [1, clique_size])
        a = c + [0]
        a[1] += 1
        b = convolution(a, [1, 1])
        best = None
        for rank in range(1, len(b)):
            bm, br = b[rank - 1], b[rank]
            if not bm or not br or br < bm:
                continue
            cm = c[rank - 1] if rank - 1 < len(c) else 0
            cr = c[rank] if rank < len(c) else 0
            u = Fraction(rank * br, bm)
            burden = (
                rank
                * (u + 1)
                * Fraction(bm - cm, bm)
                - (rank + 1)
                * u
                * Fraction(br - cr, br)
            )
            if best is None or burden > best[0]:
                best = (burden, rank)
        item = {
            "clique_size": clique_size,
            "order_with_q_z": 21 + clique_size,
            "deletion_unimodal": unimodal(c),
            "maximum_burden": str(best[0]),
            "rank": best[1],
        }
        clique_records.append(item)
        if item["deletion_unimodal"] and best[0] > 0 and first is None:
            first = item | {"deletion_coefficients": c}

    star_records = []
    for leaves in range(1, args.max_star_leaves + 1):
        star = [comb(leaves, rank) for rank in range(leaves + 1)]
        if len(star) < 2:
            star.append(0)
        star[1] += 1
        c = convolution(base, star)
        a = c + [0]
        a[1] += 1
        b = convolution(a, [1, 1])
        best = None
        for rank in range(1, len(b)):
            bm, br = b[rank - 1], b[rank]
            if not bm or not br or br < bm:
                continue
            cm = c[rank - 1] if rank - 1 < len(c) else 0
            cr = c[rank] if rank < len(c) else 0
            u = Fraction(rank * br, bm)
            burden = (
                rank
                * (u + 1)
                * Fraction(bm - cm, bm)
                - (rank + 1)
                * u
                * Fraction(br - cr, br)
            )
            if best is None or burden > best[0]:
                best = (burden, rank)
        item = {
            "star_leaves": leaves,
            "order_with_q_z": 22 + leaves,
            "deletion_unimodal": unimodal(c),
            "maximum_burden": str(best[0]),
            "rank": best[1],
        }
        star_records.append(item)
        if item["deletion_unimodal"] and best[0] > 0 and first is None:
            first = item | {"deletion_coefficients": c}

    report = {
        "status": (
            "UNIMODAL_DELETION_COUNTEREXAMPLE"
            if first is not None
            else "NO_COUNTEREXAMPLE"
        ),
        "first": first,
        "isolate_records": records,
        "clique_records": clique_records,
        "star_records": star_records,
    }
    args.out.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"status": report["status"], "first": first}, indent=2))
    return 1 if first is not None else 0


if __name__ == "__main__":
    raise SystemExit(main())
