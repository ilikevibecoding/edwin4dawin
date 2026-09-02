#!/usr/bin/env python3
"""Fail-closed independent assembler for the rank-eight low/high cone.

This is deliberately a small, read-only replay of the logical joins.  It does
not recompute the large coefficient tensors.  Instead it pins every producer
and exact report by SHA-256, reconstructs the complete finite key universes,
checks the structural identities/sign classifications recorded by the exact
producers, and writes an audit report only after the final 1,144-cell report is
present and unconditionally PASS.
"""

from __future__ import annotations

import hashlib
import itertools
import json
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "rank8_low_high_full_cone_independent_audit_20260820.json"
FINAL_SLICES = ROOT / "rank8_low_high_base_payment_eight_slices_b45_exact_20260820.json"
CHECKPOINT = ROOT / "rank8_low_high_base_payment_eight_slices_b45_checkpoint_20260820.json"
# Intentionally unset.  The completed P>=0 scan does not by itself prove
# H_str=C*M0+h*d: H_str=C*P+h*(d+7!*8!*C*p1*p2*K), and the second summand can
# be negative.  A future direct-H theorem must be independently audited and
# its source/report hashes pinned here before this assembler may promote.
DIRECT_H_FULL_CONE_PINS = None

SUPPORT = ((0, 1), (0, 2), (0, 3), (1, 0), (1, 1), (1, 2), (2, 0), (2, 1))
ALL_TARGET_SUPPORT = ((0, 0),) + SUPPORT
PAIR_KEYS = tuple(itertools.combinations(range(9), 2))

PINNED = {
    "verify_rank8_low_high_tail_q2_pairwise.py":
        "90D1FB6853833769355F7CF9A97663AC89FCD8FF8BB071904218738E477684A9",
    "rank8_low_high_tail_q2_pairwise_exact_20260820.json":
        "AD3EDC7B5BEC5434833B9A86385AE98F33C1B837493501C32973D91F08F91517",
    "analyze_rank8_low_high_tail_boost_reduction.py":
        "EECF94D2DC0D65CE2517768E9A8EBE9E552FDECF8E07FDDAD2D7D50F57A97E32",
    "rank8_low_high_tail_boost_reduction_exact_20260820.json":
        "2ABAAE9134E9F65EA2DE3934F5D84D3903873EDD39E9BFC1D6F1F99654A124E0",
    "verify_rank8_low_high_payment_support_reduction.py":
        "E85C3370EFB0B762F070DB3B25E431D1A7D63C7E8D258B176B4223046AE3E6A0",
    "rank8_low_high_payment_support_reduction_exact_20260820.json":
        "C6D432A394EED4D3C6F40D81C292733549DF258C0B59C4AD61B42D48455C888F",
    "verify_rank8_low_high_base_payment_hard_face_amgm.py":
        "8D95452625F2458EE9942A39FD6B7FB93FA62F93B216670C8B802CAE19DEE572",
    "rank8_low_high_base_payment_hard_face_amgm_exact_20260820.json":
        "61A48385D356468133A1D08BDD2D585D28D0B027565ACF7207C467445DF0A6B6",
    "audit_rank8_low_high_base_payment_hard_face_amgm.py":
        "89F5652E16C766AB59F5D6016F03E4C9C857075C742AA950907BEDFE6562F808",
    "rank8_low_high_base_payment_hard_face_amgm_independent_audit_20260820.json":
        "B4093F32B8F11DC25A4FA17B99B91BBA2AC750E3053BD12F7DC037A30E2DABFD",
    "probe_rank8_low_high_base_payment_high_tail_subset.py":
        "F8CC822C04B6ED129A84F36E85BC77A6BC7C6B63E057C311B91EC8A36693EDE7",
    "rank8_low_high_base_payment_b3_b4_subset_exact_20260820.json":
        "5E70574DBA9433A36414AB011CD87E8D6324EB358901164905340C528CA3D19A",
    "verify_rank8_low_high_base_payment_b345_sliced.py":
        "FC2CA2C929F345D7D6E5147E9C32833291428632B421D76DA805E787A9D4EF00",
    "rank8_low_high_base_payment_b345_sliced_exact_20260820.json":
        "7DD2B2BC42D9C84FDBDD655D065CBC515A001FA4C2326A5E160CBF752942583C",
    "verify_rank8_low_high_base_payment_terminal_compression_b67.py":
        "F428BF4B0B27D0099041EF630937E7E95114E0674121A620F115AFC9B7C9F557",
    "rank8_low_high_base_payment_terminal_compression_b67_corrected_exact_20260820.json":
        "A5648D9EEBCE43C6D8CFFB7A52C790710FB85ACB91302511886D27D85E9B77C1",
    "audit_rank8_low_high_terminal_compression_b6_corrected.py":
        "707FAE18FB1BC8CE0966E7F11DD2C4FD076F7276BE8188D26384E8A5E2B87502",
    "rank8_low_high_terminal_compression_b6_corrected_audit_20260820.json":
        "10E8B341308525B658873D9F5FA6E5764BD7DD4E09FA46CF0A8C734EB5D040D5",
    "verify_rank8_low_high_base_payment_eight_slices_b45.py":
        "4A44877EA62CA8F596266816FA895991590C47101CBADBBEE6EA94865C735A90",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str):
    return json.loads((ROOT / name).read_text(encoding="utf-8"))


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def stats_are_positive(row: dict, label: str) -> None:
    require(row["terms"] > 0, f"{label}: empty polynomial")
    require(row["negative"] == 0, f"{label}: negative coefficients")
    require(row["minimum"] is not None and row["minimum"] > 0,
            f"{label}: coefficient is not strictly positive")
    require(row["first_negative"] is None, f"{label}: negative witness recorded")


def stats_are_nonnegative(row: dict, label: str) -> None:
    """Accept an identically-zero coefficient slice, but no negative coefficient."""
    require(row["terms"] >= 0, f"{label}: negative term count")
    require(row["negative"] == 0, f"{label}: negative coefficients")
    require(row["first_negative"] is None, f"{label}: negative witness recorded")
    if row["terms"] == 0:
        require(row["minimum"] is None and row["maximum"] is None,
                f"{label}: zero polynomial has non-null extrema")
    else:
        require(row["minimum"] is not None and row["minimum"] > 0,
                f"{label}: nonzero coefficient is not strictly positive")
        require(row["maximum"] is not None and row["maximum"] >= row["minimum"],
                f"{label}: invalid coefficient extrema")


def audit_pins() -> dict[str, str]:
    actual = {}
    for name, expected in PINNED.items():
        path = ROOT / name
        require(path.is_file(), f"missing pinned input: {name}")
        actual[name] = sha256(path)
        require(actual[name] == expected, f"hash mismatch: {name}")
    return actual


def audit_q2_and_tail() -> dict:
    q2 = load("rank8_low_high_tail_q2_pairwise_exact_20260820.json")
    require(q2["status"] ==
            "PASS_EXACT_Q2_THEOREM_AND_SINGLE_PAYMENT_REDUCTION_NOT_LOW_HIGH_THEOREM",
            "q2 report status is not the pinned PASS status")
    replay = q2["pairwise_replay"]
    for key in ("pairwise_margin_identity_remainder", "factorial_q2_identity_remainder",
                "q2_pair_decomposition_remainder"):
        require(replay[key] == "0", f"q2 identity failed: {key}")
    auxiliaries = {row["label"]: row for row in replay["auxiliary_identity_checks"]}
    require(set(auxiliaries) == {"strong", "bernstein_middle"},
            "auxiliary identity labels are incomplete")
    require(all(row["identity_remainder"] == "0" for row in auxiliaries.values()),
            "an auxiliary identity remainder is nonzero")
    require(auxiliaries["strong"]["clearing"].startswith(
            "H_1=1*C*M0+h*d=5040*40320"), "strong auxiliary clearing changed")

    signs = q2["sign_classification"]
    low = signs["low_pairs"]
    high = signs["high_pairs"]
    require(tuple(tuple(row["pair"]) for row in low) == PAIR_KEYS,
            "low-pair universe/order is not all C(9,2) pairs")
    require(tuple(tuple(row["pair"]) for row in high) == PAIR_KEYS,
            "high-pair universe/order is not all C(9,2) pairs")
    negative = [row for row in low if row["sign"].startswith("unique_negative")]
    require(len(negative) == 1 and negative[0]["pair"] == [1, 2],
            "the low decomposition does not have exactly the pinned (1,2) negative pair")
    require(all(not row["sign"].startswith("negative") for row in high),
            "high partner has an unclassified negative pair")
    require(signs["unique_negative_summand"] == "-h*C*p1*p2*K_q(1,2)",
            "unique negative summand changed")

    tail = load("rank8_low_high_tail_boost_reduction_exact_20260820.json")
    require(tail["status"] == "EXACT_REDUCTION_WITH_METHOD_OBSTRUCTIONS_NOT_LOW_HIGH_CONE_THEOREM",
            "tail reduction status changed")
    symbolic = tail["symbolic_replay"]
    require(symbolic["quadratic_remainder"] == "0" and
            symbolic["tail_substitution_remainder"] == "0", "tail replay remainder nonzero")
    require(symbolic["M_t"] == "M0+(t/C)*d+(t/C)^2*q2", "tail polynomial changed")
    require(symbolic["sufficient_auxiliaries"] == ["q2>=0", "C*M0+h*d>=0"],
            "tail sufficiency conditions changed")
    require(tail["tail_boost"]["bound"] == "C>=6h, hence 1<=lambda<=7/6",
            "tail boost bound changed")
    return {
        "q2_identity_remainders": 0,
        "low_pairs": len(low),
        "high_pairs": len(high),
        "unique_negative_pair": [1, 2],
        "tail_sign_split": "d>=0 uses M>=M0; d<0 uses t<=h and H_str=C*M0+h*d",
    }


def audit_support_and_hard_low() -> dict:
    support = load("rank8_low_high_payment_support_reduction_exact_20260820.json")
    require(support["status"] == "PASS_EXACT_TARGET_SUPPORT_REDUCTION_NOT_PAYMENT",
            "support reduction status changed")
    require(len(support["kernel_rows"]) == 36, "positive MLR kernel pair count is not 36")
    require(tuple(tuple(row["pair"]) for row in support["kernel_rows"]) == PAIR_KEYS,
            "positive MLR kernel universe/order is incomplete")
    require(support["target_left_identity"] ==
            "2*p1*p2=(x+a0+a2)^2*(y+a2)", "target-left identity changed")
    target_support = tuple(tuple(row["a0_a2_exponents"])
                           for row in support["target_low_support"])
    require(target_support == ALL_TARGET_SUPPORT, "nine target support pairs changed")
    require(tuple(support["base_slice"]) == (0, 0), "hard-low base slice changed")
    require(tuple(map(tuple, support["off_face_slices_requiring_payment"])) == SUPPORT,
            "eight off-face support pairs changed")

    hard = load("rank8_low_high_base_payment_hard_face_amgm_exact_20260820.json")
    require(hard["status"] == "PASS_EXACT_BASE_PAYMENT_HARD_FACE_AMGM_NOT_FULL_CONE",
            "hard-face producer status changed")
    require(hard["target"] == "M0-7!*8!*h*p1*p2*K_q(1,2)>=0", "hard-face target changed")
    require(hard["term_count"] == 3304270 and hard["negative_count"] == 3332,
            "hard-face exact term counts changed")
    require(hard["amgm_checks"] == {
        "block1": "4*1*13=52>=49=7^2",
        "block2": "4*1*49=196=14^2",
    }, "hard-face AM-GM scalar checks changed")

    hard_audit = load("rank8_low_high_base_payment_hard_face_amgm_independent_audit_20260820.json")
    require(hard_audit["status"] ==
            "PASS_INDEPENDENT_AUDIT_RANK8_LOW_HIGH_BASE_PAYMENT_HARD_FACE_AMGM",
            "hard-face independent audit status changed")
    require(hard_audit["producer_sha256"] == PINNED[
        "verify_rank8_low_high_base_payment_hard_face_amgm.py"], "hard audit producer pin changed")
    require(hard_audit["input_sha256"] == PINNED[
        "rank8_low_high_base_payment_hard_face_amgm_exact_20260820.json"],
        "hard audit report pin changed")

    b34 = load("rank8_low_high_base_payment_b3_b4_subset_exact_20260820.json")
    require(b34["status"] == "PASS_EXACT_COEFFICIENTWISE_HIGH_TAIL_SUBSET_EXTENSION",
            "b3,b4 extension status changed")
    require(b34["extensions"] == ["b3", "b4"], "b3,b4 extension variables changed")
    require(b34["extension_negative_count"] == 0 and
            b34["minimum_extension_coefficient"] > 0, "b3,b4 extension is not positive")

    b345 = load("rank8_low_high_base_payment_b345_sliced_exact_20260820.json")
    require(b345["status"] == "PASS_EXACT_B345_HARD_LOW_COEFFICIENTWISE",
            "b3,b4,b5 hard-low status changed")
    require(b345["b5_zero_input"] == {
        "probe_rank8_low_high_base_payment_high_tail_subset.py": PINNED[
            "probe_rank8_low_high_base_payment_high_tail_subset.py"],
        "rank8_low_high_base_payment_b3_b4_subset_exact_20260820.json": PINNED[
            "rank8_low_high_base_payment_b3_b4_subset_exact_20260820.json"],
    }, "b5=0 dependency pins changed")
    require(b345["maximum_b5_exponent"] == 12, "maximum b5 degree changed")
    require([row["b5_exponent"] for row in b345["slices"]] == list(range(1, 13)),
            "b5 hard-low slices are not the ordered no-gap exponents 1..12")
    for row in b345["slices"]:
        stats_are_positive(row, f"hard-low b5^{row['b5_exponent']}")
    return {
        "positive_kernel_pairs": 36,
        "target_support_pairs": [list(pair) for pair in ALL_TARGET_SUPPORT],
        "hard_low_base": "AM-GM plus b3,b4 and b5^0..12 exact extensions",
    }


def audit_final_slices(final_hash: str) -> dict:
    final = json.loads(FINAL_SLICES.read_text(encoding="utf-8"))
    require(final["schema"] == "rank8-low-high-base-payment-eight-slices-b45-v1",
            "final slice schema changed")
    require(final["status"] == "PASS_EXACT_EIGHT_LOW_SUPPORT_B345",
            "final slice report is not unconditional PASS")
    require(final["source_sha256"] == PINNED[
        "verify_rank8_low_high_base_payment_eight_slices_b45.py"], "final source pin changed")
    expected_inputs = {
        "verify_rank8_low_high_payment_support_reduction.py": PINNED[
            "verify_rank8_low_high_payment_support_reduction.py"],
        "rank8_low_high_payment_support_reduction_exact_20260820.json": PINNED[
            "rank8_low_high_payment_support_reduction_exact_20260820.json"],
        "verify_rank8_low_high_base_payment_b345_sliced.py": PINNED[
            "verify_rank8_low_high_base_payment_b345_sliced.py"],
        "rank8_low_high_base_payment_b345_sliced_exact_20260820.json": PINNED[
            "rank8_low_high_base_payment_b345_sliced_exact_20260820.json"],
    }
    require(final["immutable_inputs"] == expected_inputs, "final immutable input pins changed")
    require(tuple(map(tuple, final["support_pairs"])) == SUPPORT,
            "final support-pair list changed")

    expected = [(pair, e4, e5) for pair in SUPPORT for e4 in range(11) for e5 in range(13)]
    rows = final["slices"]
    actual = [(tuple(row["a0_a2_exponents"]), row["b4_exponent"], row["b5_exponent"])
              for row in rows]
    require(len(rows) == 1144, "final slice count is not 1,144")
    require(len(set(actual)) == 1144, "final slice report contains duplicate keys")
    require(actual == expected, "final slice rows are not the ordered no-gap 8x11x13 universe")
    for key, row in zip(expected, rows):
        stats_are_nonnegative(row, f"off-face slice {key}")
    nonempty = [row for row in rows if row["terms"] > 0]
    empty = [row for row in rows if row["terms"] == 0]
    require(len(nonempty) == 704 and len(empty) == 440,
            "final nonempty/zero slice partition is not 704/440")
    return {
        "report_sha256": final_hash,
        "support_blocks": 8,
        "b4_exponents": [0, 10],
        "b5_exponents": [0, 12],
        "ordered_unique_cells": len(rows),
        "negative_cells": 0,
        "nonempty_cells": len(nonempty),
        "identically_zero_cells": len(empty),
        "minimum_nonzero_coefficient": min(row["minimum"] for row in nonempty),
    }


def audit_terminal_compression() -> dict:
    b67 = load("rank8_low_high_base_payment_terminal_compression_b67_corrected_exact_20260820.json")
    require(b67["status"] == "PASS_EXACT_TERMINAL_COMPRESSION_B7_B6_CORRECTED",
            "corrected b6,b7 compression status changed")
    require(b67["b7_identity"] ==
            "P(tb,b7=z)=P(tb+z,b7=0)+z*c7*q8; all other partner gaps arbitrary",
            "b7 compression identity changed")
    corrected_formula = "c7*(2*tb+h+9*a1)-2*c8"
    require("Q=" + corrected_formula in b67["b6_identity_after_b7_zero"],
            "corrected b6 Q is absent")
    require("2*tb+2*h+9*a1" not in b67["b6_identity_after_b7_zero"],
            "withdrawn b6 coefficient reappeared")
    stats_are_positive(b67["b6_linear_Q"], "corrected b6 linear Q")
    stats_are_positive(b67["b6_quadratic_factor_c7_minus_q7"], "b6 quadratic factor")

    audit = load("rank8_low_high_terminal_compression_b6_corrected_audit_20260820.json")
    require(audit["status"] == "PASS_CORRECTED_B6_COMPRESSION",
            "corrected b6 independent audit status changed")
    require(corrected_formula in audit["exact_shift_identity"],
            "audit does not contain corrected b6 Q")
    require(audit["withdrawn_formula"] == "c7*(2*tb+2*h+9*a1)-2*c8",
            "withdrawn b6 formula is not pinned")
    stats_are_positive(audit["corrected_Q"], "independently audited b6 Q")
    stats_are_positive(audit["quadratic_factor"], "independently audited b6 quadratic")
    return {
        "b7_correction": "z*c7*q8>=0",
        "b6_linear_Q": "Q=" + corrected_formula,
        "b6_quadratic": "z^2*q7*(c7-q7)>=0",
        "invalid_v1_rejected": True,
    }


def main() -> int:
    # Never allow an audit failure or an absent final input to leave a stale
    # theorem-grade PASS artifact from an earlier invocation.
    if OUTPUT.exists():
        OUTPUT.unlink()

    pins = audit_pins()
    q2_tail = audit_q2_and_tail()
    support_hard_low = audit_support_and_hard_low()
    compression = audit_terminal_compression()

    # A RUNNING checkpoint can never be promoted, even if its current rows pass.
    if not FINAL_SLICES.is_file():
        completed = None
        status = None
        if CHECKPOINT.is_file():
            checkpoint = json.loads(CHECKPOINT.read_text(encoding="utf-8"))
            status = checkpoint.get("status")
            completed = len(checkpoint.get("slices", []))
        print("NOT_READY: unconditional final PASS report is absent; checkpoint is evidence only",
              "structural_inputs=PASS", f"checkpoint_status={status}",
              f"completed={completed}", file=sys.stderr)
        return 3

    final_hash = sha256(FINAL_SLICES)
    final_slices = audit_final_slices(final_hash)

    require(DIRECT_H_FULL_CONE_PINS is not None,
            "base-payment PASS cannot be promoted: no pinned direct H_str full-cone theorem")

    join = [
        "The positive MLR circuit makes every M0 coefficient nonnegative; the payment target has exactly nine (a0,a2) support pairs.",
        "The (0,0) support is nonnegative for arbitrary b3,b4,b5 with b6=b7=0 by the independently audited hard-face AM-GM certificate and the exact b3,b4,b5 extensions.",
        "The final ordered 8x11x13 certificate proves the other eight support pairs for arbitrary b3,b4,b5 with b6=b7=0; all support-exterior coefficients remain nonnegative from M0.",
        "The corrected nonnegative b7 then b6 terminal corrections extend the base payment P>=0 to arbitrary b6,b7.",
        "A separately pinned direct theorem proves H_str=C*M0+h*d>=0 on the full cone without double-counting the M0 reserve.",
        "Together with q2>=0, the exact tail quadratic and the d>=0/d<0 sign split prove the full low/high interval 0<=t<=h without an endpoint gap.",
    ]
    payload = {
        "schema": "rank8-low-high-full-cone-independent-audit-v1",
        "status": "PASS_EXACT_FULL_LOW_HIGH_CONE_INDEPENDENT_AUDIT",
        "theorem": (
            "For every rank-eight low adjusted-ratio row and every rank-eight high "
            "partner row in the pinned full/full factor cones, the exact low/high "
            "terminal margin is nonnegative."
        ),
        "audit_source_sha256": sha256(Path(__file__)),
        "pinned_inputs": pins,
        "final_slice_report_sha256": final_hash,
        "q2_and_tail": q2_tail,
        "support_and_hard_low": support_hard_low,
        "off_face_slices": final_slices,
        "terminal_compression": compression,
        "logical_join": join,
        "fail_closed_checks": {
            "running_checkpoint_rejected": True,
            "final_status_required": "PASS_EXACT_EIGHT_LOW_SUPPORT_B345",
            "ordered_key_universe": "8 support pairs x b4^0..10 x b5^0..12 = 1144",
            "all_reported_coefficients_nonnegative": True,
            "all_nonzero_coefficients_strictly_positive": True,
            "withdrawn_b6_v1_rejected": True,
        },
        "scope_warning": (
            "This proves only the pinned rank-eight low/high full/full cone. It "
            "does not prove the low/low cone, all-forest Q8, rank-eight PGC, or "
            "Problem 993."
        ),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", payload["audit_source_sha256"])
    print("REPORT", sha256(OUTPUT))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (AssertionError, KeyError, TypeError, ValueError, json.JSONDecodeError) as exc:
        if OUTPUT.exists():
            OUTPUT.unlink()
        print(f"FAIL_CLOSED: {exc}", file=sys.stderr)
        raise SystemExit(2)
