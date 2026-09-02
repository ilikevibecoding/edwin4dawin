#!/usr/bin/env python3
"""Exact isolate-padding theorem for adjacent no-parent one attachment."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_iso_n7_bundle_g3_adjacent_no_parent_one_attachment_padding_rank7_g5_finish import (
    extension_value,
    padding_coefficients,
)
from prove_iso_n7_bundle_g1_sum0_dense_isolates_rank7_g4_piecewise import efficient_certify_bernstein


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_one_attachment_padding_exact_rank7_g5_finish_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_ONE_ATTACHMENT_PADDING_RANK7_G5_FINISH"
PROBE_MARKER = "PROBE_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_ONE_ATTACHMENT_PADDING_RANK7_G5_FINISH"
FILES = {
    "probe_source": "probe_iso_n7_bundle_g3_adjacent_no_parent_one_attachment_padding_rank7_g5_finish.py",
    "tiny_source": "audit_iso_n7_bundle_g3_adjacent_no_parent_one_attachment_padding_tiny_rank7_g5_finish.py",
    "tiny_report": "iso_n7_bundle_g3_adjacent_no_parent_one_attachment_padding_tiny_exact_rank7_g5_finish_20260831.json",
    "bernstein_source": "prove_iso_n7_bundle_g1_sum0_dense_isolates_rank7_g4_piecewise.py",
    **{f"H{i}_report": f"iso_n7_bundle_g3_adjacent_no_parent_one_attachment_padding_H{i}_h{4 if i == 1 else 2}_probe_rank7_g5_finish_20260831.json" for i in range(1, 9)},
}
EXPECTED = {
    "probe_source": "1CC3B3E3D53609AD1708DBF4C4F91674B8B84502081B3EA23FA5C47809F45050",
    "tiny_source": "C5E68C5BA7228A9E9DC26D2A011BD49970CD3D2E5C470602996C3EFD92D409A9",
    "tiny_report": "F7716162DE345B75C3EF57F70F02AA6C94A94BFD1599CB4E7BCA2D83D12C8E7C",
    "bernstein_source": "2C810925F74E9F3F893F9434D195225CA04E5150CE78770B23F65E9BB15FA2CF",
    "H1_report": "E783533437EB780D9B2EF94FC4CC50C2B1B2C8D2540685CB009C01BA66C1D9AC",
    "H2_report": "E3E75B35436936E2307AC2321BAD542FF2BAB3FDBFF7E242508882CB1DBD4735",
    "H3_report": "0A3CC80197F4B599B471E571C61A4F6DEB2598EAD66A4BAC9455DB45BB0F0E23",
    "H4_report": "B3A860A1EBDC8A53BD10BF80B3F766F2F2177E9B6F2A5C1C95832965DC3CA6C4",
    "H5_report": "38C60DA80205B5086FF80F847C8C8470627683EC6DFD14E96C66D1359E02FD91",
    "H6_report": "B45F01D6D386328C2F893D697D99FD5FA916CAC312F972484FCDE2EEB4CC9949",
    "H7_report": "F058715684A868FF02FF223093CB2BFE004EC14843BB43AC9AFB093CF16A14FE",
    "H8_report": "2AFB01CABCE3B11F97A00359C7AD95F8B1B35EA7C3E69D4FD65F5EBE9F5B56DA",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    for key, digest in EXPECTED.items():
        assert sha256(HERE / FILES[key]) == digest, key
    probes = {}
    for index in range(1, 9):
        probe = json.loads((HERE / FILES[f"H{index}_report"]).read_text(encoding="utf-8"))
        assert probe["marker"] == PROBE_MARKER and probe["newton_index"] == index
        assert probe["threshold_h"] == (4 if index == 1 else 2)
        assert probe["summary"]["negative_tail_scalar_coefficients"] == 0
        probes[index] = probe
    h, _I, _J, coefficients = padding_coefficients()
    certificates, controls, scalars, minimum = {}, 0, 0, None
    for index in range(1, 9):
        vh, variables, value, exact, lower, audit = extension_value(index)
        assert vh == h and sp.expand(exact-coefficients[index]) == 0
        threshold = 4 if index == 1 else 2
        tail = sp.Symbol("tail", nonnegative=True)
        numerator, denominator = map(sp.expand, sp.fraction(sp.cancel(value.subs(h, tail+threshold))))
        if sp.LC(sp.Poly(denominator, tail)) < 0:
            numerator, denominator = -numerator, -denominator
        assert all(v > 0 for v in sp.Poly(denominator, tail).all_coeffs())
        certificate = efficient_certify_bernstein(numerator, variables, tail)
        summary = probes[index]["summary"]
        assert certificate["degree_profile"] == summary["degree_profile"]
        assert certificate["bernstein_coefficients"] == summary["bernstein_controls"]
        assert certificate["tail_power_coefficients"] == summary["tail_scalar_coefficients"]
        assert certificate["minimum_tail_power_coefficient"] == summary["minimum_tail_scalar_coefficient"]
        assert certificate["ordered_stream_sha256"] == summary["ordered_stream_sha256"]
        local = sp.Rational(certificate["minimum_tail_power_coefficient"])
        assert local > 0 and certificate["exact_power_inversion"] is True
        minimum = local if minimum is None else min(minimum, local)
        controls += certificate["bernstein_coefficients"]
        scalars += certificate["tail_power_coefficients"]
        certificates[f"H{index}"] = {"threshold_h": threshold, "safe_lower": str(lower), "root_cap_audit": audit, **certificate}
    tiny = json.loads((HERE / FILES["tiny_report"]).read_text(encoding="utf-8"))
    assert tiny["marker"] == "PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_ONE_ATTACHMENT_PADDING_TINY_RANK7_G5_FINISH"
    assert tiny["rooted_row_count"] == 13 and tiny["minimum_H1"] == 58
    assert min(tiny["one_vertex_root_newton_coefficients"].values()) >= 0
    report = {
        "marker": MARKER, "status": "proved exact",
        "theorem": "Every positive-order isolate-padding Newton coefficient for adjacent no-parent exactly-one-attachment G3 is positive.",
        "tiny_exact_audit": {"rooted_rows": 13, "minimum_H1": 58, "one_vertex_root_newton_coefficients": tiny["one_vertex_root_newton_coefficients"]},
        "H0_scope_guard": "H0 is the base value and is not proved here.",
        "certificates": certificates,
        "aggregate": {"newton_coefficients": 8, "bernstein_controls": controls, "tail_power_coefficients": scalars, "minimum_tail_power_coefficient": str(minimum), "exact_power_inversion": True, "exact_newton_recomposition": True},
        "coverage_gap_within_positive_order_one_attachment_padding": None,
        "dependencies_sha256": EXPECTED,
        "scope": "Exactly-one-attachment isolate padding only; base positivity and two-or-more attachments separate.",
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({"marker": MARKER, **report["aggregate"], "coverage_gap_within_positive_order_one_attachment_padding": None}, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
