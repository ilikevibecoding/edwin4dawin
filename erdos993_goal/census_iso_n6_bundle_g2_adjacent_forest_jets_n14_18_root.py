#!/usr/bin/env python3
"""Exact finite forest-jet census for adjacent rank-six g2, N=14..18.

The large wedge/simplex theorem cannot unconditionally use the Q6 reserve
below N=19.  This script removes that dependency by enumerating every
distinct forest independence polynomial through order 18 and evaluating the
literal occupation functional.  For N>=14, the separately proved derivative
reduction leaves only the four PATH/EDGELESS choices for b2,c2.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import networkx as nx
from flint import fmpz_poly as Poly

from probe_iso_n6_bundle_g2_adjacent_q3_endpoints_flint_root import (
    choose,
    path_floor,
)
from probe_iso_n6_bundle_g2_adjacent_wedge_simplex_flint_root import (
    A2_TERMS,
    K2_TERMS,
    L2_TERMS,
)
from scan_forest_iso_reserve_floor import tree_polynomial
from scan_rank8_v8_forest_polynomials import (
    EXPECTED_DISTINCT_FOREST_POLYNOMIALS,
    EXPECTED_TREES,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n6_bundle_g2_adjacent_forest_jets_n14_18_exact_root_20260831.json"
MARKER = "PASS_EXACT_ISO_N6_BUNDLE_G2_ADJACENT_FOREST_JETS_N14_18_ROOT"
CORNER_REPORT = HERE / "iso_n6_bundle_g2_adjacent_wedge_four_corner_reduction_exact_root_20260831.json"
CORNER_REPORT_SHA256 = "E52910E26F129A208CB7BB5F1BFCC625C6919F92BC6C5C9563543E325BD14001"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def multiply(a: tuple[int, ...], b: tuple[int, ...]) -> tuple[int, ...]:
    return tuple(int(value) for value in Poly(list(a)) * Poly(list(b)))


def coefficient(poly: tuple[int, ...], rank: int) -> int:
    return poly[rank] if rank < len(poly) else 0


def truncate(poly: tuple[int, ...], length: int) -> tuple[int, ...]:
    return tuple(coefficient(poly, rank) for rank in range(length))


def row_corner(order: int, rank2_edgeless: bool) -> tuple[int, ...]:
    row = [1, order]
    for rank in range(2, 7):
        use_edgeless = (rank == 2 and rank2_edgeless) or rank in (5, 6)
        value = choose(order, rank, 1) if use_edgeless else path_floor(order, rank, 1)
        row.append(int(value))
    return tuple(row)


def bilinear(left, right, terms) -> int:
    return sum(coefficient * left[i] * right[j]
               for coefficient, i, j in terms)


def enumerate_forest_polynomials(maximum: int):
    trees: list[set[tuple[int, ...]]] = [set() for _ in range(maximum + 1)]
    forests: list[set[tuple[int, ...]]] = [set() for _ in range(maximum + 1)]
    forests[0].add((1,))
    enumeration = {}
    for n in range(1, maximum + 1):
        if n == 1:
            trees[n].add((1, 1))
            tree_count = 1
        else:
            tree_count = 0
            for tree in nx.nonisomorphic_trees(n):
                tree_count += 1
                trees[n].add(tree_polynomial(tree))
        assert tree_count == EXPECTED_TREES[n - 1]

        current = set(trees[n])
        for component_order in range(1, n // 2 + 1):
            for component in trees[component_order]:
                for rest in forests[n - component_order]:
                    current.add(multiply(component, rest))
        forests[n] = current
        assert len(current) == EXPECTED_DISTINCT_FOREST_POLYNOMIALS[n - 1]
        enumeration[str(n)] = {
            "unlabeled_trees": tree_count,
            "distinct_tree_polynomials": len(trees[n]),
            "distinct_forest_polynomials": len(current),
        }
        print(
            f"ENUMERATED n={n} trees={tree_count} tree_polys={len(trees[n])} "
            f"forest_polys={len(current)}",
            flush=True,
        )
    return forests, enumeration


def audit_order(n: int, polynomials: set[tuple[int, ...]]) -> dict[str, object]:
    jets = sorted({truncate(poly, 8) for poly in polynomials})
    rows = {
        (order, mask): row_corner(order, bool(mask))
        for order in range(n + 1) for mask in (0, 1)
    }
    k_values = {
        (mb, bmask, mc, cmask): bilinear(
            rows[(mb, bmask)], rows[(mc, cmask)], K2_TERMS
        )
        for mb in range(n + 1)
        for mc in range(max(mb, n - mb), n + 1)
        for bmask in (0, 1)
        for cmask in (0, 1)
    }
    feasible_pairs = sum(
        1 for mb in range(n + 1) for mc in range(max(mb, n - mb), n + 1)
    )
    checks = 0
    negative = 0
    minimum = None
    witness = None
    stream = hashlib.sha256()
    for a in jets:
        assert a[0] == 1 and a[1] == n
        a2_piece = bilinear(a, a, A2_TERMS)
        l_values = {
            (order, mask): bilinear(a, rows[(order, mask)], L2_TERMS)
            for order in range(n + 1) for mask in (0, 1)
        }
        local_minimum = None
        local_record = None
        for mb in range(n + 1):
            for mc in range(max(mb, n - mb), n + 1):
                for bmask in (0, 1):
                    for cmask in (0, 1):
                        value = (
                            a2_piece
                            + l_values[(mb, bmask)]
                            + l_values[(mc, cmask)]
                            + k_values[(mb, bmask, mc, cmask)]
                        )
                        checks += 1
                        if value < 0:
                            negative += 1
                        record = (value, mb, mc, bmask, cmask)
                        if local_minimum is None or record < local_minimum:
                            local_minimum = record
                            local_record = {
                                "value": value,
                                "A_jet_i0_through_i7": list(a),
                                "mB": mb,
                                "mC": mc,
                                "B2_endpoint": "EDGELESS" if bmask else "PATH",
                                "C2_endpoint": "EDGELESS" if cmask else "PATH",
                            }
        assert local_minimum is not None and local_record is not None
        stream.update(
            ("|".join(map(str, a)) + ":" + "|".join(map(str, local_minimum)) + ";").encode()
        )
        candidate = (local_minimum[0], tuple(a), local_minimum[1:])
        if minimum is None or candidate < minimum:
            minimum = candidate
            witness = local_record
    assert minimum is not None and witness is not None
    return {
        "distinct_forest_polynomials": len(polynomials),
        "distinct_i0_through_i7_jets": len(jets),
        "feasible_order_pairs_after_B_C_sort": feasible_pairs,
        "rank2_corner_pairs": 4,
        "literal_g2_checks": checks,
        "negative": negative,
        "minimum": minimum[0],
        "minimum_witness": witness,
        "ordered_jet_minimum_stream_sha256": stream.hexdigest().upper(),
    }


def main() -> None:
    assert sha256(CORNER_REPORT) == CORNER_REPORT_SHA256
    corner = json.loads(CORNER_REPORT.read_text(encoding="utf-8"))
    assert corner["marker"] == "DERIVED_EXACT_ISO_N6_BUNDLE_G2_ADJACENT_WEDGE_FOUR_CORNER_REDUCTION_ROOT"
    assert corner["corner_count"] == 4
    assert corner["scope"] == "adjacent no-parent mode, N>=14; exact reduction only"

    forests, enumeration = enumerate_forest_polynomials(18)
    orders = {}
    global_minimum = None
    global_witness = None
    total_checks = 0
    for n in range(14, 19):
        result = audit_order(n, forests[n])
        assert result["negative"] == 0
        orders[str(n)] = result
        total_checks += result["literal_g2_checks"]
        candidate = (result["minimum"], n)
        if global_minimum is None or candidate < global_minimum:
            global_minimum = candidate
            global_witness = {"N": n, **result["minimum_witness"]}
        print(
            f"AUDITED n={n} jets={result['distinct_i0_through_i7_jets']} "
            f"checks={result['literal_g2_checks']} negative=0 min={result['minimum']}",
            flush=True,
        )
    assert global_minimum is not None and global_witness is not None
    report = {
        "marker": MARKER,
        "status": "PASS exact finite forest-jet census",
        "theorem": (
            "For every adjacent-mark canonical no-parent rank-six bundle geometry "
            "whose common forest row A has order 14<=N<=18, g2 is nonnegative."
        ),
        "enumeration": enumeration,
        "orders": orders,
        "aggregate": {
            "literal_g2_checks": total_checks,
            "negative": 0,
            "global_minimum": global_minimum[0],
            "global_minimum_witness": global_witness,
        },
        "coverage_argument": {
            "forest_polynomials": (
                "Every forest is a multiset of unlabeled tree components; exact "
                "polynomial multiplication with set deduplication exhausts every "
                "distinct independence polynomial at each order."
            ),
            "A_dependency": "literal adjacent g2 depends on A only through i0,...,i7",
            "order_geometry": (
                "After swapping B,C, 0<=mB<=mC<=N and mB+mC>=N; "
                "all such integer pairs are checked."
            ),
            "four_corner_reduction": (
                "For N>=14, b3,b4,c3,c4 minimize at PATH; b5,b6,c5,c6 "
                "minimize at EDGELESS; b2,c2 independently use both endpoints."
            ),
        },
        "corner_report": {
            "file": CORNER_REPORT.name,
            "sha256": CORNER_REPORT_SHA256,
        },
        "scope_guard": (
            "This closes adjacent no-parent orders 14..18 only; it does not cover "
            "N<=13, nonadjacent marks, or parent modes."
        ),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "literal_g2_checks": total_checks,
        "negative": 0,
        "global_minimum": global_minimum[0],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
