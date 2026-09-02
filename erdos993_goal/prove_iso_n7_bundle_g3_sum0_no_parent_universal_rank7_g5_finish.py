#!/usr/bin/env python3
"""Universal assembly for rank-seven G3 no-parent common0/sum0.

Strip all isolated vertices from the unmarked forest.  Empty core is the
edgeless theorem; core order at most eight is the finite certificate; core
order at least nine is the dense moment theorem.  The exact isolate-padding
Newton theorem transfers every nonempty closed core back to the original row.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "iso_n7_bundle_g3_sum0_no_parent_universal_exact_"
    "rank7_g5_finish_20260831.json"
)
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G3_SUM0_NO_PARENT_UNIVERSAL_RANK7_G5_FINISH"
FILES = {
    "finite_source": "assemble_iso_n7_bundle_g123_finite_n2_10_rank7_g4_piecewise.py",
    "finite_report": "iso_n7_bundle_g123_finite_n2_10_assembled_exact_rank7_g4_piecewise_20260831.json",
    "edgeless_source": "prove_iso_n7_bundle_g23_edgeless_all_parent_rank7_g5_finish.py",
    "edgeless_report": "iso_n7_bundle_g23_edgeless_all_parent_exact_rank7_g5_finish_20260831.json",
    "dense_source": "prove_iso_n7_bundle_g3_sum0_dense_moment_n11_rank7_g5_finish.py",
    "dense_report": "iso_n7_bundle_g3_sum0_dense_moment_n11_exact_rank7_g5_finish_20260831.json",
    "padding_source": "prove_iso_n7_bundle_g3_sum0_isolate_padding_rank7_g5_finish.py",
    "padding_report": "iso_n7_bundle_g3_sum0_isolate_padding_exact_rank7_g5_finish_20260831.json",
}
EXPECTED = {
    "finite_source": "B938DDCC0F798036EC1B01EA92169D4A5EF24A784754D42733CFA74C3240F5D9",
    "finite_report": "12457F9ADFFCFD268F19375566E488A8C9D2A25CC581597D5196705DC08E94D5",
    "edgeless_source": "E2986C7F28297FBABBAD1B2A3BCF71FBCF37909273F1EC0322ED9ADCB716AF3B",
    "edgeless_report": "E3AED90CE5930061F653683794234F5A816A466945B69525202BB86B45F451E1",
    "dense_source": "8917070EBCB70B3A2D41468E2C6D76948E5BE037CF5409273779E6A1C85ACB11",
    "dense_report": "E9C950E18E122C1CF59619A2D7AD257F2EA9FD5E16E44014E2B75EDC09861ECF",
    "padding_source": "61C8A4309451E7EC0190F32596F4FC7EC49AE1DF1494D0552B96143DBF1B897F",
    "padding_report": "D05FEFF8E210064C994581FA739237F527940A7910351B5C35753846E1896E46",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    for key, digest in EXPECTED.items():
        assert sha256(HERE/FILES[key]) == digest, key
    finite = json.loads((HERE/FILES["finite_report"]).read_text(encoding="utf-8"))
    edgeless = json.loads((HERE/FILES["edgeless_report"]).read_text(encoding="utf-8"))
    dense = json.loads((HERE/FILES["dense_report"]).read_text(encoding="utf-8"))
    padding = json.loads((HERE/FILES["padding_report"]).read_text(encoding="utf-8"))
    assert finite["marker"] == (
        "PASS_EXACT_ISO_N7_BUNDLE_G123_FINITE_N2_10_ASSEMBLED_RANK7_G4_PIECEWISE"
    )
    assert finite["orders"] == [2, 10] and finite["negative_count"] == 0
    assert edgeless["marker"] == (
        "PASS_EXACT_ISO_N7_BUNDLE_G23_EDGELESS_ALL_PARENT_RANK7_G5_FINISH"
    )
    assert edgeless["coverage_gap_within_edgeless_G23"] is None
    assert dense["marker"] == (
        "PASS_EXACT_ISO_N7_BUNDLE_G3_SUM0_DENSE_MOMENT_N11_RANK7_G5_FINISH"
    )
    assert dense["coverage"]["orders"] == "n>=11"
    assert dense["coverage"]["unmarked_core_orders"] == "m>=9"
    assert dense["coverage_gap_within_stated_dense_G3_branch"] is None
    assert padding["marker"] == (
        "PASS_EXACT_ISO_N7_BUNDLE_G3_SUM0_ISOLATE_PADDING_RANK7_G5_FINISH"
    )
    assert padding["coverage"]["core_orders"] == "h>=2"
    assert padding["coverage_gap_within_positive_order_padding_coefficients"] is None
    assert padding["aggregate"]["exact_newton_recomposition"] is True
    assert padding["aggregate"]["exact_power_inversion"] is True

    # Every nonempty isolate-free forest has at least two vertices.  Its core
    # order h is therefore in exactly one of [2,8] or [9,infinity).
    assert set(range(2, 9)).isdisjoint(set(range(9, 12)))
    assert max(range(2, 9))+1 == 9
    assert 8+2 == 10 and 9+2 == 11

    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": (
            "For every forest C with two distinct nonadjacent marked vertices "
            "u,v having no unmarked neighbours, in no-parent mode D=C, the "
            "exact rank-seven bundle coefficient G3 is nonnegative."
        ),
        "core_decomposition": (
            "Write the unmarked forest uniquely as W=H+sK1 with H isolate-free."
        ),
        "exhaustive_classes": [
            {
                "class": "H empty",
                "method": "universal edgeless G2/G3 certificate",
            },
            {
                "class": "2<=h=|H|<=8",
                "base_order": "4<=n_base=h+2<=10",
                "method": (
                    "finite all-forest/all-parent G1/G2/G3 certificate, then "
                    "exact nonnegative isolate-padding Newton transfer"
                ),
            },
            {
                "class": "h=|H|>=9",
                "base_order": "n_base=h+2>=11",
                "method": (
                    "dense min-degree edge/wedge/subtree G3 certificate, then "
                    "exact nonnegative isolate-padding Newton transfer"
                ),
            },
        ],
        "evidence": {
            "dense_bernstein_controls": dense["certificate"]["bernstein_coefficients"],
            "dense_tail_power_coefficients": dense["certificate"][
                "tail_power_coefficients"
            ],
            "dense_minimum": dense["certificate"][
                "minimum_tail_power_coefficient"
            ],
            "padding_newton_coefficients": padding["aggregate"][
                "newton_coefficients"
            ],
            "padding_bernstein_controls": padding["aggregate"][
                "bernstein_controls"
            ],
            "padding_tail_power_coefficients": padding["aggregate"][
                "tail_power_coefficients"
            ],
            "padding_minimum": padding["aggregate"][
                "minimum_tail_power_coefficient"
            ],
        },
        "coverage_gap_within_no_parent_common0_sum0_G3": None,
        "universal_G3_claim": False,
        "dependencies_sha256": EXPECTED,
        "scope": (
            "Universal only for rank-seven G3 in the no-parent "
            "nonadjacent/common0/sum0 geometry. Endpoint/ordinary parent modes "
            "and the other marked geometries remain separate; universal G3 "
            "across all cells is not claimed."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    assert len(report["exhaustive_classes"]) == 3
    raw = json.dumps(report, indent=2, sort_keys=True)+"\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "exhaustive_core_classes": len(report["exhaustive_classes"]),
        "coverage_gap_within_no_parent_common0_sum0_G3": None,
        "universal_G3_claim": False,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
