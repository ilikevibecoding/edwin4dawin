#!/usr/bin/env python3
"""Large-order one-attachment adjacent G3 base with x isolated in W."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_iso_n7_bundle_g3_adjacent_no_parent_one_attachment_xisolated_rank7_g5_finish import build_value
from prove_iso_n7_bundle_g1_sum0_dense_isolates_rank7_g4_piecewise import efficient_certify_bernstein


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_one_attachment_xisolated_n11_exact_rank7_g5_finish_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_ONE_ATTACHMENT_XISOLATED_N11_RANK7_G5_FINISH"
FILES = {
    "probe_source": "probe_iso_n7_bundle_g3_adjacent_no_parent_one_attachment_xisolated_rank7_g5_finish.py",
    "low_report": "iso_n7_bundle_g3_adjacent_no_parent_one_attachment_xisolated_low_excess_n11_probe_rank7_g5_finish_20260831.json",
    "high_report": "iso_n7_bundle_g3_adjacent_no_parent_one_attachment_xisolated_high_excess_n11_probe_rank7_g5_finish_20260831.json",
    "large_source": "prove_iso_n7_bundle_g3_adjacent_no_parent_one_attachment_isolatefree_n11_rank7_g5_finish.py",
    "large_report": "iso_n7_bundle_g3_adjacent_no_parent_one_attachment_isolatefree_n11_exact_rank7_g5_finish_20260831.json",
    "bernstein_source": "prove_iso_n7_bundle_g1_sum0_dense_isolates_rank7_g4_piecewise.py",
}
EXPECTED = {
    "probe_source": "60B7A37D7A6647AE5E0C8ACDF913422E4088B3EA21CA5335AD7CDCC83A1410EE",
    "low_report": "4BF48E52C8FC229AB17EF5E87E94A8F5819A2CB6B89B427EFAE59930545F5F8C",
    "high_report": "63D320C73C47EF0193604B242233A7F2CAACB182C1B0498505EA25AC28FF781A",
    "large_source": "6829D71159E305B7484259C1A0188487F95A80CE40DEA9CDB436951BA63D2EA4",
    "large_report": "91DD6C040ED919A0DDDFDED0EB18FA37F2D9D59CE223FD0095510CDC15C81379",
    "bernstein_source": "2C810925F74E9F3F893F9434D195225CA04E5150CE78770B23F65E9BB15FA2CF",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    for key, digest in EXPECTED.items():
        assert sha256(HERE / FILES[key]) == digest, key
    inherited = json.loads((HERE / FILES["large_report"]).read_text(encoding="utf-8"))
    assert inherited["coverage_gap_within_stated_one_attachment_isolatefree_branch"] is None
    tail = sp.Symbol("tail", nonnegative=True)
    certificates, denominators = {}, {}
    exact = None
    for short, chart in (("low", "low_excess"), ("high", "high_excess")):
        probe = json.loads((HERE / FILES[f"{short}_report"]).read_text(encoding="utf-8"))
        assert probe["marker"] == "PROBE_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_ONE_ATTACHMENT_XISOLATED_RANK7_G5_FINISH"
        assert probe["chart"] == chart and probe["summary"]["negative_tail_scalar_coefficients"] == 0
        q, variables, value, exact = build_value(chart)
        numerator, denominator = map(sp.expand, sp.fraction(sp.cancel(value.subs(q, tail+8))))
        assert all(v > 0 for v in sp.Poly(denominator, tail, variables[0]).coeffs())
        certificate = efficient_certify_bernstein(numerator, variables, tail)
        summary = probe["summary"]
        assert certificate["degree_profile"] == summary["degree_profile"]
        assert certificate["bernstein_coefficients"] == summary["bernstein_controls"]
        assert certificate["tail_power_coefficients"] == summary["tail_scalar_coefficients"]
        assert certificate["minimum_tail_power_coefficient"] == summary["minimum_tail_scalar_coefficient"]
        assert certificate["ordered_stream_sha256"] == summary["ordered_stream_sha256"]
        assert certificate["exact_power_inversion"] is True
        certificates[chart], denominators[chart] = certificate, str(sp.factor(denominator))
    report = {
        "marker": MARKER, "status": "proved exact",
        "theorem": "For exactly one attachment x isolated in W, after stripping to nonempty isolate-free K, n=|K|+3>=11 implies adjacent no-parent G3>=0.",
        "coverage": {"geometry": "adjacent", "mode": "no_parent", "attachments": 1, "x": "isolated in W", "base_orders": "n>=11", "core_orders": "|K|>=8"},
        "row_identity": "W_j=T_j+T_(j-1), R_j=T_(j-1).",
        "exact_expression_in_K_rows": str(exact),
        "certificates": certificates, "positive_denominators": denominators,
        "coverage_gap_within_stated_one_attachment_xisolated_base": None,
        "universal_one_attachment_guard": False,
        "dependencies_sha256": EXPECTED,
        "scope": "Exactly one attachment with x isolated, n>=11; finite and padding separate.",
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({"marker": MARKER, "charts": list(certificates), "coverage_gap_within_stated_one_attachment_xisolated_base": None}, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
