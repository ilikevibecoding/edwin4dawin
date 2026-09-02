#!/usr/bin/env python3
"""Test TI on arbitrary multisets of colored-face local types (s,a)."""

from __future__ import annotations

import argparse
import itertools
import json
from math import comb
from pathlib import Path


def choose(n: int, k: int) -> int:
    return comb(n, k) if 0 <= k <= n else 0


def local(face_size: int, available: int, rank: int) -> tuple[int, int]:
    offset = rank - face_size
    total = choose(available + 1, offset) + choose(1, offset - 1)
    avoiding = choose(available, offset)
    return total, avoiding


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--max-face-size", type=int, default=12)
    parser.add_argument("--max-available", type=int, default=12)
    parser.add_argument("--max-rank", type=int, default=24)
    parser.add_argument("--multiset-size", type=int, default=2)
    parser.add_argument(
        "--fixed-degree",
        type=int,
        default=-1,
        help=(
            "If nonnegative, use valid types (s=u+b,a=d-b) and "
            "include the unique empty-face type automatically."
        ),
    )
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()

    if args.fixed_degree >= 0:
        types = [
            (uncolored + blocked, args.fixed_degree - blocked)
            for blocked in range(args.fixed_degree + 1)
            for uncolored in range(args.max_face_size + 1)
            if uncolored + blocked > 0
        ]
        selections = (
            ((0, args.fixed_degree), *extra)
            for extra in itertools.combinations_with_replacement(
                types, args.multiset_size - 1
            )
        )
    else:
        types = list(
            itertools.product(
                range(args.max_face_size + 1),
                range(args.max_available + 1),
            )
        )
        selections = itertools.combinations_with_replacement(
            types, args.multiset_size
        )
    checks = 0
    first = None
    for selected in selections:
        for rank in range(1, args.max_rank + 1):
            bm = br = cm = cr = 0
            for face_size, available in selected:
                value, avoid = local(face_size, available, rank - 1)
                bm += value
                cm += avoid
                value, avoid = local(face_size, available, rank)
                br += value
                cr += avoid
            if not bm or not br or br < bm:
                continue
            margin = (
                br * bm + rank * br * cm - bm * bm
                - (rank + 1) * bm * cr + bm * cm
            )
            checks += 1
            if margin < 0:
                first = {
                    "types": selected,
                    "rank": rank,
                    "b_previous": bm,
                    "b_current": br,
                    "c_previous": cm,
                    "c_current": cr,
                    "cleared_margin": margin,
                }
                break
        if first is not None:
            break

    report = {
        "status": "COUNTEREXAMPLE" if first else "PASS_NOT_PROOF",
        "parameters": vars(args) | {"out": str(args.out)},
        "type_count": len(types),
        "checks": checks,
        "first_failure": first,
    }
    args.out.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))
    return 1 if first else 0


if __name__ == "__main__":
    raise SystemExit(main())
