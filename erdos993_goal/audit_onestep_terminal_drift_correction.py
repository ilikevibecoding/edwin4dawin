#!/usr/bin/env python3
"""Exact large-tree audit of the one-step pointed-reserve correction.

Condition a uniform independent (r-1)-set S on a uniformly selected
vertex K={v} of S.  Write

    A_v = E[e(S) | v in S],
    p_v = P(q in S | v in S),

where q is the distinguished root and e(S) is the number of
one-vertex extensions of S.  The exact rank recurrence is

    P_r = E[P_(r-1)(v)] + C_r,

    C_r = E[M_B(r-1,v)] - Var(A_v) + r Cov(A_v,p_v)
        = M_B(r) - Var(A_v) + (r-1) Cov(A_v,p_v).

This script evaluates C_r using independence polynomials of the
closed-neighborhood deletions F-N[v].  It therefore handles much
larger trees than explicit independent-set enumeration.
"""

from __future__ import annotations

import argparse
import json
import random
import sys
import time
from fractions import Fraction
from pathlib import Path

import networkx as nx
from flint import fmpz_poly


X = fmpz_poly([0, 1])
ONE = fmpz_poly([1])


def coeff(poly: fmpz_poly, rank: int) -> int:
    return int(poly[rank]) if 0 <= rank <= poly.degree() else 0


def forest_polynomial(
    adjacency: list[list[int]],
    deleted: frozenset[int] = frozenset(),
) -> fmpz_poly:
    """Independence polynomial after deleting an arbitrary vertex set."""

    seen = [False] * len(adjacency)

    def rooted(vertex: int, parent: int):
        seen[vertex] = True
        excluded = ONE
        included_without_x = ONE
        for child in adjacency[vertex]:
            if (
                child == parent
                or child in deleted
                or seen[child]
            ):
                continue
            child_excluded, child_included = rooted(
                child, vertex
            )
            excluded *= child_excluded + X * child_included
            included_without_x *= child_excluded
        return excluded, included_without_x

    output = ONE
    for vertex in range(len(adjacency)):
        if vertex in deleted or seen[vertex]:
            continue
        excluded, included = rooted(vertex, -1)
        output *= excluded + X * included
    return output


def adjacency_from_edges(order: int, edges):
    adjacency = [[] for _ in range(order)]
    for left, right in edges:
        adjacency[left].append(right)
        adjacency[right].append(left)
    return adjacency


def broom_adjacency(leaves: int, path_order: int):
    order = 1 + leaves + path_order
    adjacency = [[] for _ in range(order)]
    for leaf in range(1, leaves + 1):
        adjacency[0].append(leaf)
        adjacency[leaf].append(0)
    previous = 0
    for vertex in range(
        leaves + 1, leaves + path_order + 1
    ):
        adjacency[previous].append(vertex)
        adjacency[vertex].append(previous)
        previous = vertex
    return adjacency


def evaluate_tree(
    adjacency: list[list[int]],
    root: int,
    label: str,
):
    order = len(adjacency)
    poly = forest_polynomial(adjacency)
    root_deleted = forest_polynomial(
        adjacency, frozenset((root,))
    )
    alpha = poly.degree()
    closed = [
        frozenset((vertex, *adjacency[vertex]))
        for vertex in range(order)
    ]
    link_polynomials = [
        forest_polynomial(adjacency, closed[vertex])
        for vertex in range(order)
    ]
    link_avoid_root_polynomials = [
        (
            None
            if root in closed[vertex]
            else forest_polynomial(
                adjacency,
                closed[vertex] | frozenset((root,)),
            )
        )
        for vertex in range(order)
    ]

    checks = required_checks = identity_failures = 0
    failures = required_failures = 0
    minimum = minimum_required = None

    for r in range(6, alpha + 1):
        bm = coeff(poly, r - 1)
        br = coeff(poly, r)
        if min(bm, br) <= 0:
            continue
        u = Fraction(r * br, bm)
        if u < r:
            continue
        required = (
            (alpha - r) * (order - r)
            > (r + 1) * (r + 2)
        )
        total_mass = 0
        sum_a = sum_a2 = Fraction(0)
        sum_p = sum_ap = Fraction(0)
        for vertex in range(order):
            link = link_polynomials[vertex]
            fiber_mass = coeff(link, r - 2)
            if not fiber_mass:
                continue
            total_mass += fiber_mass
            a_value = Fraction(
                (r - 1) * coeff(link, r - 1),
                fiber_mass,
            )
            if vertex == root:
                p_value = Fraction(1)
            elif root in closed[vertex]:
                p_value = Fraction(0)
            else:
                avoiding = coeff(
                    link_avoid_root_polynomials[vertex],
                    r - 2,
                )
                p_value = Fraction(
                    fiber_mass - avoiding,
                    fiber_mass,
                )
            weight = Fraction(fiber_mass, (r - 1) * bm)
            sum_a += weight * a_value
            sum_a2 += weight * a_value * a_value
            sum_p += weight * p_value
            sum_ap += weight * a_value * p_value

        mean_a = sum_a
        variance_a = sum_a2 - mean_a * mean_a
        mean_p = sum_p
        covariance = sum_ap - mean_a * mean_p
        hm = bm - coeff(root_deleted, r - 1)
        hr = br - coeff(root_deleted, r)
        rho_m = Fraction(hm, bm)
        rho = Fraction(hr, br)
        global_component_b = (
            1 - (u + 1) * rho_m + u * rho
        )
        average_local_component_b = (
            global_component_b - covariance
        )
        correction = (
            global_component_b
            - variance_a
            + (r - 1) * covariance
        )
        item = {
            "label": label,
            "order": order,
            "alpha": alpha,
            "root": root,
            "root_degree": len(adjacency[root]),
            "rank_r": r,
            "required": required,
            "u": str(u),
            "global_component_B": str(global_component_b),
            "average_local_component_B": str(
                average_local_component_b
            ),
            "variance_A": str(variance_a),
            "covariance_A_p": str(covariance),
            "one_step_correction": str(correction),
        }
        checks += 1
        if required:
            required_checks += 1
        if (
            total_mass != (r - 1) * bm
            or mean_a != u
            or mean_p != rho_m
        ):
            identity_failures += 1
        if correction < 0:
            failures += 1
            if required:
                required_failures += 1
        if minimum is None or correction < minimum[0]:
            minimum = (correction, item)
        if required and (
            minimum_required is None
            or correction < minimum_required[0]
        ):
            minimum_required = (correction, item)

    def encode(record):
        return (
            None
            if record is None
            else {
                "exact": str(record[0]),
                "float": float(record[0]),
                **record[1],
            }
        )

    return {
        "label": label,
        "order": order,
        "alpha": alpha,
        "root": root,
        "root_degree": len(adjacency[root]),
        "checks": checks,
        "required_checks": required_checks,
        "failures": failures,
        "required_failures": required_failures,
        "identity_failures": identity_failures,
        "minimum": encode(minimum),
        "minimum_required": encode(minimum_required),
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--broom",
        action="append",
        default=[],
        metavar="LEAVES,PATH_ORDER",
    )
    parser.add_argument("--random-samples", type=int, default=0)
    parser.add_argument("--order", type=int, default=60)
    parser.add_argument("--roots", type=int, default=3)
    parser.add_argument("--seed", type=int, default=993)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()

    sys.setrecursionlimit(max(5000, 4 * args.order))
    tasks = []
    for specification in args.broom:
        leaves_text, path_text = specification.split(",", 1)
        leaves = int(leaves_text)
        path_order = int(path_text)
        tasks.append(
            (
                broom_adjacency(leaves, path_order),
                0,
                f"broom_s{leaves}_L{path_order}",
            )
        )

    rng = random.Random(args.seed)
    for sample in range(args.random_samples):
        graph = nx.from_prufer_sequence(
            [
                rng.randrange(args.order)
                for _ in range(args.order - 2)
            ]
        )
        adjacency = [
            list(graph.neighbors(vertex))
            for vertex in range(args.order)
        ]
        roots = sorted(
            range(args.order),
            key=lambda vertex: len(adjacency[vertex]),
            reverse=True,
        )[:1]
        while len(roots) < min(args.roots, args.order):
            root = rng.randrange(args.order)
            if root not in roots:
                roots.append(root)
        for root in roots:
            tasks.append(
                (
                    adjacency,
                    root,
                    f"random_{sample}_root_{root}",
                )
            )

    started = time.time()
    reports = []
    for index, task in enumerate(tasks):
        report = evaluate_tree(*task)
        reports.append(report)
        print(
            f"{index + 1}/{len(tasks)} {report['label']}: "
            f"checks={report['checks']}, "
            f"failures={report['failures']}, "
            f"required_failures={report['required_failures']}",
            flush=True,
        )
    minima = [
        report["minimum"] for report in reports
        if report["minimum"] is not None
    ]
    required_minima = [
        report["minimum_required"] for report in reports
        if report["minimum_required"] is not None
    ]
    payload = {
        "parameters": vars(args) | {"out": str(args.out)},
        "trees_and_roots": len(tasks),
        "checks": sum(report["checks"] for report in reports),
        "required_checks": sum(
            report["required_checks"] for report in reports
        ),
        "failures": sum(
            report["failures"] for report in reports
        ),
        "required_failures": sum(
            report["required_failures"] for report in reports
        ),
        "identity_failures": sum(
            report["identity_failures"] for report in reports
        ),
        "minimum": (
            min(minima, key=lambda item: item["float"])
            if minima
            else None
        ),
        "minimum_required": (
            min(
                required_minima,
                key=lambda item: item["float"],
            )
            if required_minima
            else None
        ),
        "elapsed_seconds": time.time() - started,
        "reports": reports,
    }
    args.out.write_text(
        json.dumps(payload, indent=2), encoding="utf-8"
    )
    print(
        json.dumps(
            {
                key: value
                for key, value in payload.items()
                if key != "reports"
            },
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
