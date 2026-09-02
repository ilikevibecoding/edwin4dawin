#!/usr/bin/env python3
"""Large-order theorem for exactly-three isolated attachment roots."""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_iso_n7_bundle_g3_adjacent_no_parent_three_attachment_all_isolated_intersected_tau_rank7_g5_finish import build_value
from prove_iso_n7_bundle_g1_sum0_dense_isolates_rank7_g4_piecewise import efficient_certify_bernstein


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_three_attachment_all_isolated_n11_exact_rank7_g5_finish_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_THREE_ATTACHMENT_ALL_ISOLATED_N11_RANK7_G5_FINISH"
DISTRIBUTIONS = ("same_mark", "split_mark")
CHARTS = ("low_excess", "high_excess")
FILES = {
    "derive_source": "derive_iso_n7_bundle_g3_adjacent_no_parent_three_attachment_isolated_patterns_rank7_g5_finish.py",
    "derive_report": "iso_n7_bundle_g3_adjacent_no_parent_three_attachment_isolated_patterns_exact_rank7_g5_finish_20260831.json",
    "probe_source": "probe_iso_n7_bundle_g3_adjacent_no_parent_three_attachment_all_isolated_intersected_tau_rank7_g5_finish.py",
    "bernstein_source": "prove_iso_n7_bundle_g1_sum0_dense_isolates_rank7_g4_piecewise.py",
}
EXPECTED = {
    "derive_source": "9D46FCE74417CBDCAD1A26A0294F553ED8F1E7B07FB6F79106CBD0D105C9CF08",
    "derive_report": "9BCB510FBD8C450A50B6905962E2464CF7B805887D0E3F0225A686EDF729E52F",
    "probe_source": "3F896A01BD8BD255C1EE34D808C4D3CD866D15EE34D199AD53B81A5B21C763AF",
    "bernstein_source": "2C810925F74E9F3F893F9434D195225CA04E5150CE78770B23F65E9BB15FA2CF",
}
REPORT_HASHES = {
    ("same_mark", "low_excess"): "A84681EE37EA7CBC59D6AEDE30E480217EB31067FD063F851A2C73BDFDAF0F9B",
    ("same_mark", "high_excess"): "7BC5E6DF7D1BCC965D4AD2E1362F6290D0439D1DA0E97E83BBE3531CF01169BF",
    ("split_mark", "low_excess"): "5A54A7A7889C280E43C20E7C1345C51573BDCDE4C44484B3B9427CCE756CC10E",
    ("split_mark", "high_excess"): "8DC5DAE474013E7BBA3D8F2C113EB02A398AF4B16601CC286879C868B550EB9D",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def report_path(distribution: str, chart: str) -> Path:
    return HERE / f"iso_n7_bundle_g3_adjacent_no_parent_three_attachment_all_isolated_{distribution}_{chart}_n11_probe_rank7_g5_finish_20260831.json"


def certify(expression, variables, h, summary):
    tail = sp.Symbol("tail", nonnegative=True)
    numerator, denominator = map(sp.expand, sp.fraction(sp.cancel(expression.subs(h, tail+6))))
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
    for key, digest in REPORT_HASHES.items():
        assert sha256(report_path(*key)) == digest, key
    certificates, denominators, expressions = {}, {}, {}
    for distribution in DISTRIBUTIONS:
        certificates[distribution] = {}
        for chart in CHARTS:
            probe = json.loads(report_path(distribution, chart).read_text(encoding="utf-8"))
            assert probe["marker"] == "PROBE_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_THREE_ATTACHMENT_ALL_ISOLATED_INTERSECTED_TAU_RANK7_G5_FINISH"
            assert probe["distribution"] == distribution and probe["chart"] == chart
            assert probe["threshold_h"] == 6 and probe["threshold_n"] == 11
            assert probe["summary"]["negative_tail_scalar_coefficients"] == 0
            h, variables, expression, exact = build_value(distribution, chart)
            certificates[distribution][chart], denominators[f"{distribution}:{chart}"] = certify(expression, variables, h, probe["summary"])
            expressions[distribution] = str(exact)
    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": "If adjacent marks have exactly three attachments, all three roots are isolated in W, H obtained by deleting them is isolate-free and nonempty, and n>=11, then no-parent G3>=0 for both 3+0 and 2+1 distributions.",
        "coverage": {"geometry": "adjacent", "mode": "no_parent", "attachments": 3, "root_pattern": "all_isolated", "distributions": list(DISTRIBUTIONS), "orders": "n>=11", "condition": "H isolate-free and nonempty"},
        "certificates": certificates,
        "positive_denominators": denominators,
        "exact_H_expressions": expressions,
        "coverage_gap_within_stated_all_isolated_isolatefree_H_branch": None,
        "universal_all_isolated_three_attachment_guard": False,
        "dependencies_sha256": EXPECTED | {f"report:{distribution}:{chart}": REPORT_HASHES[(distribution, chart)] for distribution in DISTRIBUTIONS for chart in CHARTS},
        "scope": "Exactly three attachments with all roots isolated and isolate-free nonempty remainder H, n>=11; empty/edgeless H and further isolate padding separate.",
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True)+"\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({"marker": MARKER, "distributions": list(DISTRIBUTIONS), "charts": list(CHARTS), "coverage_gap_within_stated_branch": None}, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
