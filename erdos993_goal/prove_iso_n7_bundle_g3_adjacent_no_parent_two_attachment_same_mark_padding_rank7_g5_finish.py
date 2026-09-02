#!/usr/bin/env python3
"""Exact isolate-padding theorem for adjacent same-mark two attachments."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_iso_n7_bundle_g3_adjacent_no_parent_two_attachment_same_mark_padding_rank7_g5_finish import extension_value, padding_coefficients
from prove_iso_n7_bundle_g1_sum0_dense_isolates_rank7_g4_piecewise import efficient_certify_bernstein


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_two_attachment_same_mark_padding_exact_rank7_g5_finish_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_TWO_ATTACHMENT_SAME_MARK_PADDING_RANK7_G5_FINISH"
PROBE_MARKER = "PROBE_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_TWO_ATTACHMENT_SAME_MARK_PADDING_RANK7_G5_FINISH"
FILES = {
    "probe_source": "probe_iso_n7_bundle_g3_adjacent_no_parent_two_attachment_same_mark_padding_rank7_g5_finish.py",
    "tiny_source": "audit_iso_n7_bundle_g3_adjacent_no_parent_two_attachment_same_mark_padding_tiny_rank7_g5_finish.py",
    "tiny_report": "iso_n7_bundle_g3_adjacent_no_parent_two_attachment_same_mark_padding_tiny_exact_rank7_g5_finish_20260831.json",
    "bernstein_source": "prove_iso_n7_bundle_g1_sum0_dense_isolates_rank7_g4_piecewise.py",
    **{f"H{i}_report": f"iso_n7_bundle_g3_adjacent_no_parent_two_attachment_same_mark_padding_H{i}_h{6 if i == 1 else 2}_probe_rank7_g5_finish_20260831.json" for i in range(1, 9)},
}
EXPECTED = {
    "probe_source": "D334E84739D4F76F4425A7AE8DA096B86B12E0E8E712F605B0E96006F959B291",
    "tiny_source": "5311BB7AF3811D050C31406F77EE5B73E0C0F0D8D30678D95C1F1EF3C16D6C01",
    "tiny_report": "9937B89FDCC9AF37ABCB564C76765259B14216BBD72C653DF18B738D94E9CAF6",
    "bernstein_source": "2C810925F74E9F3F893F9434D195225CA04E5150CE78770B23F65E9BB15FA2CF",
    "H1_report": "1E058F6EFBD380307A38B5B8A2577E052D8CC430DE316F5EFDC648C95128CC84",
    "H2_report": "CAE21020A2A41AEBDA206C4A886E1A633D6E97D78521EDE9CA52E851F7AC6434",
    "H3_report": "FD51ECCE2B3C2E57C686D5BFD1A5FC4615EDCFDA8F62DABAA5E444CC1BA5E015",
    "H4_report": "1AACCAC644B0EC10753A67B9C7B8D10765A6BD51F2D3AC04B13F2ECD33B45F08",
    "H5_report": "82DC0A7DBA068C0882FD404BCC8748D57F0BC2F2C88406911F2BD36CD1FEBE89",
    "H6_report": "44673D3FD49FB726544BE08307C037A669F919F63414EA8B4CCC7B33A50B4232",
    "H7_report": "2655078458C3ED6AB27D6034960C203BE7220A0D461A3326D732F1CDBAF02583",
    "H8_report": "4EBFB66C38AAF1A07184E32235C2C9338105CF7933DE54EC3CF613AF73867735",
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
        assert probe["threshold_h"] == (6 if index == 1 else 2)
        assert probe["summary"]["negative_tail_scalar_coefficients"] == 0
        probes[index] = probe
    h, _I, _J, coefficients = padding_coefficients()
    certificates, controls, scalars, minimum = {}, 0, 0, None
    for index in range(1, 9):
        vh, variables, value, exact, lower, audit = extension_value(index)
        assert vh == h and sp.expand(exact-coefficients[index]) == 0
        threshold = 6 if index == 1 else 2
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
        certificates[f"H{index}"] = {"threshold_h": threshold, "safe_lower": str(lower), "union_root_cap_audit": audit, **certificate}
    tiny = json.loads((HERE / FILES["tiny_report"]).read_text(encoding="utf-8"))
    assert tiny["marker"] == "PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_TWO_ATTACHMENT_SAME_MARK_PADDING_TINY_RANK7_G5_FINISH"
    assert tiny["coverage_gap_within_tiny_H1"] is None and tiny["aggregate"]["global_minimum_H1"] >= 0
    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": "Every positive-order isolate-padding Newton coefficient for adjacent no-parent same-mark exactly-two-attachment G3 is nonnegative.",
        "tiny_exact_H1_audit": tiny["aggregate"],
        "H0_scope_guard": "H0 is the base value and is not proved here.",
        "certificates": certificates,
        "aggregate": {"newton_coefficients": 8, "bernstein_controls": controls, "tail_power_coefficients": scalars, "minimum_large_safe_lower_coefficient": str(minimum), "exact_power_inversion": True, "exact_newton_recomposition": True},
        "coverage_gap_within_positive_order_same_mark_two_attachment_padding": None,
        "dependencies_sha256": EXPECTED,
        "scope": "Same-mark exactly-two-attachment isolate padding only; base positivity, split-mark, and >=3 attachments separate.",
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({"marker": MARKER, **report["aggregate"], "coverage_gap_within_positive_order_same_mark_two_attachment_padding": None}, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
