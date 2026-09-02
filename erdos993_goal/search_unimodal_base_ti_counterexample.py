#!/usr/bin/env python3
"""Search union-of-simplices rooted complexes for TI failure with unimodal base."""

from __future__ import annotations

import argparse
import json
import random
from fractions import Fraction
from math import comb
from pathlib import Path


def unimodal(values: list[int]) -> bool:
    while values and values[-1] == 0:
        values.pop()
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
    parser.add_argument("--samples", type=int, default=1_000_000)
    parser.add_argument("--max-parts", type=int, default=30)
    parser.add_argument("--max-part-size", type=int, default=20)
    parser.add_argument("--seed", type=int, default=993_20260729)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()

    rng = random.Random(args.seed)
    unimodal_bases = checks = 0
    maximum = None
    maximum_item = None
    first = None

    for sample in range(args.samples):
        number_parts = rng.randint(1, args.max_parts)
        parts = sorted(
            (
                1
                if rng.random() < 0.45
                else rng.randint(2, args.max_part_size)
                for _ in range(number_parts)
            ),
            reverse=True,
        )
        degree = max(parts)
        deletion = [0] * (degree + 1)
        deletion[0] = 1
        for size in parts:
            for rank in range(1, size + 1):
                deletion[rank] += comb(size, rank)

        # Add a universal root q: P=C+x.
        base = deletion.copy()
        if len(base) < 2:
            base.append(0)
        base[1] += 1
        if not unimodal(base.copy()):
            continue
        unimodal_bases += 1

        # Add the isolated terminal z: B=(1+x)P.
        total = [
            (base[rank] if rank < len(base) else 0)
            + (base[rank - 1] if 0 <= rank - 1 < len(base) else 0)
            for rank in range(len(base) + 1)
        ]
        for rank in range(1, len(total)):
            bm, br = total[rank - 1], total[rank]
            if not bm or not br or br < bm:
                continue
            cm = (
                deletion[rank - 1]
                if rank - 1 < len(deletion)
                else 0
            )
            cr = deletion[rank] if rank < len(deletion) else 0
            u = Fraction(rank * br, bm)
            burden = (
                rank * (u + 1) * Fraction(bm - cm, bm)
                - (rank + 1) * u * Fraction(br - cr, br)
            )
            checks += 1
            item = {
                "sample": sample,
                "part_sizes": parts,
                "order_with_q_z": sum(parts) + 2,
                "rank": rank,
                "burden": str(burden),
                "base_coefficients": base,
                "deletion_coefficients": deletion,
            }
            if maximum is None or burden > maximum:
                maximum = burden
                maximum_item = item
            if burden > 0:
                first = item
                break
        if first is not None:
            break
        if (sample + 1) % 100_000 == 0:
            print(
                f"samples={sample + 1:,} unimodal={unimodal_bases:,} "
                f"checks={checks:,} "
                f"max={float(maximum) if maximum is not None else None}",
                flush=True,
            )

    report = {
        "status": "COUNTEREXAMPLE" if first else "PASS_NOT_PROOF",
        "parameters": vars(args) | {"out": str(args.out)},
        "unimodal_bases": unimodal_bases,
        "checks": checks,
        "maximum_burden": (
            None
            if maximum is None
            else {"exact": str(maximum), **maximum_item}
        ),
        "first_failure": first,
    }
    args.out.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(
        json.dumps(
            {
                "status": report["status"],
                "unimodal_bases": unimodal_bases,
                "checks": checks,
                "maximum_burden": (
                    None if maximum is None else str(maximum)
                ),
                "first_failure": first,
            },
            indent=2,
        )
    )
    return 1 if first else 0


if __name__ == "__main__":
    raise SystemExit(main())

