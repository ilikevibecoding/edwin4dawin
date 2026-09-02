#!/usr/bin/env python3
"""Independent audit of the all-order adjacent-mark C5 theorem.

This audit does not reuse the producer's finite independence-polynomial DP or
its 64-corner enumeration.  It:

* recomputes every finite row with an independent bit-mask deletion recurrence;
* rederives the occupation split and factorial-ratio scaling symbolically;
* checks the adjacent-mark component/edge-budget argument;
* proves monotonicity reduces the rectangular B,C box to one worst corner;
* recomputes that corner on all eight order branches with exact Bernstein
  arithmetic.

The original theorem source/report are pinned and compared only after the
independent calculations pass.
"""

from __future__ import annotations

import hashlib
import itertools
import json
from pathlib import Path

from flint import fmpq_mpoly_ctx
import networkx as nx
import sympy as sp

from census_iso_n5_c5_adjacent_all_forest_g1_bernstein import (
    KNOWN_FOREST_COUNTS,
    forest_graphs,
)
from probe_iso_n5_c5_adjacent_order_box_edge_budget_flint_g1_bernstein import (
    compactify,
    row_corner,
    row_corner_small,
)
from tensor_bernstein_flint_matrix_root import tensor_bernstein_from_flint_matrix


HERE = Path(__file__).resolve().parent
THEOREM_SOURCE = HERE / "prove_iso_n5_c5_adjacent_all_forest_g1_bernstein.py"
THEOREM_REPORT = HERE / "iso_n5_c5_adjacent_all_forest_exact_g1_bernstein_20260830.json"
OUTPUT = HERE / "iso_n5_c5_adjacent_all_forest_independent_audit_g1_nonadjacent_20260830.json"
THEOREM_MARKER = "PASS_EXACT_ISO_N5_C5_ADJACENT_ALL_FOREST_G1_BERNSTEIN"
MARKER = "PASS_INDEPENDENT_AUDIT_ISO_N5_C5_ADJACENT_ALL_FOREST_G1_NONADJACENT"
PINNED = {
    THEOREM_SOURCE.name: "CF6DC882AB21949470B2A8F100D3057D9BF7F3D63AF6C7BD8256853D4E5F05E5",
    THEOREM_REPORT.name: "A39192A5F27BF51249E8A0DC357CB23EE9AAB4C0E33B5ACF5A28447428690BB5",
    "census_iso_n5_c5_adjacent_all_forest_g1_bernstein.py":
        "4913631B222692EC48D06B3A04456677AAD56D3EB9148512649FDEF57234429E",
    "probe_iso_n5_c5_adjacent_order_box_edge_budget_flint_g1_bernstein.py":
        "A5A8E4F1A851676FC265E0ACDA40D84270DDE71220513BB9D09FBE40591E06E0",
    "RANK4_THREE_HALVES_FOREST_CERTIFICATE_2026-07-27.md":
        "38B1C6B41CBDB44D43569E2309BD7E606A59AF7B34322A0FF9083EC430C16FD1",
    "verify_rank4_three_halves_forest_certificate.py":
        "99059D9430D3A8D7AD0E6C5ED63CAE24F6AA99C1F23F204F3E974794A35F70AF",
    "tensor_bernstein_flint_matrix_root.py":
        "9BB62FB90664A9EBF2D8F02D6FBA630A3E78EF4D774D0F091B7689B91307E5DC",
    "balanced_flint_mpoly_sum_root.py":
        "976F5DEB6B44D2E29ECC342A44CAF801EB8AADB90A2FF1DC993F1F7F042C90BD",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def add_rows(left: tuple[int, ...], right: tuple[int, ...]) -> tuple[int, ...]:
    return tuple(
        (left[index] if index < len(left) else 0)
        + (right[index] if index < len(right) else 0)
        for index in range(max(len(left), len(right)))
    )


def shift_row(row: tuple[int, ...]) -> tuple[int, ...]:
    return (0, *row)


def bitmask_polynomial_engine(graph: nx.Graph):
    """Independent-set rows for induced masks by exact deletion recurrence."""
    order = len(graph)
    neighbors = [0] * order
    for u, v in graph.edges():
        neighbors[u] |= 1 << v
        neighbors[v] |= 1 << u
    memo: dict[int, tuple[int, ...]] = {0: (1,)}

    def polynomial(mask: int) -> tuple[int, ...]:
        if mask in memo:
            return memo[mask]
        bit = mask & -mask
        vertex = bit.bit_length() - 1
        without = mask ^ bit
        exclude = polynomial(without)
        include = shift_row(polynomial(without & ~neighbors[vertex]))
        memo[mask] = add_rows(exclude, include)
        return memo[mask]

    return polynomial, neighbors, (1 << order) - 1


def at(row, rank: int):
    return row[rank] if 0 <= rank < len(row) else 0


def raw_c5(e, u, v, w):
    def rcoef(left, right):
        return (
            at(w, left - 2) * at(e, right)
            + at(e, left) * at(w, right - 2)
            + at(v, left - 1) * at(u, right - 1)
            + at(u, left - 1) * at(v, right - 1)
        )
    return rcoef(4, 4) - rcoef(3, 5)


def partition_c5(a, b, c):
    h = at(a, 3) ** 2 - at(a, 1) * at(a, 5)
    ell_b = -at(a, 1) * at(b, 4) + at(a, 2) * at(b, 3) + at(a, 3) * at(b, 2) - at(a, 4) * at(b, 1)
    ell_c = -at(a, 1) * at(c, 4) + at(a, 2) * at(c, 3) + at(a, 3) * at(c, 2) - at(a, 4) * at(c, 1)
    k = -at(b, 1) * at(c, 3) + 2 * at(b, 2) * at(c, 2) - at(b, 3) * at(c, 1)
    return h + ell_b + ell_c + k


def finite_independent_audit() -> dict:
    total_forests = total_cells = 0
    global_minimum = None
    global_smallest_positive = None
    stream = hashlib.sha256()
    geometry_checks = 0
    rows = {}
    for order in range(2, 15):
        count = cells = 0
        minimum = None
        for forest_index, graph0 in enumerate(forest_graphs(order)):
            count += 1
            graph = nx.convert_node_labels_to_integers(graph0)
            polynomial, neighbors, full = bitmask_polynomial_engine(graph)
            graph6 = nx.to_graph6_bytes(graph, header=False).decode().strip()
            e = polynomial(full)
            for u, v in graph.edges():
                ubit, vbit = 1 << u, 1 << v
                urow = polynomial(full ^ ubit)
                vrow = polynomial(full ^ vbit)
                a = polynomial(full ^ ubit ^ vbit)
                bmask = full & ~(vbit | neighbors[v])
                cmask = full & ~(ubit | neighbors[u])
                b = polynomial(bmask)
                c = polynomial(cmask)
                raw = raw_c5(e, urow, vrow, a)
                split = partition_c5(a, b, c)
                assert raw == split >= 0, (order, forest_index, u, v, raw, split)

                # Independently audit the exact adjacent geometry.
                a_graph = graph.copy(); a_graph.remove_nodes_from((u, v))
                su = set(graph.neighbors(u)) - {v}
                sv = set(graph.neighbors(v)) - {u}
                assert su.isdisjoint(sv)
                for component in nx.connected_components(a_graph):
                    assert len(component & su) <= 1
                    assert len(component & sv) <= 1
                    assert not (component & su and component & sv)
                n = len(a_graph)
                mb, mc = bmask.bit_count(), cmask.bit_count()
                overlap = mb + mc - n
                assert 0 <= overlap <= min(mb, mc)
                assert a_graph.number_of_edges() <= overlap
                geometry_checks += 1

                cells += 1
                minimum = raw if minimum is None else min(minimum, raw)
                global_minimum = raw if global_minimum is None else min(global_minimum, raw)
                if raw > 0:
                    global_smallest_positive = raw if global_smallest_positive is None else min(global_smallest_positive, raw)
                stream.update(f"{order}|{forest_index}|{graph6}|{u}|{v}|{raw};".encode())
        assert count == KNOWN_FOREST_COUNTS[order]
        total_forests += count
        total_cells += cells
        rows[str(order)] = {"unlabeled_forests": count, "adjacent_cells": cells, "minimum": minimum}
        print(json.dumps({"audit_finite_order": order, **rows[str(order)]}, sort_keys=True), flush=True)
    return {
        "orders": [2, 14],
        "unlabeled_forests": total_forests,
        "adjacent_cells": total_cells,
        "minimum": global_minimum,
        "smallest_positive": global_smallest_positive,
        "ordered_cell_stream_sha256": stream.hexdigest().upper(),
        "geometry_checks": geometry_checks,
        "rows": rows,
        "implementation": "independent bit-mask deletion recurrence",
    }


def symbolic_audit() -> dict:
    a = sp.symbols("a0:7")
    b = sp.symbols("b0:6")
    c = sp.symbols("c0:6")

    def shifted(base, lower):
        return tuple(at(base, rank) + at(lower, rank - 1) for rank in range(7))

    wrow = a
    urow = shifted(a, b)
    vrow = shifted(a, c)
    erow = tuple(at(a, rank) + at(b, rank - 1) + at(c, rank - 1) for rank in range(7))
    raw = sp.expand(raw_c5(erow, urow, vrow, wrow))
    expected = sp.expand(partition_c5(a, b, c))
    assert sp.expand(raw - expected) == 0

    n = sp.symbols("N", positive=True)
    R1, R2, R3, R4 = sp.symbols("R1 R2 R3 R4", nonnegative=True)
    b1, b2, b3, b4, c1, c2, c3, c4 = sp.symbols(
        "b1 b2 b3 b4 c1 c2 c3 c4", nonnegative=True
    )
    a1 = n
    a2 = R1 / 4
    a3 = R1 * R2 / (24 * n)
    a4 = R1 * R2 * R3 / (192 * n**2)
    a5 = R1 * R2 * R3 * R4 / (1920 * n**3)
    value = (
        a3**2 - a1 * a5
        - a1 * (b4 + c4) + a2 * (b3 + c3)
        + a3 * (b2 + c2) - a4 * (b1 + c1)
        - b1 * c3 + 2 * b2 * c2 - b3 * c1
    )
    scaled = sp.expand(5760 * n**2 * value)
    partials = {
        "b2": sp.diff(value, b2), "b3": sp.diff(value, b3), "b4": sp.diff(value, b4),
        "c2": sp.diff(value, c2), "c3": sp.diff(value, c3), "c4": sp.diff(value, c4),
    }
    expected_partials = {
        "b2": a3 + 2 * c2, "b3": a2 - c1, "b4": -a1,
        "c2": a3 + 2 * b2, "c3": a2 - b1, "c4": -a1,
    }
    assert all(sp.expand(partials[key] - expected_partials[key]) == 0 for key in partials)
    t = sp.symbols("t", nonnegative=True)
    order_gap = sp.Poly(sp.expand(((n - 1) * (n - 2) / 2 - n).subs(n, 13 + t)), t)
    assert all(coefficient > 0 for coefficient in order_gap.all_coeffs())
    return {
        "occupation_residual_zero": True,
        "scaled_expression": str(scaled),
        "partial_derivatives": {key: str(sp.factor(value)) for key, value in partials.items()},
        "unique_worst_corner": "B_mask=C_mask=4 (i2/i3 path floors, i4 ceiling)",
        "order_sign": "a2>=binom(N-1,2)>=N>=b1,c1 for N>=13",
    }


def scaled_l(n, ratios, row):
    R1, R2, R3, _R4 = ratios
    return -5760 * n**3 * row[4] + 1440 * n**2 * R1 * row[3] + 240 * n * R1 * R2 * row[2] - 30 * R1 * R2 * R3 * row[1]


def scaled_k(n, b, c):
    return 5760 * n**2 * (-b[1] * c[3] + 2 * b[2] * c[2] - b[3] * c[1])


def cone_branch(small_order: int | None) -> dict:
    context = fmpq_mpoly_ctx.get(("s", "z", "r0", "r1", "r2", "p", "q"), "degrevlex")
    s, z, r0, r1, r2, p, q = context.gens()
    one = context.constant(1)
    if small_order is None:
        mb = 7 + p
        mc = 7 + p + q
        overlap = mb * s
        n = mb + mc - overlap
        branch = "ordered mB,mC>=7"
    else:
        mb = context.constant(small_order)
        n = 13 + q
        overlap = mb * s
        mc = n - mb + overlap
        branch = f"mB={small_order}, mC>=7, N>=13"
    edges = overlap * z
    R1 = 2 * n * (n - 1) - 4 * edges
    budget = R1 - 2 * n
    terminal = budget * r0
    excess3 = budget * (1 - r0) * r1
    excess2 = budget * (1 - r0) * (1 - r1) * r2
    delta1 = budget * (1 - r0) * (1 - r1) * (1 - r2)
    R4 = terminal
    R3 = terminal + n + excess3
    R2 = terminal + 2 * n + excess3 + excess2
    assert terminal + 2 * n + excess3 + excess2 + delta1 == R1
    ratios = (R1, R2, R3, R4)
    h = 10 * (R1 * R2) ** 2 - 3 * R1 * R2 * R3 * R4
    b = row_corner(mb, 4, one) if small_order is None else row_corner_small(small_order, 4, context)
    c = row_corner(mc, 4, one)
    source = h + scaled_l(n, ratios, b) + scaled_l(n, ratios, c) + scaled_k(n, b, c)
    target = fmpq_mpoly_ctx.get(("s", "z", "r0", "r1", "r2", "P", "Q"), "degrevlex")
    mapped, degree_p, degree_q, source_terms = compactify(source, target)
    terms = list(mapped.terms())
    degrees, coefficients, replay_terms = tensor_bernstein_from_flint_matrix(mapped, 7, chunk_columns=4096)
    assert replay_terms == len(terms)
    assert all(value >= 0 for value in coefficients.flat)
    stream = hashlib.sha256()
    for value in coefficients.flat:
        stream.update(f"{value};".encode())
    record = {
        "branch": branch,
        "source_terms": source_terms,
        "mapped_terms": len(terms),
        "compactification_degrees_p_q": [degree_p, degree_q],
        "bernstein_degrees": list(map(int, degrees)),
        "bernstein_coefficients": int(coefficients.size),
        "minimum": str(min(coefficients.flat)),
        "zero": sum(value == 0 for value in coefficients.flat),
        "coefficient_stream_sha256": stream.hexdigest().upper(),
    }
    print(json.dumps(record, sort_keys=True), flush=True)
    return record


def cone_independent_audit() -> dict:
    rows = [cone_branch(None), *(cone_branch(order) for order in range(7))]
    assert len(rows) == 8
    assert sum(row["bernstein_coefficients"] for row in rows) == 181440
    return {
        "branches": rows,
        "branch_count": 8,
        "unique_worst_corners": 8,
        "bernstein_coefficients": 181440,
        "all_nonnegative": True,
    }


def main() -> None:
    actual = {name: sha256(HERE / name) for name in PINNED}
    assert actual == PINNED
    theorem = json.loads(THEOREM_REPORT.read_text(encoding="utf-8"))
    assert theorem["marker"] == THEOREM_MARKER
    finite = finite_independent_audit()
    assert finite["unlabeled_forests"] == theorem["finite_certificate"]["unlabeled_forests"] == 15204
    assert finite["adjacent_cells"] == theorem["finite_certificate"]["adjacent_mark_cells"] == 165944
    assert finite["minimum"] == theorem["finite_certificate"]["minimum"]["value"] == 0
    assert finite["smallest_positive"] == theorem["finite_certificate"]["smallest_positive"]["value"] == 2
    assert finite["ordered_cell_stream_sha256"] == theorem["finite_certificate"]["ordered_cell_stream_sha256"]
    symbolic = symbolic_audit()
    cones = cone_independent_audit()
    report = {
        "marker": MARKER,
        "audited_theorem_marker": THEOREM_MARKER,
        "theorem": theorem["theorem"],
        "finite_independent_audit": finite,
        "symbolic_independent_audit": symbolic,
        "geometry_independent_audit": {
            "checks": finite["geometry_checks"],
            "proof": (
                "For adjacent u,v, the remaining neighbor sets are disjoint. An "
                "A-component cannot contain two neighbors on one side or neighbors "
                "from both sides, since either configuration plus u,v creates a cycle. "
                "Thus components(A)>=2N-mB-mC=N-r and e(A)<=r."
            ),
            "parameter_range": "0<=r<=min(mB,mC)",
        },
        "cone_independent_audit": cones,
        "comparison_to_original": {
            "original_branches": theorem["ratio_cone_certificate"]["branch_count"],
            "original_corner_pairs": theorem["ratio_cone_certificate"]["corner_pairs"],
            "audit_reduction": (
                "Fixed derivative signs for N>=13 reduce each original 64-corner "
                "box to the single B_mask=C_mask=4 corner recomputed here."
            ),
        },
        "dependencies_sha256": actual,
        "scope": "Independent audit of adjacent-mark C5 only.",
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8")
    print(json.dumps({
        "marker": MARKER,
        "finite_forests": finite["unlabeled_forests"],
        "finite_adjacent_cells": finite["adjacent_cells"],
        "cone_branches": cones["branch_count"],
        "bernstein_coefficients": cones["bernstein_coefficients"],
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
