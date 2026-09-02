#!/usr/bin/env python3
"""Independent fail-closed audit of the full base-payment component P>=0.

This deliberately does not assemble the low/high theorem: the separate direct
strong-auxiliary certificate is still missing.
"""

from __future__ import annotations

import hashlib
import itertools
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "rank8_low_high_full_base_payment_component_independent_audit_20260820.json"
SUPPORT = ((0, 1), (0, 2), (0, 3), (1, 0), (1, 1), (1, 2), (2, 0), (2, 1))
ALL_SUPPORT = ((0, 0),) + SUPPORT
PAIR_KEYS = tuple(itertools.combinations(range(9), 2))
PINS = {
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
    "verify_rank8_low_high_base_payment_eight_slices_b45.py":
        "4A44877EA62CA8F596266816FA895991590C47101CBADBBEE6EA94865C735A90",
    "rank8_low_high_base_payment_eight_slices_b45_exact_20260820.json":
        "75A2FA19D62BCB0740BF8FB5D21E5F91641D03A5BCCD0FD3EC66C55439EC4644",
    "verify_rank8_low_high_base_payment_terminal_compression_b67.py":
        "F428BF4B0B27D0099041EF630937E7E95114E0674121A620F115AFC9B7C9F557",
    "rank8_low_high_base_payment_terminal_compression_b67_corrected_exact_20260820.json":
        "A5648D9EEBCE43C6D8CFFB7A52C790710FB85ACB91302511886D27D85E9B77C1",
    "audit_rank8_low_high_terminal_compression_b6_corrected.py":
        "707FAE18FB1BC8CE0966E7F11DD2C4FD076F7276BE8188D26384E8A5E2B87502",
    "rank8_low_high_terminal_compression_b6_corrected_audit_20260820.json":
        "10E8B341308525B658873D9F5FA6E5764BD7DD4E09FA46CF0A8C734EB5D040D5",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str):
    return json.loads((ROOT / name).read_text(encoding="utf-8"))


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def audit_slice(row: dict, label: str) -> None:
    require(row["terms"] >= 0 and row["negative"] == 0, f"{label}: negative data")
    require(row["first_negative"] is None, f"{label}: negative witness present")
    if row["terms"] == 0:
        require(row["minimum"] is None and row["maximum"] is None,
                f"{label}: zero polynomial extrema are not null")
    else:
        require(row["minimum"] > 0 and row["maximum"] >= row["minimum"],
                f"{label}: nonzero coefficients are not strictly positive")


def main() -> None:
    if OUTPUT.exists():
        OUTPUT.unlink()
    actual = {}
    for name, expected in PINS.items():
        path = ROOT / name
        require(path.is_file(), f"missing input: {name}")
        actual[name] = sha256(path)
        require(actual[name] == expected, f"hash mismatch: {name}")

    support = load("rank8_low_high_payment_support_reduction_exact_20260820.json")
    require(support["status"] == "PASS_EXACT_TARGET_SUPPORT_REDUCTION_NOT_PAYMENT",
            "support reduction is not PASS")
    require(tuple(tuple(row["pair"]) for row in support["kernel_rows"]) == PAIR_KEYS,
            "positive MLR circuit does not cover all 36 pairs in order")
    require(tuple(tuple(row["a0_a2_exponents"]) for row in support["target_low_support"])
            == ALL_SUPPORT, "target support is not the exact nine-pair universe")
    require(tuple(support["base_slice"]) == (0, 0), "base slice changed")
    require(tuple(map(tuple, support["off_face_slices_requiring_payment"])) == SUPPORT,
            "off-face support universe changed")
    require(support["target_left_identity"] ==
            "2*p1*p2=(x+a0+a2)^2*(y+a2)", "target-left identity changed")

    hard = load("rank8_low_high_base_payment_hard_face_amgm_exact_20260820.json")
    hard_audit = load("rank8_low_high_base_payment_hard_face_amgm_independent_audit_20260820.json")
    require(hard["status"] == "PASS_EXACT_BASE_PAYMENT_HARD_FACE_AMGM_NOT_FULL_CONE",
            "hard-low producer is not PASS")
    require(hard["target"] == "M0-7!*8!*h*p1*p2*K_q(1,2)>=0", "P target changed")
    require(hard_audit["status"] ==
            "PASS_INDEPENDENT_AUDIT_RANK8_LOW_HIGH_BASE_PAYMENT_HARD_FACE_AMGM",
            "hard-low independent audit is not PASS")
    require(hard_audit["producer_sha256"] == PINS[
        "verify_rank8_low_high_base_payment_hard_face_amgm.py"], "hard producer pin changed")
    require(hard_audit["input_sha256"] == PINS[
        "rank8_low_high_base_payment_hard_face_amgm_exact_20260820.json"],
        "hard report pin changed")

    b34 = load("rank8_low_high_base_payment_b3_b4_subset_exact_20260820.json")
    require(b34["status"] == "PASS_EXACT_COEFFICIENTWISE_HIGH_TAIL_SUBSET_EXTENSION",
            "b3,b4 extension is not PASS")
    require(b34["extensions"] == ["b3", "b4"] and
            b34["extension_negative_count"] == 0 and
            b34["minimum_extension_coefficient"] > 0, "b3,b4 extension data failed")
    b345 = load("rank8_low_high_base_payment_b345_sliced_exact_20260820.json")
    require(b345["status"] == "PASS_EXACT_B345_HARD_LOW_COEFFICIENTWISE",
            "b3,b4,b5 hard-low extension is not PASS")
    require([row["b5_exponent"] for row in b345["slices"]] == list(range(1, 13)),
            "hard-low b5 exponents are not 1..12")
    require(all(row["negative"] == 0 and row["minimum"] > 0 and
                row["first_negative"] is None for row in b345["slices"]),
            "hard-low b5 slice failed")

    final = load("rank8_low_high_base_payment_eight_slices_b45_exact_20260820.json")
    require(final["status"] == "PASS_EXACT_EIGHT_LOW_SUPPORT_B345",
            "final off-face report is not unconditional PASS")
    require(final["source_sha256"] == PINS[
        "verify_rank8_low_high_base_payment_eight_slices_b45.py"], "final source pin changed")
    expected_inputs = {
        "verify_rank8_low_high_payment_support_reduction.py": PINS[
            "verify_rank8_low_high_payment_support_reduction.py"],
        "rank8_low_high_payment_support_reduction_exact_20260820.json": PINS[
            "rank8_low_high_payment_support_reduction_exact_20260820.json"],
        "verify_rank8_low_high_base_payment_b345_sliced.py": PINS[
            "verify_rank8_low_high_base_payment_b345_sliced.py"],
        "rank8_low_high_base_payment_b345_sliced_exact_20260820.json": PINS[
            "rank8_low_high_base_payment_b345_sliced_exact_20260820.json"],
    }
    require(final["immutable_inputs"] == expected_inputs, "final immutable inputs changed")
    require(tuple(map(tuple, final["support_pairs"])) == SUPPORT, "final supports changed")
    expected_keys = [(pair, e4, e5) for pair in SUPPORT
                     for e4 in range(11) for e5 in range(13)]
    rows = final["slices"]
    actual_keys = [(tuple(row["a0_a2_exponents"]), row["b4_exponent"],
                    row["b5_exponent"]) for row in rows]
    require(actual_keys == expected_keys, "ordered 8x11x13 key universe has a gap")
    require(len(set(actual_keys)) == len(rows) == 1144, "duplicate or missing final key")
    for key, row in zip(expected_keys, rows):
        audit_slice(row, str(key))
    nonempty = [row for row in rows if row["terms"]]
    zero = [row for row in rows if not row["terms"]]
    require(len(nonempty) == 704 and len(zero) == 440, "704/440 slice partition changed")
    require(min(row["minimum"] for row in nonempty) == 1, "minimum positive coefficient changed")

    b67 = load("rank8_low_high_base_payment_terminal_compression_b67_corrected_exact_20260820.json")
    b6audit = load("rank8_low_high_terminal_compression_b6_corrected_audit_20260820.json")
    require(b67["status"] == "PASS_EXACT_TERMINAL_COMPRESSION_B7_B6_CORRECTED",
            "corrected b6,b7 compression is not PASS")
    require("Q=c7*(2*tb+h+9*a1)-2*c8" in b67["b6_identity_after_b7_zero"],
            "corrected one-h b6 formula missing")
    require("2*tb+2*h+9*a1" not in b67["b6_identity_after_b7_zero"],
            "withdrawn two-h b6 formula reappeared")
    require(b67["b6_linear_Q"]["negative"] == 0 and
            b67["b6_quadratic_factor_c7_minus_q7"]["negative"] == 0,
            "b6 correction factor is not nonnegative")
    require(b6audit["status"] == "PASS_CORRECTED_B6_COMPRESSION" and
            b6audit["withdrawn_formula"] == "c7*(2*tb+2*h+9*a1)-2*c8",
            "independent corrected-b6 audit failed")

    payload = {
        "schema": "rank8-low-high-full-base-payment-component-independent-audit-v1",
        "status": "PASS_INDEPENDENT_AUDIT_FULL_BASE_PAYMENT_COMPONENT_NOT_LOW_HIGH_THEOREM",
        "theorem": "P=M0-7!*8!*h*p1*p2*K_q(1,2)>=0 on the full pinned high-base/high-partner cone.",
        "coverage": {
            "positive_M0_kernel_pairs": 36,
            "low_target_support_pairs": 9,
            "hard_low_support": [0, 0],
            "off_face_support_blocks": 8,
            "ordered_off_face_cells": 1144,
            "nonempty_cells": 704,
            "identically_zero_cells": 440,
            "minimum_nonzero_coefficient": 1,
            "terminal_compression": "corrected b7 then b6 extends b6=b7=0 to arbitrary b6,b7",
        },
        "pinned_inputs": actual,
        "audit_source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "This is the full base-payment component only. P>=0 does not prove "
            "H_str=C*M0+h*d; the exact derivative-reserve counterexample blocks "
            "that split. No low/high cone, low/low cone, Q8, PGC, or Problem 993 claim."
        ),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", payload["audit_source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    try:
        main()
    except (AssertionError, KeyError, TypeError, ValueError, json.JSONDecodeError) as exc:
        if OUTPUT.exists():
            OUTPUT.unlink()
        raise SystemExit(f"FAIL_CLOSED: {exc}")
