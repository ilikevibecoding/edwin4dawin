#!/usr/bin/env python3
"""Audit ISO and pointed ISO on the public D14 obstruction tree."""

from __future__ import annotations

import json
import sys
from fractions import Fraction
from pathlib import Path


HERE = Path(__file__).resolve().parent
PUBLIC_REPO = HERE / "literature_sources" / "erdos-problem-993-current"
sys.path.insert(0, str(PUBLIC_REPO))

from indpoly import independence_poly  # noqa: E402
from scratch_spectral_energy_dp_20260711 import (  # noqa: E402
    make_double_spherical_tree,
)


def induced_adjacency(
    adjacency: list[list[int]], deleted: set[int]
) -> list[list[int]]:
    vertices = [
        vertex
        for vertex in range(len(adjacency))
        if vertex not in deleted
    ]
    position = {
        vertex: index for index, vertex in enumerate(vertices)
    }
    return [
        [
            position[neighbor]
            for neighbor in adjacency[vertex]
            if neighbor not in deleted
        ]
        for vertex in vertices
    ]


def encode(value, item):
    if value is None:
        return None
    return {"exact": str(value), "float": float(value), **item}


def main() -> None:
    adjacency = make_double_spherical_tree((2, 3, 2, 1, 2, 1, 1))
    polynomial = independence_poly(len(adjacency), adjacency)
    minimum_iso = None
    minimum_iso_item = None
    iso_failures = 0
    eligible_ranks = []
    for r in range(1, len(polynomial) - 1):
        bm, b, bp = (
            polynomial[r - 1],
            polynomial[r],
            polynomial[r + 1],
        )
        u = Fraction(r * b, bm)
        if u < r:
            continue
        eligible_ranks.append(r)
        reserve = Fraction(
            r
            * (
                r * b * b
                + bm * bm
                - (r + 1) * bm * bp
            ),
            bm * bm,
        )
        item = {"rank_r": r, "u": str(u)}
        if reserve < 0:
            iso_failures += 1
        if minimum_iso is None or reserve < minimum_iso:
            minimum_iso, minimum_iso_item = reserve, item

    minimum_pointed = None
    minimum_pointed_item = None
    maximum_ratio = None
    maximum_ratio_item = None
    pointed_failures = 0
    checks = 0
    for root in range(len(adjacency)):
        deleted = {root, *adjacency[root]}
        link_adjacency = induced_adjacency(adjacency, deleted)
        link_polynomial = independence_poly(
            len(link_adjacency), link_adjacency
        )
        for r in eligible_ranks:
            bm, b, bp = (
                polynomial[r - 1],
                polynomial[r],
                polynomial[r + 1],
            )
            u = Fraction(r * b, bm)
            hm = (
                link_polynomial[r - 2]
                if 0 <= r - 2 < len(link_polynomial)
                else 0
            )
            h = (
                link_polynomial[r - 1]
                if 0 <= r - 1 < len(link_polynomial)
                else 0
            )
            reserve = Fraction(
                r
                * (
                    r * b * b
                    + bm * bm
                    - (r + 1) * bm * bp
                ),
                bm * bm,
            )
            burden = (
                r * (u + 1) * Fraction(hm, bm)
                - (r + 1) * u * Fraction(h, b)
            )
            margin = reserve - 2 * burden
            checks += 1
            item = {
                "root": root,
                "root_degree": len(adjacency[root]),
                "rank_r": r,
                "u": str(u),
                "ISO_reserve": str(reserve),
                "burden": str(burden),
            }
            if margin < 0:
                pointed_failures += 1
            if (
                minimum_pointed is None
                or margin < minimum_pointed
            ):
                minimum_pointed = margin
                minimum_pointed_item = item
            if burden > 0 and reserve > 0:
                ratio = burden / reserve
                if maximum_ratio is None or ratio > maximum_ratio:
                    maximum_ratio = ratio
                    maximum_ratio_item = item
        if (root + 1) % 25 == 0:
            print(
                f"roots={root + 1}/{len(adjacency)} "
                f"checks={checks:,} failures={pointed_failures:,}",
                flush=True,
            )

    report = {
        "tree": "D14 double spherical (2,3,2,1,2,1,1)",
        "order": len(adjacency),
        "alpha": len(polynomial) - 1,
        "eligible_u_ge_r_ranks": eligible_ranks,
        "ISO_failures": iso_failures,
        "minimum_ISO_reserve": encode(
            minimum_iso, minimum_iso_item
        ),
        "pointed_checks": checks,
        "pointed_failures": pointed_failures,
        "minimum_pointed_margin": encode(
            minimum_pointed, minimum_pointed_item
        ),
        "maximum_burden_to_reserve": encode(
            maximum_ratio, maximum_ratio_item
        ),
    }
    output = HERE / "public_d14_pointed_iso_20260728.json"
    output.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
