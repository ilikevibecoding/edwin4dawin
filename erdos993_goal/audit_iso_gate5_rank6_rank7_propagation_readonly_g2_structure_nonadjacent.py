#!/usr/bin/env python3
"""Fail-closed read-only dependency map after the rank-five N5 gate.

This distinguishes the already-proved rank-six/rank-seven target Q/PGC
theorems from the marked four-minor N6/N7 induction.  It deliberately makes
no conditional theorem promotion while the all-N5 assembler is still pending.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_gate5_rank6_rank7_propagation_readonly_exact_g2_structure_nonadjacent_20260830.json"
MARKER = "PASS_FAIL_CLOSED_READONLY_GATE5_RANK6_RANK7_PROPAGATION_G2_STRUCTURE_NONADJACENT"


PINS = {
    "n5_source": (
        "assemble_iso_all_forest_n5_bundle_induction_g2_structure_nonadjacent.py",
        "9906E66E28717A80F1215DBCF75ADE913AFC5EE1911D1A08FD08317F6589AC38",
    ),
    "n5_report": (
        "iso_all_forest_n5_bundle_induction_exact_g2_structure_nonadjacent_20260830.json",
        "7F2845A77504828349E100371FEE2591CFDE70AF87E2504A91EE5D121357B3CB",
    ),
    "n6_bundle_source": (
        "derive_iso_n6_bundle_polynomial_root.py",
        "BB229E377F89B59767D402609FC11B2B9EE0A78D97090DA33316D93C7A3C8444",
    ),
    "n6_bundle_report": (
        "iso_n6_whole_bundle_binomial_symbolic_root_20260830.json",
        "F0E06EF479C77D1990ECBC180824107A83D88A03FDE5364FFC8BBA086AA4F780",
    ),
    "n6_finite_probe_source": (
        "probe_iso_n6_bundle_finite_root.py",
        "042119774A5F343A60924D9E46A5F5C7B07722AB355733179F16F23C4DEA2DFC",
    ),
    "n6_finite_probe_report": (
        "iso_n6_bundle_finite_probe_root_20260830.json",
        "8E2E59B418ADF242A8A884C1E3DB3A0EC323AABC2406755AA098A492B8810216",
    ),
    "n6_top_source": (
        "prove_iso_n6_bundle_top_coefficients_root.py",
        "D66274CD4E4F1D7B681662DDAA68B97985E2684B16588234C287B4115D12A970",
    ),
    "n6_top_report": (
        "iso_n6_bundle_top_coefficients_exact_root_20260830.json",
        "628BFD655335BF703C031687B73F32824D368466E57241E745FD48C6E82FC4BF",
    ),
    "n6_top_audit_source": (
        "audit_iso_n6_bundle_top_coefficients_independent_g2_structure_nonadjacent.py",
        "C4C39BA1BD0EF0FC55DD5CBFE5038F79A3259D8327D9C825B22CB29780F4E903",
    ),
    "n6_top_audit_report": (
        "iso_n6_bundle_top_coefficients_independent_audit_exact_g2_structure_nonadjacent_20260830.json",
        "ACCC9C7339E4DFBC1DB3083AB0754F1B888952C7CAC7B8EA75E5F8321F2CB918",
    ),
    "n6_g7_source": (
        "prove_iso_n6_bundle_g7_root.py",
        "047016067AD2E941AA488F248CC6F0A450A5BDB8776E9357F891812EAF5FF198",
    ),
    "n6_g7_report": (
        "iso_n6_bundle_g7_exact_root_20260830.json",
        "7C457382F29BA910D68282CD34ECA8CF770515C3447DC27C341D33485669D830",
    ),
    "n6_g7_audit_source": (
        "audit_iso_n6_bundle_g7_g2_transfer_audit.py",
        "1340B33DF04DD30F127D23CB213F3F71E1A927C6E463C1230A0ACF21C8660D49",
    ),
    "n6_g7_audit_report": (
        "iso_n6_bundle_g7_independent_audit_exact_g2_transfer_audit_20260830.json",
        "FA52C732E4A38828E5EFBD6E57B086772C864102DC02BE80A2BA0CA554BF382C",
    ),
    "n6_g6_source": (
        "prove_iso_n6_bundle_g6_root.py",
        "2ECF76862B1FB6C6C84DBD393C41601369F31506DA2AA4A44267FE37FC2594BD",
    ),
    "n6_g6_report": (
        "iso_n6_bundle_g6_exact_root_20260830.json",
        "2304848451FB6A2E6740EDCFA080452141A70692939AC2E2477520786574B77A",
    ),
    "n6_g6_audit_source": (
        "audit_iso_n6_bundle_g6_g2_transfer_audit.py",
        "A7C471704255D1705B5908D8940AF8DE0E9CB99EE74F9ED06E850A5F91C0783C",
    ),
    "n6_g6_audit_report": (
        "iso_n6_bundle_g6_independent_audit_exact_g2_transfer_audit_20260830.json",
        "1284A8D96FB8F5E4A619EE5C60C5BD93DA67A06BB15F52DB4298B13D0C1E3F3A",
    ),
    "n6_terminal_source": (
        "prove_iso_n6_terminal_brooms_isolates_g1_nonadjacent.py",
        "2A925AF880B63389AA7F0BC4EAB16E9A49BFC589F6510D2A8527ED7C62028CC1",
    ),
    "n6_terminal_report": (
        "iso_n6_terminal_brooms_isolates_exact_g1_nonadjacent_20260830.json",
        "FAB36BAAB45E5F33DC629C8EE3235CD1E2CC300CC1FD38942A0C9CF522BD6958",
    ),
    "n6_top_g5_g10_source": (
        "assemble_iso_n6_bundle_top_g5_g10_root.py",
        "22642D68B0FD0A5EE53C80C6244E46950B5093E071E41E3BFD925F254F0801EE",
    ),
    "n6_top_g5_g10_report": (
        "iso_n6_bundle_top_g5_g10_assembled_exact_root_20260830.json",
        "C26D5A80AD4617461971F8AA09ADC2E4C1AEE24BB592D71112992AAD2FA09AF7",
    ),
    "n6_pending_assembler_source": (
        "assemble_iso_all_forest_n6_bundle_induction_g1_nonadjacent.py",
        "69C1B5EB93764A8C774C5FDA98C259AB0846FC541095F9AAA9975FF32B8A172B",
    ),
    "n6_pending_assembler_report": (
        "iso_all_forest_n6_bundle_induction_exact_g1_nonadjacent_20260830.json",
        "3D779EAF2EC24CDFCB62B10FB16E8D114C8E5D0B69304CD11E4BA0A22ABA7549",
    ),
    "rank6_q6_source": (
        "verify_rank6_three_halves_forest_certificate.py",
        "9904B81F48166702BB6891037275A5E120784C72971F86CA43020B3BCF582AFB",
    ),
    "rank6_q6_report": (
        "rank6_three_halves_forest_certificate_exact_20260813.json",
        "DE4C3D9C3C46B2D2216D2D0FEDA87758E358A291254B6314271D1590F66A7877",
    ),
    "rank6_pgc_source": (
        "replay_rank6_component_pgc_boundary.py",
        "631F6495557DE3149F258C3D5285962C2E80BC74D8BE1C37DD6983ADFBB92638",
    ),
    "rank6_pgc_report": (
        "rank6_component_pgc_boundary_exact_20260813.json",
        "FDB90BC719E6EE5D31BA24D78AB8196DC635225578632DC454FEA2D0CD3FDDB2",
    ),
    "rank7_integration_source": (
        "assemble_rank7_integration_readonly.py",
        "8424B1B0B0408B1C4B9DEF6F7040C9E3CA88E0304D1933BC7DE3DD348D9D587B",
    ),
    "rank7_integration_report": (
        "rank7_integration_readonly_20260820.json",
        "E5E09C141040746F6FDBC69EA89A9E4507CE63C9DDEDD73DF0E1C47E67191C59",
    ),
    "rank7_audit_source": (
        "audit_rank7_final_integration.py",
        "B97444AFC5CA30266ACEDE843B74273A50F6416E91A5B9F57E7B399D0C28AFA4",
    ),
    "rank7_audit_report": (
        "rank7_final_integration_independent_audit_exact_20260820.json",
        "3052B52A9AB79C2B961C37C0D150DC9E440BBF0D81FCA6F4A657C262554205EE",
    ),
    "rank7_scope_report": (
        "rank7_component_pgc_reduction_exact_20260813.json",
        "FCEAF69BA68325D120425D9A9C65C48A764D35855B5F2D6592B7809308409A35",
    ),
    "dependency_audit_source": (
        "audit_iso_direct_rank_bypass_dependency_agent.py",
        "0301BE293864E7BF78F79E58496D3BA078B7E0B2D2901CA2166B6CBF82B244CC",
    ),
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load_json(name: str) -> dict:
    return json.loads((HERE / name).read_text(encoding="utf-8"))


def verify_pins() -> dict[str, dict[str, str]]:
    checked = {}
    for key, (name, expected) in PINS.items():
        path = HERE / name
        assert path.is_file(), (key, name)
        actual = sha256(path)
        assert actual == expected, (key, expected, actual)
        checked[key] = {"file": name, "sha256": actual}
    return checked


def scan_for_unconditional_nr_reports(rank: int) -> list[dict[str, str]]:
    """Find pre-existing JSON reports that literally claim all-forest N_r."""
    needles = (
        f"ALL_MARKED_FOREST_N{rank}",
        f"ALL_FOREST_N{rank}",
        f"N{rank}(B;u,v)>=0 for every finite forest",
        f"N_{rank}(B;u,v)>=0 for every finite forest",
    )
    found = []
    for path in sorted(HERE.glob("*.json")):
        if path == OUTPUT:
            continue
        try:
            report = json.loads(path.read_text(encoding="utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError, ValueError):
            continue
        if not isinstance(report, dict):
            continue
        if not any(
            str(report.get(key, "")).startswith("PASS")
            for key in ("marker", "status")
        ):
            continue
        claim_text = "\n".join(
            str(report.get(key, ""))
            for key in ("marker", "status", "theorem", "conclusion")
        )
        if any(needle in claim_text for needle in needles):
            found.append({"file": path.name, "claim": claim_text})
    return found


def assemble() -> dict:
    checked = verify_pins()

    n5 = load_json(PINS["n5_report"][0])
    assert n5["marker"] == (
        "PASS_EXACT_ALL_MARKED_FOREST_N5_BUNDLE_INDUCTION_G2_STRUCTURE_NONADJACENT"
    )
    assert n5["theorem"] == (
        "N5(B;u,v)>=0 for every finite forest B and every pair of distinct marked vertices u,v."
    )
    assert n5["strong_induction"]["conclusion"] == (
        "N5(B;u,v)>=0 for every finite marked forest."
    )
    assert n5["open_obligations"] == []
    assert n5["source_sha256"] == PINS["n5_source"][1]

    n6_identity = load_json(PINS["n6_bundle_report"][0])
    assert n6_identity["marker"] == "DERIVED_EXACT_ISO_N6_BUNDLE_BINOMIAL_POLYNOMIAL_ROOT"
    assert n6_identity["rank"] == 6 and n6_identity["degree_in_M"] == 10
    assert n6_identity["identity"] == (
        "Gamma_M=N6((1+x)^M C+xD)-N6(C+xD)-"
        "sum_(t=0)^(M-1)N5((1+x)^t C)"
    )
    assert "No coefficient sign" in n6_identity["scope"]
    assert n6_identity["source_sha256"] == PINS["n6_bundle_source"][1]

    n6_probe = load_json(PINS["n6_finite_probe_report"][0])
    assert n6_probe["marker"] == "PROBE_EXACT_ISO_N6_BUNDLE_FINITE_ROOT"
    assert n6_probe["marked_cells_including_fixtures"] == 1229
    assert n6_probe["bundle_cells"] == 967 and n6_probe["negative_count"] == 0
    assert "Finite exact" in n6_probe["scope"] and "would not prove" in n6_probe["scope"]
    assert n6_probe["source_sha256"] == PINS["n6_finite_probe_source"][1]

    n6_top = load_json(PINS["n6_top_report"][0])
    assert n6_top["marker"] == "PASS_EXACT_ISO_N6_BUNDLE_TOP_COEFFICIENTS_ROOT"
    assert n6_top["proved_top_coefficients"]["g8_lower_bound"] == "504*n + 882"
    assert n6_top["proved_top_coefficients"]["g9"] == "630"
    assert n6_top["proved_top_coefficients"]["g10"] == "0"
    n6_top_audit = load_json(PINS["n6_top_audit_report"][0])
    assert n6_top_audit["marker"] == (
        "PASS_INDEPENDENT_EXACT_ISO_N6_BUNDLE_TOP_COEFFICIENTS_G2_STRUCTURE_NONADJACENT"
    )
    assert n6_top_audit["source_sha256"] == PINS["n6_top_audit_source"][1]

    n6_g7 = load_json(PINS["n6_g7_report"][0])
    assert n6_g7["marker"] == "PASS_EXACT_ISO_N6_BUNDLE_G7_ROOT"
    assert n6_g7["source_sha256"] == PINS["n6_g7_source"][1]
    n6_g7_audit = load_json(PINS["n6_g7_audit_report"][0])
    assert n6_g7_audit["marker"] == "PASS_INDEPENDENT_EXACT_ISO_N6_BUNDLE_G7_G2_TRANSFER_AUDIT"
    assert n6_g7_audit["source_sha256"] == PINS["n6_g7_audit_source"][1]
    assert n6_g7_audit["raw_g7_matches"] is True

    n6_g6 = load_json(PINS["n6_g6_report"][0])
    assert n6_g6["marker"] == "PASS_EXACT_ISO_N6_BUNDLE_G6_ROOT"
    assert n6_g6["source_sha256"] == PINS["n6_g6_source"][1]
    n6_g6_audit = load_json(PINS["n6_g6_audit_report"][0])
    assert n6_g6_audit["marker"] == "PASS_INDEPENDENT_EXACT_ISO_N6_BUNDLE_G6_G2_TRANSFER_AUDIT"
    assert n6_g6_audit["source_sha256"] == PINS["n6_g6_audit_source"][1]
    assert n6_g6_audit["raw_g6_matches"] is True

    n6_terminal = load_json(PINS["n6_terminal_report"][0])
    assert n6_terminal["marker"] == "PASS_EXACT_ISO_N6_TERMINAL_BROOMS_ISOLATES_G1_NONADJACENT"
    assert n6_terminal["source_sha256"] == PINS["n6_terminal_source"][1]
    assert n6_terminal["theorem"] == (
        "N6(B;u,v)>=0 for every terminal marked forest B consisting of either two disjoint "
        "rooted stars or a connected double broom, together with arbitrarily many unmarked isolates."
    )
    assert n6_terminal["coverage"]["no_gap"] is True

    n6_top_g5_g10 = load_json(PINS["n6_top_g5_g10_report"][0])
    assert n6_top_g5_g10["marker"] == "PASS_EXACT_ISO_N6_BUNDLE_TOP_G5_G10_ROOT"
    assert n6_top_g5_g10["source_sha256"] == PINS["n6_top_g5_g10_source"][1]
    assert n6_top_g5_g10["closed_coefficients"] == [5, 6, 7, 8, 9, 10]
    assert n6_top_g5_g10["remaining_exact_frontier"]["bundle_coefficients"] == [1, 2, 3, 4]

    n6_pending_assembler = load_json(PINS["n6_pending_assembler_report"][0])
    assert n6_pending_assembler["marker"] == (
        "PENDING_EXACT_ALL_MARKED_FOREST_N6_BUNDLE_INDUCTION_G1_NONADJACENT"
    )
    assert n6_pending_assembler["source_sha256"] == PINS["n6_pending_assembler_source"][1]
    assert n6_pending_assembler["theorem"] is None
    assert n6_pending_assembler["strong_induction"]["conclusion"] is None
    assert n6_pending_assembler["open_dependencies"] == [
        "g1_all_five_modes", "g2_all_five_modes", "g3_all_five_modes",
        "g4_all_five_modes", "terminal_N6_independent",
    ]

    q6 = load_json(PINS["rank6_q6_report"][0])
    assert q6["status"] == "PASS_EXACT_ALL_FOREST_RANK6_RESERVE_LIFT"
    assert q6["theorem"] == "Q6(I(F))>=0 for every forest F with alpha(F)>=10"

    pgc6 = load_json(PINS["rank6_pgc_report"][0])
    assert pgc6["status"] == "PASS_EXACT_ALL_FOREST_RANK6_PGC_BOUNDARY"
    assert pgc6["theorem"] == (
        "For every forest G with pendant edge lp and alpha(G)>=10, "
        "H6(I(G))>=H5(I(G-{l,p})), assuming the cited all-order Q6 and V6 inputs."
    )
    assert pgc6["dependencies"] == [
        "RANK6_FOREST_THREE_HALVES_THEOREM_2026-08-13.md",
        "FOREST_V6_ALPHA10_THEOREM_2026-08-13.md",
    ]

    rank7 = load_json(PINS["rank7_integration_report"][0])
    assert rank7["status"] == "PASS_EXACT_RANK7_INTEGRATION_DEPENDENCY_ASSEMBLER"
    assert rank7["all_inputs_final"] is True and rank7["pending_inputs"] == []
    assert rank7["forest_and_PGC_chain"]["forest_V7_alpha_at_least_12"] == (
        "PASS_EXACT_ALL_FOREST_V7_ALPHA_AT_LEAST_12"
    )
    assert rank7["forest_and_PGC_chain"]["alpha11_boundary"] == (
        "PASS_EXACT_ALL_ORDER_RANK7_ALPHA11_BOUNDARY_THEOREM"
    )

    rank7_audit = load_json(PINS["rank7_audit_report"][0])
    assert rank7_audit["status"] == "PASS_INDEPENDENT_FINAL_RANK7_INTEGRATION_NO_SCOPE_GAP"
    assert rank7_audit["integration_report_sha256"] == PINS["rank7_integration_report"][1]
    assert rank7_audit["assembler_sha256"] == PINS["rank7_integration_source"][1]
    assert all(rank7_audit["dependency_chain"].values())

    rank7_scope = load_json(PINS["rank7_scope_report"][0])
    assert rank7_scope["required_range"] == {
        "alpha_P_at_least": 12,
        "alpha_B_equals_alpha_P_minus_one": True,
        "alpha_B_at_least": 11,
    }

    dependency_source = (HERE / PINS["dependency_audit_source"][0]).read_text(encoding="utf-8")
    for literal in (
        '"N6": ["N6(smaller)", "N5", "FML gap at rank 6"]',
        '"N7": ["N7(smaller)", "N6", "FML gap at rank 7"]',
        "Direct Q4,Q5,Q6 prove those target ranks but do not assert",
        "Scope: dependency audit only.  It proves no new positivity theorem",
    ):
        assert literal in dependency_source

    existing_n6 = scan_for_unconditional_nr_reports(6)
    existing_n7 = scan_for_unconditional_nr_reports(7)
    assert existing_n6 == [], existing_n6
    assert existing_n7 == [], existing_n7

    return {
        "marker": MARKER,
        "status": "exact read-only dependency map after unconditional all-N5; no N6/N7 promotion",
        "snapshot": {
            "all_N5": "PASS, unconditional exact theorem",
            "missing_N5_input": None,
            "new_theorem_promotions": ["all-marked-forest N5 only"],
        },
        "existing_exact_target_theorems": {
            "rank6": {
                "reserve": q6["theorem"],
                "PGC": pgc6["theorem"],
                "hypothesis": "forest, pendant edge for PGC, alpha(G)>=10",
                "logical_type": "target Q6/PGC theorem, not marked four-minor N6",
            },
            "rank7": {
                "conclusion": rank7["conclusion"],
                "hypothesis": (
                    "required PGC range alpha(P)>=12; alpha(B)>=12 uses forest V7/Q7, "
                    "and alpha(B)=11 uses the exhaustive boundary theorem"
                ),
                "independent_audit": rank7_audit["status"],
                "logical_type": "target Q7/PGC theorem, not marked four-minor N7",
            },
        },
        "rank6_marked_frontier": {
            "exact_identity": n6_identity["identity"],
            "new_rank6_payment": "Gamma_M=sum_(j=1)^10 g_j binom(M,j)",
            "what_unconditional_all_N5_discharges": (
                "Every lower-rank term N5((1+x)^t C) in the exact rank-six bundle telescope."
            ),
            "what_it_would_not_discharge": [
                "the universal signs g1,...,g4 for every actual rank-six bundle cell",
                "the independent audit of the exact terminal N6 producer theorem",
                "the final rank-six classifier/exhaustion and strong-induction assembly",
            ],
            "proved_top_coefficients": {
                "g8": "g8>=504*n+882>0",
                "g9": "g9=630",
                "g10": "g10=0",
                "independent_audit": n6_top_audit["marker"],
            },
            "proved_g7": {
                "strict_lower_bound": n6_g7["strict_lower_bound"],
                "independent_audit": n6_g7_audit["marker"],
            },
            "proved_g6": {
                "producer_marker": n6_g6["marker"],
                "independent_audit": n6_g6_audit["marker"],
                "strict_lower_bound": n6_g6_audit["n_at_least_3_strict_lower_bound"],
            },
            "proved_terminal_base": {
                "theorem": n6_terminal["theorem"],
                "coverage_no_gap": n6_terminal["coverage"]["no_gap"],
                "marker": n6_terminal["marker"],
                "independent_audit": "PENDING; required before fail-closed all-N6 promotion",
            },
            "proved_g5_through_g10_package": {
                "marker": n6_top_g5_g10["marker"],
                "closed_coefficients": n6_top_g5_g10["closed_coefficients"],
            },
            "pending_all_N6_assembler": {
                "marker": n6_pending_assembler["marker"],
                "open_dependencies": n6_pending_assembler["open_dependencies"],
                "theorem": None,
            },
            "finite_probe": {
                "marked_cells": n6_probe["marked_cells_including_fixtures"],
                "bundle_cells": n6_probe["bundle_cells"],
                "negative_g1_through_g10": n6_probe["negative_count"],
                "role": "finite evidence only",
            },
            "unconditional_all_N6_reports_found": existing_n6,
        },
        "rank7_marked_frontier": {
            "dependency": "N7 -> N6 + rank-seven FML/bundle payment",
            "effect_of_all_N5": (
                "Indirect only: all-N5 clears the lower branch in the N6 step; after a future "
                "all-N6 theorem, N6 can serve as the lower-rank "
                "payment for N7.  All-N5 alone does not close any N7 recurrence."
            ),
            "unconditional_all_N7_reports_found": existing_n7,
        },
        "precise_remaining_auxiliary_obligations": {
            "rank6": {
                "lower_rank_payment": "CLOSED by unconditional all-N5",
                "Newton_bundle_coefficients": {
                    "closed": ["g5", "g6", "g7", "g8", "g9", "g10"],
                    "pending_independent_audit": [],
                    "open_all_order": ["g1", "g2", "g3", "g4"],
                },
                "terminal": (
                    "producer PASS exact all-order two-star/double-broom theorem; "
                    "independent audit still required by the all-N6 assembler"
                ),
                "assembly": "rank-six classifier/exhaustion and strong-induction PASS not pinned",
            },
            "rank7": {
                "lower_rank_payment": "all-N6 remains open",
                "Newton_bundle_coefficients": (
                    "no exact all-mode N7 bundle-coefficient package is pinned in this audit"
                ),
                "terminal": "exact all-order terminal marked-forest N7 base not pinned",
                "assembly": "no unconditional all-marked-forest N7 PASS is pinned",
            },
            "target_theorem_guard": (
                "These auxiliary obligations do not reopen the already exact target Q6/Q7 and PGC theorems."
            ),
            "top_level_gate_guard": (
                "This map records propagation inside Gate 5 only and does not renumber, merge, "
                "or conditionally promote any of the six top-level gates."
            ),
        },
        "fail_closed_dependency_map": {
            "N5": {
                "lower_rank": "all-N4 exact",
                "same_rank_bundle_coefficients": "g1..g8 exact in all five canonical modes",
                "status": "PASS",
            },
            "N6": {
                "lower_rank": "all-N5 exact; lower-rank branch discharged",
                "same_rank_bundle_coefficients": (
                    "g5,g6,g7,g8,g9,g10 exact with audits assembled; "
                    "g1..g4 open universally"
                ),
                "status": "OPEN",
            },
            "N7": {
                "lower_rank": "all-N6 open",
                "same_rank_bundle_or_FML_payment": "no all-N7 theorem pinned",
                "status": "OPEN",
            },
            "scope_guard": (
                "The exact direct Q6/Q7 and PGC theorems do not imply N6 or N7. "
                "No theorem is promoted from the finite rank-six probe; all-N5 is pinned separately."
            ),
        },
        "pins": checked,
        "source_sha256": sha256(Path(__file__)),
    }


def main() -> None:
    report = assemble()
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": report["marker"],
        "status": report["status"],
        "source_sha256": report["source_sha256"],
        "report_sha256": hashlib.sha256(raw.encode()).hexdigest().upper(),
        "N5": report["fail_closed_dependency_map"]["N5"]["status"],
        "N6": report["fail_closed_dependency_map"]["N6"]["status"],
        "N7": report["fail_closed_dependency_map"]["N7"]["status"],
    }, indent=2, sort_keys=True))
    print(report["marker"])


if __name__ == "__main__":
    main()
