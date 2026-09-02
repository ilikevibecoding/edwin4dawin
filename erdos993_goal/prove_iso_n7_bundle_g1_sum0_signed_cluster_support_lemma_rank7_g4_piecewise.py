#!/usr/bin/env python3
"""Exact signed-support lemma for rank-seven G1 cluster corrections.

The usual edge-subset inclusion--exclusion is grouped by its vertex support.
For a v-set U its signed edge-cover weight is

    mu(W[U]) = (-1)^v I(W[U],-1).

On a forest this is always -1, 0, or 1.  The star supports are precisely the
falling degree moments retained in the existing asymptotic proof.  Through the
only ranks needed by G1 (v<=8), every nonzero nonstar support contains an
induced 2K2.  In particular the separate P4 and disconnected-pair errors at
v=4 cancel exactly, leaving the induced-2K2 count J4.
"""

from __future__ import annotations

import hashlib
import itertools
import json
from pathlib import Path

import networkx as nx
import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g1_sum0_signed_cluster_support_lemma_exact_rank7_g4_piecewise_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G1_SUM0_SIGNED_CLUSTER_SUPPORT_LEMMA_RANK7_G4_PIECEWISE"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def choose_poly(value, rank):
    if rank < 0:
        return sp.Integer(0)
    if rank == 0:
        return sp.Integer(1)
    return sp.prod(value - offset for offset in range(rank)) / sp.factorial(rank)


def independence_at_minus_one(graph: nx.Graph) -> int:
    vertices = list(graph)
    total = 0
    for mask in range(1 << len(vertices)):
        selected = [
            vertices[index]
            for index in range(len(vertices))
            if mask >> index & 1
        ]
        if all(
            not graph.has_edge(left, right)
            for left, right in itertools.combinations(selected, 2)
        ):
            total += -1 if len(selected) % 2 else 1
    return total


def support_mobius(graph: nx.Graph) -> int:
    return (-1) ** graph.number_of_nodes() * independence_at_minus_one(graph)


def induced_2k2_count(graph: nx.Graph) -> int:
    count = 0
    for vertices in itertools.combinations(graph.nodes(), 4):
        induced = graph.subgraph(vertices)
        if (
            induced.number_of_edges() == 2
            and sorted(dict(induced.degree()).values()) == [1, 1, 1, 1]
        ):
            count += 1
    return count


def component_catalog(maximum: int):
    catalog = []
    for order in range(2, maximum + 1):
        for index, tree in enumerate(nx.nonisomorphic_trees(order)):
            catalog.append((order, index, tree.copy()))
    return catalog


def forests_without_isolates(order: int):
    catalog = component_catalog(order)

    def extend(remaining: int, first: int, selected: tuple[int, ...]):
        if remaining == 0:
            yield nx.disjoint_union_all(
                [catalog[index][2] for index in selected]
            )
            return
        for index in range(first, len(catalog)):
            component_order = catalog[index][0]
            if component_order <= remaining:
                yield from extend(
                    remaining - component_order, index, selected + (index,)
                )

    yield from extend(order, 0, ())


def main() -> None:
    # Exact binomial inversion between independence rows and signed vertex
    # supports.  This independently checks the support decomposition through
    # every row used by rank-seven G1.
    m = sp.Symbol("m")
    rows = {rank: sp.Symbol(f"i{rank}") for rank in range(9)}
    supports = {
        v: sp.expand(
            (-1) ** v
            * sum(
                (-1) ** rank
                * choose_poly(m - rank, v - rank)
                * rows[rank]
                for rank in range(v + 1)
            )
        )
        for v in range(9)
    }
    for rank in range(9):
        recovered = sp.expand(
            sum(
                supports[v] * choose_poly(m - v, rank - v)
                for v in range(rank + 1)
            )
        )
        assert sp.expand(recovered - rows[rank]) == 0

    expected_type_counts = {
        2: {"negative": 1, "zero": 0, "positive": 0},
        3: {"negative": 0, "zero": 0, "positive": 1},
        4: {"negative": 1, "zero": 1, "positive": 1},
        5: {"negative": 2, "zero": 1, "positive": 1},
        6: {"negative": 2, "zero": 4, "positive": 4},
        7: {"negative": 5, "zero": 8, "positive": 4},
        8: {"negative": 10, "zero": 21, "positive": 8},
    }
    classification = []
    stream = hashlib.sha256()
    for order in range(2, 9):
        counts = {"negative": 0, "zero": 0, "positive": 0}
        nonstar_signs = []
        for graph in forests_without_isolates(order):
            value = support_mobius(graph)
            assert value in (-1, 0, 1)
            counts[
                "negative" if value < 0 else "positive" if value > 0 else "zero"
            ] += 1
            degrees = sorted(dict(graph.degree()).values(), reverse=True)
            is_star = (
                nx.is_tree(graph)
                and degrees == [order - 1] + [1] * (order - 1)
            )
            j4 = induced_2k2_count(graph)
            if value != 0 and not is_star:
                assert j4 >= 1
                nonstar_signs.append(value)
            record = (
                order,
                tuple(sorted(
                    (len(component) for component in nx.connected_components(graph)),
                    reverse=True,
                )),
                tuple(degrees),
                value,
                is_star,
                j4,
            )
            stream.update((repr(record) + "\n").encode())
        assert counts == expected_type_counts[order]
        if order == 4:
            # The only nonzero nonstar type is 2K2, with sign +1.  P4 has
            # weight zero: its disjoint end-edge pair and all three edges
            # cancel on the same vertex support.
            assert nonstar_signs == [1]
        if order == 5:
            # Both nonzero nonstar types have negative weight.  Hence E5<=0.
            assert nonstar_signs == [-1, -1]
        classification.append({
            "support_order": order,
            "unlabeled_no_isolate_forest_types": sum(counts.values()),
            "mobius_sign_counts": counts,
            "nonstar_nonzero_types": len(nonstar_signs),
        })

    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": (
            "For every forest W, group edge inclusion-exclusion by vertex "
            "support. Through support order eight, D_v=(-1)^(v-1)S_(v-1)+E_v, "
            "where S_q=sum_x C(d_x,q), E4=J4 is the induced-2K2 count, E5<=0, "
            "and |E_v|<=J4*C(m-4,v-4) for 4<=v<=8."
        ),
        "support_identity": (
            "D_v=(-1)^v sum_{j=0}^v (-1)^j C(m-j,v-j)i_j(W) "
            "=sum_{|U|=v} sum_{F subset E(W[U]),V(F)=U}(-1)^|F|"
        ),
        "row_inversion": "i_k(W)=sum_{v=0}^k D_v*C(m-v,k-v)",
        "star_split": (
            "D_v=(-1)^(v-1)S_(v-1)+E_v; a selected center and v-1 "
            "neighbors induce a star because W is a forest."
        ),
        "signed_P4_disconnected_cancellation": {
            "formula": "E4=C(e,2)-Omega-P4=J4",
            "explanation": (
                "On an induced P4 the two end edges contribute +1 and all "
                "three path edges contribute -1, so they cancel. Only an "
                "induced 2K2 contributes +1 beyond the retained K1,3 stars."
            ),
        },
        "higher_support_coupling": {
            "E5_sign": "E5<=0",
            "bound": "|E_v|<=J4*C(m-4,v-4), 4<=v<=8",
            "proof": (
                "Every nonzero nonstar no-isolate forest on at most eight "
                "vertices contains an induced 2K2, by the exhaustive type "
                "classification. Charge its support to one contained 2K2; "
                "each 2K2 has C(m-4,v-4) v-set extensions, and forest support "
                "weights have absolute value at most one."
            ),
        },
        "classification": classification,
        "classification_stream_sha256": stream.hexdigest().upper(),
        "exact_binomial_inversion": True,
        "coverage_gap_within_support_orders_2_through_8": None,
        "scope": (
            "This is an exact structural lemma for the cluster correction, "
            "not by itself a nonnegativity proof for G1 or the full theorem."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "classification_stream_sha256": report[
            "classification_stream_sha256"
        ],
        "support_orders": [2, 8],
        "coverage_gap_within_support_orders_2_through_8": None,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
