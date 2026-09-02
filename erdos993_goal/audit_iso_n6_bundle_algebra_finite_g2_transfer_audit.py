#!/usr/bin/env python3
"""Independent exact audit of the rank-six bundle algebra and finite probe.

The symbolic audit reconstructs Gamma_M at M=0,...,10 and takes literal
forward differences; it does not use the producer's Bernoulli summation or
binomial converter.  The finite audit independently rebuilds the rooted
classifier and rank-six graph functional.  Passing this audit is diagnostic
only and is not a universal coefficient-sign or all-N6 theorem.
"""

from __future__ import annotations

import hashlib
import itertools
import json
from collections import Counter
from math import comb
from pathlib import Path

import networkx as nx
import sympy as sp

from audit_iso_all_forest_n5_bundle_induction_g2_transfer_audit import (
    add_integer_rows,
    classify_cell,
    deepest_cell,
    fixtures,
    terminal_family,
)


HERE = Path(__file__).resolve().parent
SOURCE = Path(__file__).resolve()
ALGEBRA_SOURCE = HERE / "derive_iso_n6_bundle_polynomial_root.py"
ALGEBRA_REPORT = HERE / "iso_n6_whole_bundle_binomial_symbolic_root_20260830.json"
FINITE_SOURCE = HERE / "probe_iso_n6_bundle_finite_root.py"
FINITE_REPORT = HERE / "iso_n6_bundle_finite_probe_root_20260830.json"
CLASSIFIER_AUDIT_SOURCE = HERE / "audit_iso_all_forest_n5_bundle_induction_g2_transfer_audit.py"
OUTPUT = HERE / "iso_n6_bundle_algebra_finite_independent_audit_exact_g2_transfer_audit_20260830.json"
MARKER = "PASS_INDEPENDENT_DIAGNOSTIC_EXACT_ISO_N6_BUNDLE_ALGEBRA_FINITE_G2_TRANSFER_AUDIT"

EXPECTED_HASHES = {
    "algebra_source": "BB229E377F89B59767D402609FC11B2B9EE0A78D97090DA33316D93C7A3C8444",
    "algebra_report": "F0E06EF479C77D1990ECBC180824107A83D88A03FDE5364FFC8BBA086AA4F780",
    "finite_source": "042119774A5F343A60924D9E46A5F5C7B07722AB355733179F16F23C4DEA2DFC",
    "finite_report": "8E2E59B418ADF242A8A884C1E3DB3A0EC323AABC2406755AA098A492B8810216",
    "classifier_audit_source": "FBDAFA2FA82D18546E999AEADDA1756182FC87249F73075F43B54A5959F5B9D8",
}

MODES = {
    "no_mark_root_k0", "singleton_ordinary", "singleton_endpoint",
    "internal_spine_ordinary", "internal_spine_endpoint",
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
    coefficients = []
    while row:
        coefficients.append(sp.expand(row[0]))
        row = [sp.expand(row[index + 1] - row[index]) for index in range(len(row) - 1)]
    return coefficients


def symbolic_audit(producer):
    crows = tuple(tuple(sp.symbols(f"c{name}0:8")) for name in "EUVW")
    drows = tuple(tuple(sp.symbols(f"d{name}0:8")) for name in "EUVW")
    base = add_xd(crows, drows)
    gamma = []
    for amount in range(11):
        bundled = add_xd(isolate_multiply(crows, amount), drows)
        lower = sum(nested(isolate_multiply(crows, offset), 5) for offset in range(amount))
        gamma.append(sp.expand(nested(bundled, 6) - nested(base, 6) - lower))
    coefficients = forward_differences(gamma)
    assert len(coefficients) == 11 and coefficients[0] == 0

    symbols = {
        str(symbol): symbol
        for expression in coefficients for symbol in expression.free_symbols
    }
    summaries = []
    for index, (coefficient, expected) in enumerate(zip(coefficients, producer["binomial_coefficients"])):
        assert expected["binomial_rank"] == index
        recorded = sp.sympify(expected["factor"], locals=symbols)
        assert sp.expand(coefficient - recorded) == 0
        polynomial = sp.Poly(coefficient, *sorted(coefficient.free_symbols, key=str)) if coefficient else None
        monomials = len(polynomial.terms()) if polynomial is not None else 0
        negatives = (
            sum(value.is_negative is True for value in polynomial.coeffs())
            if polynomial is not None else 0
        )
        assert monomials == expected["monomials"]
        assert negatives == expected["negative_scalar_coefficients"]
        summaries.append({
            "binomial_rank": index,
            "monomials": monomials,
            "negative_scalar_coefficients": negatives,
            "factor_sha256": hashlib.sha256(str(sp.factor(coefficient)).encode()).hexdigest().upper(),
        })

    # Direct Newton interpolation at all eleven defining nodes.
    m = sp.symbols("M", integer=True, nonnegative=True)
    reconstruction = sum(coefficients[index] * sp.binomial(m, index) for index in range(11))
    for amount, value in enumerate(gamma):
        assert sp.expand(reconstruction.subs(m, amount) - value) == 0

    constants = {row[0]: 1 for row in crows + drows}
    assert sp.expand(coefficients[10].subs(constants)) == 0
    stream = "".join(sp.srepr(value) for value in coefficients)
    return {
        "direct_gamma_nodes": 11,
        "literal_forward_differences": 11,
        "exact_factor_matches_g0_through_g10": 11,
        "degree_in_M": 10,
        "newton_inversion_nodes": 11,
        "g10_on_independence_rows": "0",
        "coefficient_expression_stream_sha256": hashlib.sha256(stream.encode()).hexdigest().upper(),
        "summaries": summaries,
    }


def convolve_integer_rows(left, right, maximum=7):
    return tuple(
        sum(at(left, index) * at(right, rank - index) for index in range(rank + 1))
        for rank in range(maximum + 1)
    )


def independence_row(graph, maximum=7):
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
    rows = []
    for removed in ((), (u,), (v,), (u, v)):
        reduced = graph.copy()
        reduced.remove_nodes_from(removed)
        rows.append(independence_row(reduced))
    return tuple(rows)


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


def direct_coefficients(base, support, u, v):
    cgraph = base.copy()
    cgraph.remove_node(support)
    base_n6 = rank_value(base, u, v, 6)
    gamma = []
    for amount in range(11):
        lower = sum(rank_value(add_isolates(cgraph, offset), u, v, 5) for offset in range(amount))
        gamma.append(rank_value(add_leaves(base, support, amount), u, v, 6) - base_n6 - lower)
    coefficients = [int(value) for value in forward_differences(gamma)]
    assert len(coefficients) == 11 and coefficients[0] == 0
    return coefficients, gamma


def graph6(graph):
    return nx.to_graph6_bytes(nx.convert_node_labels_to_integers(graph), header=False).decode().strip()


def witness(graph, u, v, cell, mode, index, value):
    support, bundle, _parent, _children = cell
    return {
        "value": value,
        "order": len(graph),
        "mode": mode,
        "binomial_rank": index,
        "u": int(u),
        "v": int(v),
        "support": int(support),
        "bundle_size": len(bundle),
        "graph6": graph6(graph),
    }


def finite_audit(producer):
    cases = []
    for graph0 in nx.graph_atlas_g():
        if 2 <= len(graph0) <= 7 and nx.is_forest(graph0):
            graph = nx.convert_node_labels_to_integers(graph0)
            cases.extend((graph, u, v, None) for u, v in itertools.combinations(graph, 2))
    cases.extend(fixtures())

    mode_counts, terminal_counts = Counter(), Counter()
    mode_minima = {mode: {index: None for index in range(1, 11)} for mode in MODES}
    global_minima = {index: None for index in range(1, 11)}
    negative_witnesses = []
    terminal_minimum = None
    marked_cells = bundle_cells = telescope_checks = 0
    digest = hashlib.sha256()

    for graph, u, v, expected_mode in cases:
        marked_cells += 1
        cell = deepest_cell(graph, u, v)
        if cell is None:
            assert expected_mode is None
            family = terminal_family(graph, u, v)
            terminal_counts[family] += 1
            value = rank_value(graph, u, v, 6)
            candidate = {
                "value": value,
                "order": len(graph),
                "terminal_class": family,
                "u": int(u),
                "v": int(v),
                "graph6": graph6(graph),
            }
            if terminal_minimum is None or value < terminal_minimum["value"]:
                terminal_minimum = candidate
            digest.update(f"T:{candidate};".encode())
            continue

        mode = classify_cell(graph, u, v, cell)
        if expected_mode is not None:
            assert mode == expected_mode
        mode_counts[mode] += 1
        bundle_cells += 1
        support, bundle, _parent, _children = cell
        base = graph.copy()
        base.remove_nodes_from(bundle)
        coefficients, gamma = direct_coefficients(base, support, u, v)
        for index in range(1, 11):
            value = coefficients[index]
            candidate = witness(graph, u, v, cell, mode, index, value)
            current = mode_minima[mode][index]
            if current is None or value < current["value"]:
                mode_minima[mode][index] = candidate
            current = global_minima[index]
            if current is None or value < current["value"]:
                global_minima[index] = candidate
            if value < 0:
                negative_witnesses.append(candidate)

        actual = len(bundle)
        reconstructed = sum(coefficients[index] * comb(actual, index) for index in range(1, 11))
        assert gamma[actual] == reconstructed
        telescope_checks += 1
        digest.update(f"B:{graph6(graph)}:{u}:{v}:{mode}:{coefficients};".encode())

    actual_fields = {
        "marked_cells_including_fixtures": marked_cells,
        "bundle_cells": bundle_cells,
        "mode_counts": dict(sorted(mode_counts.items())),
        "terminal_counts": dict(sorted(terminal_counts.items())),
        "terminal_minimum": terminal_minimum,
        "global_minima": {f"g{index}": global_minima[index] for index in range(1, 11)},
        "mode_minima": {
            mode: {f"g{index}": mode_minima[mode][index] for index in range(1, 11)}
            for mode in sorted(MODES)
        },
        "negative_count": len(negative_witnesses),
        "negative_witnesses": negative_witnesses[:100],
    }
    for key, value in actual_fields.items():
        assert value == producer[key], key
    assert marked_cells == 1229 and bundle_cells == 967
    assert len(negative_witnesses) == 0
    assert set(mode_counts) == MODES
    return {
        **actual_fields,
        "actual_bundle_telescope_checks": telescope_checks,
        "independent_case_stream_sha256": digest.hexdigest().upper(),
    }


def main():
    actual_hashes = {
        "algebra_source": sha256(ALGEBRA_SOURCE),
        "algebra_report": sha256(ALGEBRA_REPORT),
        "finite_source": sha256(FINITE_SOURCE),
        "finite_report": sha256(FINITE_REPORT),
        "classifier_audit_source": sha256(CLASSIFIER_AUDIT_SOURCE),
    }
    assert actual_hashes == EXPECTED_HASHES
    algebra = json.loads(ALGEBRA_REPORT.read_text(encoding="utf-8"))
    finite = json.loads(FINITE_REPORT.read_text(encoding="utf-8"))
    assert algebra["marker"] == "DERIVED_EXACT_ISO_N6_BUNDLE_BINOMIAL_POLYNOMIAL_ROOT"
    assert algebra["rank"] == 6 and algebra["degree_in_M"] == 10
    assert finite["marker"] == "PROBE_EXACT_ISO_N6_BUNDLE_FINITE_ROOT"
    assert finite["rank"] == 6

    symbolic = symbolic_audit(algebra)
    replay = finite_audit(finite)
    report = {
        "marker": MARKER,
        "algebra_audit": symbolic,
        "finite_audit": replay,
        "dependencies_sha256": EXPECTED_HASHES,
        "verdict": (
            "The exact rank-six Gamma/binomial algebra and the 1,229-cell finite "
            "diagnostic replay both pass independent reconstruction."
        ),
        "scope_guard": (
            "This is an algebra audit plus finite diagnostic only. Zero finite negatives "
            "does not prove universal g1..g10 signs, a rank-six bundle lemma, all-N6, "
            "higher ranks, or Erdos Problem 993."
        ),
        "source_sha256": sha256(SOURCE),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "factor_matches": symbolic["exact_factor_matches_g0_through_g10"],
        "marked_cells": replay["marked_cells_including_fixtures"],
        "bundle_cells": replay["bundle_cells"],
        "negative_count": replay["negative_count"],
        "global_minima": {key: value["value"] for key, value in replay["global_minima"].items()},
        "source_sha256": report["source_sha256"],
        "report_sha256": hashlib.sha256(raw.encode()).hexdigest().upper(),
    }, indent=2, sort_keys=True))
    print(MARKER)


if __name__ == "__main__":
    main()
