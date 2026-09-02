#!/usr/bin/env python3
"""Large-order split p0_q1 mixed-isolated exactly-three theorem."""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_iso_n7_bundle_g3_adjacent_no_parent_three_attachment_split_p0q1_mixed_isolated_rank7_g5_finish import build_value
from prove_iso_n7_bundle_g1_sum0_dense_isolates_rank7_g4_piecewise import efficient_certify_bernstein


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_three_attachment_split_p0q1_mixed_isolated_n11_exact_rank7_g5_finish_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_THREE_ATTACHMENT_SPLIT_P0Q1_MIXED_ISOLATED_N11_RANK7_G5_FINISH"
CHARTS = ("low_excess", "high_excess")
FILES = {
    "derive_source": "derive_iso_n7_bundle_g3_adjacent_no_parent_three_attachment_isolated_patterns_rank7_g5_finish.py",
    "derive_report": "iso_n7_bundle_g3_adjacent_no_parent_three_attachment_isolated_patterns_exact_rank7_g5_finish_20260831.json",
    "probe_source": "probe_iso_n7_bundle_g3_adjacent_no_parent_three_attachment_split_p0q1_mixed_isolated_rank7_g5_finish.py",
    "low_report": "iso_n7_bundle_g3_adjacent_no_parent_three_attachment_split_p0q1_low_excess_h8_probe_rank7_g5_finish_20260831.json",
    "high_report": "iso_n7_bundle_g3_adjacent_no_parent_three_attachment_split_p0q1_high_excess_h8_probe_rank7_g5_finish_20260831.json",
    "bernstein_source": "prove_iso_n7_bundle_g1_sum0_dense_isolates_rank7_g4_piecewise.py",
}
EXPECTED = {
    "derive_source": "9D46FCE74417CBDCAD1A26A0294F553ED8F1E7B07FB6F79106CBD0D105C9CF08",
    "derive_report": "9BCB510FBD8C450A50B6905962E2464CF7B805887D0E3F0225A686EDF729E52F",
    "probe_source": "E80F48C96474101B582C50704C74922F7F077883C922985074F96EF27654A773",
    "low_report": "E4659EB0099CFD2F738672CF86ADD0F1F40C1D90B3654F83778988B70FB69410",
    "high_report": "C0009CB48530021EF1C802C27FCF66135DB6BC09B0F68781EA55B353DBDAC3B4",
    "bernstein_source": "2C810925F74E9F3F893F9434D195225CA04E5150CE78770B23F65E9BB15FA2CF",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def certify(expression, variables, h, summary):
    tail = sp.Symbol("tail", nonnegative=True)
    numerator, denominator = map(sp.expand, sp.fraction(sp.cancel(expression.subs(h, tail+8))))
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
    certificates, cr_certificates, cu_certificates, denominators = {}, {}, {}, {}
    algebra = None
    for short, chart in (("low", "low_excess"), ("high", "high_excess")):
        probe = json.loads((HERE / FILES[f"{short}_report"]).read_text(encoding="utf-8"))
        assert probe["marker"] == "PROBE_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_THREE_ATTACHMENT_SPLIT_P0Q1_MIXED_ISOLATED_RANK7_G5_FINISH"
        assert probe["chart"] == chart and probe["threshold_h"] == 8 and probe["threshold_n"] == 11
        assert probe["summary"]["negative_tail_scalar_coefficients"] == 0
        assert probe["negative_cR_summary"]["negative_tail_scalar_coefficients"] == 0
        assert probe["negative_cU_summary"]["negative_tail_scalar_coefficients"] == 0
        values = build_value(chart)
        h, variables, expression, cr_value, cu_value = values[:5]
        certificates[chart], denominators[f"{chart}:main"] = certify(expression, variables, h, probe["summary"])
        cr_certificates[chart], denominators[f"{chart}:cR"] = certify(-cr_value, variables[:5], h, probe["negative_cR_summary"])
        cu_certificates[chart], denominators[f"{chart}:cU"] = certify(-cu_value, variables[:5], h, probe["negative_cU_summary"])
        algebra = values[5:]

    exact, base, rd, ud, bilinear, br, cr, bu, cu, lower, r5_floor, u5_floor = algebra
    del exact, base, cr, cu, lower
    h = next(symbol for expression in (*rd.values(), *ud.values()) for symbol in expression.free_symbols if str(symbol) == "h")
    A = {int(str(symbol)[1:]): symbol for expression in (*rd.values(), *ud.values()) for symbol in expression.free_symbols if str(symbol).startswith("A")}
    tail = sp.Symbol("tail", nonnegative=True)
    edge_max = h-2
    A2_min = sp.expand(h*(h-1)/2-edge_max)
    A3_min = sp.expand(h*(h-1)*(h-2)/6-edge_max*(h-2)+(2*edge_max-h))
    for coefficients, b in ((rd, br), (ud, bu)):
        d4_ceiling = sp.expand(coefficients[4].subs({A[2]: A2_min, A[3]: A3_min, A[4]: 0}))
        assert all(value < 0 for value in sp.Poly(d4_ceiling.subs(h, tail+8), tail).coeffs())
        assert sp.expand(coefficients[3].subs({A[2]: 0, A[3]: 0, A[4]: 0})).subs(h, 8) < 0
        assert sp.factor(b-(coefficients[3]+coefficients[4]*(h-4)/3)) == 0
        for rank in (5, 6, 7):
            floor = sp.expand(coefficients[rank].subs({A[2]: A2_min}))
            assert all(value > 0 for value in sp.Poly(floor.subs(h, tail+8), tail).coeffs())
    assert {(i, j): value for (i, j), value in bilinear.items() if value < 0} == {(2, 5): -10, (5, 2): -10}
    assert all(value > 0 for value in sp.Poly(r5_floor.subs(h, tail+8), tail).coeffs())
    assert all(value > 0 for value in sp.Poly(u5_floor.subs(h, tail+8), tail).coeffs())

    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": "For split 2+1 exactly-three adjacent no-parent attachments with one Q root isolated and the surviving P/Q roots nonisolated in distinct components of isolate-free H, n>=11 implies G3>=0.",
        "coverage": {"pattern": "p0_q1", "orders": "n>=11", "condition": "H isolate-free; surviving P and Q roots nonisolated in distinct components"},
        "bilinear_audit": {"exact_term_count": len(bilinear), "seven_nonnegative_terms_dropped": True, "two_negative_rank2_rank5_terms_absorbed": True, "R5_absorption_floor": str(r5_floor), "U5_absorption_floor": str(u5_floor)},
        "certificates": certificates,
        "negative_cR_certificates": cr_certificates,
        "negative_cU_certificates": cu_certificates,
        "positive_denominators": denominators,
        "coverage_gap_within_stated_p0q1_isolatefree_H_branch": None,
        "universal_split_three_attachment_guard": False,
        "dependencies_sha256": EXPECTED,
        "scope": "Split p0_q1 exactly-three attachment pattern with isolate-free H, n>=11; arbitrary further isolate padding separate.",
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True)+"\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({"marker": MARKER, "charts": list(CHARTS), "coverage_gap_within_stated_branch": None}, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
