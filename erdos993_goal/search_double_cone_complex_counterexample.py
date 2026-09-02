#!/usr/bin/env python3
"""Search unions of simplices for a failure of the two-isolate TI case."""

from __future__ import annotations

import argparse
import json
import random
from fractions import Fraction
from math import comb
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--samples", type=int, default=1_000_000)
    parser.add_argument("--max-parts", type=int, default=50)
    parser.add_argument("--max-part-size", type=int, default=40)
    parser.add_argument("--degree", type=int, default=0)
    parser.add_argument(
        "--color-mode",
        choices=("none", "single", "largest-part", "separate-parts"),
        default="none",
        help=(
            "none: no residual vertex blocks a branch; "
            "single: every nonempty face blocks class 1; "
            "largest-part: only vertices in the largest simplex "
            "block class 1; separate-parts: the first degree "
            "simplex parts are separate blocker classes."
        ),
    )
    parser.add_argument("--seed", type=int, default=993_20260729)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()

    rng = random.Random(args.seed)
    checks = 0
    maximum = None
    maximum_item = None
    first = None

    for sample in range(args.samples):
        parts = [
            1
            if rng.random() < 0.5
            else rng.randint(2, args.max_part_size)
            for _ in range(rng.randint(1, args.max_parts))
        ]
        deletion = [0] * (max(parts) + 1)
        deletion[0] = 1
        for size in parts:
            for rank in range(1, size + 1):
                deletion[rank] += comb(size, rank)
        if args.color_mode == "single" and args.degree < 1:
            raise ValueError("single color mode requires degree at least one")
        root_deleted = [0] * (
            len(deletion) + args.degree + 1
        )
        # Empty face occurs once and blocks no class.
        for selected in range(args.degree + 1):
            root_deleted[selected] += comb(args.degree, selected)
        largest_index = max(
            range(len(parts)), key=lambda index: parts[index]
        )
        for part_index, part_size in enumerate(parts):
            available = args.degree
            if args.color_mode == "single":
                available -= 1
            if (
                args.color_mode == "largest-part"
                and part_index == largest_index
            ):
                available -= 1
            if (
                args.color_mode == "separate-parts"
                and part_index < args.degree
            ):
                available -= 1
            for face_size in range(1, part_size + 1):
                face_count = comb(part_size, face_size)
                for selected in range(available + 1):
                    root_deleted[face_size + selected] += (
                        face_count * comb(available, selected)
                    )
        rooted_base = [
            (
                root_deleted[rank]
                if rank < len(root_deleted)
                else 0
            )
            + (
                deletion[rank - 1]
                if 0 <= rank - 1 < len(deletion)
                else 0
            )
            for rank in range(len(root_deleted) + 1)
        ]
        total = [
            (
                rooted_base[rank]
                if rank < len(rooted_base)
                else 0
            )
            + (
                rooted_base[rank - 1]
                if 0 <= rank - 1 < len(rooted_base)
                else 0
            )
            for rank in range(len(rooted_base) + 1)
        ]
        for rank in range(1, len(total)):
            bm, br = total[rank - 1], total[rank]
            if not bm or not br or br < bm:
                continue
            cm = (
                root_deleted[rank - 1]
                if rank - 1 < len(root_deleted)
                else 0
            )
            cr = (
                root_deleted[rank]
                if rank < len(root_deleted)
                else 0
            )
            u = Fraction(rank * br, bm)
            burden = (
                rank * (u + 1) * Fraction(bm - cm, bm)
                - (rank + 1) * u * Fraction(br - cr, br)
            )
            checks += 1
            item = {
                "sample": sample,
                "parts": sorted(parts, reverse=True),
                "rank": rank,
                "burden": str(burden),
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
                f"samples={sample + 1:,} checks={checks:,} "
                f"max={float(maximum) if maximum is not None else None}",
                flush=True,
            )

    report = {
        "status": "COUNTEREXAMPLE" if first else "PASS_NOT_PROOF",
        "parameters": vars(args) | {"out": str(args.out)},
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
