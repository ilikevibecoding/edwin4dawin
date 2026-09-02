#!/usr/bin/env python3
"""Fail-closed all-N6 assembler after closing g4 and terminal N6 audit.

This refreshes the authoritative dependency map without modifying the earlier
pending artifact.  The theorem remains null until universal rank-six bundle
g1, g2, and g3 are all pinned.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import assemble_iso_all_forest_n6_bundle_induction_g1_nonadjacent as base


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_all_forest_n6_pending_g1_g3_exact_root_20260830.json"
MARKER = "PENDING_EXACT_ALL_MARKED_FOREST_N6_AFTER_G4_TERMINAL_AUDIT_ROOT"
BASE_SHA256 = "69C1B5EB93764A8C774C5FDA98C259AB0846FC541095F9AAA9975FF32B8A172B"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    assert sha256(HERE / "assemble_iso_all_forest_n6_bundle_induction_g1_nonadjacent.py") == BASE_SHA256
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
        "g1_all_five_modes", "g2_all_five_modes", "g3_all_five_modes"
    ]
    g4 = json.loads(
        (HERE / base.DEPENDENCIES["g4_all_five_modes"]["report"]).read_text(encoding="utf-8")
    )
    terminal_audit = json.loads(
        (HERE / base.DEPENDENCIES["terminal_N6_independent"]["report"]).read_text(encoding="utf-8")
    )
    assert g4["theorem"].endswith("the binomial coefficient g4 is strictly positive.")
    assert g4["orders_2_through_7"]["negative_cells"] == 0
    assert len(g4["edge_wedge_geometry"]["five_branches"]) == 5
    assert terminal_audit["coverage"]["no_gap"] is True
    assert terminal_audit["independent_terminal_family_exhaustion"]["atlas_replay"]["equivalence_failures"] == 0

    report.update({
        "marker": MARKER,
        "status": "fail-closed draft; exactly three universal same-rank pins remain",
        "open_obligations": [
            "Pin universal rank-six bundle g1.",
            "Pin universal rank-six bundle g2.",
            "Pin universal rank-six bundle g3.",
        ],
        "source_sha256": sha256(Path(__file__)),
        "refreshed_from_base_assembler_sha256": BASE_SHA256,
    })
    report["bundle_payment"]["coefficient_coverage"]["g4"] = "g4_all_five_modes"
    report["terminal_base"]["independent"] = "terminal_N6_independent"
    report["scope_guard"] = (
        "The universal rank-six g4 sign and both terminal N6 proofs are pinned, "
        "but theorem and induction conclusion remain null until g1,g2,g3 close. "
        "Finite evidence is not promoted; all-N7, the Newton-tail bridge, and "
        "Erdos Problem 993 remain separate."
    )
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "open_dependencies": report["open_dependencies"],
        "g4": report["bundle_payment"]["coefficient_coverage"]["g4"],
        "terminal_audit": report["terminal_base"]["independent"],
        "theorem": report["theorem"],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
