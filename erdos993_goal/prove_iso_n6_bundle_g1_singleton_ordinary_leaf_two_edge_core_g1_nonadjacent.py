#!/usr/bin/env python3
"""Exact all-order two-edge-core singleton-ordinary G1 leaf theorem.

A two-edge simple graph uses at most four anonymous edge endpoints.  This
producer exhausts every edge pair on the collision marks {p,u,v} and on the
distinct marks {p,q,u,v}, quotients by anonymous relabeling and u/v reflection,
and excludes the forbidden u-v edge.  It then rebuilds the complete rank-six
G1 leaf increment in every orbit and proves exact shifted power positivity for
all sibling counts.
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
    choose,
    replace_rows,
    structural,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "iso_n6_bundle_g1_singleton_ordinary_leaf_two_edge_core_exact_"
    "g1_nonadjacent_20260831.json"
)
MARKER = (
    "PASS_EXACT_ISO_N6_BUNDLE_G1_SINGLETON_ORDINARY_LEAF_TWO_EDGE_"
    "CORE_G1_NONADJACENT"
)
EXPECTED_ORBIT_SHA256 = (
    "ECBFFF6953B221867520937D48A1FA2FBD0E75E0F7C7E8DB6366069E70FBE89A"
)
EXPECTED_RECORD_SHA256 = (
    "2D49EE5EDDCEB9F7BCC169E0A753E72B57DDEE915513553D83BCF05C6505E43B"
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
    "edgeless_core_source": (
        "prove_iso_n6_bundle_g1_singleton_ordinary_leaf_edgeless_core_g1_nonadjacent.py",
        "2AE1DB53A3D85C0D3EF13D28B3026DF3BDE85E48310D85F432A4C34374E26D32",
    ),
    "edgeless_core_report": (
        "iso_n6_bundle_g1_singleton_ordinary_leaf_edgeless_core_exact_g1_nonadjacent_20260831.json",
        "352DE79587FBC11F4341440EA44D5313F1216975C83169946A69201D82381EC6",
    ),
    "one_edge_core_source": (
        "prove_iso_n6_bundle_g1_singleton_ordinary_leaf_one_edge_core_g1_nonadjacent.py",
        "B7BA81669DF44F9ABAAD6DB5F38125F15039F28D040A87AADDB94871BA863724",
    ),
    "one_edge_core_report": (
        "iso_n6_bundle_g1_singleton_ordinary_leaf_one_edge_core_exact_g1_nonadjacent_20260831.json",
        "8FC4AD2C5B0CEEC806F681559B0AB31051665C42ABFEA7D6FC5D9968CDE963ED",
    ),
}
ANONYMOUS = tuple("abcd")


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def expression_sha256(expression: sp.Expr) -> str:
    return hashlib.sha256(
        sp.srepr(sp.expand(expression)).encode()
    ).hexdigest().upper()


def canonical_graph(edges):
    used = tuple(sorted({v for edge in edges for v in edge if v in ANONYMOUS}))
    target = ANONYMOUS[:len(used)]
    candidates = []
    for images in itertools.permutations(target):
        anonymous_map = dict(zip(used, images))
        for reflect in (False, True):
            mapping = dict(anonymous_map)
            if reflect:
                mapping.update({"u": "v", "v": "u"})
            candidates.append(tuple(sorted(
                tuple(sorted(mapping.get(vertex, vertex) for vertex in edge))
                for edge in edges
            )))
    return min(candidates)


def orbit_graphs(mode):
    distinguished = tuple("puv") if mode == "collision" else tuple("pquv")
    vertices = distinguished + ANONYMOUS
    allowed_edges = tuple(
        edge for edge in itertools.combinations(vertices, 2)
        if set(edge) != {"u", "v"}
    )
    return tuple(sorted({
        canonical_graph(pair) for pair in itertools.combinations(allowed_edges, 2)
    }))


def independent_counts(edges):
    vertices = tuple(sorted({vertex for edge in edges for vertex in edge}))
    edge_sets = tuple(map(set, edges))
    counts = [0] * (len(vertices) + 1)
    for size in range(len(vertices) + 1):
        for subset in itertools.combinations(vertices, size):
            chosen = set(subset)
            if all(not edge <= chosen for edge in edge_sets):
                counts[size] += 1
    return tuple(counts)


def graph_row_rules(rows, order, predeleted, graph):
    rules = {}
    for row, deleted_marks in zip(
        rows, (set(), {"u"}, {"v"}, {"u", "v"})
    ):
        deleted = set(predeleted) | deleted_marks
        surviving_edges = tuple(
            edge for edge in graph if not (set(edge) & deleted)
        )
        counts = independent_counts(surviving_edges)
        active_vertices = len({v for edge in surviving_edges for v in edge})
        row_order = order - len(deleted_marks)
        for rank in range(2, 8):
            rules[row[rank]] = sp.expand(sum(
                count * choose(row_order - active_vertices, rank - size)
                for size, count in enumerate(counts)
            ))
    return rules


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

    # Exact simultaneous u/v symmetry justifies the reflection quotient.
    swap = {}
    for prefix in "HKJL":
        rows = symbolic_rows(prefix)
        swap.update(dict(zip(rows[1], rows[2])))
        swap.update(dict(zip(rows[2], rows[1])))
    assert sp.expand(complete.xreplace(swap) - complete) == 0

    orbit_blocks = {mode: orbit_graphs(mode) for mode in ("collision", "distinct")}
    assert tuple(map(len, orbit_blocks.values())) == (17, 39)
    orbit_payload = {
        mode: [[list(edge) for edge in graph] for graph in graphs]
        for mode, graphs in orbit_blocks.items()
    }
    orbit_sha256 = hashlib.sha256(json.dumps(
        orbit_payload, separators=(",", ":"), sort_keys=True
    ).encode()).hexdigest().upper()
    assert orbit_sha256 == EXPECTED_ORBIT_SHA256

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
    for mode, expression in (("collision", collision), ("distinct", distinct)):
        distinguished_count = 3 if mode == "collision" else 4
        records = []
        for index, graph in enumerate(orbit_blocks[mode]):
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
            assert min(coefficients) == sp.Rational(17, 120)
            records.append({
                "index": index,
                "edges": [list(edge) for edge in graph],
                "first": first,
                "terms": len(polynomial.terms()),
                "negative": 0,
                "minimum": str(min(coefficients)),
                "raw_sha256": expression_sha256(value),
                "shifted_sha256": expression_sha256(shifted_expression),
            })
        all_records[mode] = records

    record_sha256 = hashlib.sha256(json.dumps(
        all_records, separators=(",", ":"), sort_keys=True
    ).encode()).hexdigest().upper()
    assert record_sha256 == EXPECTED_RECORD_SHA256

    report = {
        "marker": MARKER,
        "rank": 6,
        "coefficient": "g1",
        "canonical_mode": "singleton_ordinary ordinary-leaf reduction",
        "geometry": {
            "core": "R has exactly two edges",
            "sibling_parameter": "H=(1+x)^t R, where t>=0",
            "collision": "p=q; K=L=R-p and J=(1+x)^t(R-p)",
            "distinct": "p!=q; K=R-q, J=(1+x)^t(R-p), L=R-{p,q}",
            "enumeration": (
                "all unordered pairs of distinct simple edges on the distinguished "
                "vertices and at most four anonymous endpoints"
            ),
            "quotient": "anonymous relabeling and exact simultaneous u/v reflection",
            "forbidden_edge": "u-v",
        },
        "orbit_counts": {"collision": 17, "distinct": 39, "total": 56},
        "orbit_list_sha256": orbit_sha256,
        "ordered_record_sha256": record_sha256,
        "certificates": all_records,
        "checks": {
            "simultaneous_u_v_reflection_identity_zero": True,
            "orbit_list_matches_expected_hash": True,
            "all_fifty_six_expression_record_hashes_match": True,
            "all_fifty_six_shifted_polynomials_coefficientwise_nonnegative": True,
            "all_fifty_six_minimum_coefficients_equal_17_over_120": True,
        },
        "theorem": (
            "For every canonical nonadjacent singleton-ordinary deepest-support "
            "leaf configuration whose post-support core R has exactly two edges, "
            "the complete rank-six g1 leaf increment is nonnegative for every "
            "sibling count t>=0, in both p=q and p!=q cases."
        ),
        "combined_with_lower_edge_certificates": (
            "The complete leaf increment is nonnegative for every t>=0 whenever "
            "the post-support core has at most two edges."
        ),
        "remaining_obligation": (
            "Cores with at least three edges in the complementary low-sibling "
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
        "ordered_record_sha256": record_sha256,
        "checks": report["checks"],
        "remaining_obligation": report["remaining_obligation"],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
