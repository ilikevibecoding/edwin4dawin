#!/usr/bin/env python3
"""Fail-closed coupled master reduction for the rank-six g1 leaf lemma.

This assembler performs no symbolic expansion.  It pins the previously
verified four-case split and records its exact bilinear consequences.  The
two displayed sign lemmas remain open.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n6_bundle_g1_leaf_coupled_master_reduction_exact_agent_20260831.json"
MARKER = "PENDING_EXACT_ISO_N6_BUNDLE_G1_LEAF_COUPLED_MASTER_REDUCTION_AGENT"
PINS = {
    "derive_iso_n6_bundle_g1_ordinary_leaf_recursive_g2_residual_split_g1_nonadjacent.py":
        "9FB0F8A1EA68CC3CE419DB6A610F3F5A70FABE1F3C966DE06CBF6C03A35D14DD",
    "iso_n6_bundle_g1_ordinary_leaf_recursive_g2_residual_split_exact_g1_nonadjacent_20260831.json":
        "6C8E6F1E3665B52FBFBE4BF556D24758668E5414AD0615B5DC928FAD1818FB6D",
    "census_iso_n6_bundle_g1_ordinary_leaf_recursive_g2_residual_small_g1_nonadjacent.py":
        "2474323FFAB6D3FBFAC99926E298C698F4C93398D5E0FC7467F18E97F8363126",
    "iso_n6_bundle_g1_ordinary_leaf_recursive_g2_residual_small_census_exact_g1_nonadjacent_20260831.json":
        "DAD44C3B951413157CA424E525F5E6A2F4A802020C6971B19D83ED88E1CBAFD0",
    "iso_n6_bundle_g1_ordinary_leaf_post_g2_residual_counterexample_exact_g1_nonadjacent_20260831.json":
        "7FF7EBA7BD9756AE9A35C62BBAE39A0D42EADAF48D467E4C9B58CD2B6A4DEB06",
    "iso_n6_bundle_g1_ordinary_leaf_residual_q_counterexample_exact_g1_nonadjacent_20260831.json":
        "C9ADC311C143B915D863DECBDC7F7E95392E76A6D353DDFCB43E9633AEA44242",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    assert {name: sha256(HERE / name) for name in PINS} == PINS
    split = json.loads((HERE / (
        "iso_n6_bundle_g1_ordinary_leaf_recursive_g2_residual_split_exact_"
        "g1_nonadjacent_20260831.json"
    )).read_text())
    census = json.loads((HERE / (
        "iso_n6_bundle_g1_ordinary_leaf_recursive_g2_residual_small_census_exact_"
        "g1_nonadjacent_20260831.json"
    )).read_text())
    assert split["checks"]["all_four_symbolic_differences_zero"] is True
    assert split["checks"]["mixed_retention_second_difference_zero"] is True
    assert census["signs"]["leaf_add"].get("negative", 0) == 0

    report = {
        "marker": MARKER,
        "status": "exact analytic reduction; two coupled sign lemmas remain open",
        "theorem": None,
        "geometry": {
            "A": "C-ell=H+xK",
            "C": "(1+x)H+xK",
            "H": "A-p",
            "K": "A-N[p]",
            "J": "D-{ell,p}, an induced marked subforest of H",
            "L": "J intersect K as induced vertex subforests",
        },
        "pinned_four_cases": split["four_exact_identities"],
        "exact_coupled_identity": {
            "Lambda": "Q(H,J)+Q(K,J)+T(H,J)",
            "polarization_form": "Lambda=P6((1+x)H+xK,xJ)=P6(C,xJ)",
            "reason": (
                "P6 is bilinear; Q(X,Y)=P6(xX,xY), T(H,J)=P6(H,xJ), "
                "and C=H+xH+xK"
            ),
            "retention_differences": [
                "Delta01-Delta00=Lambda",
                "Delta11-Delta10=Lambda",
            ],
        },
        "loss_coordinate_normal_form": {
            "loss_rows": {
                "X": "H-J, coefficientwise independent-set loss from deleting V(H)\\V(J)",
                "Y": "K-L, the restriction of the same vertex deletion to K",
                "genuine_constraint": "J and K are induced in H, L=J intersect K, hence Y is the K-restriction of X",
            },
            "canonical_baselines": {
                "B00": "g2_6(H,H)+F(H,K)",
                "B01": "B00+Q(H,H)+Q(K,H)+T(H,H)",
                "B10": "B00+Q(H,K)",
                "B11": "B10+Q(H,H)+Q(K,H)+T(H,H)",
            },
            "exact_formulas": {
                "Delta00": "B00-g2_6(H,X)",
                "Delta01": "B01-[g2_6(H,X)+Q(H,X)+Q(K,X)+T(H,X)]",
                "Delta10": "B10-[g2_6(H,X)+Q(H,Y)]",
                "Delta11": "B11-[g2_6(H,X)+Q(H,X)+Q(K,X)+T(H,X)+Q(H,Y)]",
            },
            "reason": "g2 is linear in its second row block and F,Q,T have the pinned bilinear definitions",
            "use": (
                "This is a finite master loss cone: only X and its restricted loss Y vary, "
                "rather than four unrelated D-row blocks."
            ),
        },
        "two_open_master_lemmas": {
            "retention_polarization": (
                "For every genuine H,K,J from the geometry, "
                "Lambda(H,K;J)=P6(C,xJ)>=0."
            ),
            "deleted_leaf_parent_square": (
                "For epsilon in {0,1}, g2_6(H,J)+F(H,K)+epsilon*Q(H,L)>=0, "
                "where epsilon records whether p is retained and L=J intersect K."
            ),
            "equivalent_payment_form": (
                "g2_6(H,J)+F(H,K)>=max(0,-Q(H,L))."
            ),
        },
        "conditional_completion": (
            "The two open master lemmas imply all four ordinary-parent retention cases. "
            "They deliberately retain the complete positive g2 term."
        ),
        "obstructions_respected": {
            "separate_post_g2_residual_nonnegative": "false; exact witness has R10=-143",
            "separate_Q_nonnegative": "false; exact witness has Q=-113715696",
            "effect": (
                "Neither false claim is used. Negative Q is paid jointly by g2_6(H,J)+F(H,K)."
            ),
        },
        "finite_nonproof_evidence": {
            "ordinary_parent_actual_D_cells_through_order_7": census[
                "ordinary_parent_actual_D_cells"
            ],
            "Lambda_signs": census["signs"]["leaf_add"],
            "role": "falsification evidence only",
        },
        "open_obligations": [
            "Prove or falsify retention_polarization on genuine forest triples.",
            "Prove or falsify deleted_leaf_parent_square with L=J intersect K.",
            "Handle isolated and marked-parent leaves separately for the universal leaf lemma.",
        ],
        "dependencies_sha256": PINS,
        "scope_guard": (
            "No universal leaf lemma, universal rank-six g1 theorem, all N6, rank seven, "
            "or Erdos Problem 993 is asserted."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    payload = (json.dumps(report, indent=2, sort_keys=True) + "\n").encode()
    OUTPUT.write_bytes(payload)
    print(json.dumps({
        "marker": MARKER,
        "status": report["status"],
        "open_obligations": report["open_obligations"],
        "source_sha256": report["source_sha256"],
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(payload).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
