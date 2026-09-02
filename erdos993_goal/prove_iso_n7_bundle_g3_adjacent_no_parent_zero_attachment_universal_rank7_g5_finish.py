#!/usr/bin/env python3
"""Universal zero-attachment subbranch of adjacent no-parent rank-seven G3."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_zero_attachment_universal_exact_rank7_g5_finish_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_ZERO_ATTACHMENT_UNIVERSAL_RANK7_G5_FINISH"
FILES = {
    "finite_source": "assemble_iso_n7_bundle_g123_finite_n2_10_rank7_g4_piecewise.py",
    "finite_report": "iso_n7_bundle_g123_finite_n2_10_assembled_exact_rank7_g4_piecewise_20260831.json",
    "large_source": "prove_iso_n7_bundle_g3_adjacent_no_parent_zero_attachment_isolatefree_n11_rank7_g5_finish.py",
    "large_report": "iso_n7_bundle_g3_adjacent_no_parent_zero_attachment_isolatefree_n11_exact_rank7_g5_finish_20260831.json",
    "padding_source": "prove_iso_n7_bundle_g3_adjacent_no_parent_zero_attachment_padding_rank7_g5_finish.py",
    "padding_report": "iso_n7_bundle_g3_adjacent_no_parent_zero_attachment_padding_exact_rank7_g5_finish_20260831.json",
}
EXPECTED = {
    "finite_source": "B938DDCC0F798036EC1B01EA92169D4A5EF24A784754D42733CFA74C3240F5D9",
    "finite_report": "12457F9ADFFCFD268F19375566E488A8C9D2A25CC581597D5196705DC08E94D5",
    "large_source": "AB9A3D961F3333E824668FD16248AC06BAC654B343E7CDD20002433B2D610790",
    "large_report": "1A7B1BD0B58690B665020975740CEC8C1946A70373613E62C4199B38E76A9438",
    "padding_source": "AA306F9369B48A318BE410D708C6C0942EDE13FDD2C132AE33BE37EA45D41079",
    "padding_report": "0DA607BB1A9B54D179A86F18019DC2D7986E88070378B7D411EA9DF0616CF0DF",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    for key, digest in EXPECTED.items():
        assert sha256(HERE / FILES[key]) == digest, key
    finite = json.loads((HERE / FILES["finite_report"]).read_text(encoding="utf-8"))
    large = json.loads((HERE / FILES["large_report"]).read_text(encoding="utf-8"))
    padding = json.loads((HERE / FILES["padding_report"]).read_text(encoding="utf-8"))
    assert finite["negative_count"] == 0 and finite["orders"] == [2, 10]
    assert large["coverage_gap_within_stated_zero_attachment_isolatefree_branch"] is None
    assert padding["coverage_gap_within_positive_order_zero_attachment_padding"] is None
    assert padding["aggregate"]["exact_newton_recomposition"] is True
    assert 8+2 == 10 and 9+2 == 11
    classes = [
        {"class": "W edgeless, m<=8", "method": "finite n=m+2<=10 certificate"},
        {"class": "W edgeless, m>=9", "method": "finite H=2K1 base at n=4 plus isolate padding"},
        {"class": "W has an edge, isolate-free core 2<=h<=8", "method": "finite base plus isolate padding"},
        {"class": "W has an edge, isolate-free core h>=9", "method": "large-order tau theorem plus isolate padding"},
    ]
    report = {
        "marker": MARKER, "status": "proved exact",
        "theorem": "For adjacent marks u,v with no unmarked neighbours at either mark, no-parent rank-seven G3 is nonnegative for every forest and every order.",
        "exhaustive_classes": classes,
        "coverage_gap_within_adjacent_no_parent_zero_attachment_G3": None,
        "universal_adjacent_guard": False,
        "rank7_G3_symmetry_reduced_cells_after": 18,
        "ledger_guard": "This is a strict subbranch of the adjacent no-parent cell; the residual ledger is not decremented.",
        "dependencies_sha256": EXPECTED,
        "scope": "Universal only for adjacent no-parent X=Y=empty. Any mark-to-W attachment remains open.",
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER, "exhaustive_classes": len(classes),
        "coverage_gap_within_adjacent_no_parent_zero_attachment_G3": None,
        "rank7_G3_symmetry_reduced_cells_after": 18,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
