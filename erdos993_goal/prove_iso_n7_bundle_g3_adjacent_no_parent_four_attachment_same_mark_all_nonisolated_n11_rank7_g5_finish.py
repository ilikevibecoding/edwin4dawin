#!/usr/bin/env python3
"""Large-order 4+0 same-mark adjacent no-parent G3 theorem."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_iso_n7_bundle_g3_adjacent_no_parent_four_attachment_same_mark_union_shadow_rank7_g5_finish import build_value
from prove_iso_n7_bundle_g1_sum0_dense_isolates_rank7_g4_piecewise import efficient_certify_bernstein


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_four_attachment_same_mark_all_nonisolated_n11_exact_rank7_g5_finish_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_FOUR_ATTACHMENT_SAME_MARK_ALL_NONISOLATED_N11_RANK7_G5_FINISH"
FILES = {
    "derive_source": "derive_iso_n7_bundle_g3_adjacent_no_parent_general_attachment_losses_rank7_g5_finish.py",
    "derive_report": "iso_n7_bundle_g3_adjacent_no_parent_general_attachment_losses_exact_rank7_g5_finish_20260831.json",
    "probe_source": "probe_iso_n7_bundle_g3_adjacent_no_parent_four_attachment_same_mark_union_shadow_rank7_g5_finish.py",
    "low_report": "iso_n7_bundle_g3_adjacent_no_parent_four_attachment_same_mark_union_shadow_low_excess_n11_probe_rank7_g5_finish_20260831.json",
    "high_report": "iso_n7_bundle_g3_adjacent_no_parent_four_attachment_same_mark_union_shadow_high_excess_n11_probe_rank7_g5_finish_20260831.json",
    "bernstein_source": "prove_iso_n7_bundle_g1_sum0_dense_isolates_rank7_g4_piecewise.py",
}
EXPECTED = {
    "derive_source": "441AE5CB4936CB8F84AC0B064D07338AAAF708435A5F5032AB8A8820F667688A",
    "derive_report": "CB3E129A9F2E6EBF6F5AF6D70B917147121041505A312628A39BB4960C79F699",
    "probe_source": "6AF0859E73659636E26F3AC838CACA7E6A5453220D5EC486269A8478A26785FC",
    "low_report": "E35393BF87DBDD4AB9DB8A00A69935BDE5C98E4DAB42DE6346DCE150D7ADC64D",
    "high_report": "2ADE1EA842AD8536D9FEBAC1F659884FCB7C4174C5EEE9C5E2EDEB0DE41F439B",
    "bernstein_source": "2C810925F74E9F3F893F9434D195225CA04E5150CE78770B23F65E9BB15FA2CF",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def certify(expression, variables, m, summary):
    tail = sp.Symbol("tail", nonnegative=True)
    numerator, denominator = map(sp.expand, sp.fraction(sp.cancel(expression.subs(m, tail+9))))
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
    algebra = None
    for short, chart in (("low", "low_excess"), ("high", "high_excess")):
        probe = json.loads((HERE / FILES[f"{short}_report"]).read_text(encoding="utf-8"))
        assert probe["marker"] == "PROBE_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_FOUR_ATTACHMENT_SAME_MARK_UNION_SHADOW_RANK7_G5_FINISH"
        assert probe["chart"] == chart and probe["threshold_m"] == 9 and probe["threshold_n"] == 11
        assert probe["summary"]["negative_tail_scalar_coefficients"] == 0
        assert probe["negative_b_summary"]["negative_tail_scalar_coefficients"] == 0
        assert probe["negative_c_summary"]["negative_tail_scalar_coefficients"] == 0
        values = build_value(chart)
        m, variables, expression, b_value, c_value = values[:5]
        certificates[chart], denominators[chart] = certify(expression, variables, m, probe["summary"])
        sign_variables = (variables[0], variables[1], variables[2], variables[4], variables[5])
        b_certificate, b_denominator = certify(-b_value, sign_variables[:4], m, probe["negative_b_summary"])
        c_certificate, c_denominator = certify(-c_value, sign_variables, m, probe["negative_c_summary"])
        sign_certificates[chart] = {
            "minus_nested_b": b_certificate,
            "minus_nested_b_positive_denominator": b_denominator,
            "minus_nested_c": c_certificate,
            "minus_nested_c_positive_denominator": c_denominator,
        }
        algebra = values[5:]

    base, coefficients, nested_b, nested_c, lower, degree_sum, q2, h3, q3_upper, e3, h4_lower, q4_extra = algebra
    m = next(symbol for symbol in lower.free_symbols if str(symbol) == "m")
    degree_parameter = next(symbol for symbol in degree_sum.free_symbols if str(symbol) == "root_degree_parameter")
    D = sp.Symbol("D")
    assert sp.expand(degree_sum-(4+(m-8)*degree_parameter)) == 0
    assert sp.expand(q2-(4*m-10-degree_sum)) == 0
    assert sp.expand(h3-(6*m-20-3*degree_sum)) == 0
    assert sp.expand(q3_upper-(((m-3)*(4*m-10-D)-6-(6*m-20-3*D))/2).subs(D, degree_sum)) == 0
    assert sp.expand(e3-(6*m-16-3*degree_sum)) == 0
    assert sp.expand(h4_lower-(4*m-15-3*degree_sum)) == 0
    assert sp.expand(q4_extra-(-10*m+31+6*degree_sum)) == 0

    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": "If adjacent marks have exactly four same-mark attachments at nonisolated roots in distinct components of isolate-free W and n>=11, then no-parent G3>=0.",
        "coverage": {
            "geometry": "adjacent",
            "mode": "no_parent",
            "attachments": 4,
            "distribution": "same_mark_4plus0",
            "orders": "n>=11",
            "condition": "W isolate-free and all four roots nonisolated in distinct components",
        },
        "weighted_union_shadow": {
            "degree_sum_range": "4<=D<=m-4",
            "Q2_identity": "Q2=4m-10-D",
            "H3_identity": "H3=6m-20-3D",
            "Q3_bound": "2Q3<=(m-3)Q2-6-H3",
            "E3_identity": "E3=6m-16-3D",
            "H4_lower": "H4>=4m-15-3D",
            "Q4_bound": "3Q4<=(m-4)Q3-10m+31+6D",
            "nested_b_nonpositive": True,
            "nested_c_nonpositive": True,
            "safe_lower": str(lower),
        },
        "forest_moment_domain": {
            "isolate_free_edge_floor": "e>=m/2",
            "four_component_edge_ceiling": "e<=m-4",
            "omega_charts": ["low_excess", "high_excess"],
        },
        "certificates": certificates,
        "positive_denominators": denominators,
        "nested_sign_certificates": sign_certificates,
        "root_zero_base": str(base),
        "root_loss_coefficients": {str(k): str(value) for k, value in coefficients.items()},
        "nested_b": str(nested_b),
        "nested_c": str(nested_c),
        "coverage_gap_within_stated_same_mark_four_attachment_all_nonisolated_isolatefree_branch": None,
        "universal_same_mark_four_attachment_guard": False,
        "dependencies_sha256": EXPECTED,
        "scope": "Same-mark exactly four attachments, all roots nonisolated, W isolate-free, n>=11; isolated roots, isolate padding, other distributions, and >=5 attachments separate.",
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({"marker": MARKER, "charts": list(certificates), "coverage_gap_within_stated_branch": None}, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
