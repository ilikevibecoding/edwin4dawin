#!/usr/bin/env python3
"""Fail-closed structural reconnaissance for rank-six bundle coefficient g3.

This independently reconstructs the third Newton coefficient from the four
literal nodes Gamma_0,...,Gamma_3, substitutes the exact marked-set
W/A/B/Z partitions for both C and D, and records the five canonical row
specializations.  It is deliberately an algebra/dependency artifact: finite
forest data and failures of relaxed cones are not promoted to a sign theorem.
"""

from __future__ import annotations

import hashlib
import itertools
import json
from math import comb
from pathlib import Path

import networkx as nx
import sympy as sp


HERE = Path(__file__).resolve().parent
SOURCE = Path(__file__).resolve()
OUTPUT = HERE / "iso_n6_bundle_g3_marked_partition_probe_g1_nonadjacent_20260830.json"
MARKER = "PROBE_EXACT_ISO_N6_BUNDLE_G3_MARKED_PARTITION_G1_NONADJACENT"

UPSTREAM = {
    "symbolic_source": (
        "derive_iso_n6_bundle_polynomial_root.py",
        "BB229E377F89B59767D402609FC11B2B9EE0A78D97090DA33316D93C7A3C8444",
    ),
    "symbolic_report": (
        "iso_n6_whole_bundle_binomial_symbolic_root_20260830.json",
        "F0E06EF479C77D1990ECBC180824107A83D88A03FDE5364FFC8BBA086AA4F780",
    ),
    "canonical_source": (
        "derive_iso_n5_bundle_g12_canonical_configuration_g1_bernstein.py",
        "9DDDB5A367BE06872D44615781CE32A069C8623FCB99C8965A845C1BCF873058",
    ),
    "canonical_report": (
        "iso_n5_bundle_g12_canonical_configuration_exact_g1_bernstein_20260829.json",
        "584D8FAA7DA29CAB3884A30173EA7C7C6CB63771902DD3EB284E74AED4068DCB",
    ),
    "finite_source": (
        "probe_iso_n6_bundle_finite_root.py",
        None,
    ),
    "finite_report": (
        "iso_n6_bundle_finite_probe_root_20260830.json",
        None,
    ),
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def at(row, rank):
    return row[rank] if 0 <= rank < len(row) else sp.Integer(0)


def nested(rows, rank):
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


def isolate_multiply(rows, amount, maximum=7):
    return tuple(
        tuple(
            sp.expand(
                sum(
                    sp.Integer(comb(amount, index)) * at(row, rank - index)
                    for index in range(rank + 1)
                )
            )
            for rank in range(maximum + 1)
        )
        for row in rows
    )


def add_xd(crows, drows):
    return tuple(
        tuple(
            sp.expand(at(crow, rank) + at(drow, rank - 1))
            for rank in range(len(crow))
        )
        for crow, drow in zip(crows, drows)
    )


def reconstruct_g3():
    crows = tuple(tuple(sp.symbols(f"c{name}0:8")) for name in "EUVW")
    drows = tuple(tuple(sp.symbols(f"d{name}0:8")) for name in "EUVW")
    base = add_xd(crows, drows)
    gamma = []
    for amount in range(4):
        bundled = add_xd(isolate_multiply(crows, amount), drows)
        lower_payment = sum(
            nested(isolate_multiply(crows, offset), 5)
            for offset in range(amount)
        )
        gamma.append(sp.expand(nested(bundled, 6) - nested(base, 6) - lower_payment))
    # Delta^3 Gamma(0).
    g3 = sp.expand(gamma[3] - 3 * gamma[2] + 3 * gamma[1] - gamma[0])
    return g3, gamma


def structural_substitution():
    n, q, eu, ev = sp.symbols(
        "n q epsilon_u epsilon_v", integer=True, nonnegative=True
    )
    substitution = {
        sp.Symbol(f"{prefix}{name}0"): 1
        for prefix in ("c", "d")
        for name in "EUVW"
    }
    substitution.update(
        {
            sp.Symbol("cE1"): n,
            sp.Symbol("cU1"): n - 1,
            sp.Symbol("cV1"): n - 1,
            sp.Symbol("cW1"): n - 2,
            sp.Symbol("dE1"): q,
            sp.Symbol("dU1"): q - eu,
            sp.Symbol("dV1"): q - ev,
            sp.Symbol("dW1"): q - eu - ev,
        }
    )
    return substitution, (n, q, eu, ev)


def partition_substitution(prefix: str, source_prefix: str, maximum: int):
    """Return exact row partition; A means v-only and B means u-only."""
    substitution = {}
    rows = {}
    for rank in range(2, maximum + 1):
        w, a, b, z = sp.symbols(
            f"{prefix}W{rank} {prefix}A{rank} {prefix}B{rank} {prefix}Z{rank}",
            integer=True,
            nonnegative=True,
        )
        rows[rank] = (w, a, b, z)
        substitution.update(
            {
                sp.Symbol(f"{source_prefix}W{rank}"): w,
                sp.Symbol(f"{source_prefix}U{rank}"): w + a,
                sp.Symbol(f"{source_prefix}V{rank}"): w + b,
                sp.Symbol(f"{source_prefix}E{rank}"): w + a + b + z,
            }
        )
    return substitution, rows


def polynomial_summary(expression):
    variables = tuple(sorted(expression.free_symbols, key=str))
    polynomial = sp.Poly(sp.expand(expression), *variables)
    terms = polynomial.terms()
    negatives = [(powers, coefficient) for powers, coefficient in terms if coefficient < 0]
    stream = "".join(f"{powers}:{coefficient};" for powers, coefficient in terms)
    return {
        "monomials": len(terms),
        "negative_scalar_coefficients": len(negatives),
        "minimum_scalar_coefficient": str(min(polynomial.coeffs())),
        "ordered_term_stream_sha256": hashlib.sha256(stream.encode()).hexdigest().upper(),
        "free_symbols": [str(value) for value in variables],
    }


def independence_row(graph: nx.Graph, maximum=7):
    nodes = tuple(graph)
    result = [1]
    for rank in range(1, maximum + 1):
        result.append(sum(
            1
            for chosen in itertools.combinations(nodes, rank)
            if not any(
                graph.has_edge(left, right)
                for left, right in itertools.combinations(chosen, 2)
            )
        ))
    return tuple(result)


def four_rows(graph: nx.Graph, u: int, v: int):
    result = []
    for removed in ((), (u,), (v,), (u, v)):
        reduced = graph.copy()
        reduced.remove_nodes_from(removed)
        result.append(independence_row(reduced))
    return tuple(result)


def numeric_g3(crows, drows):
    def n_at(row, rank):
        return row[rank] if 0 <= rank < len(row) else 0

    def n_nested(rows, rank):
        e, u, v, w = rows
        r = rank
        return (
            2 * r * n_at(e, r) * n_at(w, r - 2)
            - (r + 1) * n_at(e, r + 1) * n_at(w, r - 3)
            + n_at(e, r - 1) * (2 * n_at(w, r - 3) - (r + 1) * n_at(w, r - 1))
            + n_at(u, r) * (-(r + 1) * n_at(v, r - 2) - n_at(w, r - 3))
            + n_at(u, r - 1) * (2 * r * n_at(v, r - 1) + 2 * n_at(w, r - 2))
            + n_at(u, r - 2) * (-(r + 1) * n_at(v, r) + 2 * n_at(v, r - 2) - n_at(w, r - 1))
            - n_at(v, r) * n_at(w, r - 3)
            + 2 * n_at(v, r - 1) * n_at(w, r - 2)
            - n_at(v, r - 2) * n_at(w, r - 1)
        )

    def n_isolate(rows, amount, maximum=7):
        return tuple(tuple(
            sum(comb(amount, index) * n_at(row, rank - index)
                for index in range(rank + 1))
            for rank in range(maximum + 1)
        ) for row in rows)

    def n_add(c_rows, d_rows):
        return tuple(tuple(
            n_at(crow, rank) + n_at(drow, rank - 1)
            for rank in range(len(crow))
        ) for crow, drow in zip(c_rows, d_rows))

    base = n_add(crows, drows)
    values = []
    for amount in range(4):
        bundled = n_add(n_isolate(crows, amount), drows)
        lower = sum(
            n_nested(n_isolate(crows, offset), 5)
            for offset in range(amount)
        )
        values.append(n_nested(bundled, 6) - n_nested(base, 6) - lower)
    return values[3] - 3 * values[2] + 3 * values[1] - values[0]


def hostile_finite_scan():
    """Falsification only: arbitrary induced minors and realizable supports."""
    marked = induced = realized = 0
    induced_minimum = realized_minimum = None
    induced_witness = realized_witness = None
    induced_negative = realized_negative = 0
    stream = hashlib.sha256()
    for graph0 in nx.graph_atlas_g():
        if not (2 <= len(graph0) <= 7 and nx.is_forest(graph0)):
            continue
        cgraph = nx.convert_node_labels_to_integers(graph0)
        nodes = tuple(cgraph)
        ccode = nx.to_graph6_bytes(cgraph, header=False).decode().strip()
        for u, v in itertools.combinations(nodes, 2):
            marked += 1
            crows = four_rows(cgraph, u, v)
            drows_by_retained_mask = {}
            for retained_mask in range(1 << len(nodes)):
                retained = [
                    node for index, node in enumerate(nodes)
                    if retained_mask & (1 << index)
                ]
                dgraph = cgraph.subgraph(retained).copy()
                drows = four_rows(dgraph, u, v)
                drows_by_retained_mask[retained_mask] = drows
                value = numeric_g3(crows, drows)
                stream.update(
                    f"I|{len(nodes)}|{ccode}|{u}|{v}|{retained_mask}|{value};".encode()
                )
                induced += 1
                if value < 0:
                    induced_negative += 1
                if induced_minimum is None or value < induced_minimum:
                    induced_minimum = value
                    induced_witness = {
                        "value": value, "order_C": len(nodes), "graph6_C": ccode,
                        "u": u, "v": v, "retained_nodes": retained,
                    }

            # A new support adjacent to this set preserves the forest iff the
            # set meets every C-component in at most one vertex.  Exhausting
            # masks literally also independently checks that characterization.
            for neighbor_mask in range(1 << len(nodes)):
                neighbors = [
                    node for index, node in enumerate(nodes)
                    if neighbor_mask & (1 << index)
                ]
                base = cgraph.copy()
                support = len(nodes)
                base.add_node(support)
                base.add_edges_from((support, node) for node in neighbors)
                if not nx.is_forest(base):
                    continue
                component_labels = {
                    node: index
                    for index, component in enumerate(nx.connected_components(cgraph))
                    for node in component
                }
                assert len({component_labels[node] for node in neighbors}) == len(neighbors)
                dgraph = cgraph.copy()
                dgraph.remove_nodes_from(neighbors)
                retained_mask = ((1 << len(nodes)) - 1) ^ neighbor_mask
                value = numeric_g3(crows, drows_by_retained_mask[retained_mask])
                stream.update(
                    f"S|{len(nodes)}|{ccode}|{u}|{v}|{neighbor_mask}|{value};".encode()
                )
                realized += 1
                if value < 0:
                    realized_negative += 1
                if realized_minimum is None or value < realized_minimum:
                    realized_minimum = value
                    realized_witness = {
                        "value": value, "order_C": len(nodes), "graph6_C": ccode,
                        "u": u, "v": v, "support_neighbors": neighbors,
                    }
    return {
        "atlas_C_orders": [2, 7],
        "unordered_marked_C_cells": marked,
        "arbitrary_induced_D_cells": induced,
        "arbitrary_induced_D_negative_count": induced_negative,
        "arbitrary_induced_D_minimum": induced_witness,
        "forest_preserving_support_cells": realized,
        "forest_preserving_support_negative_count": realized_negative,
        "forest_preserving_support_minimum": realized_witness,
        "ordered_value_stream_sha256": stream.hexdigest().upper(),
        "role": "finite falsification only; zero negatives is not an all-order theorem",
    }


def main():
    for name, expected in UPSTREAM.values():
        if expected is not None:
            assert sha256(HERE / name) == expected

    g3, gamma = reconstruct_g3()
    symbolic = json.loads((HERE / UPSTREAM["symbolic_report"][0]).read_text())
    expected_raw = sp.sympify(symbolic["binomial_coefficients"][3]["factor"])
    assert sp.expand(g3 - expected_raw) == 0

    structural, (n, q, eu, ev) = structural_substitution()
    structural_g3 = sp.expand(g3.subs(structural))
    c_partition, c_rows = partition_substitution("C", "c", 7)
    d_partition, d_rows = partition_substitution("D", "d", 6)
    partitioned = sp.expand(structural_g3.subs(c_partition).subs(d_partition))

    # Canonical symbolic row equalities.  Product-row internal modes are
    # recorded as exact dependencies rather than destructively expanded here.
    no_parent = sp.expand(structural_g3.subs({
        sp.Symbol(f"d{name}{rank}"): sp.Symbol(f"c{name}{rank}")
        for name in "EUVW" for rank in range(2, 7)
    }).subs({q: n, eu: 1, ev: 1}).subs(c_partition))
    endpoint_u = sp.expand(structural_g3.subs({
        **{sp.Symbol(f"dE{rank}"): sp.Symbol(f"cU{rank}") for rank in range(2, 7)},
        **{sp.Symbol(f"dU{rank}"): sp.Symbol(f"cU{rank}") for rank in range(2, 7)},
        **{sp.Symbol(f"dV{rank}"): sp.Symbol(f"cW{rank}") for rank in range(2, 7)},
        **{sp.Symbol(f"dW{rank}"): sp.Symbol(f"cW{rank}") for rank in range(2, 7)},
        q: n - 1,
        eu: 0,
        ev: 1,
    }).subs(c_partition))

    finite = json.loads((HERE / UPSTREAM["finite_report"][0]).read_text())
    assert finite["marker"] == "PROBE_EXACT_ISO_N6_BUNDLE_FINITE_ROOT"
    finite_modes = {
        mode: {
            "cells": finite["mode_counts"][mode],
            "g3_minimum": finite["mode_minima"][mode]["g3"],
        }
        for mode in sorted(finite["mode_counts"])
    }
    hostile = hostile_finite_scan()

    report = {
        "marker": MARKER,
        "status": "exact algebra and dependency map; no g3 sign theorem asserted",
        "coefficient": "rank-six bundle g3 = Delta^3 Gamma(0)",
        "independent_reconstruction": {
            "literal_nodes": [0, 1, 2, 3],
            "identity": "g3=Gamma_3-3*Gamma_2+3*Gamma_1-Gamma_0",
            "matches_pinned_symbolic_g3": True,
            "raw_factored_sha256": hashlib.sha256(str(sp.factor(g3)).encode()).hexdigest().upper(),
            "structural_factored_sha256": hashlib.sha256(str(sp.factor(structural_g3)).encode()).hexdigest().upper(),
        },
        "marked_partitions": {
            "C": {
                "identity": "cWk=CWk,cUk=CWk+CAk,cVk=CWk+CBk,cEk=CWk+CAk+CBk+CZk",
                "meaning": "CW neither mark; CA v-only; CB u-only; CZ both marks",
                "rank1": "CW1=n-2, CA1=CB1=1, CZ1=0",
            },
            "D": {
                "identity": "dWk=DWk,dUk=DWk+DAk,dVk=DWk+DBk,dEk=DWk+DAk+DBk+DZk",
                "meaning": "DW neither surviving mark; DA v-only; DB u-only; DZ both",
                "rank1": "DW1=q-epsilon_u-epsilon_v, DA1=epsilon_v, DB1=epsilon_u, DZ1=0",
            },
            "partitioned_expression_sha256": hashlib.sha256(str(sp.factor(partitioned)).encode()).hexdigest().upper(),
            "summary": polynomial_summary(partitioned),
        },
        "canonical_mode_dependence": {
            "no_mark_root_k0": {
                "rows": "D=C",
                "factored_expression_sha256": hashlib.sha256(str(sp.factor(no_parent)).encode()).hexdigest().upper(),
                "summary": polynomial_summary(no_parent),
            },
            "singleton_endpoint": {
                "rows": "for p=u, D=(C_U,C_U,C_W,C_W); p=v by u-v symmetry",
                "factored_expression_sha256": hashlib.sha256(str(sp.factor(endpoint_u)).encode()).hexdigest().upper(),
                "summary": polynomial_summary(endpoint_u),
            },
            "singleton_ordinary": {
                "rows": "C=rows(G), D=rows(G-p), with p distinct from u,v",
                "coupling": "componentwise induced deletion by the singleton p; no independent C/D box is asserted",
            },
            "internal_spine_ordinary": {
                "rows": "C=(X R0,U R0,X Rv,U Rv); D=(Y Rp,Z Rp,Y Rvp,Z Rvp)",
                "broom": "X=I(A),U=I(A-u),Y=I(A-a),Z=I(A-{a,u})",
            },
            "internal_spine_endpoint": {
                "rows": "C as internal ordinary; D=(Y Rv,Z Rv,Y Rv,Z Rv)",
                "broom": "X=I(A),U=I(A-u),Y=I(A-a),Z=I(A-{a,u})",
            },
        },
        "finite_reconnaissance": {
            "marked_cells": finite["marked_cells_including_fixtures"],
            "bundle_cells": finite["bundle_cells"],
            "negative_count_all_g1_g10": finite["negative_count"],
            "g3_global_minimum": finite["global_minima"]["g3"],
            "modes": finite_modes,
            "role": "finite evidence only; no universal or mode theorem follows",
        },
        "hostile_finite_reconnaissance": hostile,
        "open_dependencies": [
            "prove or obstruct a universal componentwise-deletion cone for the partitioned g3",
            "if universal coupling fails, certify the five canonical row specializations separately",
        ],
        "upstream": {
            key: {"file": value[0], "sha256": sha256(HERE / value[0])}
            for key, value in UPSTREAM.items()
        },
        "scope": (
            "Exact rank-six g3 algebra, W/A/B/Z partitions, canonical row map, "
            "and finite reconnaissance only. No g3 sign, rank-six bundle theorem, "
            "all-N6 theorem, or Erdos Problem 993 is asserted."
        ),
        "source_sha256": sha256(SOURCE),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "partitioned": report["marked_partitions"]["summary"],
        "no_parent": report["canonical_mode_dependence"]["no_mark_root_k0"]["summary"],
        "endpoint": report["canonical_mode_dependence"]["singleton_endpoint"]["summary"],
        "finite_g3_minima": {
            mode: row["g3_minimum"]["value"] for mode, row in finite_modes.items()
        },
        "source_sha256": report["source_sha256"],
        "report_sha256": hashlib.sha256(raw.encode()).hexdigest().upper(),
    }, indent=2, sort_keys=True))
    print(MARKER)


if __name__ == "__main__":
    main()
