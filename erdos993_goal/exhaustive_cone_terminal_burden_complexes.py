#!/usr/bin/env python3
"""Exhaustively test the terminal-isolate burden on small complexes.

This deliberately enlarges the domain from independence complexes to
all abstract simplicial complexes.  It enumerates every complex on at
most five labelled vertices by the deletion/link recursion

    Delta = C union (v * D),  D subseteq C.

The added terminal isolate is a further cone vertex z.
"""

from __future__ import annotations

import argparse
import json
from fractions import Fraction
from pathlib import Path


def complexes(max_vertices: int) -> list[list[int]]:
    # Include the void ideal so it may occur as a vertex link.  The
    # outer audit skips it as a standalone simplicial complex.
    levels = [[0, 1]]
    for vertices in range(1, max_vertices + 1):
        old = levels[-1]
        shift = 1 << (vertices - 1)
        following = []
        for deletion in old:
            for link in old:
                if link & ~deletion:
                    continue
                following.append(deletion | (link << shift))
        levels.append(following)
    return levels


def face_counts(mask: int, vertices: int, root: int) -> tuple[list[int], list[int]]:
    counts = [0] * (vertices + 2)
    avoiding = [0] * (vertices + 2)
    root_bit = 1 << root
    for face in range(1 << vertices):
        if not mask & (1 << face):
            continue
        rank = face.bit_count()
        counts[rank] += 1
        if not face & root_bit:
            avoiding[rank] += 1
    return counts, avoiding


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--max-vertices", type=int, default=5)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()

    levels = complexes(args.max_vertices)
    checks = failures = 0
    minimum = None
    minimum_item = None
    first_failure = None
    for vertices, level in enumerate(levels):
        if vertices == 0:
            continue
        for complex_index, mask in enumerate(level):
            if mask == 0:
                continue
            for root in range(vertices):
                base, avoiding = face_counts(mask, vertices, root)
                # One new isolated terminal vertex: B=(1+x)A.
                total = [
                    base[rank]
                    + (base[rank - 1] if rank else 0)
                    for rank in range(vertices + 2)
                ]
                for r in range(1, vertices + 1):
                    bm = total[r - 1]
                    br = total[r]
                    if not bm or not br:
                        continue
                    u = Fraction(r * br, bm)
                    if u < r:
                        continue
                    rho_previous = Fraction(
                        bm - avoiding[r - 1], bm
                    )
                    rho = Fraction(br - avoiding[r], br)
                    burden = (
                        r * (u + 1) * rho_previous
                        - (r + 1) * u * rho
                    )
                    margin = -burden
                    checks += 1
                    item = {
                        "vertices": vertices,
                        "complex_index": complex_index,
                        "complex_face_mask": mask,
                        "root": root,
                        "rank_r": r,
                        "rank_previous": bm,
                        "rank_current": br,
                        "u": str(u),
                        "rho_previous": str(rho_previous),
                        "rho": str(rho),
                        "burden": str(burden),
                    }
                    if burden > 0:
                        failures += 1
                        if first_failure is None:
                            first_failure = item
                    if minimum is None or margin < minimum:
                        minimum, minimum_item = margin, item
        print(
            f"vertices={vertices}: complexes={len(level):,} "
            f"checks={checks:,} failures={failures:,}",
            flush=True,
        )

    report = {
        "status": "COUNTEREXAMPLE" if failures else "PASS_NOT_PROOF",
        "parameters": vars(args) | {"out": str(args.out)},
        "complex_counts": {
            str(vertices): len(level) - 1
            for vertices, level in enumerate(levels)
        },
        "checks": checks,
        "failures": failures,
        "minimum_margin": (
            None
            if minimum is None
            else {
                "exact": str(minimum),
                "float": float(minimum),
                **minimum_item,
            }
        ),
        "first_failure": first_failure,
    }
    args.out.write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, indent=2))
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
