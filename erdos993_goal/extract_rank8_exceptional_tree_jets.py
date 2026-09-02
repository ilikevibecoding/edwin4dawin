#!/usr/bin/env python3
"""Extract the exact finite exceptional connected-tree jets for rank eight.

A factor is exceptional exactly when alpha<=7 or Q8<0.  Bipartiteness and
the exact no-negative reports reduce the actual extraction to tree orders
through 16; the remaining alpha=9..13 cells are discharged by the existing
forest census, the six-cell matching quotient, and the alpha-13 boundary.
"""

from __future__ import annotations

import csv
import hashlib
import json
from pathlib import Path

import networkx as nx

from scan_forest_iso_reserve_floor import tree_polynomial


ROOT = Path(__file__).resolve().parent
FINITE = ROOT / "rank8_q8_forest_polynomials_through_n20_exact_20260816.json"
QUOTIENT = ROOT / "rank8_exceptional_core_q8_matching_quotient_exact_20260820.json"
BOUNDARY = ROOT / "rank8_pgc_matching_quotient_boundary_exact_20260817.json"
TSV = ROOT / "rank8_exceptional_tree_jets_exact_20260820.tsv"
REPORT = ROOT / "rank8_exceptional_tree_jets_exact_20260820.json"
TREE_COUNTS = (1,1,1,2,3,6,11,23,47,106,235,551,1301,3159,7741,19320)


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def padded(polynomial: tuple[int, ...]) -> tuple[int, ...]:
    return tuple(polynomial[:10])+(0,)*max(0,10-len(polynomial))


def q8(polynomial: tuple[int, ...]) -> int:
    p = padded(polynomial)
    return 16*p[8]*p[8]-p[7]*p[8]-18*p[7]*p[9]


def main() -> None:
    finite = json.loads(FINITE.read_text(encoding="utf-8"))
    quotient = json.loads(QUOTIENT.read_text(encoding="utf-8"))
    boundary = json.loads(BOUNDARY.read_text(encoding="utf-8"))
    assert finite["status"] == "PASS_EXACT_Q8_FOREST_POLYNOMIAL_CENSUS_THROUGH_ORDER_20"
    assert quotient["status"] == "PASS_EXACT_RANK8_EXCEPTIONAL_CORE_Q8_MATCHING_QUOTIENT_SIX_CELLS"
    assert quotient["totals"]["q8_negative_with_multiplicity"] == 0
    assert boundary["status"] == "PASS_PROOF_RANK8_PGC_ALPHA13_ALPHA14_BOUNDARY_ALL_FORESTS"
    assert all(row["q_negative"] == 0 for row in boundary["cells"] if row["alpha"] == 13)

    # The order-20 report checks every forest row for alpha>=9 and records
    # every negative.  Only alpha=9 at orders 15,16 occurs.
    assert finite["negative_rows_all_alphas"] == {"9":18}
    assert set(finite["negative_rows_by_order_alpha"]) == {
        "n=15,alpha=9", "n=16,alpha=9"
    }
    finite_negative = {
        (row["alpha"],tuple(row["polynomial"][:10]))
        for row in finite["negative_rows"]
    }

    occurrences = 0
    exceptional_occurrences = 0
    negative_occurrences = 0
    distinct = set()
    by_order = []
    for order in range(1,17):
        trees = [nx.empty_graph(1)] if order == 1 else nx.nonisomorphic_trees(order)
        count = local_exceptional = local_negative = 0
        for tree in trees:
            count += 1
            polynomial = tree_polynomial(tree)
            alpha = len(polynomial)-1
            jet = padded(polynomial)
            value = q8(jet)
            is_exceptional = alpha <= 7 or value < 0
            if value < 0:
                local_negative += 1
                if alpha >= 9:
                    assert (alpha,jet) in finite_negative
            if is_exceptional:
                local_exceptional += 1
                distinct.add((alpha,jet,value))
        assert count == TREE_COUNTS[order-1]
        occurrences += count
        exceptional_occurrences += local_exceptional
        negative_occurrences += local_negative
        by_order.append({
            "order":order,"trees":count,
            "exceptional_occurrences":local_exceptional,
            "negative_Q8_occurrences":local_negative,
        })
        print(order,count,local_exceptional,local_negative,flush=True)

    rows = sorted(distinct)
    with TSV.open("w",newline="",encoding="utf-8") as handle:
        fields = ["alpha",*(f"i{rank}" for rank in range(10)),"q8"]
        writer = csv.DictWriter(handle,fieldnames=fields,delimiter="\t")
        writer.writeheader()
        for alpha,jet,value in rows:
            writer.writerow({
                "alpha":alpha, **{f"i{rank}":jet[rank] for rank in range(10)}, "q8":value,
            })

    alpha_counts = {}
    negative_distinct = 0
    for alpha,_,value in rows:
        alpha_counts[str(alpha)] = alpha_counts.get(str(alpha),0)+1
        negative_distinct += value < 0
    payload = {
        "schema":"rank8-exceptional-tree-jets-v1",
        "status":"PASS_EXACT_RANK8_EXCEPTIONAL_CONNECTED_TREE_JET_CLASSIFICATION",
        "definition":"alpha<=7 or Q8<0; jets store alpha and i0..i9",
        "streamed_tree_orders":[1,16],
        "streamed_tree_occurrences":occurrences,
        "exceptional_occurrences":exceptional_occurrences,
        "distinct_exceptional_jets":len(rows),
        "negative_Q8_occurrences":negative_occurrences,
        "distinct_negative_Q8_jets":negative_distinct,
        "distinct_by_alpha":alpha_counts,
        "by_order":by_order,
        "all_order_closure":{
            "alpha_at_most_7":"bipartiteness forces order<=14, included in the stream",
            "alpha_8":"bipartiteness forces order<=16, included in the stream",
            "alpha_9_10":"bipartiteness forces order<=20; the exact all-forest census records every Q8 negative",
            "alpha_11_12":"orders<=20 use the all-forest census; the six possible orders 21..24 use the exact matching-quotient report",
            "alpha_13":"the exact no-gap matching boundary has q_negative=0 through maximum order 26",
            "alpha_at_least_14":"excluded conditionally by the connected Q8 theorem which this forest lift is designed to consume",
        },
        "conditional_scope":"The classification is complete as the finite structural input to a lift conditional on connected Q8 for alpha>=14.",
        "hashes":{
            FINITE.name:digest(FINITE), QUOTIENT.name:digest(QUOTIENT),
            BOUNDARY.name:digest(BOUNDARY), TSV.name:digest(TSV),
            Path(__file__).name:digest(Path(__file__)),
        },
    }
    REPORT.write_text(json.dumps(payload,indent=2,sort_keys=True)+"\n",encoding="utf-8")
    print(payload["status"])
    print("REPORT",REPORT.name,digest(REPORT))


if __name__ == "__main__":
    main()
