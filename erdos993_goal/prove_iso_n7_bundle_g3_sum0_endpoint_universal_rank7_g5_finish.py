#!/usr/bin/env python3
"""Universal endpoint-parent assembly for rank-seven G3 common0/sum0."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "iso_n7_bundle_g3_sum0_endpoint_universal_exact_"
    "rank7_g5_finish_20260831.json"
)
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G3_SUM0_ENDPOINT_UNIVERSAL_RANK7_G5_FINISH"
FILES = {
    "finite_source": "assemble_iso_n7_bundle_g123_finite_n2_10_rank7_g4_piecewise.py",
    "finite_report": "iso_n7_bundle_g123_finite_n2_10_assembled_exact_rank7_g4_piecewise_20260831.json",
    "edgeless_source": "prove_iso_n7_bundle_g23_edgeless_all_parent_rank7_g5_finish.py",
    "edgeless_report": "iso_n7_bundle_g23_edgeless_all_parent_exact_rank7_g5_finish_20260831.json",
    "dense_source": "prove_iso_n7_bundle_g3_sum0_endpoint_dense_moment_n11_rank7_g5_finish.py",
    "dense_report": "iso_n7_bundle_g3_sum0_endpoint_dense_moment_n11_exact_rank7_g5_finish_20260831.json",
    "padding_source": "prove_iso_n7_bundle_g3_sum0_endpoint_isolate_padding_rank7_g5_finish.py",
    "padding_report": "iso_n7_bundle_g3_sum0_endpoint_isolate_padding_exact_rank7_g5_finish_20260831.json",
}
EXPECTED = {
    "finite_source": "B938DDCC0F798036EC1B01EA92169D4A5EF24A784754D42733CFA74C3240F5D9",
    "finite_report": "12457F9ADFFCFD268F19375566E488A8C9D2A25CC581597D5196705DC08E94D5",
    "edgeless_source": "E2986C7F28297FBABBAD1B2A3BCF71FBCF37909273F1EC0322ED9ADCB716AF3B",
    "edgeless_report": "E3AED90CE5930061F653683794234F5A816A466945B69525202BB86B45F451E1",
    "dense_source": "DBBA8FFEB9FE4A5A7010258030FAF37AE2DAE9E813F813A86B659CB35E369C7E",
    "dense_report": "C836F406AE56AA142B8ED464024B4B94E7973842E76D9421A3E35229DF186D2B",
    "padding_source": "BC77401069E6AEB174D0970726F24DAA17ECDA5E4DA79EC3E96B00393329879E",
    "padding_report": "6FB674812CFDD7B45D6D87B56445CF617B0346EF120F71B3A004FC19F32FD2CF",
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
    assert finite["orders"] == [2, 10] and finite["negative_count"] == 0
    assert edgeless["marker"] == (
        "PASS_EXACT_ISO_N7_BUNDLE_G23_EDGELESS_ALL_PARENT_RANK7_G5_FINISH"
    )
    assert dense["marker"] == (
        "PASS_EXACT_ISO_N7_BUNDLE_G3_SUM0_ENDPOINT_DENSE_MOMENT_N11_RANK7_G5_FINISH"
    )
    assert dense["coverage"]["modes"] == ["endpoint_u", "endpoint_v"]
    assert dense["coverage"]["unmarked_core_orders"] == "m>=9"
    assert dense["coverage_gap_within_stated_endpoint_dense_branch"] is None
    assert padding["marker"] == (
        "PASS_EXACT_ISO_N7_BUNDLE_G3_SUM0_ENDPOINT_ISOLATE_PADDING_RANK7_G5_FINISH"
    )
    assert padding["modes"] == ["endpoint_u", "endpoint_v"]
    assert padding["coverage_gap_within_positive_order_endpoint_padding"] is None
    assert 8+2 == 10 and 9+2 == 11
    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": (
            "For every forest C with nonadjacent marked vertices having no "
            "unmarked neighbours, in either endpoint-parent mode, the exact "
            "rank-seven bundle coefficient G3 is nonnegative."
        ),
        "modes": ["endpoint_u", "endpoint_v"],
        "core_decomposition": "W=H+sK1 with unique isolate-free core H",
        "exhaustive_classes": [
            {"class": "H empty", "method": "universal edgeless theorem"},
            {
                "class": "2<=|H|<=8",
                "method": "finite n_base<=10 theorem plus endpoint isolate padding",
            },
            {
                "class": "|H|>=9",
                "method": "endpoint dense moment n_base>=11 theorem plus padding",
            },
        ],
        "evidence": {
            "dense_controls": dense["certificate"]["bernstein_coefficients"],
            "dense_tail_scalars": dense["certificate"]["tail_power_coefficients"],
            "dense_minimum": dense["certificate"]["minimum_tail_power_coefficient"],
            "padding_controls": padding["aggregate"]["bernstein_controls"],
            "padding_tail_scalars": padding["aggregate"]["tail_power_coefficients"],
            "padding_minimum": padding["aggregate"]["minimum_tail_power_coefficient"],
        },
        "coverage_gap_within_endpoint_common0_sum0_G3": None,
        "universal_G3_claim": False,
        "dependencies_sha256": EXPECTED,
        "scope": (
            "Universal only for the two endpoint-parent common0/sum0 G3 modes. "
            "Ordinary parent and other geometries remain separate."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True)+"\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "modes": report["modes"],
        "coverage_gap_within_endpoint_common0_sum0_G3": None,
        "universal_G3_claim": False,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
