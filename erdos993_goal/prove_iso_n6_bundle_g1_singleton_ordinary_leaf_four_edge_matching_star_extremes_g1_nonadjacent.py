#!/usr/bin/env python3
"""Exact all-order four-edge matching/star extremal G1 leaf theorem."""

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
    "iso_n6_bundle_g1_singleton_ordinary_leaf_four_edge_matching_star_extremes_"
    "exact_g1_nonadjacent_20260831.json"
)
MARKER = (
    "PASS_EXACT_ISO_N6_BUNDLE_G1_SINGLETON_ORDINARY_LEAF_FOUR_EDGE_"
    "MATCHING_STAR_EXTREMES_G1_NONADJACENT"
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
    "one_edge_core_source": (
        "prove_iso_n6_bundle_g1_singleton_ordinary_leaf_one_edge_core_g1_nonadjacent.py",
        "B7BA81669DF44F9ABAAD6DB5F38125F15039F28D040A87AADDB94871BA863724",
    ),
    "two_edge_core_source": (
        "prove_iso_n6_bundle_g1_singleton_ordinary_leaf_two_edge_core_g1_nonadjacent.py",
        "B36AB352389650652E85A3FED00B369E12615D83DB3DFA16D475A16E102D5B3E",
    ),
    "three_edge_core_source": (
        "prove_iso_n6_bundle_g1_singleton_ordinary_leaf_three_edge_core_g1_nonadjacent.py",
        "9ACCC9A88DF40B88600EBFF4403C8D67229484B6301C085A7937AA95EC16FD1B",
    ),
    "three_edge_core_report": (
        "iso_n6_bundle_g1_singleton_ordinary_leaf_three_edge_core_exact_g1_nonadjacent_20260831.json",
        "1C11F8DE77D5A052BEE862566ACF775B13D4B234F3069ED0AE0DE099F7685AA6",
    ),
}
ANONYMOUS = tuple("abcdefgh")
TOPOLOGIES = {
    "matching4": (8, ((0, 1), (2, 3), (4, 5), (6, 7))),
    "star4": (5, ((0, 1), (0, 2), (0, 3), (0, 4))),
}
EXPECTED_AUTOMORPHISMS = {"matching4": 384, "star4": 24}
EXPECTED = {
    "collision": {
        "matching4": {
            "orbits": 8,
            "orbit_sha256": "90F5D6E3361F172135B9238E8E7A5D70AB7EBCCEB80CBE628021AE9F3E87CE17",
            "record_sha256": "98C76D990C48E304EA3B921E13182523C48132EA00C75EB1E9190F29E94F1BED",
        },
        "star4": {
            "orbits": 11,
            "orbit_sha256": "B84510D6606BC8EF144BA45F1755F862C06169DD24278DA859BB8B53C8067AA0",
            "record_sha256": "13C181AC996110D7AA1BD649FCDD84B69098130D0D70447B363D515B004EF0CF",
        },
    },
    "distinct": {
        "matching4": {
            "orbits": 24,
            "orbit_sha256": "7E075EEBD41FEE14D1E288A662ED5AAE7EC0462B63D0B39697DDF8777838B426",
            "record_sha256": "661CC99F6C888DCD20A9784B4DF7331EB354866402C0A80756E31074B07D3D22",
        },
        "star4": {
            "orbits": 28,
            "orbit_sha256": "C7FEB6B9E43FD9663F8558FF1BE84133EFFAC0361577E4358DF361889784B302",
            "record_sha256": "06F0507C59DA876CB72495AACAACB9CCF9C6CCDD5A47DCBC5701E94927E626F1",
        },
    },
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def automorphisms(vertex_count, edges):
    edge_set = {frozenset(edge) for edge in edges}
    return tuple(
        permutation
        for permutation in itertools.permutations(range(vertex_count))
        if {
            frozenset((permutation[left], permutation[right]))
            for left, right in edges
        } == edge_set
    )


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
            reflected = {
                position: ("v" if reflect and label == "u" else
                           "u" if reflect and label == "v" else label)
                for position, label in labels.items()
            }
            candidates.append(tuple(sorted(
                tuple(sorted((reflected[left], reflected[right])))
                for left, right in edges
            )))
    return min(candidates)


def topology_orbits(mode, topology):
    distinguished = tuple("puv") if mode == "collision" else tuple("pquv")
    vertex_count, edges = TOPOLOGIES[topology]
    symmetries = automorphisms(vertex_count, edges)
    assert len(symmetries) == EXPECTED_AUTOMORPHISMS[topology]
    records = set()
    for used_count in range(min(len(distinguished), vertex_count) + 1):
        for positions in itertools.combinations(range(vertex_count), used_count):
            for labels in itertools.permutations(distinguished, used_count):
                assignment = dict(zip(positions, labels))
                if any(
                    {assignment.get(left), assignment.get(right)} == {"u", "v"}
                    for left, right in edges
                ):
                    continue
                records.add(canonical_assignment(
                    edges, vertex_count, assignment, symmetries
                ))
    return tuple(sorted(records))


def main():
    for _label, (name, expected) in PINNED.items():
        assert sha256(HERE / name) == expected

    n = sp.Symbol("n", integer=True, positive=True)
    t = sp.Symbol("t", integer=True, nonnegative=True)
    h = sp.Symbol("h", nonnegative=True)
    components = build_expressions()
    complete = sp.expand(sum(components[label] for label in (
        "g2", "F", "QHL", "QHJ", "QKJ", "T"
    )))
    rrows, srows, xrows, yrows = (symbolic_rows(prefix) for prefix in "RSXY")
    expressions = {
        "collision": replace_rows(
            complete,
            H=isolate_multiply(rrows, t, 7), K=srows,
            J=isolate_multiply(srows, t, 7), L=srows,
        ).subs(structural(rrows, n) | structural(srows, n - 1)),
        "distinct": replace_rows(
            complete,
            H=isolate_multiply(rrows, t, 7), K=srows,
            J=isolate_multiply(xrows, t, 7), L=yrows,
        ).subs(
            structural(rrows, n) | structural(srows, n - 1)
            | structural(xrows, n - 1) | structural(yrows, n - 2)
        ),
    }

    certificates = {}
    for mode in ("collision", "distinct"):
        mode_records = {}
        distinguished_count = 3 if mode == "collision" else 4
        for topology, (vertex_count, _edges) in TOPOLOGIES.items():
            graphs = topology_orbits(mode, topology)
            expected = EXPECTED[mode][topology]
            assert len(graphs) == expected["orbits"]
            orbit_sha256 = hashlib.sha256(json.dumps(
                [[list(edge) for edge in graph] for graph in graphs],
                separators=(",", ":"), sort_keys=True,
            ).encode()).hexdigest().upper()
            assert orbit_sha256 == expected["orbit_sha256"]
            records = []
            for index, graph in enumerate(graphs):
                rules = graph_row_rules(rrows, n, set(), graph)
                rules |= graph_row_rules(
                    srows, n - 1,
                    {"p" if mode == "collision" else "q"}, graph,
                )
                if mode == "distinct":
                    rules |= graph_row_rules(xrows, n - 1, {"p"}, graph)
                    rules |= graph_row_rules(yrows, n - 2, {"p", "q"}, graph)
                value = sp.expand(expressions[mode].xreplace(rules))
                anonymous_count = len({
                    vertex for edge in graph for vertex in edge if vertex in ANONYMOUS
                })
                assert anonymous_count == vertex_count - len({
                    vertex for edge in graph for vertex in edge
                    if vertex in ("p", "q", "u", "v")
                })
                first = distinguished_count + anonymous_count
                shifted_expression = sp.expand(value.subs(n, first + h))
                polynomial = sp.Poly(shifted_expression, h, t)
                coefficients = polynomial.coeffs()
                assert all(coefficient >= 0 for coefficient in coefficients)
                assert min(coefficients) == sp.Rational(17, 120)
                records.append({
                    "index": index,
                    "edges": [list(edge) for edge in graph],
                    "first": first,
                    "terms": len(polynomial.terms()),
                    "negative": 0,
                    "minimum": "17/120",
                    "raw_sha256": expression_sha256(value),
                    "shifted_sha256": expression_sha256(shifted_expression),
                })
            record_sha256 = hashlib.sha256(json.dumps(
                {topology: records}, separators=(",", ":"), sort_keys=True
            ).encode()).hexdigest().upper()
            assert record_sha256 == expected["record_sha256"]
            mode_records[topology] = {
                "orbits": len(records),
                "orbit_sha256": orbit_sha256,
                "record_sha256": record_sha256,
                "records": records,
            }
        certificates[mode] = mode_records

    report = {
        "marker": MARKER,
        "rank": 6,
        "coefficient": "g1",
        "canonical_mode": "singleton_ordinary ordinary-leaf reduction",
        "scope": (
            "four-edge post-support cores whose nonisolated topology is either "
            "4K2 or K1,4; every t>=0; both p=q and p!=q"
        ),
        "orbit_counts": {
            "collision": {"matching4": 8, "star4": 11},
            "distinct": {"matching4": 24, "star4": 28},
            "total": 71,
        },
        "certificates": certificates,
        "checks": {
            "all_seventy_one_orbits_hash_locked": True,
            "all_seventy_one_shifted_polynomials_nonnegative": True,
            "all_minimum_coefficients_equal_17_over_120": True,
        },
        "theorem": (
            "The complete singleton-ordinary rank-six g1 leaf increment is "
            "nonnegative for every sibling count whenever the four-edge core "
            "is a matching or a star, for every placement of the marks and p,q."
        ),
        "remaining_obligation": (
            "The six other four-edge forest topologies and all cores with at least "
            "five edges in 10t<11n; a universal motif/cutoff theorem is required."
        ),
        "scope_guard": (
            "This does not prove all four-edge cores, the universal leaf lemma, "
            "rank-six g1, N6, or Problem 993."
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
        "checks": report["checks"],
        "remaining_obligation": report["remaining_obligation"],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
