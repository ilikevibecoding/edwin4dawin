#!/usr/bin/env python3
"""Large-order same-mark two-attachment adjacent no-parent G3 theorem."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_iso_n7_bundle_g3_adjacent_no_parent_two_attachment_same_mark_intersected_tau_rank7_g5_finish import build_value
from prove_iso_n7_bundle_g1_sum0_dense_isolates_rank7_g4_piecewise import efficient_certify_bernstein


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_two_attachment_same_mark_both_nonisolated_n12_exact_rank7_g5_finish_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_TWO_ATTACHMENT_SAME_MARK_BOTH_NONISOLATED_N12_RANK7_G5_FINISH"
FILES = {
    "derive_source": "derive_iso_n7_bundle_g3_adjacent_no_parent_two_attachment_roots_rank7_g5_finish.py",
    "derive_report": "iso_n7_bundle_g3_adjacent_no_parent_two_attachment_roots_exact_rank7_g5_finish_20260831.json",
    "probe_source": "probe_iso_n7_bundle_g3_adjacent_no_parent_two_attachment_same_mark_intersected_tau_rank7_g5_finish.py",
    "low_report": "iso_n7_bundle_g3_adjacent_no_parent_two_attachment_same_mark_intersected_tau_low_excess_n12_probe_rank7_g5_finish_20260831.json",
    "high_report": "iso_n7_bundle_g3_adjacent_no_parent_two_attachment_same_mark_intersected_tau_high_excess_n12_probe_rank7_g5_finish_20260831.json",
    "one_root_source": "prove_iso_n7_bundle_g3_adjacent_no_parent_one_attachment_isolatefree_n11_rank7_g5_finish.py",
    "one_root_report": "iso_n7_bundle_g3_adjacent_no_parent_one_attachment_isolatefree_n11_exact_rank7_g5_finish_20260831.json",
    "bernstein_source": "prove_iso_n7_bundle_g1_sum0_dense_isolates_rank7_g4_piecewise.py",
}
EXPECTED = {
    "derive_source": "AB5B8B1C5A3A9792C0656A390A5018D154F5C220B5233992AE6D239CA8C0283D",
    "derive_report": "46B51E942EB3E86CB2B1F39A6E90BE0B5E67E5E40EF9989337825E65B59B1C6D",
    "probe_source": "2330EAF5BDAA4885E58B37DD8516E37E980FC57B870380EC6202C6BF8D3F679E",
    "low_report": "583EF2BCE6D8D04C6347D5BE159AF8242C300E0546D52439CA0B060400AA349B",
    "high_report": "A862325F145C01B329BC655F7C9897775240B7A86C1ED26B51E783DC6325B94E",
    "one_root_source": "6829D71159E305B7484259C1A0188487F95A80CE40DEA9CDB436951BA63D2EA4",
    "one_root_report": "91DD6C040ED919A0DDDFDED0EB18FA37F2D9D59CE223FD0095510CDC15C81379",
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
    inherited = json.loads((HERE / FILES["one_root_report"]).read_text(encoding="utf-8"))
    assert inherited["coverage_gap_within_stated_one_attachment_isolatefree_branch"] is None
    certificates, denominators = {}, {}
    algebra = None
    for short, chart in (("low", "low_excess"), ("high", "high_excess")):
        probe = json.loads((HERE / FILES[f"{short}_report"]).read_text(encoding="utf-8"))
        assert probe["marker"] == "PROBE_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_TWO_ATTACHMENT_SAME_MARK_INTERSECTED_TAU_RANK7_G5_FINISH"
        assert probe["chart"] == chart and probe["threshold_m"] == 10 and probe["threshold_n"] == 12
        assert probe["summary"]["negative_tail_scalar_coefficients"] == 0
        m, variables, value, same_base, coefficients, b, c, lower = build_value(chart)
        certificates[chart], denominators[chart] = certify(value, variables, m, probe["summary"])
        algebra = same_base, coefficients, b, c, lower
    same_base, coefficients, b, c, lower = algebra
    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": "If adjacent marks have exactly two attachments both at one mark, both attachment roots are nonisolated in isolate-free W, and n>=12, then no-parent G3>=0.",
        "coverage": {"geometry": "adjacent", "mode": "no_parent", "attachments": 2, "distribution": "same_mark", "orders": "n>=12", "condition": "W isolate-free and both roots nonisolated"},
        "safe_lower_derivation": "Write Q=Rx+Ry-Rxy. Pay the negative rank-2..4 losses for Rx and Ry separately by the one-root nested shadows; drop the positive double-root rebates and positive rank-5..7 terms.",
        "Q_zero_base": str(same_base),
        "root_loss_coefficients": {str(k): str(v) for k, v in coefficients.items()},
        "nested_shadow": {"b": str(b), "c": str(c), "safe_lower": str(lower)},
        "certificates": certificates,
        "positive_denominators": denominators,
        "coverage_gap_within_stated_same_mark_both_nonisolated_branch": None,
        "universal_two_attachment_guard": False,
        "dependencies_sha256": EXPECTED,
        "scope": "Same-mark exactly two attachments, both roots nonisolated, W isolate-free, n>=12; finite, padding, isolated-root, split-mark, and >=3 attachments separate.",
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({"marker": MARKER, "charts": list(certificates), "coverage_gap_within_stated_same_mark_both_nonisolated_branch": None}, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
