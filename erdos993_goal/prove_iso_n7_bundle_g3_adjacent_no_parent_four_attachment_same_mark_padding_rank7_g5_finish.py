#!/usr/bin/env python3
"""Exact isolate-padding theorem for adjacent same-mark four attachments."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_iso_n7_bundle_g3_adjacent_no_parent_four_attachment_same_mark_padding_rank7_g5_finish import extension_value, padding_coefficients
from prove_iso_n7_bundle_g1_sum0_dense_isolates_rank7_g4_piecewise import efficient_certify_bernstein


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_four_attachment_same_mark_padding_exact_rank7_g5_finish_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_FOUR_ATTACHMENT_SAME_MARK_PADDING_RANK7_G5_FINISH"
PROBE_MARKER = "PROBE_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_FOUR_ATTACHMENT_SAME_MARK_PADDING_RANK7_G5_FINISH"
FILES = {
    "probe_source": "probe_iso_n7_bundle_g3_adjacent_no_parent_four_attachment_same_mark_padding_rank7_g5_finish.py",
    "bernstein_source": "prove_iso_n7_bundle_g1_sum0_dense_isolates_rank7_g4_piecewise.py",
    **{f"H{index}_report": f"iso_n7_bundle_g3_adjacent_no_parent_four_attachment_same_mark_padding_H{index}_h4_probe_rank7_g5_finish_20260831.json" for index in range(1, 9)},
}
EXPECTED = {
    "probe_source": "E3DA96088F845C1A8DAA96226AFB2E2ED2E0567BF33C3723CDBBC084F61378E0",
    "bernstein_source": "2C810925F74E9F3F893F9434D195225CA04E5150CE78770B23F65E9BB15FA2CF",
    "H1_report": "F369397D522B4C338A25ECE42E838CB412CB58095E4028687A2ECFC39CA8EC03",
    "H2_report": "B2325F4B894EACE4C650CA1F55BAC6691C8E3A3031DC85E9883CAD63B4095B75",
    "H3_report": "92608501F167D512F68D1BF81B5035DC609E8231BD8DC6680E461930246C9EBE",
    "H4_report": "315084146D8B1518A034FD71102B1B6BC9B56F328E7AF8CD612E8BC946463BE4",
    "H5_report": "92BE5BEB890C57D90033757FC1894AD77DBAD2B43B088D05771F350D6DB236E6",
    "H6_report": "420AE2CB6FE652D4BC5ED212B37F402A8F7488E269F3281ACEB2F7D6E28578AB",
    "H7_report": "D9D7F2B77509E4097DEC7C7BEB55F15959902066470330FB1EA6F8E14DDB7C2E",
    "H8_report": "A70F33E3D0EF68A5FB70358D908CD86966FDC8A4D1D845DC04BC5F8AA6661411",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    for key, digest in EXPECTED.items():
        assert sha256(HERE / FILES[key]) == digest, key
    probes = {}
    for index in range(1, 9):
        probe = json.loads((HERE / FILES[f"H{index}_report"]).read_text(encoding="utf-8"))
        assert probe["marker"] == PROBE_MARKER and probe["newton_index"] == index and probe["threshold_h"] == 4
        assert probe["summary"]["negative_tail_scalar_coefficients"] == 0
        probes[index] = probe
    h, _independent, _rooted_union, coefficients = padding_coefficients()
    certificates, controls, scalars, minimum = {}, 0, 0, None
    for index in range(1, 9):
        vh, variables, value, exact, lower, audit = extension_value(index)
        assert vh == h and sp.expand(exact-coefficients[index]) == 0
        tail = sp.Symbol("tail", nonnegative=True)
        numerator, denominator = map(sp.expand, sp.fraction(sp.cancel(value.subs(h, tail+4))))
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
            "threshold_h": 4,
            "safe_lower": str(lower),
            "union_root_cap_audit": audit,
            **certificate,
        }
    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": "Every positive-order isolate-padding Newton coefficient for adjacent no-parent same-mark exactly-four-attachment G3 is nonnegative.",
        "minimum_core_order": 4,
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
        "coverage_gap_within_positive_order_same_mark_four_attachment_padding": None,
        "dependencies_sha256": EXPECTED,
        "scope": "Same-mark exactly-four-attachment isolate padding only; base positivity, split distributions, and >=5 attachments separate.",
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({"marker": MARKER, **report["aggregate"], "coverage_gap_within_positive_order_same_mark_four_attachment_padding": None}, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
