#!/usr/bin/env python3
"""Fail-closed bridge audit from rank-seven bundle propagation to Newton tail.

This is a dependency/status theorem, not a positivity promotion.  It pins the
current rank-seven bundle package, the terminal N7 base, the still-pending N6
lower-rank payment, and the exact terminal-q3 Newton certificates.  It records
the minimal residual without identifying these logically distinct layers.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank7_propagation_terminal_newton_bridge_exact_20260831.json"
MARKER = "PASS_FAIL_CLOSED_RANK7_PROPAGATION_TERMINAL_NEWTON_BRIDGE_AUDIT"

PINS = {
    "rank7_g4_g12_source": (
        "assemble_iso_n7_bundle_g4_g12_rank7_propagation.py",
        "CE10E105A6D6B65BA4DDC0DB394F07A72729AB23F3363A621A87A0C60A4BF120",
    ),
    "rank7_g4_g12_report": (
        "iso_n7_bundle_g4_g12_assembled_exact_rank7_propagation_20260831.json",
        "E636B3D4BED00E5C3012756AFB1638333474862F09E4BCF85A25D2EC94572046",
    ),
    "rank7_terminal_source": (
        "prove_iso_n7_terminal_brooms_isolates_rank7_terminal.py",
        "44416438D51A55D29B107170CF57487E63F009FD9F33E3BD387C925BEB149B81",
    ),
    "rank7_terminal_report": (
        "iso_n7_terminal_brooms_isolates_exact_rank7_terminal_20260831.json",
        "8CF67ACB7FC2B5EA0B578B85A4FEE994D93A1C0B788B2D4760DB4289A5E2E4F2",
    ),
    "rank6_pending_source": (
        "assemble_iso_all_forest_n6_pending_g1_g2_root.py",
        "E9B8ED7B6730657A1B2253E9326B80C0E15B548DC9FA507A24916452378333AB",
    ),
    "rank6_pending_report": (
        "iso_all_forest_n6_pending_g1_g2_exact_root_20260831.json",
        "B07A0313246F23D8CBA1F692785D1D741182E04E31A4CB4CB2754E07C1A8F991",
    ),
    "newton_m2_source": (
        "audit_terminal_q3_low_newton_m2_forest_base_agent.py",
        "78DF5272D69C8137CE0EF78BDBAD24A8C858D0FD60EAA0734EBFF3351D5BF54E",
    ),
    "newton_m2_report": (
        "terminal_q3_low_newton_m2_forest_base_audit_20260829.json",
        "328F2A1486CB9A581A565862993380D37EDC91A27BC29924A99E6B970B7FFD69",
    ),
    "newton_m3_source": (
        "audit_terminal_q3_low_newton_m3_forest_base_agent.py",
        "F411378049A5A715BCDF8D4C67F1E776ECA1B8ACCBB6CD4D9C65E9A228196E49",
    ),
    "newton_m3_report": (
        "terminal_q3_low_newton_m3_forest_base_audit_20260829.json",
        "193945C8C188D43F9E63223E94515C514CFA2AD28A4C0E2099AE58105CCB6A42",
    ),
    "newton_m4_source": (
        "audit_terminal_q3_low_newton_m4_forest_base_agent.py",
        "A48B9AD019DA6B5CC41C1A70F75BEACC2BC507157D693C697C8FD7571F17964E",
    ),
    "newton_m4_report": (
        "terminal_q3_low_newton_m4_forest_base_audit_20260829.json",
        "893BEAFDC7E4C410D5C8DAA9AD124A0F3F951C85CFD3851A6BA93B96B15681E4",
    ),
    "newton_m5_source": (
        "audit_terminal_q3_low_newton_m5_forest_base_agent.py",
        "2EC37476F7E056463913DEDCAB277536BE77C43537F12272BE88F1CBE318C15E",
    ),
    "newton_m5_report": (
        "terminal_q3_low_newton_m5_forest_base_audit_20260829.json",
        "8326E6055F666A0E3540FCBAF8A720FB7A79ACD78E898B9746AD45B5EBAD2AC3",
    ),
    "newton_m6_source": (
        "prove_terminal_q3_low_newton_m6_conditional_independent_agent.py",
        "A1225191B4224AB0ABDA3E94E6262C13F46E591BDCC9254609EC589AC9A3E3ED",
    ),
    "newton_m6_report": (
        "terminal_q3_low_newton_m6_exact_independent_20260829.json",
        "0F0AB60B4E248EA6619BD06E471D4776B0D043605185B27DD9D6854B17DDEAC4",
    ),
    "newton_m7_source": (
        "prove_terminal_q3_low_newton_m7_independent_agent.py",
        "7B1562D876D5616765585DE9E3B1CCA97B21BC3ED1A51CA43A651DE5EA071757",
    ),
    "newton_m7_report": (
        "terminal_q3_low_newton_m7_exact_independent_20260829.json",
        "33C47D005746DDE2BBB2B4DD37B0A8ECF45A7FD00821E0119BCA8E2F55E18116",
    ),
    "newton_tail_source": (
        "verify_terminal_q3_payment_newton_tail_independent_agent.py",
        "FDC4736A2B5729954C585A37800915C818A24667D55E6DDB2F76B122FD334BA6",
    ),
    "newton_tail_report": (
        "terminal_q3_payment_newton_tail_independent_20260828.json",
        "EFA58A539FAA2627D3BC1ECC9E5925D6BB6587F555540F01574608F7C38EA212",
    ),
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(key: str) -> dict:
    return json.loads((HERE / PINS[key][0]).read_text(encoding="utf-8"))


def main():
    observed = {}
    for key, (name, expected) in PINS.items():
        actual = sha256(HERE / name)
        assert actual == expected, (key, expected, actual)
        observed[key] = {"file": name, "sha256": actual}

    rank7_bundle = load("rank7_g4_g12_report")
    assert rank7_bundle["marker"] == (
        "PASS_EXACT_ISO_N7_BUNDLE_G4_G12_ASSEMBLED_RANK7_PROPAGATION"
    )
    assert rank7_bundle["source_sha256"] == PINS["rank7_g4_g12_source"][1]
    assert rank7_bundle["closed_coefficients"] == [4, 5, 6, 7, 8, 9, 10, 11, 12]
    assert rank7_bundle["open_coefficients"] == [1, 2, 3]

    terminal_n7 = load("rank7_terminal_report")
    assert terminal_n7["marker"] == "PASS_EXACT_ISO_N7_TERMINAL_BROOMS_ISOLATES_RANK7_TERMINAL"
    assert terminal_n7["source_sha256"] == PINS["rank7_terminal_source"][1]
    assert terminal_n7["coverage"]["no_gap"] is True
    assert terminal_n7["coverage"]["terminal_families_exhausted"] is True

    rank6 = load("rank6_pending_report")
    assert rank6["marker"] == "PENDING_EXACT_ALL_MARKED_FOREST_N6_AFTER_G3_G4_TERMINAL_ROOT"
    assert rank6["source_sha256"] == PINS["rank6_pending_source"][1]
    assert rank6["open_dependencies"] == ["g1_all_five_modes", "g2_all_five_modes"]
    assert rank6["theorem"] is None
    assert rank6["strong_induction"]["conclusion"] is None

    newton_expected = {
        2: "PASS_INDEPENDENT_EXACT_ALL_FOREST_BASE_TERMINAL_Q3_LOW_NEWTON_M2",
        3: "PASS_INDEPENDENT_EXACT_ALL_FOREST_BASE_TERMINAL_Q3_LOW_NEWTON_M3",
        4: "PASS_INDEPENDENT_EXACT_ALL_FOREST_BASE_TERMINAL_Q3_LOW_NEWTON_M4",
        5: "PASS_INDEPENDENT_EXACT_ALL_FOREST_BASE_TERMINAL_Q3_LOW_NEWTON_M5",
        6: "PASS_INDEPENDENT_EXACT_ALL_ORDER_TERMINAL_Q3_LOW_NEWTON_M6",
        7: "PASS_INDEPENDENT_EXACT_ALL_ORDER_TERMINAL_Q3_LOW_NEWTON_M7",
    }
    newton_reports = {}
    for degree, status in newton_expected.items():
        report = load(f"newton_m{degree}_report")
        assert report["status"] == status
        assert report["source_sha256"] == PINS[f"newton_m{degree}_source"][1]
        newton_reports[str(degree)] = {
            "status": status,
            "claim": report["claim"],
            "scope": report["scope"],
        }

    tail = load("newton_tail_report")
    assert tail["status"] == "PASS_EXACT_ALL_ORDER_TERMINAL_PAYMENT_NEWTON_TAIL_M8_PLUS_REDUCTION"
    assert tail["source_sha256"] == PINS["newton_tail_source"][1]
    assert tail["exact_checks"]["low_remainder_degree"] == 7
    assert tail["remaining"] == [
        "prove Newton coefficients m=0,1,2,3,4,5,6,7 of delta",
        "assemble with the pinned anchor and included-block M1 positivity",
    ]

    parent_modes = ["no_parent", "endpoint_u", "endpoint_v", "ordinary_parent"]
    marked_geometries = [
        "adjacent",
        "nonadjacent_common1",
        "nonadjacent_common0_sum0",
        "nonadjacent_common0_sum1",
        "nonadjacent_common0_sum_ge2",
    ]

    report = {
        "marker": MARKER,
        "status": "exact fail-closed dependency bridge; no all-N7 or full-Newton promotion",
        "rank7_propagation": {
            "lower_rank_payment": {
                "status": "OPEN",
                "reason": "unconditional all-N6 is not pinned",
                "rank6_open_dependencies": rank6["open_dependencies"],
            },
            "bundle_coefficients": {
                "closed": ["g4", "g5", "g6", "g7", "g8", "g9", "g10", "g11", "g12"],
                "open": ["g1", "g2", "g3"],
                "open_parent_modes_required": parent_modes,
                "open_marked_geometry_partition_required": marked_geometries,
                "geometry_note": (
                    "No universal all-parent/all-geometry package for g1, g2, or "
                    "g3 is pinned; reductions may collapse cases, so this audit "
                    "does not multiply these lists into a synthetic case count."
                ),
            },
            "terminal_N7_base": {
                "status": "CLOSED",
                "marker": terminal_n7["marker"],
                "theorem": terminal_n7["theorem"],
            },
            "all_N7_assembly": {
                "status": "OPEN",
                "missing": [
                    "unconditional all-N6 lower-rank payment",
                    "universal rank7 g1",
                    "universal rank7 g2",
                    "universal rank7 g3",
                    "fail-closed rank7 classifier/exhaustion and strong-induction assembler",
                ],
            },
        },
        "terminal_newton": {
            "m2_through_m7_exact_reports": newton_reports,
            "m8_plus_tail": {
                "status": tail["status"],
                "claim": tail["claim"],
                "scope": tail["scope"],
            },
            "unassembled_low_degrees": [0, 1],
            "final_assembly_status": "OPEN",
            "scope_guard": (
                "The m2..m7 reports and m>=8 tail retain their own stated base/anchor "
                "scopes.  This bridge does not silently widen them."
            ),
        },
        "logical_bridge": {
            "rank7_marked_induction": (
                "Gamma_M=N7((1+x)^M C+xD)-N7(C+xD)-"
                "sum_(t=0)^(M-1)N6((1+x)^t C)."
            ),
            "separation": (
                "The rank7 marked-bundle induction and terminal-q3 Newton payment "
                "are distinct proof layers.  Closing g4..g12 does not discharge "
                "Newton m0/m1, and the Newton tail does not supply rank7 g1..g3 "
                "or all-N6."
            ),
        },
        "minimal_residual_checklist": [
            "Close universal rank6 g1 and g2, then freeze unconditional all-N6.",
            "Close universal rank7 g1, g2, and g3 across all required parent modes/geometries.",
            "Build the fail-closed all-N7 classifier/exhaustion and strong-induction assembler.",
            "Close/assemble terminal-q3 Newton degrees m0 and m1 in the required global scope.",
            "Assemble the terminal Newton payment/global bridge without widening any pinned scope.",
        ],
        "proof_boundary": (
            "This audit proves only the exact dependency state and already-pinned "
            "subpackages.  It does not prove all-N6, all-N7, the complete terminal "
            "payment, unimodality, or Erdos Problem 993."
        ),
        "pins": observed,
        "source_sha256": sha256(Path(__file__)),
    }
    OUTPUT.write_text(
        json.dumps(report, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
        newline="\n",
    )
    print(MARKER)


if __name__ == "__main__":
    main()
