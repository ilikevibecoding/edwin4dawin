#!/usr/bin/env python3
"""Large-order split-mark two-attachment adjacent no-parent G3 theorem."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_iso_n7_bundle_g3_adjacent_no_parent_two_attachment_split_mark_both_nonisolated_intersected_tau_rank7_g5_finish import build_value
from prove_iso_n7_bundle_g1_sum0_dense_isolates_rank7_g4_piecewise import efficient_certify_bernstein


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_two_attachment_split_mark_both_nonisolated_n12_exact_rank7_g5_finish_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_TWO_ATTACHMENT_SPLIT_MARK_BOTH_NONISOLATED_N12_RANK7_G5_FINISH"
FILES = {
    "derive_source": "derive_iso_n7_bundle_g3_adjacent_no_parent_two_attachment_roots_rank7_g5_finish.py",
    "derive_report": "iso_n7_bundle_g3_adjacent_no_parent_two_attachment_roots_exact_rank7_g5_finish_20260831.json",
    "probe_source": "probe_iso_n7_bundle_g3_adjacent_no_parent_two_attachment_split_mark_both_nonisolated_intersected_tau_rank7_g5_finish.py",
    "low_report": "iso_n7_bundle_g3_adjacent_no_parent_two_attachment_split_mark_both_nonisolated_intersected_tau_low_excess_n12_probe_rank7_g5_finish_20260831.json",
    "high_report": "iso_n7_bundle_g3_adjacent_no_parent_two_attachment_split_mark_both_nonisolated_intersected_tau_high_excess_n12_probe_rank7_g5_finish_20260831.json",
    "bernstein_source": "prove_iso_n7_bundle_g1_sum0_dense_isolates_rank7_g4_piecewise.py",
}
EXPECTED = {
    "derive_source": "AB5B8B1C5A3A9792C0656A390A5018D154F5C220B5233992AE6D239CA8C0283D",
    "derive_report": "46B51E942EB3E86CB2B1F39A6E90BE0B5E67E5E40EF9989337825E65B59B1C6D",
    "probe_source": "37E7D35EF576A462065FA16580290F44F8C18661F422FD2A5BAD3E2D18595A1F",
    "low_report": "3A38D67401CDC0994C75FEDE12C596C6903F5B7DF1EF2F09B1720738280908F4",
    "high_report": "D6D56EF7DF2F69184F487DB794DCA23175862E59D8E4B74E4B7E60A44B56BE3A",
    "bernstein_source": "2C810925F74E9F3F893F9434D195225CA04E5150CE78770B23F65E9BB15FA2CF",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def certify(expression, variables, m, summary):
    tail = sp.Symbol("tail", nonnegative=True)
    numerator, denominator = map(sp.expand, sp.fraction(sp.cancel(expression.subs(m, tail+10))))
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
        assert probe["marker"] == "PROBE_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_TWO_ATTACHMENT_SPLIT_MARK_BOTH_NONISOLATED_INTERSECTED_TAU_RANK7_G5_FINISH"
        assert probe["chart"] == chart and probe["threshold_m"] == 10 and probe["threshold_n"] == 12
        assert probe["summary"]["negative_tail_scalar_coefficients"] == 0
        assert probe["negative_c_summary"]["negative_tail_scalar_coefficients"] == 0
        m, variables, value, c_value, base, coefficients, b, c, lower, rank5_floor = build_value(chart)
        certificates[chart], denominators[f"{chart}_main"] = certify(value, variables, m, probe["summary"])
        c_certificates[chart], denominators[f"{chart}_minus_c"] = certify(-c_value, variables[:5], m, probe["negative_c_summary"])
        algebra = base, coefficients, b, c, lower, rank5_floor
    base, coefficients, b, c, lower, rank5_floor = algebra
    tail = sp.Symbol("tail", nonnegative=True)
    row_symbols = {str(symbol): symbol for symbol in (coefficients[4].free_symbols | b.free_symbols) if symbol != m}
    for expression in (coefficients[4], b):
        # The expression decreases in every present W-row.  Its maximum on a
        # forest therefore occurs at W3=W4=0 and the universal edge-budget
        # floor W2=C(m,2)-(m-1).
        for name in ("W2", "W3", "W4"):
            symbol = row_symbols[name]
            derivative = sp.Poly(sp.expand(sp.diff(expression, symbol).subs(m, tail+10)), tail)
            assert all(value <= 0 for value in derivative.coeffs()) and any(value < 0 for value in derivative.coeffs())
        ceiling = sp.expand(expression.subs({row_symbols["W2"]: (m-1)*(m-2)/2, row_symbols["W3"]: 0, row_symbols["W4"]: 0}))
        assert all(value < 0 for value in sp.Poly(ceiling.subs(m, tail+10), tail).coeffs())
    assert sp.factor(rank5_floor) == 13*m**2-13*m+11
    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": "If adjacent marks have exactly two attachments split one per mark, both roots are nonisolated in isolate-free W, and n>=12, then no-parent G3>=0.",
        "coverage": {"geometry": "adjacent", "mode": "no_parent", "attachments": 2, "distribution": "split_mark", "orders": "n>=12", "condition": "W isolate-free and both roots nonisolated"},
        "bilinear_audit": {"all_ten_terms_preserved_in_exact_identity": True, "eight_nonnegative_terms_dropped": True, "two_negative_rank2_rank5_terms_absorbed": True, "rank5_absorption_floor": str(rank5_floor)},
        "root_zero_base": str(base),
        "root_linear_coefficients": {str(k): str(v) for k, v in coefficients.items()},
        "nested_shadow": {"d4_strictly_negative": True, "b": str(b), "b_strictly_negative": True, "c": str(c), "safe_lower": str(lower)},
        "certificates": certificates,
        "negative_c_certificates": c_certificates,
        "positive_denominators": denominators,
        "coverage_gap_within_stated_split_mark_both_nonisolated_branch": None,
        "universal_split_mark_guard": False,
        "dependencies_sha256": EXPECTED,
        "scope": "Split-mark exactly two attachments, both roots nonisolated, W isolate-free, n>=12; finite, padding, isolated-root, and >=3 attachments separate.",
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({"marker": MARKER, "charts": list(certificates), "coverage_gap_within_stated_split_mark_both_nonisolated_branch": None}, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
