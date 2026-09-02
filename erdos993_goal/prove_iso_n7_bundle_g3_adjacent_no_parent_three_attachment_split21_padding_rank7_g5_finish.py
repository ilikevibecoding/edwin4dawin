#!/usr/bin/env python3
"""Exact isolate-padding theorem for adjacent split 2+1 three attachments."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_iso_n7_bundle_g3_adjacent_no_parent_three_attachment_split21_padding_rank7_g5_finish import extension_value, padding_coefficients
from prove_iso_n7_bundle_g1_sum0_dense_isolates_rank7_g4_piecewise import efficient_certify_bernstein


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_three_attachment_split21_padding_exact_rank7_g5_finish_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_THREE_ATTACHMENT_SPLIT21_PADDING_RANK7_G5_FINISH"
PROBE_MARKER = "PROBE_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_THREE_ATTACHMENT_SPLIT21_PADDING_RANK7_G5_FINISH"
THRESHOLDS = {1: 10, 2: 4, **{index: 3 for index in range(3, 9)}}
FILES = {
    "probe_source": "probe_iso_n7_bundle_g3_adjacent_no_parent_three_attachment_split21_padding_rank7_g5_finish.py",
    "tiny_source": "audit_iso_n7_bundle_g3_adjacent_no_parent_three_attachment_split21_padding_tiny_rank7_g5_finish.py",
    "tiny_report": "iso_n7_bundle_g3_adjacent_no_parent_three_attachment_split21_padding_tiny_exact_rank7_g5_finish_20260831.json",
    "bernstein_source": "prove_iso_n7_bundle_g1_sum0_dense_isolates_rank7_g4_piecewise.py",
    **{f"H{index}_report": f"iso_n7_bundle_g3_adjacent_no_parent_three_attachment_split21_padding_H{index}_h{THRESHOLDS[index]}_probe_rank7_g5_finish_20260831.json" for index in range(1, 9)},
}
EXPECTED = {
    "probe_source": "AF4C5D8DD1CE12E2D7FFC2DA132275FC8F6A16697A1697D82DA87CE155C2760E",
    "tiny_source": "37E6DE0E5B3A72C72F39D617A019F812032E34F478D30E7671A86DA257666A39",
    "tiny_report": "0FD12AFE036C8D7AF8BFDC5ACF6062761DD1B7E7B89C91DDB7EE657FC24FAD3A",
    "bernstein_source": "2C810925F74E9F3F893F9434D195225CA04E5150CE78770B23F65E9BB15FA2CF",
    "H1_report": "612AB750370EED20ED649793E6AFF70F16E8AEE3A137673D05A5BAE60455E167",
    "H2_report": "247A53B5580A1A63A7E90CD84009AAE44F0024179FD6BE796F30C5EBD7C35DBC",
    "H3_report": "20D53341451BBC717A3A7F138A360362CC0B754F339D2AE856FC4560A097B642",
    "H4_report": "510280366CE5D11A8D910BD0265A5F70B15CBA3A759394D46C937AD5D62DEDA7",
    "H5_report": "12912882035882CBBE63BABA9832CD91E5055D4904A0A0513C2B595999BC7C2E",
    "H6_report": "A55AFFF7DC3D98DB97CA7B24F4D0B5750A5FEE8031065621F0C18E8135F65315",
    "H7_report": "90A70A9A6524EDEC4FBEF8568FCE15A1E8F951CE514B919D7F8AEB09303FFBFD",
    "H8_report": "8F621F08BA97140F9D8775FAE5EC653A885FA30D26C47907858C0C4FF98CE04C",
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
        assert probe["threshold_h"] == THRESHOLDS[index]
        assert probe["summary"]["negative_tail_scalar_coefficients"] == 0
        probes[index] = probe
    h, _independent, _p_rows, _q_rows, coefficients = padding_coefficients()
    certificates, controls, scalars, minimum = {}, 0, 0, None
    for index in range(1, 9):
        vh, variables, value, exact, lower, audit = extension_value(index)
        assert vh == h and sp.expand(exact - coefficients[index]) == 0
        threshold = THRESHOLDS[index]
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
            "root_monomial_cap_audit": audit,
            **certificate,
        }
    tiny = json.loads((HERE / FILES["tiny_report"]).read_text(encoding="utf-8"))
    assert tiny["marker"] == "PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_THREE_ATTACHMENT_SPLIT21_PADDING_TINY_RANK7_G5_FINISH"
    assert tiny["coverage_gap_within_tiny_padding_audit"] is None and tiny["aggregate"]["negative_count"] == 0
    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": "Every positive-order isolate-padding Newton coefficient for adjacent no-parent split 2+1 exactly-three-attachment G3 is nonnegative.",
        "bilinear_guard": "The exact Newton coefficients retain both rooted families and every bilinear term before the sign-safe monomial cap; no term is silently omitted.",
        "tiny_exact_audit": tiny["aggregate"],
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
        "coverage_gap_within_positive_order_split21_three_attachment_padding": None,
        "dependencies_sha256": EXPECTED,
        "scope": "Split 2+1 exactly-three-attachment isolate padding only; base positivity, same-mark, and >=4 attachments separate.",
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({"marker": MARKER, **report["aggregate"], "coverage_gap_within_positive_order_split21_three_attachment_padding": None}, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
