#!/usr/bin/env python3
"""Exact all-order three-edge-core singleton-ordinary G1 leaf theorem.

Every three-edge forest, after isolated vertices are suppressed, is one of a
three-edge matching, a two-edge path plus an edge, a four-vertex path, or a
three-leaf star.  This producer exhausts all placements of the distinguished
vertices in those four topologies, quotients by topology automorphisms and
u/v reflection, and checks the complete rank-six G1 leaf increment exactly.
"""

from __future__ import annotations

import hashlib
import itertools
import json
from pathlib import Path

import sympy as sp

from census_iso_n6_bundle_g1_ordinary_leaf_recursive_g2_residual_small_g1_nonadjacent import (
    build_expressions,
    symbolic_rows,
)
from derive_iso_n4_bundle_polynomial_root import isolate_multiply
from prove_iso_n6_bundle_g1_singleton_ordinary_leaf_one_edge_core_g1_nonadjacent import (
    replace_rows,
    structural,
)
from prove_iso_n6_bundle_g1_singleton_ordinary_leaf_two_edge_core_g1_nonadjacent import (
    expression_sha256,
    graph_row_rules,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "iso_n6_bundle_g1_singleton_ordinary_leaf_three_edge_core_exact_"
    "g1_nonadjacent_20260831.json"
)
MARKER = (
    "PASS_EXACT_ISO_N6_BUNDLE_G1_SINGLETON_ORDINARY_LEAF_THREE_EDGE_"
    "CORE_G1_NONADJACENT"
)
PINNED = {
    "leaf_expression_source": (
        "census_iso_n6_bundle_g1_ordinary_leaf_recursive_g2_residual_small_g1_nonadjacent.py",
        "2474323FFAB6D3FBFAC99926E298C698F4C93398D5E0FC7467F18E97F8363126",
    ),
    "binomial_algebra_source": (
        "derive_iso_n4_bundle_polynomial_root.py",
        "F312FB481C76129380823CFC5E1FA6BB2B7D794846136A14477FCC9245D8870E",
    ),
    "canonical_occupation_source": (
        "derive_iso_n6_bundle_g1_singleton_ordinary_leaf_complete_occupation_g1_nonadjacent.py",
        "9D02C3AD011A6A175AC632E6786598691C9D2AAF52456CC2C2832476A1D54954",
    ),
    "canonical_occupation_report": (
        "iso_n6_bundle_g1_singleton_ordinary_leaf_complete_occupation_exact_g1_nonadjacent_20260831.json",
        "2AC2037F0D5F2F33B306ED325B7573C7F2D3CEBA062CC0335A5FE06187262C4A",
    ),
    "one_edge_core_source": (
        "prove_iso_n6_bundle_g1_singleton_ordinary_leaf_one_edge_core_g1_nonadjacent.py",
        "B7BA81669DF44F9ABAAD6DB5F38125F15039F28D040A87AADDB94871BA863724",
    ),
    "one_edge_core_report": (
        "iso_n6_bundle_g1_singleton_ordinary_leaf_one_edge_core_exact_g1_nonadjacent_20260831.json",
        "8FC4AD2C5B0CEEC806F681559B0AB31051665C42ABFEA7D6FC5D9968CDE963ED",
    ),
    "two_edge_core_source": (
        "prove_iso_n6_bundle_g1_singleton_ordinary_leaf_two_edge_core_g1_nonadjacent.py",
        "B36AB352389650652E85A3FED00B369E12615D83DB3DFA16D475A16E102D5B3E",
    ),
    "two_edge_core_report": (
        "iso_n6_bundle_g1_singleton_ordinary_leaf_two_edge_core_exact_g1_nonadjacent_20260831.json",
        "6DB2FA264706D84328CDD096DC880A45733374D18F713285674529E0C3AFB38B",
    ),
}
ANONYMOUS = tuple("abcdef")
TOPOLOGIES = {
    "matching3": (6, ((0, 1), (2, 3), (4, 5))),
    "wedge_plus_edge": (5, ((0, 1), (1, 2), (3, 4))),
    "path4": (4, ((0, 1), (1, 2), (2, 3))),
    "star3": (4, ((0, 1), (0, 2), (0, 3))),
}
EXPECTED_AUTOMORPHISMS = {
    "matching3": 48,
    "wedge_plus_edge": 4,
    "path4": 2,
    "star3": 6,
}
EXPECTED_ORBIT_COUNTS = {
    "collision": {
        "matching3": 8, "wedge_plus_edge": 25, "path4": 16, "star3": 11,
    },
    "distinct": {
        "matching3": 23, "wedge_plus_edge": 81, "path4": 48, "star3": 27,
    },
}
EXPECTED_ORBIT_SHA256 = {
    "collision": "B1057B879CAAC9E78CAD20985418497393F9FC02BE97231D45D43836949D23A5",
    "distinct": "824A92CBF1F602A28C7FE9088459F71DE0C508FB9EC6F238651B55818C7AAD70",
}
EXPECTED_RECORD_SHA256 = {
    "collision": "A350895B2946219D7FF67FDF9F49D60209485FA5ADFA9FE8420470352115100D",
    "distinct": "38B72C5122AF80801E491788327F018EFD6D23C295EF19D01F779845D01AAF6E",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def automorphisms(vertex_count, edges):
    edge_set = {frozenset(edge) for edge in edges}
    result = []
    for permutation in itertools.permutations(range(vertex_count)):
        transformed = {
            frozenset((permutation[left], permutation[right]))
            for left, right in edges
        }
        if transformed == edge_set:
            result.append(permutation)
    return tuple(result)


def canonical_assignment(edges, vertex_count, assignment, symmetries):
    candidates = []
    for symmetry in symmetries:
        moved = {symmetry[position]: label for position, label in assignment.items()}
        anonymous_positions = [
            position for position in range(vertex_count) if position not in moved
        ]
        labels = dict(moved)
        labels.update(dict(zip(anonymous_positions, ANONYMOUS)))
        for reflect in (False, True):
            reflected = dict(labels)
            if reflect:
                reflected = {
                    position: ("v" if label == "u" else "u" if label == "v" else label)
                    for position, label in labels.items()
                }
            candidates.append(tuple(sorted(
                tuple(sorted((reflected[left], reflected[right])))
                for left, right in edges
            )))
    return min(candidates)


def orbit_graphs(mode):
    distinguished = tuple("puv") if mode == "collision" else tuple("pquv")
    records = {}
    for topology, (vertex_count, edges) in TOPOLOGIES.items():
        symmetries = automorphisms(vertex_count, edges)
        assert len(symmetries) == EXPECTED_AUTOMORPHISMS[topology]
        for used_count in range(min(len(distinguished), vertex_count) + 1):
            for positions in itertools.combinations(range(vertex_count), used_count):
                for labels in itertools.permutations(distinguished, used_count):
                    assignment = dict(zip(positions, labels))
                    if any(
                        {assignment.get(left), assignment.get(right)} == {"u", "v"}
                        for left, right in edges
                    ):
                        continue
                    graph = canonical_assignment(
                        edges, vertex_count, assignment, symmetries
                    )
                    if graph in records:
                        assert records[graph] == topology
                    records[graph] = topology
    return tuple(sorted((graph, topology) for graph, topology in records.items()))


def main():
    for _label, (name, expected) in PINNED.items():
        assert sha256(HERE / name) == expected

    n = sp.Symbol("n", integer=True, positive=True)
    t = sp.Symbol("t", integer=True, nonnegative=True)
    h = sp.Symbol("h", nonnegative=True)
    components = build_expressions()
    assert set(components) == {"g2", "F", "QHL", "QHJ", "QKJ", "T"}
    complete = sp.expand(
        components["g2"] + components["F"] + components["QHL"]
        + components["QHJ"] + components["QKJ"] + components["T"]
    )

    swap = {}
    for prefix in "HKJL":
        rows = symbolic_rows(prefix)
        swap.update(dict(zip(rows[1], rows[2])))
        swap.update(dict(zip(rows[2], rows[1])))
    assert sp.expand(complete.xreplace(swap) - complete) == 0

    orbit_blocks = {}
    orbit_counts = {}
    orbit_hashes = {}
    for mode in ("collision", "distinct"):
        records = orbit_graphs(mode)
        orbit_blocks[mode] = records
        counts = {
            topology: sum(actual == topology for _graph, actual in records)
            for topology in TOPOLOGIES
        }
        assert counts == EXPECTED_ORBIT_COUNTS[mode]
        payload = [
            {"edges": [list(edge) for edge in graph], "topology": topology}
            for graph, topology in records
        ]
        digest = hashlib.sha256(json.dumps(
            payload, separators=(",", ":"), sort_keys=True
        ).encode()).hexdigest().upper()
        assert digest == EXPECTED_ORBIT_SHA256[mode]
        orbit_counts[mode] = counts
        orbit_hashes[mode] = digest

    rrows, srows, xrows, yrows = (symbolic_rows(prefix) for prefix in "RSXY")
    collision = replace_rows(
        complete,
        H=isolate_multiply(rrows, t, 7), K=srows,
        J=isolate_multiply(srows, t, 7), L=srows,
    )
    collision = sp.expand(collision.subs(
        structural(rrows, n) | structural(srows, n - 1)
    ))
    distinct = replace_rows(
        complete,
        H=isolate_multiply(rrows, t, 7), K=srows,
        J=isolate_multiply(xrows, t, 7), L=yrows,
    )
    distinct = sp.expand(distinct.subs(
        structural(rrows, n) | structural(srows, n - 1)
        | structural(xrows, n - 1) | structural(yrows, n - 2)
    ))

    all_records = {}
    record_hashes = {}
    minima = {}
    for mode, expression in (("collision", collision), ("distinct", distinct)):
        distinguished_count = 3 if mode == "collision" else 4
        records = []
        for index, (graph, topology) in enumerate(orbit_blocks[mode]):
            rules = graph_row_rules(rrows, n, set(), graph)
            rules |= graph_row_rules(
                srows, n - 1, {"p" if mode == "collision" else "q"}, graph
            )
            if mode == "distinct":
                rules |= graph_row_rules(xrows, n - 1, {"p"}, graph)
                rules |= graph_row_rules(yrows, n - 2, {"p", "q"}, graph)
            value = sp.expand(expression.xreplace(rules))
            anonymous_count = len({
                vertex for edge in graph for vertex in edge if vertex in ANONYMOUS
            })
            first = distinguished_count + anonymous_count
            shifted_expression = sp.expand(value.subs(n, first + h))
            polynomial = sp.Poly(shifted_expression, h, t)
            coefficients = polynomial.coeffs()
            assert all(coefficient >= 0 for coefficient in coefficients)
            records.append({
                "index": index,
                "topology": topology,
                "edges": [list(edge) for edge in graph],
                "first": first,
                "terms": len(polynomial.terms()),
                "negative": 0,
                "minimum": str(min(coefficients)),
                "raw_sha256": expression_sha256(value),
                "shifted_sha256": expression_sha256(shifted_expression),
            })
        digest = hashlib.sha256(json.dumps(
            {mode: records}, separators=(",", ":"), sort_keys=True
        ).encode()).hexdigest().upper()
        assert digest == EXPECTED_RECORD_SHA256[mode]
        all_records[mode] = records
        record_hashes[mode] = digest
        minima[mode] = str(min(
            sp.Rational(record["minimum"]) for record in records
        ))

    report = {
        "marker": MARKER,
        "rank": 6,
        "coefficient": "g1",
        "canonical_mode": "singleton_ordinary ordinary-leaf reduction",
        "geometry": {
            "core": "R is a forest with exactly three edges",
            "sibling_parameter": "H=(1+x)^t R, where t>=0",
            "collision": "p=q; K=L=R-p and J=(1+x)^t(R-p)",
            "distinct": "p!=q; K=R-q, J=(1+x)^t(R-p), L=R-{p,q}",
            "complete_nonisolated_topologies": list(TOPOLOGIES),
            "enumeration": (
                "all injective placements of any subset of the distinguished "
                "vertices into each topology"
            ),
            "quotient": "exact topology automorphisms and simultaneous u/v reflection",
            "forbidden_edge": "u-v",
        },
        "orbit_counts": {
            "collision": {"total": 60, "by_topology": orbit_counts["collision"]},
            "distinct": {"total": 179, "by_topology": orbit_counts["distinct"]},
            "total": 239,
        },
        "orbit_list_sha256": orbit_hashes,
        "ordered_record_sha256": record_hashes,
        "minimum_shifted_coefficient": minima,
        "certificates": all_records,
        "checks": {
            "four_unlabeled_three_edge_forest_topologies_exhausted": True,
            "all_topology_automorphism_counts_exact": True,
            "simultaneous_u_v_reflection_identity_zero": True,
            "all_two_hundred_thirty_nine_orbits_hash_locked": True,
            "all_two_hundred_thirty_nine_expression_record_hashes_match": True,
            "all_two_hundred_thirty_nine_shifted_polynomials_nonnegative": True,
        },
        "theorem": (
            "For every canonical nonadjacent singleton-ordinary deepest-support "
            "leaf configuration whose post-support core R has exactly three edges, "
            "the complete rank-six g1 leaf increment is nonnegative for every "
            "sibling count t>=0, in both p=q and p!=q cases."
        ),
        "combined_with_lower_edge_certificates": (
            "The complete leaf increment is nonnegative for every t>=0 whenever "
            "the post-support core has at most three edges."
        ),
        "remaining_obligation": (
            "Cores with at least four edges in the complementary low-sibling "
            "region 10t<11n, plus the other canonical rank-six g1 modes."
        ),
        "scope_guard": (
            "This does not prove the universal ordinary-leaf lemma, singleton-"
            "ordinary g1, all-five-mode rank-six g1, N6, or Problem 993."
        ),
        "pinned_dependencies": {
            label: {"file": name, "sha256": expected}
            for label, (name, expected) in PINNED.items()
        },
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "orbit_counts": report["orbit_counts"],
        "ordered_record_sha256": record_hashes,
        "minimum_shifted_coefficient": minima,
        "checks": report["checks"],
        "remaining_obligation": report["remaining_obligation"],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
