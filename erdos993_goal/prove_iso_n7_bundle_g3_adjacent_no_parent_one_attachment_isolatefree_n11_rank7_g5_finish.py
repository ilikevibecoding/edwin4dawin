#!/usr/bin/env python3
"""Large-order one-attachment adjacent no-parent G3 theorem."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_iso_n7_bundle_g3_adjacent_no_parent_one_attachment_intersected_tau_rank7_g5_finish import build_value
from prove_iso_n7_bundle_g1_sum0_dense_isolates_rank7_g4_piecewise import efficient_certify_bernstein


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_one_attachment_isolatefree_n11_exact_rank7_g5_finish_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_ONE_ATTACHMENT_ISOLATEFREE_N11_RANK7_G5_FINISH"
FILES = {
    "derive_source": "derive_iso_n7_bundle_g3_adjacent_no_parent_one_attachment_root_rank7_g5_finish.py",
    "derive_report": "iso_n7_bundle_g3_adjacent_no_parent_one_attachment_root_exact_rank7_g5_finish_20260831.json",
    "probe_source": "probe_iso_n7_bundle_g3_adjacent_no_parent_one_attachment_intersected_tau_rank7_g5_finish.py",
    "low_report": "iso_n7_bundle_g3_adjacent_no_parent_one_attachment_intersected_tau_low_excess_n11_probe_rank7_g5_finish_20260831.json",
    "high_report": "iso_n7_bundle_g3_adjacent_no_parent_one_attachment_intersected_tau_high_excess_n11_probe_rank7_g5_finish_20260831.json",
    "bernstein_source": "prove_iso_n7_bundle_g1_sum0_dense_isolates_rank7_g4_piecewise.py",
}
EXPECTED = {
    "derive_source": "6D32F95AED945C9B60D7EDD622377595DEF770C5111BC18965F5157891D1EE5F",
    "derive_report": "E7C3283625736D9F219F49671A41C463D362EE368346C375208797F907C05E21",
    "probe_source": "0372E3AEDD388738159D136B052ECF23538E8C4EBF5A4DFB165B7A21047C661C",
    "low_report": "2805EC2F5E092352E3BF1B998B1DE507119065FD18D0DB547BFBF774B727F14C",
    "high_report": "C8C5794F1665B6974042ADED076263F229C36FE7EBC295792EF350E046198A49",
    "bernstein_source": "2C810925F74E9F3F893F9434D195225CA04E5150CE78770B23F65E9BB15FA2CF",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def certify(expression, variables, m, summary):
    tail = sp.Symbol("tail", nonnegative=True)
    numerator, denominator = map(sp.expand, sp.fraction(sp.cancel(expression.subs(m, tail+9))))
    if sp.LC(sp.Poly(denominator, tail, variables[0])) < 0:
        numerator, denominator = -numerator, -denominator
    assert all(v > 0 for v in sp.Poly(denominator, tail, variables[0]).coeffs())
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
    certificates, c_certificates, denominators = {}, {}, {}
    algebra = None
    for short, chart in (("low", "low_excess"), ("high", "high_excess")):
        probe = json.loads((HERE / FILES[f"{short}_report"]).read_text(encoding="utf-8"))
        assert probe["marker"] == "PROBE_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_ONE_ATTACHMENT_INTERSECTED_TAU_RANK7_G5_FINISH"
        assert probe["chart"] == chart and probe["summary"]["negative_tail_scalar_coefficients"] == 0
        assert probe["negative_c_certificate_summary"]["negative_tail_scalar_coefficients"] == 0
        m, variables, value, c_value, exact, base, coefficients, b, c, lower = build_value(chart)
        certificates[chart], denominators[f"{chart}_main"] = certify(value, variables, m, probe["summary"])
        c_certificates[chart], denominators[f"{chart}_minus_c"] = certify(-c_value, variables[:5], m, probe["negative_c_certificate_summary"])
        algebra = exact, base, coefficients, b, c, lower
    exact, base, coefficients, b, c, lower = algebra
    report = {
        "marker": MARKER, "status": "proved exact",
        "theorem": "If adjacent marks have exactly one total W-attachment x, W is isolate-free, and n>=11, then no-parent G3>=0.",
        "coverage": {"geometry": "adjacent", "mode": "no_parent", "attachments": 1, "orders": "n>=11", "condition": "W isolate-free"},
        "exact_expression": str(exact), "R_zero_base": str(base),
        "R_coefficients": {str(k): str(v) for k, v in coefficients.items()},
        "nested_shadow": {"b": str(b), "c": str(c), "safe_lower": str(lower)},
        "certificates": certificates, "negative_c_certificates": c_certificates,
        "positive_denominators": denominators,
        "coverage_gap_within_stated_one_attachment_isolatefree_branch": None,
        "universal_one_attachment_guard": False,
        "dependencies_sha256": EXPECTED,
        "scope": "Exactly one attachment, W isolate-free, n>=11; finite, padding, x isolated, and two-or-more attachments separate.",
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({"marker": MARKER, "charts": list(certificates), "coverage_gap_within_stated_one_attachment_isolatefree_branch": None}, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
