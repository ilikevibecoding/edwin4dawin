#!/usr/bin/env python3
"""Independent exact assembly of the all-marked-forest rank-four theorem.

This file does not re-use proof functions from the component certificates.  It
pins their frozen source/report pairs, independently reconstructs the generic
whole-bundle algebra, proves that a deliberately chosen rooting exhausts the
support geometries, and composes the resulting bundle inequality with the
all-forest N3 theorem in a strong induction.  The graph-atlas replay and mode
census are audits only; the theorem is the all-order structural induction.
"""

from __future__ import annotations

import hashlib
import itertools
import json
from math import factorial
from pathlib import Path

import networkx as nx
import sympy as sp


HERE = Path(__file__).resolve().parent
MARKER = "PASS_INDEPENDENT_EXACT_ALL_MARKED_FOREST_N4_BUNDLE_INDUCTION_G1_BERNSTEIN"

DEPENDENCIES = {
    "all_forest_N2_N3": {
        "report": "iso_all_forest_n2_n3_assembly_exact_root_20260829.json",
        "report_sha256": "0E35EDD2D7AA726A9F9A8B0BDF78A97F15E3004F717B495306B90A2FA0CEA157",
        "marker": "PASS_EXACT_ALL_MARKED_FOREST_N2_N3_ASSEMBLY_ROOT",
        "source": "assemble_iso_all_forest_n2_n3_root.py",
        "source_sha256": "47DFB8842F06EA5193D6436ED36C08B5690C4082486AA49452657FF9158CDE79",
    },
    "whole_bundle_algebra_and_g4_g6": {
        "report": "iso_n4_whole_bundle_binomial_symbolic_root_20260829.json",
        "report_sha256": "8B69FF78991FBB882FEEC5FC2A7A94D44EB5024AEB913B9DE4D6F3CC22B03494",
        "marker": "PASS_EXACT_ISO_N4_BUNDLE_TOP_BINOMIAL_COEFFICIENTS",
        "source": "derive_iso_n4_bundle_polynomial_root.py",
        "source_sha256": "F312FB481C76129380823CFC5E1FA6BB2B7D794846136A14477FCC9245D8870E",
    },
    "universal_g3": {
        "report": "iso_n4_bundle_g3_independent_audit_bundle_g3_20260829.json",
        "report_sha256": "0747B3A21A7CBB37D927B5ABC846E45ADC4697FFB66BCB07C2D0FBA11B301BFF",
        "marker": "PASS_INDEPENDENT_EXACT_ISO_N4_BUNDLE_G3_FOREST_PROOF_AUDIT_BUNDLE_G3",
        "source": "audit_iso_n4_bundle_g3_independent_bundle_g3.py",
        "source_sha256": "ED17F97BBE47502CF2C839DCB7B72740DB4DC74BFE33EB7788A437E1AA1DF318",
    },
    "ordinary_singleton_g1": {
        "report": "iso_n4_bundle_g1_parent_cone_complete_independent_audit_g1_bernstein_20260829.json",
        "report_sha256": "AA6149DB846DA052CAF61D6C1971EAC0C78A51188208C2474172148B735241C8",
        "marker": "PASS_INDEPENDENT_EXACT_ISO_N4_BUNDLE_G1_PARENT_CONE_COMPLETE_G1_BERNSTEIN",
        "source": "audit_iso_n4_bundle_g1_parent_cone_complete_g1_bernstein.py",
        "source_sha256": "7BEAE7422441A07491B27C7A979A3AB56E1DB436DC506ABBF503CB352C872BAE",
    },
    "ordinary_singleton_g2": {
        "report": "iso_n4_bundle_g2_deepest_ordinary_independent_audit_agent_20260829.json",
        "report_sha256": "4F503E7785C89909D6CC2E4014BA241ACFFCDD55ECE75C0CFED1F75245344395",
        "marker": "PASS_INDEPENDENT_EXACT_ISO_N4_BUNDLE_G2_DEEPEST_ORDINARY_AUDIT",
        "source": "audit_iso_n4_bundle_g2_deepest_ordinary_independent_agent.py",
        "source_sha256": "5C9BA4A5AD9997B20DE899307F678D07E100CB01B33A079B157B4D6B206C5E91",
    },
    "endpoint_singleton_g1_g2": {
        "report": "iso_n4_bundle_g12_endpoint_parent_independent_audit_g1_bernstein_20260829.json",
        "report_sha256": "6BD3EEA426C08AA1C65DCC0A5EB74635A7849BA7011BA8C6AB60BD2ADC74CE05",
        "marker": "PASS_INDEPENDENT_EXACT_ISO_N4_BUNDLE_G12_ENDPOINT_PARENT_G1_G2_AUDIT_G1_BERNSTEIN",
        "source": "audit_iso_n4_bundle_g12_endpoint_parent_independent_g1_bernstein.py",
        "source_sha256": "DE8A182E15D9624E3C2F492C177F94AD66064DD2BC8D9048C6026A5F7B3CB363",
    },
    "no_parent_k0_g1_g2": {
        "report": "iso_n4_bundle_g12_no_parent_k0_independent_audit_agent_20260829.json",
        "report_sha256": "0644F23004A3EDCEED1D3147C7AD18F9F0FF2B5B55C0E4BA602C43C2A3D007DE",
        "marker": "PASS_INDEPENDENT_EXACT_ISO_N4_BUNDLE_G12_NO_PARENT_K0_AUDIT_AGENT",
        "source": "audit_iso_n4_bundle_g12_no_parent_k0_independent_agent.py",
        "source_sha256": "BE7F1A401BCA0BAB69F81FD2B1FAC5C97ED53F663909C34A433902A968E6FC3C",
    },
    "internal_spine_broom_g1_g2": {
        "report": "iso_n4_bundle_internal_spine_broom_g12_independent_exact_g1_bernstein_20260829.json",
        "report_sha256": "944D02AA0F366D8E9CD2ACA22C9C6C4CF3AE6747FCD57BB5FD6014F35B60C3F8",
        "marker": "PASS_INDEPENDENT_EXACT_ISO_N4_BUNDLE_INTERNAL_SPINE_BROOM_G12_G1_BERNSTEIN",
        "source": "prove_iso_n4_bundle_internal_spine_broom_g12_independent_g1_bernstein.py",
        "source_sha256": "01B49C9B6E7A8108770FD075B0012223447917EE0F333AFC800A5A0CE6F538A9",
    },
    "terminal_rank4": {
        "report": "iso_n4_terminal_brooms_isolates_independent_exact_agent_20260829.json",
        "report_sha256": "91B157AF31E2DA4D42F250AA79D6FD3C00DC42362EC2A1263E7F073099C8C148",
        "marker": "PASS_INDEPENDENT_EXACT_ISO_N4_TERMINAL_BROOMS_ISOLATES_AGENT",
        "source": "prove_iso_n4_terminal_brooms_isolates_independent_agent.py",
        "source_sha256": "425E9616C9424D1DAA05E9D4BD17C6D9D63A4B83BED605591BDE02E836686627",
    },
}

ROOT_ASSEMBLY_TARGET = {
    "source": "assemble_iso_all_forest_n4_bundle_induction_root.py",
    "source_sha256": "9A11F120B02BD477069A28443B0244B3B592A69F1A2E060A5283B7D4453F6720",
    "report": "iso_all_forest_n4_bundle_induction_exact_root_20260829.json",
    "report_sha256": "28682176B3A1402BF115C6294280B979CD418B291809782881998379DDD3131C",
    "marker": "PASS_EXACT_ALL_MARKED_FOREST_N4_BUNDLE_INDUCTION_ROOT",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def at(row, rank):
    return row[rank] if 0 <= rank < len(row) else 0


def nested_rank(rows, rank):
    """The defining nine-term four-minor Newton expression."""
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


def choose_polynomial(variable, rank):
    if rank < 0:
        return sp.Integer(0)
    numerator = sp.sympify(sp.prod(variable - offset for offset in range(rank)))
    return sp.expand(numerator / sp.Integer(factorial(rank)))


def isolate_multiply(rows, variable, maximum):
    return tuple(
        tuple(
            sp.expand(sum(choose_polynomial(variable, j) * at(row, k - j) for j in range(k + 1)))
            for k in range(maximum + 1)
        )
        for row in rows
    )


def add_xd(rows, drows):
    return tuple(
        tuple(sp.expand(at(row, k) + at(drow, k - 1)) for k in range(len(row)))
        for row, drow in zip(rows, drows)
    )


def newton_coefficients(expression, variable):
    degree = sp.Poly(sp.expand(expression), variable).degree()
    values = [sp.expand(expression.subs(variable, value)) for value in range(degree + 1)]
    coefficients = []
    while values:
        coefficients.append(values[0])
        values = [sp.expand(values[i + 1] - values[i]) for i in range(len(values) - 1)]
    reconstructed = sp.expand(sum(
        coefficient * choose_polynomial(variable, rank)
        for rank, coefficient in enumerate(coefficients)
    ))
    assert sp.expand(reconstructed - expression) == 0
    return coefficients


def independent_bundle_algebra(top_report):
    """Rebuild Gamma and its Newton coefficients without importing the producer."""
    m, t = sp.symbols("M t", integer=True, nonnegative=True)
    names = "EUVW"
    crows = tuple(tuple(sp.symbols(f"c{name}0:6")) for name in names)
    drows = tuple(tuple(sp.symbols(f"d{name}0:6")) for name in names)

    tm = add_xd(isolate_multiply(crows, m, 5), drows)
    t0 = add_xd(crows, drows)
    ct = isolate_multiply(crows, t, 4)
    lower = nested_rank(ct, 3)
    lower_poly = sp.Poly(lower, t)
    lower_sum = sp.expand(sum(
        coefficient * (sp.bernoulli(power + 1, m) - sp.bernoulli(power + 1, 0)) / (power + 1)
        for (power,), coefficient in lower_poly.terms()
    ))
    gamma = sp.expand(nested_rank(tm, 4) - nested_rank(t0, 4) - lower_sum)
    coefficients = newton_coefficients(gamma, m)
    assert sp.Poly(gamma, m).degree() == 6
    assert len(coefficients) == 7 and coefficients[0] == 0

    frozen_factors = [item["factor"] for item in top_report["binomial_coefficients"]]
    rebuilt_factors = [str(sp.factor(value)) for value in coefficients]
    assert rebuilt_factors == frozen_factors

    n, q, epsilon_u, epsilon_v = sp.symbols(
        "n q epsilon_u epsilon_v", integer=True, nonnegative=True
    )
    structural = {}
    for name in names:
        structural[sp.symbols(f"c{name}0")] = 1
        structural[sp.symbols(f"d{name}0")] = 1
    structural.update({
        sp.symbols("cE1"): n,
        sp.symbols("cU1"): n - 1,
        sp.symbols("cV1"): n - 1,
        sp.symbols("cW1"): n - 2,
        sp.symbols("dE1"): q,
        sp.symbols("dU1"): q - epsilon_u,
        sp.symbols("dV1"): q - epsilon_v,
        sp.symbols("dW1"): q - epsilon_u - epsilon_v,
    })
    edge_count, degree_u, degree_v, adjacent = sp.symbols(
        "edge_count degree_u degree_v adjacent", integer=True, nonnegative=True
    )
    second_faces = {
        sp.symbols("cE2"): n * (n - 1) / 2 - edge_count,
        sp.symbols("cU2"): (n - 1) * (n - 2) / 2 - edge_count + degree_u,
        sp.symbols("cV2"): (n - 1) * (n - 2) / 2 - edge_count + degree_v,
        sp.symbols("cW2"): (
            (n - 2) * (n - 3) / 2
            - edge_count + degree_u + degree_v - adjacent
        ),
    }
    g4 = sp.factor(coefficients[4].subs(structural).subs(second_faces))
    expected_g4 = (
        10 * edge_count + 50 * n - 15 * degree_u - 15 * degree_v
        + 12 * adjacent - 3 * epsilon_u - 3 * epsilon_v - 2 * q + 18
    )
    remainder = (
        10 * edge_count + 15 * (n - degree_u - degree_v) + 12 * adjacent
        + 2 * (n - q) + 3 * (2 - epsilon_u - epsilon_v)
    )
    assert sp.expand(g4 - expected_g4) == 0
    assert sp.expand(g4 - (33 * n + 12) - remainder) == 0
    assert sp.expand(coefficients[5].subs(structural) - 50) == 0
    assert sp.expand(coefficients[6].subs(structural)) == 0

    stream = json.dumps(rebuilt_factors, separators=(",", ":")).encode()
    return {
        "identity": (
            "Gamma_M=N4((1+x)^M C+xD)-N4(C+xD)-"
            "sum_(t=0)^(M-1)N3((1+x)^t C)"
        ),
        "degree_in_M": 6,
        "newton_ranks": list(range(7)),
        "g0": 0,
        "g4": str(g4),
        "g4_decomposition": "33*n+12 + " + str(sp.factor(remainder)),
        "g5": 50,
        "g6": 0,
        "exact_newton_inversion": True,
        "matches_frozen_full_coefficient_stream": True,
        "coefficient_stream_sha256": hashlib.sha256(stream).hexdigest().upper(),
    }


def component_root(graph, component, u, v):
    """Choose roots so only u can occur below a support in the two-mark tree."""
    component = set(component)
    if v in component:
        return v
    if u in component:
        return u
    nonleaves = sorted(x for x in component if graph.degree(x) > 1)
    return nonleaves[0] if nonleaves else min(component)


def rooted_forest(graph, u, v):
    parent, depth, children, root_of = {}, {}, {x: [] for x in graph}, {}
    for component in nx.connected_components(graph):
        root = component_root(graph, component, u, v)
        parent[root], depth[root], root_of[root] = None, 0, root
        stack = [root]
        while stack:
            vertex = stack.pop()
            for neighbor in sorted(graph.neighbors(vertex), reverse=True):
                if neighbor == parent[vertex]:
                    continue
                assert neighbor not in parent
                parent[neighbor] = vertex
                depth[neighbor] = depth[vertex] + 1
                root_of[neighbor] = root
                children[vertex].append(neighbor)
                stack.append(neighbor)
    return parent, depth, children, root_of


def is_unmarked_leaf(graph, vertex, u, v):
    return vertex not in (u, v) and graph.degree(vertex) == 1


def unrooted_terminal(graph, u, v):
    return not any(
        s not in (u, v)
        and any(is_unmarked_leaf(graph, z, u, v) for z in graph.neighbors(s))
        for s in graph
    )


def assert_terminal_family(graph, u, v):
    components = [set(c) for c in nx.connected_components(graph)]
    for component in components:
        marks = component & {u, v}
        if not marks:
            assert len(component) == 1
        elif len(marks) == 1:
            mark = next(iter(marks))
            if nx.node_connected_component(graph, u) != nx.node_connected_component(graph, v):
                assert all(x == mark or graph.has_edge(mark, x) for x in component)
                assert all(
                    mark in edge for edge in graph.subgraph(component).edges()
                )
    if nx.has_path(graph, u, v):
        path = nx.shortest_path(graph, u, v)
        path_set = set(path)
        component = set(nx.node_connected_component(graph, u))
        for x in component - path_set:
            assert is_unmarked_leaf(graph, x, u, v)
            assert graph.has_edge(x, u) or graph.has_edge(x, v)


def descendants(children, start):
    result, stack = set(), [start]
    while stack:
        vertex = stack.pop()
        if vertex in result:
            continue
        result.add(vertex)
        stack.extend(children[vertex])
    return result


def classify_deepest_support(graph, u, v):
    """Classify the canonical deepest support, asserting every exclusion."""
    parent, depth, children, root_of = rooted_forest(graph, u, v)
    eligible = [
        s for s in graph
        if s not in (u, v)
        and any(is_unmarked_leaf(graph, child, u, v) for child in children[s])
    ]
    terminal = unrooted_terminal(graph, u, v)
    assert bool(eligible) == (not terminal)
    if terminal:
        assert_terminal_family(graph, u, v)
        return {"mode": "terminal"}

    maximum_depth = max(depth[s] for s in eligible)
    support = min(s for s in eligible if depth[s] == maximum_depth)
    bundle = [c for c in children[support] if is_unmarked_leaf(graph, c, u, v)]
    nonbundle_children = [c for c in children[support] if c not in bundle]
    assert bundle

    # A second nonleaf child would contain no available mark under this rooting;
    # a farthest leaf in that subtree would have a deeper unmarked support.
    assert len(nonbundle_children) <= 1
    p = parent[support]
    if not nonbundle_children:
        if p is None:
            assert root_of[support] == support
            assert set(nx.node_connected_component(graph, support)) == {support, *bundle}
            return {"mode": "no_parent_k0", "bundle_size": len(bundle)}
        if p in (u, v):
            return {"mode": "singleton_endpoint", "bundle_size": len(bundle)}
        return {"mode": "singleton_ordinary", "bundle_size": len(bundle)}

    child = nonbundle_children[0]
    assert p is not None
    component = set(nx.node_connected_component(graph, support))
    assert u in component and v in component
    assert root_of[support] == v
    path = nx.shortest_path(graph, support, u)
    assert len(path) >= 2 and path[1] == child
    path_set = set(path)
    subtree = descendants(children, child)
    assert u in subtree
    for x in subtree - path_set:
        # The only collision branches that do not create a deeper eligible
        # unmarked support are depth-one leaves at the marked endpoint u.
        assert is_unmarked_leaf(graph, x, u, v)
        assert graph.has_edge(x, u)
    assert all(x == u or x not in (u, v) for x in path[1:])
    assert p != u
    return {
        "mode": "internal_spine_endpoint" if p == v else "internal_spine_ordinary",
        "bundle_size": len(bundle),
        "ell": len(path) - 1,
        "broom_leaves_at_u": len(subtree - path_set),
    }


def independence_row(graph, maximum=5):
    vertices = list(graph)
    edges = {frozenset(edge) for edge in graph.edges()}
    row = []
    for rank in range(maximum + 1):
        row.append(sum(
            all(frozenset(pair) not in edges for pair in itertools.combinations(chosen, 2))
            for chosen in itertools.combinations(vertices, rank)
        ))
    return tuple(row)


def direct_n4(graph, u, v):
    rows = []
    for removed in ((), (u,), (v,), (u, v)):
        reduced = graph.copy()
        reduced.remove_nodes_from(removed)
        rows.append(independence_row(reduced))
    return int(nested_rank(tuple(rows), 4))


def finite_replay_and_mode_census():
    cells = 0
    forest_types = 0
    minimum = None
    witness = None
    modes = {}
    by_order = {}
    for graph0 in nx.graph_atlas_g():
        if len(graph0) < 2 or not nx.is_forest(graph0):
            continue
        graph = nx.convert_node_labels_to_integers(graph0)
        forest_types += 1
        order_cells = 0
        for u in graph:
            for v in graph:
                if u == v:
                    continue
                value = direct_n4(graph, u, v)
                assert value >= 0
                data = classify_deepest_support(graph, u, v)
                mode = data["mode"]
                modes[mode] = modes.get(mode, 0) + 1
                cells += 1
                order_cells += 1
                if minimum is None or value < minimum:
                    minimum = value
                    witness = {
                        "order": len(graph),
                        "graph6": nx.to_graph6_bytes(graph, header=False).decode().strip(),
                        "marks": [u, v],
                        "N4": value,
                    }
        by_order[str(len(graph))] = by_order.get(str(len(graph)), 0) + order_cells
    assert forest_types == 78
    assert cells == 2448
    assert minimum == 0
    assert by_order == {"2": 4, "3": 18, "4": 72, "5": 200, "6": 600, "7": 1554}
    assert modes == {
        "terminal": 524,
        "no_parent_k0": 392,
        "singleton_endpoint": 645,
        "singleton_ordinary": 490,
        "internal_spine_endpoint": 290,
        "internal_spine_ordinary": 107,
    }
    return {
        "atlas_orders": [2, 7],
        "unlabelled_forest_types": forest_types,
        "ordered_marked_cells": cells,
        "negative_N4_cells": 0,
        "minimum_N4": minimum,
        "minimum_witness": witness,
        "mode_counts": dict(sorted(modes.items())),
        "ordered_cells_by_order": by_order,
        "role": "finite replay and classification audit only; not an all-order premise",
    }


def load_and_pin_dependencies():
    loaded, pins = {}, {}
    for name, expected in DEPENDENCIES.items():
        report_path = HERE / expected["report"]
        source_path = HERE / expected["source"]
        assert sha256(report_path) == expected["report_sha256"]
        assert sha256(source_path) == expected["source_sha256"]
        report = json.loads(report_path.read_text(encoding="utf-8"))
        assert report["marker"] == expected["marker"]
        assert report["source_sha256"] == expected["source_sha256"]
        loaded[name] = report
        pins[name] = dict(expected)

    assert loaded["all_forest_N2_N3"]["theorem"] == (
        "N2(B;u,v)>=0 and N3(B;u,v)>=0 for every finite marked forest."
    )
    assert loaded["whole_bundle_algebra_and_g4_g6"]["degree_in_M"] == 6
    assert loaded["universal_g3"]["proof_scope"]["theorem"].endswith("strictly positive.")
    assert "p distinct from u,v" in loaded["ordinary_singleton_g1"]["scope"]
    assert "singleton deepest parent distinct from both marks" in loaded["ordinary_singleton_g2"]["scope"]
    assert "g1" in loaded["endpoint_singleton_g1_g2"]["theorems"]
    assert "g2" in loaded["endpoint_singleton_g1_g2"]["theorems"]
    assert "canonical pure no-parent k=0" in loaded["no_parent_k0_g1_g2"]["theorems"]["g1"]
    assert "ell>=1 and k>=0" in loaded["internal_spine_broom_g1_g2"]["theorem"]
    assert loaded["terminal_rank4"]["theorem"].endswith("is nonnegative.")
    return loaded, pins


def audit_root_assembly_target():
    """Audit the final root assembly as a target, never as a proof premise."""
    spec = ROOT_ASSEMBLY_TARGET
    source_path = HERE / spec["source"]
    report_path = HERE / spec["report"]
    assert sha256(source_path) == spec["source_sha256"]
    assert sha256(report_path) == spec["report_sha256"]
    report = json.loads(report_path.read_text(encoding="utf-8"))
    assert report["marker"] == spec["marker"]
    assert report["source_sha256"] == spec["source_sha256"]
    assert report["theorem"] == (
        "N4(B;u,v)>=0 for every finite forest B and every pair of distinct marked vertices u,v."
    )
    assert report["dependencies"]["all_forest_n2_n3"]["report_sha256"] == (
        DEPENDENCIES["all_forest_N2_N3"]["report_sha256"]
    )
    assert report["dependencies"]["g12_internal_spine_broom"]["report_sha256"] == (
        DEPENDENCIES["internal_spine_broom_g1_g2"]["report_sha256"]
    )
    assert sorted(report["rooting_and_exhaustion"]["modes"]) == [
        "internal_spine_endpoint",
        "internal_spine_ordinary",
        "no_mark_root_k0",
        "singleton_endpoint",
        "singleton_ordinary",
    ]
    terminal_text = report["rooting_and_exhaustion"]["terminal"]
    assert "absence of an eligible support is exactly" in terminal_text
    assert "double broom" in terminal_text
    assert report["strong_induction"]["conclusion"] == (
        "N4(B;u,v)>=0 for every finite marked forest."
    )
    return {
        **spec,
        "verdict": "PASS",
        "role": "independently audited target; not used as a premise of this assembly",
        "checks": [
            "exact final source/report hashes and embedded source hash",
            "corrected all-forest N2/N3 dependency hash",
            "all five nonterminal rooted modes",
            "no-eligible-support equivalence with the terminal condition",
            "whole-bundle strong-induction conclusion and scope guard",
        ],
    }


def main():
    loaded, pins = load_and_pin_dependencies()
    algebra = independent_bundle_algebra(loaded["whole_bundle_algebra_and_g4_g6"])
    replay = finite_replay_and_mode_census()
    root_target_audit = audit_root_assembly_target()

    report = {
        "marker": MARKER,
        "theorem": "N4(B;u,v)>=0 for every finite forest B with distinct marked vertices u,v.",
        "rooted_mode_exhaustion": {
            "rooting": (
                "Root the component containing v at v; if u is in another component root it at u; "
                "root every markless nontrivial component at a nonleaf (K2 at either endpoint)."
            ),
            "selection": (
                "If an unmarked support adjacent to an unmarked degree-one vertex exists, choose one "
                "of maximum rooted depth and bundle all of its unmarked leaf children."
            ),
            "deeper_support_exclusion": (
                "Every nonleaf child subtree without a mark contains a farthest unmarked leaf whose "
                "unmarked parent is a deeper eligible support. Under the chosen roots only u can be "
                "a marked descendant, so there is at most one nonleaf child."
            ),
            "exhaustive_nonterminal_modes": {
                "singleton_ordinary": "one parent p distinct from u,v and no nonleaf child",
                "singleton_endpoint": "one parent p in {u,v} and no nonleaf child",
                "no_parent_k0": "a root support in a markless star component; after bundle removal s is isolated, so D=C",
                "internal_spine_broom_ordinary": (
                    "one child branch contains u and parent p is distinct from v; the child is a path "
                    "to u with only direct unmarked leaves at u"
                ),
                "internal_spine_broom_endpoint": (
                    "the same one-ended broom child with parent p=v; includes ell=1 and k=0"
                ),
            },
            "broom_exhaustion": (
                "An off-path branch below an unmarked path vertex, or a branch of depth at least two "
                "below marked u, would create a deeper eligible unmarked support. Hence precisely the "
                "all-order B_(ell,k), ell>=1,k>=0 geometry remains."
            ),
            "terminal": (
                "No eligible support is exactly the terminal condition. Components without marks are "
                "isolates; separated marked components are rooted stars; a common marked component is "
                "a double broom on the u-v path, with arbitrary extra isolates."
            ),
            "machine_audit": replay,
        },
        "whole_bundle_algebra": algebra,
        "root_assembly_target_audit": root_target_audit,
        "coefficient_coverage": {
            "g0": "identically zero by the independently reconstructed full Gamma polynomial",
            "g1_g2": {
                "singleton_ordinary": ["ordinary_singleton_g1", "ordinary_singleton_g2"],
                "singleton_endpoint": "endpoint_singleton_g1_g2",
                "no_parent_k0": "no_parent_k0_g1_g2",
                "internal_spine_broom_ordinary_and_endpoint": "internal_spine_broom_g1_g2",
            },
            "g3": "universal_g3; strictly positive for every genuine forest base/support",
            "g4": "universal lower bound 33*n+12 plus a nonnegative forest remainder",
            "g4_forest_sign": (
                "The exact remainder is 10e+15(n-du-dv)+12a+2(n-q)+3(2-eu-ev). "
                "Here e,a>=0; q<=n by induced deletion; eu+ev<=2; and du+dv<=n: "
                "if uv is an edge, their other neighbor sets are disjoint, while if not, "
                "they share at most one neighbor in a forest."
            ),
            "g5": 50,
            "g6": 0,
            "consequence": "Gamma_M=sum_(j=0)^6 binom(M,j)g_j >= 0 for every integer M>=1 in every exhaustive nonterminal mode.",
        },
        "strong_induction": {
            "measure": "number of unmarked vertices",
            "base": "Every forest with no eligible support is covered by terminal_rank4.",
            "step_identity": algebra["identity"],
            "step": (
                "For a chosen support with M>=1 bundled unmarked leaves, let B0 remove those M leaves, "
                "let C=B0-s, and let D=B0-N[s]. The four independence rows of B_M are "
                "(1+x)^M C+xD; deleting one bundle leaf together with s leaves C disjoint union tK1. "
                "Thus Gamma_M>=0 gives N4(B_M)>=N4(B0)+sum_(t=0)^(M-1)N3(C disjoint union tK1)."
            ),
            "same_rank_term": "B0 has M fewer unmarked vertices, so N4(B0)>=0 by strong induction.",
            "lower_rank_terms": "Every N3 term is nonnegative by the pinned all-marked-forest N2/N3 theorem.",
            "closure": "The right side is nonnegative, proving N4(B_M)>=0 and closing the induction.",
        },
        "dependencies": pins,
        "proof_status": {
            "rank_four_N4_all_marked_forests": "proved",
            "ranks_five_and_above": "not addressed",
            "rank_four_FML_as_a_separate_named_universal_local_statement": (
                "not claimed beyond the exhaustive whole-bundle induction used here"
            ),
            "erdos_problem_993": "not solved by this rank-four theorem",
            "finite_replay_role": "audit only",
        },
        "source_sha256": sha256(Path(__file__)),
    }
    print(json.dumps(report, indent=2, sort_keys=True))
    print(MARKER)


if __name__ == "__main__":
    main()
