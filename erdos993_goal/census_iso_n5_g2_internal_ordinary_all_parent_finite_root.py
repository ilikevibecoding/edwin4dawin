#!/usr/bin/env python3
"""Exact finite parent census for every internal-ordinary g2 Newton form.

Every unlabeled forest F of order 2 through 12 is generated exactly once as
a nondecreasing multiset of unlabeled trees.  For every ordered pair of
distinct marked vertices (p,v), this program computes the four parent rows

    E=I(F), P=I(F-p), V=I(F-v), W=I(F-{p,v})

by literal independent-set deletion recursion and evaluates all 42 small
ell=1..7 forms and all 21 stable ell=8+h forms exactly.  Together with an
N>=13 theorem this is the finite side of a gapless parent-order join.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import networkx as nx
import sympy as sp

from derive_iso_n5_g1_internal_endpoint_broom_parameters_root import tensor_binomial
from derive_iso_n5_g1_internal_ordinary_small_broom_parameters_root import child_rows
from derive_iso_n5_g2_internal_ordinary_broom_factor_rank5_g2_alt import ordinary_expression
from derive_iso_n5_g2_internal_ordinary_broom_parameters_rank5_g2_alt import stable_forms
from probe_iso_leaf_cross_remainder_root import poly_forest
from prove_iso_n5_c5_disconnected_nonadjacent_g1_nonadjacent import forest_graphs


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g2_internal_ordinary_all_parent_finite_n2_12_exact_root_20260830.json"
MARKER = "PASS_EXACT_ISO_N5_G2_INTERNAL_ORDINARY_ALL_PARENT_FINITE_N2_12_ROOT"
MINIMUM_ORDER = 2
MAXIMUM_ORDER = 12

DEPENDENCIES = {
    "derive_iso_n5_g1_internal_endpoint_broom_parameters_root.py":
        "2582BFF4BBA40A2B11D27AB5A3256D291271EB45BF61827D60EC5ADB220B2879",
    "derive_iso_n5_g1_internal_ordinary_small_broom_parameters_root.py":
        "8ED18D7C3116B83527A08471B0820319FFBB134E4FDA086070AB760F1F122E6B",
    "derive_iso_n5_g2_internal_ordinary_broom_factor_rank5_g2_alt.py":
        "4618E651DBFF34BB519BF5CB3454523A82341F278170F6C100222C95AF3FA5F0",
    "derive_iso_n5_g2_internal_ordinary_broom_parameters_rank5_g2_alt.py":
        "48D1D3E396B8C84731EA0E46E3D8D104F43EEF7130F426AB73286935B4CC319B",
    "probe_iso_leaf_cross_remainder_root.py":
        "A9C643C3A223E004365E5013A2433517BC60073D1B230D92477FFDC7E3B6A5F1",
    "prove_iso_n5_c5_disconnected_nonadjacent_g1_nonadjacent.py":
        "DD1112EC4A72A9DA18979084D03462AC0073E8C86927E3306142171E39134A05",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def padded(row, maximum=6):
    return tuple(int(row[index]) if index < len(row) else 0 for index in range(maximum + 1))


def all_forms():
    expression, rows = ordinary_expression()
    k = sp.symbols("k", integer=True, nonnegative=True)
    labeled = []
    for ell in range(1, 8):
        xrow, urow, yrow, zrow = child_rows(ell, k)
        rules = {}
        for rank in range(1, 7):
            rules.update({
                rows["X"][rank]: xrow[rank], rows["U"][rank]: urow[rank],
                rows["Y"][rank]: yrow[rank], rows["Z"][rank]: zrow[rank],
            })
        degrees, coefficients = tensor_binomial(sp.expand(expression.subs(rules)), (k,))
        assert degrees == (5,)
        nonzero = [(index[0], form) for index, form in sorted(coefficients.items()) if form != 0]
        assert len(nonzero) == 6
        labeled.extend((f"small_ell{ell}_k{index}", form) for index, form in nonzero)
    stable_degrees, stable_coefficients, stable_rows = stable_forms()
    assert stable_degrees == (5, 5)
    assert all(stable_rows[name] == rows[name] for name in rows)
    stable_nonzero = [
        (index, form) for index, form in sorted(stable_coefficients.items()) if form != 0
    ]
    assert len(stable_nonzero) == 21
    labeled.extend(
        (f"stable_h{index[0]}_k{index[1]}", form)
        for index, form in stable_nonzero
    )
    variables = tuple(
        symbol for name in ("E", "P", "V", "W") for symbol in rows[name][1:7]
    )
    for _label, form in labeled:
        polynomial = sp.Poly(form, *variables)
        assert all(coefficient.is_Integer for coefficient in polynomial.coeffs())
    evaluator = sp.lambdify(variables, [form for _label, form in labeled], modules="math")
    return labeled, evaluator


def main() -> None:
    actual_dependencies = {name: sha256(HERE / name) for name in DEPENDENCIES}
    assert actual_dependencies == DEPENDENCIES
    labeled, evaluator = all_forms()
    labels = [label for label, _form in labeled]
    assert len(labels) == 63 and len(set(labels)) == 63
    geometries = ("adjacent", "connected_nonadjacent", "disconnected")
    minima = {geometry: {label: None for label in labels} for geometry in geometries}
    witnesses = {geometry: {} for geometry in geometries}
    digest = hashlib.sha256()
    first_negatives = []
    per_order = {}
    total_forests = total_pairs = total_checks = total_negatives = 0

    for order in range(MINIMUM_ORDER, MAXIMUM_ORDER + 1):
        local_forests = local_pairs = local_negatives = 0
        for graph in forest_graphs(order):
            local_forests += 1
            nodes = tuple(sorted(graph.nodes()))
            erow = padded(poly_forest(graph))
            single_rows = {}
            for mark in nodes:
                deleted = graph.copy()
                deleted.remove_node(mark)
                single_rows[mark] = padded(poly_forest(deleted))
            double_rows = {}
            for first_index, pmark in enumerate(nodes):
                for vmark in nodes[first_index + 1:]:
                    deleted = graph.copy()
                    deleted.remove_nodes_from((pmark, vmark))
                    double_rows[(pmark, vmark)] = padded(poly_forest(deleted))
            component = {
                vertex: component_index
                for component_index, vertices in enumerate(nx.connected_components(graph))
                for vertex in vertices
            }
            graph6 = nx.to_graph6_bytes(graph, header=False).decode().strip()
            for pmark in nodes:
                for vmark in nodes:
                    if pmark == vmark:
                        continue
                    pair_key = tuple(sorted((pmark, vmark)))
                    prows = (erow, single_rows[pmark], single_rows[vmark], double_rows[pair_key])
                    arguments = tuple(value for row in prows for value in row[1:7])
                    raw_values = evaluator(*arguments)
                    values = tuple(int(value) for value in raw_values)
                    assert all(value == raw for value, raw in zip(values, raw_values))
                    geometry = (
                        "adjacent" if graph.has_edge(pmark, vmark) else
                        "connected_nonadjacent" if component[pmark] == component[vmark] else
                        "disconnected"
                    )
                    digest.update(
                        f"{order}:{graph6}:{pmark}:{vmark}:".encode()
                        + ",".join(map(str, values)).encode() + b";"
                    )
                    for label, value in zip(labels, values):
                        current = minima[geometry][label]
                        if current is None or value < current:
                            minima[geometry][label] = value
                            witnesses[geometry][label] = {
                                "value": value,
                                "order": order,
                                "graph6": graph6,
                                "marks_p_v": [pmark, vmark],
                            }
                        if value < 0:
                            local_negatives += 1
                            if len(first_negatives) < 64:
                                first_negatives.append({
                                    "form": label,
                                    "geometry": geometry,
                                    "value": value,
                                    "order": order,
                                    "graph6": graph6,
                                    "marks_p_v": [pmark, vmark],
                                })
                    local_pairs += 1
        local_checks = local_pairs * len(labels)
        total_forests += local_forests
        total_pairs += local_pairs
        total_checks += local_checks
        total_negatives += local_negatives
        per_order[str(order)] = {
            "unlabeled_forests": local_forests,
            "ordered_parent_pairs": local_pairs,
            "exact_form_checks": local_checks,
            "negative_form_values": local_negatives,
        }
        print(
            "FINITE_G2_INTERNAL_ORDINARY_ALL",
            order,
            local_forests,
            local_pairs,
            local_checks,
            local_negatives,
            flush=True,
        )

    assert total_negatives == 0 and not first_negatives
    assert all(value is not None for values in minima.values() for value in values.values())
    report = {
        "marker": MARKER,
        "theorem": (
            "All 42 small and all 21 stable internal-spine ordinary-parent "
            "g2 Newton forms are nonnegative on every forest parent of order "
            "2 through 12 and every ordered pair of distinct marks."
        ),
        "orders": [MINIMUM_ORDER, MAXIMUM_ORDER],
        "small_forms": 42,
        "stable_forms": 21,
        "parent_forms": len(labels),
        "unlabeled_forests": total_forests,
        "ordered_parent_pairs": total_pairs,
        "exact_form_checks": total_checks,
        "negative_values": total_negatives,
        "first_negatives": first_negatives,
        "minima": minima,
        "minimizing_witnesses": witnesses,
        "per_order": per_order,
        "ordered_stream_sha256": digest.hexdigest().upper(),
        "enumeration": (
            "Every unlabeled forest exactly once as a nondecreasing multiset "
            "of NetworkX nonisomorphic free trees; every ordered distinct "
            "mark pair; literal induced-deletion independence rows."
        ),
        "dependencies_sha256": DEPENDENCIES,
        "status": "exact exhaustive finite theorem; independent replay remains separate",
        "scope": (
            "Only internal-spine ordinary-parent g2 parent orders 2..12. "
            "Parent orders at least 13, other modes/gates, and Erdos Problem "
            "993 remain separate."
        ),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "unlabeled_forests": total_forests,
        "ordered_parent_pairs": total_pairs,
        "exact_form_checks": total_checks,
        "negative_values": total_negatives,
        "ordered_stream_sha256": report["ordered_stream_sha256"],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
