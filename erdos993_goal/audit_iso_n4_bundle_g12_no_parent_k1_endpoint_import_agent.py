#!/usr/bin/env python3
"""Independent exact audit of the no-parent k=1 endpoint import.

The single protected leaf geometry is reduced directly to its four marked
independence-polynomial rows.  The resulting tuple is compared symbolically
with the endpoint-parent tuple, and a direct bundle replay is made on every
eligible forest through order seven.  Positivity is then imported only from
the already independently audited all-forest endpoint-form certificates.
"""

from __future__ import annotations

import hashlib
import itertools
import json
from pathlib import Path

import networkx as nx
import sympy as sp

from audit_iso_n4_bundle_g12_endpoint_parent_independent_agent import (
    add_xd,
    convolve,
    exact_evaluator,
    nested,
    raw_coefficients,
    unlabeled_forests,
)
from derive_iso_leaf_bundle_telescope_agent import bundle_components


HERE = Path(__file__).resolve().parent
STRUCTURE = HERE / "iso_n4_bundle_no_parent_root_star_modes_exact_agent_20260829.json"
ENDPOINT_CONFIG = HERE / "iso_n4_bundle_g12_endpoint_parent_exact_agent_20260829.json"
ENDPOINT_G1 = HERE / "iso_n4_bundle_g1_endpoint_parent_exact_agent_20260829.json"
ENDPOINT_G2 = HERE / "iso_n4_bundle_g2_endpoint_parent_exact_agent_20260829.json"
ENDPOINT_AUDIT = HERE / "iso_n4_bundle_g12_endpoint_parent_independent_audit_agent_20260829.json"
OUTPUT = HERE / "iso_n4_bundle_g12_no_parent_k1_endpoint_import_independent_audit_agent_20260829.json"
FOREST_COUNTS = {2: 2, 3: 3, 4: 6, 5: 10, 6: 20, 7: 37}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def at(row, rank):
    return row[rank] if 0 <= rank < len(row) else 0


def independent_row(graph: nx.Graph, maximum: int = 5):
    """Brute-force independence coefficients, independent of producer code."""
    vertices = tuple(graph.nodes())
    coefficients = []
    for rank in range(maximum + 1):
        count = 0
        for selected in itertools.combinations(vertices, rank):
            if all(not graph.has_edge(a, b) for a, b in itertools.combinations(selected, 2)):
                count += 1
        coefficients.append(count)
    return tuple(coefficients)


def marked_rows(graph: nx.Graph, u: int, v: int):
    rows = []
    for removed in ((), (u,), (v,), (u, v)):
        reduced = graph.copy()
        reduced.remove_nodes_from(removed)
        rows.append(independent_row(reduced))
    return tuple(rows)


def direct_bundle_cell(graph: nx.Graph, u: int, v: int):
    """Build the actual no-parent star: support--u plus the bundled leaves."""
    support = max(graph.nodes(), default=-1) + 1
    base = graph.copy()
    base.add_edge(support, u)
    gamma = [0]
    for number in (1, 2):
        gamma.append(sum(bundle_components(base, (u, v), support, number, 4)))
    return gamma[1], gamma[2] - 2 * gamma[1]


def raw_cell(crows):
    drows = (crows[1], crows[1], crows[3], crows[3])
    t0 = add_xd(crows, drows)
    t1 = add_xd(convolve(crows, 1, 5), drows)
    t2 = add_xd(convolve(crows, 2, 5), drows)
    g1 = nested(t1, 4) - nested(t0, 4) - nested(crows, 3)
    g2 = (
        nested(t2, 4)
        - 2 * nested(t1, 4)
        + nested(t0, 4)
        + nested(crows, 3)
        - nested(convolve(crows, 1, 4), 3)
    )
    return int(g1), int(g2)


def isolate_convolution(row):
    return tuple(sp.expand(at(row, rank) + at(row, rank - 1)) for rank in range(6))


def symbolic_geometry():
    """Derive both protected-u and protected-v row collapses from isolation."""
    a = tuple(sp.Symbol(f"a{rank}") for rank in range(6))
    b = tuple(sp.Symbol(f"b{rank}") for rank in range(6))

    # Protected u is an isolated vertex of C.  A and B are respectively the
    # E and V rows of C-u.  Removing N[s] deletes precisely u.
    cu = (isolate_convolution(a), a, isolate_convolution(b), b)
    du = (a, a, b, b)
    assert du == (cu[1], cu[1], cu[3], cu[3])

    # Protected v is the exact U/V swap.  Here A and B are the E and U rows
    # of C-v.
    cv = (isolate_convolution(a), isolate_convolution(b), a, b)
    dv = (a, b, a, b)
    assert dv == (cv[2], cv[3], cv[2], cv[3])
    return {
        "protected_u": {
            "C": "((1+x)A,A,(1+x)B,B)",
            "D": "(A,A,B,B)=(C_U,C_U,C_W,C_W)",
        },
        "protected_v": {
            "C": "((1+x)A,(1+x)B,A,B)",
            "D": "(A,B,A,B)=(C_V,C_W,C_V,C_W)",
        },
    }


def symbolic_raw_import(structure, endpoint_config):
    c, d, raw_g1, raw_g2 = raw_coefficients()
    protected_u = {}
    protected_v = {}
    for rank in range(6):
        protected_u.update({
            d[0][rank]: c[1][rank],
            d[1][rank]: c[1][rank],
            d[2][rank]: c[3][rank],
            d[3][rank]: c[3][rank],
        })
        protected_v.update({
            d[0][rank]: c[2][rank],
            d[1][rank]: c[3][rank],
            d[2][rank]: c[2][rank],
            d[3][rank]: c[3][rank],
        })
    u_g1 = sp.expand(raw_g1.subs(protected_u))
    u_g2 = sp.expand(raw_g2.subs(protected_u))
    v_g1 = sp.expand(raw_g1.subs(protected_v))
    v_g2 = sp.expand(raw_g2.subs(protected_v))

    recorded_u_g1 = sp.sympify(endpoint_config["raw_forms"]["g1"])
    recorded_u_g2 = sp.sympify(endpoint_config["raw_forms"]["g2"])
    classified_u_g1 = sp.sympify(structure["modes"]["k1_protected_u_leaf"]["g1_raw"]["factor"])
    classified_u_g2 = sp.sympify(structure["modes"]["k1_protected_u_leaf"]["g2_raw"]["factor"])
    assert sp.expand(u_g1 - recorded_u_g1) == 0
    assert sp.expand(u_g2 - recorded_u_g2) == 0
    assert sp.expand(u_g1 - classified_u_g1) == 0
    assert sp.expand(u_g2 - classified_u_g2) == 0

    swap = {}
    for rank in range(6):
        swap[c[1][rank]] = c[2][rank]
        swap[c[2][rank]] = c[1][rank]
    assert sp.expand(v_g1 - u_g1.xreplace(swap)) == 0
    assert sp.expand(v_g2 - u_g2.xreplace(swap)) == 0
    return {
        "raw_g1_terms": len(sp.Poly(u_g1, *sorted(u_g1.free_symbols, key=str)).terms()),
        "raw_g2_terms": len(sp.Poly(u_g2, *sorted(u_g2.free_symbols, key=str)).terms()),
        "protected_u_equals_endpoint_p_u": True,
        "protected_v_equals_endpoint_p_v_by_exact_U_V_swap": True,
    }


def finite_direct_replay():
    """Replay all C through order seven for which protected u is isolated."""
    by_order = {}
    total_eligible_forests = 0
    total_cells = 0
    minima = {"g1": None, "g2": None}
    for order, expected in FOREST_COUNTS.items():
        forests = list(unlabeled_forests(order))
        assert len(forests) == expected
        eligible_forests = 0
        cells = 0
        for graph in forests:
            local = 0
            graph6 = nx.to_graph6_bytes(graph, header=False).decode().strip()
            for u, v in itertools.permutations(graph.nodes(), 2):
                if graph.degree(u) != 0:
                    continue
                local += 1
                cells += 1
                total_cells += 1

                # Directly verify the structural D tuple using H=C+s-u.
                support = max(graph.nodes()) + 1
                h = graph.copy()
                h.add_edge(support, u)
                c_graph = h.copy()
                c_graph.remove_node(support)
                d_graph = h.copy()
                d_graph.remove_nodes_from((support, u))
                crows = marked_rows(c_graph, u, v)
                drows = marked_rows(d_graph, u, v)
                assert drows == (crows[1], crows[1], crows[3], crows[3])

                direct = direct_bundle_cell(graph, u, v)
                raw = raw_cell(crows)
                assert direct == raw
                assert direct[0] >= 0 and direct[1] >= 0
                for index, key in enumerate(("g1", "g2")):
                    record = {
                        "value": direct[index],
                        "order": order,
                        "graph6": graph6,
                        "isolated_protected_u": u,
                        "other_mark_v": v,
                    }
                    if minima[key] is None or record["value"] < minima[key]["value"]:
                        minima[key] = record
            if local:
                eligible_forests += 1
        by_order[str(order)] = {
            "all_forest_types": len(forests),
            "eligible_forest_types": eligible_forests,
            "ordered_cells": cells,
        }
        total_eligible_forests += eligible_forests
    assert total_eligible_forests == 42
    assert total_cells == 456
    # The broader endpoint domain has minima 2 and 20 on K2.  Here the
    # protected-u isolation constraint removes K2, leaving 4 and 26 on 2K1.
    assert minima["g1"]["value"] == 4 and minima["g2"]["value"] == 26
    return {
        "orders": [2, 7],
        "eligible_forest_types_summed_by_order": total_eligible_forests,
        "ordered_protected_u_cells": total_cells,
        "by_order": by_order,
        "minima": minima,
        "negative": 0,
        "checks": "actual bundle Gamma = raw row formula; geometric D tuple checked directly",
    }


def main():
    structure = load(STRUCTURE)
    endpoint_config = load(ENDPOINT_CONFIG)
    endpoint_g1 = load(ENDPOINT_G1)
    endpoint_g2 = load(ENDPOINT_G2)
    endpoint_audit = load(ENDPOINT_AUDIT)
    assert structure["marker"] == "PASS_EXACT_CANONICAL_NO_PARENT_ROOT_STAR_MODE_CLASSIFICATION_AGENT"
    assert endpoint_config["marker"] == "PASS_EXACT_ISO_N4_BUNDLE_G12_ENDPOINT_PARENT_CONFIGURATION_AGENT"
    assert endpoint_g1["marker"] == "PASS_EXACT_ISO_N4_BUNDLE_G1_ENDPOINT_PARENT_AGENT"
    assert endpoint_g2["marker"] == "PASS_EXACT_ISO_N4_BUNDLE_G2_ENDPOINT_PARENT_AGENT"
    assert endpoint_audit["marker"] == "PASS_INDEPENDENT_EXACT_ISO_N4_BUNDLE_G12_ENDPOINT_PARENT_AUDIT_AGENT"

    geometry = symbolic_geometry()
    algebra = symbolic_raw_import(structure, endpoint_config)
    finite = finite_direct_replay()

    # The endpoint certificates are statements about the displayed algebraic
    # form for every marked forest C.  They use no geometric fact about which
    # side of s the deleted u lies on.  The k=1 class is the isolated-u subset.
    assert endpoint_g1["finite_census"]["orders"] == [2, 9]
    assert endpoint_g1["large_order_certificate"]["orders"] == "n>=10"
    assert endpoint_g2["order2_boundary"]["minimum"] == 20
    assert endpoint_g2["all_order_certificate"]["orders"] == "n>=3"
    assert endpoint_audit["g1"]["simplex_certificate"]["branches"] == 5
    assert endpoint_audit["g2"]["simplex_certificate_n_ge_3"]["branches"] == 5

    report = {
        "marker": "PASS_INDEPENDENT_EXACT_ISO_N4_BUNDLE_G12_NO_PARENT_K1_ENDPOINT_IMPORT_AGENT",
        "theorem": (
            "For every canonical no-parent/root-star rank-four cell with exactly "
            "one protected marked leaf neighbor, g1>=0 and g2>=0."
        ),
        "structural_derivation": geometry,
        "raw_identity_audit": algebra,
        "import_logic": {
            "size_boundary": (
                "C contains the two distinct marks, so n>=2.  Endpoint g1 covers "
                "n=2..9 finitely and n>=10 symbolically; endpoint g2 covers n=2 "
                "separately and n>=3 symbolically."
            ),
            "restriction": (
                "The endpoint-form certificates hold for every forest C with "
                "distinct u,v.  Requiring protected u to be isolated only restricts "
                "that domain, so the exact endpoint inequalities apply unchanged."
            ),
            "protected_v": "Exact U/V symmetry gives the other k=1 orientation.",
        },
        "finite_direct_census": finite,
        "dependencies": {
            path.name: sha256(path)
            for path in (
                STRUCTURE,
                ENDPOINT_CONFIG,
                ENDPOINT_G1,
                ENDPOINT_G2,
                ENDPOINT_AUDIT,
                HERE / "audit_iso_n4_bundle_g12_endpoint_parent_independent_agent.py",
            )
        },
        "scope": (
            "Exact theorem for canonical no-parent/root-star k=1 only.  It does "
            "not assert the k=0 or k=2 modes, arbitrary supports, all N4, or "
            "Erdos Problem 993.  The 456-cell replay is a finite audit; the "
            "all-order implication comes from exact row identity plus the "
            "independently audited endpoint-form certificates."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8")
    print(json.dumps(report, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(report["marker"])


if __name__ == "__main__":
    main()
