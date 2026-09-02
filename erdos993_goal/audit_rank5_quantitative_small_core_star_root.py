#!/usr/bin/env python3
"""Independent audit of the quantitative small-core and star certificate."""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path

import networkx as nx
import sympy as sp


ROOT = Path(__file__).resolve().parent
PRIMARY = ROOT / "rank5_quantitative_small_core_star_exact_root_20260823.json"
OUTPUT = ROOT / "rank5_quantitative_small_core_star_independent_audit_root_20260823.json"
EXPECTED = {
    PRIMARY.name: "4949BB2E828C6BB3F329B3EAD7D844ED364CA8C357048E23C79DBD4ED07A001F",
    "verify_rank5_quantitative_small_core_star_root.py":
        "7390A2C97D7921C5B7B6F21166E14305F054CE382BFCE618238C1091102F4F85",
}
ROOTED_COUNTS = {1: 1, 2: 2, 3: 3, 4: 8, 5: 15, 6: 36, 7: 77,
                 8: 184, 9: 423, 10: 1060, 11: 2585, 12: 6612}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def trees(order: int):
    if order == 1:
        return [nx.empty_graph(1)]
    if order == 2:
        return [nx.path_graph(2)]
    return nx.nonisomorphic_trees(order)


def add(left: tuple[int, ...], right: tuple[int, ...], limit: int = 5) -> tuple[int, ...]:
    return tuple(
        (left[i] if i < len(left) else 0) + (right[i] if i < len(right) else 0)
        for i in range(min(limit + 1, max(len(left), len(right))))
    )


def multiply(left: tuple[int, ...], right: tuple[int, ...], limit: int = 5) -> tuple[int, ...]:
    result = [0] * min(limit + 1, len(left) + len(right) - 1)
    for i, lvalue in enumerate(left):
        for j, rvalue in enumerate(right):
            if i + j > limit:
                break
            result[i + j] += lvalue * rvalue
    return tuple(result)


def rooted_polynomials(tree: nx.Graph, root: int) -> tuple[tuple[int, ...], tuple[int, ...]]:
    def recurse(vertex: int, parent: int) -> tuple[tuple[int, ...], tuple[int, ...]]:
        excluded = (1,)
        included_children = (1,)
        for child in tree[vertex]:
            if child == parent:
                continue
            child_excluded, child_total = recurse(child, vertex)
            excluded = multiply(excluded, child_total)
            included_children = multiply(included_children, child_excluded)
        included = (0,) + included_children[:5]
        return excluded, add(excluded, included)

    deleted, whole = recurse(root, -1)
    return whole, deleted


def coefficient(poly: tuple[int, ...], rank: int) -> int:
    return poly[rank] if rank < len(poly) else 0


def smoothed(poly: tuple[int, ...], s: int, rank: int) -> int:
    return sum(math.comb(s, j) * coefficient(poly, rank - j)
               for j in range(min(s, rank) + 1))


def payment(a: int, b: int, d: int, e: int, f: int) -> int:
    q4 = 8 * e * e - d * e - 10 * d * f
    cross = (a * d * e * (a + d + 2 * e) + 2 * a * a * e * e
             - 50 * (b * d - a * e) ** 2)
    return 6 * a * (a + d) * q4 + cross


def residue5_values(whole: tuple[int, ...], deleted: tuple[int, ...]) -> list[int]:
    h, k = coefficient(deleted, 3), coefficient(deleted, 4)
    values = []
    for s in range(17):
        d = smoothed(whole, s, 3)
        e = smoothed(whole, s, 4)
        f = smoothed(whole, s, 5)
        values.append(5 * payment(e + h, f + k, d, e, f) - 7 * d * e**3)
    return values


def heads(values: list[int]) -> list[int]:
    result = []
    row = values
    while len(row) > 1:
        row = [row[i + 1] - row[i] for i in range(len(row) - 1)]
        result.append(row[0])
    return result


def audit_star() -> str:
    leaves = sp.symbols("leaves")
    choose = lambda rank: sp.prod(leaves - j for j in range(rank)) / sp.factorial(rank)
    d, e, f = choose(3), choose(4), choose(5)
    residue = sp.factor(payment(e, f, d, e, f) - sp.Rational(7, 5) * d * e**3)
    factored = (leaves**4 * (leaves - 3)**2 * (leaves - 2)**4
                * (leaves - 1)**4 * (9 * leaves + 23) / 207_360)
    assert sp.factor(residue - factored) == 0
    return str(sp.factor(factored))


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    primary = json.loads(PRIMARY.read_text(encoding="utf-8"))
    assert primary["status"] == "PASS_EXACT_RANK5_QUANTITATIVE_SMALL_CORE_AND_STAR"

    per_order = []
    total = 0
    for order in range(1, 13):
        count = 0
        minimum_f1_5 = None
        minimum_diffs = [None] * 15
        max_abs_d16 = 0
        for tree in trees(order):
            for root in tree:
                count += 1
                whole, deleted = rooted_polynomials(tree, root)
                values = residue5_values(whole, deleted)
                differences = heads(values)
                minimum_f1_5 = values[1] if minimum_f1_5 is None else min(minimum_f1_5, values[1])
                for j in range(15):
                    minimum_diffs[j] = (differences[j] if minimum_diffs[j] is None
                                        else min(minimum_diffs[j], differences[j]))
                max_abs_d16 = max(max_abs_d16, abs(differences[15]))
        assert count == ROOTED_COUNTS[order]
        assert minimum_f1_5 is not None and minimum_f1_5 >= 0
        assert all(value is not None and value >= 0 for value in minimum_diffs)
        assert max_abs_d16 == 0
        claimed = primary["per_order"][order - 1]
        assert int(claimed["minimum_5F_at_s1"]) == minimum_f1_5
        assert [int(value) for value in claimed[
            "minimum_forward_differences_1_through_15_of_5F_at_s0"
        ]] == minimum_diffs
        per_order.append({
            "core_order": order,
            "rooted_cores": count,
            "minimum_5F_at_s1": str(minimum_f1_5),
            "negative_forward_difference_minima": 0,
            "maximum_absolute_forward_difference_16": max_abs_d16,
        })
        total += count
        print(f"AUDIT PASS core_n={order} rooted={count:,}", flush=True)

    star = audit_star()
    assert star == primary["star_center_factorization"]
    assert total == primary["rooted_cores"] == 11_006
    payload = {
        "schema": "rank5-quantitative-small-core-star-independent-audit-root-v1",
        "status": "PASS_INDEPENDENT_RANK5_QUANTITATIVE_SMALL_CORE_STAR_AUDIT",
        "method": (
            "Independently regenerate every unlabeled tree, recompute each rooted "
            "independence polynomial with a separate recursive DP, rebuild the "
            "payment formula, and replay all Newton differences."
        ),
        "rooted_cores": total,
        "per_order": per_order,
        "star_center_factorization": star,
        "immutable_inputs": actual,
        "source_sha256": sha256(Path(__file__)),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("OUTPUT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
