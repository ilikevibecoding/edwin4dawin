#!/usr/bin/env python3
"""Exact J4/L5 transfer under subdivision of one edge of a tree.

For a tree T of order m, subdivide uv by a new degree-two vertex.  Write
J4 for the induced-2K2 count and L5=-E5 for the sum of the induced P5 and
P3+K2 support counts.  This proves exact closed formulas for their changes,
including the necessary neighbor-degree terms in the P5 change.
The result is a support-transfer lemma only; it does not assert that G1 itself
is monotone under subdivision.
"""

from __future__ import annotations

import hashlib
import itertools
import json
from pathlib import Path

import networkx as nx
import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "iso_n7_bundle_g1_edge_subdivision_j4_l5_transfer_exact_"
    "rank7_g4_piecewise_20260831.json"
)
MARKER = (
    "PASS_EXACT_ISO_N7_BUNDLE_G1_EDGE_SUBDIVISION_J4_L5_TRANSFER_"
    "RANK7_G4_PIECEWISE"
)
DEPENDENCIES = {
    "prove_iso_n7_bundle_g1_sum0_signed_cluster_support_lemma_rank7_g4_piecewise.py":
        "184CE9F5D92F49DED58C3EE477BEA916FC7C624F9E84A234AECD318CCAECF846",
    "iso_n7_bundle_g1_sum0_signed_cluster_support_lemma_exact_rank7_g4_piecewise_20260831.json":
        "180026E94A87369CA46D3F58F0ACB18EB35ED550792BB0F04BE5167B06D9ED3B",
    "prove_iso_n7_bundle_g1_connected_j4_e5_distance_coupling_rank7_g4_piecewise.py":
        "F587FAFF13DCC45832111CD6BA56D681DDA4EF20A10FE00768040D7709FC23FE",
    "iso_n7_bundle_g1_connected_j4_e5_distance_coupling_exact_rank7_g4_piecewise_20260831.json":
        "1CF3AAAA492265F252BD678EFF769E2858857751D075392FE945A192EEDDF389",
}
TREE_COUNTS = {4: 2, 5: 3, 6: 6, 7: 11, 8: 23, 9: 47, 10: 106}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def direct_counts(tree: nx.Graph) -> tuple[int, int, int, int]:
    """Return J4, P5, P3+K2, and L5 by line-graph definitions."""
    edges = tuple(tree.edges())
    line = nx.line_graph(tree)
    distances = dict(nx.all_pairs_shortest_path_length(line))
    j4 = p5 = 0
    for left, right in itertools.combinations(edges, 2):
        distance = distances[left][right]
        j4 += distance >= 3
        p5 += distance == 3
    p3k2 = 0
    for selected in itertools.combinations(edges, 3):
        degrees = sorted(dict(line.subgraph(selected).degree()).values())
        p3k2 += degrees == [0, 1, 1]
    return j4, p5, p3k2, p5 + p3k2


def direct_counts_large(tree: nx.Graph) -> tuple[int, int, int, int]:
    """Literal pair/wedge audit avoiding a cubic line-subgraph loop."""
    edges = tuple(tuple(edge) for edge in tree.edges())
    edge_sets = tuple(frozenset(edge) for edge in edges)
    line = nx.line_graph(tree)
    distances = dict(nx.all_pairs_shortest_path_length(line))
    j4 = p5 = 0
    for left, right in itertools.combinations(edges, 2):
        distance = distances[left][right]
        j4 += distance >= 3
        p5 += distance == 3
    p3k2 = 0
    for first in range(len(edges)):
        for second in range(first + 1, len(edges)):
            union = edge_sets[first] | edge_sets[second]
            if len(union) != 3:
                continue
            # A P3+K2 triple has one unique adjacent pair, so no division.
            p3k2 += sum(not (union & edge) for edge in edge_sets)
    return j4, p5, p3k2, p5 + p3k2


def negative_margin_tree() -> nx.Graph:
    """Two degree-10 centers, each with nine degree-8 star branches."""
    tree = nx.Graph()
    tree.add_edge(0, 1)
    new = 2
    for center in (0, 1):
        for _ in range(9):
            branch = new
            new += 1
            tree.add_edge(center, branch)
            for _ in range(7):
                tree.add_edge(branch, new)
                new += 1
    assert len(tree) == 146 and nx.is_tree(tree)
    return tree


def subdivide(tree: nx.Graph, left: int, right: int) -> nx.Graph:
    answer = tree.copy()
    new = max(answer.nodes(), default=-1) + 1
    answer.remove_edge(left, right)
    answer.add_edge(left, new)
    answer.add_edge(new, right)
    return answer


def main() -> None:
    for name, digest in DEPENDENCIES.items():
        assert sha256(HERE / name) == digest, name

    # Algebraic reconstruction from the two elementary support formulas:
    # P5=sum_xy (d_x-1)(d_y-1), and
    # P3+K2=sum_x sum_{a<b in N(x)} (m+1-d_a-d_x-d_b).
    m, a, b, omega, alpha, beta = sp.symbols(
        "m a b omega alpha beta", integer=True
    )
    delta_j4 = sp.expand(m - a - b + (a - 1)*(b - 1))
    delta_p5 = sp.expand(
        (a - 1)*(b - 1) - (b - 2)*alpha - (a - 2)*beta
    )
    delta_p3k2 = sp.expand(
        omega + (a - 1)*(b - 2) + (b - 1)*(a - 2) + (m - a - b)
    )
    delta_l5 = sp.expand(delta_p5 + delta_p3k2)
    assert delta_j4 == m + 1 + a*b - 2*a - 2*b
    assert delta_p5 == (
        a*b - a - alpha*b + 2*alpha - b - beta*a + 2*beta + 1
    )
    assert delta_p3k2 == omega + m + 2*a*b - 4*a - 4*b + 4
    delta_margin = sp.expand(delta_l5 - delta_j4)
    assert delta_margin == (
        omega + 2*a*b - 3*a - alpha*b + 2*alpha - 3*b
        - beta*a + 2*beta + 4
    )

    # Independent literal replay from the definitions on every edge of every
    # free tree through order ten.  This audit does not use the formulas above
    # to obtain J4 or L5.
    stream = hashlib.sha256()
    audited_trees = audited_edges = 0
    minimum_j4_change = None
    minimum_margin_change = None
    minimum_margin_witness = None
    for order, expected in TREE_COUNTS.items():
        local_trees = 0
        for index, tree in enumerate(nx.nonisomorphic_trees(order)):
            local_trees += 1
            audited_trees += 1
            old_j4, old_p5, old_p3k2, old_l5 = direct_counts(tree)
            assert old_l5 == old_p5 + old_p3k2
            omega_value = sum(
                degree*(degree - 1)//2 for _, degree in tree.degree()
            )
            code = nx.to_graph6_bytes(tree, header=False).decode().strip()
            for edge_index, (left, right) in enumerate(tree.edges()):
                audited_edges += 1
                aa, bb = tree.degree(left), tree.degree(right)
                alpha_value = sum(
                    tree.degree(vertex) - 1
                    for vertex in tree.neighbors(left) if vertex != right
                )
                beta_value = sum(
                    tree.degree(vertex) - 1
                    for vertex in tree.neighbors(right) if vertex != left
                )
                new_j4, new_p5, new_p3k2, new_l5 = direct_counts(
                    subdivide(tree, left, right)
                )
                observed_j4 = new_j4 - old_j4
                observed_p5 = new_p5 - old_p5
                observed_p3k2 = new_p3k2 - old_p3k2
                observed_l5 = new_l5 - old_l5
                expected_j4 = order + 1 + aa*bb - 2*aa - 2*bb
                assert observed_j4 == expected_j4
                assert observed_p5 == (
                    (aa - 1)*(bb - 1)
                    - (bb - 2)*alpha_value
                    - (aa - 2)*beta_value
                )
                assert observed_p3k2 == (
                    omega_value + order + 2*aa*bb - 4*aa - 4*bb + 4
                )
                observed_margin = (
                    (new_l5 - new_j4) - (old_l5 - old_j4)
                )
                expected_margin = (
                    omega_value + 2*aa*bb - 3*aa - 3*bb + 4
                    - (bb - 2)*alpha_value - (aa - 2)*beta_value
                )
                assert observed_l5 == observed_p5 + observed_p3k2
                assert observed_margin == expected_margin
                minimum_j4_change = (
                    observed_j4 if minimum_j4_change is None
                    else min(minimum_j4_change, observed_j4)
                )
                if (
                    minimum_margin_change is None
                    or observed_margin < minimum_margin_change
                ):
                    minimum_margin_change = observed_margin
                    minimum_margin_witness = {
                        "order": order,
                        "tree_index": index,
                        "graph6": code,
                        "edge_index": edge_index,
                        "endpoint_degrees": [aa, bb],
                        "alpha": alpha_value,
                        "beta": beta_value,
                        "Omega": omega_value,
                        "old_J4": old_j4,
                        "new_J4": new_j4,
                        "old_L5": old_l5,
                        "new_L5": new_l5,
                        "delta_L5_minus_J4": observed_margin,
                    }
                stream.update((
                    f"{order}|{index}|{code}|{edge_index}|{aa}|{bb}|"
                    f"{old_j4}|{new_j4}|{old_p5}|{new_p5}|"
                    f"{old_p3k2}|{new_p3k2}|{old_l5}|{new_l5}|"
                    f"{omega_value}|{alpha_value}|{beta_value}|"
                    f"{observed_margin}\n"
                ).encode("ascii"))
        assert local_trees == expected

    # The exact margin formula is not sign-definite.  Freeze a finite literal
    # witness so it cannot later be misused as a monotonicity theorem.
    witness_tree = negative_margin_tree()
    witness_new = subdivide(witness_tree, 0, 1)
    witness_old_counts = direct_counts_large(witness_tree)
    witness_new_counts = direct_counts_large(witness_new)
    witness_margin_change = (
        (witness_new_counts[3] - witness_new_counts[0])
        - (witness_old_counts[3] - witness_old_counts[0])
    )
    witness_omega = sum(
        degree*(degree - 1)//2 for _, degree in witness_tree.degree()
    )
    witness_alpha = sum(
        witness_tree.degree(vertex) - 1
        for vertex in witness_tree.neighbors(0) if vertex != 1
    )
    witness_beta = sum(
        witness_tree.degree(vertex) - 1
        for vertex in witness_tree.neighbors(1) if vertex != 0
    )
    assert (witness_omega, witness_alpha, witness_beta) == (594, 63, 63)
    assert witness_margin_change == -270
    assert witness_margin_change == (
        witness_omega + 2*10*10 - 3*10 - 3*10 + 4
        - (10 - 2)*witness_alpha - (10 - 2)*witness_beta
    )

    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": (
            "Let T be an m-vertex tree and let T' subdivide an edge uv whose "
            "endpoint degrees in T are a and b. If Omega=sum_x C(d_x,2), "
            "J4 is the induced-2K2 count, and L5=-E5=#P5+#(P3+K2), then "
            "J4(T')-J4(T)=m+1+ab-2a-2b and "
            "P5(T')-P5(T)=(a-1)(b-1)-(b-2)alpha-(a-2)beta and "
            "(P3+K2)(T')-(P3+K2)(T)=Omega+m+2ab-4a-4b+4, where "
            "alpha=sum_{x in N(u)-v}(d_x-1) and beta is the analogous "
            "sum at v. These give an exact formula for the L5 and "
            "L5-J4 changes."
        ),
        "exact_identities": {
            "delta_J4": str(delta_j4),
            "delta_P5": str(delta_p5),
            "delta_P3_plus_K2": str(delta_p3k2),
            "delta_L5": str(delta_l5),
            "delta_L5_minus_J4": str(delta_margin),
        },
        "proof": {
            "J4": (
                "Pairs of old edges at line distance at least three persist. "
                "Subdividing uv duplicates every pair of uv with an edge at "
                "line distance at least two, giving m-a-b, and moves the "
                "(a-1)(b-1) opposite incident-edge pairs from distance two "
                "to distance three."
            ),
            "P5": (
                "In a tree #P5=sum_x sum_{r<s in N(x)} "
                "(d_r-1)(d_s-1). The wedges at u and v that used uv are "
                "replaced by wedges using the degree-two vertex z, and the "
                "new wedge u-z-v is added; this yields the alpha/beta formula."
            ),
            "P3_plus_K2": (
                "Each P3 wedge (a-x-b) has exactly m+1-d_a-d_x-d_b "
                "disjoint edges. Every old wedge normally gains one disjoint "
                "edge; the wedges using uv have the displayed endpoint "
                "corrections, and the new wedge u-z-v contributes m-a-b."
            ),
        },
        "independent_literal_audit": {
            "orders": [min(TREE_COUNTS), max(TREE_COUNTS)],
            "tree_counts": TREE_COUNTS,
            "audited_trees": audited_trees,
            "audited_edges": audited_edges,
            "minimum_delta_J4": minimum_j4_change,
            "minimum_delta_L5_minus_J4": minimum_margin_change,
            "minimum_delta_L5_minus_J4_witness": minimum_margin_witness,
            "ordered_stream_sha256": stream.hexdigest().upper(),
        },
        "exact_nonmonotone_margin_witness": {
            "construction": (
                "Join two degree-10 centers; attach nine degree-8 vertices "
                "to each center and seven leaves to each degree-8 vertex. "
                "Subdivide the central edge."
            ),
            "old_order": len(witness_tree),
            "new_order": len(witness_new),
            "subdivided_endpoint_degrees": [10, 10],
            "Omega": witness_omega,
            "alpha": witness_alpha,
            "beta": witness_beta,
            "old_counts_J4_P5_P3K2_L5": list(witness_old_counts),
            "new_counts_J4_P5_P3K2_L5": list(witness_new_counts),
            "delta_L5_minus_J4": witness_margin_change,
            "conclusion": (
                "Subdivision need not increase L5-J4. Therefore the frozen "
                "connected inequality L5>=J4 cannot by itself be differenced "
                "to prove q/G1 subdivision monotonicity."
            ),
        },
        "coverage_gap_within_stated_support_transfer_scope": None,
        "scope": (
            "Universal exact support transfer for subdivision of one tree "
            "edge. This does not assert q/G1 subdivision monotonicity and "
            "does not close any remaining order by itself."
        ),
        "dependencies_sha256": DEPENDENCIES,
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "audited_trees": audited_trees,
        "audited_edges": audited_edges,
        "ordered_stream_sha256": stream.hexdigest().upper(),
        "coverage_gap_within_stated_support_transfer_scope": None,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
