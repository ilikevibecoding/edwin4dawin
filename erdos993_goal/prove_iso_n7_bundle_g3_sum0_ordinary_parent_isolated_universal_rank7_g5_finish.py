#!/usr/bin/env python3
"""Assemble universal ordinary G3 when the designated parent is isolated."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "iso_n7_bundle_g3_sum0_ordinary_parent_isolated_universal_exact_"
    "rank7_g5_finish_20260831.json"
)
MARKER = (
    "PASS_EXACT_ISO_N7_BUNDLE_G3_SUM0_ORDINARY_PARENT_ISOLATED_"
    "UNIVERSAL_RANK7_G5_FINISH"
)
FILES = {
    "edgeless_source": "prove_iso_n7_bundle_g23_edgeless_all_parent_rank7_g5_finish.py",
    "edgeless_report": "iso_n7_bundle_g23_edgeless_all_parent_exact_rank7_g5_finish_20260831.json",
    "finite_source": "assemble_iso_n7_bundle_g123_finite_n2_10_rank7_g4_piecewise.py",
    "finite_report": "iso_n7_bundle_g123_finite_n2_10_assembled_exact_rank7_g4_piecewise_20260831.json",
    "isolated_base_source": (
        "prove_iso_n7_bundle_g3_sum0_ordinary_parent_isolated_moment_n11_"
        "rank7_g5_finish.py"
    ),
    "isolated_base_report": (
        "iso_n7_bundle_g3_sum0_ordinary_parent_isolated_moment_n11_exact_"
        "rank7_g5_finish_20260831.json"
    ),
    "padding_source": "prove_iso_n7_bundle_g3_sum0_ordinary_isolate_padding_rank7_g5_finish.py",
    "padding_report": "iso_n7_bundle_g3_sum0_ordinary_isolate_padding_exact_rank7_g5_finish_20260831.json",
}
EXPECTED = {
    "edgeless_source": "E2986C7F28297FBABBAD1B2A3BCF71FBCF37909273F1EC0322ED9ADCB716AF3B",
    "edgeless_report": "E3AED90CE5930061F653683794234F5A816A466945B69525202BB86B45F451E1",
    "finite_source": "B938DDCC0F798036EC1B01EA92169D4A5EF24A784754D42733CFA74C3240F5D9",
    "finite_report": "12457F9ADFFCFD268F19375566E488A8C9D2A25CC581597D5196705DC08E94D5",
    "isolated_base_source": "9DC7FC76CA3CE18FDA289EFDFB9563F0320F2C5791E602C9FE879121FEE1907A",
    "isolated_base_report": "31159A51456BA78E8F4D51D5B91645D3CEF326C4B7942B5D7C9A9A582D166B2A",
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
    edgeless = load("edgeless_report")
    finite = load("finite_report")
    isolated = load("isolated_base_report")
    padding = load("padding_report")
    assert edgeless["marker"] == (
        "PASS_EXACT_ISO_N7_BUNDLE_G23_EDGELESS_ALL_PARENT_RANK7_G5_FINISH"
    )
    assert edgeless["coverage_gap_within_edgeless_G23"] is None
    assert finite["marker"] == (
        "PASS_EXACT_ISO_N7_BUNDLE_G123_FINITE_N2_10_ASSEMBLED_RANK7_G4_PIECEWISE"
    )
    assert finite["orders"] == [2, 10] and finite["negative_count"] == 0
    assert isolated["marker"] == (
        "PASS_EXACT_ISO_N7_BUNDLE_G3_SUM0_ORDINARY_PARENT_ISOLATED_"
        "MOMENT_N11_RANK7_G5_FINISH"
    )
    assert isolated["coverage_gap_within_stated_isolated_parent_base_branch"] is None
    assert padding["marker"] == (
        "PASS_EXACT_ISO_N7_BUNDLE_G3_SUM0_ORDINARY_ISOLATE_PADDING_RANK7_G5_FINISH"
    )
    assert padding["coverage_gap_within_positive_order_ordinary_padding"] is None
    assert padding["aggregate"]["exact_newton_recomposition"] is True

    partition = [
        {
            "case": "W is edgeless",
            "certificate": "universal edgeless G2/G3 all-parent theorem",
            "orders": "all",
        },
        {
            "case": "W has an edge; stripped K is nonempty isolate-free; |K|+3<=10",
            "certificate": "finite all-forest/all-mode theorem",
            "base_orders": "5<=n0<=10",
        },
        {
            "case": "W has an edge; stripped K is nonempty isolate-free; |K|+3>=11",
            "certificate": "isolated-parent moment theorem",
            "base_orders": "n0>=11",
        },
        {
            "case": "restore every isolated unmarked vertex other than p",
            "certificate": "ordinary-parent isolate-padding theorem",
            "seam": (
                "The rooted base H=K+pK1 has h=|K|+1>=3, so its positive "
                "Newton transfer applies; H0 is supplied by the preceding base case."
            ),
        },
    ]
    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": (
            "For every rank-seven canonical ordinary-parent p_u0_v0 cell with "
            "nonadjacent marked vertices in common0/sum0 geometry, if the designated "
            "ordinary parent p is isolated in the unmarked forest W, then G3>=0 at "
            "every order."
        ),
        "compatibility_guard": (
            "The sum0 geometry forces the ordinary mask p_u0_v0. No other ordinary "
            "mask or geometry is asserted."
        ),
        "canonical_decomposition": (
            "If W is not edgeless, delete every isolated unmarked vertex other than "
            "p. The remaining rooted base is H=K+pK1, where K is a nonempty "
            "isolate-free forest. Its total base order is n0=|K|+3."
        ),
        "disjoint_exhaustive_partition": partition,
        "coverage": {
            "coefficient": "G3",
            "geometry": "nonadjacent_common0_sum0",
            "mode": "ordinary_parent_p_u0_v0",
            "ordinary_parent": "isolated in W",
            "orders": "all",
        },
        "coverage_gap_within_isolated_parent_ordinary_G3": None,
        "universal_across_all_ordinary_parent_placements_guard": False,
        "universal_across_all_G3_modes_guard": False,
        "dependencies_sha256": EXPECTED,
        "scope": (
            "Universal only within the isolated ordinary-parent p_u0_v0 "
            "nonadjacent/common0/sum0 G3 branch. A nonisolated ordinary parent, "
            "other geometries, other parent modes, G1/G2, and the full conjecture "
            "are separate."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "partition_cases": len(partition),
        "coverage_gap_within_isolated_parent_ordinary_G3": None,
        "universal_across_all_G3_modes_guard": False,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
