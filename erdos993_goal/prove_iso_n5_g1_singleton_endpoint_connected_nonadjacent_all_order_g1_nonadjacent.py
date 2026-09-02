#!/usr/bin/env python3
"""Exact all-order g1 theorem for connected nonadjacent singleton endpoints.

Take the canonical endpoint p=u, with u and v nonadjacent in one component.
After deleting u, let r be the neighbour of u in the component containing v.
Deepestness forces every other u-child component to be a centred star.  Put

    A=I(T), B=I(T-v), C=I(T-r), D=I(T-r-v),
    F_d=(1+x)^d+x, L_d=(1+x)^d,
    P=product F_d, H=product L_d.

Here T contains the r-v component and every component not incident with u.
The corrected endpoint rows are

    U=AP, W=BP, QE=CH, QV=DH,

and the only residual obligation is

    R=N4(U,W)+B(QE,W)+B(U,QV).

R has total degree at most five in all star degrees.  Its exact multivariate
Newton expansion reduces an arbitrary star system to 63 raw, 45 unique rows
on the rooted deletion square (A,B,C,D).  This program proves all 45 rows:
literal census through order 12, then exact forest-motif/Bernstein cones for
all larger orders.  Row zero is exactly the separately frozen q=1 theorem.
"""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

import networkx as nx
import sympy as sp

from audit_iso_n4_bundle_g12_endpoint_parent_independent_g1_bernstein import choose
from probe_iso_leaf_cross_remainder_root import poly_forest
from probe_iso_n5_g1_singleton_endpoint_connected_qge2_newton_cones_g1_nonadjacent import (
    certificate,
    ev0_expression,
    lower_rows,
)
from probe_iso_n5_g1_singleton_endpoint_connected_qge2_newton_rows_g1_nonadjacent import (
    collect_rows,
)
from prove_iso_n5_c5_disconnected_nonadjacent_g1_nonadjacent import forest_graphs
from prove_iso_n5_g1_singleton_endpoint_connected_nonadjacent_q1_all_order_g1_nonadjacent import at


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g1_singleton_endpoint_connected_nonadjacent_all_order_exact_g1_nonadjacent_20260830.json"
MARKER = "PASS_EXACT_ISO_N5_G1_SINGLETON_ENDPOINT_CONNECTED_NONADJACENT_ALL_ORDER_G1_NONADJACENT"
KNOWN_FOREST_COUNTS = {
    2: 2, 3: 3, 4: 6, 5: 10, 6: 20, 7: 37,
    8: 76, 9: 153, 10: 329, 11: 710, 12: 1601,
}
EXPECTED_ROW_MINIMA = [
    0, 4, 50, 137, 136, 45, 12, 102, 238, 199, 56, 54, 159, 161, 51,
    108, 115, 41, 89, 33, 30, 174, 373, 269, 66, 245, 212, 59, 148, 47,
    38, 157, 50, 37, 561, 341, 74, 270, 65, 52, 55, 419, 80, 70, 85,
]
EXPECTED_FINITE_STREAM_HASH = "26CA9E0DE48932337C170C6DFEFB9BA7AD8CF64123477E58E7DA06B180195925"
EXPECTED_LARGE_RECORD_HASH = "462D50D8D171289CC878DAA3E829F2698611816C610B68478B93AA291C7AB804"
EXPECTED_LARGE_TOTALS = {
    "bernstein_rows": 43_611,
    "coefficients": 384_079,
    "power_terms": 22_187,
    "minimum": sp.Rational(2, 21),
}
PINS = {
    "derive_iso_n5_g1_singleton_endpoint_corrected_residual_g1_nonadjacent.py":
        "8100E7B132606481575C681088C30F8B7D6308E670162AC3B96E5C92982C6C89",
    "iso_n5_g1_singleton_endpoint_corrected_residual_exact_g1_nonadjacent_20260830.json":
        "5E277A78168DE1978C9AACD6AFF12F55A624F4D8CCF4017CA290406106A3C3B1",
    "prove_iso_n5_g1_singleton_endpoint_connected_nonadjacent_q1_all_order_g1_nonadjacent.py":
        "294BA12923A399C5833E50A7CE0441CAD09839081D2AC20585EFF67276E35FFE",
    "iso_n5_g1_singleton_endpoint_connected_nonadjacent_q1_all_order_exact_g1_nonadjacent_20260830.json":
        "88C1E88C06F9C9E4A3B715E436333B4FF8675322852BCAA89BD01988A379E866",
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
    "probe_iso_n5_g1_singleton_endpoint_connected_qge2_newton_rows_g1_nonadjacent.py":
        "94431A1055F620AE99C1709EC669BCC9BED655579EA7E7BD576F0FEE51356814",
    "probe_iso_n5_g1_singleton_endpoint_connected_qge2_newton_motifs_g1_nonadjacent.py":
        "F4D6E15C3978824B04C71B9E20589DE46B322A4877DB57C3619723C25C980543",
    "probe_iso_n5_g1_singleton_endpoint_connected_qge2_newton_cones_g1_nonadjacent.py":
        "32656B06A76B70B674727C1B906ACD252A27D81112145BD8E22056A46D992849",
    "prove_iso_n5_disconnected_m5_sum16_q1_active_root_g1_nonadjacent.py":
        "D911393AB0C386CC8CEAE2F3C78A34430F76307EB5BF298FCEB4E06374C37489",
    "prove_iso_n5_c5_disconnected_nonadjacent_g1_nonadjacent.py":
        "DD1112EC4A72A9DA18979084D03462AC0073E8C86927E3306142171E39134A05",
    "probe_iso_leaf_cross_remainder_root.py":
        "A9C643C3A223E004365E5013A2433517BC60073D1B230D92477FFDC7E3B6A5F1",
}


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def delete_row(graph, vertices):
    reduced = graph.copy()
    reduced.remove_nodes_from(vertices)
    row = poly_forest(reduced)
    return tuple(at(row, rank) for rank in range(6))


def finite_certificate(base, unique):
    rows = list(unique)
    variables = tuple(symbol for row in base for symbol in row[1:])
    evaluator = sp.lambdify(variables, rows, modules="math", cse=True)
    digest = hashlib.sha256()
    minima = [None] * len(rows)
    witnesses = [None] * len(rows)
    orders = {}
    total_forests = total_cells = 0
    for order in range(2, 13):
        forests = cells = 0
        order_minimum = None
        for forest_index, graph in enumerate(forest_graphs(order)):
            graph = nx.convert_node_labels_to_integers(graph)
            forests += 1
            A = delete_row(graph, ())
            one = {vertex: delete_row(graph, (vertex,)) for vertex in graph}
            pair = {
                (left, right): delete_row(graph, (left, right))
                for left in graph for right in graph if left < right
            }
            component = {
                vertex: index
                for index, members in enumerate(nx.connected_components(graph))
                for vertex in members
            }
            for r in graph:
                for v in graph:
                    if r == v or component[r] != component[v]:
                        continue
                    square = (A, one[v], one[r], pair[tuple(sorted((r, v)))])
                    args = tuple(value for row in square for value in row[1:])
                    values = tuple(int(value) for value in evaluator(*args))
                    if min(values) < 0:
                        bad = next(index for index, value in enumerate(values) if value < 0)
                        raise AssertionError(("negative finite Newton row", order, forest_index, r, v, bad, values[bad]))
                    digest.update((f"{order},{forest_index},{r},{v}," + ",".join(map(str, values)) + "\n").encode())
                    for index, value in enumerate(values):
                        if minima[index] is None or value < minima[index]:
                            minima[index] = value
                            witnesses[index] = {
                                "order": order, "forest_index": forest_index,
                                "r": r, "v": v, "value": value,
                            }
                    local = min(values)
                    order_minimum = local if order_minimum is None else min(order_minimum, local)
                    cells += 1
        assert forests == KNOWN_FOREST_COUNTS[order]
        orders[str(order)] = {"forests": forests, "cells": cells, "minimum": order_minimum}
        total_forests += forests
        total_cells += cells
        print("FINITE", order, forests, cells, order_minimum, flush=True)
    assert total_forests == 2947 and total_cells == 234_560
    assert minima == EXPECTED_ROW_MINIMA
    stream_hash = digest.hexdigest().upper()
    assert stream_hash == EXPECTED_FINITE_STREAM_HASH
    return {
        "orders": orders,
        "forests": total_forests,
        "cells": total_cells,
        "rows": len(rows),
        "row_checks": total_cells * len(rows),
        "minimum": min(minima),
        "row_minima": minima,
        "row_minimum_witnesses": witnesses,
        "value_stream_hash": stream_hash,
    }


def structural_denominator(expression, e, dv, ev1=False):
    denominator = sp.factor(sp.denom(sp.together(expression)))
    coefficient, factors = sp.factor_list(denominator)
    assert coefficient > 0
    allowed = (e - 1,) if ev1 else (e - 1, e - dv - 1)
    for factor, exponent in factors:
        assert exponent >= 1
        assert any(sp.expand(factor - expected) == 0 for expected in allowed)
    return str(denominator)


def large_certificate(base, unique, symbols, lowers):
    n, e, du, dv, adjacent, common, re, ru, rv, q35, r4, xu, xv, wedges = symbols
    t, E, Y, X, V, Z = sp.symbols("t E Y X V Z", nonnegative=True)
    nn = 13 + t
    ev = 2 + (nn - 4) * E
    y = (nn - 2 - ev) * Y
    x = ev * X
    ee, duu, dvv = 1 + ev + y, 1 + x, 1 + y

    records = []
    digest = hashlib.sha256()
    total_rows = total_coefficients = total_power_terms = 0
    global_minimum = None
    for item in lowers:
        index = item["index"]
        if item.get("status") == "PINNED_Q1":
            record = {
                "row": index,
                "origin": list(item["origin"]),
                "status": "PINNED_Q1_ALL_ORDER_THEOREM",
                "source_sha256": PINS["prove_iso_n5_g1_singleton_endpoint_connected_nonadjacent_q1_all_order_g1_nonadjacent.py"],
                "report_sha256": PINS["iso_n5_g1_singleton_endpoint_connected_nonadjacent_q1_all_order_exact_g1_nonadjacent_20260830.json"],
            }
            records.append(record)
            digest.update((json.dumps(record, sort_keys=True, separators=(",", ":")) + "\n").encode())
            continue

        original_main_denominator = structural_denominator(item["main"], e, dv)
        original_ev1_denominator = structural_denominator(item["ev1"], e, dv, ev1=True)
        branch_records = []
        for av in (0, 1):
            branch_xv = 1 + (ev - 1) * V if av == 0 else ev * V
            expression = item["main"].subs({
                n: nn, e: ee, du: duu, dv: dvv, adjacent: av,
                xv: branch_xv,
                wedges: choose(dvv, 2) + branch_xv + choose(ev, 2) * Z,
            })
            branch_records.append(certificate(
                f"row_{index}_ev_ge_2_adj_{av}", expression,
                (t, E, Y, X, V, Z), 5,
            ))

        y1 = (nn - 3) * Y
        e1, dv1 = 2 + y1, 1 + y1
        for av, xx in ((0, 0), (1, 0), (1, 1)):
            branch_xv = 1 if (av == 0 or xx == 1) else V
            expression = item["ev1"].subs({
                n: nn, e: e1, du: 1 + xx, dv: dv1, adjacent: av,
                xv: branch_xv, wedges: choose(dv1, 2) + branch_xv,
            })
            branch_records.append(certificate(
                f"row_{index}_ev_1_adj_{av}_x_{xx}", expression,
                (t, Y, V), 2,
            ))

        original_row = list(unique)[index]
        n0, e0, expression0 = ev0_expression(base, original_row)
        branch_records.append(certificate(
            f"row_{index}_ev_0",
            expression0.subs({n0: nn, e0: 1 + (nn - 2) * E}),
            (t, E), 1,
        ))
        assert len(branch_records) == 6
        record = {
            "row": index,
            "origin": list(item["origin"]),
            "structural_positive_denominators": {
                "ev_ge_2": original_main_denominator,
                "ev_1": original_ev1_denominator,
            },
            "high_coefficients": {name: str(value) for name, value in item["high"].items()},
            "branches": branch_records,
        }
        records.append(record)
        digest.update((json.dumps(record, sort_keys=True, separators=(",", ":")) + "\n").encode())
        total_rows += sum(branch["rows"] for branch in branch_records)
        total_coefficients += sum(branch["coefficients"] for branch in branch_records)
        total_power_terms += sum(branch["power_terms"] for branch in branch_records)
        local_minimum = min(sp.Rational(branch["minimum"]) for branch in branch_records)
        global_minimum = local_minimum if global_minimum is None else min(global_minimum, local_minimum)
    assert len(records) == 45
    record_hash = digest.hexdigest().upper()
    assert record_hash == EXPECTED_LARGE_RECORD_HASH
    assert {
        "bernstein_rows": total_rows,
        "coefficients": total_coefficients,
        "power_terms": total_power_terms,
        "minimum": global_minimum,
    } == EXPECTED_LARGE_TOTALS
    return {
        "threshold": "base order n>=13",
        "newton_rows": len(records),
        "pinned_q1_rows": 1,
        "new_large_rows": 44,
        "branches": 44 * 6,
        "bernstein_rows": total_rows,
        "coefficients": total_coefficients,
        "power_terms": total_power_terms,
        "minimum": str(global_minimum),
        "record_hash": record_hash,
        "rows": records,
    }


def main():
    assert {name: sha(HERE / name) for name in PINS} == PINS
    q1 = json.loads((HERE / "iso_n5_g1_singleton_endpoint_connected_nonadjacent_q1_all_order_exact_g1_nonadjacent_20260830.json").read_text())
    corrected = json.loads((HERE / "iso_n5_g1_singleton_endpoint_corrected_residual_exact_g1_nonadjacent_20260830.json").read_text())
    scalar = json.loads((HERE / "iso_n5_s_all_marked_forests_exact_root_20260830.json").read_text())
    n4 = json.loads((HERE / "iso_all_forest_n4_bundle_induction_exact_root_20260829.json").read_text())
    assert q1["marker"] == "PASS_EXACT_ISO_N5_G1_SINGLETON_ENDPOINT_CONNECTED_NONADJACENT_Q1_ALL_ORDER_G1_NONADJACENT"
    assert corrected["marker"].startswith("DERIVED_EXACT")
    assert scalar["marker"].startswith("PASS_EXACT") and n4["marker"].startswith("PASS_EXACT")

    base, unique, raw_rows = collect_rows()
    assert raw_rows == 63 and len(unique) == 45
    origins = [
        {"row": index, "active_stars": origin[0], "newton_index": list(origin[1])}
        for index, origin in enumerate(unique.values())
    ]
    finite = finite_certificate(base, unique)
    symbols, lowers = lower_rows(base, unique)
    large = large_certificate(base, unique, symbols, lowers)

    report = {
        "marker": MARKER,
        "theorem": "Rank-five g1 is nonnegative in the entire connected-nonadjacent singleton_endpoint mode p=u; p=v follows by symmetry.",
        "corrected_identity": "g1=S(C)+N4(C)+R; R=N4(U,W)+B(QE,W)+B(U,QV).",
        "canonical_geometry": {
            "base_square": "A=I(T), B=I(T-v), C=I(T-r), D=I(T-r-v), with r,v in one component of the arbitrary forest T.",
            "extra_stars": "Every other u-child component is a centred star by maximum-depth support selection. For F_d=(1+x)^d+x and L_d=(1+x)^d, P=product F_d, H=product L_d and (U,W,QE,QV)=(AP,BP,CH,DH).",
            "converse": "Every such rooted square and finite centred-star system is realized by adjoining u to r and to the star centres.",
        },
        "newton_reduction": {
            "total_degree": 5,
            "argument": "Expand simultaneously in every star degree. A term with positive finite-difference index on m stars has m<=5; every other star is evaluated at degree zero and contributes F_0=1+x,L_0=1, so it is counted by K. Expanding K in the Newton basis yields nonnegative binomial weights times the 63 raw rows. Global deduplication leaves 45 unique rows.",
            "active_counts": [0, 1, 2, 3, 4, 5],
            "raw_rows": raw_rows,
            "unique_rows": len(unique),
            "origins": origins,
        },
        "finite": finite,
        "large": large,
        "motif_payment": {
            "active_rows": [0, 1, 2, 6, 7, 11, 21],
            "high_layer": "For each motif-active row, cq35=-cR4=5 lambda. Apply lambda times 2(n-4)R3+5Q35-5R4>=3R4, then R3(T)-R3(T-r)>=C(du,3), the exact star-moment floors for T and T-v, and the global R4 degree floor. All remaining rows have no rank-3/rank-4 forest motifs.",
            "endpoint_signs": "The only xu/common endpoint rows are 1,2,6,7,11,21; their exact derivatives select xu=0 or e-du and common=0. Every other new row is independent of xu and common.",
        },
        "geometry_partition": {
            "ev_ge_2": "ev=e-dv=2+(n-4)E; dv-1=(n-2-ev)Y; du-1=ev X; Wv=C(ev,2)Z. If r,v are nonadjacent then xv=1+(ev-1)V; if adjacent then xv=ev V.",
            "ev_1": "Exactly (adj(r,v),du-1)=(0,0),(1,0),(1,1). In the first and third branches xv=1; in the middle xv is in [0,1].",
            "ev_0": "T-v is edgeless, so T is a star centred at v plus isolates; evaluated exactly.",
        },
        "sign_payment": "Every Newton row is nonnegative on every rooted forest square. Hence R is a nonnegative sum with binomial weights. Universal S(C)>=0 and all-forest N4(C)>=0 are pinned, so g1>=0.",
        "dependencies_sha256": PINS,
        "scope": "Exactly all connected nonadjacent singleton_endpoint configurations p=u, and p=v by symmetry, with any number of extra u-child star components and arbitrary unrelated forest components. Adjacent/disconnected endpoint placements are separate frozen theorems. Other canonical modes, g2, all N5, and Problem 993 are not claimed.",
        "source_sha256": sha(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "newton": report["newton_reduction"],
        "finite": {key: value for key, value in finite.items() if key not in ("orders", "row_minimum_witnesses")},
        "large": {key: value for key, value in large.items() if key != "rows"},
        "scope": report["scope"],
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
