#!/usr/bin/env python3
"""Exact all-order 4+1 all-nonisolated adjacent no-parent G3 theorem."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_iso_n7_bundle_g3_adjacent_no_parent_five_attachment_all_nonisolated_rank7_g5_finish import build_value
from prove_iso_n7_bundle_g1_sum0_dense_isolates_rank7_g4_piecewise import efficient_certify_bernstein


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_five_attachment_41_all_nonisolated_n12_exact_rank7_g5_finish_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_FIVE_ATTACHMENT_41_ALL_NONISOLATED_N12_RANK7_G5_FINISH"
FILES = {
    "derive_source": "derive_iso_n7_bundle_g3_adjacent_no_parent_general_attachment_losses_rank7_g5_finish.py",
    "derive_report": "iso_n7_bundle_g3_adjacent_no_parent_general_attachment_losses_exact_rank7_g5_finish_20260831.json",
    "probe_source": "probe_iso_n7_bundle_g3_adjacent_no_parent_five_attachment_all_nonisolated_rank7_g5_finish.py",
    "low_report": "iso_n7_bundle_g3_adjacent_no_parent_five_attachment_all_nonisolated_41_low_excess_m10_probe_rank7_g5_finish_20260831.json",
    "high_report": "iso_n7_bundle_g3_adjacent_no_parent_five_attachment_all_nonisolated_41_high_excess_m10_probe_rank7_g5_finish_20260831.json",
    "bernstein_source": "prove_iso_n7_bundle_g1_sum0_dense_isolates_rank7_g4_piecewise.py",
}
EXPECTED = {
    "derive_source": "441AE5CB4936CB8F84AC0B064D07338AAAF708435A5F5032AB8A8820F667688A",
    "derive_report": "CB3E129A9F2E6EBF6F5AF6D70B917147121041505A312628A39BB4960C79F699",
    "probe_source": "3F8A89D6FEB3F07589BCF08C92EBEFC123EBDED21F2E92DCDB1A8F0478503ECD",
    "low_report": "ADF6475A34BEE5676C6F3BA438BEAC9BF377D7A33047D170B41C36E4290893CB",
    "high_report": "0CF9531304CDEB7EC802C414BBC5F249C2D181AA853827C5729BB2F791754765",
    "bernstein_source": "2C810925F74E9F3F893F9434D195225CA04E5150CE78770B23F65E9BB15FA2CF",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def certify(expression, variables, m, summary, threshold=10):
    tail = sp.Symbol("tail", nonnegative=True)
    numerator, denominator = map(sp.expand, sp.fraction(sp.cancel(expression.subs(m, tail+threshold))))
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
    for short, chart in (("low", "low_excess"), ("high", "high_excess")):
        probe = json.loads((HERE / FILES[f"{short}_report"]).read_text(encoding="utf-8"))
        assert probe["distribution"] == "4+1" and probe["chart"] == chart
        assert probe["threshold_m"] == 10 and probe["summary"]["negative_tail_scalar_coefficients"] == 0
        assert all(item["negative_tail_scalar_coefficients"] == 0 for item in probe["nested_negative_summaries"].values())
        values = build_value("4+1", chart)
        certificates[chart], denominators[chart] = certify(
            values["value"], values["variables"], values["m"], probe["summary"]
        )
        sign_certificates[chart] = {}
        for label, expression in values["nested_values"].items():
            sign_certificates[chart][label], _ = certify(
                -expression,
                values["sign_variables"],
                values["m"],
                probe["nested_negative_summaries"][label],
            )
    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": "If adjacent marks have exactly five 4+1 attachments at nonisolated roots in distinct components of isolate-free W and n>=12, then no-parent G3 is nonnegative.",
        "coverage": {
            "geometry": "adjacent",
            "mode": "no_parent",
            "attachments": 5,
            "distribution": "split_4plus1",
            "orders": "n>=12",
            "condition": "W isolate-free and all five roots nonisolated in distinct components",
        },
        "forest_moment_domain": {
            "isolate_free_edge_floor": "e>=m/2",
            "five_component_edge_ceiling": "e<=m-5",
            "omega_charts": ["low_excess", "high_excess"],
        },
        "certificates": certificates,
        "positive_denominators": denominators,
        "nested_sign_certificates": sign_certificates,
        "coverage_gap_within_stated_41_all_nonisolated_branch": None,
        "universal_exactly_five_guard": False,
        "dependencies_sha256": EXPECTED,
        "scope": "Exactly five 4+1 attachments, all roots nonisolated, W isolate-free, n>=12; isolated-root and other distributions separate.",
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True)+"\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({"marker": MARKER, "charts": list(certificates), "coverage_gap_within_stated_branch": None}, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
