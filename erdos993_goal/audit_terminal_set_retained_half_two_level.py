#!/usr/bin/env python3
"""Audit retained-half PISO for genuine terminal hit sets.

Take the two-level tree with a central vertex q, M branch centers,
and t leaves at every branch center.  This is the connected part left
after deleting a terminal support and one of its leaves.  Add s
isolated sibling leaves and use

    W = {q} union {the s isolated siblings}

as the terminal hit set.  The default s=t-1 is the literal terminal
configuration.

The residual-state distribution is exact.  It records whether a
down-link set already hits W and, otherwise, the number and degree
sum of surviving W vertices.  This is enough to evaluate every term
in the retained-half square-completion integrand.
"""

from __future__ import annotations

import argparse
import json
from collections import defaultdict
from fractions import Fraction
from math import comb
from pathlib import Path

from flint import fmpz_poly

from audit_retained_half_state_partition import (
    local_quantities,
    root_component_distribution,
)
from random_leaf_gsb_local_payment import coeff, tree_polynomial


X = fmpz_poly([0, 1])
ONE = fmpz_poly([1])


def two_level(branches: int, leaves: int) -> list[list[int]]:
    order = 1 + branches * (leaves + 1)
    adjacency = [[] for _ in range(order)]
    following = 1
    for _ in range(branches):
        center = following
        following += 1
        adjacency[0].append(center)
        adjacency[center].append(0)
        for _ in range(leaves):
            leaf = following
            following += 1
            adjacency[center].append(leaf)
            adjacency[leaf].append(center)
    return adjacency


def terminal_local_quantities(
    residual_n: int,
    residual_m: int,
    square_sum: int,
    inherited: bool,
    terminal_count: int,
    terminal_degree_sum: int,
):
    """General-W version of the rank-two fiber quantities."""
    if inherited:
        return local_quantities(
            residual_n,
            residual_m,
            square_sum,
            "selected",
            0,
        )

    n = residual_n
    a_value = Fraction(
        n * (n - 1) - 2 * residual_m, n
    )
    mean_q = Fraction(
        n * residual_m - square_sum, n
    )
    variance = (
        Fraction(square_sum, n)
        - Fraction(4 * residual_m * residual_m, n * n)
    )
    terminal = terminal_count
    p_value = Fraction(terminal, n)
    # W is independent in this terminal family.  Thus every residual
    # edge incident with W is a W--outside edge.
    covariance = (
        Fraction(
            terminal * (n - 1) - terminal_degree_sum,
            n,
        )
        - p_value * a_value
    )
    z_value = Fraction(
        terminal * (n - terminal) - terminal_degree_sum,
        n,
    )
    burden = (
        (2 - a_value) * p_value
        - 3 * covariance
        - 3 * z_value
    )
    raw_margin = (
        2
        + a_value
        + 2 * mean_q
        - variance
        - 2 * burden
    )
    adjustment = (
        2 * burden if n < 2 else Fraction(0)
    )
    drift_factor = (
        1 - 2 * p_value + 2 * (covariance + z_value)
    )
    return (
        a_value,
        p_value,
        raw_margin,
        adjustment,
        drift_factor,
    )


def evaluate_adjacency(
    adjacency: list[list[int]],
    root: int,
    siblings: int,
    min_rank: int,
    metadata: dict,
) -> dict:
    connected_poly = tree_polynomial(adjacency)
    polynomial = connected_poly * (ONE + X) ** siblings
    root_deleted = tree_polynomial(adjacency, deleted=root)
    alpha = polynomial.degree()
    relevant = []
    for r in range(min_rank, alpha + 1):
        bm = int(coeff(polynomial, r - 1))
        br = int(coeff(polynomial, r))
        if bm and br and Fraction(r * br, bm) >= r:
            relevant.append(r)
    if not relevant:
        return {
            **metadata,
            "siblings": siblings,
            "checks": 0,
            "failures": {},
            "minima": {},
        }

    distribution = root_component_distribution(
        adjacency, root, max(relevant) - 2
    )
    by_rank = defaultdict(list)
    for key, count in distribution.items():
        by_rank[key[0]].append((key, count))

    failures = defaultdict(int)
    minima = {}
    minimum_items = {}
    for r in relevant:
        bm = int(coeff(polynomial, r - 1))
        br = int(coeff(polynomial, r))
        u = Fraction(r * br, bm)
        avoiding = int(coeff(root_deleted, r - 1))
        p = Fraction(bm - avoiding, bm)
        hit_probability_r = Fraction(
            br - int(coeff(root_deleted, r)), br
        )
        burden = (
            r * (u + 1) * p
            - (r + 1) * u * hit_probability_r
        )
        mass = (r - 1) * bm
        observed = 0
        sums = {
            "inherited": Fraction(0),
            "blocked": Fraction(0),
            "genuine": Fraction(0),
        }
        d = r - 2
        # Iterate only the required connected ranks.  The explicit
        # spelling below avoids materializing a second large table.
        for k_connected, states in by_rank.items():
            chosen_siblings = d - k_connected
            if not 0 <= chosen_siblings <= siblings:
                continue
            isolate_choices = comb(siblings, chosen_siblings)
            for (
                _k,
                residual_n_connected,
                residual_m,
                square_sum,
                state,
                root_degree,
            ), count_connected in states:
                residual_isolates = siblings - chosen_siblings
                residual_n = (
                    residual_n_connected + residual_isolates
                )
                if residual_n <= 0:
                    continue
                count = count_connected * isolate_choices
                weight_mass = count * residual_n
                observed += weight_mass
                inherited = (
                    chosen_siblings > 0 or state == "selected"
                )
                if inherited:
                    terminal_count = 0
                    terminal_degree_sum = 0
                else:
                    terminal_count = siblings + int(state == "open")
                    terminal_degree_sum = (
                        root_degree if state == "open" else 0
                    )
                (
                    a_value,
                    p_value,
                    raw_margin,
                    adjustment,
                    drift_factor,
                ) = terminal_local_quantities(
                    residual_n,
                    residual_m,
                    square_sum,
                    inherited,
                    terminal_count,
                    terminal_degree_sum,
                )
                centered_p = p_value - p
                centered = a_value - u - r * centered_p
                phi = (
                    raw_margin
                    - adjustment
                    + 2 * (r - 2) * drift_factor
                    + 2 * r * r * centered_p * centered_p
                    - 2 * centered * centered
                )
                if inherited:
                    key = "inherited"
                elif terminal_count == 0:
                    key = "blocked"
                else:
                    key = "genuine"
                sums[key] += Fraction(weight_mass, mass) * phi
        assert observed == mass, (
            metadata,
            siblings,
            r,
            observed,
            mass,
        )
        values = {
            "retained_half_total": sum(sums.values()),
            "inherited_half_blocked":
                sums["inherited"] + sums["blocked"] / 2,
            "genuine_half_blocked":
                sums["genuine"] + sums["blocked"] / 2,
        }
        if siblings >= 1:
            values["nonpositive_occupancy_burden"] = -burden
        item = {
            **metadata,
            "siblings": siblings,
            "order_F": len(adjacency) + siblings,
            "alpha_F": alpha,
            "r": r,
            "u": str(u),
            "global_hit_probability": str(p),
            "next_hit_probability": str(hit_probability_r),
            "occupancy_burden": str(burden),
            **{name: str(value) for name, value in sums.items()},
        }
        for name, value in values.items():
            if value < 0:
                failures[name] += 1
            if name not in minima or value < minima[name]:
                minima[name] = value
                minimum_items[name] = item

    return {
        **metadata,
        "siblings": siblings,
        "checks": len(relevant),
        "failures": dict(failures),
        "minima": {
            name: {
                "exact": str(value),
                "float": float(value),
                **minimum_items[name],
            }
            for name, value in minima.items()
        },
    }


def evaluate(
    branches: int,
    leaves: int,
    siblings: int,
    min_rank: int,
) -> dict:
    return evaluate_adjacency(
        two_level(branches, leaves),
        0,
        siblings,
        min_rank,
        {"branches": branches, "leaves": leaves},
    )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--max-branches", type=int, default=12)
    parser.add_argument("--max-leaves", type=int, default=12)
    parser.add_argument("--min-rank", type=int, default=6)
    parser.add_argument(
        "--independent-siblings",
        action="store_true",
        help="scan every 0<=s<leaves instead of only s=leaves-1",
    )
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()

    results = []
    total_checks = 0
    failures = defaultdict(int)
    global_minima = {}
    for leaves in range(1, args.max_leaves + 1):
        sibling_values = (
            range(leaves)
            if args.independent_siblings
            else [leaves - 1]
        )
        for branches in range(0, args.max_branches + 1):
            for siblings in sibling_values:
                result = evaluate(
                    branches,
                    leaves,
                    siblings,
                    args.min_rank,
                )
                results.append(result)
                total_checks += result["checks"]
                for name, count in result["failures"].items():
                    failures[name] += count
                for name, item in result["minima"].items():
                    if (
                        name not in global_minima
                        or Fraction(item["exact"])
                        < Fraction(global_minima[name]["exact"])
                    ):
                        global_minima[name] = item
        print(
            f"leaves={leaves} checks={total_checks:,} "
            f"failures={dict(failures)}",
            flush=True,
        )

    report = {
        "status": (
            "FAIL_CANDIDATE"
            if failures.get("retained_half_total", 0)
            else "PASS_NOT_PROOF"
        ),
        "parameters": vars(args) | {"out": str(args.out)},
        "families": len(results),
        "checks": total_checks,
        "failures": dict(failures),
        "minima": global_minima,
        "results": results,
    }
    args.out.write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(
        json.dumps(
            {
                "status": report["status"],
                "families": report["families"],
                "checks": total_checks,
                "failures": dict(failures),
                "minimum_floats": {
                    name: item["float"]
                    for name, item in global_minima.items()
                },
                "report": str(args.out),
            },
            indent=2,
        ),
        flush=True,
    )
    return 1 if report["status"] == "FAIL_CANDIDATE" else 0


if __name__ == "__main__":
    raise SystemExit(main())
