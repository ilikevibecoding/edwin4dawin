#!/usr/bin/env python3
"""Exact all-order mixed-isolated theorem for same-mark five attachments."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_iso_n7_bundle_g3_adjacent_no_parent_five_attachment_same_mark_mixed_isolated_union_shadow_rank7_g5_finish import build_value
from prove_iso_n7_bundle_g1_sum0_dense_isolates_rank7_g4_piecewise import efficient_certify_bernstein


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_five_attachment_same_mark_mixed_isolated_n11_exact_rank7_g5_finish_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_FIVE_ATTACHMENT_SAME_MARK_MIXED_ISOLATED_N11_RANK7_G5_FINISH"
THRESHOLDS = {1: 8, 2: 7, 3: 6, 4: 5}
FILES = {
    "derive_source": "derive_iso_n7_bundle_g3_adjacent_no_parent_five_attachment_same_mark_isolated_patterns_rank7_g5_finish.py",
    "derive_report": "iso_n7_bundle_g3_adjacent_no_parent_five_attachment_same_mark_isolated_patterns_exact_rank7_g5_finish_20260831.json",
    "probe_source": "probe_iso_n7_bundle_g3_adjacent_no_parent_five_attachment_same_mark_mixed_isolated_union_shadow_rank7_g5_finish.py",
    "bernstein_source": "prove_iso_n7_bundle_g1_sum0_dense_isolates_rank7_g4_piecewise.py",
    **{
        f"z{isolated}_{short}_report": f"iso_n7_bundle_g3_adjacent_no_parent_five_attachment_same_mark_isolated{isolated}_{chart}_h{THRESHOLDS[isolated]}_probe_rank7_g5_finish_20260831.json"
        for isolated in THRESHOLDS
        for short, chart in (("low", "low_excess"), ("high", "high_excess"))
    },
}
EXPECTED = {
    "derive_source": "201D903A576B4A93058E8117154A2B8BDCC3F0ACEDD673E9D606DF36A0E42BA7",
    "derive_report": "39A01A35A0C3E521608604F8F72BDC01293D5BDBA1B91E4E6B911F25451D86F7",
    "probe_source": "7C4068DED3B944FC6E716A6FAA47C15B4BE6A77F7343AA6ABD0220B10CAB19C3",
    "bernstein_source": "2C810925F74E9F3F893F9434D195225CA04E5150CE78770B23F65E9BB15FA2CF",
    "z1_low_report": "C832878A3E3BBD3E33F189397C28E7F2155E70FBD09D04FD9FE7536755CA668A",
    "z1_high_report": "61AFC3190F260DB2AEFEC5F9B49CE7D5D0A4FBF5744C27DCC3169AD747AA585A",
    "z2_low_report": "4242FAB91DE4731D263BB7434BA8B489768BFDEEC4ECBA3436463AFA1A0D7774",
    "z2_high_report": "3C1C26606765429305DCAEDA73C8306A70D874866A3C08FBFE4918A22DC62856",
    "z3_low_report": "13D7850743121D459B6533C1C8C213A8915913616A9A7E71E753EF8B2F300B75",
    "z3_high_report": "1CA602C3CDC1EA14A60FB90EF26EDA4073A35CBBF2C4799881B7B62941610BD4",
    "z4_low_report": "664771851F7F786286779E434D91C91F47AA8C77ADD0122D9B2D144D8EAC2DE8",
    "z4_high_report": "DD9816792BFF39470854911D681AB56EF32CF3EFB65445612C139A8B36F76DB1",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def certify(expression, variables, h, summary, threshold):
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
    denominators = {}
    sign_certificates = {}
    for isolated, threshold in THRESHOLDS.items():
        certificates[str(isolated)] = {}
        denominators[str(isolated)] = {}
        sign_certificates[str(isolated)] = {}
        for short, chart in (("low", "low_excess"), ("high", "high_excess")):
            probe = json.loads((HERE / FILES[f"z{isolated}_{short}_report"]).read_text(encoding="utf-8"))
            assert probe["isolated_roots"] == isolated and probe["remaining_nonisolated_roots"] == 5-isolated
            assert probe["chart"] == chart and probe["threshold_h"] == threshold
            assert probe["summary"]["negative_tail_scalar_coefficients"] == 0
            assert probe["negative_b_summary"]["negative_tail_scalar_coefficients"] == 0
            assert probe["negative_c_summary"]["negative_tail_scalar_coefficients"] == 0
            values = build_value(isolated, chart)
            variables = values["variables"]
            certificates[str(isolated)][chart], denominators[str(isolated)][chart] = certify(
                values["value"], variables, values["h"], probe["summary"], threshold
            )
            sign_variables = (variables[0], variables[1], variables[2], *variables[-4:-2])
            b_certificate, _ = certify(
                -values["b_value"], sign_variables[:4], values["h"], probe["negative_b_summary"], threshold
            )
            c_certificate, _ = certify(
                -values["c_value"], sign_variables, values["h"], probe["negative_c_summary"], threshold
            )
            sign_certificates[str(isolated)][chart] = {
                "minus_nested_b": b_certificate,
                "minus_nested_c": c_certificate,
            }
    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": "For exactly five same-mark attachments with 1..4 isolated roots, and isolate-free H containing the surviving nonisolated roots in distinct components, adjacent no-parent G3 is nonnegative from n=11 onward.",
        "threshold_partition": {
            str(isolated): {
                "isolated_roots": isolated,
                "remaining_nonisolated_roots": 5-isolated,
                "threshold_h": threshold,
                "threshold_n": threshold+isolated+2,
            }
            for isolated, threshold in THRESHOLDS.items()
        },
        "certificates": certificates,
        "positive_denominators": denominators,
        "nested_sign_certificates": sign_certificates,
        "coverage_gap_within_stated_same_mark_five_attachment_mixed_isolated_branch": None,
        "universal_same_mark_five_attachment_guard": False,
        "dependencies_sha256": EXPECTED,
        "scope": "Exactly-five same-mark adjacent no-parent G3 with 1..4 isolated attachment roots and no unrelated isolates; all-nonisolated, all-isolated, finite bases, and unrelated-isolate padding separate.",
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True)+"\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({"marker": MARKER, "isolated_patterns": sorted(THRESHOLDS), "charts_per_pattern": 2, "coverage_gap_within_stated_branch": None}, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
