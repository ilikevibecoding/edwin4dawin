#!/usr/bin/env python3
"""Finite exact search for a deletion-square composition inequality.

For literal ell=1,2 and k=0, compare the internal diagonal g1(00,11) with
the singleton edge payments g1(00,01), g1(00,10), g1(10,11), and g1(01,11)
on every ordered marked parent forest through order eleven.  The scan records
exact minima of natural path-sum residuals and exact rational lower ratios.
It is discovery evidence only; finite positivity is not an all-order theorem.
"""

from __future__ import annotations

from fractions import Fraction
import hashlib
import json
from pathlib import Path

import networkx as nx

from derive_iso_n5_bundle_g12_canonical_configuration_g1_bernstein import (
    convolve,
    numeric_g1_g2,
)
from derive_iso_n5_g1_internal_ordinary_small_broom_parameters_root import child_rows
from probe_iso_leaf_cross_remainder_root import poly_forest
from prove_iso_n5_c5_disconnected_nonadjacent_g1_nonadjacent import forest_graphs


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g1_internal_ordinary_small_k0_singleton_square_ratios_census_root_20260830.json"
MARKER = "CENSUS_EXACT_ISO_N5_G1_INTERNAL_ORDINARY_SMALL_K0_SINGLETON_SQUARE_RATIOS_ROOT"
MAXIMUM_PARENT_ORDER = 11


def padded(row):
    return tuple(row[index] if index < len(row) else 0 for index in range(7))


def states(child, parents):
    x, u, y, z = child
    e, p, v, w = parents
    return {
        "00": (convolve(x, e), convolve(u, e), convolve(x, v), convolve(u, v)),
        "10": (convolve(y, e), convolve(z, e), convolve(y, v), convolve(z, v)),
        "01": (convolve(x, p), convolve(u, p), convolve(x, w), convolve(u, w)),
        "11": (convolve(y, p), convolve(z, p), convolve(y, w), convolve(z, w)),
    }


def g1(crows, drows):
    return numeric_g1_g2(crows, drows)[0]


def main() -> None:
    children = {
        ell: tuple(tuple(int(value) for value in row) for row in child_rows(ell, 0))
        for ell in (1, 2)
    }
    names = (
        "target",
        "target_minus_horizontal_keep",
        "target_minus_vertical_keep",
        "target_minus_horizontal_after",
        "target_minus_vertical_after",
        "target_minus_path_p_then_a",
        "target_minus_path_a_then_p",
        "twice_target_minus_all_edges",
    )
    geometries = ("adjacent", "connected_nonadjacent", "disconnected")
    minima = {
        (ell, geometry, name): None
        for ell in (1, 2) for geometry in geometries for name in names
    }
    negative_counts = {key: 0 for key in minima}
    witnesses = {}
    ratio_minima = {
        (ell, geometry, denominator): None
        for ell in (1, 2)
        for geometry in geometries
        for denominator in ("path_p_then_a", "path_a_then_p", "all_edges_half")
    }
    ratio_witnesses = {}
    pairs = 0
    digest = hashlib.sha256()
    for order in range(2, MAXIMUM_PARENT_ORDER + 1):
        for graph in forest_graphs(order):
            erow = padded(poly_forest(graph))
            graph6 = nx.to_graph6_bytes(graph, header=False).decode().strip()
            for pmark in graph:
                for vmark in graph:
                    if pmark == vmark:
                        continue
                    pg = graph.copy(); pg.remove_node(pmark)
                    vg = graph.copy(); vg.remove_node(vmark)
                    wg = graph.copy(); wg.remove_nodes_from((pmark, vmark))
                    parents = (erow, padded(poly_forest(pg)), padded(poly_forest(vg)), padded(poly_forest(wg)))
                    if graph.has_edge(pmark, vmark):
                        geometry = "adjacent"
                    elif nx.has_path(graph, pmark, vmark):
                        geometry = "connected_nonadjacent"
                    else:
                        geometry = "disconnected"
                    for ell, child in children.items():
                        square = states(child, parents)
                        target = g1(square["00"], square["11"])
                        hp = g1(square["00"], square["01"])
                        va = g1(square["00"], square["10"])
                        ha = g1(square["10"], square["11"])
                        vp = g1(square["01"], square["11"])
                        values = {
                            "target": target,
                            "target_minus_horizontal_keep": target - hp,
                            "target_minus_vertical_keep": target - va,
                            "target_minus_horizontal_after": target - ha,
                            "target_minus_vertical_after": target - vp,
                            "target_minus_path_p_then_a": target - hp - vp,
                            "target_minus_path_a_then_p": target - va - ha,
                            "twice_target_minus_all_edges": 2 * target - hp - va - ha - vp,
                        }
                        digest.update(
                            f"{order}:{graph6}:{pmark}:{vmark}:{ell}:{tuple(values.values())};".encode()
                        )
                        witness = {
                            "parent_order": order,
                            "graph6": graph6,
                            "marks_p_v": [pmark, vmark],
                            "edge_values": {"hp": hp, "va": va, "ha": ha, "vp": vp},
                        }
                        for name, value in values.items():
                            key = (ell, geometry, name)
                            if minima[key] is None or value < minima[key]:
                                minima[key] = value
                                witnesses[key] = {**witness, "value": value}
                            if value < 0:
                                negative_counts[key] += 1
                        denominators = {
                            "path_p_then_a": hp + vp,
                            "path_a_then_p": va + ha,
                            "all_edges_half": hp + va + ha + vp,
                        }
                        numerators = {
                            "path_p_then_a": target,
                            "path_a_then_p": target,
                            "all_edges_half": 2 * target,
                        }
                        for name, denominator in denominators.items():
                            if denominator <= 0:
                                continue
                            ratio = Fraction(numerators[name], denominator)
                            key = (ell, geometry, name)
                            if ratio_minima[key] is None or ratio < ratio_minima[key]:
                                ratio_minima[key] = ratio
                                ratio_witnesses[key] = {
                                    **witness,
                                    "numerator": numerators[name],
                                    "denominator": denominator,
                                    "ratio": str(ratio),
                                }
                    pairs += 1

    def nested(mapping):
        return {
            str(ell): {
                geometry: {
                    name: (
                        str(value) if isinstance(value, Fraction) else value
                    )
                    for (cell_ell, cell_geometry, name), value in mapping.items()
                    if cell_ell == ell and cell_geometry == geometry
                }
                for geometry in geometries
            }
            for ell in (1, 2)
        }

    report = {
        "marker": MARKER,
        "parent_orders": [2, MAXIMUM_PARENT_ORDER],
        "ordered_mark_pairs": pairs,
        "minima": nested(minima),
        "negative_counts": nested(negative_counts),
        "minimizing_witnesses": nested(witnesses),
        "ratio_minima": nested(ratio_minima),
        "ratio_witnesses": nested(ratio_witnesses),
        "ordered_stream_sha256": digest.hexdigest().upper(),
        "status": "exact finite composition diagnostic; no all-order sign theorem asserted",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "ordered_mark_pairs": pairs,
        "minima": report["minima"],
        "negative_counts": report["negative_counts"],
        "ratio_minima": report["ratio_minima"],
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
