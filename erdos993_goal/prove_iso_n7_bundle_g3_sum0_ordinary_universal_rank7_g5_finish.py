#!/usr/bin/env python3
"""Assemble universal ordinary-parent common0/sum0 rank-seven G3."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "iso_n7_bundle_g3_sum0_ordinary_universal_exact_"
    "rank7_g5_finish_20260831.json"
)
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G3_SUM0_ORDINARY_UNIVERSAL_RANK7_G5_FINISH"
FILES = {
    "classifier_source": "classify_iso_n7_bundle_g23_large_order_residuals_rank7_g5_finish.py",
    "classifier_report": "iso_n7_bundle_g23_large_order_residual_classifier_exact_rank7_g5_finish_20260831.json",
    "edgeless_source": "prove_iso_n7_bundle_g23_edgeless_all_parent_rank7_g5_finish.py",
    "edgeless_report": "iso_n7_bundle_g23_edgeless_all_parent_exact_rank7_g5_finish_20260831.json",
    "finite_n2_10_source": "assemble_iso_n7_bundle_g123_finite_n2_10_rank7_g4_piecewise.py",
    "finite_n2_10_report": "iso_n7_bundle_g123_finite_n2_10_assembled_exact_rank7_g4_piecewise_20260831.json",
    "isolated_parent_universal_source": (
        "prove_iso_n7_bundle_g3_sum0_ordinary_parent_isolated_universal_"
        "rank7_g5_finish.py"
    ),
    "isolated_parent_universal_report": (
        "iso_n7_bundle_g3_sum0_ordinary_parent_isolated_universal_exact_"
        "rank7_g5_finish_20260831.json"
    ),
    "finite_n11_14_source": (
        "prove_iso_n7_bundle_g3_sum0_ordinary_nonisolated_finite_n11_14_"
        "rank7_g5_finish.py"
    ),
    "finite_n11_14_report": (
        "iso_n7_bundle_g3_sum0_ordinary_nonisolated_finite_n11_14_exact_"
        "rank7_g5_finish_20260831.json"
    ),
    "large_n15_source": (
        "prove_iso_n7_bundle_g3_sum0_ordinary_nested_shadow_moment_n15_"
        "rank7_g5_finish.py"
    ),
    "large_n15_report": (
        "iso_n7_bundle_g3_sum0_ordinary_nested_shadow_moment_n15_exact_"
        "rank7_g5_finish_20260831.json"
    ),
    "padding_source": "prove_iso_n7_bundle_g3_sum0_ordinary_isolate_padding_rank7_g5_finish.py",
    "padding_report": "iso_n7_bundle_g3_sum0_ordinary_isolate_padding_exact_rank7_g5_finish_20260831.json",
}
EXPECTED = {
    "classifier_source": "CE3D39D6D36D1A01B84D398FA3B9218DF4051AB616951E5823096CF5F5FF21AF",
    "classifier_report": "DB0B50A06C7ED208BAF7E3F88B64770D1D20BFD17C391B72E12B35AB0256222E",
    "edgeless_source": "E2986C7F28297FBABBAD1B2A3BCF71FBCF37909273F1EC0322ED9ADCB716AF3B",
    "edgeless_report": "E3AED90CE5930061F653683794234F5A816A466945B69525202BB86B45F451E1",
    "finite_n2_10_source": "B938DDCC0F798036EC1B01EA92169D4A5EF24A784754D42733CFA74C3240F5D9",
    "finite_n2_10_report": "12457F9ADFFCFD268F19375566E488A8C9D2A25CC581597D5196705DC08E94D5",
    "isolated_parent_universal_source": "985B8EFCC0C1F6313632462688571BC4C118B3FB0F545D42630467316E749EFE",
    "isolated_parent_universal_report": "BAB1F45021E38BA05F46AD7D1A393816C8EAB3204719D79A59C45B8F2284B70C",
    "finite_n11_14_source": "2CB2144CD9940AA725A26619B0B1EEA615ED11A07D02F165205D16AB23789271",
    "finite_n11_14_report": "ABF86FFDC189EFDEF7109E1CB68EF584F361651DF48E04632D5AF007005B13AE",
    "large_n15_source": "9BAE5679D48A3E64F0E285E71AC5619BDD0CE59F5BF8BB7AD2BBB1C7FFD201B8",
    "large_n15_report": "71DEC100FBCA92CF41D251C67F5F827457A55E784C5B23D5674D9C167EBA5B81",
    "padding_source": "E3BA6742F843E8C5B843F6A1CCF0DCF0EBECF952CEEDEF0864D6A8C8C879A89D",
    "padding_report": "1E5F3469AC3972B926875301F6E9D886E142A7586E5C6955E57DCCBA283911CA",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(key: str) -> dict:
    return json.loads((HERE / FILES[key]).read_text(encoding="utf-8"))


def main() -> None:
    for key, digest in EXPECTED.items():
        assert sha256(HERE / FILES[key]) == digest, key
    classifier = load("classifier_report")
    edgeless = load("edgeless_report")
    finite_low = load("finite_n2_10_report")
    isolated = load("isolated_parent_universal_report")
    finite_mid = load("finite_n11_14_report")
    large = load("large_n15_report")
    padding = load("padding_report")
    assert classifier["marker"] == (
        "CLASSIFIED_EXACT_ISO_N7_BUNDLE_G23_LARGE_ORDER_RESIDUALS_RANK7_G5_FINISH"
    )
    assert classifier["open_before_new_work"]["literal_branch_obligations_per_coefficient"] == 29
    assert edgeless["coverage_gap_within_edgeless_G23"] is None
    assert finite_low["orders"] == [2, 10] and finite_low["negative_count"] == 0
    assert isolated["coverage_gap_within_isolated_parent_ordinary_G3"] is None
    assert finite_mid["coverage_gap_within_nonisolated_ordinary_n11_14"] is None
    assert large["coverage_gap_within_stated_large_order_nonisolated_ordinary_G3"] is None
    assert padding["coverage_gap_within_positive_order_ordinary_padding"] is None
    assert padding["aggregate"]["exact_newton_recomposition"] is True

    partition = [
        {
            "case": "W edgeless",
            "certificate": "universal edgeless all-parent G2/G3 theorem",
        },
        {
            "case": "ordinary parent p isolated but W not edgeless",
            "certificate": "universal isolated-parent ordinary G3 theorem",
        },
        {
            "case": "p nonisolated; strip every isolated vertex other than p; base n0<=10",
            "certificate": "finite all-forest/all-mode theorem",
        },
        {
            "case": "p nonisolated; stripped isolate-free base 11<=n0<=14",
            "certificate": "complete rooted unlabeled-forest census",
        },
        {
            "case": "p nonisolated; stripped isolate-free base n0>=15",
            "certificate": "nested-shadow moment theorem with exact bounded/far tail split",
        },
        {
            "case": "restore every stripped isolated vertex",
            "certificate": "ordinary-parent isolate-padding theorem",
            "seam": (
                "The positive-order Newton coefficients are nonnegative and H0 is "
                "the preceding exact base certificate."
            ),
        },
    ]
    remaining = {
        "orders": "n>=11",
        "marked_geometries": [
            "adjacent",
            "nonadjacent_common1",
            "nonadjacent_common0_sum1",
            "nonadjacent_common0_sum_ge2",
        ],
        "literal_branch_obligations": 25,
        "endpoint_symmetry_quotient_obligations": 21,
        "count_arithmetic": (
            "The classifier had 29 literal/24 endpoint-quotient G3 obligations. "
            "Closing common0/sum0 removes no-parent, endpoint_u, endpoint_v, and "
            "ordinary p_u0_v0: four literal but three endpoint-quotient cells."
        ),
        "subregion_note": (
            "Edgeless and fixed-edge e<=4 subregions have separate certificates; "
            "the listed cells remain open as universal all-forest branches."
        ),
    }
    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": (
            "For every rank-seven canonical ordinary-parent cell with nonadjacent "
            "marked vertices in common0/sum0 geometry, the forced mask is p_u0_v0 "
            "and the exact coefficient G3 is nonnegative at every order."
        ),
        "compatibility_guard": (
            "Sum0 forces p_u0_v0; the other ordinary masks require at least one "
            "marked-parent adjacency and are outside this geometry."
        ),
        "disjoint_exhaustive_partition": partition,
        "coverage": {
            "coefficient": "G3",
            "geometry": "nonadjacent_common0_sum0",
            "mode": "ordinary_parent_p_u0_v0",
            "orders": "all",
        },
        "coverage_gap_within_ordinary_common0_sum0_G3": None,
        "remaining_G3_after_all_common0_sum0_mode_closures": remaining,
        "universal_across_all_G3_modes_guard": False,
        "dependencies_sha256": EXPECTED,
        "scope": (
            "Universal only for ordinary-parent p_u0_v0 nonadjacent/common0/sum0 "
            "rank-seven G3. Other marked geometries, G1/G2, rank propagation, and "
            "the full conjecture are separate."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True)+"\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "partition_cases": len(partition),
        "coverage_gap_within_ordinary_common0_sum0_G3": None,
        "remaining_G3_literal_obligations": remaining["literal_branch_obligations"],
        "remaining_G3_endpoint_quotient_obligations": remaining[
            "endpoint_symmetry_quotient_obligations"
        ],
        "universal_across_all_G3_modes_guard": False,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
