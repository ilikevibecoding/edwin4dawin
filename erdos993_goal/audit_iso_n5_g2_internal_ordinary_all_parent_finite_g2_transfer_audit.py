#!/usr/bin/env python3
"""Independent exact finite audit of the internal-ordinary rank-five g2 forms.

This file deliberately does not import the producer or any of its algebraic
form builders.  It reconstructs the rank-five Gamma functional, the literal
one-ended-broom rows, both Newton tables, the unlabeled-forest enumeration,
and the independence polynomials.  The producer JSON is read only after the
independent stream has been computed, for a fail-closed byte/hash comparison.
"""

from __future__ import annotations

import hashlib
import itertools
import json
from math import comb, factorial
from pathlib import Path

import networkx as nx
import sympy as sp


HERE = Path(__file__).resolve().parent
PRODUCER_SOURCE = HERE / "census_iso_n5_g2_internal_ordinary_all_parent_finite_root.py"
PRODUCER_REPORT = HERE / "iso_n5_g2_internal_ordinary_all_parent_finite_n2_12_exact_root_20260830.json"
OUTPUT = HERE / "iso_n5_g2_internal_ordinary_all_parent_finite_independent_audit_exact_g2_transfer_audit_20260830.json"
MARKER = "PASS_INDEPENDENT_EXACT_ISO_N5_G2_INTERNAL_ORDINARY_ALL_PARENT_FINITE_G2_TRANSFER_AUDIT"
PRODUCER_SOURCE_SHA256 = "92F83A604B90B4B76B830FC20A945A2D336C148E4136620B2886AB57E0D50FA6"
PRODUCER_REPORT_SHA256 = "F566E1F1631428CEEDB0F0D5A4B41BB674A1435EBE43506191A933333A02C99C"
PRODUCER_MARKER = "PASS_EXACT_ISO_N5_G2_INTERNAL_ORDINARY_ALL_PARENT_FINITE_N2_12_ROOT"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def at(row, rank):
    return row[rank] if 0 <= rank < len(row) else sp.Integer(0)


def add(left, right, maximum=6):
    return tuple(sp.expand(at(left, rank) + at(right, rank)) for rank in range(maximum + 1))


def convolve(left, right, maximum=6):
    return tuple(
        sp.expand(sum(at(left, index) * at(right, rank - index) for index in range(rank + 1)))
        for rank in range(maximum + 1)
    )


def shift(row, amount=1, maximum=6):
    return tuple(at(row, rank - amount) for rank in range(maximum + 1))


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


def reconstruct_raw_g2():
    """Reconstruct Gamma_2-2 Gamma_1 directly from the nested functional."""
    crows = tuple(tuple(sp.symbols(f"c{name}0:7")) for name in "EUVW")
    drows = tuple(tuple(sp.symbols(f"d{name}0:7")) for name in "EUVW")

    def gamma(amount):
        shifted = add_xd(isolate_multiply(crows, amount), drows)
        base = add_xd(crows, drows)
        lower = sum(nested(isolate_multiply(crows, offset, 5), 4)
                    for offset in range(amount))
        return sp.expand(nested(shifted, 5) - nested(base, 5) - lower)

    g1 = gamma(1)
    g2 = sp.expand(gamma(2) - 2 * g1)
    variables = tuple(sorted(g2.free_symbols, key=str))
    assert len(sp.Poly(g1, *tuple(sorted(g1.free_symbols, key=str))).terms()) == 54
    assert len(sp.Poly(g2, *variables).terms()) == 70
    return crows, drows, g2


def path_row(order, maximum=6):
    """Literal I(P_order), with P_0=P_-1=1 and P_-2=0."""
    if order == -2:
        return (sp.Integer(0),) * (maximum + 1)
    if order <= 0:
        return (sp.Integer(1),) + (sp.Integer(0),) * maximum
    return tuple(
        sp.Integer(comb(order - rank + 1, rank))
        if order - rank + 1 >= rank else sp.Integer(0)
        for rank in range(maximum + 1)
    )


def child_rows(length, collisions):
    leaves = tuple(
        sp.Integer(comb(collisions, rank)) if rank <= collisions else sp.Integer(0)
        for rank in range(7)
    )
    p1, p2, p3 = path_row(length - 1), path_row(length - 2), path_row(length - 3)
    xrow = add(convolve(leaves, p1), shift(p2))
    urow = convolve(leaves, p1)
    yrow = add(convolve(leaves, p2), shift(p3))
    zrow = convolve(leaves, p2)
    return xrow, urow, yrow, zrow


def derive_parent_forms():
    """Derive the 42 small and 21 stable forms by literal finite differences."""
    generic_c, generic_d, raw_g2 = reconstruct_raw_g2()
    parent = {
        name: (sp.Integer(1),) + tuple(sp.symbols(f"{name.lower()}1:7"))
        for name in ("E", "P", "V", "W")
    }
    variables = tuple(symbol for name in ("E", "P", "V", "W") for symbol in parent[name][1:7])
    value_cache = {}

    def value(length, collisions):
        key = (length, collisions)
        if key in value_cache:
            return value_cache[key]
        xrow, urow, yrow, zrow = child_rows(length, collisions)
        crows = (
            convolve(xrow, parent["E"]), convolve(urow, parent["E"]),
            convolve(xrow, parent["V"]), convolve(urow, parent["V"]),
        )
        drows = (
            convolve(yrow, parent["P"]), convolve(zrow, parent["P"]),
            convolve(yrow, parent["W"]), convolve(zrow, parent["W"]),
        )
        rules = {
            symbol: actual
            for generic_row, actual_row in zip(generic_c + generic_d, crows + drows)
            for symbol, actual in zip(generic_row, actual_row)
        }
        result = sp.expand(raw_g2.subs(rules))
        value_cache[key] = result
        return result

    def difference(length0, hindex, kindex):
        result = sp.Integer(0)
        for hoffset in range(hindex + 1):
            hweight = (-1) ** (hindex - hoffset) * comb(hindex, hoffset)
            for koffset in range(kindex + 1):
                kweight = (-1) ** (kindex - koffset) * comb(kindex, koffset)
                result += hweight * kweight * value(length0 + hoffset, koffset)
        return sp.expand(result)

    labeled = []
    for length in range(1, 8):
        forms = [(index, difference(length, 0, index)) for index in range(6)]
        assert all(form != 0 for _index, form in forms)
        labeled.extend((f"small_ell{length}_k{index}", form) for index, form in forms)

    stable = []
    for hindex in range(6):
        for kindex in range(6):
            form = difference(8, hindex, kindex)
            if form != 0:
                stable.append(((hindex, kindex), form))
    assert len(labeled) == 42 and len(stable) == 21
    labeled.extend((f"stable_h{index[0]}_k{index[1]}", form) for index, form in stable)
    assert len(labeled) == 63 and len({label for label, _form in labeled}) == 63
    for _label, form in labeled:
        polynomial = sp.Poly(form, *variables)
        assert all(coefficient.is_Integer for coefficient in polynomial.coeffs())

    # Pin the independently derived algebra itself, before numerical evaluation.
    form_stream = "".join(
        f"{label}:" + "".join(
            f"{powers}:{coefficient};" for powers, coefficient in sp.Poly(form, *variables).terms()
        )
        for label, form in labeled
    )
    evaluator = sp.lambdify(variables, [form for _label, form in labeled], modules="math")
    return labeled, evaluator, hashlib.sha256(form_stream.encode()).hexdigest().upper()


def forest_graphs(order: int):
    """Every unlabeled forest once, reconstructed as tree multisets."""
    if order == 0:
        yield nx.Graph()
        return
    component_types = []
    for size in range(1, order + 1):
        candidates = [nx.empty_graph(1)] if size == 1 else nx.nonisomorphic_trees(size)
        for graph in candidates:
            component_types.append((size, nx.convert_node_labels_to_integers(graph)))

    def extend(remaining: int, start: int, chosen: tuple[int, ...]):
        if remaining == 0:
            yield nx.disjoint_union_all([component_types[index][1] for index in chosen])
            return
        for index in range(start, len(component_types)):
            size = component_types[index][0]
            if size > remaining:
                break
            yield from extend(remaining - size, index, (*chosen, index))

    yield from extend(order, 0, ())


def add_integer_rows(left, right, maximum=6):
    return tuple(
        (left[rank] if rank < len(left) else 0) + (right[rank] if rank < len(right) else 0)
        for rank in range(maximum + 1)
    )


def convolve_integer_rows(left, right, maximum=6):
    return tuple(
        sum(
            (left[index] if index < len(left) else 0)
            * (right[rank - index] if rank - index < len(right) else 0)
            for index in range(rank + 1)
        )
        for rank in range(maximum + 1)
    )


def independence_row(graph, maximum=6):
    """Independent tree-DP implementation, truncated after rank six."""
    total = (1,) + (0,) * maximum
    for vertices in nx.connected_components(graph):
        root = min(vertices)

        def visit(vertex, parent):
            excluded = (1,) + (0,) * maximum
            included = (0, 1) + (0,) * (maximum - 1)
            for child in sorted(graph.neighbors(vertex)):
                if child == parent:
                    continue
                child_excluded, child_included = visit(child, vertex)
                excluded = convolve_integer_rows(
                    excluded, add_integer_rows(child_excluded, child_included), maximum
                )
                included = convolve_integer_rows(included, child_excluded, maximum)
            return excluded, included

        component = add_integer_rows(*visit(root, None), maximum)
        total = convolve_integer_rows(total, component, maximum)
    return total


def main() -> None:
    assert sha256(PRODUCER_SOURCE) == PRODUCER_SOURCE_SHA256
    assert sha256(PRODUCER_REPORT) == PRODUCER_REPORT_SHA256
    producer = json.loads(PRODUCER_REPORT.read_text(encoding="utf-8"))
    assert producer["marker"] == PRODUCER_MARKER

    labeled, evaluator, form_stream_sha256 = derive_parent_forms()
    labels = [label for label, _form in labeled]
    assert labels == list(producer["minima"]["adjacent"])

    geometries = ("adjacent", "connected_nonadjacent", "disconnected")
    minima = {geometry: {label: None for label in labels} for geometry in geometries}
    witnesses = {geometry: {} for geometry in geometries}
    digest = hashlib.sha256()
    first_negatives = []
    per_order = {}
    total_forests = total_pairs = total_checks = total_negatives = 0

    for order in range(2, 13):
        local_forests = local_pairs = local_negatives = 0
        for graph in forest_graphs(order):
            local_forests += 1
            nodes = tuple(sorted(graph.nodes()))
            erow = independence_row(graph)
            single_rows = {}
            for mark in nodes:
                deleted = graph.copy()
                deleted.remove_node(mark)
                single_rows[mark] = independence_row(deleted)
            double_rows = {}
            for first_index, pmark in enumerate(nodes):
                for vmark in nodes[first_index + 1:]:
                    deleted = graph.copy()
                    deleted.remove_nodes_from((pmark, vmark))
                    double_rows[(pmark, vmark)] = independence_row(deleted)
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
            "INDEPENDENT_FINITE_G2_TRANSFER_AUDIT", order, local_forests,
            local_pairs, local_checks, local_negatives, flush=True,
        )

    ordered_stream_sha256 = digest.hexdigest().upper()
    assert total_negatives == 0 and not first_negatives
    assert total_forests == producer["unlabeled_forests"] == 2947
    assert total_pairs == producer["ordered_parent_pairs"] == 336762
    assert total_checks == producer["exact_form_checks"] == 21216006
    assert per_order == producer["per_order"]
    assert ordered_stream_sha256 == producer["ordered_stream_sha256"]
    assert minima == producer["minima"]
    assert witnesses == producer["minimizing_witnesses"]

    report = {
        "marker": MARKER,
        "theorem_audited": producer["theorem"],
        "orders": [2, 12],
        "small_forms": 42,
        "stable_forms": 21,
        "parent_forms": len(labels),
        "unlabeled_forests": total_forests,
        "ordered_parent_pairs": total_pairs,
        "exact_form_checks": total_checks,
        "negative_values": total_negatives,
        "per_order": per_order,
        "ordered_stream_sha256": ordered_stream_sha256,
        "independent_form_stream_sha256": form_stream_sha256,
        "exact_matches": {
            "labels": True,
            "per_order_counts": True,
            "ordered_value_stream": True,
            "all_geometry_form_minima": True,
            "all_minimizing_witnesses": True,
        },
        "independence": (
            "No producer code or form-builder is imported: raw Gamma g2, child rows, "
            "Newton differences, forest enumeration, and tree-DP independence rows "
            "are reconstructed locally.  The producer JSON is read only for final comparison."
        ),
        "producer_source_sha256": PRODUCER_SOURCE_SHA256,
        "producer_report_sha256": PRODUCER_REPORT_SHA256,
        "status": "independent exact finite replay; all values nonnegative and every pinned field matches",
        "scope": (
            "Only internal-spine ordinary-parent g2 parent orders 2..12.  Parent orders "
            "at least 13, the all-order cone, other coefficient gates, all N5, and Erdos "
            "Problem 993 remain separate."
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
        "ordered_stream_sha256": ordered_stream_sha256,
        "independent_form_stream_sha256": form_stream_sha256,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
