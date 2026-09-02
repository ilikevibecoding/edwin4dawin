#!/usr/bin/env python3
"""Bounded dependency and hash audit for the rank-seven proof package.

This script deliberately performs no symbolic expansion or tree census.  It
checks immutable artifact hashes, exact report statuses/statistics, and the
current master-note integration.  Logical gaps are reported explicitly.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
MASTER = ROOT / "ARBITRARY_NEGATIVE_FACTOR_COMPATIBILITY_ROUTE_2026-08-06.md"
OUT = ROOT / "rank7_integration_dependency_audit_exact_20260816.json"


def sha256(name: str) -> str:
    h = hashlib.sha256()
    with (ROOT / name).open("rb") as stream:
        for block in iter(lambda: stream.read(1 << 20), b""):
            h.update(block)
    return h.hexdigest().upper()


def load(name: str) -> dict:
    return json.loads((ROOT / name).read_text(encoding="utf-8"))


EXPECTED_HASHES = {
    # High/high cone.
    "verify_rank7_high_high_convolution.py":
        "23F7C454224CF640DEB291BBA15993801A6BFB49F99A580836A681F55A28FD06",
    "rank7_high_high_convolution_exact_20260813.json":
        "4560A9F5D0B0646EEA1BA078D2895131A7E6368861219F3EEC8D5272767C86B8",
    # Low/high cone.
    "RANK7_LOW_HIGH_FULL_CONVOLUTION_CONE_THEOREM_2026-08-16.md":
        "CD39B88EA13AE3D0503DEDBCAE3356BB48A42C4DE99B635602ABE4863B6E193E",
    "verify_rank7_low_convolution_sliced.py":
        "9AFEF18A131C6E19BE29398566931D320D89E2E4207637C4C42F5D04777CAD3F",
    "merge_rank7_low_high_sliced_ranges.py":
        "200B5EEADF11AF971D55C930C3E174BD345D5C4728C3BE36DDB2F12B2DABB525",
    "rank7_low_high_full_cone_memory_bounded_exact_20260816.json":
        "8E7363ACA615C60065B3E1C2F1A6DEC38110CF9D58CA59CB5BB7553D89DF970D",
    # Low/low cone.
    "RANK7_LOW_LOW_FULL_CONVOLUTION_CONE_THEOREM_2026-08-16.md":
        "8C65FA877AE60AE0A71ADA86ECB51865BCB82457821ABB4D5598C3ECBF8C7E5E",
    "verify_rank7_low_low_enlarged_face.py":
        "C57340F040E0079C7601D001D56568B66B9043B1C1ABBF77B9086FD3AEB6B7B8",
    "rank7_low_low_enlarged_face_exact_20260816.json":
        "CA4D962B6FBD31E0CEF3D1D5E0D27547F1C81C34CC3798D2C76826EFABC6F594",
    "verify_rank7_low_low_convolution_sliced.py":
        "17D6B13EAD97F8EAAD1A339172D45DDC4D78491BA3DE1162D889E14135500026",
    "merge_rank7_low_low_sliced_ranges.py":
        "DB429C13AD9E75FC8D7221795699CAB229D84C10B34FD61AD98A6AB5AF057F8F",
    "rank7_low_low_full_cone_memory_bounded_exact_20260816.json":
        "8A396F7872ABCA4A556BC0231355CB648C5D2D75DC38F5DAEAEB11FE9491EB2A",
    # Downstream conditional and already-closed PGC inputs.
    "RANK7_FOREST_Q7_CONDITIONAL_LIFT_THEOREM_2026-08-16.md":
        "1BCE6473B3DD90E9D597AA43F75A7468D8FB6205754073AD78AC9C47E27D5F82",
    "rank7_forest_lift_conditional_exact_20260816.json":
        "5DD81CC8BF4A334ED9D6D7B88DBE271DB0A0F9FEA4FEB9F9126DCC06875E563E",
    "FOREST_V7_ALPHA12_THEOREM_2026-08-13.md":
        "B2FCEDD33177DB50B1FB868B2098F2E896B2AB2687215EDC580B2E85D21DBA78",
    "forest_v7_alpha12_exact_20260813.json":
        "0C0E713EA2E10B4F6431AF06B44E73B93B592782C4376FE5F596B20482027B5C",
    "RANK7_ALPHA11_BOUNDARY_THEOREM_2026-08-13.md":
        "B52C95109ADF4A0EDD510D9CC52916C0A82AE155B1D565081A241BF234C7EE4B",
    "rank7_alpha11_boundary_theorem_exact_20260813.json":
        "66B78AFF028EC8AA0E994CDBD5DC30100B0CB32CF2C1930C4CE824C9E7A042CC",
    # Rooted-C7 residual cut.
    "RANK7_ROOTED_CROSS_RESIDUAL_AFTER_B2_4_2026-08-16.md":
        "68274D1D527D6A1A366A9447CB755DC9859958CC78234A76DDCA299686E9BE02",
    "rank7_rooted_cross_residual_after_b2_4_exact_20260816.json":
        "EBF9369561D528A94FA08846E6BF465DB7485D3DF271E462C63DF48E5473587D",
}


def main() -> None:
    actual_hashes = {name: sha256(name) for name in EXPECTED_HASHES}
    hash_mismatches = {
        name: {"expected": expected, "actual": actual_hashes[name]}
        for name, expected in EXPECTED_HASHES.items()
        if actual_hashes[name] != expected
    }
    assert not hash_mismatches, hash_mismatches

    hh = load("rank7_high_high_convolution_exact_20260813.json")
    lh = load("rank7_low_high_full_cone_memory_bounded_exact_20260816.json")
    ll = load("rank7_low_low_full_cone_memory_bounded_exact_20260816.json")
    lift = load("rank7_forest_lift_conditional_exact_20260816.json")
    c7_cut = load("rank7_rooted_cross_residual_after_b2_4_exact_20260816.json")
    v7 = load("forest_v7_alpha12_exact_20260813.json")
    alpha11 = load("rank7_alpha11_boundary_theorem_exact_20260813.json")

    assert hh["status"] == "PASS_EXACT_FULL_RANK7_HIGH_HIGH_CONVOLUTION_CONE"
    assert hh["statistics"] == {
        "terms": 108603332,
        "negative": 0,
        "minimum": 1,
        "maximum": 41613599136000,
    }
    assert lh["status"] == "PASS_EXACT_MEMORY_BOUNDED_RANK7_LOW_HIGH_FULL_CONVOLUTION_CONE"
    assert lh["coverage"]["slices"] == 3060
    assert lh["coverage"]["no_gaps_or_overlaps"] is True
    assert lh["outside_enlarged_b1_face_statistics"]["negative"] == 0
    assert lh["enlarged_b1_face_certificate"]["status"] == "PASS_EXACT_RANK7_LOW_HIGH_ENLARGED_B1_FACE"
    assert ll["status"] == "PASS_EXACT_MEMORY_BOUNDED_RANK7_LOW_LOW_FULL_CONVOLUTION_CONE"
    assert ll["coverage"]["slices"] == 3060
    assert ll["coverage"]["no_gaps_or_overlaps"] is True
    assert ll["outside_enlarged_face_statistics"]["negative"] == 0
    assert ll["enlarged_face_certificate"]["status"] == "PASS_EXACT_RANK7_LOW_LOW_ENLARGED_FACE"
    assert lift["status"] == "PASS_EXACT_CONDITIONAL_ALL_FOREST_RANK7_Q7_LIFT"
    assert v7["status"] == "PASS_EXACT_ALL_FOREST_V7_ALPHA_AT_LEAST_12"
    assert alpha11["status"] == "PASS_EXACT_ALL_ORDER_RANK7_ALPHA11_BOUNDARY_THEOREM"
    assert c7_cut["status"] == "PASS_EXACT_ROOTED_C7_COVERAGE_CUT_AFTER_B2_4"
    assert c7_cut["residual"]["cell_count"] == 83
    assert c7_cut["residual"]["integer_parameter_levels"] == 18517
    assert c7_cut["scope_warning"].startswith("Universal rooted C7 is not proved")

    master = MASTER.read_text(encoding="utf-8")
    lh_master_names = [
        "RANK7_LOW_HIGH_FULL_CONVOLUTION_CONE_THEOREM_2026-08-16.md",
        "verify_rank7_low_convolution_sliced.py",
        "merge_rank7_low_high_sliced_ranges.py",
        "rank7_low_high_full_cone_memory_bounded_exact_20260816.json",
    ]
    ll_master_names = [
        "RANK7_LOW_LOW_FULL_CONVOLUTION_CONE_THEOREM_2026-08-16.md",
        "verify_rank7_low_low_enlarged_face.py",
        "rank7_low_low_enlarged_face_exact_20260816.json",
        "verify_rank7_low_low_convolution_sliced.py",
        "merge_rank7_low_low_sliced_ranges.py",
        "rank7_low_low_full_cone_memory_bounded_exact_20260816.json",
    ]
    hh_master_names = [
        "verify_rank7_high_high_convolution.py",
        "rank7_high_high_convolution_exact_20260813.json",
    ]
    lh_master_hashes = [EXPECTED_HASHES[name] for name in lh_master_names]
    ll_master_hashes = [EXPECTED_HASHES[name] for name in ll_master_names]
    hh_master_hashes = [EXPECTED_HASHES[name] for name in hh_master_names]

    assert all(name in master for name in lh_master_names)
    assert all(value in master for value in lh_master_hashes)
    assert all(name in master for name in ll_master_names)
    assert all(value in master for value in ll_master_hashes)

    high_high_filenames_present = all(name in master for name in hh_master_names)
    high_high_hashes_present = all(value in master for value in hh_master_hashes)
    wrong_cross_reference_present = (
        "Together with Sections 109.15 and 109.27" in master
    )
    stale_conditional_text_present = (
        "and the two low off-face cones remain" in master
    )
    assert high_high_filenames_present
    assert high_high_hashes_present
    assert not wrong_cross_reference_present
    assert not stale_conditional_text_present

    master_integration = {
        "low_high_filenames_present": True,
        "low_high_hashes_present_and_correct": True,
        "low_low_filenames_present": True,
        "low_low_hashes_present_and_correct": True,
        "high_high_filenames_present": high_high_filenames_present,
        "high_high_hashes_present": high_high_hashes_present,
        "high_high_prose_only": "The high/high cone was already proved." in master,
        "wrong_cross_reference_present": wrong_cross_reference_present,
        "wrong_cross_reference_reason":
            "Section 109.15 is the finite terminal-broom base, not the high/high cone theorem.",
        "stale_conditional_text_present": stale_conditional_text_present,
        "post_audit_master_corrections_verified": True,
    }

    # These are the exact proved terminal-broom ranges represented by current
    # theorem artifacts.  Delta 3 and 4 have no theorem artifact in this audit.
    terminal_broom_coverage = {
        "core_orders_7_through_18": {
            "proved_nonnegative_differences": list(range(1, 14)),
            "delta0_nonnegative_core_orders": list(range(13, 19)),
            "delta0_can_be_negative_core_orders": [10, 11, 12],
            "note": "The existing master calls the below-19 base complete, but the final induction should explicitly cite the small-core disposal because termwise Delta0 nonnegativity is false at 10--12.",
        },
        "core_orders_19_through_38": {
            "proved_all_differences": list(range(7, 14)),
            "missing_for_newton_coefficient_route": list(range(0, 7)),
            "rooted_C7_residual_closure_effect": "would make the rooted C7 input available throughout this band, but does not itself prove these seven terminal-broom inequalities",
        },
        "core_orders_at_least_39": {
            "proved_differences": [0, 1, 2] + list(range(5, 14)),
            "missing_differences": [3, 4],
        },
    }

    exact_shortest_remaining_implication = {
        "insufficient_pair": [
            "close all 83 rooted-C7 cells / 18,517 parameter levels in orders 23--38",
            "prove Delta^3 R_1>=0 and Delta^4 R_1>=0 for every rooted core of order at least 39",
        ],
        "why_insufficient": "Those results close rooted C7 from order 19 and all Newton coefficients from order 39, but leave R_t unproved for terminal-broom cores of orders 19--38.",
        "weakest_additional_sufficient_middle_lemma": "For every rooted tree core A with 19<=|A|<=38 and every integer t>=1, R_t(A,q)>=0.",
        "coefficientwise_sufficient_middle_lemma": "For every rooted tree core A with 19<=|A|<=38, Delta^j R_1(A,q)>=0 for j=0,...,6. (Delta^7,...,Delta^13 are already proved there.)",
        "if_future_delta3_delta4_cover_19_through_38_too": "the coefficientwise middle obligation reduces to j in {0,1,2,5,6}",
        "downstream_chain": [
            "large-order Delta3/Delta4 plus the already proved Delta0-2 and Delta5-13 gives R_t>=0 for every rooted core of order at least 39",
            "the middle R_t lemma gives R_t>=0 for cores 19--38; the existing finite base supplies the lower-order splice, subject to its explicit Delta0-at-10--12 disposal",
            "the terminal-broom identity and strong induction give connected-tree Q7>=0 for alpha>=12",
            "the three proved convolution cones and the exact conditional lift give all-forest Q7>=0 for alpha>=12",
            "the all-forest V7 theorem and exact alpha(B)=11 boundary theorem then give rank-seven PGC",
        ],
    }

    report = {
        "status": "PASS_EXACT_BOUNDED_RANK7_INTEGRATION_AUDIT_WITH_DECLARED_GAPS",
        "scope": "hash/status/dependency audit only; no new symbolic expansion or tree census",
        "artifact_hashes": actual_hashes,
        "hash_mismatches": hash_mismatches,
        "cone_status": {
            "high_high": {
                "status": hh["status"],
                "terms": hh["statistics"]["terms"],
                "negative_coefficients": hh["statistics"]["negative"],
            },
            "low_high": {
                "status": lh["status"],
                "terms": lh["full_statistics"]["terms"],
                "raw_negatives_paid_on_exceptional_face": lh["full_statistics"]["negative"],
                "slices": lh["coverage"]["slices"],
            },
            "low_low": {
                "status": ll["status"],
                "terms": ll["full_statistics"]["terms"],
                "raw_negatives_paid_on_exceptional_face": ll["full_statistics"]["negative"],
                "slices": ll["coverage"]["slices"],
            },
            "all_three_cones_mathematically_closed": True,
        },
        "master_integration": master_integration,
        "downstream_exact_inputs": {
            "conditional_forest_lift": lift["status"],
            "all_forest_V7_alpha_at_least_12": v7["status"],
            "alpha11_boundary": alpha11["status"],
            "rooted_C7_current_cut": {
                "status": c7_cut["status"],
                "remaining_cells": c7_cut["residual"]["cell_count"],
                "remaining_parameter_levels": c7_cut["residual"]["integer_parameter_levels"],
            },
        },
        "terminal_broom_coverage": terminal_broom_coverage,
        "exact_shortest_remaining_implication": exact_shortest_remaining_implication,
        "conclusion": "All three convolution cones are exact theorems, and the master now contains their explicit filenames/hashes with the stale cross-reference corrected. Delta3/Delta4 plus rooted-C7 residual closure is not alone sufficient for unconditional Q7/PGC: a finite core-order 19--38 R_t bridge is also required.",
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    print("all_three_cones_mathematically_closed=True")
    print(f"master_high_high_explicit={master_integration['high_high_filenames_present'] and master_integration['high_high_hashes_present']}")
    print("master_stale_cone_text_corrected=True")
    print("remaining_exact_bridge=middle_core_R_t_orders_19_through_38")


if __name__ == "__main__":
    main()
