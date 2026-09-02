#!/usr/bin/env python3
"""Large-order same-mark two-attachment theorem with exactly one isolated root."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_iso_n7_bundle_g3_adjacent_no_parent_two_attachment_same_mark_one_isolated_intersected_tau_rank7_g5_finish import build_value
from prove_iso_n7_bundle_g1_sum0_dense_isolates_rank7_g4_piecewise import efficient_certify_bernstein


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_two_attachment_same_mark_one_isolated_n11_exact_rank7_g5_finish_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_TWO_ATTACHMENT_SAME_MARK_ONE_ISOLATED_N11_RANK7_G5_FINISH"
FILES = {
    "derive_source": "derive_iso_n7_bundle_g3_adjacent_no_parent_two_attachment_same_mark_isolated_roots_rank7_g5_finish.py",
    "derive_report": "iso_n7_bundle_g3_adjacent_no_parent_two_attachment_same_mark_isolated_roots_exact_rank7_g5_finish_20260831.json",
    "probe_source": "probe_iso_n7_bundle_g3_adjacent_no_parent_two_attachment_same_mark_one_isolated_intersected_tau_rank7_g5_finish.py",
    "low_report": "iso_n7_bundle_g3_adjacent_no_parent_two_attachment_same_mark_one_isolated_intersected_tau_low_excess_n11_probe_rank7_g5_finish_20260831.json",
    "high_report": "iso_n7_bundle_g3_adjacent_no_parent_two_attachment_same_mark_one_isolated_intersected_tau_high_excess_n11_probe_rank7_g5_finish_20260831.json",
    "bernstein_source": "prove_iso_n7_bundle_g1_sum0_dense_isolates_rank7_g4_piecewise.py",
}
EXPECTED = {
    "derive_source": "0AB4D47640BFFA18147EA914692AAFA3656AFFA305A863700FB63843ED73CB53",
    "derive_report": "6D65C7B29BC34F91907D627A8C99DB5BED9594C276966002851A90E1BA58A456",
    "probe_source": "2C835BDB1F30A6A4B300B9E1E450F07B27629F850CB586682BA27B91AED8BBBE",
    "low_report": "4DF46C3484CD88CD6178CFEEAD79E87BF02DC97CE8696469099170897A89FC4B",
    "high_report": "84CCD0753FE1B4E529EE17CD62252D85105A9821DE89214FD276CEEEE5576D10",
    "bernstein_source": "2C810925F74E9F3F893F9434D195225CA04E5150CE78770B23F65E9BB15FA2CF",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def certify(expression, variables, h, summary):
    tail = sp.Symbol("tail", nonnegative=True)
    numerator, denominator = map(sp.expand, sp.fraction(sp.cancel(expression.subs(h, tail+8))))
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
        assert probe["marker"] == "PROBE_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_TWO_ATTACHMENT_SAME_MARK_ONE_ISOLATED_INTERSECTED_TAU_RANK7_G5_FINISH"
        assert probe["chart"] == chart and probe["threshold_h"] == 8 and probe["threshold_n"] == 11
        assert probe["summary"]["negative_tail_scalar_coefficients"] == 0
        assert probe["negative_c_summary"]["negative_tail_scalar_coefficients"] == 0
        h, variables, value, c_value, base, coefficients, b, c, lower = build_value(chart)
        certificates[chart], denominators[f"{chart}_main"] = certify(value, variables, h, probe["summary"])
        c_certificates[chart], denominators[f"{chart}_minus_c"] = certify(-c_value, variables[:5], h, probe["negative_c_summary"])
        algebra = base, coefficients, b, c, lower
    base, coefficients, b, c, lower = algebra
    tail = sp.Symbol("tail", nonnegative=True)
    sign_variables = tuple(sorted((coefficients[4].free_symbols | b.free_symbols)-{h}, key=str))
    for expression in (coefficients[4], b):
        polynomial = sp.Poly(sp.expand(expression.subs(h, tail+8)), tail, *sign_variables)
        assert all(value < 0 for value in polynomial.coeffs())
    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": "If adjacent marks have exactly two attachments at the same mark, exactly one attachment root is isolated, H formed by deleting it is isolate-free with its root nonisolated, and |H|>=8 (n>=11), then no-parent G3>=0.",
        "coverage": {"geometry": "adjacent", "mode": "no_parent", "attachments": 2, "distribution": "same_mark", "root_pattern": "exactly one isolated", "orders": "n>=11", "condition": "H isolate-free"},
        "R_zero_base": str(base),
        "R_coefficients": {str(k): str(v) for k, v in coefficients.items()},
        "nested_shadow": {"d4_strictly_negative": True, "b": str(b), "b_strictly_negative": True, "c": str(c), "safe_lower": str(lower)},
        "certificates": certificates,
        "negative_c_certificates": c_certificates,
        "positive_denominators": denominators,
        "coverage_gap_within_stated_same_mark_one_isolated_large_branch": None,
        "universal_one_isolated_guard": False,
        "dependencies_sha256": EXPECTED,
        "scope": "Exactly one root isolated, H isolate-free, |H|>=8; finite, padding, both-isolated, split-mark, and >=3 attachments separate.",
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({"marker": MARKER, "charts": list(certificates), "coverage_gap_within_stated_same_mark_one_isolated_large_branch": None}, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
