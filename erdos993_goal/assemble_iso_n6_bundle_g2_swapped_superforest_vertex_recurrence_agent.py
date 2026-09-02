#!/usr/bin/env python3
"""Fail-closed vertex recurrence for swapped rank-six g2 polarization.

Records the exact recurrence and the obstruction to importing the frozen
actual-minor g2 proof.  No positivity theorem is asserted.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from derive_iso_n6_bundle_g1_ordinary_leaf_increment_identity_g1_nonadjacent import substitute
from explore_iso_n6_bundle_g2_marked_cone_g1_bernstein import reconstruct


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n6_bundle_g2_swapped_superforest_vertex_recurrence_exact_agent_20260831.json"
MARKER = "PENDING_EXACT_ISO_N6_BUNDLE_G2_SWAPPED_SUPERFOREST_VERTEX_RECURRENCE_AGENT"
PINS = {
    "derive_iso_n6_bundle_g1_ordinary_leaf_increment_identity_g1_nonadjacent.py":
        "2A9C38962DA9070D1CF480838FB9CE671C699DB51B554587273AD5C578AA0936",
    "explore_iso_n6_bundle_g2_marked_cone_g1_bernstein.py":
        "5F75A3B985663BB2317FEF134932A7973BABBB2D2C976FC5F8BA5311971B9A52",
    "iso_n6_bundle_g2_g10_assembled_exact_root_20260831.json":
        "6AE97573C08CD55B71C46D630F2ABE1769039D4C4023E0B166D1FFA761C601C1",
    "derive_iso_n6_bundle_g2_nonadjacent_ordinary_parent_loss_root.py":
        "EE834F16F2CE0793975DE507DAF7276F15C933C174EEE5B464732D692B74A00F",
    "iso_n6_bundle_g2_nonadjacent_ordinary_parent_loss_exact_root_20260831.json":
        "9136FFABFE8BA82A646C9D49991A0883A5D6979863A89F36ADB4BB7E8F43FBF6",
    "iso_n6_bundle_g2_nonadjacent_ordinary_all_order_assembled_exact_root_20260831.json":
        "39CFB23031356C91FBC2C5126C15D6D27B26677BD03DA97A76D5BFA22DDA46F4",
    "iso_n6_bundle_g1_ordinary_leaf_residual_q_counterexample_exact_g1_nonadjacent_20260831.json":
        "C9ADC311C143B915D863DECBDC7F7E95392E76A6D353DDFCB43E9633AEA44242",
    "iso_n6_bundle_g1_leaf_retention_polarization_targets_exact_agent_20260831.json":
        "CF37A90A82443D00F9D0A7938731E47F32A606950475B70F5BB1AFAF92CF328F",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    assert {name: sha256(HERE / name) for name in PINS} == PINS
    identity = json.loads((HERE / "iso_n6_bundle_g1_leaf_retention_polarization_targets_exact_agent_20260831.json").read_text())
    q_counterexample = json.loads((HERE / "iso_n6_bundle_g1_ordinary_leaf_residual_q_counterexample_exact_g1_nonadjacent_20260831.json").read_text())
    assert identity["rank6_g2_swapped_identity"]["exact_difference_zero"] is True
    assert q_counterexample["exact_values"]["Q_H_J"] == -113715696

    def rows(prefix: str):
        return tuple(tuple(sp.symbols(f"{prefix}{family}0:8")) for family in "EUVW")

    zeros = tuple(tuple(sp.Integer(0) for _ in range(8)) for _ in "EUVW")
    jrows, crows, rrows = rows("J"), rows("C"), rows("R")
    JE, JU, JV, JW = jrows
    CE, CU, CV, CW = crows
    RE, RU, RV, RW = rrows
    phi = sp.expand(substitute(reconstruct(2), jrows, crows) - substitute(reconstruct(2), jrows, zeros))
    generic_expected = sp.expand(
        2*CW[2]*JE[3] + 12*CW[3]*JE[4] - 7*(CW[4]*JE[3] + CW[2]*JE[5])
        + (2*CV[3]-7*CV[5]-CW[4])*JU[2] + (12*CV[4]+2*CW[3])*JU[3] - (7*CV[3]+CW[2])*JU[4]
        + (2*CU[3]-7*CU[5]-CW[4])*JV[2] + (12*CU[4]+2*CW[3])*JV[3] - (7*CU[3]+CW[2])*JV[4]
        + (2*CE[4]-7*CE[6]-CU[5]-CV[5])*JW[1] + (12*CE[5]+2*CU[4]+2*CV[4])*JW[2]
        - (7*CE[4]+CU[3]+CV[3])*JW[3]
    )
    assert phi == generic_expected
    shift = lambda row: tuple(sp.Integer(0) if k == 0 else row[k-1] for k in range(8))
    u_increment_rows = (shift(RE), zeros[0], shift(RV), zeros[0])
    v_increment_rows = (shift(RE), shift(RU), zeros[0], zeros[0])
    bu = sp.expand(phi.xreplace({old: new for oldrow, newrow in zip(crows, u_increment_rows) for old, new in zip(oldrow, newrow)}))
    bv = sp.expand(phi.xreplace({old: new for oldrow, newrow in zip(crows, v_increment_rows) for old, new in zip(oldrow, newrow)}))
    bu_expected = sp.expand(
        (2*RV[2]-7*RV[4])*JU[2] + 12*RV[3]*JU[3] - 7*RV[2]*JU[4]
        + (2*RE[3]-7*RE[5]-RV[4])*JW[1] + (12*RE[4]+2*RV[3])*JW[2] - (7*RE[3]+RV[2])*JW[3]
    )
    bv_expected = sp.expand(
        (2*RU[2]-7*RU[4])*JV[2] + 12*RU[3]*JV[3] - 7*RU[2]*JV[4]
        + (2*RE[3]-7*RE[5]-RU[4])*JW[1] + (12*RE[4]+2*RU[3])*JW[2] - (7*RE[3]+RU[2])*JW[3]
    )
    assert bu == bu_expected and bv == bv_expected
    self_phi = sp.expand(phi.xreplace({old: new for oldrow, newrow in zip(crows, jrows) for old, new in zip(oldrow, newrow)}))
    a = tuple(sp.symbols("a0:8"))
    all_equal = {symbol: a[k] for row in jrows for k, symbol in enumerate(row)}
    self_both_absent = sp.expand(self_phi.xreplace(all_equal))

    report = {
        "marker": MARKER,
        "status": "corrected exact joint telescoping reduction and proof-domain obstruction; sign remains open",
        "theorem": None,
        "definition": "Phi_J(D)=g2_6(J,D)-g2_6(J,0)",
        "vertex_recurrence": {
            "scope": (
                "The uniform four-row recurrence is valid only when q is an ordinary vertex, "
                "i.e. q is neither distinguished mark u nor distinguished mark v."
            ),
            "geometry": "For ordinary q in V(D)\\V(J), put D0=D-q and R=D-N[q], so every marked row satisfies I_F(D)=I_F(D0)+xI_F(R).",
            "identity": "Phi_J(D)=Phi_J(D0)+Q(J,R)",
            "derivation": [
                "g2_6(J,D) is linear in the second row block after subtracting g2_6(J,0).",
                "Therefore Phi_J(D0+xR)=Phi_J(D0)+Phi_J(xR).",
                "The isolate-forward-difference identity gives Phi_J(xR)=P6(xR,xJ)=Q(J,R).",
            ],
            "corrected_iteration": (
                "Put Jplus=C[V(J) union ({u,v} intersect V(C))].  For any ordering of the "
                "ordinary vertices C\\Jplus, Phi_J(C)=Phi_J(Jplus)+sum_t Q(J,R_t)."
            ),
            "invalid_unqualified_statement": (
                "It is not valid to iterate the uniform Q recurrence over an arbitrary ordering "
                "of C\\J when J omits u or v."
            ),
        },
        "marked_endpoint_boundaries": {
            "u_deletion_rows": (
                "For q=u, D0=D-u and R=D-N[u], only the E and V rows acquire xR: "
                "E_D=E_D0+xE_R, V_D=V_D0+xV_R, U_D=U_D0, W_D=W_D0."
            ),
            "u_boundary_identity": "Phi_J(D)=Phi_J(D0)+B_u(J,R)",
            "B_u_exact": str(bu),
            "v_deletion_rows": (
                "For q=v, D0=D-v and R=D-N[v], only the E and U rows acquire xR: "
                "E_D=E_D0+xE_R, U_D=U_D0+xU_R, V_D=V_D0, W_D=W_D0."
            ),
            "v_boundary_identity": "Phi_J(D)=Phi_J(D0)+B_v(J,R)",
            "B_v_exact": str(bv),
            "finite_endpoint_modes": (
                "Stopping at Jplus avoids these operators.  Alternatively there are four mark-retention "
                "modes for J, with at most two B_u/B_v boundary increments; the R row automatically "
                "handles whether the two marks are adjacent."
            ),
        },
        "self_base": {
            "identity": "Phi_J(J)=g2_6(J,J)-g2_6(J,0)=P6(J,xJ)=T(J,J)",
            "exact_four_block_formula": [
                "2*JW2*JE3 + 12*JW3*JE4 - 7*(JW4*JE3 + JW2*JE5)",
                "(2*JV3-7*JV5-JW4)*JU2 + (12*JV4+2*JW3)*JU3 - (7*JV3+JW2)*JU4",
                "(2*JU3-7*JU5-JW4)*JV2 + (12*JU4+2*JW3)*JV3 - (7*JU3+JW2)*JV4",
                "(2*JE4-7*JE6-JU5-JV5)*JW1 + (12*JE5+2*JU4+2*JV4)*JW2 - (7*JE4+JU3+JV3)*JW3"
            ],
            "expanded_polynomial": str(self_phi),
            "both_marks_absent_specialization": (
                "If JE=JU=JV=JW=a, then Phi_J(J)=" + str(self_both_absent) + "."
            ),
            "frozen_theorem_boundary": (
                "Both g2_6(J,J) and g2_6(J,0) are frozen nonnegative cells, but their difference "
                "is not signed by those two inequalities.  The displayed quadratic has mixed coefficients."
            ),
        },
        "ordinary_parent_joint_telescoping": {
            "geometry": "C=(1+x)H+xK, with J induced in H and p,ell ordinary.",
            "two_outer_increments": "Phi_J(C)=Phi_J(H)+Q(J,K)+Q(J,H)",
            "full_corrected_target": (
                "Lambda=Phi_J(Jplus)+sum_{q_t in H\\Jplus} Q(J,R_t)+Q(J,K)+Q(J,H), "
                "where Jplus=H[V(J) union {u,v}] and every q_t in the sum is ordinary."
            ),
            "retained_isolate_same_target": (
                "For the retained-isolate response, R_iso=P6((1+x)A,xB)="
                "g2_6(B,(1+x)A)-g2_6(B,0), with the same swapped-superforest obstruction."
            ),
        },
        "forest_respecting_order": {
            "construction": (
                "In each component, first build the connector (Steiner) skeleton joining the retained "
                "components of Jplus, then add all off-skeleton branches parent-first."
            ),
            "leaf_or_branch_step": (
                "If q_t has zero or one already-built neighbor, R_t is the previous forest with zero "
                "or one attachment vertex deleted.  With one attachment s, R_t=D_(t-1)-s."
            ),
            "connector_step": (
                "If q_t has k>=2 already-built neighbors, acyclicity forces those neighbors to lie in "
                "k distinct components of D_(t-1), and R_t deletes exactly one attachment vertex from "
                "each such component."
            ),
            "unbounded_local_obstruction": (
                "The connector arity k is unbounded: a new star center may join arbitrarily many retained "
                "isolated components.  Therefore no reduction to a fixed finite list of leaf-only or "
                "bounded-arity neighboring Q payments follows from forest geometry alone."
            ),
            "explicit_unbounded_family": (
                "Let D_(t-1) be k disjoint retained edges r_i-s_i and add q adjacent to every r_i. "
                "The result is a forest, q has k already-built neighbors in k components, and "
                "R_t=D_(t-1)-{r_1,...,r_k} consists of the k isolated vertices s_i.  Thus both the "
                "attachment count and the number of simultaneous component deletions are genuinely unbounded."
            ),
        },
        "frozen_g2_proof_boundary": {
            "actual_minor_orientation": "The frozen theorem requires the second block D to be an induced minor of the first block C.",
            "swapped_orientation": "Phi_J(C) has first block J and second block C with C containing J.",
            "parent_loss_coordinates": "The proof writes D_F=C_F-P_F with P_F>=0 counting independent sets containing a deleted parent.",
            "superforest_substitution": "A superforest second block would formally require negative loss P_F or new surplus variables S_F=D_F-C_F>=0.",
            "exact_sign_obstruction": (
                "The certified parent-loss correction has mixed coefficients; for example the PA6 coefficient is +7*a1. "
                "Replacing P by -S produces -7*a1*SA6, outside the certified nonnegative cone."
            ),
            "large_order_domain_obstruction": (
                "The all-order ratio-floor proof uses induced orders and category caps bounded by the first-block order N. "
                "A superforest second block can exceed those caps, so its chart and matrix domain do not contain Phi_J(C)."
            ),
        },
        "recurrence_obstruction": {
            "separate_increment_claim": "Q(X,Y)>=0 for all genuine forest pairs is false.",
            "exact_negative_value": q_counterexample["exact_values"]["Q_H_J"],
            "qualification": (
                "The frozen Q witness does not by itself realize every R=D-N[q] required by a superforest chain. "
                "It nevertheless blocks a recurrence proof that treats Q(J,R) as an arbitrary universally nonnegative increment."
            ),
        },
        "cross_orientation_boundary": {
            "available_payment": "The frozen rank-4/5/6 cross-orientation theorem is quadratic on four minors of one marked forest.",
            "missing_step": (
                "The swapped target is its cross polarization between the distinct nested row blocks J and C. "
                "Positivity of the quadratic payment does not imply copositivity of this cross term."
            ),
            "smallest_new_lemma": (
                "Prove the four three-rank cross-polarization blocks jointly for nested forest rows J subset C, "
                "or prove the restricted increments Q(J,D-N[q]) are paid after summation along C\\J."
            ),
        },
        "smallest_next_lemma": (
            "For every genuine ordinary-parent triple, prove the single joint payment "
            "Phi_J(Jplus)+sum_t Q(J,R_t)+Q(J,K)+Q(J,H)>=0 along a connector-first, branch-parent-first "
            "ordinary-vertex order.  A bounded local version must either parameterize connector arity "
            "or supply a valence-independent multi-component connector payment."
        ),
        "dependencies_sha256": PINS,
        "scope_guard": (
            "The formulas B_u and B_v are endpoint identities, not positivity claims.  "
            "No swapped-superforest monotonicity theorem, Lambda theorem, ordinary-parent leaf theorem, "
            "universal leaf lemma, rank-six g1 theorem, or Erdos Problem 993 is asserted."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    payload = (json.dumps(report, indent=2, sort_keys=True) + "\n").encode()
    OUTPUT.write_bytes(payload)
    print(json.dumps({
        "marker": MARKER,
        "status": report["status"],
        "vertex_recurrence": report["vertex_recurrence"],
        "smallest_next_lemma": report["smallest_next_lemma"],
        "source_sha256": report["source_sha256"],
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(payload).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
