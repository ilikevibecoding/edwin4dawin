#!/usr/bin/env python3
"""Exact finite-core cutoff assembly for rank-seven G3 sum0/no-parent.

Every unmarked forest W is written uniquely as H+sK1 with H isolate-free.
The dense-core certificate closes |H|>=125, the finite n<=10 certificate
closes 1<=|H|<=8, the edgeless theorem closes H empty, and exact isolate
padding transfers each closed base H back to W.  The sole residual strip is
therefore the finite family 9<=|H|<=124 (necessarily e(H)>=5).
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "iso_n7_bundle_g3_sum0_core_cutoff_assembled_exact_"
    "rank7_g5_finish_20260831.json"
)
MARKER = "ASSEMBLED_EXACT_ISO_N7_BUNDLE_G3_SUM0_CORE_CUTOFF_RANK7_G5_FINISH"
FILES = {
    "finite_source": "assemble_iso_n7_bundle_g123_finite_n2_10_rank7_g4_piecewise.py",
    "finite_report": "iso_n7_bundle_g123_finite_n2_10_assembled_exact_rank7_g4_piecewise_20260831.json",
    "edgeless_source": "prove_iso_n7_bundle_g23_edgeless_all_parent_rank7_g5_finish.py",
    "edgeless_report": "iso_n7_bundle_g23_edgeless_all_parent_exact_rank7_g5_finish_20260831.json",
    "dense_source": "prove_iso_n7_bundle_g3_sum0_dense_extension_n127_rank7_g5_finish.py",
    "dense_report": "iso_n7_bundle_g3_sum0_dense_extension_n127_exact_rank7_g5_finish_20260831.json",
    "padding_source": "prove_iso_n7_bundle_g3_sum0_isolate_padding_rank7_g5_finish.py",
    "padding_report": "iso_n7_bundle_g3_sum0_isolate_padding_exact_rank7_g5_finish_20260831.json",
}
EXPECTED = {
    "finite_source": "B938DDCC0F798036EC1B01EA92169D4A5EF24A784754D42733CFA74C3240F5D9",
    "finite_report": "12457F9ADFFCFD268F19375566E488A8C9D2A25CC581597D5196705DC08E94D5",
    "edgeless_source": "E2986C7F28297FBABBAD1B2A3BCF71FBCF37909273F1EC0322ED9ADCB716AF3B",
    "edgeless_report": "E3AED90CE5930061F653683794234F5A816A466945B69525202BB86B45F451E1",
    "dense_source": "D36BE7377B8C349B6D112E34DE4A09E2B510767D592902D08A2FE84EA1423656",
    "dense_report": "51AE718754D690DE534D1384FEF2ED04FDD9659140F06F2DAB640CBBE34D7461",
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
        "PASS_EXACT_ISO_N7_BUNDLE_G3_SUM0_DENSE_EXTENSION_N127_RANK7_G5_FINISH"
    )
    assert dense["coverage"]["orders"] == "n>=127"
    assert dense["coverage"]["condition"] == (
        "the unmarked forest W has minimum degree at least one"
    )
    assert dense["coverage_gap_within_stated_dense_G3_branch"] is None
    assert padding["marker"] == (
        "PASS_EXACT_ISO_N7_BUNDLE_G3_SUM0_ISOLATE_PADDING_RANK7_G5_FINISH"
    )
    assert padding["coverage"]["core_orders"] == "h>=2"
    assert padding["coverage_gap_within_positive_order_padding_coefficients"] is None
    assert padding["aggregate"]["exact_newton_recomposition"] is True
    assert padding["aggregate"]["exact_power_inversion"] is True

    # Exact cutoff arithmetic.  The dense theorem counts total base order
    # n_base=h+2, so n_base>=127 iff h>=125.  A nonempty isolate-free forest
    # has delta>=1, hence 2e>=h.  Thus every h>=9 residual has e>=ceil(h/2)>=5.
    assert 125+2 == 127
    assert (9+1)//2 == 5

    report = {
        "marker": MARKER,
        "status": "exact finite-cutoff assembly; residual explicitly retained",
        "coefficient": "rank-seven G3",
        "geometry_mode": "no-parent nonadjacent/common0/sum0",
        "decomposition": "W=H+sK1, where H is the unique isolate-free core",
        "closed_core_classes": [
            {
                "class": "H empty",
                "equivalent_condition": "W is edgeless",
                "base_certificate": "pinned universal edgeless G2/G3 theorem",
                "padding_needed": False,
            },
            {
                "class": "1<=h=|H|<=8",
                "base_total_order": "3<=n_base=h+2<=10",
                "base_certificate": "pinned exhaustive finite n=2,...,10 G1/G2/G3 theorem",
                "transfer": "exact nonnegative isolate-padding Newton coefficients",
            },
            {
                "class": "h=|H|>=125",
                "base_total_order": "n_base=h+2>=127",
                "base_certificate": "pinned dense min-degree G3 theorem",
                "transfer": "exact nonnegative isolate-padding Newton coefficients",
            },
        ],
        "remaining_core_class": {
            "isolate_free": True,
            "core_order": "9<=h<=124",
            "edge_count": "ceil(h/2)<=e<=h-1, hence e>=5",
            "finite": True,
            "reason": (
                "delta(H)>=1 gives h<=2e; acyclicity gives e<=h-1"
            ),
        },
        "cutoff_arithmetic": {
            "dense_total_order_threshold": 127,
            "two_marked_vertices": 2,
            "dense_core_order_threshold": 125,
            "finite_base_core_max": 8,
            "open_core_order_interval": [9, 124],
        },
        "universal_G3_claim": False,
        "coverage_gap": (
            "The finite isolate-free base-core strip 9<=h<=124, "
            "ceil(h/2)<=e<=h-1, remains open."
        ),
        "dependencies_sha256": EXPECTED,
        "scope": (
            "This is a finite-stopping theorem for the no-parent "
            "nonadjacent/common0/sum0 G3 branch only. Other geometries and "
            "parent modes remain separate, and universal G3 is not claimed."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True)+"\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "closed_core_classes": len(report["closed_core_classes"]),
        "remaining_core_class": report["remaining_core_class"],
        "universal_G3_claim": False,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
