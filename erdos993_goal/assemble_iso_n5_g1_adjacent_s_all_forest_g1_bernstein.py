#!/usr/bin/env python3
"""Assemble the exact adjacent-mark S=M5+3*C5 theorem for all forests.

The support-deleted forest A is split by the two componentwise deletion
families.  Orders through twelve are covered by a complete exact census.  At
larger orders, zero, one, and two positive deficits are covered respectively
by the zero-face theorem, the one-sided theorem, and the adaptive four-cone
certificate.

This is the adjacent S gate.  It is not an all-N5 or Problem 993 assembly.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE=Path(__file__).resolve().parent
OUTPUT=HERE/"iso_n5_g1_adjacent_s_all_forest_exact_g1_bernstein_20260830.json"
MARKER="PASS_EXACT_ISO_N5_G1_ADJACENT_S_ALL_FOREST_G1_BERNSTEIN"
DEPENDENCIES={
    "derive_iso_n5_bundle_g1_no_mark_root_compact_root.py":
        "39243EEEB2C22ABE711401959804C839C5AFE3A7882691EB9FA8FC91CBE7E3E7",
    "iso_n5_bundle_g1_no_mark_root_compact_root_20260829.json":
        "9954176009C063BC69511A8DA6FF90B0E0B6ADC02BF007045E8ADF168014088B",
    "prove_iso_n5_g1_adjacent_zero_deletion_face_g1_bernstein.py":
        "B02137FDD268600EE30DF575BC6FFEB8C2EB5A1D9B8CC7859CDD981A36BA9182",
    "iso_n5_g1_adjacent_zero_deletion_face_exact_g1_bernstein_20260830.json":
        "0DA34FB7A8B3474EC9CB4B2325CE59794B714BDE958B4F8A42D5FA16A80301E7",
    "prove_iso_n5_g1_adjacent_one_sided_face_g1_bernstein.py":
        "17566DDBC60F784AD59F5A8C42D890F7EE6AC4E1307BFA2133D2DBE650CABD25",
    "iso_n5_g1_adjacent_one_sided_face_exact_g1_bernstein_20260830.json":
        "83238D8AA02ED1A7BA78494EC3682D1D4D51FFE3A6C071A7C5F3EE05CC24D3DA",
    "derive_iso_n5_g1_adjacent_deletion_deficit_form_root.py":
        "B45D369DB8A5FF26FC1D43C22198D693581A23C8D283F79757BEBC949688AD48",
    "derive_iso_n5_g1_adjacent_adaptive_endpoint_reduction_independent_g1_bernstein.py":
        "0E4726EC2CF58513AA43DD3FF53465BC3CFA804765E8CD32EB604FCA40A9EAF5",
    "iso_n5_g1_adjacent_adaptive_endpoint_reduction_independent_g1_bernstein_20260830.json":
        "F03DA3CD24F4440C9175210181C2236F7F4746D063D20EAEE5CB8AEA7FCAE677",
    "derive_iso_n5_g1_adjacent_endpoint_symmetry_root.py":
        "FD414E7B6CD9B49AF5F1F03E5116109385AC1D830643BC5C2A328E0AF25381FA",
    "iso_n5_g1_adjacent_two_deficit_endpoint_symmetry_exact_root_20260830.json":
        "A299941453086F467DD906B650946B45C03ECAB7A928BBFCCD4997515486A683",
    "explore_iso_n5_g1_adjacent_two_deficit_interaction_g1_bernstein.py":
        "FFECBBF3198F80FB20C85CDC39DA64A2FA923C6C6C6625939E52AD632562C4CD",
    "iso_n5_g1_adjacent_two_deficit_finite_census_exact_g1_bernstein_20260830.json":
        "4C9E007B33F5A4D4BF7430104E82EF359807C01FC9FFEFD6A69B2C1788C8CE3A",
    "prove_iso_n5_g1_adjacent_two_deficit_adaptive_cones_g1_bernstein.py":
        "8B885E62CC3698F7FD5F7C8F5C403B8FD2FABB5DF4FF54FB66E4AB28EE1E4FE5",
    "iso_n5_g1_adjacent_two_deficit_adaptive_cones_exact_g1_bernstein_20260830.json":
        "E4742625150D97C264BEA6C91DE8C27939CFFF21F063482969FACCB29FA1CEC0",
}


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name):
    return json.loads((HERE/name).read_text(encoding="utf-8"))


def main():
    for name,expected in DEPENDENCIES.items():
        assert sha256(HERE/name)==expected,name
    compact=load("iso_n5_bundle_g1_no_mark_root_compact_root_20260829.json")
    zero=load("iso_n5_g1_adjacent_zero_deletion_face_exact_g1_bernstein_20260830.json")
    one=load("iso_n5_g1_adjacent_one_sided_face_exact_g1_bernstein_20260830.json")
    reduction=load("iso_n5_g1_adjacent_adaptive_endpoint_reduction_independent_g1_bernstein_20260830.json")
    symmetry=load("iso_n5_g1_adjacent_two_deficit_endpoint_symmetry_exact_root_20260830.json")
    finite=load("iso_n5_g1_adjacent_two_deficit_finite_census_exact_g1_bernstein_20260830.json")
    cones=load("iso_n5_g1_adjacent_two_deficit_adaptive_cones_exact_g1_bernstein_20260830.json")
    assert compact["marker"]=="PASS_EXACT_ISO_N5_BUNDLE_G1_NO_MARK_ROOT_COMPACT_IDENTITY_ROOT"
    assert compact["mark_inclusion_partition"]["identity"]==(
        "M5+3C5=H(A)+L(A,B)+L(A,C)+K(B,C)+epsilon*K(A,D)"
    )
    assert compact["mark_inclusion_partition"]["epsilon"]==(
        "1 when u,v are nonadjacent and 0 when they are adjacent"
    )
    assert zero["marker"]=="PASS_EXACT_ISO_N5_G1_ADJACENT_ZERO_DELETION_FACE_G1_BERNSTEIN"
    assert one["marker"]=="PASS_EXACT_ISO_N5_G1_ADJACENT_ONE_SIDED_FACE_G1_BERNSTEIN"
    assert reduction["marker"]=="DERIVED_INDEPENDENT_EXACT_ISO_N5_G1_ADJACENT_ADAPTIVE_ENDPOINT_REDUCTION_G1_BERNSTEIN"
    assert symmetry["marker"]=="DERIVED_EXACT_ISO_N5_G1_ADJACENT_TWO_DEFICIT_ENDPOINT_SYMMETRY_ROOT"
    assert finite["marker"]=="PASS_EXACT_FINITE_ISO_N5_G1_ADJACENT_TWO_DEFICIT_G1_BERNSTEIN"
    assert finite["orders"]==[0,12] and finite["forests"]==2949
    assert finite["deletion_states"]==3_804_017 and finite["negative_S"]==0
    assert cones["marker"]=="PASS_EXACT_ISO_N5_G1_ADJACENT_TWO_DEFICIT_ADAPTIVE_CONES_G1_BERNSTEIN"
    assert set(cones["branches"])=={"high_none","high_x","low_none","low_x"}
    assert all(row["negative"]==row["zero"]==0 for row in cones["branches"].values())
    report={
        "marker":MARKER,
        "theorem":(
            "For every finite forest A and every adjacent-mark componentwise "
            "occupation pair B,C, S(A,B,C)=M5+3*C5 is nonnegative."
        ),
        "case_partition":{
            "orders_at_most_12":(
                "complete 2,949-forest / 3,804,017-state exact census"
            ),
            "orders_at_least_13_zero_deficits":"zero-deletion face theorem",
            "orders_at_least_13_one_positive_deficit":"one-sided theorem, either orientation",
            "orders_at_least_13_two_positive_deficits":(
                "adaptive endpoint reduction plus high/low x none cone certificates; "
                "y follows by exact exchange symmetry"
            ),
        },
        "finite":{
            "forests":finite["forests"],"states":finite["deletion_states"],
            "negative":finite["negative_S"],
            "ordered_stream_sha256":finite["ordered_stream_sha256"],
        },
        "analytic_branches":cones["branches"],
        "dependencies_sha256":DEPENDENCIES,
        "scope":(
            "Adjacent-mark S=M5+3*C5 gate only. This does not by itself assert "
            "every rank-five bundle mode, all N5, or Erdos Problem 993."
        ),
        "source_sha256":sha256(Path(__file__)),
    }
    raw=json.dumps(report,indent=2,sort_keys=True)+"\n"
    OUTPUT.write_text(raw,encoding="utf-8")
    print(json.dumps({
        "marker":MARKER,"finite_states":report["finite"]["states"],
        "analytic_branches":list(report["analytic_branches"]),
        "scope":report["scope"],
    },indent=2,sort_keys=True))
    print("REPORT_SHA256",hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__=="__main__":
    main()
