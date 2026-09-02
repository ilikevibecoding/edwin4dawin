#!/usr/bin/env python3
"""Exact all-order singleton-endpoint g2 theorem for configuration order n>=14.

The canonical endpoint coefficient is split into copies of the universal
rank-three forest reserve and a pair-motif residual.  Elementary forest
incidence bounds reduce the residual to 34 two-mark geometry boxes.  Joint
concavity reduces each box to its eight wedge/neighbor-excess vertices, and
every resulting order/edge/degree simplex has a strictly positive exact
homogeneous coefficient stream.
"""

from __future__ import annotations

import hashlib
import itertools
import json
from pathlib import Path

import networkx as nx
import sympy as sp

from derive_iso_n5_g2_singleton_endpoint_pair_motif_cone_rank5_g2_alt import (
    derive_pair_cone,
)
from probe_exact_iso_n5_g2_singleton_endpoint_pair_simplex_rank5_g2_alt import (
    branches,
    homogeneous_coefficients,
    mapped_polynomial,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g2_singleton_endpoint_large_pair_cone_exact_rank5_g2_alt_20260830.json"
MARKER = "PASS_EXACT_ISO_N5_G2_SINGLETON_ENDPOINT_LARGE_PAIR_CONE_RANK5_G2_ALT"
DEPENDENCIES = {
    "derive_iso_n5_g2_singleton_endpoint_invariant_rank5_g2_alt.py":
        "D8372EAA48F86FB074C624A22F919CB3C824DF7271821FFEE1ED86F3E3737977",
    "iso_n5_g2_singleton_endpoint_invariant_exact_rank5_g2_alt_20260830.json":
        "74675854B0FA77FC5A9BE6FA15B3E90DDDF2B53F84DB9C5FDE640B5FE87B7D87",
    "derive_iso_n5_g2_singleton_endpoint_pair_motif_cone_rank5_g2_alt.py":
        "7C64F8793CAE3C2426CD5DCBD53EEA3A7F24037D34507C342B4C6DCB7CA0B87E",
    "probe_exact_iso_n5_g2_singleton_endpoint_pair_simplex_rank5_g2_alt.py":
        "4963C81EB89222A8F2C3A74E998A1071F8F84BD11CFA624EF0CECB67BE0FE6B4",
    "derive_iso_n5_bundle_g12_canonical_configuration_g1_bernstein.py":
        "9DDDB5A367BE06872D44615781CE32A069C8623FCB99C8965A845C1BCF873058",
    "derive_iso_n5_bundle_g1_singleton_ordinary_payment_g1_bernstein.py":
        "2225C499187485A4F3757802ACB4837EA47A4F168D6C28C723D96F3C7C0E36E4",
    "derive_iso_n4_bundle_g1_deepest_configuration_agent.py":
        "B6ADF27EBE3142C31AB4727E145B5B6B585DF58F45566E9882295611EAB86143",
    "verify_rank3_three_halves_forest_certificate.py":
        "F78396D95B3CF18C73E5A1586E1B712731E319D9530D01A1AFDA3856CFBAD76D",
    "RANK3_THREE_HALVES_FOREST_CERTIFICATE_2026-07-27.md":
        "0CAD18D9D3EDDF05581AC7909CB1F52932FE43FB522CD24AF55D9F61395DB3DE",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def choose(value, rank):
    return sp.prod(value - offset for offset in range(rank)) / sp.factorial(rank)


def shifted_positive(expression, n, base=14):
    N = sp.Symbol("N", nonnegative=True)
    coefficients = sp.Poly(sp.expand(expression.subs(n, N + base)), N).all_coeffs()
    assert coefficients and all(value > 0 for value in coefficients)
    return {
        "shifted_expression": str(sp.expand(expression.subs(n, N + base))),
        "positive_coefficients": [str(value) for value in coefficients],
    }


def structural_certificate():
    active, names = derive_pair_cone(
        q3_scale=sp.Rational(3, 4), q3_w_scale=sp.Rational(3, 4)
    )
    isolated, isolated_names = derive_pair_cone(
        q3_scale=sp.Integer(1), q3_w_scale=sp.Rational(3, 4), positive_uv=0
    )
    n = names["n"]
    e = names["edge_count"]
    du = names["degree_u"]
    dv = names["degree_v"]
    adj = names["adjacent"]

    expected_active = sp.Matrix(((-6, 3, 3), (3, -9, -1), (3, -1, -9)))
    expected_isolated = sp.Matrix(((-9, 3, 3), (3, -9, -1), (3, -1, -9)))
    interval_variables = [
        names["C_wedges_E"], names["C_neighbor_excess_u"],
        names["C_neighbor_excess_v"],
    ]
    assert sp.hessian(active, interval_variables) == expected_active
    assert sp.hessian(isolated, interval_variables) == expected_isolated
    active_minors = [expected_active[:k, :k].det() for k in (1, 2, 3)]
    isolated_minors = [expected_isolated[:k, :k].det() for k in (1, 2, 3)]
    assert active_minors == [-6, 45, -336]
    assert isolated_minors == [-9, 72, -576]

    wnone = names["weight_none"]
    wu = names["weight_u"]
    wv = names["weight_v"]
    wboth = names["weight_both"]
    floor_none = (22 * n**2 + 13 * n - 192) / 4
    floor_u = (10 * n - 104) / 4
    floor_v = (12 * n - 140) / 4
    assert sp.expand(
        wnone.subs(e, n - 1) - floor_none
        - (56 * adj + (6 * n - 47) * du + (6 * n - 53) * dv) / 4
    ) == 0
    # Use du<=e and dv<=e before setting e=n-1; these are the exact displayed
    # lower floors because the remaining coefficients have the shown signs.
    assert sp.expand(
        wu.subs({du: e, e: n - 1}) - floor_u
        - (32 * adj + (6 * n - 37) * dv) / 4
    ) == 0
    assert sp.expand(
        wv.subs({dv: e, e: n - 1}) - floor_v
        - (32 * adj + (6 * n - 31) * du) / 4
    ) == 0

    # weight_both=-B/4.  For 14<=n<=26 use e<=n-1; for n>=27 the e
    # coefficient is nonnegative.  Dropping nonnegative degree terms and
    # using adj<=1 gives the two strictly positive lower bounds for B.
    B = sp.expand(-4 * wboth)
    expected_B = (
        -32 * adj + 32 * du + 32 * dv + (2 * n - 53) * e
        + 20 * n**2 - 82 * n + 147
    )
    assert sp.expand(B - expected_B) == 0
    finite_B_floor = 22 * n**2 - 137 * n + 168
    large_B_floor = 20 * n**2 - 82 * n + 115
    assert all(finite_B_floor.subs(n, order) > 0 for order in range(14, 27))
    shifted_positive(large_B_floor, n, 27)

    iso_none = sp.factor(isolated_names["weight_none"].subs({du: 0, dv: 0, adj: 0}))
    iso_floor = (18 * n**2 + 25 * n - 200) / 4
    assert sp.expand(iso_none.subs(e, n - 1) - iso_floor) == 0

    assert names["Q35_coefficients"] == (2 * n + 3, 6 * n + 1, 6 * n - 5)
    return {
        "reserve_split": (
            "Q3(C_E) at scale 1 when both marks are isolated and 3/4 otherwise; "
            "Q3(C_W) at scale 3/4 in every branch. Q3(F)>=0 for every forest."
        ),
        "ceiling_payment": "i6(C_E)<=binomial(n,6), with raw coefficient -6",
        "high_motif_payment": (
            "For each of C_E,C_U,C_V: Q35>=R4-S4 and "
            "4*S4<=(q-3)*S3. Connected three-edge trees are then partitioned "
            "by containing neither, one, or both marks."
        ),
        "positive_active_weights": {
            "neither": shifted_positive(floor_none, n),
            "u_only": shifted_positive(floor_u, n),
            "v_only": shifted_positive(floor_v, n),
        },
        "negative_both_weight": {
            "B_equals_minus_4_weight": str(expected_B),
            "orders_14_26_floor": str(finite_B_floor),
            "orders_14_26_values": [str(finite_B_floor.subs(n, order)) for order in range(14, 27)],
            "orders_ge_27_floor": shifted_positive(large_B_floor, n, 27),
        },
        "isolated_neither_weight": shifted_positive(iso_floor, n),
        "pair_motif_bound": str(names["pair_motif_bound"]),
        "joint_concavity": {
            "variables": [str(variable) for variable in interval_variables],
            "active_hessian": str(expected_active),
            "active_leading_principal_minors": list(map(str, active_minors)),
            "isolated_hessian": str(expected_isolated),
            "isolated_leading_principal_minors": list(map(str, isolated_minors)),
            "conclusion": "Both Hessians are negative definite, so the minimum on each enclosing interval box is at a vertex.",
        },
    }


def connected_edge_sets(graph, rank):
    total = stars = 0
    vertex_sets = []
    for selected in itertools.combinations(tuple(graph.edges()), rank):
        subgraph = nx.Graph()
        subgraph.add_edges_from(selected)
        vertices = set().union(*(set(edge) for edge in selected))
        if nx.is_connected(subgraph) and len(vertices) == rank + 1:
            total += 1
            stars += int(max(dict(subgraph.degree()).values()) == rank)
            vertex_sets.append(vertices)
    return total, stars, vertex_sets


def three_edge_five(graph):
    total = 0
    for selected in itertools.combinations(tuple(graph.edges()), 3):
        subgraph = nx.Graph()
        subgraph.add_edges_from(selected)
        vertices = set().union(*(set(edge) for edge in selected))
        total += int(len(vertices) == 5 and nx.number_connected_components(subgraph) == 2)
    return total


def incidence_regression():
    forests = pairs = row_checks = 0
    stream = hashlib.sha256()
    for graph0 in nx.graph_atlas_g():
        if len(graph0) == 0 or not nx.is_forest(graph0):
            continue
        graph = nx.convert_node_labels_to_integers(graph0)
        forests += 1
        for u, v in itertools.permutations(graph.nodes(), 2):
            pairs += 1
            n = len(graph)
            e = graph.number_of_edges()
            du, dv = graph.degree(u), graph.degree(v)
            zu, zv = int(du > 0), int(dv > 0)
            adj = int(graph.has_edge(u, v))
            common = len(set(graph.neighbors(u)) & set(graph.neighbors(v)))
            assert common <= 1 and not (adj and common)
            xu = sum(graph.degree(w) - 1 for w in graph.neighbors(u))
            xv = sum(graph.degree(w) - 1 for w in graph.neighbors(v))
            wedges = sum(degree * (degree - 1) // 2 for _, degree in graph.degree())
            assert adj * (dv - 1) + common <= xu <= e - du if du else xu == 0
            assert adj * (du - 1) + common <= xv <= e - dv if dv else xv == 0
            base = zu + zv - adj
            remainder = e - (du + dv - adj)
            assert remainder >= 0 and e - base <= n - 1 - base
            unmarked_cap = remainder + max(0, base - 1)
            wedge_lower = du * (du - 1) // 2 + dv * (dv - 1) // 2 + common
            wedge_upper = (
                du * (du - 1) // 2 + dv * (dv - 1) // 2
                + unmarked_cap * (unmarked_cap + 1) // 2
            )
            assert wedge_lower <= wedges <= wedge_upper

            r3, _, r3sets = connected_edge_sets(graph, 3)
            actual_both = sum(u in vertices and v in vertices for vertices in r3sets)
            if adj:
                bound = choose(du + dv - 2, 2) + xu + xv - (du + dv - 2)
                assert actual_both == bound
            elif common:
                bound = du + dv + sp.Rational(xu + xv, 2) - 3
                assert actual_both <= bound
            else:
                bound = zu * zv
                assert actual_both <= bound

            for deleted in ((), (u,), (v,)):
                reduced = graph.copy()
                reduced.remove_nodes_from(deleted)
                q = reduced.number_of_edges()
                rr3, ss3, _ = connected_edge_sets(reduced, 3)
                rr4, ss4, _ = connected_edge_sets(reduced, 4)
                q35 = three_edge_five(reduced)
                assert 4 * ss4 <= (q - 3) * ss3
                assert q35 >= rr4 - ss4
                row_checks += 1
            record = (n, e, du, dv, adj, common, xu, xv, wedges, r3, actual_both, str(bound))
            stream.update((repr(record) + ";").encode())
    return {
        "atlas_forests": forests,
        "ordered_marked_pairs": pairs,
        "marked_row_checks": row_checks,
        "all_interval_and_motif_inequalities_pass": True,
        "stream_sha256": stream.hexdigest().upper(),
        "role": "finite regression only for the elementary all-order incidence lemmas",
    }


def coefficient_certificate():
    rows = []
    stream = hashlib.sha256()
    total = 0
    global_minimum = None
    for index, branch in enumerate(branches()):
        zu, zv, *_ = branch
        scale = sp.Integer(1) if not (zu or zv) else sp.Rational(3, 4)
        polynomial = mapped_polynomial(branch, 14, scale)
        coefficients, degree = homogeneous_coefficients(polynomial, 0)
        assert coefficients and all(value > 0 for value in coefficients.values())
        minimum = min(coefficients.values())
        global_minimum = minimum if global_minimum is None else min(global_minimum, minimum)
        local = hashlib.sha256()
        for key, value in sorted(coefficients.items()):
            record = f"{key}:{value};".encode()
            local.update(record)
            stream.update(record)
        total += len(coefficients)
        rows.append({
            "index": index,
            "branch": "/".join(map(str, branch)),
            "q3_E_scale": str(scale),
            "mapped_terms": len(polynomial.terms()),
            "simplex_degree": degree,
            "homogeneous_coefficients": len(coefficients),
            "minimum": str(minimum),
            "coefficient_stream_sha256": local.hexdigest().upper(),
        })
    assert len(rows) == 34 and total == 7050
    assert global_minimum == sp.Rational(17, 40)
    return {
        "order_base": 14,
        "canonical_interval_vertices": len(rows),
        "total_homogeneous_coefficients": total,
        "global_minimum": str(global_minimum),
        "all_coefficients_strictly_positive": True,
        "coefficient_stream_sha256": stream.hexdigest().upper(),
        "rows": rows,
    }


def main():
    for name, expected in DEPENDENCIES.items():
        assert sha256(HERE / name) == expected, name
    invariant = json.loads((HERE / "iso_n5_g2_singleton_endpoint_invariant_exact_rank5_g2_alt_20260830.json").read_text())
    assert invariant["marker"] == "DERIVED_EXACT_ISO_N5_G2_SINGLETON_ENDPOINT_INVARIANT_RANK5_G2_ALT"
    structure = structural_certificate()
    incidence = incidence_regression()
    coefficients = coefficient_certificate()
    report = {
        "marker": MARKER,
        "theorem": (
            "For every canonical singleton_endpoint_p_equals_u forest configuration "
            "of order n>=14, raw rank-five g2(C,D)>=0; p=v follows by exchanging the marks."
        ),
        "structural_certificate": structure,
        "incidence_regression": incidence,
        "coefficient_certificate": coefficients,
        "dependencies_sha256": DEPENDENCIES,
        "scope": (
            "Exact large-order singleton_endpoint g2 only, configuration order n>=14, "
            "for p=u and p=v by symmetry. Orders n<=13, the two internal-spine modes, "
            "all g2, all N5, and Erdos Problem 993 remain separate."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "branches": coefficients["canonical_interval_vertices"],
        "coefficients": coefficients["total_homogeneous_coefficients"],
        "minimum": coefficients["global_minimum"],
        "coefficient_stream_sha256": coefficients["coefficient_stream_sha256"],
        "incidence_pairs": incidence["ordered_marked_pairs"],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
