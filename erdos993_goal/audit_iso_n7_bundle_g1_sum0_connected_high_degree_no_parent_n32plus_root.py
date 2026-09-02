#!/usr/bin/env python3
"""Independent fail-closed audit of the actual connected G1 m>=32 tail."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
ASSEMBLER = HERE / (
    "assemble_iso_n7_bundle_g1_sum0_connected_high_degree_"
    "no_parent_n32plus_rank7_g4_piecewise.py"
)
ASSEMBLER_SHA256 = "5ABAF915C509EAB5896528EBDCD75A8FD152454B660BA7DC1F0197ACE9D0ADBB"
ASSEMBLY = HERE / (
    "iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_"
    "n32plus_exact_rank7_g4_piecewise_20260831.json"
)
ASSEMBLY_SHA256 = "99CDEE5FB673ECFECD1C098D5DF9112049379385A4F4D96514C495B6E04571D7"
OUTPUT = HERE / (
    "iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_"
    "n32plus_independent_audit_exact_root_20260831.json"
)
MARKER = (
    "PASS_INDEPENDENT_EXACT_ISO_N7_BUNDLE_G1_SUM0_CONNECTED_HIGH_DEGREE_"
    "NO_PARENT_N32PLUS_ROOT"
)
PINS = {
    "prove_iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n32_rank7_g4_piecewise.py":
        "C726CA0853B37F215E9E98956EB9DD786A950BF692CA765835E97406BDD3D496",
    "iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n32_exact_rank7_g4_piecewise_20260831.json":
        "81ECA99C8E22B518894C781FFA0D63B8BB76ED484C4334435BA28A0CD72759AA",
    "assemble_iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n33plus_rank7_g4_piecewise.py":
        "0AB4BF9A8C5CFAB00568428B3DAA441858DE02F49C21F48187D7A6002C275E07",
    "iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n33plus_exact_rank7_g4_piecewise_20260831.json":
        "6A1F5696D55A696783089240496F70A36F776ABFE8C0665A7917805922B4AFE9",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def main() -> None:
    assert sha256(ASSEMBLER) == ASSEMBLER_SHA256
    assert sha256(ASSEMBLY) == ASSEMBLY_SHA256
    for name, expected in PINS.items():
        assert sha256(HERE / name) == expected, name

    assembly = load(ASSEMBLY)
    n32 = load(
        HERE / "iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_"
        "n32_exact_rank7_g4_piecewise_20260831.json"
    )
    tail = load(
        HERE / "iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_"
        "n33plus_exact_rank7_g4_piecewise_20260831.json"
    )

    assert assembly["marker"] == (
        "PASS_EXACT_ISO_N7_BUNDLE_G1_SUM0_CONNECTED_HIGH_DEGREE_"
        "NO_PARENT_N32PLUS_RANK7_G4_PIECEWISE"
    )
    assert assembly["source_sha256"] == ASSEMBLER_SHA256
    assert assembly["coverage_gap_within_stated_actual_tail_scope"] is None
    assert n32["marker"] == (
        "PASS_EXACT_ISO_N7_BUNDLE_G1_SUM0_CONNECTED_HIGH_DEGREE_"
        "NO_PARENT_N32_RANK7_G4_PIECEWISE"
    )
    assert tail["marker"] == (
        "PASS_EXACT_ISO_N7_BUNDLE_G1_SUM0_CONNECTED_HIGH_DEGREE_"
        "NO_PARENT_N33PLUS_RANK7_G4_PIECEWISE"
    )
    assert n32["coverage_gap_within_stated_actual_n32_scope"] is None
    assert tail["coverage_gap_within_stated_actual_tail_scope"] is None
    assert n32["certificate"]["literal_negative"] == 0
    assert n32["gapless_split"]["coverage_gap"] is None
    assert n32["gapless_split"]["residual_compatible_assignments"] == 10354089227
    assert n32["gapless_split"]["literal_low_P4_assignments"] == 104420797
    assert n32["certificate"]["literal_minimum_G1"] == "322687977704"
    assert n32["certificate"]["profile_stream_sha256"] == (
        "D9714064EE8F9B5741984023F517C8DDCC257307FF068C53B14A9EF8C2E2FD13"
    )
    assert n32["certificate"]["topology_stream_sha256"] == (
        "3F0CCB65CBC7CAA204BC8B7189DCE3A602360A032EBB044D94668F8F9E6099D9"
    )
    assert "m>=33" in tail["scope"]

    boundary = 32
    tail_floor = 33
    assert tail_floor == boundary + 1
    assert assembly["gapless_order_split"]["coverage_gap"] is None
    assert set(assembly["dependencies_sha256"].items()) == {
        (name, digest) for name, digest in PINS.items()
    }

    report = {
        "schema": "iso-n7-g1-connected-high-degree-n32plus-independent-audit-v1",
        "date": "2026-08-31",
        "marker": MARKER,
        "status": (
            "PASS independent hash, order-partition, stream, and literal-count "
            "audit for the actual connected high-degree no-parent G1 m>=32 tail"
        ),
        "assembler": ASSEMBLER.name,
        "assembler_sha256": ASSEMBLER_SHA256,
        "assembly": ASSEMBLY.name,
        "assembly_sha256": ASSEMBLY_SHA256,
        "pins": PINS,
        "independent_order_partition": {
            "boundary": [32],
            "tail": "m>=33",
            "union": "m>=32",
            "coverage_gap": None,
        },
        "n32_literal_negative": 0,
        "n32_compatible_assignments": 10354089227,
        "n32_literal_assignments": 104420797,
        "n32_literal_minimum_G1": "322687977704",
        "scope_guard": (
            "This audits only actual connected common0/sum0 no-parent G1, "
            "maximum degree at least four, at least three branching vertices, "
            "and m>=32. Orders m=11..31 and all other modes remain separate."
        ),
        "source": Path(__file__).name,
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(MARKER)
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", sha256(OUTPUT))
    print("REMAINING_ORDER_INTERVAL", "m=11..31")


if __name__ == "__main__":
    main()
