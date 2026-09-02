#!/usr/bin/env python3
"""Exact all-order g1 theorem for the connected-nonadjacent q=1 endpoint face.

Let p=u be the singleton endpoint and suppose u,v are nonadjacent but lie in
the same component.  On the q=1 face, u has the sole neighbour r.  Put
T=G-u.  Then r and v lie in the same component of T and the four rows in the
corrected endpoint residual are

    U=I(T),  W=I(T-v),  QE=I(T-r),  QV=I(T-r-v).

Thus

    F=N4(T)+B(I(T-r),I(T-v))+B(I(T),I(T-r-v)),
    B(A,B)=a2*b3-2*a3*b2+a4*b1.

This program first checks F directly on every unlabeled forest T through
order 12 and every ordered pair r,v in one component.  For all larger orders
it derives F in exact forest motifs, applies three proved moment/deletion
bounds, and checks the remaining rational polynomial in Bernstein form.

The proof is deliberately scoped to q=1.  Extra u-neighbour components are
not silently discarded.
"""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

import networkx as nx
import sympy as sp

from audit_iso_n4_bundle_g12_endpoint_parent_independent_g1_bernstein import (
    choose,
    i2,
    i3,
    i4,
    i5,
)
from probe_iso_leaf_cross_remainder_root import poly_forest
from prove_iso_n5_c5_disconnected_nonadjacent_g1_nonadjacent import forest_graphs
from prove_iso_n5_disconnected_m5_sum16_q1_active_root_g1_nonadjacent import (
    coefficient_rows_hash,
    polynomial_hash,
    tensor_bernstein_sparse,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g1_singleton_endpoint_connected_nonadjacent_q1_all_order_exact_g1_nonadjacent_20260830.json"
MARKER = "PASS_EXACT_ISO_N5_G1_SINGLETON_ENDPOINT_CONNECTED_NONADJACENT_Q1_ALL_ORDER_G1_NONADJACENT"
KNOWN_FOREST_COUNTS = {
    2: 2, 3: 3, 4: 6, 5: 10, 6: 20, 7: 37,
    8: 76, 9: 153, 10: 329, 11: 710, 12: 1601,
}
PINS = {
    "derive_iso_n5_g1_singleton_endpoint_corrected_residual_g1_nonadjacent.py":
        "8100E7B132606481575C681088C30F8B7D6308E670162AC3B96E5C92982C6C89",
    "iso_n5_g1_singleton_endpoint_corrected_residual_exact_g1_nonadjacent_20260830.json":
        "5E277A78168DE1978C9AACD6AFF12F55A624F4D8CCF4017CA290406106A3C3B1",
    "assemble_iso_n5_s_all_marked_forests_root.py":
        "E56AA4AD8AF3FE936DAF8354A6D7BAD1BAC5AFDCCD6C4436FB198A0FC76D479E",
    "iso_n5_s_all_marked_forests_exact_root_20260830.json":
        "E4FDD1215C0924A40E2B6D47BAC9CF5BB54830686AAB6E5F1188D8F25F386CBE",
    "assemble_iso_all_forest_n4_bundle_induction_root.py":
        "9A11F120B02BD477069A28443B0244B3B592A69F1A2E060A5283B7D4453F6720",
    "iso_all_forest_n4_bundle_induction_exact_root_20260829.json":
        "28682176B3A1402BF115C6294280B979CD418B291809782881998379DDD3131C",
    "audit_iso_all_forest_n4_bundle_induction_independent_bundle_g12.py":
        "E656BEE9BC8412B99ABB93CBFB484985C9B2EBEFB5FC575437385B7AD2B8B29B",
    "iso_all_forest_n4_bundle_induction_independent_audit_bundle_g12_20260829.json":
        "0D341C165A35835F08DE48852540FBD3B83BC133CB0871F9930B862D0C3B1B21",
    "prove_iso_n4_bundle_g1_high_motif_payment_agent.py":
        "EFA556B26EA4C98E2F9170974D655FA0FF5292536643315965875ED710A891B1",
    "iso_n4_bundle_g1_high_motif_payment_exact_agent_20260829.json":
        "40B28EFE5DD51C230F1442553274986D9EA402F71B6CD182F6109DCA926D2D0D",
    "audit_iso_n4_bundle_g12_endpoint_parent_independent_g1_bernstein.py":
        "DE8A182E15D9624E3C2F492C177F94AD66064DD2BC8D9048C6026A5F7B3CB363",
    "iso_n4_bundle_g12_endpoint_parent_independent_audit_g1_bernstein_20260829.json":
        "6BD3EEA426C08AA1C65DCC0A5EB74635A7849BA7011BA8C6AB60BD2ADC74CE05",
    "prove_iso_n5_disconnected_m5_sum16_q1_active_root_g1_nonadjacent.py":
        "D911393AB0C386CC8CEAE2F3C78A34430F76307EB5BF298FCEB4E06374C37489",
    "prove_iso_n5_c5_disconnected_nonadjacent_g1_nonadjacent.py":
        "DD1112EC4A72A9DA18979084D03462AC0073E8C86927E3306142171E39134A05",
    "probe_iso_leaf_cross_remainder_root.py":
        "A9C643C3A223E004365E5013A2433517BC60073D1B230D92477FFDC7E3B6A5F1",
}


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def at(row, rank):
    return row[rank] if 0 <= rank < len(row) else 0


def block(A, B):
    return A[2] * B[3] - 2 * A[3] * B[2] + A[4] * B[1]


def n4_deleted(U, W):
    """The exact all-forest N4 row form, with W=I(T-v)."""
    return sp.expand(
        2 * U[2] * W[2] - U[2] * W[3] - 5 * U[2] * W[4]
        + 2 * U[3] * W[1] + 2 * U[3] * W[2] + 3 * U[3] * W[3]
        - U[4] * W[1] + 3 * U[4] * W[2] - 5 * U[5] * W[1]
        - W[1] * W[4] + W[2] * W[3]
    )


def residual(U, W, QE, QV):
    return sp.expand(n4_deleted(U, W) + block(QE, W) + block(U, QV))


def padded(row, maximum=5):
    return tuple(at(row, rank) for rank in range(maximum + 1))


def deleted(graph: nx.Graph, vertices) -> tuple[int, ...]:
    reduced = graph.copy()
    reduced.remove_nodes_from(vertices)
    return padded(poly_forest(reduced))


def finite_certificate():
    """Literal direct-row census on all forests through order 12."""
    digest = hashlib.sha256()
    total_forests = total_cells = 0
    global_minimum = None
    witness = None
    orders = {}
    for order in range(2, 13):
        forest_count = cells = 0
        order_minimum = None
        for forest_index, graph in enumerate(forest_graphs(order)):
            graph = nx.convert_node_labels_to_integers(graph)
            forest_count += 1
            vertices = tuple(graph.nodes())
            whole = padded(poly_forest(graph))
            one = {vertex: deleted(graph, (vertex,)) for vertex in vertices}
            two = {
                (left, right): deleted(graph, (left, right))
                for left in vertices for right in vertices if left < right
            }
            component = {
                vertex: index
                for index, members in enumerate(nx.connected_components(graph))
                for vertex in members
            }
            for r in vertices:
                for v in vertices:
                    if r == v or component[r] != component[v]:
                        continue
                    value = int(residual(
                        whole,
                        one[v],
                        one[r],
                        two[tuple(sorted((r, v)))],
                    ))
                    digest.update(f"{order},{forest_index},{r},{v},{value}\n".encode())
                    if value < 0:
                        raise AssertionError(("negative finite q=1 cell", order, forest_index, r, v, value))
                    cells += 1
                    if order_minimum is None or value < order_minimum:
                        order_minimum = value
                    if global_minimum is None or value < global_minimum:
                        global_minimum = value
                        witness = {
                            "order": order,
                            "forest_index": forest_index,
                            "graph6": nx.to_graph6_bytes(graph, header=False).decode().strip(),
                            "r": r,
                            "v": v,
                            "value": value,
                        }
        assert forest_count == KNOWN_FOREST_COUNTS[order]
        orders[str(order)] = {
            "forests": forest_count,
            "ordered_same_component_pairs": cells,
            "minimum": order_minimum,
        }
        total_forests += forest_count
        total_cells += cells
        print("FINITE", order, forest_count, cells, order_minimum, flush=True)
    assert total_forests == 2947
    assert total_cells == 234_560
    assert digest.hexdigest().upper() == "8315DD06E67ABA329AB066B88B1597A53D04D9C056F0C7FE47E08CBF2CF11A11"
    return {
        "orders": orders,
        "forests": total_forests,
        "cells": total_cells,
        "minimum": global_minimum,
        "minimum_witness": witness,
        "value_stream_hash": digest.hexdigest().upper(),
    }


def motif_residual():
    """Derive F and the exact lower expression used by all large branches."""
    n, e, du, dv, adjacent = sp.symbols("n e du dv adjacent")
    common, re, ru, rv, q35, r4, xu, xv, wedges = sp.symbols(
        "common re ru rv q35 r4 xu xv wedges"
    )
    eu, ev = e - du, e - dv
    ew = e - du - dv + adjacent
    wu = wedges - choose(du, 2) - xu
    wv = wedges - choose(dv, 2) - xv
    ww = (
        wedges - choose(du, 2) - choose(dv, 2) - xu - xv
        + adjacent * (du + dv - 2) + common
    )
    U = (
        1, n, i2(n, e), i3(n, e, wedges), i4(n, e, wedges, re),
        i5(n, e, wedges, re, q35, r4),
    )
    QE = (
        1, n - 1, i2(n - 1, eu), i3(n - 1, eu, wu),
        i4(n - 1, eu, wu, ru), 0,
    )
    W = (
        1, n - 1, i2(n - 1, ev), i3(n - 1, ev, wv),
        i4(n - 1, ev, wv, rv), 0,
    )
    QV = (1, n - 2, i2(n - 2, ew), i3(n - 2, ew, ww), 0, 0)
    exact = residual(U, W, QE, QV)

    expected_high = sp.expand(
        (6 * (e - dv) + 7 * n**2 - 41 * n + 36) * re / 2
        - (n - 1) * ru
        + (-10 * e + 5 * n**2 - 3 * n - 2) * rv / 2
        + 5 * (n - 1) * q35 - 5 * (n - 1) * r4
    )
    nonhigh = exact.subs({re: 0, ru: 0, rv: 0, q35: 0, r4: 0})
    assert sp.expand(exact - nonhigh - expected_high) == 0

    # The xu coefficient is nonpositive for n>=8, while the common-neighbour
    # coefficient is nonnegative.  Use xu<=e-du and common>=0.
    k_xu = sp.factor(sp.diff(nonhigh, xu))
    k_common = sp.factor(sp.diff(nonhigh, common))
    assert sp.expand(k_xu - (4 * dv - 2 * e - n**2 + 7 * n - 6) / 2) == 0
    assert sp.expand(k_common - (n**2 - n - 2 * e) / 2) == 0
    reduced = sp.expand(nonhigh.subs({xu: e - du, common: 0}))

    # Multiply the universal high-motif payment by n-1, then use ru<=re.
    coefficient_re = sp.factor(
        (6 * (e - dv) + 3 * n**2 - 23 * n + 22) / 2
    )
    coefficient_rv = sp.factor((-10 * e + 5 * n**2 - 3 * n - 2) / 2)
    # On n>=13, coefficient_re is positive because e-dv>=0 and
    # 3n^2-23n+22 is increasing and positive from n=13.  Also e<=n-1,
    # so coefficient_rv is at least (5n^2-13n+8)/2, likewise positive.
    t_positive = sp.symbols("t_positive", nonnegative=True)
    assert all(value > 0 for _, value in sp.Poly(
        (3 * n**2 - 23 * n + 22).subs(n, 13 + t_positive), t_positive
    ).terms())
    assert all(value > 0 for _, value in sp.Poly(
        (5 * n**2 - 13 * n + 8).subs(n, 13 + t_positive), t_positive
    ).terms())
    assert sp.expand(
        (4 * e - 2 * e - n**2 + 7 * n - 6).subs(e, n - 1)
        + (n - 1) * (n - 8)
    ) == 0
    assert sp.expand(
        (n**2 - n - 2 * e).subs(e, n - 1) - (n - 1) * (n - 2)
    ) == 0
    paid_high = sp.expand(
        coefficient_re * re + (n - 1) * (re - ru)
        + coefficient_rv * rv + 3 * (n - 1) * r4
    )
    assert sp.expand(
        expected_high - paid_high
        - (n - 1) * (2 * (n - 4) * re + 5 * q35 - 8 * r4)
    ) == 0

    # Smooth star moment and global R4 floors.  The rv floor is only used
    # when ev>=2; the special ev=0,1 branches are treated separately.
    star3 = 2 * wedges * (wedges - e + 1) / (3 * (e - 1))
    star3_v = 2 * wv * (wv - ev + 1) / (3 * (ev - 1))
    degree_floor = 2 * wedges / (e - 1)
    r4_floor = degree_floor**3 * (degree_floor - 3) / 108
    z = sp.symbols("z", nonnegative=True)
    assert all(value >= 0 for _, value in sp.Poly(
        ((z - 1) * (z - 2) - 2 * z**2 / 9).subs(z, 3 + t_positive),
        t_positive,
    ).terms())
    local_r_star = choose(du, 3)
    lower_main = sp.together(
        reduced + coefficient_re * star3 + (n - 1) * local_r_star
        + coefficient_rv * star3_v + 3 * (n - 1) * r4_floor
    )
    lower_ev1 = sp.together(
        reduced + coefficient_re * star3 + (n - 1) * local_r_star
        + 3 * (n - 1) * r4_floor
    )
    symbols = {
        "n": n, "e": e, "du": du, "dv": dv, "adjacent": adjacent,
        "common": common, "re": re, "ru": ru, "rv": rv,
        "q35": q35, "r4": r4, "xu": xu, "xv": xv,
        "wedges": wedges,
    }
    derivation = {
        "exact_power_terms": len(sp.Poly(
            exact, n, e, du, dv, adjacent, common, re, ru, rv,
            q35, r4, xu, xv, wedges,
        ).terms()),
        "exact_polynomial_hash": polynomial_hash(sp.Poly(
            exact, n, e, du, dv, adjacent, common, re, ru, rv,
            q35, r4, xu, xv, wedges,
        )),
        "high_coefficients": {
            "R3_T": str(sp.diff(exact, re)),
            "R3_T_minus_r": str(sp.diff(exact, ru)),
            "R3_T_minus_v": str(sp.diff(exact, rv)),
            "Q35_T": str(sp.diff(exact, q35)),
            "R4_T": str(sp.diff(exact, r4)),
        },
        "endpoint_coefficients": {"xu": str(k_xu), "common": str(k_common)},
    }
    return symbols, lower_main, lower_ev1, derivation


def cone_record(name, expression, variables, cube_count, denominator_assertion):
    numerator, denominator = sp.fraction(sp.factor(expression))
    denominator_assertion(denominator)
    polynomial = sp.Poly(numerator, *variables)
    degrees, rows = tensor_bernstein_sparse(polynomial, cube_count)
    coefficients = [sp.cancel(value) for row in rows for value in row.values()]
    assert coefficients and all(value >= 0 for value in coefficients)
    record = {
        "name": name,
        "positive_denominator": str(sp.factor(denominator)),
        "power_terms": len(polynomial.terms()),
        "power_hash": polynomial_hash(polynomial),
        "cube_degrees": degrees,
        "bernstein_rows": len(rows),
        "coefficients": len(coefficients),
        "minimum": str(min(coefficients)),
        "coefficient_hash": coefficient_rows_hash(rows),
    }
    print("CONE", name, record, flush=True)
    return record


def main_cones(symbols, lower):
    n, e, du, dv = (symbols[key] for key in ("n", "e", "du", "dv"))
    adjacent, xv, wedges = (symbols[key] for key in ("adjacent", "xv", "wedges"))
    t, E, Y, X, V, Z = sp.symbols("t E Y X V Z", nonnegative=True)
    nn = 13 + t
    ev = 2 + (nn - 4) * E
    y = (nn - 2 - ev) * Y
    x = ev * X
    ee = 1 + ev + y
    duu = 1 + x
    dvv = 1 + y
    xvv = ev * V
    wvv = choose(ev, 2) * Z
    ww = choose(dvv, 2) + xvv + wvv
    records = []
    for av in (0, 1):
        expression = lower.subs({
            n: nn, e: ee, du: duu, dv: dvv, adjacent: av,
            xv: xvv, wedges: ww,
        })

        def positive(denominator):
            # All denominators before cancellation are positive because
            # e-1>=2 and ev-1>=1.  The reduced denominator is a positive
            # rational times an even power of a polynomial equal to e-1.
            coefficient, factors = sp.factor_list(denominator)
            assert coefficient > 0
            assert all(exponent % 2 == 0 for _, exponent in factors)

        record = cone_record(
            f"ev_ge_2_adjacent_{av}", expression,
            (t, E, Y, X, V, Z), 5, positive,
        )
        assert record["cube_degrees"] == [8, 8, 3, 4, 4]
        assert record["bernstein_rows"] == 8100
        assert record["coefficients"] == 79000
        assert record["minimum"] == "9/56"
        records.append(record)
    return records


def ev1_cones(symbols, lower):
    n, e, du, dv = (symbols[key] for key in ("n", "e", "du", "dv"))
    adjacent, xv, wedges = (symbols[key] for key in ("adjacent", "xv", "wedges"))
    t, Y, V = sp.symbols("t Y V", nonnegative=True)
    nn = 8 + t
    y = (nn - 3) * Y
    ee = 2 + y
    dvv = 1 + y
    branches = ((0, 0), (1, 0), (1, 1))
    records = []
    for av, x in branches:
        expression = lower.subs({
            n: nn, e: ee, du: 1 + x, dv: dvv, adjacent: av,
            xv: V, wedges: choose(dvv, 2) + V,
        })

        def positive(denominator):
            coefficient, factors = sp.factor_list(denominator)
            assert coefficient > 0
            assert all(exponent % 2 == 0 for _, exponent in factors)

        record = cone_record(
            f"ev_1_adjacent_{av}_du_minus_1_{x}", expression,
            (t, Y, V), 2, positive,
        )
        assert record["cube_degrees"] == [8, 4]
        assert record["bernstein_rows"] == 45
        assert record["coefficients"] == 400
        assert record["minimum"] == "3/10"
        records.append(record)
    return records


def ev0_cone():
    """Exact star-centred-at-v face, not a relaxation."""
    n, e = sp.symbols("n e", nonnegative=True)
    isolates = n - e - 1
    U = tuple(
        choose(n - 1, rank) + (choose(isolates, rank - 1) if rank else 0)
        for rank in range(6)
    )
    QE = tuple(
        choose(n - 2, rank) + (choose(isolates, rank - 1) if rank else 0)
        for rank in range(6)
    )
    W = tuple(choose(n - 1, rank) for rank in range(6))
    QV = tuple(choose(n - 2, rank) for rank in range(6))
    exact = sp.factor(residual(U, W, QE, QV))
    expected_numerator = -(
        5 * e**4 * n - 5 * e**4 - 14 * e**3 * n**2 + 56 * e**3 * n
        - 46 * e**3 + 6 * e**2 * n**3 - 54 * e**2 * n**2
        + 79 * e**2 * n - 19 * e**2 + 5 * e * n**4 - 4 * e * n**3
        + 3 * e * n**2 - 34 * e * n + 22 * e - 7 * n**5
        + 28 * n**4 - 33 * n**3 + 8 * n**2 + 4 * n
    )
    assert sp.expand(exact - expected_numerator / 24) == 0
    t, E = sp.symbols("t E", nonnegative=True)
    nn = 13 + t
    ee = 1 + (nn - 2) * E
    expression = exact.subs({n: nn, e: ee})

    def positive(denominator):
        assert denominator.is_Rational and denominator > 0

    record = cone_record("ev_0_star_at_v", expression, (t, E), 1, positive)
    assert record["cube_degrees"] == [4]
    assert record["bernstein_rows"] == 5
    assert record["coefficients"] == 30
    assert record["minimum"] == "7/2"
    return record


def main():
    assert {name: sha(HERE / name) for name in PINS} == PINS
    corrected = json.loads((HERE / "iso_n5_g1_singleton_endpoint_corrected_residual_exact_g1_nonadjacent_20260830.json").read_text())
    scalar = json.loads((HERE / "iso_n5_s_all_marked_forests_exact_root_20260830.json").read_text())
    n4 = json.loads((HERE / "iso_all_forest_n4_bundle_induction_exact_root_20260829.json").read_text())
    motif = json.loads((HERE / "iso_n4_bundle_g1_high_motif_payment_exact_agent_20260829.json").read_text())
    audit = json.loads((HERE / "iso_n4_bundle_g12_endpoint_parent_independent_audit_g1_bernstein_20260829.json").read_text())
    assert corrected["marker"].startswith("DERIVED_EXACT")
    assert scalar["marker"].startswith("PASS_EXACT")
    assert n4["marker"].startswith("PASS_EXACT")
    assert motif["marker"] == "PASS_EXACT_ISO_N4_BUNDLE_G1_HIGH_MOTIF_PAYMENT_AGENT"
    assert audit["marker"] == "PASS_INDEPENDENT_EXACT_ISO_N4_BUNDLE_G12_ENDPOINT_PARENT_G1_G2_AUDIT_G1_BERNSTEIN"

    finite = finite_certificate()
    symbols, lower_main, lower_ev1, derivation = motif_residual()
    main_records = main_cones(symbols, lower_main)
    ev1_records = ev1_cones(symbols, lower_ev1)
    ev0_record = ev0_cone()
    records = [ev0_record, *ev1_records, *main_records]
    total_rows = sum(record["bernstein_rows"] for record in records)
    total_coefficients = sum(record["coefficients"] for record in records)
    assert len(records) == 6 and total_rows == 16_340 and total_coefficients == 159_230
    record_stream = hashlib.sha256(
        "\n".join(json.dumps(record, sort_keys=True, separators=(",", ":")) for record in records).encode()
    ).hexdigest().upper()

    report = {
        "marker": MARKER,
        "theorem": "Rank-five g1 is nonnegative on the complete connected-nonadjacent singleton_endpoint q=1 face p=u; p=v follows by symmetry.",
        "corrected_identity": "g1=S(C)+N4(C)+F, F=N4(D)+B(QE,W)+B(U,QV), B(A,B)=a2*b3-2a3*b2+a4*b1",
        "q1_geometry": "u has the sole neighbour r. With T=G-u, r and v are distinct vertices in one component and U=I(T), W=I(T-v), QE=I(T-r), QV=I(T-r-v). Conversely every such (T,r,v) realizes this face after adjoining leaf u at r.",
        "finite": finite,
        "motif_derivation": derivation,
        "exact_inequalities": {
            "high_motif": "2(n-4)R3+5Q35-5R4>=3R4, multiplied by n-1.",
            "deletion": "R3(T)-R3(T-r)>=C(deg(r),3).",
            "star_moment": "For e>=2, S3=sum C(d,3)>=2W(W-e+1)/(3(e-1)). Put y=max(d-1,0), R=sum y<=e-1; Cauchy gives sum y^3>=(sum y^2)^2/R and the resulting lower bound decreases in R.",
            "R4_floor": "With x=2W/(e-1), max degree>=x and R4>=sum C(d,4)>=C(max degree,4)>=x^3(x-3)/108 for x>=3; for x<=3 the last expression is nonpositive.",
            "endpoint_reductions": "For n>=8, coeff(xu)<=-(n-1)(n-8)/2<=0 and xu<=e-du; coeff(common)>=(n-1)(n-2)/2>=0 and common>=0.",
        },
        "large_order": {
            "threshold": "n>=13 (the ev=1 certificate is valid already for n>=8)",
            "branches": len(records),
            "bernstein_rows": total_rows,
            "coefficients": total_coefficients,
            "branch_record_hash": record_stream,
            "records": records,
            "coverage": {
                "ev_0": "T-v has no edge, so T is a star centred at v plus isolates; exact one-variable certificate.",
                "ev_1": "Three exhaustive integer possibilities: (adj(r,v),deg(r)-1)=(0,0),(1,0),(1,1).",
                "ev_ge_2": "ev=2+(n-4)E; dv-1=(n-2-ev)Y; du-1=ev X; xv=ev V; Wv=C(ev,2)Z, with every cube variable in [0,1], and adjacency 0/1.",
            },
        },
        "sign_payment": "The finite census covers n<=12. The six exact cones cover n>=13, so F>=0 on the entire q=1 face. Universal S(C)>=0 and all-forest N4(C)>=0 are pinned; therefore g1>=0.",
        "dependencies_sha256": PINS,
        "scope": "Exactly the connected-nonadjacent singleton_endpoint mode p=u with q=deg_G(u)=1, and p=v by symmetry. The same mode with q>=2, other canonical modes, g2, all N5, and Problem 993 are not claimed.",
        "source_sha256": sha(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "finite": finite,
        "large_order": {key: value for key, value in report["large_order"].items() if key != "records"},
        "scope": report["scope"],
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
