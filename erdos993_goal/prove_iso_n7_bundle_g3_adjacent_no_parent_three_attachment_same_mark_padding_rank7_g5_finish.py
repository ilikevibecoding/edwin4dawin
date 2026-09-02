#!/usr/bin/env python3
"""Exact isolate-padding theorem for adjacent same-mark three attachments."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_iso_n7_bundle_g3_adjacent_no_parent_three_attachment_same_mark_padding_rank7_g5_finish import extension_value, padding_coefficients
from prove_iso_n7_bundle_g1_sum0_dense_isolates_rank7_g4_piecewise import efficient_certify_bernstein


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_three_attachment_same_mark_padding_exact_rank7_g5_finish_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_THREE_ATTACHMENT_SAME_MARK_PADDING_RANK7_G5_FINISH"
PROBE_MARKER = "PROBE_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_THREE_ATTACHMENT_SAME_MARK_PADDING_RANK7_G5_FINISH"
FILES = {
    "probe_source": "probe_iso_n7_bundle_g3_adjacent_no_parent_three_attachment_same_mark_padding_rank7_g5_finish.py",
    "tiny_source": "audit_iso_n7_bundle_g3_adjacent_no_parent_three_attachment_same_mark_padding_tiny_rank7_g5_finish.py",
    "tiny_report": "iso_n7_bundle_g3_adjacent_no_parent_three_attachment_same_mark_padding_tiny_exact_rank7_g5_finish_20260831.json",
    "bernstein_source": "prove_iso_n7_bundle_g1_sum0_dense_isolates_rank7_g4_piecewise.py",
    **{f"H{i}_report": f"iso_n7_bundle_g3_adjacent_no_parent_three_attachment_same_mark_padding_H{i}_h{8 if i == 1 else 3}_probe_rank7_g5_finish_20260831.json" for i in range(1, 9)},
}
EXPECTED = {
    "probe_source": "7A45B0A2ECFDFF4F473FFF719EDAA487442364F67E6F27CACCBC0C68AB4A50A1",
    "tiny_source": "42926721A4290E16705CD6F1354E28DFB721D68D5B4844503B1F473EF3AB8C93",
    "tiny_report": "1104F3C67DC450BDBF48C7B8F66CDA77D7FEA386D35F00E57535770822CB3B6A",
    "bernstein_source": "2C810925F74E9F3F893F9434D195225CA04E5150CE78770B23F65E9BB15FA2CF",
    "H1_report": "553B064404DD21BC6A0D89A886D42656D8C5DB122174ABEE7058913F7B0E7070",
    "H2_report": "F92DEBBF9B891518A710BCA6C8567B4ECC16F246E3C7A5465102642D715AE02D",
    "H3_report": "D38DF64FA096CA19BF5C47CA69EDB1E97AD52C13EB88CF1285E24C8BBFAF21AF",
    "H4_report": "309E65B1C4D1D47E787D62B5DC2ABD0144789C5A2DCADC0A4FDF207D740D18A9",
    "H5_report": "6A45774FB738097B482B12E03E8A88FE9FCA9E43CB8820FC7321749C72010113",
    "H6_report": "ED6EED947AE44600C90D90AFECC4926FC626801BD31856E8C3D5663A664BC393",
    "H7_report": "A85ADDB34296DE5D58821381392F8B09249FBD305E8A20D9BE6C0FF037858A5A",
    "H8_report": "D210FFE78ED606D2085A7F876814F63DABE7AAE60DB613B722B9B83C7B95CD1A",
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
        assert probe["threshold_h"] == (8 if index == 1 else 3)
        assert probe["summary"]["negative_tail_scalar_coefficients"] == 0
        probes[index] = probe
    h, _independent, _rooted_union, coefficients = padding_coefficients()
    certificates, controls, scalars, minimum = {}, 0, 0, None
    for index in range(1, 9):
        vh, variables, value, exact, lower, audit = extension_value(index)
        assert vh == h and sp.expand(exact - coefficients[index]) == 0
        threshold = 8 if index == 1 else 3
        tail = sp.Symbol("tail", nonnegative=True)
        numerator, denominator = map(sp.expand, sp.fraction(sp.cancel(value.subs(h, tail + threshold))))
        if sp.LC(sp.Poly(denominator, tail)) < 0:
            numerator, denominator = -numerator, -denominator
        assert all(value > 0 for value in sp.Poly(denominator, tail).all_coeffs())
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
        certificates[f"H{index}"] = {
            "threshold_h": threshold,
            "safe_lower": str(lower),
            "union_root_cap_audit": audit,
            **certificate,
        }
    tiny = json.loads((HERE / FILES["tiny_report"]).read_text(encoding="utf-8"))
    assert tiny["marker"] == "PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_THREE_ATTACHMENT_SAME_MARK_PADDING_TINY_RANK7_G5_FINISH"
    assert tiny["coverage_gap_within_tiny_H1"] is None and tiny["aggregate"]["global_minimum_H1"] >= 0
    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": "Every positive-order isolate-padding Newton coefficient for adjacent no-parent same-mark exactly-three-attachment G3 is nonnegative.",
        "tiny_exact_H1_audit": tiny["aggregate"],
        "H0_scope_guard": "H0 is the base value and is not proved here.",
        "certificates": certificates,
        "aggregate": {
            "newton_coefficients": 8,
            "bernstein_controls": controls,
            "tail_power_coefficients": scalars,
            "minimum_large_safe_lower_coefficient": str(minimum),
            "exact_power_inversion": True,
            "exact_newton_recomposition": True,
        },
        "coverage_gap_within_positive_order_same_mark_three_attachment_padding": None,
        "dependencies_sha256": EXPECTED,
        "scope": "Same-mark exactly-three-attachment isolate padding only; base positivity, split-mark, and >=4 attachments separate.",
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({"marker": MARKER, **report["aggregate"], "coverage_gap_within_positive_order_same_mark_three_attachment_padding": None}, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
