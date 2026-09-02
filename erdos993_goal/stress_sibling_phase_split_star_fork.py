#!/usr/bin/env python3
"""Exact star-fork stress test of both recursive Theta-core blocks.

This extends ``stress_sibling_shadow_star_fork.py`` by carrying the
surviving-edge generating polynomial alongside each independence
polynomial.  For a forest G,

    E_G(x)=sum_K e(G-N[K]) x^|K|,

and disjoint union obeys

    I_(G+H)=I_G I_H,
    E_(G+H)=E_G I_H+I_G E_H.

The explicit star-fork formulas below therefore recover all residual
count, order, square, and component moments needed by the exact
root/phi/psi/chi/mass split, at central ranks of trees with tens of
thousands of vertices.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from flint import fmpz_poly

from stress_sibling_theta_core_recursive_phase_split import (
    core_blocks_from_moments,
)


X = fmpz_poly([0, 1])
B = fmpz_poly([1, 1])
ZERO = fmpz_poly([0])


def coefficient(poly: fmpz_poly, rank: int) -> int:
    return int(poly[rank]) if 0 <= rank <= poly.degree() else 0


def row(
    state: tuple[fmpz_poly, fmpz_poly],
    rank: int,
) -> tuple[int, int, int, int]:
    independence, surviving_edges = state
    count = coefficient(independence, rank)
    mass = (rank + 1) * coefficient(independence, rank + 1)
    edges = coefficient(surviving_edges, rank)
    square = (
        mass
        + (rank + 2)
        * (rank + 1)
        * coefficient(independence, rank + 2)
        + 2 * edges
    )
    components = mass - edges
    return count, mass, square, components


def rooted_a_data(
    full: tuple[fmpz_poly, fmpz_poly],
    deleted_root: tuple[fmpz_poly, fmpz_poly],
    outside_closed_root: tuple[fmpz_poly, fmpz_poly],
    rank: int,
) -> tuple[int, int, int, int, int, int, int]:
    N, S, H, C = row(full, rank)
    X_count = coefficient(deleted_root[0], rank)
    residual_root = coefficient(outside_closed_root[0], rank)
    Y = X_count - residual_root
    HX = (
        (rank + 1)
        * coefficient(deleted_root[0], rank + 1)
        + residual_root
    )
    return N, S, H, C, X_count, Y, HX


def core_blocks(
    rank_q: int,
    full: tuple[fmpz_poly, fmpz_poly],
    deleted_root: tuple[fmpz_poly, fmpz_poly],
    outside_closed_root: tuple[fmpz_poly, fmpz_poly],
) -> dict[str, int]:
    return core_blocks_from_moments(
        rank_q,
        rooted_a_data(
            full, deleted_root, outside_closed_root, rank_q
        ),
        row(deleted_root, rank_q - 1),
        row(deleted_root, rank_q - 2),
    )


def scale_state_by_isolates(
    state: tuple[fmpz_poly, fmpz_poly],
    isolate_count: int,
) -> tuple[fmpz_poly, fmpz_poly]:
    factor = B**isolate_count
    return state[0] * factor, state[1] * factor


def family_states(
    m: int,
    t: int,
) -> tuple[
    tuple[fmpz_poly, fmpz_poly],
    tuple[fmpz_poly, fmpz_poly],
    tuple[fmpz_poly, fmpz_poly],
]:
    """Return old, new, lower rooted triples (full,J,R)."""
    star = B**m + X
    rest = star ** (t - 1)
    rest2 = star ** (t - 2)

    old_r_i = rest * star
    old_r_e = t * m * rest
    old_leaf_bundle = B ** (m * t)
    old_inward_i = old_r_i + X * old_leaf_bundle
    old_inward_e = (
        old_r_e + t * B ** (m * (t - 1))
    )
    old_j = scale_state_by_isolates(
        (old_inward_i, old_inward_e), 2
    )
    old_full = (
        old_j[0] + X * old_r_i,
        old_j[1]
        + X * old_r_e
        + 2 * old_r_i
        + old_leaf_bundle,
    )
    old = (old_full, old_j, (old_r_i, old_r_e))

    larger_star = B ** (m + 1) + X
    new_r_i = rest * larger_star
    new_r_e = (
        (m + 1) * rest
        + (t - 1) * m * larger_star * rest2
    )
    new_leaf_bundle = B ** (m * t + 1)
    new_inward_i = new_r_i + X * new_leaf_bundle
    new_inward_e = (
        new_r_e
        + B ** (m * (t - 1))
        + (t - 1) * B ** (m * (t - 1) + 1)
    )
    new_j = scale_state_by_isolates(
        (new_inward_i, new_inward_e), 2
    )
    new_full = (
        new_j[0] + X * new_r_i,
        new_j[1]
        + X * new_r_e
        + 2 * new_r_i
        + new_leaf_bundle,
    )
    new = (new_full, new_j, (new_r_i, new_r_e))

    lower_leaf_bundle = B ** (m * (t - 1))
    lower_inward_i = rest + X * lower_leaf_bundle
    lower_inward_e = (
        (t - 1) * m * rest2
        + (t - 1) * B ** (m * (t - 2))
    )
    lower_j = scale_state_by_isolates(
        (lower_inward_i, lower_inward_e), m + 2
    )
    lower_r = scale_state_by_isolates(
        (rest, (t - 1) * m * rest2), m
    )
    lower_full = (
        lower_j[0] + X * lower_r[0],
        lower_j[1]
        + X * lower_r[1]
        + 2 * lower_r[0]
        + old_leaf_bundle,
    )
    lower = (lower_full, lower_j, lower_r)
    return old, new, lower


def audit_family(m: int, t: int, half_window: int) -> list[dict]:
    old, new, lower = family_states(m, t)
    center = (m * t + 4) // 2
    rows = []
    for q in range(center - half_window, center + half_window + 1):
        old_blocks = core_blocks(q, *old)
        new_blocks = core_blocks(q, *new)
        lower_blocks = core_blocks(q - 1, *lower)
        delta = {
            name: (
                new_blocks[name]
                - old_blocks[name]
                - lower_blocks[name]
            )
            for name in old_blocks
        }
        grouped = {
            "shadow_phi": (
                delta["root"] + delta["phi"] + delta["mass"]
            ),
            "component_square": delta["psi"] + delta["chi"],
            "total": sum(delta.values()),
        }
        rows.append(
            {
                "m": m,
                "t": t,
                "tree_order": 4 + t * (m + 1),
                "rank_q": q,
                "grouped_signs": {
                    name: (
                        1 if value > 0 else (-1 if value < 0 else 0)
                    )
                    for name, value in grouped.items()
                },
                "grouped_bit_lengths": {
                    name: abs(value).bit_length()
                    for name, value in grouped.items()
                },
                "blocks": {
                    name: {
                        "sign": (
                            1
                            if value > 0
                            else (-1 if value < 0 else 0)
                        ),
                        "bit_length": abs(value).bit_length(),
                    }
                    for name, value in delta.items()
                },
            }
        )
    return rows


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--half-window", type=int, default=8)
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(
            "sibling_phase_split_star_fork_stress_20260729.json"
        ),
    )
    args = parser.parse_args()

    rows = []
    for m, t in ((10, 1075), (15, 1200), (23, 2000)):
        rows.extend(audit_family(m, t, args.half_window))
    failures = [
        row
        for row in rows
        if any(
            sign < 0 for sign in row["grouped_signs"].values()
        )
    ]
    report = {
        "status": (
            "PASS_FULL_PHASE_SPLIT_STAR_FORK_STRESS"
            if not failures
            else "FAIL_FULL_PHASE_SPLIT_STAR_FORK_STRESS"
        ),
        "families": [
            {"m": 10, "t": 1075},
            {"m": 15, "t": 1200},
            {"m": 23, "t": 2000},
        ],
        "half_window": args.half_window,
        "checked_ranks": len(rows),
        "failure_count": len(failures),
        "failures": failures[:20],
        "rows": rows,
        "warning": (
            "This is exact adversarial finite evidence, not a proof "
            "of either recursive phase-block inequality."
        ),
    }
    args.output.write_text(
        json.dumps(report, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
