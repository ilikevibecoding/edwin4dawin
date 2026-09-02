#!/usr/bin/env python3
"""Fail-closed all-order assembly of singleton-ordinary rank-five g2."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE=Path(__file__).resolve().parent
OUTPUT=HERE/"iso_n5_g2_singleton_ordinary_all_forest_assembled_exact_rank5_g2_alt_20260830.json"
MARKER="PASS_EXACT_ISO_N5_G2_SINGLETON_ORDINARY_ALL_FOREST_RANK5_G2_ALT"
DEPENDENCIES={
    "prove_iso_n5_g2_singleton_ordinary_large_q3_pair_cone_rank5_g2_alt.py":"BCB96391A74EF02689B213E8CFA70F44455F715282083C25621913FC82A19622",
    "iso_n5_g2_singleton_ordinary_large_q3_pair_cone_exact_rank5_g2_alt_20260830.json":"9DDA8064189567E2E9F39DDEFF92321C6B6A1A74224C509A022C112DED64F67D",
    "census_iso_n5_g2_singleton_ordinary_all_forests_rank5_g2_alt.py":"12896C5B56712F177D39F83D479AF963F855B5ADE65C6463D5B0DEDE3D7B5CA8",
    "iso_n5_g2_singleton_ordinary_all_forests_finite_3_13_rank5_g2_alt_20260830.json":"7D6CE09304F4884D171779B033FCAA9A18FE1A25CA539AACE14EBFA7EB62FDBC",
    "audit_iso_n5_g2_singleton_ordinary_finite_independent_rank5_g2_alt.py":"BA4772DFF2D540E5E2D47D5D1B95E0DC028B95B879CF23EDAA8D217CB93C4320",
    "iso_n5_g2_singleton_ordinary_finite_independent_audit_rank5_g2_alt_20260830.json":"6BCCCF39B0C1B584BC036426F5CB28A46EEB0CC249513185F11D265C6462EB5B",
    "validate_iso_n5_g2_q3_ie_identity_rank5_g2_alt.py":"6546DD50577F8F049787BADC8D1EEC3CF767EAB6DA11F279A561A1A2ADD2E133",
    "iso_n5_g2_q3_ie_identity_validation_rank5_g2_alt_20260830.json":"06F7C7DB03D9FE07CEC50B94E7423B9E6DD9405EA3C77600AA2E845874819529",
}


def sha256(path):return hashlib.sha256(Path(path).read_bytes()).hexdigest().upper()


def load(name):return json.loads((HERE/name).read_text())


def main():
    for name,expected in DEPENDENCIES.items():assert sha256(HERE/name)==expected,name
    finite=load("iso_n5_g2_singleton_ordinary_all_forests_finite_3_13_rank5_g2_alt_20260830.json")
    audit=load("iso_n5_g2_singleton_ordinary_finite_independent_audit_rank5_g2_alt_20260830.json")
    large=load("iso_n5_g2_singleton_ordinary_large_q3_pair_cone_exact_rank5_g2_alt_20260830.json")
    ie=load("iso_n5_g2_q3_ie_identity_validation_rank5_g2_alt_20260830.json")
    assert finite["marker"]=="PASS_EXACT_FINITE_ISO_N5_G2_SINGLETON_ORDINARY_ALL_FORESTS_RANK5_G2_ALT"
    assert finite["orders"]==[3,13] and finite["unlabeled_forests"]==6603
    assert finite["ordered_distinct_uvp_cells"]==9443808 and finite["zero_cells"]==0
    assert finite["global_minimum"]["value"]==2
    assert finite["ordered_value_stream_sha256"]=="8A745E171AF5C4A1A2FC220C20266192B03D7123EAB9AF5E716FB1DF273EF0AF"
    assert audit["marker"]=="PASS_INDEPENDENT_EXACT_ISO_N5_G2_SINGLETON_ORDINARY_FINITE_AUDIT_RANK5_G2_ALT"
    assert audit["ordered_distinct_uvp_cells"]==finite["ordered_distinct_uvp_cells"]
    assert audit["ordered_value_stream_sha256"]==finite["ordered_value_stream_sha256"]
    assert audit["global_minimum"]==finite["global_minimum"]
    assert large["marker"]=="PASS_EXACT_ISO_N5_G2_SINGLETON_ORDINARY_LARGE_Q3_PAIR_CONE_RANK5_G2_ALT"
    certificate=large["coefficient_certificate"]
    assert certificate["order_base"]==14 and certificate["canonical_branches"]==136
    assert certificate["total_homogeneous_coefficients"]==378000
    assert certificate["global_minimum"]=="17/40" and certificate["all_coefficients_strictly_positive"]
    assert certificate["coefficient_stream_sha256"]=="B3A2A7FC592C78AA8A9C9107C22F603D6D2C26D29507D4D6BFC4B9017439657A"
    assert ie["marker"]=="PASS_DIRECT_VALIDATION_ISO_N5_G2_Q3_IE_IDENTITY_RANK5_G2_ALT"
    assert ie["all_i2_i3_i4_identities_exact"] and ie["all_q3_values_nonnegative"]
    assert large["dependencies_sha256"]["iso_n5_g2_q3_ie_identity_validation_rank5_g2_alt_20260830.json"]==DEPENDENCIES["iso_n5_g2_q3_ie_identity_validation_rank5_g2_alt_20260830.json"]

    report={"marker":MARKER,
        "theorem":("For every finite forest G and every ordered triple of distinct vertices "
                   "u,v,p, the rank-five singleton-ordinary whole-bundle coefficient "
                   "g2(C,D) is nonnegative, where C is the four marked independence rows "
                   "of G and D those of G-p."),
        "coverage":{"vacuum":"orders n<3 admit no distinct u,v,p placement",
            "finite_orders":[3,13],"finite_cells":finite["ordered_distinct_uvp_cells"],
            "finite_forests":finite["unlabeled_forests"],"finite_minimum":finite["global_minimum"],
            "finite_independent_stream_match":True,"all_order_tail":"every n>=14",
            "tail_canonical_branches":certificate["canonical_branches"],
            "tail_exact_coefficients":certificate["total_homogeneous_coefficients"],
            "tail_minimum_coefficient":certificate["global_minimum"]},
        "proof_partition":"n<3 vacuous; exact exhaustive census for 3<=n<=13; Q3 pair-incidence cone for n>=14",
        "dependencies_sha256":DEPENDENCIES,
        "scope":("This closes exactly the singleton_ordinary canonical rank-five g2 mode. "
                 "It does not close singleton_endpoint, either internal-spine mode, all g2, "
                 "all N5, or Erdos Problem 993."),
        "source_sha256":sha256(Path(__file__))}
    raw=json.dumps(report,indent=2,sort_keys=True)+"\n";OUTPUT.write_text(raw,encoding="utf-8",newline="\n")
    print(json.dumps({"marker":MARKER,"finite_cells":report["coverage"]["finite_cells"],
                      "tail_coefficients":report["coverage"]["tail_exact_coefficients"],
                      "tail_minimum":report["coverage"]["tail_minimum_coefficient"]},indent=2,sort_keys=True))
    print("SOURCE_SHA256",report["source_sha256"])
    print("REPORT_SHA256",hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__=="__main__":main()
