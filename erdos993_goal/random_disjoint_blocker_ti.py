#!/usr/bin/env python3
"""Random exact stress test of the abstract disjoint-blocker TI lemma."""

from __future__ import annotations

import argparse
import json
import random
from fractions import Fraction
from math import comb
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--samples", type=int, default=50_000)
    parser.add_argument("--vertices", type=int, default=40)
    parser.add_argument("--max-facets", type=int, default=20)
    parser.add_argument("--max-facet-size", type=int, default=14)
    parser.add_argument("--max-degree", type=int, default=12)
    parser.add_argument(
        "--force-color-classes-faces",
        action="store_true",
    )
    parser.add_argument(
        "--force-colored-union-face",
        action="store_true",
        help=(
            "Force the union of every positive color class to be a "
            "face, as happens for distance-two blockers in a tree."
        ),
    )
    parser.add_argument("--max-color-class-size", type=int, default=10)
    parser.add_argument("--seed", type=int, default=993_20260729)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()

    rng = random.Random(args.seed)
    checks = failures = 0
    maximum = None
    maximum_item = None
    first = None

    for sample in range(args.samples):
        degree = rng.randint(0, args.max_degree)
        if (
            args.force_color_classes_faces
            or args.force_colored_union_face
        ) and degree:
            colors = [0] * args.vertices
            available_vertices = list(range(args.vertices))
            rng.shuffle(available_vertices)
            cursor = 0
            forced_facets = []
            for color in range(1, degree + 1):
                remaining = len(available_vertices) - cursor
                if remaining <= 0:
                    break
                size = rng.randint(
                    1,
                    min(args.max_color_class_size, remaining),
                )
                selected = available_vertices[cursor:cursor + size]
                cursor += size
                for vertex in selected:
                    colors[vertex] = color
                forced_facets.append(
                    sum(1 << vertex for vertex in selected)
                )
            if args.force_colored_union_face:
                forced_facets = [
                    sum(
                        1 << vertex
                        for vertex, color in enumerate(colors)
                        if color > 0
                    )
                ]
        else:
            colors = [
                rng.randint(0, degree) if degree else 0
                for _ in range(args.vertices)
            ]
            forced_facets = []
        faces = {0}
        facet_count = rng.randint(1, args.max_facets)
        facets = list(forced_facets)
        for mask in forced_facets:
            subset = mask
            while True:
                faces.add(subset)
                if subset == 0:
                    break
                subset = (subset - 1) & mask
        for _ in range(facet_count):
            size = rng.randint(
                1, min(args.max_facet_size, args.vertices)
            )
            vertices = rng.sample(range(args.vertices), size)
            mask = sum(1 << vertex for vertex in vertices)
            facets.append(mask)
            subset = mask
            while True:
                faces.add(subset)
                if subset == 0:
                    break
                subset = (subset - 1) & mask

        deletion_link = [0] * (args.vertices + 1)
        root_deleted = [
            0
            for _ in range(args.vertices + degree + 1)
        ]
        for face in faces:
            size = face.bit_count()
            deletion_link[size] += 1
            blocked = {
                colors[vertex]
                for vertex in range(args.vertices)
                if face & (1 << vertex) and colors[vertex] > 0
            }
            available = degree - len(blocked)
            for selected in range(available + 1):
                root_deleted[size + selected] += comb(
                    available, selected
                )

        rooted_base = [
            (
                root_deleted[rank]
                if rank < len(root_deleted)
                else 0
            )
            + (
                deletion_link[rank - 1]
                if 0 <= rank - 1 < len(deletion_link)
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
                "degree": degree,
                "rank": rank,
                "burden": str(burden),
                "face_count": len(faces),
                "facets": facets,
                "colors": colors,
            }
            if maximum is None or burden > maximum:
                maximum = burden
                maximum_item = item
            if burden > 0:
                failures += 1
                first = item
                break
        if first is not None:
            break
        if (sample + 1) % 5000 == 0:
            print(
                f"samples={sample + 1:,} checks={checks:,} "
                f"max={float(maximum) if maximum is not None else None}",
                flush=True,
            )

    report = {
        "status": "COUNTEREXAMPLE" if first else "PASS_NOT_PROOF",
        "parameters": vars(args) | {"out": str(args.out)},
        "checks": checks,
        "failures": failures,
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
