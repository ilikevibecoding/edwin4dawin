#!/usr/bin/env python3
"""Independent fail-closed audit of the literal ell=1,2 mode transfers.

This audit does not import the transfer theorem or its raw-g1 constructor.
It rebuilds Gamma_1 from the coefficient-level nested form, proves the two
formal identities over arbitrary parent rows E,P,V,W, and separately checks
the claimed leaf/path graph recurrences on every ordered marked forest in the
NetworkX atlas through order seven.  The frozen singleton-endpoint and
singleton-ordinary theorems are then used only for their sign conclusions.
"""

from __future__ import annotations

import hashlib
import itertools
import json
from pathlib import Path

import networkx as nx
import sympy as sp


HERE = Path(__file__).resolve().parent
SOURCE = Path(__file__).resolve()
OUTPUT = HERE / (
    "iso_n5_g1_internal_ordinary_k0_ell1_2_mode_transfer_"
    "independent_audit_g1_nonadjacent_20260830.json"
)
MARKER = (
    "PASS_INDEPENDENT_AUDIT_ISO_N5_G1_INTERNAL_ORDINARY_K0_ELL1_2_"
    "MODE_TRANSFER_G1_NONADJACENT"
)

FILES = {
    "transfer_source":
        "prove_iso_n5_g1_internal_ordinary_k0_ell1_2_mode_transfer_g1_bernstein.py",
    "transfer_report":
        "iso_n5_g1_internal_ordinary_k0_ell1_2_mode_transfer_exact_g1_bernstein_20260830.json",
    "endpoint_source": "assemble_iso_n5_g1_singleton_endpoint_all_placements_root.py",
    "endpoint_report":
        "iso_n5_g1_singleton_endpoint_all_placements_assembled_exact_root_20260830.json",
    "ordinary_source":
        "assemble_exact_iso_n5_bundle_g1_singleton_ordinary_all_forests_g1_bernstein.py",
    "ordinary_report":
        "iso_n5_bundle_g1_singleton_ordinary_all_forests_exact_g1_bernstein_20260830.json",
}

EXPECTED_HASHES = {
    "transfer_source": "D97CA82592E4DF0731430D65F61175E1AB90545F5F6C1FD006278E13E04EDEF7",
    "transfer_report": "ACBA45DD666BAEB0AB7C457EAFF81A8D760E8753B1B5FD21863D2F80DC92A906",
    "endpoint_source": "E8FEF64AC34D59A045733E4E66BB4F2B680E440B52D304B371343CDF1088FE42",
    "endpoint_report": "AE8035A52B0ED5B015768B90EB8F18AD5CC1411A940D59212B2A5A0A7BE8CE2B",
    "ordinary_source": "26BD9106A43BB34D24B0D0F79DFA6BDB3A2D2407F3C0517C1327BE45F1DBF172",
    "ordinary_report": "AE548CA6A14EEA4A16DED7F05B3F33A2CA7E9AB087E79476356773687EB0D5E9",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def at(row, rank):
    return row[rank] if 0 <= rank < len(row) else 0


def add(*rows):
    return tuple(sp.expand(sum(at(row, rank) for row in rows)) for rank in range(7))


def subtract(left, *rights):
    return tuple(
        sp.expand(at(left, rank) - sum(at(row, rank) for row in rights))
        for rank in range(7)
    )


def shift(row, amount=1):
    return tuple(at(row, rank - amount) for rank in range(7))


def scale(row, scalar):
    return tuple(sp.expand(scalar * value) for value in row)


def nested(rows, rank):
    """Coefficient-level four-minor nested form, rebuilt locally."""
    e, u, v, w = rows
    r = rank
    return sp.expand(
        2 * r * at(e, r) * at(w, r - 2)
        - (r + 1) * at(e, r + 1) * at(w, r - 3)
        + at(e, r - 1) * (2 * at(w, r - 3) - (r + 1) * at(w, r - 1))
        + at(u, r) * (-(r + 1) * at(v, r - 2) - at(w, r - 3))
        + at(u, r - 1) * (2 * r * at(v, r - 1) + 2 * at(w, r - 2))
        + at(u, r - 2) * (-(r + 1) * at(v, r) + 2 * at(v, r - 2) - at(w, r - 1))
        - at(v, r) * at(w, r - 3)
        + 2 * at(v, r - 1) * at(w, r - 2)
        - at(v, r - 2) * at(w, r - 1)
    )


def isolate_multiply(rows):
    return tuple(add(row, shift(row)) for row in rows)


def add_xd(crows, drows):
    return tuple(add(crow, shift(drow)) for crow, drow in zip(crows, drows))


def rebuild_raw_g1():
    crows = tuple(tuple(sp.symbols(f"c{name}0:7")) for name in "EUVW")
    drows = tuple(tuple(sp.symbols(f"d{name}0:7")) for name in "EUVW")
    top = nested(add_xd(isolate_multiply(crows), drows), 5)
    base = nested(add_xd(crows, drows), 5)
    lower = nested(crows, 4)
    return crows, drows, sp.expand(top - base - lower)


def specialize(expression, generic_c, generic_d, actual_c, actual_d):
    rules = {
        symbol: value
        for generic, actual in zip(generic_c + generic_d, actual_c + actual_d)
        for symbol, value in zip(generic, actual)
    }
    return sp.expand(expression.subs(rules))


def polynomial_record(expression):
    variables = tuple(sorted(expression.free_symbols, key=str))
    polynomial = sp.Poly(sp.expand(expression), *variables)
    stream = "".join(
        f"{powers}:{coefficient};"
        for powers, coefficient in polynomial.terms()
    )
    return {
        "variables": len(variables),
        "monomials": len(polynomial.terms()),
        "term_stream_sha256": hashlib.sha256(stream.encode()).hexdigest().upper(),
    }


def independence_row(graph, maximum=6):
    vertices = tuple(graph)
    edges = {frozenset(edge) for edge in graph.edges()}
    return tuple(sum(
        all(frozenset(pair) not in edges for pair in itertools.combinations(chosen, 2))
        for chosen in itertools.combinations(vertices, rank)
    ) for rank in range(maximum + 1))


def four_rows(graph, first, second):
    result = []
    for removed in ((), (first,), (second,), (first, second)):
        reduced = graph.copy()
        reduced.remove_nodes_from(removed)
        result.append(independence_row(reduced))
    return tuple(result)


def forest_atlas(maximum_order=7):
    return [
        graph.copy()
        for graph in nx.graph_atlas_g()
        if 2 <= len(graph) <= maximum_order and nx.is_forest(graph)
    ]


def numeric_add(*rows):
    return tuple(sum(at(row, rank) for row in rows) for rank in range(7))


def numeric_shift(row):
    return tuple(at(row, rank - 1) for rank in range(7))


def graph_recurrence_audit():
    placement_counts = {"adjacent": 0, "connected_nonadjacent": 0, "disconnected": 0}
    cells = 0
    graphs = forest_atlas()
    for forest in graphs:
        erow = independence_row(forest)
        for p in forest:
            fp = forest.copy(); fp.remove_node(p)
            prow = independence_row(fp)
            for v in forest:
                if p == v:
                    continue
                fv = forest.copy(); fv.remove_node(v)
                fpv = forest.copy(); fpv.remove_nodes_from((p, v))
                vrow, wrow = independence_row(fv), independence_row(fpv)
                if forest.has_edge(p, v):
                    placement = "adjacent"
                elif nx.has_path(forest, p, v):
                    placement = "connected_nonadjacent"
                else:
                    placement = "disconnected"
                placement_counts[placement] += 1

                next_vertex = max(forest.nodes, default=-1) + 1
                u = next_vertex
                g1 = forest.copy(); g1.add_edge(p, u)
                transfer_c1 = (
                    numeric_add(erow, numeric_shift(prow)), erow,
                    numeric_add(vrow, numeric_shift(wrow)), vrow,
                )
                transfer_d1 = (erow, erow, vrow, vrow)
                assert four_rows(g1, u, v) == transfer_c1
                g1_minus_u = g1.copy(); g1_minus_u.remove_node(u)
                assert four_rows(g1_minus_u, u, v) == transfer_d1
                assert not g1.has_edge(u, v)
                assert nx.has_path(g1, u, v) == nx.has_path(forest, p, v)

                a = next_vertex + 1
                g2 = forest.copy(); g2.add_edges_from(((p, u), (u, a)))
                transfer_c2 = (
                    numeric_add(numeric_add(erow, numeric_shift(erow)), numeric_shift(prow)),
                    numeric_add(erow, numeric_shift(erow)),
                    numeric_add(numeric_add(vrow, numeric_shift(vrow)), numeric_shift(wrow)),
                    numeric_add(vrow, numeric_shift(vrow)),
                )
                transfer_d2 = transfer_c1
                assert four_rows(g2, u, v) == transfer_c2
                g2_minus_a = g2.copy(); g2_minus_a.remove_node(a)
                assert four_rows(g2_minus_a, u, v) == transfer_d2
                assert a not in (u, v) and u != v
                cells += 1
    return {
        "atlas_forests": len(graphs),
        "ordered_parent_mark_cells": cells,
        "parent_placement_counts": placement_counts,
        "ell1_leaf_rows_checked": cells,
        "ell2_path_rows_checked": cells,
    }


def main():
    actual_hashes = {label: sha256(HERE / name) for label, name in FILES.items()}
    assert actual_hashes == EXPECTED_HASHES
    transfer = json.loads((HERE / FILES["transfer_report"]).read_text(encoding="utf-8"))
    endpoint = json.loads((HERE / FILES["endpoint_report"]).read_text(encoding="utf-8"))
    ordinary = json.loads((HERE / FILES["ordinary_report"]).read_text(encoding="utf-8"))
    assert transfer["marker"] == (
        "PASS_EXACT_ISO_N5_G1_INTERNAL_ORDINARY_K0_ELL1_2_MODE_TRANSFER_G1_BERNSTEIN"
    )
    assert transfer["source_sha256"] == EXPECTED_HASHES["transfer_source"]
    assert endpoint["marker"] == "PASS_EXACT_ISO_N5_G1_SINGLETON_ENDPOINT_ALL_PLACEMENTS_ROOT"
    assert endpoint["source_sha256"] == EXPECTED_HASHES["endpoint_source"]
    assert endpoint["placement_partition"]["pairwise_disjoint"] is True
    assert endpoint["placement_partition"]["exhaustive"] is True
    assert ordinary["marker"] == (
        "PASS_EXACT_ISO_N5_BUNDLE_G1_SINGLETON_ORDINARY_ALL_FORESTS_G1_BERNSTEIN"
    )
    assert ordinary["source_sha256"] == EXPECTED_HASHES["ordinary_source"]

    generic_c, generic_d, raw_g1 = rebuild_raw_g1()
    variables = tuple(sorted(raw_g1.free_symbols, key=str))
    d_symbols = {symbol for row in generic_d for symbol in row}
    term_types = {"pure_C": 0, "C_times_D": 0}
    for powers, coefficient in sp.Poly(raw_g1, *variables).terms():
        assert coefficient != 0
        d_degree = sum(
            powers[index] for index, symbol in enumerate(variables)
            if symbol in d_symbols
        )
        assert d_degree in (0, 1)
        term_types["pure_C" if d_degree == 0 else "C_times_D"] += 1
    assert term_types == {"pure_C": 26, "C_times_D": 28}

    # Independently check affine deletion-square polarization.
    r00 = tuple(tuple(sp.symbols(f"a{name}0:7")) for name in "EUVW")
    r10 = tuple(tuple(sp.symbols(f"b{name}0:7")) for name in "EUVW")
    r01 = tuple(tuple(sp.symbols(f"q{name}0:7")) for name in "EUVW")
    r11 = tuple(tuple(sp.symbols(f"r{name}0:7")) for name in "EUVW")
    mixed = tuple(
        subtract(r00[index], r10[index], r01[index], scale(r11[index], -1))
        for index in range(4)
    )
    bridge = tuple(subtract(r00[index], mixed[index]) for index in range(4))
    assert sp.expand(
        specialize(raw_g1, generic_c, generic_d, r00, r11)
        + specialize(raw_g1, generic_c, generic_d, r00, bridge)
        - specialize(raw_g1, generic_c, generic_d, r00, r10)
        - specialize(raw_g1, generic_c, generic_d, r00, r01)
    ) == 0

    E = (sp.Integer(1), *sp.symbols("e1:7"))
    P = (sp.Integer(1), *sp.symbols("p1:7"))
    V = (sp.Integer(1), *sp.symbols("v1:7"))
    W = (sp.Integer(1), *sp.symbols("w1:7"))
    one_plus_x = lambda row: add(row, shift(row))
    one_plus_2x = lambda row: add(row, scale(shift(row), 2))

    original_c1 = (one_plus_x(E), E, one_plus_x(V), V)
    original_d1 = (P, P, W, W)
    transfer_c1 = (add(E, shift(P)), E, add(V, shift(W)), V)
    transfer_d1 = (E, E, V, V)
    target1 = specialize(raw_g1, generic_c, generic_d, original_c1, original_d1)
    image1 = specialize(raw_g1, generic_c, generic_d, transfer_c1, transfer_d1)
    assert sp.expand(target1 - image1) == 0
    assert transfer_d1 == (
        transfer_c1[1], transfer_c1[1], transfer_c1[3], transfer_c1[3]
    )

    original_c2 = (
        one_plus_2x(E), one_plus_x(E), one_plus_2x(V), one_plus_x(V)
    )
    original_d2 = (one_plus_x(P), P, one_plus_x(W), W)
    transfer_c2 = (
        add(one_plus_x(E), shift(P)), one_plus_x(E),
        add(one_plus_x(V), shift(W)), one_plus_x(V),
    )
    transfer_d2 = transfer_c1
    transfer_q2 = (E, E, V, V)
    target2 = specialize(raw_g1, generic_c, generic_d, original_c2, original_d2)
    image2 = specialize(raw_g1, generic_c, generic_d, transfer_c2, transfer_d2)
    assert sp.expand(target2 - image2) == 0
    assert transfer_c2 == tuple(
        add(transfer_d2[index], shift(transfer_q2[index]))
        for index in range(4)
    )

    records = {"ell1": polynomial_record(target1), "ell2": polynomial_record(target2)}
    assert records == {
        "ell1": {
            "variables": 18, "monomials": 43,
            "term_stream_sha256": "A4EBCADA6DD1AF48F36F3E3CDEDD600723EDF9A089EBA9F1BC46FC625312C2A3",
        },
        "ell2": {
            "variables": 19, "monomials": 69,
            "term_stream_sha256": "DBA377D2240D6B9FA263A24112FBBE3DD445C59E0DD3BA5FDA8381D383442774",
        },
    }
    assert {
        ell: {
            "variables": transfer["mode_transfers"][ell]["variables"],
            "monomials": transfer["mode_transfers"][ell]["monomials"],
            "term_stream_sha256": transfer["mode_transfers"][ell]["term_stream_sha256"],
        }
        for ell in ("ell1", "ell2")
    } == records

    finite_geometry = graph_recurrence_audit()
    assert all(value > 0 for value in finite_geometry["parent_placement_counts"].values())
    assert transfer["closed_literal_faces"] == [
        {"ell": ell, "k": 0, "parent_geometry": geometry}
        for ell in (1, 2) for geometry in ("adjacent", "nonadjacent")
    ]

    report = {
        "marker": MARKER,
        "audited_marker": transfer["marker"],
        "theorem": (
            "The four literal internal-ordinary g1 faces ell=1,2, k=0 and "
            "adjacent/nonadjacent parent occupation are nonnegative: ell=1 is "
            "identically a singleton-endpoint coefficient after adjoining a "
            "new marked leaf at p, and ell=2 is identically a singleton-ordinary "
            "coefficient after adjoining the path a-u-p and deleting a."
        ),
        "independent_reconstruction": {
            "raw_g1_term_types": term_types,
            "deletion_square_affine_identity": True,
            "ell1_raw_difference": 0,
            "ell2_raw_difference": 0,
            "polynomial_records": records,
            "graph_recurrence_audit": finite_geometry,
        },
        "geometry_guards": {
            "ell1": (
                "u is a new leaf at p and p!=v, so endpoint deletion is exact; "
                "u-v are connected iff p-v are connected and are never adjacent."
            ),
            "ell2": (
                "a,u are new, with edges a-u-p; a is unmarked and distinct from "
                "u,v, and deleting a gives the exact ordinary recurrence."
            ),
            "parent_split": (
                "The formal identities contain no p-v adjacency indicator, so "
                "adjacent, connected-nonadjacent, and disconnected parents are covered."
            ),
        },
        "frozen_sign_inputs": {
            "ell1": endpoint["marker"],
            "ell2": ordinary["marker"],
        },
        "closed_literal_faces": transfer["closed_literal_faces"],
        "pinned_sha256": EXPECTED_HASHES,
        "status": "independent exact audit passed",
        "scope": (
            "Exactly ell in {1,2}, k=0 in internal-ordinary rank-five g1. "
            "No other Newton cell, g2, all N5, or Erdos Problem 993 claim."
        ),
        "source_sha256": sha256(SOURCE),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "closed_literal_faces": report["closed_literal_faces"],
        "graph_recurrence_audit": finite_geometry,
        "source_sha256": report["source_sha256"],
        "report_sha256": hashlib.sha256(raw.encode()).hexdigest().upper(),
    }, indent=2, sort_keys=True), flush=True)
    print(MARKER, flush=True)


if __name__ == "__main__":
    main()
