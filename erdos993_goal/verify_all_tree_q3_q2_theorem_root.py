#!/usr/bin/env python3
"""Exact theorem: q_3(T) <= q_2(T) for every tree.

For a tree T, i_r counts independent r-subsets and s_r counts
(r+1)-subsets inducing exactly one edge.  Write m2 for the number of
two-edge matchings.  Since s_2=2*m2, the desired comparison is the
denominator-free inequality

    3*m2*i3 - i2*s3 >= 0.

The all-order part reduces the margin to the independently audited
rank-four path-surplus coordinate tau.  Orders 4 through 14 are replayed
literally from subsets and pairs of edges.
"""

from __future__ import annotations

import hashlib
import itertools
import json
import math
import os
from pathlib import Path

import networkx as nx
import sympy as sp


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "all_tree_q3_q2_theorem_exact_root_20260828.json"

PINNED_INPUTS = {
    "verify_rank4_tree_path_surplus_reserve_root.py":
        "719BE60CCF0660C71293690DED81B9120922F5823BCA27EF61CD334A109D4AEC",
    "rank4_tree_path_surplus_reserve_exact_root_20260826.json":
        "301944315BFBDADD40B6DB7B5BD4912D184F5FF6167C51BD32167BFC49BAEF97",
    "audit_rank4_tree_path_surplus_reserve_root.py":
        "472B2DC9D10573E6F628CB60BE8F96F16BE11A46E652ABC75CE0BE133D509027",
    "rank4_tree_path_surplus_reserve_independent_audit_root_20260826.json":
        "01F8D577C8F64B2E6B9CBADCB5D25FD8E2AD658B8ACD3C17722992016CE4E137",
    "RANK4_TREE_PATH_SURPLUS_RESERVE_THEOREM_2026-08-26.md":
        "495AB1C891C5CF6C542F80922C03A70F92BC6DC643F94611C95DB37316913481",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def choose(n: int, k: int) -> int:
    if n < 0 or k < 0 or k > n:
        return 0
    return math.comb(n, k)


def symbolic_certificate() -> dict[str, object]:
    n, e, tau = sp.symbols("n e tau", integer=True, nonnegative=True)

    i2 = (n - 1) * (n - 2) / 2
    i3 = (n - 2) * (n - 3) * (n - 4) / 6 + e
    m2 = (n - 2) * (n - 3) / 2 - e
    s3 = (n - 3) * (n - 4) * (n - 5) / 2 - 2 * (n - 4) * e + 3 * tau
    margin = sp.factor(3 * m2 * i3 - i2 * s3)

    tau_upper = (n - 1) * e / 3
    endpoint_margin = sp.factor(margin.subs(tau, tau_upper))
    reserve_payment = sp.factor(margin - endpoint_margin)
    expected_reserve = sp.factor(i2 * ((n - 1) * e - 3 * tau))
    assert sp.expand(reserve_payment - expected_reserve) == 0

    feasible_max = (n - 3) * (n - 4) / 2
    at_zero = sp.factor(endpoint_margin.subs(e, 0))
    at_max = sp.factor(endpoint_margin.subs(e, feasible_max))
    assert at_zero == (n - 4) * (n - 3) * (n - 2) * (n + 1) / 4
    assert at_max == (n - 5) * (n - 4) * (n - 3) / 2

    # A concave quadratic lies above its endpoint chord.  This exact identity
    # makes the argument denominator-free and manifestly nonnegative on
    # 0 <= e <= feasible_max.
    chord_identity = sp.factor(
        feasible_max * endpoint_margin
        - (
            (feasible_max - e) * at_zero
            + e * at_max
            + 3 * feasible_max * e * (feasible_max - e)
        )
    )
    assert chord_identity == 0

    # Rebuild the motif-coordinate substitution from A and T4 as an
    # independent symbolic check of the simplified formulas above.
    A, T4 = sp.symbols("A T4", integer=True, nonnegative=True)
    i3_motif = (n - 1) * (n - 2) * (n - 6) / 6 + A
    s3_motif = (
        (n - 1) * (n - 2) * (n - 5) / 2
        - 2 * (n - 4) * A
        + 3 * T4
    )
    assert sp.expand(i3_motif.subs(A, n - 2 + e) - i3) == 0
    assert sp.expand(s3_motif.subs({A: n - 2 + e, T4: n - 3 + tau}) - s3) == 0

    return {
        "coordinates": {
            "e": "sum_v binomial(deg(v)-1,2)",
            "tau": "T4-(n-3), where T4 counts connected induced 4-vertex subtrees",
            "A": "sum_v binomial(deg(v),2)=n-2+e",
        },
        "exact_count_formulas": {
            "i2": str(sp.factor(i2)),
            "i3": str(sp.factor(i3)),
            "m2": str(sp.factor(m2)),
            "s3": str(sp.factor(s3)),
        },
        "motif_formulas_before_substitution": {
            "i3": str(sp.factor(i3_motif)),
            "s3": str(sp.factor(s3_motif)),
        },
        "margin": str(margin),
        "rank4_input": "tau<=(n-1)e/3 for every tree of order n>=15",
        "rank4_reserve_payment": str(expected_reserve),
        "margin_at_rank4_endpoint": str(endpoint_margin),
        "nonstar_feasible_interval": {
            "minimum_e": 0,
            "maximum_e": "binomial(n-3,2)",
            "reason": (
                "x_v=deg(v)-1 are nonnegative integers summing to n-2; "
                "for a nonstar max x_v<=n-3, so convex concentration gives "
                "sum binomial(x_v,2)<=binomial(n-3,2)"
            ),
        },
        "endpoint_values": {
            "e=0": str(at_zero),
            "e=binomial(n-3,2)": str(at_max),
        },
        "cleared_chord_decomposition": (
            "E*U=(E-e)*U0+e*UE+3*E*e*(E-e), "
            "E=binomial(n-3,2), U=margin at tau=(n-1)e/3"
        ),
        "star_case": (
            "If e=binomial(n-2,2), concentration forces T=K_(1,n-1); "
            "then m2=s3=0 and the margin is zero."
        ),
    }


def tree_statistics(tree: nx.Graph) -> dict[str, int]:
    n = tree.number_of_nodes()
    degrees = dict(tree.degree())
    edge_sets = tuple(frozenset(edge) for edge in tree.edges())

    def induced_edges(chosen: tuple[int, ...]) -> int:
        selected = frozenset(chosen)
        return sum(edge <= selected for edge in edge_sets)

    i2_literal = sum(
        induced_edges(chosen) == 0
        for chosen in itertools.combinations(tree.nodes(), 2)
    )
    i3_literal = sum(
        induced_edges(chosen) == 0
        for chosen in itertools.combinations(tree.nodes(), 3)
    )
    s3_literal = sum(
        induced_edges(chosen) == 1
        for chosen in itertools.combinations(tree.nodes(), 4)
    )
    m2_literal = sum(
        first.isdisjoint(second)
        for first, second in itertools.combinations(edge_sets, 2)
    )

    e = sum(choose(degree - 1, 2) for degree in degrees.values())
    p4 = sum(
        (degrees[left] - 1) * (degrees[right] - 1)
        for left, right in tree.edges()
    )
    claws = sum(choose(degree, 3) for degree in degrees.values())
    T4 = p4 + claws
    tau = T4 - (n - 3)

    i2_formula = choose(n - 1, 2)
    i3_formula = choose(n - 2, 3) + e
    m2_formula = choose(n - 2, 2) - e
    s3_formula = 3 * choose(n - 3, 3) - 2 * (n - 4) * e + 3 * tau
    assert (i2_literal, i3_literal, m2_literal, s3_literal) == (
        i2_formula,
        i3_formula,
        m2_formula,
        s3_formula,
    )

    margin = 3 * m2_literal * i3_literal - i2_literal * s3_literal
    return {
        "n": n,
        "e": e,
        "tau": tau,
        "i2": i2_literal,
        "i3": i3_literal,
        "m2": m2_literal,
        "s3": s3_literal,
        "margin": margin,
        "subset_checks": choose(n, 2) + choose(n, 3) + choose(n, 4),
        "edge_pair_checks": choose(n - 1, 2),
    }


def finite_census() -> dict[str, object]:
    total_trees = 0
    subset_checks = 0
    edge_pair_checks = 0
    minimum_margin = None
    minimum_positive_margin = None
    minimum_witness = None
    value_hasher = hashlib.sha256()
    by_order = []

    for order in range(4, 15):
        order_trees = 0
        order_minimum = None
        for tree_index, tree in enumerate(nx.nonisomorphic_trees(order)):
            tree = nx.convert_node_labels_to_integers(tree, ordering="sorted")
            row = tree_statistics(tree)
            assert row["margin"] >= 0
            graph6 = nx.to_graph6_bytes(tree, header=False).decode().strip()
            witness = (
                row["margin"],
                order,
                tree_index,
                row["e"],
                row["tau"],
                row["i3"],
                row["s3"],
                graph6,
            )
            if minimum_witness is None or witness < minimum_witness:
                minimum_margin = row["margin"]
                minimum_witness = witness
            if row["margin"] > 0:
                if minimum_positive_margin is None:
                    minimum_positive_margin = row["margin"]
                else:
                    minimum_positive_margin = min(minimum_positive_margin, row["margin"])
            order_minimum = (
                row["margin"]
                if order_minimum is None
                else min(order_minimum, row["margin"])
            )
            value_hasher.update(
                (
                    f"{order},{tree_index},{row['e']},{row['tau']},"
                    f"{row['i2']},{row['i3']},{row['m2']},{row['s3']},"
                    f"{row['margin']},{graph6}\n"
                ).encode("ascii")
            )
            order_trees += 1
            total_trees += 1
            subset_checks += row["subset_checks"]
            edge_pair_checks += row["edge_pair_checks"]
        by_order.append(
            {
                "order": order,
                "trees": order_trees,
                "minimum_margin": order_minimum,
            }
        )

    return {
        "orders": "4..14",
        "trees": total_trees,
        "subset_checks": subset_checks,
        "edge_pair_checks": edge_pair_checks,
        "minimum_margin": minimum_margin,
        "minimum_positive_margin": minimum_positive_margin,
        "minimum_witness": list(minimum_witness),
        "value_stream_sha256": value_hasher.hexdigest().upper(),
        "by_order": by_order,
    }


def main() -> None:
    actual_inputs = {name: sha256(ROOT / name) for name in PINNED_INPUTS}
    assert actual_inputs == PINNED_INPUTS, (actual_inputs, PINNED_INPUTS)

    rank4 = json.loads(
        (ROOT / "rank4_tree_path_surplus_reserve_exact_root_20260826.json")
        .read_text(encoding="utf-8")
    )
    rank4_audit = json.loads(
        (ROOT / "rank4_tree_path_surplus_reserve_independent_audit_root_20260826.json")
        .read_text(encoding="utf-8")
    )
    assert rank4["status"] == "PASS_EXACT_RANK4_TREE_PATH_SURPLUS_RESERVE_N15_PLUS"
    assert rank4["equivalent_tau_bound"] == "tau<=(n-1)e/3"
    assert rank4_audit["status"] == "PASS_INDEPENDENT_RANK4_TREE_PATH_SURPLUS_RESERVE_AUDIT"

    certificate = symbolic_certificate()
    census = finite_census()
    payload = {
        "schema": "all-tree-q3-q2-theorem-root-v1",
        "status": "PASS_EXACT_ALL_TREE_Q3_AT_MOST_Q2_THEOREM",
        "theorem": (
            "For every finite tree T, 3*m2(T)*i3(T)-i2(T)*s3(T)>=0. "
            "Consequently, whenever i3(T)>0, q3(T)=s3(T)/(3*i3(T)) "
            "is at most q2(T)=m2(T)/i2(T)."
        ),
        "definitions": {
            "i_r": "number of independent r-vertex subsets",
            "s_r": "number of (r+1)-vertex subsets inducing exactly one edge",
            "m2": "number of two-edge matchings; s2=2*m2",
        },
        "coverage": {
            "orders_4_through_14": "complete literal unlabeled-tree census",
            "orders_15_and_above": "symbolic reduction to the pinned all-order tau bound",
            "orders_below_4": "q3 is unsupported and the ratio statement is vacuous",
        },
        "symbolic_certificate": certificate,
        "finite_census": census,
        "pinned_inputs": actual_inputs,
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "This proves the q3<=q2 envelope endpoint for all trees. It does not "
            "prove q_r<=q3 for r>=4, the full averaged token-surplus inequality "
            "at every rank, or Erdos Problem 993."
        ),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"])
    print("TREES", census["trees"])
    print("SUBSET_CHECKS", census["subset_checks"])
    print("EDGE_PAIR_CHECKS", census["edge_pair_checks"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
