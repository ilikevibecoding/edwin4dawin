#!/usr/bin/env python3
"""All-order C5 theorem for connected nonadjacent marks in a forest.

Let u,v be nonadjacent vertices in the same tree component of a forest G and
put

    A=G-u-v,
    B=G-({u} union N[v]),
    C=G-({v} union N[u]),
    D=G-(N[u] union N[v]).

The exact occupation split is

    C5=H(A)+L(A,B)+L(A,C)+K(B,C)+K(A,D).

Orders |A|<=12 are exhausted over every unlabeled forest and every connected
nonedge.  For |A|>=13, the unique u-v path gives the sharp correlated
geometry

    r=|B|+|C|-|A| >= -1,  e(A)<=r+1,
    |D|=r+s,  s=1_{distance(u,v)=2}.

The exceptional r=-1 family is edgeless and is handled symbolically.  For
r>=0, exact factorial-ratio cones, path floors at ranks two and three, and
subset ceilings give nonnegative tensor-Bernstein certificates on every
order branch.  Monotonicity reduces the coefficient box to one worst row per
branch; no finite evidence is promoted into the all-order argument.

This proves connected-nonadjacent C5 only.  It does not prove M5,
M5+3*C5, g1, all N5, or Erdos Problem 993.
"""

from __future__ import annotations

from fractions import Fraction
import hashlib
import itertools
import json
from pathlib import Path

from flint import fmpq_mpoly_ctx
import networkx as nx
import sympy as sp

from census_iso_n5_c5_adjacent_all_forest_g1_bernstein import (
    KNOWN_FOREST_COUNTS,
    at,
    forest_graphs,
    h_c,
    ell_c,
    k_c,
    r_coefficient,
)
from probe_iso_leaf_cross_remainder_root import poly_forest
from probe_iso_n5_c5_adjacent_order_box_edge_budget_flint_g1_bernstein import (
    compactify,
    row_corner,
    row_corner_small,
    scaled_k,
    scaled_l,
)
from tensor_bernstein_flint_matrix_root import tensor_bernstein_from_flint_matrix


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_c5_connected_nonadjacent_all_forest_exact_g1_nonadjacent_20260830.json"
MARKER = "PRODUCED_EXACT_ISO_N5_C5_CONNECTED_NONADJACENT_ALL_FOREST_G1_NONADJACENT"
FOUNDATIONAL_HASHES = {
    "census_iso_n5_c5_adjacent_all_forest_g1_bernstein.py":
        "4913631B222692EC48D06B3A04456677AAD56D3EB9148512649FDEF57234429E",
    "probe_iso_n5_c5_adjacent_order_box_edge_budget_flint_g1_bernstein.py":
        "A5A8E4F1A851676FC265E0ACDA40D84270DDE71220513BB9D09FBE40591E06E0",
    "probe_iso_leaf_cross_remainder_root.py":
        "A9C643C3A223E004365E5013A2433517BC60073D1B230D92477FFDC7E3B6A5F1",
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


def update_minimum(bucket: dict, value: int, witness: dict) -> None:
    bucket["checks"] += 1
    bucket["zero"] += int(value == 0)
    current = bucket["minimum"]
    if current is None or value < current["value"]:
        bucket["minimum"] = {"value": value, **witness}
    if value > 0:
        current = bucket["smallest_positive"]
        if current is None or value < current["value"]:
            bucket["smallest_positive"] = {"value": value, **witness}


def finite_certificate() -> dict:
    """Every connected nonedge in every unlabeled G of order at most 14."""
    rows = {}
    global_bucket = {
        "checks": 0, "zero": 0, "minimum": None, "smallest_positive": None,
    }
    total_forests = total_cells = 0
    ordered_digest = hashlib.sha256()
    for order in range(2, 15):
        forest_count = cells = 0
        bucket = {
            "checks": 0, "zero": 0, "minimum": None, "smallest_positive": None,
        }
        for forest_index, graph0 in enumerate(forest_graphs(order)):
            forest_count += 1
            graph = nx.convert_node_labels_to_integers(graph0)
            graph6 = nx.to_graph6_bytes(graph, header=False).decode().strip()
            cache: dict[frozenset[int], tuple[int, ...]] = {}

            def row(deleted) -> tuple[int, ...]:
                key = frozenset(deleted)
                if key not in cache:
                    kept = [vertex for vertex in graph if vertex not in key]
                    cache[key] = tuple(poly_forest(graph.subgraph(kept)))
                return cache[key]

            e_row = row(())
            for component in nx.connected_components(graph):
                for u, v in itertools.combinations(sorted(component), 2):
                    if graph.has_edge(u, v):
                        continue
                    a = row((u, v))
                    closed_u = {u, *graph.neighbors(u)}
                    closed_v = {v, *graph.neighbors(v)}
                    b = row({u} | closed_v)
                    c = row({v} | closed_u)
                    d = row(closed_u | closed_v)
                    partition = h_c(a) + ell_c(a, b) + ell_c(a, c) + k_c(b, c) + k_c(a, d)
                    raw_rows = (e_row, row((u,)), row((v,)), a)
                    raw = r_coefficient(raw_rows, 4, 4) - r_coefficient(raw_rows, 3, 5)
                    assert partition == raw, (
                        "partition mismatch", order, forest_index, u, v, partition, raw,
                    )
                    assert raw >= 0, (
                        "negative connected-nonadjacent C5", order, forest_index, u, v, raw,
                    )
                    witness = {
                        "order": order,
                        "forest_index": forest_index,
                        "graph6": graph6,
                        "marks": [int(u), int(v)],
                        "distance": int(nx.shortest_path_length(graph, u, v)),
                    }
                    update_minimum(bucket, raw, witness)
                    update_minimum(global_bucket, raw, witness)
                    ordered_digest.update(
                        f"{order}|{forest_index}|{graph6}|{u}|{v}|{raw};".encode()
                    )
                    cells += 1
        assert forest_count == KNOWN_FOREST_COUNTS[order], (
            order, forest_count, KNOWN_FOREST_COUNTS[order],
        )
        assert cells == bucket["checks"]
        total_forests += forest_count
        total_cells += cells
        rows[str(order)] = {
            "unlabeled_forests": forest_count,
            "connected_nonadjacent_mark_cells": cells,
            "zero_cells": bucket["zero"],
            "minimum": bucket["minimum"],
            "smallest_positive": bucket["smallest_positive"],
        }
        print(json.dumps({"finite_order": order, **rows[str(order)]}, sort_keys=True), flush=True)
    assert total_cells == global_bucket["checks"]
    return {
        "orders_of_G": [2, 14],
        "orders_of_A": [0, 12],
        "unlabeled_forests": total_forests,
        "connected_nonadjacent_mark_cells": total_cells,
        "global_zero_cells": global_bucket["zero"],
        "global_minimum": global_bucket["minimum"],
        "global_smallest_positive": global_bucket["smallest_positive"],
        "ordered_cell_stream_sha256": ordered_digest.hexdigest().upper(),
        "rows": rows,
        "raw_reconstruction_checked_cellwise": True,
        "known_unlabeled_forest_counts_checked": True,
        "role": "complete finite branch, not extrapolated",
    }


def algebra_certificate() -> dict:
    """Reconstruct the scaled split and prove the unique worst box row."""
    n = sp.symbols("N", positive=True)
    r1, r2, r3, r4 = sp.symbols("R1 R2 R3 R4", nonnegative=True)
    b1, b2, b3, b4 = sp.symbols("b1 b2 b3 b4", nonnegative=True)
    c1, c2, c3, c4 = sp.symbols("c1 c2 c3 c4", nonnegative=True)
    d1, d2, d3 = sp.symbols("d1 d2 d3", nonnegative=True)
    a1 = n
    a2 = r1 / 4
    a3 = r1 * r2 / (24 * n)
    a4 = r1 * r2 * r3 / (192 * n**2)
    a5 = r1 * r2 * r3 * r4 / (1920 * n**3)
    h = a3**2 - a1 * a5
    ell_b = -a1 * b4 + a2 * b3 + a3 * b2 - a4 * b1
    ell_c = -a1 * c4 + a2 * c3 + a3 * c2 - a4 * c1
    k_bc = -b1 * c3 + 2 * b2 * c2 - b3 * c1
    k_ad = -a1 * d3 + 2 * a2 * d2 - a3 * d1
    scaled = sp.factor(5760 * n**2 * (h + ell_b + ell_c + k_bc + k_ad))
    expected = sp.expand(
        10 * (r1 * r2) ** 2 - 3 * r1 * r2 * r3 * r4
        - 5760 * n**3 * (b4 + c4 + d3)
        + 1440 * n**2 * r1 * (b3 + c3 + 2 * d2)
        + 240 * n * r1 * r2 * (b2 + c2 - d1)
        - 30 * r1 * r2 * r3 * (b1 + c1)
        + 5760 * n**2 * k_bc
    )
    assert sp.expand(scaled - expected) == 0

    # In the combined expression, the live partial derivatives have fixed
    # signs once N>=13: a2-c1 and a2-b1 are nonnegative because B,C are
    # induced subforests of A and a2>=binom(N-1,2)>=N.
    partials = {
        "b2": sp.factor(sp.diff(h + ell_b + ell_c + k_bc + k_ad, b2)),
        "b3": sp.factor(sp.diff(h + ell_b + ell_c + k_bc + k_ad, b3)),
        "b4": sp.factor(sp.diff(h + ell_b + ell_c + k_bc + k_ad, b4)),
        "c2": sp.factor(sp.diff(h + ell_b + ell_c + k_bc + k_ad, c2)),
        "c3": sp.factor(sp.diff(h + ell_b + ell_c + k_bc + k_ad, c3)),
        "c4": sp.factor(sp.diff(h + ell_b + ell_c + k_bc + k_ad, c4)),
        "d2": sp.factor(sp.diff(h + ell_b + ell_c + k_bc + k_ad, d2)),
        "d3": sp.factor(sp.diff(h + ell_b + ell_c + k_bc + k_ad, d3)),
    }
    expected_partials = {
        "b2": a3 + 2 * c2,
        "b3": a2 - c1,
        "b4": -a1,
        "c2": a3 + 2 * b2,
        "c3": a2 - b1,
        "c4": -a1,
        "d2": 2 * a2,
        "d3": -a1,
    }
    assert all(
        sp.expand(partials[name] - expected_partials[name]) == 0
        for name in partials
    )
    t = sp.symbols("t", nonnegative=True)
    order_slack = sp.Poly(
        sp.expand(((n - 1) * (n - 2) / 2 - n).subs(n, 13 + t)), t,
    )
    assert all(coefficient > 0 for coefficient in order_slack.all_coeffs())
    return {
        "occupation_split": "C5=H(A)+L(A,B)+L(A,C)+K(B,C)+K(A,D)",
        "H": "a3^2-a1*a5",
        "L": "-a1*b4+a2*b3+a3*b2-a4*b1",
        "K": "-b1*c3+2*b2*c2-b3*c1",
        "scaled_identity": str(expected),
        "positive_multiplier": "5760*N^2",
        "live_partial_derivatives": {key: str(value) for key, value in partials.items()},
        "order_sign": "a2>=binom(N-1,2)>=N>=|B|,|C| for N>=13",
        "order_sign_shifted_power_coefficients": [
            str(value) for value in order_slack.all_coeffs()
        ],
        "unique_worst_rows": {
            "B_and_C": "rank-2 path floor, rank-3 path floor, rank-4 subset ceiling",
            "D": "rank-2 path floor, rank-3 subset ceiling",
        },
    }


def scaled_k_ad(n, ratio_numerators, d):
    r1, r2, _r3, _r4 = ratio_numerators
    return -5760 * n**3 * d[3] + 2880 * n**2 * r1 * d[2] - 240 * n * r1 * r2 * d[1]


def cone_branch(distance_two: bool, mode: str, small_order: int | None) -> dict:
    """One exact all-order tensor-Bernstein branch."""
    assert mode in ("general", "r_zero", "r_positive")
    if distance_two:
        assert mode == "general"
    else:
        assert mode != "general"
    if mode == "r_positive" and small_order is not None:
        assert small_order >= 1

    source_context = fmpq_mpoly_ctx.get(
        ("s", "z", "r0", "r1", "r2", "p", "q"), "degrevlex"
    )
    s, z, r0, r1, r2, p, q = source_context.gens()
    one = source_context.constant(1)
    if small_order is None:
        mb = 7 + p
        mc_seed = 7 + p + q
    else:
        mb = source_context.constant(small_order)
        n_seed = 13 + q

    if mode == "general":
        overlap = mb * s
    elif mode == "r_zero":
        overlap = source_context.constant(0)
    else:
        overlap = 1 + (mb - 1) * s

    if small_order is None:
        mc = mc_seed
        n = mb + mc - overlap
    else:
        n = n_seed
        mc = n - mb + overlap
    edges = (overlap + 1) * z
    md = overlap + int(distance_two)

    # Rj=n*rho_j.  The exact first ratio fixes R1; the remaining forest
    # drops delta1>=0, delta2>=1, delta3>=1 and rho4>=0 partition R1-2n.
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

    scaled_h = 10 * (R1 * R2) ** 2 - 3 * R1 * R2 * R3 * R4
    b = (
        row_corner(mb, 4, one)
        if small_order is None
        else row_corner_small(small_order, 4, source_context)
    )
    c = row_corner(mc, 4, one)
    if mode == "r_zero" and not distance_two:
        d = (one, source_context.constant(0), source_context.constant(0), source_context.constant(0))
    else:
        # Here md>=1, so the rank-2 path floor is valid at every endpoint.
        d = row_corner(md, 2, one)
    source = (
        scaled_h
        + scaled_l(n, ratios, b)
        + scaled_l(n, ratios, c)
        + scaled_k(n, b, c)
        + scaled_k_ad(n, ratios, d)
    )

    target_context = fmpq_mpoly_ctx.get(
        ("s", "z", "r0", "r1", "r2", "P", "Q"), "degrevlex"
    )
    mapped, degree_p, degree_q, source_terms = compactify(source, target_context)
    mapped_terms = list(mapped.terms())
    degrees, coefficients, replay_terms = tensor_bernstein_from_flint_matrix(
        mapped, 7, chunk_columns=4096
    )
    assert replay_terms == len(mapped_terms)
    assert all(value >= 0 for value in coefficients.flat)
    stream = hashlib.sha256()
    for value in coefficients.flat:
        stream.update(f"{value};".encode())

    if small_order is None:
        order_branch = "ordered |B|,|C|>=7"
    else:
        order_branch = f"ordered |B|={small_order}, |A|>=13"
    if distance_two:
        geometry_branch = "distance=2, r>=0, |D|=r+1"
    elif mode == "r_zero":
        geometry_branch = "distance>=3, r=0, D empty"
    else:
        geometry_branch = "distance>=3, r>=1, |D|=r"
    record = {
        "geometry_branch": geometry_branch,
        "order_branch": order_branch,
        "source_terms": source_terms,
        "mapped_terms": len(mapped_terms),
        "compactification_degrees_p_q": [degree_p, degree_q],
        "bernstein_degrees": list(map(int, degrees)),
        "bernstein_coefficients": int(coefficients.size),
        "negative": 0,
        "zero": sum(value == 0 for value in coefficients.flat),
        "minimum": str(min(coefficients.flat)),
        "coefficient_stream_sha256": stream.hexdigest().upper(),
    }
    print(json.dumps(record, sort_keys=True), flush=True)
    return record


def exceptional_r_minus_one_certificate() -> dict:
    """Distance two, r=-1: A,B,C are edgeless and D is empty."""
    b, c, p, q = sp.symbols("b c p q", integer=True, nonnegative=True)

    def choose(value, rank):
        return sp.prod(value - offset for offset in range(rank)) / sp.factorial(rank)

    n = b + c + 1
    arow = tuple(choose(n, rank) for rank in range(7))
    brow = tuple(choose(b, rank) for rank in range(6))
    crow = tuple(choose(c, rank) for rank in range(6))
    drow = (sp.Integer(1),)
    value = sp.factor(
        h_c(arow) + ell_c(arow, brow) + ell_c(arow, crow)
        + k_c(brow, crow) + k_c(arow, drow)
    )
    shifted = sp.Poly(sp.expand(value.subs({b: 1 + p, c: 1 + p + q})), p, q)
    assert all(coefficient > 0 for coefficient in shifted.coeffs())
    b_zero = sp.factor(value.subs(b, 0))
    expected_b_zero = sp.factor(
        c * (c - 1) * (c + 1) * (c + 2) * (7 * c**2 + 28 * c - 54) / 360
    )
    assert sp.expand(b_zero - expected_b_zero) == 0
    assert all(value.subs({b: 0, c: order}) >= 0 for order in (0, 1, 2))
    c_tail = sp.Poly(sp.expand((7 * c**2 + 28 * c - 54).subs(c, 2 + p)), p)
    assert all(coefficient > 0 for coefficient in c_tail.all_coeffs())
    return {
        "geometry": (
            "r=-1 forces e(A)=0 and no unmarked A-component; hence A is edgeless, "
            "D is empty, and after ordering |B|=b<=c=|C|, |A|=b+c+1"
        ),
        "exact_C5": str(value),
        "b_at_least_one_substitution": "b=1+p, c=1+p+q",
        "strictly_positive_power_coefficients": len(shifted.terms()),
        "minimum_scalar_coefficient": str(min(shifted.coeffs())),
        "b_zero_factorization": str(b_zero),
        "b_zero_sign": "zero at c=0,1 and positive for every integer c>=2",
    }


def all_order_certificate() -> dict:
    records = []
    # Distance at least three: split r=0 because the polynomial path floor
    # binom(|D|-1,2) is not a valid lower bound for the empty D row.
    records.append(cone_branch(False, "r_zero", None))
    for order in range(7):
        records.append(cone_branch(False, "r_zero", order))
    records.append(cone_branch(False, "r_positive", None))
    for order in range(1, 7):
        records.append(cone_branch(False, "r_positive", order))

    # Distance two with r>=0 has |D|=r+1>=1, so no split is needed.
    records.append(cone_branch(True, "general", None))
    for order in range(7):
        records.append(cone_branch(True, "general", order))

    assert len(records) == 23
    assert all(record["negative"] == 0 for record in records)
    return {
        "branches": records,
        "branch_count": len(records),
        "bernstein_coefficients": sum(row["bernstein_coefficients"] for row in records),
        "zero_coefficients": sum(row["zero"] for row in records),
        "global_minimum": str(min(Fraction(row["minimum"]) for row in records)),
        "all_coefficients_nonnegative": True,
        "exceptional_r_minus_one": exceptional_r_minus_one_certificate(),
    }


def main() -> None:
    actual_hashes = {name: sha256(HERE / name) for name in FOUNDATIONAL_HASHES}
    assert actual_hashes == FOUNDATIONAL_HASHES
    algebra = algebra_certificate()
    finite = finite_certificate()
    all_order = all_order_certificate()
    report = {
        "marker": MARKER,
        "theorem": (
            "For every finite forest G and every pair of nonadjacent vertices u,v "
            "in the same connected component, C5=[z^4w^4]R-[z^3w^5]R is nonnegative."
        ),
        "algebra_certificate": algebra,
        "geometry_certificate": {
            "definitions": "N=|A|, mB=|B|, mC=|C|, r=mB+mC-N",
            "component_argument": (
                "Within the marked tree, every A-component contains at most one "
                "remaining neighbor of either mark and exactly one A-component meets "
                "both sides (the unique path component). If c0 A-components are "
                "unmarked components of G, then r=e(A)+c0-1."
            ),
            "edge_budget": "e(A)<=r+1 and r>=-1",
            "D_order": (
                "|D|=r+s, where s=1 exactly at distance two (the two neighbor sets "
                "share their unique middle vertex), and s=0 otherwise"
            ),
            "parameter_range_for_r_nonnegative": "0<=r<=min(mB,mC)",
            "path_floors_used": (
                "Only i2(F)>=binom(m-1,2) and i3(F)>=binom(m-2,3) are used. "
                "For k=2,3, leaf recurrence with N[v]={v,neighbor} and Pascal "
                "induction proves these floors; the empty row is split explicitly."
            ),
            "subset_ceilings_used": "i3(F)<=binom(m,3), i4(F)<=binom(m,4)",
        },
        "ratio_cone_certificate": {
            "scope": "N=|A|>=13",
            "normalization": "q_k=2^k*k!*a_k, rho_j=q_(j+1)/q_j, Rj=N*rho_j",
            "exact_first_ratio": "R1=2N(N-1)-4e(A)",
            "simplex_budget_positive": (
                "On large-large branches N>=7 and e<=r+1<=mB+1<=N+1, so "
                "R1-2N>=2N(N-2)-4(N+1)>=38. On small-order branches "
                "N>=13 and e<=mB+1<=7, giving an even larger bound."
            ),
            "forest_drops": "delta1>=0, delta2>=1, delta3>=1, rho4>=0",
            "simplex_partition": (
                "R1-2N=R4+N(delta3-1)+N(delta2-1)+N*delta1; three "
                "stick-breaking variables cover the four nonnegative summands"
            ),
            "order_coverage": (
                "After swapping marks assume mB<=mC. Either mB=0,...,6, or "
                "mB=7+p,mC=7+p+q. The r=0 split plus r>=1 and distance-two "
                "branches give the 23 exact rows."
            ),
            **all_order,
        },
        "finite_certificate": finite,
        "coverage_assembly": {
            "finite": "|A|<=12, equivalently |G|<=14",
            "all_order": "|A|>=13",
            "gap": "none within connected-nonadjacent C5",
        },
        "dependencies_sha256": actual_hashes,
        "scope": (
            "Connected-nonadjacent C5 only. This does not prove M5, M5+3*C5, "
            "no-mark-root g1, all N5, or Erdos Problem 993."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8")
    print(json.dumps({
        "marker": MARKER,
        "finite_forests": finite["unlabeled_forests"],
        "finite_connected_nonadjacent_cells": finite["connected_nonadjacent_mark_cells"],
        "cone_branches": all_order["branch_count"],
        "bernstein_coefficients": all_order["bernstein_coefficients"],
        "scope": report["scope"],
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
