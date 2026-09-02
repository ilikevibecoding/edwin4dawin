#!/usr/bin/env python3
"""Independent fail-closed audit of the all-marked-forest N4 bundle induction.

This audit does not import the target assembler.  It independently rebuilds
the generic rank-four Gamma polynomial, checks every binomial coefficient
against the frozen algebra, audits the corrected all-forest N3 terminal
formulas, reconstructs the rooted five-mode classification, and replays the
bundle telescope directly on small forests.  Only after those checks pass is
the final root assembly report accepted by exact source/report hashes.
"""

from __future__ import annotations

import hashlib
import itertools
import json
from collections import Counter
from math import comb, factorial
from pathlib import Path

import networkx as nx
import sympy as sp


HERE = Path(__file__).resolve().parent
TARGET_SOURCE = HERE / "assemble_iso_all_forest_n4_bundle_induction_root.py"
TARGET_REPORT = HERE / "iso_all_forest_n4_bundle_induction_exact_root_20260829.json"
OUTPUT = HERE / "iso_all_forest_n4_bundle_induction_independent_audit_bundle_g12_20260829.json"
TARGET_SOURCE_SHA = "9A11F120B02BD477069A28443B0244B3B592A69F1A2E060A5283B7D4453F6720"
TARGET_REPORT_SHA = "28682176B3A1402BF115C6294280B979CD418B291809782881998379DDD3131C"
TARGET_MARKER = "PASS_EXACT_ALL_MARKED_FOREST_N4_BUNDLE_INDUCTION_ROOT"
MARKER = "PASS_INDEPENDENT_EXACT_ALL_MARKED_FOREST_N4_BUNDLE_INDUCTION_AUDIT_BUNDLE_G12"

EXTRA_AUDITS = {
    "g1_singleton_ordinary_independent": (
        "iso_n4_bundle_g1_parent_cone_complete_independent_audit_g1_bernstein_20260829.json",
        "audit_iso_n4_bundle_g1_parent_cone_complete_g1_bernstein.py",
        "PASS_INDEPENDENT_EXACT_ISO_N4_BUNDLE_G1_PARENT_CONE_COMPLETE_G1_BERNSTEIN",
    ),
    "g1_i5_configuration_independent": (
        "iso_n4_bundle_g1_i5_root_configuration_equivalence_audit_agent_20260829.json",
        "audit_iso_n4_bundle_g1_i5_root_configuration_equivalence_agent.py",
        "PASS_INDEPENDENT_EXACT_ISO_N4_BUNDLE_G1_I5_ROOT_CONFIGURATION_EQUIVALENCE_AUDIT_AGENT",
    ),
    "g2_singleton_ordinary_independent": (
        "iso_n4_bundle_g2_deepest_ordinary_independent_audit_agent_20260829.json",
        "audit_iso_n4_bundle_g2_deepest_ordinary_independent_agent.py",
        "PASS_INDEPENDENT_EXACT_ISO_N4_BUNDLE_G2_DEEPEST_ORDINARY_AUDIT",
    ),
    "internal_spine_full_independent": (
        "iso_n4_internal_spine_broom_full_independent_audit_bundle_g12_20260829.json",
        "audit_iso_n4_internal_spine_broom_full_independent_bundle_g12.py",
        "PASS_FAIL_CLOSED_INDEPENDENT_ISO_N4_INTERNAL_SPINE_BROOM_G12_AUDIT_BUNDLE_G12",
    ),
}

MODES = {
    "no_mark_root_k0",
    "singleton_ordinary",
    "singleton_endpoint",
    "internal_spine_ordinary",
    "internal_spine_endpoint",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def at(row, rank: int):
    return row[rank] if 0 <= rank < len(row) else sp.Integer(0)


def choose(value, rank: int):
    if rank < 0:
        return sp.Integer(0)
    if rank == 0:
        return sp.Integer(1)
    numerator = sp.sympify(sp.prod(sp.sympify(value) - j for j in range(rank)))
    return sp.expand(numerator / sp.Integer(factorial(rank)))


def convolution(left, right):
    return tuple(
        sp.expand(sum(at(left, j) * at(right, rank - j) for j in range(rank + 1)))
        for rank in range(6)
    )


def isolate_row(number):
    return tuple(choose(number, rank) for rank in range(6))


def convolve_isolates(rows, number):
    factor = isolate_row(number)
    return tuple(convolution(row, factor) for row in rows)


def add_xd(crows, drows):
    return tuple(
        tuple(sp.expand(at(crow, rank) + at(drow, rank - 1)) for rank in range(6))
        for crow, drow in zip(crows, drows)
    )


def nested(rows, rank: int):
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


def forward_differences(values):
    values = list(values)
    result = []
    while values:
        result.append(values[0])
        values = [sp.expand(values[j + 1] - values[j]) for j in range(len(values) - 1)]
    return result


def generic_gamma_certificate(top_report):
    crows = tuple(tuple(sp.symbols(f"c{name}0:6")) for name in "EUVW")
    drows = tuple(tuple(sp.symbols(f"d{name}0:6")) for name in "EUVW")
    t0 = add_xd(crows, drows)
    gamma_values = []
    for number in range(8):
        enlarged = add_xd(convolve_isolates(crows, number), drows)
        lower = sum(nested(convolve_isolates(crows, t), 3) for t in range(number))
        gamma_values.append(sp.expand(nested(enlarged, 4) - nested(t0, 4) - lower))
    coefficients = forward_differences(gamma_values)
    assert coefficients[0] == 0
    assert coefficients[7] == 0

    all_symbols = {str(symbol): symbol for expression in coefficients for symbol in expression.free_symbols}
    exact_factor_matches = 0
    for rank in range(7):
        recorded = sp.sympify(
            top_report["binomial_coefficients"][rank]["factor"], locals=all_symbols
        )
        assert sp.expand(coefficients[rank] - recorded) == 0
        exact_factor_matches += 1

    n, q, edge, du, dv, adjacent = sp.symbols("n q edge degree_u degree_v adjacent")
    eu, ev = sp.symbols("epsilon_u epsilon_v")
    named_rules = {
        **{f"c{name}0": 1 for name in "EUVW"},
        **{f"d{name}0": 1 for name in "EUVW"},
        "cE1": n, "cU1": n - 1, "cV1": n - 1, "cW1": n - 2,
        "dE1": q, "dU1": q - eu, "dV1": q - ev, "dW1": q - eu - ev,
        "cE2": choose(n, 2) - edge,
        "cU2": choose(n - 1, 2) - edge + du,
        "cV2": choose(n - 1, 2) - edge + dv,
        "cW2": choose(n - 2, 2) - edge + du + dv - adjacent,
    }
    rules = {all_symbols[name]: value for name, value in named_rules.items() if name in all_symbols}
    g4 = sp.factor(coefficients[4].subs(rules))
    expected_g4 = (
        10 * edge + 50 * n - 15 * du - 15 * dv + 12 * adjacent
        - 3 * eu - 3 * ev - 2 * q + 18
    )
    assert sp.expand(g4 - expected_g4) == 0
    remainder = (
        10 * edge + 15 * (n - du - dv) + 12 * adjacent
        + 2 * (n - q) + 3 * (2 - eu - ev)
    )
    assert sp.expand(g4 - (33 * n + 12) - remainder) == 0
    assert sp.expand(coefficients[5].subs(rules) - 50) == 0
    assert sp.expand(coefficients[6].subs(rules)) == 0

    # Exact Newton inversion at every defining node; the algebraic degree is
    # at most six because N4 is bilinear in rows of rank sum at most six and
    # the summed N3 term raises the isolate degree by one.
    M = sp.Symbol("M", integer=True, nonnegative=True)
    reconstruction = sum(coefficients[j] * choose(M, j) for j in range(7))
    for number, value in enumerate(gamma_values[:7]):
        assert sp.expand(reconstruction.subs(M, number) - value) == 0

    return {
        "generic_forward_differences": 8,
        "exact_reported_factor_matches_g0_through_g6": exact_factor_matches,
        "g7": "0",
        "g4": str(g4),
        "g4_lower_bound": "33*n+12",
        "g4_nonnegative_remainder": str(sp.factor(remainder)),
        "g5": "50",
        "g6": "0",
        "degree_argument": "degree at most six; exact Newton inversion checked at M=0,...,6",
        "coefficient_expression_stream_sha256": hashlib.sha256(
            "".join(sp.srepr(sp.expand(value)) for value in coefficients[:7]).encode()
        ).hexdigest().upper(),
    }


def path_row_symbolic(order):
    return tuple(choose(order - rank + 1, rank) for rank in range(6))


def corrected_low_rank_audit(low_report):
    n = sp.Symbol("n", integer=True, positive=True)
    rows = (
        path_row_symbolic(n),
        path_row_symbolic(n - 1),
        path_row_symbolic(n - 1),
        path_row_symbolic(n - 2),
    )
    n2 = sp.factor(nested(rows, 2))
    n3 = sp.factor(nested(rows, 3))
    assert sp.expand(n2 - (9 * n - 8)) == 0
    assert sp.expand(n3 - (5 * n**3 - 33 * n**2 + 74 * n - 50)) == 0
    derivative = sp.diff(n3, n)
    assert sp.discriminant(derivative, n) == -84

    # P2 is a recurrence boundary for N3 and is checked from literal rows.
    p2 = ((1, 2, 0, 0, 0, 0), (1, 1, 0, 0, 0, 0),
          (1, 1, 0, 0, 0, 0), (1, 0, 0, 0, 0, 0))
    assert nested(p2, 2) == 10
    assert nested(p2, 3) == 2
    recorded = low_report["terminal_vectors_N0_up"]["connected_bare_path"]
    assert recorded["N2_all_n_at_least_2"] == "9*n - 8"
    assert recorded["N3_n_at_least_3"] == "5*n**3 - 33*n**2 + 74*n - 50"
    assert recorded["N3_P2"] == 2

    for dependency in low_report["dependencies"].values():
        path = HERE / dependency["file"]
        payload = json.loads(path.read_text(encoding="utf-8"))
        assert sha256(path) == dependency["sha256"]
        assert payload["marker"] == dependency["marker"]
    return {
        "path_N2": str(n2),
        "path_N3_n_ge_3": str(n3),
        "path_N3_P2": 2,
        "positive_derivative_discriminant_check": -84,
        "dependency_hashes_replayed": len(low_report["dependencies"]),
        "induction_order": "N2 first using N1=0; then N3 using all-forest N2",
    }


def root_data(graph, u, v):
    parent, depth, children = {}, {}, {node: [] for node in graph}
    for component in nx.connected_components(graph):
        root = v if v in component else (u if u in component else min(component))
        distance = nx.single_source_shortest_path_length(graph, root)
        for node in component:
            depth[node] = distance[node]
            if node == root:
                parent[node] = None
            else:
                choices = [neighbor for neighbor in graph.neighbors(node) if distance[neighbor] == distance[node] - 1]
                assert len(choices) == 1
                parent[node] = choices[0]
                children[choices[0]].append(node)
    return parent, depth, children


def deepest_cell(graph, u, v):
    parent, depth, children = root_data(graph, u, v)
    choices = []
    for support in graph:
        if support in (u, v):
            continue
        bundle = sorted(
            child for child in children[support]
            if child not in (u, v) and graph.degree(child) == 1
        )
        if bundle:
            choices.append((depth[support], -support, support, bundle))
    if not choices:
        return None
    _, _, support, bundle = max(choices)
    return support, bundle, parent, depth, children


def descendants(children, start):
    result, stack = set(), [start]
    while stack:
        node = stack.pop()
        if node in result:
            continue
        result.add(node)
        stack.extend(children[node])
    return result


def classify_cell(graph, u, v, cell):
    support, bundle0, parent_map, _depth, children = cell
    bundle = set(bundle0)
    parent = parent_map[support]
    remaining_children = [child for child in children[support] if child not in bundle]
    same = nx.node_connected_component(graph, u) == nx.node_connected_component(graph, v)
    connector = nx.shortest_path(graph, u, v) if same else []
    if support in connector:
        position = connector.index(support)
        assert 0 < position < len(connector) - 1
        assert parent == connector[position + 1]
        assert remaining_children == [connector[position - 1]]
        child = remaining_children[0]
        path_to_u = nx.shortest_path(graph, child, u)
        subtree = descendants(children, child)
        extra = subtree - set(path_to_u)
        assert all(graph.degree(node) == 1 and graph.has_edge(node, u) for node in extra)
        return "internal_spine_endpoint" if parent == v else "internal_spine_ordinary"
    assert not remaining_children
    if parent is None:
        component = nx.node_connected_component(graph, support)
        assert not ({u, v} & component)
        assert set(graph.neighbors(support)) == bundle
        return "no_mark_root_k0"
    return "singleton_endpoint" if parent in (u, v) else "singleton_ordinary"


def terminal_family(graph, u, v):
    marks = {u, v}
    for component in nx.connected_components(graph):
        cm = component & marks
        if not cm:
            assert len(component) == 1
        elif len(cm) == 1:
            mark = next(iter(cm))
            assert all(graph.degree(node) == 1 and graph.has_edge(node, mark) for node in component - {mark})
        else:
            path = set(nx.shortest_path(graph, u, v))
            assert all(
                graph.degree(node) == 1 and (graph.has_edge(node, u) or graph.has_edge(node, v))
                for node in component - path
            )
    return (
        "connected_double_broom_plus_isolates"
        if nx.node_connected_component(graph, u) == nx.node_connected_component(graph, v)
        else "disconnected_rooted_stars_plus_isolates"
    )


def independence_row(graph):
    nodes = tuple(graph.nodes())
    answer = []
    for rank in range(6):
        answer.append(sum(
            all(not graph.has_edge(a, b) for a, b in itertools.combinations(chosen, 2))
            for chosen in itertools.combinations(nodes, rank)
        ))
    return tuple(answer)


def marked_rows(graph, u, v):
    rows = []
    for removed in ((), (u,), (v,), (u, v)):
        reduced = graph.copy(); reduced.remove_nodes_from(removed)
        rows.append(independence_row(reduced))
    return tuple(rows)


def n_value(graph, u, v, rank):
    return int(nested(marked_rows(graph, u, v), rank))


def add_leaves(graph, support, number):
    result = graph.copy()
    next_node = max(result.nodes(), default=-1) + 1
    result.add_edges_from((support, next_node + j) for j in range(number))
    return result


def add_isolates(graph, number):
    result = graph.copy()
    next_node = max(result.nodes(), default=-1) + 1
    result.add_nodes_from(range(next_node, next_node + number))
    return result


def bundle_gamma(base, support, u, v, number):
    cgraph = base.copy(); cgraph.remove_node(support)
    lower = sum(n_value(add_isolates(cgraph, t), u, v, 3) for t in range(number))
    return n_value(add_leaves(base, support, number), u, v, 4) - n_value(base, u, v, 4) - lower


def fixtures():
    cells = []
    graph = nx.Graph([(0, 1), (0, 2)]); graph.add_nodes_from((10, 11))
    cells.append((graph, 10, 11, "no_mark_root_k0"))
    graph = nx.Graph([(0, 1), (1, 2)]); graph.add_nodes_from((10, 11))
    cells.append((graph, 10, 11, "singleton_ordinary"))
    graph = nx.Graph([(0, 1), (1, 2)]); graph.add_node(3)
    cells.append((graph, 0, 3, "singleton_endpoint"))
    graph = nx.Graph([(0, 1), (1, 2), (2, 3), (3, 4), (2, 5), (0, 6)])
    cells.append((graph, 0, 4, "internal_spine_ordinary"))
    graph = nx.Graph([(0, 1), (1, 2), (2, 3), (2, 4), (0, 5)])
    cells.append((graph, 0, 3, "internal_spine_endpoint"))
    return cells


def structural_and_literal_replay(target_finite):
    mode_counts, terminal_counts = Counter(), Counter()
    marked_cells = bundle_cells = telescope_checks = n4_checks = 0
    cases = []
    for graph0 in nx.graph_atlas_g():
        if 2 <= len(graph0) <= 6 and nx.is_forest(graph0):
            graph = nx.convert_node_labels_to_integers(graph0)
            for u, v in itertools.combinations(graph.nodes(), 2):
                cases.append((graph, u, v, None))
    cases.extend(fixtures())

    fixture_coefficients = {}
    for graph, u, v, expected in cases:
        marked_cells += 1
        assert n_value(graph, u, v, 4) >= 0
        n4_checks += 1
        cell = deepest_cell(graph, u, v)
        if cell is None:
            assert expected is None
            terminal_counts[terminal_family(graph, u, v)] += 1
            continue
        mode = classify_cell(graph, u, v, cell)
        if expected is not None:
            assert mode == expected
        mode_counts[mode] += 1
        bundle_cells += 1
        support, bundle, *_ = cell
        base = graph.copy(); base.remove_nodes_from(bundle)
        actual = bundle_gamma(base, support, u, v, len(bundle))
        assert actual >= 0
        telescope_checks += 1
        if expected is not None:
            values = [bundle_gamma(base, support, u, v, number) for number in range(8)]
            coefficients = [int(value) for value in forward_differences(values)]
            assert coefficients[0] == coefficients[7] == 0
            assert all(value >= 0 for value in coefficients[1:7])
            assert coefficients[5:7] == [50, 0]
            fixture_coefficients[mode] = coefficients[:7]

    assert set(mode_counts) == MODES
    assert set(terminal_counts) == {
        "connected_double_broom_plus_isolates", "disconnected_rooted_stars_plus_isolates"
    }
    assert marked_cells == target_finite["unordered_marked_cells_including_fixtures"]
    assert bundle_cells == target_finite["bundle_cells"]
    assert dict(sorted(mode_counts.items())) == target_finite["mode_counts"]
    assert dict(sorted(terminal_counts.items())) == target_finite["terminal_counts"]

    # The terminal condition is genuinely equivalent to absence of a rooted
    # eligible support.  A root that is itself an unmarked leaf can only hide
    # that one orientation; every nontrivial tree has a second leaf, whose
    # parent supplies an eligible child (and K2 makes the root support its child).
    return {
        "atlas_orders": [2, 6],
        "marked_cells": marked_cells,
        "bundle_cells": bundle_cells,
        "direct_N4_nonnegative_checks": n4_checks,
        "direct_actual_bundle_telescope_checks": telescope_checks,
        "mode_counts": dict(sorted(mode_counts.items())),
        "terminal_counts": dict(sorted(terminal_counts.items())),
        "five_mode_fixture_binomial_coefficients": fixture_coefficients,
        "terminal_equivalence": (
            "No rooted eligible support iff no unmarked vertex is adjacent to an unmarked leaf; "
            "the only apparent exception is a root leaf in a no-mark component, resolved by the "
            "second leaf of the same finite tree (or directly by K2)."
        ),
        "role": "finite replay only; the structural arguments and pinned all-order certificates prove the theorem",
    }


def dependency_audit(target):
    pins = {}
    assert len(target["dependencies"]) == 9
    for name, spec in target["dependencies"].items():
        report_path, source_path = HERE / spec["report"], HERE / spec["source"]
        assert sha256(report_path) == spec["report_sha256"]
        assert sha256(source_path) == spec["source_sha256"]
        payload = json.loads(report_path.read_text(encoding="utf-8"))
        assert payload["marker"] == spec["marker"]
        assert payload["source_sha256"] == spec["source_sha256"]
        pins[name] = spec

    extras = {}
    for name, (report_name, source_name, marker) in EXTRA_AUDITS.items():
        report_path, source_path = HERE / report_name, HERE / source_name
        payload = json.loads(report_path.read_text(encoding="utf-8"))
        assert payload["marker"] == marker
        assert payload["source_sha256"] == sha256(source_path)
        extras[name] = {
            "report": report_name, "report_sha256": sha256(report_path),
            "source": source_name, "source_sha256": sha256(source_path), "marker": marker,
        }

    # The independent g2 audit explicitly pins the producer imported by the
    # target assembly; the full internal-spine audit pins the exact target source.
    g2 = json.loads((HERE / EXTRA_AUDITS["g2_singleton_ordinary_independent"][0]).read_text())
    assert g2["audited_hashes"][pins["g2_singleton_ordinary"]["report"]] == pins["g2_singleton_ordinary"]["report_sha256"]
    assert g2["audited_hashes"][pins["g2_singleton_ordinary"]["source"]] == pins["g2_singleton_ordinary"]["source_sha256"]
    broom = json.loads((HERE / EXTRA_AUDITS["internal_spine_full_independent"][0]).read_text())
    assert broom["target_fail_closed_comparison"]["source_sha256"] == pins["g12_internal_spine_broom"]["source_sha256"]
    return pins, extras


def main():
    assert sha256(TARGET_SOURCE) == TARGET_SOURCE_SHA
    assert sha256(TARGET_REPORT) == TARGET_REPORT_SHA
    target = json.loads(TARGET_REPORT.read_text(encoding="utf-8"))
    assert target["marker"] == TARGET_MARKER
    assert target["source_sha256"] == TARGET_SOURCE_SHA
    assert target["theorem"] == "N4(B;u,v)>=0 for every finite forest B and every pair of distinct marked vertices u,v."
    assert set(target["rooting_and_exhaustion"]["modes"]) == MODES

    pins, extras = dependency_audit(target)
    top = json.loads((HERE / pins["bundle_identity_and_g4_g6"]["report"]).read_text())
    generic = generic_gamma_certificate(top)
    low = json.loads((HERE / pins["all_forest_n2_n3"]["report"]).read_text())
    corrected_low = corrected_low_rank_audit(low)
    replay = structural_and_literal_replay(target["finite_replay"])

    # Logical induction audit.  Z is a nonempty set of unmarked vertices, so
    # H=B-Z is a smaller marked forest.  Every lower C+tK1 cell is a marked
    # forest, and every binomial C(M,j) is nonnegative for integer M>=1.
    induction = {
        "measure_strictly_decreases": "|V(H)\\{u,v}|=|V(B)\\{u,v}|-M with M=|Z|>=1",
        "marks_persist": True,
        "lower_cells_are_forests_with_the_same_marks": True,
        "lower_N3_nonnegative": low["theorem"],
        "bundle_scalar_weights": "binom(M,j)>=0 for M>=1 and j>=1",
        "terminal_base": "independent all-order two-star/double-broom theorem",
        "conclusion": target["theorem"],
    }

    report = {
        "marker": MARKER,
        "verdict": "The final root all-N4 assembly passes a fail-closed independent audit.",
        "theorem": target["theorem"],
        "target": {
            "marker": TARGET_MARKER,
            "source": TARGET_SOURCE.name,
            "source_sha256": TARGET_SOURCE_SHA,
            "report": TARGET_REPORT.name,
            "report_sha256": TARGET_REPORT_SHA,
        },
        "generic_bundle_algebra": generic,
        "corrected_all_forest_N2_N3_audit": corrected_low,
        "rooted_five_mode_exhaustion": {
            "theorem": (
                "Root at v, at u when its component is separate, and arbitrarily in no-mark components. "
                "A deepest eligible unmarked support is either a no-mark root star, a singleton-parent "
                "ordinary/endpoint cell, or an internal protected-spine one-ended broom with ordinary/endpoint parent."
            ),
            "terminal_theorem": (
                "Absence of an eligible support is equivalent to the terminal condition; the terminal "
                "families are two marked rooted stars plus isolates or one marked double broom plus isolates."
            ),
            "modes": sorted(MODES),
            "finite_replay": replay,
        },
        "strong_induction_audit": induction,
        "root_dependency_pins": pins,
        "additional_independent_audit_pins": extras,
        "proof_status_distinctions": {
            "theorem": "Exact all-order N4 theorem by bundle payment and strong induction.",
            "finite_census": "The atlas/fixture replay is supplementary and is not used as the all-order proof.",
            "failed_relaxation": "No arbitrary-support or bare-path collision relaxation is used; the rooted mode theorem retains the full one-ended broom."
        },
        "scope_guard": (
            "This proves N4 for every marked forest only.  It does not prove N5 or higher ranks, "
            "the final ISO/Newton propagation, independent-set unimodality, or Erdos Problem 993."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    OUTPUT.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(json.dumps({
        "marker": MARKER,
        "target_source_sha256": TARGET_SOURCE_SHA,
        "target_report_sha256": TARGET_REPORT_SHA,
        "generic_factor_matches": generic["exact_reported_factor_matches_g0_through_g6"],
        "root_dependencies": len(pins),
        "extra_independent_audits": len(extras),
        "finite_replay": {
            "marked_cells": replay["marked_cells"],
            "bundle_cells": replay["bundle_cells"],
            "telescope_checks": replay["direct_actual_bundle_telescope_checks"],
        },
        "source_sha256": report["source_sha256"],
        "output": OUTPUT.name,
    }, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
