#!/usr/bin/env python3
"""Large-order all-isolated theorem for split four-attachment G3."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_iso_n7_bundle_g3_adjacent_no_parent_four_attachment_split_all_isolated_rank7_g5_finish import build_value
from prove_iso_n7_bundle_g1_sum0_dense_isolates_rank7_g4_piecewise import efficient_certify_bernstein


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_four_attachment_split_all_isolated_n11_exact_rank7_g5_finish_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_FOUR_ATTACHMENT_SPLIT_ALL_ISOLATED_N11_RANK7_G5_FINISH"
PROBE_MARKER = "PROBE_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_FOUR_ATTACHMENT_SPLIT_ALL_ISOLATED_RANK7_G5_FINISH"
DISTRIBUTIONS = ("3+1", "2+2")
CHARTS = ("low_excess", "high_excess")
FILES = {
    "derive_source": "derive_iso_n7_bundle_g3_adjacent_no_parent_four_attachment_split_isolated_patterns_rank7_g5_finish.py",
    "derive_report": "iso_n7_bundle_g3_adjacent_no_parent_four_attachment_split_isolated_patterns_exact_rank7_g5_finish_20260831.json",
    "probe_source": "probe_iso_n7_bundle_g3_adjacent_no_parent_four_attachment_split_all_isolated_rank7_g5_finish.py",
    "bernstein_source": "prove_iso_n7_bundle_g1_sum0_dense_isolates_rank7_g4_piecewise.py",
}
EXPECTED = {
    "derive_source": "06E88B0A55A9FF91B8FD5CD2940B37FF6948E193B1968FA931DEEA3BE09D5186",
    "derive_report": "51FFA1836D05390B7A2065D1D1EADE5E23DF97800461E084080B0135FB865318",
    "probe_source": "611B5814F18CC036320719564C3F60A831906F989D710A0FD69B33E2AC9AF33C",
    "bernstein_source": "2C810925F74E9F3F893F9434D195225CA04E5150CE78770B23F65E9BB15FA2CF",
}
REPORT_HASHES = {
    ("3+1", "low_excess"): "A3EF773AC838D4D66BA12079F0536E9DBC9D0D8112D26C3573AA7381F95AE79D",
    ("3+1", "high_excess"): "9477CA0AD0D868D1629A0455DD836C495B7CCDEE184BC0D0E8858D18617131D6",
    ("2+2", "low_excess"): "F2A34A9DCA4B033526D90B78358DE63754AB078C97B27C1FFE050D6503BC72BD",
    ("2+2", "high_excess"): "316B6CE79334B6C0F680273941F16CB9EA1605057C2621C5E39D4B125F5A606B",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def report_path(distribution: str, chart: str) -> Path:
    short = distribution.replace("+", "")
    return HERE / f"iso_n7_bundle_g3_adjacent_no_parent_four_attachment_split_all_isolated_{short}_{chart}_h5_probe_rank7_g5_finish_20260831.json"


def certify(expression, variables, h, summary):
    tail = sp.Symbol("tail", nonnegative=True)
    numerator, denominator = map(sp.expand, sp.fraction(sp.cancel(expression.subs(h, tail+5))))
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
    certificates, denominators, expressions = {}, {}, {}
    for distribution in DISTRIBUTIONS:
        certificates[distribution] = {}
        for chart in CHARTS:
            assert sha256(report_path(distribution, chart)) == REPORT_HASHES[(distribution, chart)]
            probe = json.loads(report_path(distribution, chart).read_text(encoding="utf-8"))
            assert probe["marker"] == PROBE_MARKER and probe["distribution"] == distribution and probe["chart"] == chart
            assert probe["threshold_h"] == 5 and probe["threshold_n"] == 11
            assert probe["summary"]["negative_tail_scalar_coefficients"] == 0
            h, variables, value, exact = build_value(distribution, chart)
            certificates[distribution][chart], denominators[f"{distribution}:{chart}"] = certify(value, variables, h, probe["summary"])
            expressions[distribution] = str(exact)
    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": "For adjacent no-parent exactly-four split attachments, if all four attachment roots are isolated, H is isolate-free and nonempty, and n>=11, then G3>=0 for both 3+1 and 2+2 distributions.",
        "coverage": {"3+1": "p1_q3, h>=5 (n=h+6>=11)", "2+2": "p2_q2, h>=5 (n=h+6>=11)", "condition": "H isolate-free and nonempty"},
        "exact_H_expressions": expressions,
        "forest_moment_domain": {"isolate_free_edge_floor": "e>=h/2", "forest_edge_ceiling": "e<=h-1", "omega_charts": list(CHARTS)},
        "certificates": certificates,
        "positive_denominators": denominators,
        "coverage_gap_within_stated_split_all_isolated_isolatefree_H_branches": None,
        "universal_split_four_attachment_guard": False,
        "dependencies_sha256": EXPECTED | {f"report:{distribution}:{chart}": REPORT_HASHES[(distribution, chart)] for distribution in DISTRIBUTIONS for chart in CHARTS},
        "scope": "All-isolated 3+1 and 2+2 exactly-four attachment branches with isolate-free H and n>=11; finite n<=10, isolate padding, other patterns, and >=5 attachments separate.",
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True)+"\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({"marker": MARKER, "distributions": list(DISTRIBUTIONS), "charts": list(CHARTS), "coverage_gap_within_stated_branches": None}, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
