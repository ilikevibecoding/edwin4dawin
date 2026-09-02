#!/usr/bin/env python3
"""Exact finite exhaustion of distinct mark-only expression classes in N6 G1.

This is a structural certificate, not a positivity theorem.  It independently
enumerates every forest on labelled marks p,q,u,v with uv forbidden, rebuilds
the exact singleton-ordinary G1 leaf expression, and freezes the resulting
expression-class partition.  The certificate makes the remaining mark-only
work a finite list of exact expression classes rather than an open-ended edge
search.
"""

from __future__ import annotations

import hashlib
import itertools
import json
from pathlib import Path

import sympy as sp

from explore_iso_n6_bundle_g1_singleton_ordinary_leaf_isolated_mark_common_forest_cone_g1_nonadjacent import (
    coefficient_sign,
)
from explore_iso_n6_bundle_g1_singleton_ordinary_leaf_mark_only_common_forest_g1_nonadjacent import (
    exact_expression,
    mark_forests,
)
from explore_iso_n6_bundle_g1_singleton_ordinary_leaf_motif_ie_cutoff_g1_nonadjacent import (
    build_mode,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "iso_n6_bundle_g1_singleton_ordinary_leaf_distinct_mark_only_"
    "expression_classes_exact_root_20260831.json"
)
MARKER = (
    "PASS_EXACT_ISO_N6_BUNDLE_G1_SINGLETON_ORDINARY_LEAF_DISTINCT_"
    "MARK_ONLY_EXPRESSION_CLASS_EXHAUSTION_ROOT"
)


PINNED = {
    "bundle_formula": (
        "derive_iso_n4_bundle_polynomial_root.py",
        "F312FB481C76129380823CFC5E1FA6BB2B7D794846136A14477FCC9245D8870E",
    ),
    "forest_polynomial": (
        "probe_iso_leaf_cross_remainder_root.py",
        "A9C643C3A223E004365E5013A2433517BC60073D1B230D92477FFDC7E3B6A5F1",
    ),
    "row_substitution": (
        "explore_iso_n6_bundle_g1_singleton_ordinary_leaf_isolated_mark_common_forest_cone_g1_nonadjacent.py",
        "74D28ED2F14C2303E411FF6B1945F8C6C6ED05E03BF351FF447A6AC56BCD4D0B",
    ),
    "mark_only_formula": (
        "explore_iso_n6_bundle_g1_singleton_ordinary_leaf_mark_only_common_forest_g1_nonadjacent.py",
        "DEA01339260C835DB8707D5549A624E8B0A47EEE174A82620E2AF194DBBD8BA7",
    ),
    "leaf_delta_formula": (
        "explore_iso_n6_bundle_g1_singleton_ordinary_leaf_motif_ie_cutoff_g1_nonadjacent.py",
        "C0B8BD01DBE2B1C2D798C426B49A1F1B5DE4C4566A2B1B2C7C86068540820015",
    ),
}


EXPECTED_CLASSES = {
    "24E326AF2419A66C2335938056A10DD824E582372799FBC4757AF2000BDEF5E1": ["edgeless"],
    "E25FCD2FEBA4085A452E4B0E540C61ADC3C60ACA66A2A1643467B70E6C865A6C": ["pq"],
    "D37D98AE001BF6EF68C6A24D2E8116EBC0D979EED02252BEB795CF36E884B62F": ["pu", "pv"],
    "1E02282E60528CBC567D5F8C09F10F740745803C06B7A418530A195345FE008D": ["pq,pu", "pq,pv"],
    "88B3DF4636B1E6171F8044E268E30CA4519DAB8D58DF463014BF1ACBE036D37C": ["pu,pv"],
    "08D7D7D3661E866F0CBD89127826C9FD66B6CA73D5522EEC125C4ED16DB19394": ["pq,pu,pv"],
    "12F6739C612A79381E15BBF4E848BCB7F85439118155AE5536EC1C028DB2F345": ["qu", "qv"],
    "6019EFECDB717EFC45FC01DC3C42B5D19F60AC1BD098C0A466428F7C0A11B353": ["pq,qu", "pq,qv"],
    "D5621A149A98CE54A7FB08E7BAACBC0EFCDF09FEAD6ADE027F27D4B1C2B41641": ["pu,qu", "pv,qv"],
    "EF72CE682AD3727145BF4BCD2A707235F1D06A43366069917876C6B474B4F6D9": ["pu,qv", "pv,qu"],
    "C6431991F7A341708A82A62838599AC6CDFE5BCCE4F38530A9B90CD557E3F199": ["pq,pu,qv", "pq,pv,qu"],
    "C03466DDF51C19ED7B07111B94358D2CA2F280CD4A19B246FC0CB7A1CC96CF46": ["pu,pv,qu", "pu,pv,qv"],
    "4E004AB425DB65CD0C3C24833DDC906B96E53E3016779B18A85C979BCF01E7F7": ["qu,qv"],
    "63DB8F457CE7C56264FFC31DF12113E3EA0C5B845D3325D1EAD0E1B2888F504A": ["pq,qu,qv"],
    "C615D0004D1D2BD11B11615217A604647F2972D9A51260FF36630C35F499F199": ["pu,qu,qv", "pv,qu,qv"],
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def edge_name(edge) -> str:
    return "".join(sorted(edge))


def forest_name(edges) -> str:
    names = sorted(edge_name(edge) for edge in edges)
    return ",".join(names) if names else "edgeless"


def is_forest_independent(vertices, edges) -> bool:
    parent = {vertex: vertex for vertex in vertices}

    def find(vertex):
        while parent[vertex] != vertex:
            parent[vertex] = parent[parent[vertex]]
            vertex = parent[vertex]
        return vertex

    for left, right in edges:
        left_root = find(left)
        right_root = find(right)
        if left_root == right_root:
            return False
        parent[left_root] = right_root
    return True


def independent_labelled_forest_names():
    marks = ("p", "q", "u", "v")
    allowed = tuple(
        edge for edge in itertools.combinations(marks, 2)
        if set(edge) != {"u", "v"}
    )
    result = set()
    for mask in range(1 << len(allowed)):
        edges = tuple(
            edge for index, edge in enumerate(allowed) if mask & (1 << index)
        )
        if is_forest_independent(marks, edges):
            result.add(forest_name(edges))
    return allowed, result


def main():
    for _label, (name, digest) in PINNED.items():
        assert sha256(HERE / name) == digest, name

    allowed, independent_names = independent_labelled_forest_names()
    assert tuple(edge_name(edge) for edge in allowed) == ("pq", "pu", "pv", "qu", "qv")
    assert len(independent_names) == 24

    n = sp.Symbol("n", integer=True, positive=True)
    N, h, t = sp.symbols("N h t", integer=True, nonnegative=True)
    base = (sp.Integer(1), N, *sp.symbols("k2:8", integer=True, nonnegative=True))
    raw = build_mode("distinct", n, t)
    classes = {}
    derivative_signs = {}
    imported_names = set()
    for marks, edges in mark_forests("distinct"):
        label = forest_name(edges)
        imported_names.add(label)
        expression = exact_expression(
            "distinct", raw, marks, edges, n, N, h, t, base
        )
        digest = hashlib.sha256(sp.srepr(expression).encode()).hexdigest().upper()
        classes.setdefault(digest, []).append(label)
        derivative_signs[label] = coefficient_sign(
            sp.expand(sp.diff(expression, base[7])),
            (N, h, t, *base[2:7]),
        )

    normalized = {digest: sorted(labels) for digest, labels in classes.items()}
    expected = {digest: sorted(labels) for digest, labels in EXPECTED_CLASSES.items()}
    assert imported_names == independent_names
    assert normalized == expected
    assert len(normalized) == 15
    assert all(sign == -1 for sign in derivative_signs.values())

    report = {
        "marker": MARKER,
        "rank": 6,
        "coefficient": "g1",
        "canonical_mode": "singleton_ordinary ordinary-leaf reduction",
        "family": (
            "distinct labelled marks p,q,u,v spanning an arbitrary forest with "
            "uv forbidden and disjoint from the arbitrary common forest"
        ),
        "allowed_edges": [edge_name(edge) for edge in allowed],
        "labelled_forests": len(imported_names),
        "exact_expression_classes": len(normalized),
        "classes": normalized,
        "checks": {
            "independent_forest_enumerator_matches_formula_enumerator": True,
            "all_24_labelled_forests_exhausted": True,
            "all_15_exact_expression_classes_locked": True,
            "all_24_k7_derivatives_coefficientwise_nonpositive": True,
        },
        "classification_consequence": (
            "After the already frozen edgeless expression, the nonempty "
            "distinct mark-only family has exactly fourteen expression-class "
            "representatives; pq is one of those fourteen."
        ),
        "scope_guard": (
            "This is an exact finite class exhaustion only. It does not assert "
            "nonnegativity for any not-separately-promoted expression class, "
            "universal rank-six G1, all N6, or Erdos Problem 993."
        ),
        "pinned_dependencies": {
            label: {"file": name, "sha256": digest}
            for label, (name, digest) in PINNED.items()
        },
        "source_sha256": sha256(Path(__file__)),
    }
    payload = (json.dumps(report, indent=2, sort_keys=True) + "\n").encode()
    OUTPUT.write_bytes(payload)
    print(json.dumps({
        "marker": MARKER,
        "labelled_forests": report["labelled_forests"],
        "exact_expression_classes": report["exact_expression_classes"],
        "checks": report["checks"],
        "scope_guard": report["scope_guard"],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(payload).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
