#!/usr/bin/env python3
"""Exact finite census for rank-five singleton-ordinary bundle g2.

Every unlabeled forest G of order 3 through 13 and every ordered triple of
distinct vertices (u,v,p) is evaluated.  Independence rows use a literal
bitmask deletion recurrence and the raw 70-term g2 functional is reconstructed
from the canonical symbolic source.  This is the finite half of the mode proof.
"""

from __future__ import annotations

import argparse
import hashlib
import itertools
import json
from pathlib import Path

import networkx as nx
import numpy as np
import sympy as sp

from census_iso_n5_bundle_g1_singleton_ordinary_all_forests_g1_bernstein import (
    KNOWN_FOREST_COUNTS,
    exact_scalar,
    forest_graphs,
    row_recurrence,
)
from derive_iso_n5_bundle_g12_canonical_configuration_g1_bernstein import (
    raw_coefficients,
)
from probe_iso_leaf_cross_remainder_root import poly_forest


HERE=Path(__file__).resolve().parent
SOURCE=Path(__file__).resolve()
DEPENDENCIES=(
    HERE/"derive_iso_n5_bundle_g12_canonical_configuration_g1_bernstein.py",
    HERE/"census_iso_n5_bundle_g1_singleton_ordinary_all_forests_g1_bernstein.py",
)
MARKER="PASS_EXACT_FINITE_ISO_N5_G2_SINGLETON_ORDINARY_ALL_FORESTS_RANK5_G2_ALT"
PROBE_MARKER="PROBE_EXACT_FINITE_ISO_N5_G2_SINGLETON_ORDINARY_ALL_FORESTS_RANK5_G2_ALT"


def raw_g2_terms():
    crows,drows,_g1,g2=raw_coefficients()
    variables=tuple(symbol for row in crows+drows for symbol in row)
    terms=[]
    for monomial,coefficient in sp.Poly(g2,*variables).terms():
        numerator,denominator=map(int,sp.fraction(coefficient));assert denominator==1
        factors=tuple((index,power) for index,power in enumerate(monomial) if power)
        terms.append((numerator,factors))
    assert len(terms)==70
    assert max(sum(power for _index,power in factors) for _coefficient,factors in terms)<=2
    return terms


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--min-order",type=int,default=3)
    parser.add_argument("--max-order",type=int,default=13)
    args=parser.parse_args()
    if not (3<=args.min_order<=args.max_order<=13):
        raise ValueError("require 3 <= min-order <= max-order <= 13")
    authoritative=args.min_order==3 and args.max_order==13
    marker=MARKER if authoritative else PROBE_MARKER
    terms=raw_g2_terms();total_forests=total_cells=total_zero=0
    global_minimum=None;global_smallest_positive=None;rows_report={}
    ordered_digest=hashlib.sha256()

    for order in range(args.min_order,args.max_order+1):
        triples=np.asarray(tuple(itertools.permutations(range(order),3)),dtype=np.int64)
        u,v,p=triples.T;cells_per_forest=len(triples)
        assert cells_per_forest==order*(order-1)*(order-2)
        fixed_masks=np.stack((
            np.zeros(cells_per_forest,dtype=np.int64),
            np.left_shift(1,u),np.left_shift(1,v),
            np.bitwise_or(np.left_shift(1,u),np.left_shift(1,v)),
            np.left_shift(1,p),
            np.bitwise_or(np.left_shift(1,p),np.left_shift(1,u)),
            np.bitwise_or(np.left_shift(1,p),np.left_shift(1,v)),
            np.bitwise_or(np.bitwise_or(np.left_shift(1,p),np.left_shift(1,u)),np.left_shift(1,v)),
        ))
        forest_count=order_zero=0;order_minimum=None;order_smallest_positive=None
        for forest_index,graph0 in enumerate(forest_graphs(order)):
            forest_count+=1;graph=nx.convert_node_labels_to_integers(graph0)
            deleted_row=row_recurrence(graph);full_row=deleted_row(0)
            established=tuple(poly_forest(graph));established+= (0,)*(7-len(established))
            assert full_row==established[:7]
            row_arrays=np.stack([
                np.asarray([deleted_row(int(mask)) for mask in row_masks],dtype=np.int64)
                for row_masks in fixed_masks
            ])
            values=np.zeros(cells_per_forest,dtype=np.int64)
            for coefficient,factors in terms:
                term=np.full(cells_per_forest,coefficient,dtype=np.int64)
                for index,power in factors:
                    row_index,rank=divmod(index,7)
                    term*=row_arrays[row_index,:,rank]**power
                values+=term
            assert int(np.max(np.abs(values)))<2**60
            minimum_index=int(np.argmin(values));minimum=int(values[minimum_index])
            graph6=nx.to_graph6_bytes(graph,header=False).decode().strip()
            if minimum<0:
                tu,tv,tp=map(int,triples[minimum_index])
                raise AssertionError("negative singleton-ordinary g2",order,forest_index,
                                     tu,tv,tp,minimum,graph6)
            scalar_rows=tuple(deleted_row(int(fixed_masks[row_index,minimum_index]))
                              for row_index in range(8))
            assert exact_scalar(terms,scalar_rows)==minimum
            positive_indices=np.flatnonzero(values>0)
            smallest_positive=(int(np.min(values[positive_indices]))
                               if len(positive_indices) else None)
            witness={"order":order,"forest_index":forest_index,"graph6":graph6,
                     "marks_uvp":list(map(int,triples[minimum_index])),"value":minimum}
            if order_minimum is None or minimum<order_minimum["value"]:order_minimum=witness
            if global_minimum is None or minimum<global_minimum["value"]:global_minimum=witness
            if smallest_positive is not None:
                positive_index=int(np.flatnonzero(values==smallest_positive)[0])
                positive_witness={"order":order,"forest_index":forest_index,"graph6":graph6,
                    "marks_uvp":list(map(int,triples[positive_index])),"value":smallest_positive}
                if order_smallest_positive is None or smallest_positive<order_smallest_positive["value"]:
                    order_smallest_positive=positive_witness
                if global_smallest_positive is None or smallest_positive<global_smallest_positive["value"]:
                    global_smallest_positive=positive_witness
            zero=int(np.count_nonzero(values==0));order_zero+=zero;total_zero+=zero
            ordered_digest.update(f"{order}|{forest_index}|{graph6}|".encode())
            ordered_digest.update(values.astype("<i8",copy=False).tobytes())
        assert forest_count==KNOWN_FOREST_COUNTS[order]
        order_cells=forest_count*cells_per_forest;total_forests+=forest_count;total_cells+=order_cells
        rows_report[str(order)]={"unlabeled_forests":forest_count,
            "ordered_distinct_uvp_cells":order_cells,"zero_cells":order_zero,
            "minimum":order_minimum,"smallest_positive":order_smallest_positive}
        print(json.dumps({"order":order,**rows_report[str(order)]},sort_keys=True),flush=True)

    expected_cells=sum(KNOWN_FOREST_COUNTS[order]*order*(order-1)*(order-2)
                       for order in range(args.min_order,args.max_order+1))
    assert total_cells==expected_cells
    output=HERE/("iso_n5_g2_singleton_ordinary_all_forests_finite_"
                 f"{args.min_order}_{args.max_order}_rank5_g2_alt_20260830.json")
    report={"marker":marker,
        "theorem":"Raw rank-five singleton-ordinary g2 is nonnegative on every displayed finite forest cell.",
        "orders":[args.min_order,args.max_order],"unlabeled_forests":total_forests,
        "ordered_distinct_uvp_cells":total_cells,"zero_cells":total_zero,
        "global_minimum":global_minimum,"global_smallest_positive":global_smallest_positive,
        "ordered_value_stream_sha256":ordered_digest.hexdigest().upper(),"rows":rows_report,
        "raw_g2":{"term_count":len(terms),"configuration":"C=rows(G); D=rows(G-p), p,u,v distinct",
                  "row_rank_range":[0,6]},
        "completeness":{"forest_generation":"nondecreasing multisets of every nonisomorphic tree type",
            "known_unlabeled_forest_counts_checked":True,"every_ordered_distinct_triple_checked":True,
            "independence_rows":"literal bitmask vertex recurrence through rank six",
            "undeleted_rows_cross_checked":"poly_forest on every generated forest",
            "minimum_cell_scalar_replay":True},
        "scope":"Exact finite singleton-ordinary g2 theorem only; no extrapolation or other mode claim.",
        "dependencies_sha256":{path.name:hashlib.sha256(path.read_bytes()).hexdigest().upper()
                               for path in DEPENDENCIES},
        "source_sha256":hashlib.sha256(SOURCE.read_bytes()).hexdigest().upper()}
    raw=json.dumps(report,indent=2,sort_keys=True)+"\n";output.write_text(raw,encoding="utf-8",newline="\n")
    print(json.dumps({"marker":marker,"forests":total_forests,"cells":total_cells,
                      "minimum":global_minimum,"stream_sha256":report["ordered_value_stream_sha256"]},
                     indent=2,sort_keys=True))
    print("SOURCE_SHA256",report["source_sha256"])
    print("REPORT_SHA256",hashlib.sha256(raw.encode()).hexdigest().upper())
    print(marker)


if __name__=="__main__":main()
