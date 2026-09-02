#!/usr/bin/env python3
"""Large-order mixed-isolated 4+0 same-mark adjacent no-parent G3 theorem."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_iso_n7_bundle_g3_adjacent_no_parent_four_attachment_same_mark_mixed_isolated_union_shadow_rank7_g5_finish import build_value
from prove_iso_n7_bundle_g1_sum0_dense_isolates_rank7_g4_piecewise import efficient_certify_bernstein


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_four_attachment_same_mark_mixed_isolated_n11_exact_rank7_g5_finish_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_FOUR_ATTACHMENT_SAME_MARK_MIXED_ISOLATED_N11_RANK7_G5_FINISH"
PROBE_MARKER = "PROBE_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_FOUR_ATTACHMENT_SAME_MARK_MIXED_ISOLATED_UNION_SHADOW_RANK7_G5_FINISH"
THRESHOLDS = {1: 8, 2: 7, 3: 6, 4: 5}
FILES = {
    "derive_source": "derive_iso_n7_bundle_g3_adjacent_no_parent_four_attachment_same_mark_isolated_patterns_rank7_g5_finish.py",
    "derive_report": "iso_n7_bundle_g3_adjacent_no_parent_four_attachment_same_mark_isolated_patterns_exact_rank7_g5_finish_20260831.json",
    "probe_source": "probe_iso_n7_bundle_g3_adjacent_no_parent_four_attachment_same_mark_mixed_isolated_union_shadow_rank7_g5_finish.py",
    "bernstein_source": "prove_iso_n7_bundle_g1_sum0_dense_isolates_rank7_g4_piecewise.py",
    **{f"i{isolated}_{short}_report": f"iso_n7_bundle_g3_adjacent_no_parent_four_attachment_same_mark_isolated{isolated}_{chart}_h{THRESHOLDS[isolated]}_probe_rank7_g5_finish_20260831.json" for isolated in range(1, 5) for short, chart in (("low", "low_excess"), ("high", "high_excess"))},
}
EXPECTED = {
    "derive_source": "645334FB485113CDD5C3F25BA34CE3544AD1425813E6CD4C239710CE6DE536E7",
    "derive_report": "E7849A23C45A9A182A32F831DB628FDD4AFFD978843612F7D50A0C1EEF850F1C",
    "probe_source": "25FEA92A7D3551C031C57D1A4EB50CC0A0425D65053099EF9DAD0B998447BFB2",
    "bernstein_source": "2C810925F74E9F3F893F9434D195225CA04E5150CE78770B23F65E9BB15FA2CF",
    "i1_low_report": "9564BABC2980F7262E612B9DABBC4D13609C59BC7ED12814694B4C62087CDD04",
    "i1_high_report": "936957F98ADC6723962BCCBC1C7B1063114220A9CAA4B7796B4582358FB5085F",
    "i2_low_report": "2EB823C1C4C6F510175150A3C0D7267DA7D04F1FB77CC20EBDEC48B06B0F3D6C",
    "i2_high_report": "0381184BF75ECBB6B8B33286A01BD9D6D23837672805148E5EE7B0D9105CFC63",
    "i3_low_report": "EDDE9AC0D32DB0D59B34AF7C176F61C1B1CCEB67693DA0B0DF0B45D4CCF64CFD",
    "i3_high_report": "7F5B6063CB735EF291731B2C1A684B7C8D553CEE4C3634F74BEB0202034D6ADF",
    "i4_low_report": "A695E7D391EB0B3D6655FF61A804C8562C1965DAD47A40D560299699CE79A997",
    "i4_high_report": "33AF2C8637366CF523F3A8488D420A05FB01EE93BB0E72BEA2F91AF26CBE34AC",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def certify(expression, variables, h, threshold, summary):
    tail = sp.Symbol("tail", nonnegative=True)
    numerator, denominator = map(sp.expand, sp.fraction(sp.cancel(expression.subs(h, tail+threshold))))
    if sp.LC(sp.Poly(denominator, tail, variables[0])) < 0:
        numerator, denominator = -numerator, -denominator
    assert all(value > 0 for value in sp.Poly(denominator, tail, variables[0]).coeffs())
    certificate = efficient_certify_bernstein(numerator, variables, tail)
    assert certificate["degree_profile"] == summary["degree_profile"]
    assert certificate["bernstein_coefficients"] == summary["bernstein_controls"]
    assert certificate["tail_power_coefficients"] == summary["tail_scalar_coefficients"]
    assert certificate["minimum_tail_power_coefficient"] == summary["minimum_tail_scalar_coefficient"]
    assert certificate["ordered_stream_sha256"] == summary["ordered_stream_sha256"]
    assert certificate["exact_power_inversion"] is True
    return certificate, str(sp.factor(denominator))


def main() -> None:
    for key, digest in EXPECTED.items():
        assert sha256(HERE / FILES[key]) == digest, key
    certificates = {}
    algebra_audit = {}
    for isolated in range(1, 5):
        threshold = THRESHOLDS[isolated]
        for short, chart in (("low", "low_excess"), ("high", "high_excess")):
            probe = json.loads((HERE / FILES[f"i{isolated}_{short}_report"]).read_text(encoding="utf-8"))
            assert probe["marker"] == PROBE_MARKER
            assert probe["isolated_roots"] == isolated and probe["remaining_nonisolated_roots"] == 4-isolated
            assert probe["chart"] == chart and probe["threshold_h"] == threshold and probe["threshold_n"] == 11
            assert probe["summary"]["negative_tail_scalar_coefficients"] == 0
            values = build_value(isolated, chart)
            h, variables = values["h"], values["variables"]
            main_certificate, denominator = certify(values["value"], variables, h, threshold, probe["summary"])
            signs = None
            if values["remaining"]:
                assert probe["negative_b_summary"]["negative_tail_scalar_coefficients"] == 0
                assert probe["negative_c_summary"]["negative_tail_scalar_coefficients"] == 0
                sign_variables = (variables[0], variables[1], variables[2], *variables[-4:-2])
                b_certificate, b_denominator = certify(-values["b_value"], sign_variables[:4], h, threshold, probe["negative_b_summary"])
                c_certificate, c_denominator = certify(-values["c_value"], sign_variables, h, threshold, probe["negative_c_summary"])
                signs = {
                    "minus_nested_b": b_certificate,
                    "minus_nested_b_positive_denominator": b_denominator,
                    "minus_nested_c": c_certificate,
                    "minus_nested_c_positive_denominator": c_denominator,
                }
            certificates[f"isolated{isolated}_{chart}"] = {
                "main": main_certificate,
                "positive_denominator": denominator,
                "nested_signs": signs,
            }
            algebra_audit[str(isolated)] = {
                "remaining_nonisolated_roots": values["remaining"],
                "degree_sum": None if values["degree_sum"] is None else str(values["degree_sum"]),
                "Q2_exact": None if values["q2"] is None else str(values["q2"]),
                "H3_exact": None if values["h3"] is None else str(values["h3"]),
                "Q3_upper": None if values["q3_upper"] is None else str(values["q3_upper"]),
                "E3_exact": None if values["e3"] is None else str(values["e3"]),
                "H4_lower": None if values["h4_lower"] is None else str(values["h4_lower"]),
                "Q4_extra": None if values["q4_extra"] is None else str(values["q4_extra"]),
                "safe_lower": str(values["lower"]),
            }

        values = build_value(isolated, "low_excess")
        if values["remaining"]:
            tail = sp.Symbol("tail", nonnegative=True)
            row_symbols = sorted({symbol for coefficient in values["coefficients"].values() for symbol in coefficient.free_symbols if str(symbol).startswith("A")}, key=str)
            for rank in (5, 6, 7):
                assert all(value > 0 for value in sp.Poly(values["coefficients"][rank].subs(values["h"], tail+threshold), tail, *row_symbols).coeffs())
            assert all(value > 0 for value in sp.Poly((-values["coefficients"][4]).subs(values["h"], tail+threshold), tail, *row_symbols).coeffs())

    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": "For same-mark exactly-four adjacent no-parent attachments with one through four isolated attachment roots, isolate-free nonempty H, and n>=11, rank-seven G3 is nonnegative.",
        "root_isolation_partition": [1, 2, 3, 4],
        "large_thresholds": {str(isolated): {"minimum_H_order": THRESHOLDS[isolated], "minimum_total_order_n": 11} for isolated in range(1, 5)},
        "weighted_union_shadow_audit": algebra_audit,
        "certificates": certificates,
        "coverage_gap_within_stated_same_mark_four_attachment_mixed_isolated_isolatefree_H_branch": None,
        "universal_same_mark_four_attachment_guard": False,
        "dependencies_sha256": EXPECTED,
        "scope": "Same-mark exactly four attachments with at least one isolated root, isolate-free nonempty H, n>=11; finite n<=10, unrelated isolate padding, split distributions, and >=5 attachments separate.",
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({"marker": MARKER, "isolated_patterns": 4, "charts": 8, "coverage_gap_within_stated_branch": None}, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
