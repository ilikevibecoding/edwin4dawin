#!/usr/bin/env python3
"""Independent dependency and certificate audit for the rank-eight forest lift."""

from __future__ import annotations

import csv
from fractions import Fraction
import hashlib
import json
import math
from pathlib import Path


ROOT=Path(__file__).resolve().parent
FILES={
    "rank7_lift":ROOT/"rank7_forest_lift_conditional_exact_20260816.json",
    "finite":ROOT/"rank8_q8_forest_polynomials_through_n20_exact_20260816.json",
    "boundary":ROOT/"rank8_pgc_matching_quotient_boundary_exact_20260817.json",
    "quotient":ROOT/"rank8_exceptional_core_q8_matching_quotient_exact_20260820.json",
    "classification":ROOT/"rank8_exceptional_tree_jets_exact_20260820.json",
    "jets":ROOT/"rank8_exceptional_tree_jets_exact_20260820.tsv",
    "fixed_high":ROOT/"rank8_exceptional_fixed_high_exact_20260820_range_1_2.json",
    "fixed_low":ROOT/"rank8_exceptional_fixed_low_exact_20260820_range_1_2.json",
    "resource_checkpoint":ROOT/"rank8_high_high_convolution_sliced_checkpoint_20260820.json",
}
OUTPUT=ROOT/"rank8_forest_lift_lane_independent_audit_exact_20260820.json"


def digest(path:Path)->str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def q8(p:tuple[int,...])->int:
    return 16*p[8]*p[8]-p[7]*p[8]-18*p[7]*p[9]


def main()->None:
    data={key:json.loads(path.read_text(encoding="utf-8")) for key,path in FILES.items() if path.suffix==".json"}
    assert data["rank7_lift"]["status"]=="PASS_EXACT_CONDITIONAL_ALL_FOREST_RANK7_Q7_LIFT"
    assert data["finite"]["status"]=="PASS_EXACT_Q8_FOREST_POLYNOMIAL_CENSUS_THROUGH_ORDER_20"
    assert data["boundary"]["status"]=="PASS_PROOF_RANK8_PGC_ALPHA13_ALPHA14_BOUNDARY_ALL_FORESTS"
    assert data["quotient"]["status"]=="PASS_EXACT_RANK8_EXCEPTIONAL_CORE_Q8_MATCHING_QUOTIENT_SIX_CELLS"
    assert data["classification"]["status"]=="PASS_EXACT_RANK8_EXCEPTIONAL_CONNECTED_TREE_JET_CLASSIFICATION"

    # Exact factorial scaling of the literal Q8 functional.
    base=2**16*math.factorial(8)**2
    assert Fraction(2**15*math.factorial(7)*math.factorial(8),base)==Fraction(1,16)
    assert Fraction(2**16*math.factorial(7)*math.factorial(9),base)==Fraction(9,8)

    # Re-read every stored exceptional jet rather than trusting aggregates.
    jets=[]
    with FILES["jets"].open(newline="",encoding="utf-8") as handle:
        for row in csv.DictReader(handle,delimiter="\t"):
            alpha=int(row["alpha"])
            polynomial=tuple(int(row[f"i{rank}"]) for rank in range(10))
            value=int(row["q8"])
            assert polynomial[0]==1 and q8(polynomial)==value
            assert alpha<=7 or value<0
            jets.append((alpha,polynomial,value))
    assert len(jets)==len(set(jets))==1215==data["classification"]["distinct_exceptional_jets"]
    alpha_counts={str(alpha):sum(row[0]==alpha for row in jets) for alpha in range(1,10)}
    assert alpha_counts=={"1":2,"2":2,"3":5,"4":15,"5":48,"6":175,"7":700,"8":253,"9":15}
    assert sum(value<0 for _,_,value in jets)==268
    assert max(alpha for alpha,_,_ in jets)==9

    quotient=data["quotient"]
    assert [(row["order"],row["alpha"]) for row in quotient["cells"]]==[
        (21,11),(22,11),(21,12),(22,12),(23,12),(24,12)
    ]
    assert quotient["totals"]["q8_negative_with_multiplicity"]==0
    assert quotient["totals"]["distinct_negative_jet_lines"]==0
    assert quotient["totals"]["minimum_q8"]==42_145_389
    assert all(row["minimum_q8"]>0 for row in quotient["cells"])
    assert all(row["q8_negative_with_multiplicity"]==0 for row in quotient["cells"])
    assert all(row["q_negative"]==0 for row in data["boundary"]["cells"] if row["alpha"]==13)

    # The two alpha=1 exceptional jets form a complete categorical slice.
    assert [row[0] for row in jets[:2]]==[1,1]
    fixed={}
    for mode in ("high","low"):
        item=data[f"fixed_{mode}"]
        assert item["range_start"]==1 and item["range_stop"]==2 and item["cases"]==2
        assert [row["index"] for row in item["rows"]]==[1,2]
        assert [row["alpha"] for row in item["rows"]]==[1,1]
        assert item["statistics"]["negative"]==0
        assert item["statistics"]["minimum"]==1
        assert item["peak_private_bytes"]<1024**3
        fixed[mode]={
            "cases":item["cases"],"terms":item["statistics"]["terms"],
            "negative":item["statistics"]["negative"],
            "minimum":item["statistics"]["minimum"],
            "peak_private_bytes":item["peak_private_bytes"],
            "report_sha256":digest(FILES[f"fixed_{mode}"]),
        }

    # Preserve the rejected coarse high/high slice exactly as a resource
    # obstruction.  Its positivity is not promoted to a cone theorem.
    checkpoint=data["resource_checkpoint"]
    assert checkpoint["completed_canonical_slices"]==1
    assert checkpoint["represented_terms"]==12_813_915
    assert checkpoint["represented_negative_coefficients"]==0
    assert checkpoint["peak_private_bytes"]>1024**3

    payload={
        "schema":"rank8-forest-lift-lane-independent-audit-v1",
        "status":"PASS_EXACT_RANK8_FOREST_LIFT_REDUCTION_AND_ALPHA1_FIXED_CONES",
        "factorial_identity":{
            "q_definition":"q_j=2^j*j!*i_j",
            "margin":"M8=q8^2-q7*q9-h*q7*q8",
            "literal_relation_at_h_1":"M8=(2^16*(8!)^2/16)*Q8",
            "ratio_form":"M8=q7*q8*(rho7-rho8-h)",
        },
        "full_factor_cones":{
            "common_gaps":"delta0>=2h, delta1>=0, delta1+delta2>=2h, delta3..delta7>=h",
            "high":"delta0=2h+d0; delta1=h+d1; delta2..delta7=h+d2..d7",
            "low":"delta0=2h+d0; delta1=r; delta2=2h-r+d2; delta3..delta7=h+d3..d7, with 0<=r<h",
            "pair_cases":["high/high","low/high","low/low"],
            "exhaustive_conditional_on":"the lower forest gaps through rank seven and Q8>=0 for the factor",
        },
        "reusable_artifacts":{
            "rank7_conditional_lift":"supplies the exact full/exceptional/first-crossing assembly template, not a rank8 cone proof",
            "rank8_order20_forest_census":"records all Q8 negatives for alpha>=9 through order 20",
            "rank8_alpha13_matching_boundary":"proves no Q8-negative alpha13 component through maximum order 26",
            "new_six_cell_quotient":"proves no Q8-negative alpha11/12 component in the only missing orders 21..24",
        },
        "exceptional_classification":{
            "definition":"alpha<=7 or Q8<0",
            "distinct_jets":1215,"distinct_by_alpha":alpha_counts,
            "distinct_negative_Q8_jets":268,"maximum_exceptional_alpha":9,
            "jet_ranks":[0,9],
            "conditional_scope":"complete finite component classification for a lift assuming connected Q8 at alpha>=14",
        },
        "bounded_certificate":{
            "theorem":"adjoining either alpha=1 exceptional connected-tree jet to either abstract full cone preserves Q8",
            "exceptional_jets_covered":2,"modes":fixed,
            "aggregate_terms":fixed["high"]["terms"]+fixed["low"]["terms"],
            "negative_coefficients":0,"minimum_coefficient":1,
        },
        "first_crossing_obligation":{
            "partial_alpha_range":[0,13],"target_threshold":14,
            "maximum_exceptional_component_alpha":9,
            "required_crossing_range":[14,22],
            "jet_truncation":"i0..i9 is exact because Q8 of a product uses no higher factor coefficient",
            "method":"disk-backed exact unbounded-multiset DP, sorted by jet type, retaining distinct partial jets through alpha13",
        },
        "remaining_exact_inputs":[
            "connected Q8 for every tree with alpha>=14",
            "the lower all-forest gaps through rank seven, including forest Q7",
            "full/full rank8 high/high, low/high, and low/low convolution cones",
            "fixed-exceptional/high and fixed-exceptional/low for the remaining 1213 jets",
            "the exceptional-only first-crossing DP, including overshoots through alpha22",
        ],
        "rejected_coarse_slice":{
            "classification":"resource obstruction only; not a mathematical or forest counterexample",
            "first_slice_terms":checkpoint["represented_terms"],
            "first_slice_negative":checkpoint["represented_negative_coefficients"],
            "peak_private_bytes":checkpoint["peak_private_bytes"],
            "why_rejected":"the coarse construction exceeded the 1 GiB lane cap and therefore is not a certificate",
            "checkpoint_sha256":digest(FILES["resource_checkpoint"]),
        },
        "scope_warning":"The finite classification and alpha1 fixed cones do not prove any full/full rank8 cone, the complete fixed/full obligation, first crossing, connected Q8, forest Q8, or PGC.",
        "hashes":{
            **{path.name:digest(path) for path in FILES.values()},
            Path(__file__).name:digest(Path(__file__)),
        },
    }
    OUTPUT.write_text(json.dumps(payload,indent=2,sort_keys=True)+"\n",encoding="utf-8")
    print(payload["status"])
    print("REPORT",OUTPUT.name,digest(OUTPUT))


if __name__=="__main__":main()
