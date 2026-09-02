#!/usr/bin/env python3
"""Independent exact audit of rank-seven bundle algebra and finite evidence.

Gamma is sampled directly at M=0,...,12 and converted by literal forward
differences, independently of the producer's symbolic summation.  The finite
probe is rebuilt from independent tree DP and rooted classification helpers.
The result is diagnostic only: it asserts no universal sign or all-N7 theorem.
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

from audit_iso_n6_bundle_algebra_finite_g2_transfer_audit import (
    add_integer_rows,
    add_isolates,
    add_leaves,
    add_xd,
    at,
    classify_cell,
    convolve_integer_rows,
    deepest_cell,
    fixtures,
    forward_differences,
    graph6,
    isolate_multiply,
    nested,
    sha256,
    terminal_family,
    witness,
)


HERE = Path(__file__).resolve().parent
SOURCE = Path(__file__).resolve()
ALGEBRA_SOURCE = HERE / "derive_iso_n7_bundle_polynomial_root.py"
ALGEBRA_REPORT = HERE / "iso_n7_whole_bundle_binomial_symbolic_root_20260830.json"
FINITE_SOURCE = HERE / "probe_iso_n7_bundle_finite_root.py"
FINITE_REPORT = HERE / "iso_n7_bundle_finite_probe_root_20260830.json"
INDEPENDENT_HELPER = HERE / "audit_iso_n6_bundle_algebra_finite_g2_transfer_audit.py"
OUTPUT = HERE / "iso_n7_bundle_algebra_finite_independent_audit_exact_g2_transfer_audit_20260830.json"
MARKER = "PASS_INDEPENDENT_DIAGNOSTIC_EXACT_ISO_N7_BUNDLE_ALGEBRA_FINITE_G2_TRANSFER_AUDIT"
EXPECTED_HASHES = {
    "algebra_source": "65501B253483CBAB80DBB442285DCD21EEF80372601864C8E3C1056222B2905B",
    "algebra_report": "266694256F63EA12F512F56CF765B56B56B71BFB1618599CC36CA2BBE4375D8C",
    "finite_source": "4CE45144F9A1FA1B749FA49C1FB51AAB5C61A5F98A27FA3604DE247F80A726D8",
    "finite_report": "EC5A384BF8F2F1384E8D55EBE402581353DB91D23FD7500476A2B75359A49F50",
    "independent_helper": "443271843C72AE45D7CB3594664034DE64507D500017AA958EEDE6AD03F792B2",
}
MODES = {
    "no_mark_root_k0", "singleton_ordinary", "singleton_endpoint",
    "internal_spine_ordinary", "internal_spine_endpoint",
}


def symbolic_audit(producer):
    crows = tuple(tuple(sp.symbols(f"c{name}0:9")) for name in "EUVW")
    drows = tuple(tuple(sp.symbols(f"d{name}0:9")) for name in "EUVW")
    base = add_xd(crows, drows)
    gamma = []
    for amount in range(13):
        bundled = add_xd(isolate_multiply(crows, amount, 8), drows)
        lower = sum(nested(isolate_multiply(crows, offset, 8), 6) for offset in range(amount))
        gamma.append(sp.expand(nested(bundled, 7) - nested(base, 7) - lower))
    coefficients = forward_differences(gamma)
    assert len(coefficients) == 13 and coefficients[0] == 0
    symbols = {
        str(symbol): symbol
        for expression in coefficients for symbol in expression.free_symbols
    }
    summaries = []
    for index, (coefficient, expected) in enumerate(zip(coefficients, producer["binomial_coefficients"])):
        assert expected["binomial_rank"] == index
        assert sp.expand(coefficient - sp.sympify(expected["factor"], locals=symbols)) == 0
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
    m = sp.symbols("M", integer=True, nonnegative=True)
    reconstruction = sum(coefficients[index] * sp.binomial(m, index) for index in range(13))
    for amount, value in enumerate(gamma):
        assert sp.expand(reconstruction.subs(m, amount) - value) == 0
    constants = {row[0]: 1 for row in crows + drows}
    assert sp.expand(coefficients[12].subs(constants)) == 0
    stream = "".join(sp.srepr(value) for value in coefficients)
    return {
        "direct_gamma_nodes": 13,
        "literal_forward_differences": 13,
        "exact_factor_matches_g0_through_g12": 13,
        "degree_in_M": 12,
        "newton_inversion_nodes": 13,
        "g12_on_independence_rows": "0",
        "coefficient_expression_stream_sha256": hashlib.sha256(stream.encode()).hexdigest().upper(),
        "summaries": summaries,
    }


def independence_row(graph, maximum=8):
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


def direct_coefficients(base, support, u, v):
    cgraph = base.copy()
    cgraph.remove_node(support)
    base_n7 = rank_value(base, u, v, 7)
    gamma = []
    for amount in range(13):
        lower = sum(rank_value(add_isolates(cgraph, offset), u, v, 6) for offset in range(amount))
        gamma.append(rank_value(add_leaves(base, support, amount), u, v, 7) - base_n7 - lower)
    coefficients = [int(value) for value in forward_differences(gamma)]
    assert len(coefficients) == 13 and coefficients[0] == 0
    return coefficients, gamma


def finite_audit(producer):
    cases = []
    for graph0 in nx.graph_atlas_g():
        if 2 <= len(graph0) <= 7 and nx.is_forest(graph0):
            graph = nx.convert_node_labels_to_integers(graph0)
            cases.extend((graph, u, v, None) for u, v in itertools.combinations(graph, 2))
    cases.extend(fixtures())
    mode_counts, terminal_counts = Counter(), Counter()
    minima = {index: None for index in range(1, 13)}
    mode_minima = {mode: {index: None for index in range(1, 13)} for mode in MODES}
    negatives = []
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
            value = rank_value(graph, u, v, 7)
            candidate = {
                "value": value, "order": len(graph), "terminal_class": family,
                "u": int(u), "v": int(v), "graph6": graph6(graph),
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
        for index in range(1, 13):
            value = coefficients[index]
            item = witness(graph, u, v, cell, mode, index, value)
            if minima[index] is None or value < minima[index]["value"]:
                minima[index] = item
            if mode_minima[mode][index] is None or value < mode_minima[mode][index]["value"]:
                mode_minima[mode][index] = item
            if value < 0:
                negatives.append(item)
        actual = len(bundle)
        assert gamma[actual] == sum(
            coefficients[index] * comb(actual, index) for index in range(1, 13)
        )
        telescope_checks += 1
        digest.update(f"B:{graph6(graph)}:{u}:{v}:{mode}:{coefficients};".encode())

    actual_fields = {
        "marked_cells_including_fixtures": marked_cells,
        "bundle_cells": bundle_cells,
        "mode_counts": dict(sorted(mode_counts.items())),
        "terminal_counts": dict(sorted(terminal_counts.items())),
        "terminal_minimum": terminal_minimum,
        "global_minima": {f"g{index}": minima[index] for index in range(1, 13)},
        "mode_minima": {
            mode: {f"g{index}": mode_minima[mode][index] for index in range(1, 13)}
            for mode in sorted(MODES)
        },
        "negative_count": len(negatives),
        "negative_witnesses": negatives[:100],
    }
    for key, value in actual_fields.items():
        assert value == producer[key], key
    assert marked_cells == 1229 and bundle_cells == 967 and not negatives
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
        "independent_helper": sha256(INDEPENDENT_HELPER),
    }
    assert actual_hashes == EXPECTED_HASHES
    algebra = json.loads(ALGEBRA_REPORT.read_text(encoding="utf-8"))
    finite = json.loads(FINITE_REPORT.read_text(encoding="utf-8"))
    assert algebra["marker"] == "DERIVED_EXACT_ISO_N7_BUNDLE_BINOMIAL_POLYNOMIAL_ROOT"
    assert algebra["rank"] == 7 and algebra["degree_in_M"] == 12
    assert finite["marker"] == "PROBE_EXACT_ISO_N7_BUNDLE_FINITE_ROOT" and finite["rank"] == 7
    symbolic = symbolic_audit(algebra)
    replay = finite_audit(finite)
    report = {
        "marker": MARKER,
        "algebra_audit": symbolic,
        "finite_audit": replay,
        "dependencies_sha256": EXPECTED_HASHES,
        "verdict": (
            "The exact rank-seven Gamma/binomial algebra and the 1,229-cell finite "
            "diagnostic replay both pass independent reconstruction."
        ),
        "scope_guard": (
            "This is an algebra audit plus finite diagnostic only. Zero finite negatives "
            "does not prove universal g1..g12 signs, a rank-seven bundle lemma, all-N7, "
            "higher ranks, or Erdos Problem 993."
        ),
        "source_sha256": sha256(SOURCE),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "factor_matches": symbolic["exact_factor_matches_g0_through_g12"],
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
