#!/usr/bin/env python3
"""Independent audit of the all-tree q3 <= q2 rank-four bridge.

This auditor does not import or execute any producer.  It hash-pins the
previously frozen rank-four reserve theorem and its independent audit,
rebuilds the q3/q2 motif identities and bridge algebra, and closes the orders
below the rank-four theorem's n >= 15 scope by literal unlabeled-tree census.
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


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "general_tree_q3_q2_rank4_bridge_independent_audit_20260828.json"

EXPECTED = {
    "verify_all_tree_q3_q2_theorem_root.py":
        "9DCD97C0BEB373CB5B2EBDA7A9A2E7F30D730FA45EEF219FAB4EF3FE03C8E1F7",
    "all_tree_q3_q2_theorem_exact_root_20260828.json":
        "6013B83860C4A5B9FC58CEA07762CA51A5CE908AC2F6849FB7EE7383F26F4A74",
    "verify_rank4_tree_path_surplus_reserve_root.py":
        "719BE60CCF0660C71293690DED81B9120922F5823BCA27EF61CD334A109D4AEC",
    "rank4_tree_path_surplus_reserve_exact_root_20260826.json":
        "301944315BFBDADD40B6DB7B5BD4912D184F5FF6167C51BD32167BFC49BAEF97",
    "audit_rank4_tree_path_surplus_reserve_root.py":
        "472B2DC9D10573E6F628CB60BE8F96F16BE11A46E652ABC75CE0BE133D509027",
    "rank4_tree_path_surplus_reserve_independent_audit_root_20260826.json":
        "01F8D577C8F64B2E6B9CBADCB5D25FD8E2AD658B8ACD3C17722992016CE4E137",
    "verify_tree_rank45_path_ratio.py":
        "AB5D6E395A13BE66276D45C25EB2F869B2410B2445F78A45F4A83648CE1CA86C",
    "TREE_RANK45_PATH_RATIO_THEOREM_2026-07-28.md":
        "7FE34CDC7F02442ABB9665A0FDC093B78331C6B93CC0793F60B06259BB7B1528",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def choose(n: int, k: int) -> int:
    return math.comb(n, k) if n >= k >= 0 else 0


def induced_edge_count(vertices: tuple[int, ...], edges: set[tuple[int, int]]) -> int:
    return sum(
        (min(u, v), max(u, v)) in edges
        for u, v in itertools.combinations(vertices, 2)
    )


def literal_statistics(tree: nx.Graph) -> dict[str, int]:
    """Literal subset counts, with no coefficient or producer routine."""
    vertices = tuple(tree.nodes())
    edges = {tuple(sorted(edge)) for edge in tree.edges()}

    i2 = sum(
        induced_edge_count(pair, edges) == 0
        for pair in itertools.combinations(vertices, 2)
    )
    independent_triples = 0
    one_edge_triples = 0
    for triple in itertools.combinations(vertices, 3):
        count = induced_edge_count(triple, edges)
        independent_triples += count == 0
        one_edge_triples += count == 1

    one_edge_fours = 0
    connected_fours = 0
    for four in itertools.combinations(vertices, 4):
        count = induced_edge_count(four, edges)
        one_edge_fours += count == 1
        # An induced subgraph of a tree on four vertices is connected iff it
        # has three edges.
        connected_fours += count == 3

    matching_pairs = sum(
        len(first | second) == 4
        for first, second in itertools.combinations(
            (frozenset(edge) for edge in tree.edges()), 2
        )
    )
    assert one_edge_triples % 2 == 0
    assert one_edge_triples // 2 == matching_pairs
    return {
        "i2": i2,
        "m2": matching_pairs,
        "i3": independent_triples,
        "s3": one_edge_fours,
        "T4": connected_fours,
    }


def degree_statistics(tree: nx.Graph) -> dict[str, int]:
    n = len(tree)
    degrees = dict(tree.degree())
    x = {v: degrees[v] - 1 for v in tree}
    C = choose(n - 1, 2)
    A = sum(choose(degrees[v], 2) for v in tree)
    e = sum(choose(x[v], 2) for v in tree)
    B3 = sum(choose(x[v], 3) for v in tree)
    edge_correlation = sum(x[u] * x[v] for u, v in tree.edges())
    T4_motif = (
        sum(choose(degrees[v], 3) for v in tree)
        + edge_correlation
    )
    X = edge_correlation - (n - 3)
    tau = T4_motif - (n - 3)
    return {
        "C": C,
        "A": A,
        "e": e,
        "B3": B3,
        "edge_correlation": edge_correlation,
        "X": X,
        "T4": T4_motif,
        "tau": tau,
    }


def verify_dependencies() -> dict[str, str]:
    actual = {name: sha256(HERE / name) for name in EXPECTED}
    assert actual == EXPECTED, (actual, EXPECTED)

    theorem = json.loads(
        (HERE / "all_tree_q3_q2_theorem_exact_root_20260828.json")
        .read_text(encoding="utf-8")
    )
    primary = json.loads(
        (HERE / "rank4_tree_path_surplus_reserve_exact_root_20260826.json")
        .read_text(encoding="utf-8")
    )
    independent = json.loads(
        (HERE / "rank4_tree_path_surplus_reserve_independent_audit_root_20260826.json")
        .read_text(encoding="utf-8")
    )
    assert theorem["status"] == "PASS_EXACT_ALL_TREE_Q3_AT_MOST_Q2_THEOREM"
    assert theorem["source_sha256"] == actual["verify_all_tree_q3_q2_theorem_root.py"]
    assert theorem["pinned_inputs"]["verify_rank4_tree_path_surplus_reserve_root.py"] == actual[
        "verify_rank4_tree_path_surplus_reserve_root.py"
    ]
    assert theorem["pinned_inputs"]["rank4_tree_path_surplus_reserve_exact_root_20260826.json"] == actual[
        "rank4_tree_path_surplus_reserve_exact_root_20260826.json"
    ]
    assert theorem["pinned_inputs"]["audit_rank4_tree_path_surplus_reserve_root.py"] == actual[
        "audit_rank4_tree_path_surplus_reserve_root.py"
    ]
    assert theorem["pinned_inputs"]["rank4_tree_path_surplus_reserve_independent_audit_root_20260826.json"] == actual[
        "rank4_tree_path_surplus_reserve_independent_audit_root_20260826.json"
    ]
    assert primary["status"] == "PASS_EXACT_RANK4_TREE_PATH_SURPLUS_RESERVE_N15_PLUS"
    assert independent["status"] == "PASS_INDEPENDENT_RANK4_TREE_PATH_SURPLUS_RESERVE_AUDIT"
    assert primary["source_sha256"] == actual["verify_rank4_tree_path_surplus_reserve_root.py"]
    assert independent["source_sha256"] == actual["audit_rank4_tree_path_surplus_reserve_root.py"]
    assert independent["pinned_inputs"]["verify_rank4_tree_path_surplus_reserve_root.py"] == actual[
        "verify_rank4_tree_path_surplus_reserve_root.py"
    ]
    assert independent["pinned_inputs"]["rank4_tree_path_surplus_reserve_exact_root_20260826.json"] == actual[
        "rank4_tree_path_surplus_reserve_exact_root_20260826.json"
    ]
    assert primary["equivalent_tau_bound"] == "tau<=(n-1)e/3"
    return actual


def verify_symbolic_bridge() -> dict[str, str]:
    n, A, T4, e, tau = sp.symbols("n A T4 e tau")
    C = (n - 1) * (n - 2) / 2

    i3 = sp.binomial(n, 3) - (n - 1) * (n - 2) + A
    i3_expected = C * (n - 6) / 3 + A
    assert sp.simplify(sp.expand_func(i3) - i3_expected) == 0

    # On four vertices, 1[e=1] = e - 2*C(e,2) + 3*C(e,3).
    for edge_count in range(4):
        indicator = (
            edge_count
            - 2 * choose(edge_count, 2)
            + 3 * choose(edge_count, 3)
        )
        assert indicator == int(edge_count == 1)

    s3 = (
        (n - 1) * sp.binomial(n - 2, 2)
        - 2 * (C + (n - 4) * A)
        + 3 * T4
    )
    s3_expected = C * (n - 5) - 2 * (n - 4) * A + 3 * T4
    assert sp.simplify(sp.expand_func(s3) - s3_expected) == 0

    m2 = C - A
    margin = sp.factor(3 * m2 * i3_expected - C * s3_expected)
    margin_expected = C * A * (n + 1) - C**2 - 3 * A**2 - 3 * C * T4
    assert sp.expand(margin - margin_expected) == 0

    # A=(n-2)+e and T4=(n-3)+tau.  The latter follows independently
    # from T4=sum C(d,3)+sum_edges x_u*x_v, C(x+1,3)=C(x,3)+C(x,2),
    # and tau=e+B3+X.
    substituted = sp.factor(
        margin_expected.subs({A: n - 2 + e, T4: n - 3 + tau})
    )
    U = (
        -12 * e**2
        + 4 * e * n**2
        - 36 * e * n
        + 56 * e
        + n**4
        - 8 * n**3
        + 17 * n**2
        + 2 * n
        - 24
    ) / 4
    reserve_term = C * ((n - 1) * e - 3 * tau)
    assert sp.expand(substituted - U - reserve_term) == 0

    upper_nonstar = (n - 3) * (n - 4) / 2
    U_at_zero = sp.factor(U.subs(e, 0))
    U_at_upper = sp.factor(U.subs(e, upper_nonstar))
    assert U_at_zero == (n - 4) * (n - 3) * (n - 2) * (n + 1) / 4
    assert U_at_upper == (n - 5) * (n - 4) * (n - 3) / 2
    assert sp.diff(U, e, 2) == -6

    # The star is excluded from the nonstar e interval and is an exact
    # equality case of the original cross-margin.
    star_A = C
    star_T4 = (n - 1) * (n - 2) * (n - 3) / 6
    assert sp.factor(margin_expected.subs({A: star_A, T4: star_T4})) == 0

    return {
        "i3": "C*(n-6)/3+A",
        "s3": "C*(n-5)-2*(n-4)*A+3*T4",
        "cross_margin": "C*A*(n+1)-C^2-3*A^2-3*C*T4",
        "required_T4_bound": "T4<=A*(n+1)/3-C/3-A^2/C",
        "bridge": "margin=U(n,e)+C*((n-1)*e-3*tau)",
        "U_at_e_0": str(U_at_zero),
        "U_at_nonstar_e_max": str(U_at_upper),
    }


def verify_small_orders() -> dict[str, object]:
    order_rows: list[dict[str, object]] = []
    total_trees = 0
    total_subset_checks = 0
    total_edge_pair_checks = 0
    global_minimum: tuple[int, int, int, str] | None = None
    minimum_positive: int | None = None
    value_hasher = hashlib.sha256()

    for n in range(4, 15):
        trees = 0
        zero_margins = 0
        minimum_margin: int | None = None
        minimum_witness: tuple[int, int, str] | None = None
        for tree_index, tree in enumerate(nx.nonisomorphic_trees(n)):
            tree = nx.convert_node_labels_to_integers(tree, ordering="sorted")
            literal = literal_statistics(tree)
            degree = degree_statistics(tree)
            C, A = degree["C"], degree["A"]

            assert degree["e"] == A - (n - 2)
            assert degree["tau"] == degree["e"] + degree["B3"] + degree["X"]
            assert literal["i2"] == C
            assert literal["m2"] == C - A
            assert literal["i3"] == C * (n - 6) // 3 + A
            assert literal["T4"] == degree["T4"]
            assert literal["s3"] == C * (n - 5) - 2 * (n - 4) * A + 3 * literal["T4"]

            margin_literal = 3 * literal["m2"] * literal["i3"] - C * literal["s3"]
            margin_formula = C * A * (n + 1) - C * C - 3 * A * A - 3 * C * literal["T4"]
            assert margin_literal == margin_formula
            assert margin_literal >= 0

            graph6 = nx.to_graph6_bytes(tree, header=False).decode().strip()
            value_hasher.update(
                (
                    f"{n},{tree_index},{degree['e']},{degree['tau']},"
                    f"{literal['i2']},{literal['i3']},{literal['m2']},"
                    f"{literal['s3']},{margin_literal},{graph6}\n"
                ).encode("ascii")
            )
            row = (margin_literal, tree_index, graph6)
            if minimum_witness is None or row < minimum_witness:
                minimum_witness = row
                minimum_margin = margin_literal
            global_row = (margin_literal, n, tree_index, graph6)
            if global_minimum is None or global_row < global_minimum:
                global_minimum = global_row
            zero_margins += margin_literal == 0
            if margin_literal > 0:
                minimum_positive = (
                    margin_literal
                    if minimum_positive is None
                    else min(minimum_positive, margin_literal)
                )
            trees += 1
            total_subset_checks += (
                choose(n, 2) + choose(n, 3) + choose(n, 4)
            )
            total_edge_pair_checks += choose(n - 1, 2)

        order_rows.append({
            "n": n,
            "trees": trees,
            "minimum_cross_margin": minimum_margin,
            "zero_margins": zero_margins,
            "minimum_witness": list(minimum_witness) if minimum_witness else None,
        })
        total_trees += trees

    return {
        "orders": "4..14",
        "trees": total_trees,
        "literal_subset_checks": total_subset_checks,
        "literal_edge_pair_checks": total_edge_pair_checks,
        "minimum_positive_cross_margin": minimum_positive,
        "value_stream_sha256": value_hasher.hexdigest().upper(),
        "global_minimum_witness": list(global_minimum) if global_minimum else None,
        "by_order": order_rows,
    }


def main() -> None:
    pinned = verify_dependencies()
    symbolic = verify_symbolic_bridge()
    census = verify_small_orders()
    theorem = json.loads(
        (HERE / "all_tree_q3_q2_theorem_exact_root_20260828.json")
        .read_text(encoding="utf-8")
    )
    producer_census = theorem["finite_census"]
    assert census["trees"] == producer_census["trees"] == 5_444
    assert census["literal_subset_checks"] == producer_census["subset_checks"] == 6_619_116
    assert census["literal_edge_pair_checks"] == producer_census["edge_pair_checks"] == 379_012
    assert census["minimum_positive_cross_margin"] == producer_census["minimum_positive_margin"] == 6
    assert census["value_stream_sha256"] == producer_census["value_stream_sha256"]

    payload = {
        "schema": "general-tree-q3-q2-rank4-bridge-independent-audit-v1",
        "status": "PASS_INDEPENDENT_EXACT_ALL_TREE_Q3_AT_MOST_Q2_RANK4_BRIDGE_AUDIT",
        "theorem_verified": (
            "For every finite tree, 3*m2*i3-i2*s3>=0, where i2=C(n-1,2), "
            "m2=s2/2, and sr is the number of (r+1)-sets inducing exactly one edge. "
            "Whenever i3>0 this is q3=s3/(3*i3)<=q2=m2/i2."
        ),
        "definitions": {
            "A": "sum_v binomial(deg(v),2)",
            "T4": "number of connected induced four-vertex subtrees",
            "e": "A-(n-2)=sum_v binomial(deg(v)-1,2)",
            "tau": "T4-(n-3)",
            "C": "binomial(n-1,2)=i2",
        },
        "symbolic_reconstruction": symbolic,
        "large_order_proof": [
            "The frozen independently audited rank-four reserve gives tau<=(n-1)e/3 for n>=15.",
            "For a nonstar, 0<=e<=binomial(n-3,2); this follows by concentrating the degree-excess sum n-2 subject to maximum excess at most n-3.",
            "U is concave in e, so its minimum on that interval is at an endpoint; both endpoint values are positive for n>=15.",
            "The remaining reserve term C*((n-1)e-3*tau) is nonnegative. Stars have original cross-margin exactly zero.",
        ],
        "small_order_census": census,
        "pinned_dependencies": pinned,
        "scope_warning": (
            "This proves only the initial token-sliding domination q3<=q2. "
            "It does not prove q_r<=q2 for r>=4, the averaged surplus target, "
            "the forest convolution theorem, or Erdos Problem 993."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"])
    print(
        "TREES", census["trees"],
        "SUBSET_CHECKS", census["literal_subset_checks"],
        "EDGE_PAIR_CHECKS", census["literal_edge_pair_checks"],
    )
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
