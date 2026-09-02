#!/usr/bin/env python3
"""Independent fail-closed audit of the all-forest rank-five assembly.

No classifier, graph functional, or telescope routine is imported from the
target assembler.  This file independently reconstructs the generic rank-five
bundle polynomial, the rooted five-mode classifier, terminal exhaustion, and
a literal atlas/fixture replay.  While the target's all-five-mode g2 dependency
is pending, this audit emits only a PENDING marker.
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
SOURCE = Path(__file__).resolve()
TARGET_SOURCE = HERE / "assemble_iso_all_forest_n5_bundle_induction_g2_structure_nonadjacent.py"
TARGET_REPORT = HERE / "iso_all_forest_n5_bundle_induction_exact_g2_structure_nonadjacent_20260830.json"
OUTPUT = HERE / (
    "iso_all_forest_n5_bundle_induction_independent_audit_"
    "g2_transfer_audit_20260830.json"
)
EXPECTED_TARGET_SOURCE_SHA256 = "9906E66E28717A80F1215DBCF75ADE913AFC5EE1911D1A08FD08317F6589AC38"
EXPECTED_TARGET_REPORT_SHA256 = "7F2845A77504828349E100371FEE2591CFDE70AF87E2504A91EE5D121357B3CB"
EXPECTED_G2_SOURCE_SHA256 = "C85F938AF7605ABBFF864481C113A3F7AA5B756E495A4FFE0205FF288127DED3"
EXPECTED_G2_REPORT_SHA256 = "2935D559B127BE25EC9183560CBBB83287BA8DCAEFD74430B4D7B386B2A019EC"
TARGET_PENDING_MARKER = "PENDING_EXACT_ALL_MARKED_FOREST_N5_BUNDLE_INDUCTION_G2_STRUCTURE_NONADJACENT"
TARGET_PASS_MARKER = "PASS_EXACT_ALL_MARKED_FOREST_N5_BUNDLE_INDUCTION_G2_STRUCTURE_NONADJACENT"
PENDING_MARKER = "PENDING_INDEPENDENT_EXACT_ALL_MARKED_FOREST_N5_BUNDLE_INDUCTION_G2_TRANSFER_AUDIT"
PASS_MARKER = "PASS_INDEPENDENT_EXACT_ALL_MARKED_FOREST_N5_BUNDLE_INDUCTION_G2_TRANSFER_AUDIT"

MODES = {
    "no_mark_root_k0",
    "singleton_ordinary",
    "singleton_endpoint",
    "internal_spine_ordinary",
    "internal_spine_endpoint",
}
MODE_MAP = {
    "no_mark_root_k0": "no_parent_k0",
    "singleton_ordinary": "singleton_ordinary",
    "singleton_endpoint": "singleton_endpoint",
    "internal_spine_ordinary": "internal_spine_broom_ordinary",
    "internal_spine_endpoint": "internal_spine_broom_endpoint",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def at(row, rank):
    return row[rank] if 0 <= rank < len(row) else sp.Integer(0)


def choose(value, rank):
    if rank < 0:
        return sp.Integer(0)
    if rank == 0:
        return sp.Integer(1)
    return sp.expand(
        sp.prod(sp.sympify(value) - offset for offset in range(rank))
        / sp.Integer(factorial(rank))
    )


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


def isolate_multiply(rows, amount, maximum=6):
    return tuple(
        tuple(
            sp.expand(sum(sp.Integer(comb(amount, index)) * at(row, rank - index)
                          for index in range(rank + 1)))
            for rank in range(maximum + 1)
        )
        for row in rows
    )


def add_xd(crows, drows):
    return tuple(
        tuple(sp.expand(at(crow, rank) + at(drow, rank - 1)) for rank in range(len(crow)))
        for crow, drow in zip(crows, drows)
    )


def forward_differences(values):
    row = list(values)
    result = []
    while row:
        result.append(sp.expand(row[0]))
        row = [sp.expand(row[index + 1] - row[index]) for index in range(len(row) - 1)]
    return result


def generic_bundle_audit(bundle_report):
    """Reconstruct all g0,...,g8 from the defining N5/N4 identity."""
    crows = tuple(tuple(sp.symbols(f"c{name}0:7")) for name in "EUVW")
    drows = tuple(tuple(sp.symbols(f"d{name}0:7")) for name in "EUVW")
    base = add_xd(crows, drows)
    gamma = []
    for amount in range(9):
        enlarged = add_xd(isolate_multiply(crows, amount), drows)
        lower = sum(nested(isolate_multiply(crows, offset), 4) for offset in range(amount))
        gamma.append(sp.expand(nested(enlarged, 5) - nested(base, 5) - lower))
    coefficients = forward_differences(gamma)
    assert len(coefficients) == 9 and coefficients[0] == 0

    symbol_table = {
        str(symbol): symbol
        for expression in coefficients
        for symbol in expression.free_symbols
    }
    matches = 0
    for index, recorded in enumerate(bundle_report["binomial_coefficients"]):
        assert recorded["binomial_rank"] == index
        expected = sp.sympify(recorded["factor"], locals=symbol_table)
        assert sp.expand(coefficients[index] - expected) == 0
        matches += 1

    # Exact Newton inversion at every defining node; degree <=8 follows from
    # the row ranks and the summed lower-rank term.
    parameter = sp.symbols("M", integer=True, nonnegative=True)
    reconstructed = sum(coefficients[index] * choose(parameter, index) for index in range(9))
    for amount, value in enumerate(gamma):
        assert sp.expand(reconstructed.subs(parameter, amount) - value) == 0

    actual_constants = {
        symbol: 1
        for row in crows + drows for symbol in (row[0],)
    }
    assert sp.expand(coefficients[8].subs(actual_constants)) == 0
    stream = "".join(sp.srepr(sp.expand(value)) for value in coefficients)
    return {
        "generic_forward_differences": 9,
        "exact_reported_factor_matches_g0_through_g8": matches,
        "degree_in_bundle_size": 8,
        "newton_inversion_nodes": 9,
        "g8_on_independence_rows": "0 after cE0=cU0=cV0=cW0=1",
        "coefficient_expression_stream_sha256": hashlib.sha256(stream.encode()).hexdigest().upper(),
    }


def root_data(graph, u, v):
    parent, depth = {}, {}
    children = {node: [] for node in graph}
    for component in nx.connected_components(graph):
        root = v if v in component else (u if u in component else min(component))
        distance = nx.single_source_shortest_path_length(graph, root)
        for node in component:
            depth[node] = distance[node]
            if node == root:
                parent[node] = None
            else:
                choices = [
                    neighbor for neighbor in graph.neighbors(node)
                    if distance[neighbor] == distance[node] - 1
                ]
                assert len(choices) == 1
                parent[node] = choices[0]
                children[choices[0]].append(node)
    return parent, depth, children


def deepest_cell(graph, u, v):
    parent, depth, children = root_data(graph, u, v)
    candidates = []
    for support in graph:
        if support in (u, v):
            continue
        bundle = sorted(
            child for child in children[support]
            if child not in (u, v) and graph.degree(child) == 1
        )
        if bundle:
            candidates.append((depth[support], -support, support, bundle))
    if not candidates:
        return None
    _depth, _tie, support, bundle = max(candidates)
    return support, bundle, parent, children


def descendants(children, start):
    found, stack = set(), [start]
    while stack:
        node = stack.pop()
        if node in found:
            continue
        found.add(node)
        stack.extend(children[node])
    return found


def classify_cell(graph, u, v, cell):
    support, bundle0, parent_map, children = cell
    bundle = set(bundle0)
    parent = parent_map[support]
    nonbundle = [child for child in children[support] if child not in bundle]
    same = nx.node_connected_component(graph, u) == nx.node_connected_component(graph, v)
    connector = nx.shortest_path(graph, u, v) if same else []
    if support in connector:
        position = connector.index(support)
        assert 0 < position < len(connector) - 1
        assert parent == connector[position + 1]
        assert nonbundle == [connector[position - 1]]
        child = nonbundle[0]
        path_to_u = nx.shortest_path(graph, child, u)
        subtree = descendants(children, child)
        extra = subtree - set(path_to_u)
        assert all(graph.degree(node) == 1 and graph.has_edge(node, u) for node in extra)
        return "internal_spine_endpoint" if parent == v else "internal_spine_ordinary"

    assert not nonbundle
    if parent is None:
        component = nx.node_connected_component(graph, support)
        assert not ({u, v} & component)
        assert set(graph.neighbors(support)) == bundle
        return "no_mark_root_k0"
    return "singleton_endpoint" if parent in (u, v) else "singleton_ordinary"


def terminal_family(graph, u, v):
    marks = {u, v}
    for component in nx.connected_components(graph):
        component_marks = component & marks
        if not component_marks:
            assert len(component) == 1
        elif len(component_marks) == 1:
            mark = next(iter(component_marks))
            assert all(
                graph.degree(node) == 1 and graph.has_edge(node, mark)
                for node in component - {mark}
            )
        else:
            connector = set(nx.shortest_path(graph, u, v))
            assert all(
                graph.degree(node) == 1
                and (graph.has_edge(node, u) or graph.has_edge(node, v))
                for node in component - connector
            )
    same = nx.node_connected_component(graph, u) == nx.node_connected_component(graph, v)
    return (
        "connected_double_broom_plus_isolates"
        if same else "disconnected_rooted_stars_plus_isolates"
    )


def add_integer_rows(left, right, maximum=6):
    return tuple(at(left, rank) + at(right, rank) for rank in range(maximum + 1))


def convolve_integer_rows(left, right, maximum=6):
    return tuple(
        sum(at(left, index) * at(right, rank - index) for index in range(rank + 1))
        for rank in range(maximum + 1)
    )


def independence_row(graph, maximum=6):
    total = (1,) + (0,) * maximum
    for component in nx.connected_components(graph):
        root = min(component)

        def visit(vertex, parent):
            excluded = (1,) + (0,) * maximum
            included = (0, 1) + (0,) * (maximum - 1)
            for child in sorted(graph.neighbors(vertex)):
                if child == parent:
                    continue
                child_excluded, child_included = visit(child, vertex)
                excluded = convolve_integer_rows(
                    excluded, add_integer_rows(child_excluded, child_included, maximum), maximum
                )
                included = convolve_integer_rows(included, child_excluded, maximum)
            return excluded, included

        component_row = add_integer_rows(*visit(root, None), maximum)
        total = convolve_integer_rows(total, component_row, maximum)
    return tuple(int(value) for value in total)


def marked_rows(graph, u, v):
    result = []
    for removed in ((), (u,), (v,), (u, v)):
        reduced = graph.copy()
        reduced.remove_nodes_from(removed)
        result.append(independence_row(reduced))
    return tuple(result)


def rank_value(graph, u, v, rank):
    return int(nested(marked_rows(graph, u, v), rank))


def add_leaves(graph, support, number):
    result = graph.copy()
    first = max(result.nodes(), default=-1) + 1
    result.add_edges_from((support, first + offset) for offset in range(number))
    return result


def add_isolates(graph, number):
    result = graph.copy()
    first = max(result.nodes(), default=-1) + 1
    result.add_nodes_from(range(first, first + number))
    return result


def bundle_gamma(base, support, u, v, amount):
    cgraph = base.copy()
    cgraph.remove_node(support)
    lower = sum(rank_value(add_isolates(cgraph, offset), u, v, 4) for offset in range(amount))
    return (
        rank_value(add_leaves(base, support, amount), u, v, 5)
        - rank_value(base, u, v, 5)
        - lower
    )


def fixtures():
    result = []
    graph = nx.Graph([(0, 1), (0, 2)]); graph.add_nodes_from((10, 11))
    result.append((graph, 10, 11, "no_mark_root_k0"))
    graph = nx.Graph([(0, 1), (1, 2)]); graph.add_nodes_from((10, 11))
    result.append((graph, 10, 11, "singleton_ordinary"))
    graph = nx.Graph([(0, 1), (1, 2)]); graph.add_node(3)
    result.append((graph, 0, 3, "singleton_endpoint"))
    graph = nx.Graph([(0, 1), (1, 2), (2, 3), (3, 4), (2, 5), (0, 6)])
    result.append((graph, 0, 4, "internal_spine_ordinary"))
    graph = nx.Graph([(0, 1), (1, 2), (2, 3), (2, 4), (0, 5)])
    result.append((graph, 0, 3, "internal_spine_endpoint"))
    return result


def finite_replay(expected, maximum_order=6):
    cases = []
    for graph0 in nx.graph_atlas_g():
        if 2 <= len(graph0) <= maximum_order and nx.is_forest(graph0):
            graph = nx.convert_node_labels_to_integers(graph0)
            cases.extend((graph, u, v, None) for u, v in itertools.combinations(graph, 2))
    cases.extend(fixtures())

    mode_counts, terminal_counts = Counter(), Counter()
    minima = {index: None for index in range(1, 9)}
    marked_cells = bundle_cells = terminal_n5_checks = telescope_checks = 0
    digest = hashlib.sha256()
    for graph, u, v, expected_mode in cases:
        marked_cells += 1
        cell = deepest_cell(graph, u, v)
        if cell is None:
            assert expected_mode is None
            family = terminal_family(graph, u, v)
            terminal_counts[family] += 1
            assert rank_value(graph, u, v, 5) >= 0
            terminal_n5_checks += 1
            digest.update(f"T:{sorted(graph.edges())}:{u}:{v}:{family};".encode())
            continue

        mode = classify_cell(graph, u, v, cell)
        if expected_mode is not None:
            assert mode == expected_mode
        mode_counts[mode] += 1
        bundle_cells += 1
        support, bundle, _parent, _children = cell
        base = graph.copy()
        base.remove_nodes_from(bundle)
        gamma = [bundle_gamma(base, support, u, v, amount) for amount in range(9)]
        coefficients = [int(value) for value in forward_differences(gamma)]
        assert coefficients[0] == 0
        assert all(value >= 0 for value in coefficients[1:])
        for index in range(1, 9):
            minima[index] = (
                coefficients[index] if minima[index] is None
                else min(minima[index], coefficients[index])
            )

        actual_amount = len(bundle)
        actual_gamma = bundle_gamma(base, support, u, v, actual_amount)
        reconstruction = sum(
            coefficients[index] * comb(actual_amount, index) for index in range(1, 9)
        )
        assert actual_gamma == reconstruction >= 0
        telescope_checks += 1
        digest.update(
            f"B:{sorted(graph.edges())}:{u}:{v}:{mode}:{support}:{bundle}:{coefficients};".encode()
        )

    actual = {
        "atlas_orders": [2, maximum_order],
        "unordered_marked_cells_including_fixtures": marked_cells,
        "bundle_cells": bundle_cells,
        "mode_counts": dict(sorted(mode_counts.items())),
        "terminal_counts": dict(sorted(terminal_counts.items())),
        "minimum_direct_binomial_coefficients": {
            f"g{index}": minima[index] for index in range(1, 9)
        },
        "all_direct_g1_through_g8_nonnegative": True,
    }
    for key, value in actual.items():
        assert expected[key] == value, (key, value, expected[key])
    assert set(mode_counts) == MODES
    assert set(terminal_counts) == {
        "connected_double_broom_plus_isolates",
        "disconnected_rooted_stars_plus_isolates",
    }
    actual.update({
        "terminal_direct_N5_checks": terminal_n5_checks,
        "actual_bundle_telescope_checks": telescope_checks,
        "independent_case_stream_sha256": digest.hexdigest().upper(),
    })
    return actual


def dependency_audit(target):
    audited = {}
    for name, spec in target["dependencies"].items():
        source_path, report_path = HERE / spec["source"], HERE / spec["report"]
        assert source_path.is_file() and report_path.is_file()
        assert sha256(source_path) == spec["source_sha256"], name
        assert sha256(report_path) == spec["report_sha256"], name
        report = json.loads(report_path.read_text(encoding="utf-8"))
        assert report["marker"] == spec["marker"], name
        assert report.get("source_sha256") == spec["source_sha256"], name
        audited[name] = {**spec, "scope_or_theorem": report.get("theorem") or report.get("theorem_audited")}

    required_without_g2 = {
        "bundle_identity", "g1_all_five_modes", "g3_all_five_modes_independent",
        "g4_universal", "g5_g8_universal", "all_forest_n4", "terminal_rank5_independent",
    }
    assert required_without_g2.issubset(audited)
    bundle = json.loads((HERE / target["dependencies"]["bundle_identity"]["report"]).read_text())
    assert bundle["rank"] == 5 and bundle["degree_in_M"] == 8
    assert bundle["identity"] == (
        "Gamma_M=N5((1+x)^M C+xD)-N5(C+xD)-"
        "sum_(t=0)^(M-1)N4((1+x)^t C)"
    )
    g1 = json.loads((HERE / target["dependencies"]["g1_all_five_modes"]["report"]).read_text())
    assert g1["coverage_count"] == 5 and not g1["missing_modes"] and g1["duplicate_modes"] == 0
    assert set(g1["canonical_modes"]) == set(MODE_MAP.values())
    g3 = json.loads((HERE / target["dependencies"]["g3_all_five_modes_independent"]["report"]).read_text())
    assert "every forest-realizable canonical" in g3["theorem_audited"]
    g4 = json.loads((HERE / target["dependencies"]["g4_universal"]["report"]).read_text())
    assert "every forest-realizable marked" in g4["theorem_audited"]
    top = json.loads((HERE / target["dependencies"]["g5_g8_universal"]["report"]).read_text())
    assert top["theorem"].endswith("g5,g6,g7,g8 are nonnegative.")
    n4 = json.loads((HERE / target["dependencies"]["all_forest_n4"]["report"]).read_text())
    assert n4["theorem"] == (
        "N4(B;u,v)>=0 for every finite forest B and every pair of distinct marked vertices u,v."
    )
    terminal = json.loads((HERE / target["dependencies"]["terminal_rank5_independent"]["report"]).read_text())
    assert terminal["theorem"] == (
        "N5(B;u,v)>=0 for every terminal marked forest B consisting of either two disjoint "
        "rooted stars or a connected double broom, together with arbitrarily many unmarked isolates."
    )
    if target["marker"] == TARGET_PASS_MARKER:
        assert "g2_all_five_modes" in audited
        g2_spec = target["dependencies"]["g2_all_five_modes"]
        assert g2_spec["source_sha256"] == EXPECTED_G2_SOURCE_SHA256
        assert g2_spec["report_sha256"] == EXPECTED_G2_REPORT_SHA256
        g2 = json.loads((HERE / g2_spec["report"]).read_text())
        assert g2["canonical_mode_count"] == 5
        assert g2["all_mode_markers_pass"] is True
        assert g2["coverage_is_disjoint_and_exhaustive"] is True
        assert {row["mode"] for row in g2["canonical_modes"]} == {
            "no_parent_k0", "singleton_ordinary", "singleton_endpoint_p_equals_u",
            "internal_spine_broom_endpoint", "internal_spine_broom_ordinary",
        }
    else:
        assert "g2_all_five_modes" not in audited
    return audited, bundle


def main():
    assert sha256(TARGET_SOURCE) == EXPECTED_TARGET_SOURCE_SHA256
    assert sha256(TARGET_REPORT) == EXPECTED_TARGET_REPORT_SHA256
    target = json.loads(TARGET_REPORT.read_text(encoding="utf-8"))
    assert target["marker"] in (TARGET_PENDING_MARKER, TARGET_PASS_MARKER)
    assert target["source_sha256"] == EXPECTED_TARGET_SOURCE_SHA256
    pending = target["marker"] == TARGET_PENDING_MARKER
    assert target["rooting_and_exhaustion"]["mode_map"] == MODE_MAP
    assert target["rooting_and_exhaustion"]["modes_pairwise_disjoint_and_exhaustive"] is True

    dependencies, bundle_report = dependency_audit(target)
    generic = generic_bundle_audit(bundle_report)
    replay = finite_replay(target["finite_replay"])

    terminal_exhaustion = {
        "no_mark_component": (
            "Any nontrivial unmarked tree has a non-root leaf whose unmarked parent is eligible; "
            "for K2 the root itself supports its child. Hence only isolates remain."
        ),
        "one_mark_component": (
            "Root at the mark. Any vertex beyond a direct marked leaf yields a deepest unmarked "
            "leaf with unmarked parent. Hence the component is a rooted star."
        ),
        "two_mark_component": (
            "Root at v. Off-spine depth at least two or a leaf at an internal spine vertex yields "
            "an eligible unmarked support. Only the u-v path and direct leaves at u or v remain: "
            "a connected double broom."
        ),
    }
    classifier_exhaustion = {
        "off_connector": (
            "Deepest eligibility forbids every nonbundle child. Parent none, marked, or ordinary "
            "gives respectively no-mark root, singleton endpoint, or singleton ordinary."
        ),
        "on_connector": (
            "The support is internal on the protected u-v path, with one child toward u. Deepest "
            "eligibility forces that subtree to be a path ending at u plus only direct leaves at u; "
            "the parent is endpoint v or ordinary."
        ),
        "pairwise_disjoint": (
            "On/off connector are disjoint; in the off-connector branch the three parent types are "
            "disjoint; on the connector endpoint versus ordinary parent is disjoint."
        ),
    }
    induction = {
        "measure": "number of unmarked vertices",
        "strict_decrease": (
            "The chosen bundle Z is nonempty and unmarked, so H=B-Z retains u,v and has exactly "
            "|Z| fewer unmarked vertices."
        ),
        "row_identity": (
            "Independent sets in B either omit s, giving (1+x)^M C, or contain s, giving xD; "
            "thus the four marked rows are (1+x)^M C+xD."
        ),
        "lower_payment_direction": (
            "Every C union tK1 is a forest retaining u,v, so the separately pinned all-forest N4 "
            "theorem makes every summed lower-rank payment nonnegative."
        ),
        "coefficient_direction": (
            "Each deepest cell maps to exactly one canonical mode. The five-mode g1/g2, five-mode "
            "g3, universal g4, and universal g5..g8 theorems give g_j>=0; binom(M,j)>=0 for M>=1."
        ),
        "base": "The exact terminal N5 theorem covers precisely the no-eligible-support forests.",
        "well_founded": True,
    }

    marker = PENDING_MARKER if pending else PASS_MARKER
    report = {
        "marker": marker,
        "target": {
            "marker": target["marker"],
            "source": TARGET_SOURCE.name,
            "source_sha256": EXPECTED_TARGET_SOURCE_SHA256,
            "report": TARGET_REPORT.name,
            "report_sha256": EXPECTED_TARGET_REPORT_SHA256,
        },
        "verdict": (
            "Independent structural/algebraic audit passes, but the target remains pending its g2 pin."
            if pending else "The all-forest N5 assembly passes a fail-closed independent audit."
        ),
        "generic_bundle_algebra": generic,
        "rooted_classifier_exhaustion": classifier_exhaustion,
        "terminal_exhaustion": terminal_exhaustion,
        "finite_replay": replay,
        "dependency_direction_audit": dependencies,
        "strong_induction_audit": induction,
        "open_obligations": (
            ["Freeze and pin the exact all-five-mode g2 source/report, then freeze the target PASS report."]
            if pending else []
        ),
        "status": "fail-closed pending audit" if pending else "independent exact all-order N5 audit",
        "scope_guard": (
            "This concerns only all-marked-forest N5. It does not establish higher-rank N_r, "
            "the final independence-sequence propagation, or Erdos Problem 993."
        ),
        "source_sha256": sha256(SOURCE),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": marker,
        "pending": pending,
        "generic_factor_matches": generic["exact_reported_factor_matches_g0_through_g8"],
        "finite_replay": replay,
        "open_obligations": report["open_obligations"],
        "source_sha256": report["source_sha256"],
        "report_sha256": hashlib.sha256(raw.encode()).hexdigest().upper(),
    }, indent=2, sort_keys=True))
    print(marker)


if __name__ == "__main__":
    main()
