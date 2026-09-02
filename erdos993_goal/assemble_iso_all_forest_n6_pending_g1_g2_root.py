#!/usr/bin/env python3
"""Fail-closed all-N6 assembler after closing universal g3 and g4.

The theorem remains null until universal rank-six bundle g1 and g2 are both
pinned.  This refresh preserves the frozen terminal and top-coefficient pins
and records the stronger arbitrary-induced-minor g3 theorem.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import assemble_iso_all_forest_n6_bundle_induction_g1_nonadjacent as base


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_all_forest_n6_pending_g1_g2_exact_root_20260831.json"
MARKER = "PENDING_EXACT_ALL_MARKED_FOREST_N6_AFTER_G3_G4_TERMINAL_ROOT"
BASE_SHA256 = "69C1B5EB93764A8C774C5FDA98C259AB0846FC541095F9AAA9975FF32B8A172B"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    assert sha256(
        HERE / "assemble_iso_all_forest_n6_bundle_induction_g1_nonadjacent.py"
    ) == BASE_SHA256
    base.DEPENDENCIES["g3_all_five_modes"] = {
        "source": "prove_iso_n6_bundle_g3_marked_edge_bernstein_g1_nonadjacent.py",
        "source_sha256": "F38C1BDA7F3404B26D1F1085E02C1F54B02E256DB5ACBB1E0F91D107067CE46D",
        "report": "iso_n6_bundle_g3_marked_edge_bernstein_exact_g1_nonadjacent_20260831.json",
        "report_sha256": "C34717BA42B978C93B01FFDA524609DDA212909832339E790A7761C33FC8ECA5",
        "marker": "PASS_EXACT_ISO_N6_BUNDLE_G3_MARKED_EDGE_BERNSTEIN_G1_NONADJACENT",
    }
    base.DEPENDENCIES["g4_all_five_modes"] = {
        "source": "prove_iso_n6_bundle_g4_marked_edge_bernstein_g1_bernstein.py",
        "source_sha256": "6B3106BCEE7F7ECA68C4C5B6861EF018E7E2023DFD8BA091CDAC1EA1FB0085A6",
        "report": "iso_n6_bundle_g4_marked_edge_bernstein_exact_g1_bernstein_20260830.json",
        "report_sha256": "664BEF48E70853EEE3C277590385F412CBAA262E424E52E2B4D184AA507B82E3",
        "marker": "PASS_INDEPENDENT_EXACT_ISO_N6_BUNDLE_G4_MARKED_EDGE_BERNSTEIN_G1_BERNSTEIN",
    }
    base.DEPENDENCIES["terminal_N6_independent"] = {
        "source": "audit_iso_n6_terminal_brooms_isolates_independent_rank5_g2_alt.py",
        "source_sha256": "D47A8D3F8452462BFECD526BE56192A87E5349E6E40452DA4284C0F799538B9E",
        "report": "iso_n6_terminal_brooms_isolates_independent_audit_exact_rank5_g2_alt_20260830.json",
        "report_sha256": "EEEC14D1F418DBE4CAAA1F34A400A486D7ABBFC3D0CE050F7D10FBBF0BB3D677",
        "marker": "PASS_INDEPENDENT_EXACT_ISO_N6_TERMINAL_BROOMS_ISOLATES_RANK5_G2_ALT",
    }

    report = base.assemble_report()
    assert report["theorem"] is None
    assert report["strong_induction"]["conclusion"] is None
    assert report["open_dependencies"] == [
        "g1_all_five_modes", "g2_all_five_modes"
    ]
    g3 = json.loads(
        (HERE / base.DEPENDENCIES["g3_all_five_modes"]["report"]).read_text(
            encoding="utf-8"
        )
    )
    assert "every induced marked minor D of C" in g3["theorem"]
    assert g3["orders_2_through_7"]["arbitrary_induced_D_negative_count"] == 0
    assert len(g3["edge_wedge_geometry"]["five_branches"]) == 5

    report.update({
        "marker": MARKER,
        "status": "fail-closed draft; exactly universal rank-six g1 and g2 remain",
        "open_obligations": [
            "Pin universal rank-six bundle g1.",
            "Pin universal rank-six bundle g2.",
        ],
        "source_sha256": sha256(Path(__file__)),
        "refreshed_from_base_assembler_sha256": BASE_SHA256,
    })
    report["bundle_payment"]["coefficient_coverage"].update({
        "g3": "g3_all_five_modes",
        "g4": "g4_all_five_modes",
    })
    report["terminal_base"]["independent"] = "terminal_N6_independent"
    report["scope_guard"] = (
        "Universal rank-six g3 and g4, g5..g10, and both terminal N6 proofs "
        "are pinned. The all-N6 theorem and induction conclusion remain null "
        "until g1 and g2 close. All-N7, the Newton-tail bridge, and Erdos "
        "Problem 993 remain separate."
    )
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "open_dependencies": report["open_dependencies"],
        "g3": report["bundle_payment"]["coefficient_coverage"]["g3"],
        "g4": report["bundle_payment"]["coefficient_coverage"]["g4"],
        "theorem": report["theorem"],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
