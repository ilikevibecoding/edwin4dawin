#!/usr/bin/env python3
"""Read-only integrity/scope audit for the rank8 Delta5 and Delta4-full package."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_rank8_delta4_source_curvatures import build


ROOT = Path(__file__).resolve().parent

PINNED = {
    "RANK8_Q8_TERMINAL_DELTA5_ALL_ORDER_THEOREM_2026-08-17.md": "C5A7CED09832254FE27A19FBC583E5C2DA9BE459D15F67F5EC218F5A06572CEE",
    "rank8_q8_terminal_delta5_all_order_manifest_20260817.json": "81EBFA2B843332181CC0F2FC7D0588DA95C6AACA2C1A1EB448D3987C5A4C2900",
    "replay_rank8_q8_terminal_delta5_all_order.py": "AFA2D20549F3DC03B37A9083B8D7CB95454B67BD38AD2F559BBD16715955C2D2",
    "rank8_q8_terminal_delta5_all_order_replay_20260817.json": "E56F800A84E8E4A01A35EDEE75FF9C4F0ACF40EF9B9E14C71531C585CBD65569",
    "verify_rank8_q8_terminal_delta5_q7_c8_repair.py": "E28BEC6068D5203E54F5F9B32664AA45B29B8798E629AB8F75F9B7991D2B0CDE",
    "rank8_q8_terminal_delta5_q7_c8_repair_exact_20260817.json": "0D067823872E15AA31A86FD0A6258ADA4EEBB828274432DFC3C5CA8BBF01C31B",
    "verify_rank8_q8_terminal_delta4_reduction.py": "455412D2F914A4BC8F56AC57CA11EEDB113E70403B58DF6FCB11EB76F1051D87",
    "rank8_q8_terminal_delta4_reduction_exact_20260820.json": "09ED95463A9B6F0A839E4DD2FFD8E1C285B11395814D2219CC2949D03CEDE852",
    "rank8_terminal_delta04_finite_n1_n22_exact_20260820.json": "4C8FD019F03D42208F56751BFB896021B1F4A02C699D5F26CE2636C80B59C4AB",
    "RANK7_PGC_ALL_ORDER_THEOREM_2026-08-20.md": "2C408B88932157B7F1BFDF0F548335D218F7683517D2F67B4B0DC2CFF1A677B6",
    "rank7_integration_readonly_20260820.json": "E5E09C141040746F6FDBC69EA89A9E4507CE63C9DDEDD73DF0E1C47E67191C59",
    "rank7_final_integration_independent_audit_exact_20260820.json": "3052B52A9AB79C2B961C37C0D150DC9E440BBF0D81FCA6F4A657C262554205EE",
    "audit_rank7_final_integration.py": "B97444AFC5CA30266ACEDE843B74273A50F6416E91A5B9F57E7B399D0C28AFA4",
}


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str):
    return json.loads((ROOT / name).read_text(encoding="utf-8"))


def main() -> int:
    for name, expected in PINNED.items():
        actual = sha(ROOT / name)
        assert actual == expected, (name, actual, expected)

    delta5_replay = load("rank8_q8_terminal_delta5_all_order_replay_20260817.json")
    assert delta5_replay["status"] == "PASS"
    assert delta5_replay["analytic_range"] == "n>=23"
    assert delta5_replay["finite_range"] == "1<=n<=22"
    assert delta5_replay["analytic_coefficients"] == 28_621_872
    assert delta5_replay["remaining_terminal_coefficients"] == [0, 1, 2, 3, 4]
    assert delta5_replay["rooted_tree_counterexample"] is None

    rank7_integration = load("rank7_integration_readonly_20260820.json")
    assert rank7_integration["status"] == "PASS_EXACT_RANK7_INTEGRATION_DEPENDENCY_ASSEMBLER"
    assert rank7_integration["pending_inputs"] == []
    assert rank7_integration["all_inputs_final"] is True
    assert rank7_integration["connected_Q7_induction"]["complete_if_pending_inputs_finish"] is True
    assert rank7_integration["forest_and_PGC_chain"]["conditional_forest_Q7_lift"] == (
        "PASS_EXACT_CONDITIONAL_ALL_FOREST_RANK7_Q7_LIFT"
    )
    rank7_audit = load("rank7_final_integration_independent_audit_exact_20260820.json")
    assert rank7_audit["status"] == "PASS_INDEPENDENT_FINAL_RANK7_INTEGRATION_NO_SCOPE_GAP"
    assert rank7_audit["integration_report_sha256"] == PINNED[
        "rank7_integration_readonly_20260820.json"
    ]
    assert rank7_audit["dependency_chain"] == {
        "terminal_broom": True,
        "connected_Q7": True,
        "forest_Q7_lift": True,
        "rank7_PGC_composition": True,
    }

    repair = load("rank8_q8_terminal_delta5_q7_c8_repair_exact_20260817.json")
    assert repair["status"] == "PASS_EXACT_RANK8_TERMINAL_DELTA5_Q7_C8_REPAIR"
    assert repair["Q7_endpoint_nonnegative_guard"]["valid_from"] == 18
    assert repair["rank7_induction_alpha_guard"]["analytic_valid_from"] == 23
    assert repair["D6_endpoint_reduction_survives"].startswith("yes")

    reduction = load("rank8_q8_terminal_delta4_reduction_exact_20260820.json")
    assert reduction["status"] == "PASS_EXACT_RANK8_TERMINAL_DELTA4_REDUCTION_WITH_LIVE_LOWER_CROSS"
    assert reduction["remaining_tensor_count"] == 8
    assert int(reduction["lower_cross_obstruction"]["normalized_curvature_bracket"]) == -4_793_536

    full_reports = {}
    for k in (1, 7):
        name = f"rank8_delta4_full_branch_k{k}_exact_20260820.json"
        report = load(name)
        assert report["status"] == "PASS"
        assert report["D6_k"] == k
        assert report["capacity_piece"] == "full-root"
        assert report["mapped_degrees"] == [12, 11, 10, 7]
        assert report["initial_coefficients"] == 13_728
        counts = report["coefficient_sign_counts"]
        assert counts == {"negative": 0, "zero": 96, "positive": 13_632}
        assert sum(counts.values()) == report["initial_coefficients"]
        assert report["source_denominator_factor"] == (
            "23653217383979784968502135000000000000*x**13"
        )
        full_reports[name] = sha(ROOT / name)

    scaled_reports = {}
    for k in (1, 7):
        name = f"rank8_delta4_scaled_n_k{k}_ucap_exact_20260820.json"
        report = load(name)
        assert report["status"] == "PASS"
        assert report["D6_k"] == k
        assert report["capacity_piece"] == "ucap"
        assert report["positive_multiplier"] == "t**1"
        assert report["mapped_degrees"] == [14, 13, 12, 11, 8, 2]
        assert report["bernstein_coefficients"] == 884_520
        assert report["coefficient_sign_counts"] == {
            "negative": 0,
            "zero": 298_116,
            "positive": 586_404,
        }
        assert report["source_denominator_factor"] == (
            "33824100859091092504958053050000000000000*x**14*(n - 7)**2"
        )
        scaled_reports[name] = sha(ROOT / name)

    lower_enclosures = {}
    shared_minimum = None
    for piece, expected_index in (
        ("l0", [14, 0, 0, 0, 6, 2]),
        ("lcross", [14, 0, 0, 0, 6, 0]),
    ):
        name = f"rank8_delta4_scaled_n_k1_{piece}_exact_20260820.json"
        report = load(name)
        assert report["status"] == "ENCLOSURE_UNRESOLVED"
        assert report["minimum_index"] == expected_index
        if shared_minimum is None:
            shared_minimum = report["minimum"]
        assert report["minimum"] == shared_minimum
        lower_enclosures[name] = sha(ROOT / name)

    coupled_reports = {"junction": {}, "lower_zero_concavity": {}, "lower_cross_derivative": {}}
    for k in (1, 7):
        junction_name = f"rank8_delta4_junction_coupled_k{k}_exact_20260820.json"
        junction = load(junction_name)
        assert junction["status"] == "PASS"
        assert junction["D6_k"] == k
        assert junction["mapped_degrees"] == [39, 13, 12, 11, 8]
        assert junction["bernstein_coefficients"] == 786_240
        assert junction["coefficient_sign_counts"]["negative"] == 0
        coupled_reports["junction"][junction_name] = sha(ROOT / junction_name)

        lower_zero_name = f"rank8_delta4_lower_zero_curvature_coupled_k{k}_exact_20260820.json"
        lower_zero = load(lower_zero_name)
        assert lower_zero["status"] == "PASS"
        assert lower_zero["D6_k"] == k
        assert lower_zero["empty_endpoint"] == "Delta4(Z=0)=0 identically"
        assert lower_zero["mapped_degrees"] == [33, 11, 11, 10, 6]
        assert lower_zero["bernstein_coefficients"] == 376_992
        assert lower_zero["coefficient_sign_counts"]["negative"] == 0
        coupled_reports["lower_zero_concavity"][lower_zero_name] = sha(ROOT / lower_zero_name)

        lower_cross_name = f"rank8_delta4_lower_cross_derivative_coupled_k{k}_exact_20260820.json"
        lower_cross = load(lower_cross_name)
        assert lower_cross["status"] == "PASS"
        assert lower_cross["D6_k"] == k
        assert lower_cross["mapped_degrees"] == [39, 13, 12, 11, 8, 1]
        assert lower_cross["bernstein_coefficients"] == 1_572_480
        assert lower_cross["coefficient_sign_counts"]["negative"] == 0
        coupled_reports["lower_cross_derivative"][lower_cross_name] = sha(ROOT / lower_cross_name)

    finite_delta4 = load("rank8_terminal_delta04_finite_n1_n22_exact_20260820.json")
    assert finite_delta4["status"] == "PASS_EXACT_RANK8_TERMINAL_DELTA0_4_FINITE_CENSUS_N1_N22"
    assert finite_delta4["scope"] == "every root of every free tree of orders 1 through 22"
    assert finite_delta4["totals"]["rooted_cores"] == 194_813_361

    # Exact containment of every n>=23 cone slice in the enlarged box.
    N, w = sp.symbols("N w", nonnegative=True)
    n = 23 + N
    w_high = 3 * (n - 1) / ((n - 3) * (n - 4))
    w_margin = sp.factor(sp.Rational(33, 190) - w_high)
    assert sp.factor(
        w_margin - 3 * N * (11 * N + 239) / (190 * (N + 19) * (N + 20))
    ) == 0
    ratio_low_margin = sp.factor(8 / (6 - w) - sp.Rational(4, 3))
    assert sp.factor(ratio_low_margin + 4 * w / (3 * (w - 6))) == 0
    ratio_high_margin = sp.factor(sp.Rational(760, 471) - 4 / (3 * (1 - w)))
    assert sp.factor(
        ratio_high_margin - 4 * (190 * w - 33) / (471 * (w - 1))
    ) == 0
    y_low_margin = sp.factor(3 * n / (n - 3) - 3)
    assert sp.factor(y_low_margin - 9 / (N + 20)) == 0
    y_high = 3 * n * (n - 1) / ((n - 3) * (n - 4))
    y_high_margin = sp.factor(sp.Rational(759, 190) - y_high)
    assert sp.factor(
        y_high_margin - 9 * N * (21 * N + 439) / (190 * (N + 19) * (N + 20))
    ) == 0

    # Tighter coupled chords used by the final four lower boxes.
    t = sp.symbols("t", nonnegative=True)
    y_lower_chord_margin = sp.factor(3 / (1 - 3 * t) - (3 + 9 * t))
    assert sp.factor(y_lower_chord_margin + 27 * t**2 / (3 * t - 1)) == 0
    r_lower_chord_margin = sp.factor(8 / (6 - w) - (sp.Rational(4, 3) + 2 * w / 9))
    assert sp.factor(r_lower_chord_margin + 2 * w**2 / (9 * (w - 6))) == 0
    exact_y_high = 3 * (1 - t) / ((1 - 3 * t) * (1 - 4 * t))
    y_upper_chord = 3 + sp.Rational(4347, 190) * t
    y_upper_chord_margin = sp.factor(y_upper_chord - exact_y_high)
    assert sp.factor(
        y_upper_chord_margin
        - 9 * t * (23 * t - 1) * (252 * t - 103) / (190 * (3 * t - 1) * (4 * t - 1))
    ) == 0
    exact_w_high = 3 * t * (1 - t) / ((1 - 3 * t) * (1 - 4 * t))
    exact_r_high = sp.factor(4 / (3 * (1 - exact_w_high)))
    r_upper_chord = sp.Rational(4, 3) + 23 * (sp.Rational(760, 471) - sp.Rational(4, 3)) * t
    r_upper_chord_margin = sp.factor(r_upper_chord - exact_r_high)
    assert sp.factor(
        r_upper_chord_margin
        - 12 * t * (23 * t - 1) * (55 * t - 32) / (157 * (15 * t**2 - 10 * t + 1))
    ) == 0

    # Preserve an exact failure of the optional V-concavity shortcut for k=7.
    value, variables = build(7, "full")
    nv, wv, xv, U, V, Z = variables
    witness = {
        nv: 28,
        wv: sp.Rational(3, 25),
        xv: sp.Rational(2, 11),
        U: 1,
        V: 0,
        Z: 0,
    }
    curvature_witness = sp.factor(sp.diff(value, V, 2).subs(witness))
    value_witness = sp.factor(value.subs(witness))
    assert curvature_witness > 0
    assert value_witness > 0

    payload = {
        "status": "PASS_INDEPENDENT_SCOPE_AND_INTEGRITY_AUDIT",
        "delta5": {
            "scope": "all rooted tree cores, all orders, Delta5 only; former Q7(alpha>=12) analytic dependency is discharged by the final rank7 theorem",
            "finite_range": "n<=22 exact all-root census",
            "analytic_coefficients": 28_621_872,
            "replay_report_sha256": PINNED[
                "rank8_q8_terminal_delta5_all_order_replay_20260817.json"
            ],
        },
        "delta4": {
            "prior_reduction": "8 exact boxes for n>=23, conditional on Q7(alpha>=12)",
            "closed_boxes": [
                "k=1/full-root",
                "k=7/full-root",
                "k=1/upper-capacity",
                "k=7/upper-capacity",
                "k=1/lower-zero",
                "k=7/lower-zero",
                "k=1/lower-cross-live",
                "k=7/lower-cross-live",
            ],
            "remaining_boxes": [],
            "new_analytic_bernstein_coefficients": 7_267_920,
            "analytic_range": "n>=23; Q7(alpha>=12) input is final",
            "finite_range": "n<=22 exact every-root census",
            "all_order_conclusion": "Delta4>=0 unconditionally for every rooted tree core and every order",
            "discharged_rank7_dependency": {
                "theorem": "RANK7_PGC_ALL_ORDER_THEOREM_2026-08-20.md",
                "integration_report_sha256": PINNED["rank7_integration_readonly_20260820.json"],
                "independent_audit_sha256": PINNED[
                    "rank7_final_integration_independent_audit_exact_20260820.json"
                ],
                "independent_audit_source_sha256": PINNED["audit_rank7_final_integration.py"],
            },
            "full_branch_report_sha256": full_reports,
            "scaled_upper_capacity_report_sha256": scaled_reports,
            "coupled_lower_report_sha256": coupled_reports,
            "remaining_lower_enclosure_reports": lower_enclosures,
            "superseded_rectangular_enclosure_minimum": shared_minimum,
            "enlarged_box_containment": {
                "w_upper_margin": str(w_margin),
                "x_over_w_lower_margin": str(ratio_low_margin),
                "x_over_w_upper_margin": str(ratio_high_margin),
                "nw_lower_margin": str(y_low_margin),
                "nw_upper_margin": str(y_high_margin),
                "coupled_y_lower_chord_margin": str(y_lower_chord_margin),
                "coupled_r_lower_chord_margin": str(r_lower_chord_margin),
                "coupled_y_upper_chord_margin": str(y_upper_chord_margin),
                "coupled_r_upper_chord_margin": str(r_upper_chord_margin),
            },
        },
        "optional_shortcut_obstruction": {
            "classification": "exact V-concavity method obstruction for k=7/full; not a negative Delta4 value or tree counterexample",
            "point": "n=28,w=3/25,x=2/11,U=1,V=0",
            "d2_Delta4_dV2": str(curvature_witness),
            "Delta4_value": str(value_witness),
        },
        "pinned_prior_artifacts": PINNED,
    }
    output = ROOT / "rank8_delta5_delta4_full_branch_independent_audit_20260820.json"
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("REPORT", output.name, sha(output))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
