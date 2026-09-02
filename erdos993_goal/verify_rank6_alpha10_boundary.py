#!/usr/bin/env python3
"""Exact finite certificate for the rank-six alpha(G)=10 boundary.

For a pendant edge ``lp`` put ``B=G-{l,p}`` and
``I(G)=(1+x)B+xC``.  Since alpha(G)=10, alpha(B)=9 and |B|<=18.
The only forest polynomial rows with alpha 9 and negative V6 are classified
exactly.  For each such row this replay enumerates every component
factorization and every possible one-vertex deletion in each component,
thereby covering every actual component-separated C.
"""

from __future__ import annotations

import hashlib
import itertools
import json
from pathlib import Path

import networkx as nx
import sympy as sp
from flint import fmpz_poly as Poly

from scan_forest_iso_reserve_floor import tree_polynomial


ROOT = Path(__file__).resolve().parent
REPORT = ROOT / "rank6_alpha10_boundary_exact_20260813.json"
Polynomial = tuple[int, ...]
X = sp.symbols("x")


def coeff(poly: Polynomial, rank: int) -> int:
    return poly[rank] if 0 <= rank < len(poly) else 0


def multiply(left: Polynomial, right: Polynomial) -> Polynomial:
    return tuple(int(value) for value in Poly(list(left)) * Poly(list(right)))


def product(parts: tuple[Polynomial, ...] | list[Polynomial]) -> Polynomial:
    value = (1,)
    for part in parts:
        value = multiply(value, part)
    return value


def v6(poly: Polynomial) -> int:
    b4, b5, b6 = (coeff(poly, rank) for rank in (4, 5, 6))
    return 4 * b4 * b5 + 39 * b4 * b6 - 25 * b5 * b5


def q6(poly: Polynomial) -> int:
    p5, p6, p7 = (coeff(poly, rank) for rank in (5, 6, 7))
    return 12 * p6 * p6 - p5 * p6 - 14 * p5 * p7


def full_polynomial(b: Polynomial, c: Polynomial) -> Polynomial:
    values = [0] * max(len(b) + 1, len(c) + 1)
    for rank, value in enumerate(b):
        values[rank] += value
        values[rank + 1] += value
    for rank, value in enumerate(c):
        values[rank + 1] += value
    while len(values) > 1 and values[-1] == 0:
        values.pop()
    return tuple(values)


def cleared_margin(b: Polynomial, c: Polynomial) -> tuple[int, Polynomial]:
    p = full_polynomial(b, c)
    p5, b4 = coeff(p, 5), coeff(b, 4)
    value = 3 * b4 * q6(p) + 9 * coeff(c, 5) * p5 * b4 + v6(b) * p5
    return value, p


def as_sympy(poly: Polynomial) -> sp.Poly:
    return sp.Poly(sum(value * X**rank for rank, value in enumerate(poly)), X)


def as_tuple(poly: sp.Poly) -> Polynomial:
    return tuple(int(poly.nth(rank)) for rank in range(poly.degree() + 1))


def divisors(target: Polynomial) -> set[Polynomial]:
    _, factors = sp.factor_list(as_sympy(target))
    atoms: list[sp.Poly] = []
    for factor, exponent in factors:
        atoms.extend([factor] * exponent)
    candidates = set()
    for mask in range(1, 1 << len(atoms)):
        value = sp.Poly(1, X)
        for index, atom in enumerate(atoms):
            if mask & (1 << index):
                value *= atom
        candidate = as_tuple(value)
        order = coeff(candidate, 1)
        alpha = len(candidate) - 1
        if order and 2 * alpha >= order:
            candidates.add(candidate)
    return candidates


def deleted_polynomial(tree: nx.Graph, vertex: int) -> Polynomial:
    remainder = tree.copy()
    remainder.remove_node(vertex)
    parts = []
    for vertices in nx.connected_components(remainder):
        component = nx.convert_node_labels_to_integers(
            remainder.subgraph(vertices).copy()
        )
        parts.append((1, 1) if len(component) == 1 else tree_polynomial(component))
    return product(parts)


def exact_quotient(numerator: Polynomial, denominator: Polynomial) -> Polynomial | None:
    quotient, remainder = sp.div(as_sympy(numerator), as_sympy(denominator))
    if not remainder.is_zero:
        return None
    result = as_tuple(quotient)
    if any(value < 0 for value in result) or coeff(result, 0) != 1:
        return None
    return result


def decompositions(
    target: Polynomial,
    candidates: list[Polynomial],
) -> set[tuple[Polynomial, ...]]:
    answer: set[tuple[Polynomial, ...]] = set()

    def visit(remaining: Polynomial, start: int, chosen: list[Polynomial]) -> None:
        if remaining == (1,):
            answer.add(tuple(chosen))
            return
        for index in range(start, len(candidates)):
            candidate = candidates[index]
            if coeff(candidate, 1) > coeff(remaining, 1):
                break
            quotient = exact_quotient(remaining, candidate)
            if quotient is None:
                continue
            chosen.append(candidate)
            visit(quotient, index, chosen)
            chosen.pop()

    visit(target, 0, [])
    return answer


def main() -> int:
    dependency = json.loads(
        (ROOT / "forest_v6_alpha10_exact_20260813.json").read_text(encoding="utf-8")
    )
    negative_records = dependency["finite_order_at_most_20"]["alpha9_negative"]
    target_values = {tuple(record[1]): int(record[2]) for record in negative_records}
    assert len(target_values) == 12

    candidate_set = set().union(*(divisors(target) for target in target_values))
    candidate_by_order: dict[int, set[Polynomial]] = {}
    for candidate in candidate_set:
        candidate_by_order.setdefault(coeff(candidate, 1), set()).add(candidate)

    tree_sets: list[set[Polynomial]] = [set() for _ in range(19)]
    tree_sets[1].add((1, 1))
    deletion_options: dict[Polynomial, set[Polynomial]] = {
        candidate: set() for candidate in candidate_set
    }
    deletion_options[(1, 1)].add((1,))
    tree_realizations = {candidate: 0 for candidate in candidate_set}
    tree_realizations[(1, 1)] = 1
    tree_counts = {1: 1}
    for order in range(2, 19):
        count = 0
        for tree in nx.nonisomorphic_trees(order):
            count += 1
            polynomial = tree_polynomial(tree)
            tree_sets[order].add(polynomial)
            if polynomial not in candidate_by_order.get(order, set()):
                continue
            tree_realizations[polynomial] += 1
            for vertex in tree:
                deletion_options[polynomial].add(deleted_polynomial(tree, vertex))
        tree_counts[order] = count
        print("trees", order, count, len(tree_sets[order]), flush=True)

    forests: list[set[Polynomial]] = [set() for _ in range(19)]
    forests[0].add((1,))
    expected_counts = (
        1, 2, 3, 6, 10, 20, 36, 73, 142, 294, 618, 1348,
        2974, 6777, 15739, 37524, 90965, 224562,
    )
    for order in range(1, 19):
        for component_order in range(1, order + 1):
            for left in forests[order - component_order]:
                for right in tree_sets[component_order]:
                    forests[order].add(multiply(left, right))
        assert len(forests[order]) == expected_counts[order - 1]

    actual_negative = {
        polynomial: v6(polynomial)
        for order in range(1, 19)
        for polynomial in forests[order]
        if len(polynomial) - 1 == 9 and v6(polynomial) < 0
    }
    assert actual_negative == target_values

    usable = sorted(
        (candidate for candidate in candidate_set if tree_realizations[candidate]),
        key=lambda item: (coeff(item, 1), item),
    )
    target_reports = []
    total_decompositions = 0
    total_c_rows = 0
    global_minimum = None
    for target in sorted(target_values, key=lambda item: (coeff(item, 1), item)):
        target_decompositions = decompositions(target, usable)
        assert target_decompositions
        all_c: set[Polynomial] = set()
        for decomposition in target_decompositions:
            choices = [
                {component} | deletion_options[component]
                for component in decomposition
            ]
            for selected in itertools.product(*choices):
                all_c.add(product(list(selected)))
        minimum = None
        for cpoly in all_c:
            margin, full = cleared_margin(target, cpoly)
            assert len(full) - 1 == 10
            assert q6(full) >= 0
            assert margin >= 0
            item = (margin, cpoly, full, q6(full), coeff(cpoly, 5))
            if minimum is None or item < minimum:
                minimum = item
        assert minimum is not None
        total_decompositions += len(target_decompositions)
        total_c_rows += len(all_c)
        if global_minimum is None or minimum[0] < global_minimum[0]:
            global_minimum = (minimum[0], target, *minimum[1:])
        target_reports.append({
            "B": list(target),
            "V6": v6(target),
            "component_decompositions": len(target_decompositions),
            "possible_C_rows": len(all_c),
            "minimum_cleared_margin": minimum[0],
            "minimum_C": list(minimum[1]),
            "minimum_P": list(minimum[2]),
            "minimum_Q6": minimum[3],
            "minimum_c5": minimum[4],
        })

    assert global_minimum is not None
    report = {
        "status": "PASS_EXACT_ALL_RANK6_ALPHA10_BOUNDARY",
        "theorem": (
            "For every forest G with a pendant edge and alpha(G)=10, "
            "H6(I(G))>=H5(I(G-{leaf,support}))."
        ),
        "logic": [
            "alpha(B)=alpha(G)-1=9 and every forest has |B|<=2alpha(B)=18",
            "if V6(B)>=0 the rank6 reserve theorem closes the identity",
            "the exact forest census has only the twelve listed V6(B)<0 rows",
            "factorization plus rooted tree deletion exhausts every possible C",
        ],
        "tree_counts": tree_counts,
        "candidate_tree_polynomials": len(usable),
        "total_component_decompositions": total_decompositions,
        "total_possible_C_rows": total_c_rows,
        "targets": target_reports,
        "global_minimum": {
            "cleared_margin": global_minimum[0],
            "B": list(global_minimum[1]),
            "C": list(global_minimum[2]),
            "P": list(global_minimum[3]),
            "Q6": global_minimum[4],
            "c5": global_minimum[5],
        },
    }
    REPORT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    print("decompositions", total_decompositions, "C rows", total_c_rows)
    print("minimum", global_minimum)
    print("script_sha256", hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper())
    print("report_sha256", hashlib.sha256(REPORT.read_bytes()).hexdigest().upper())
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
