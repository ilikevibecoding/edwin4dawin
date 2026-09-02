#!/usr/bin/env python3
"""Large-order 2+2 split-mark adjacent no-parent G3 theorem."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_iso_n7_bundle_g3_adjacent_no_parent_four_attachment_22_joint_floor_rank7_g5_finish import build_value
from prove_iso_n7_bundle_g1_sum0_dense_isolates_rank7_g4_piecewise import efficient_certify_bernstein


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_four_attachment_split22_all_nonisolated_n11_exact_rank7_g5_finish_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_FOUR_ATTACHMENT_SPLIT22_ALL_NONISOLATED_N11_RANK7_G5_FINISH"
PROBE_MARKER = "PROBE_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_FOUR_ATTACHMENT_22_JOINT_FLOOR_RANK7_G5_FINISH"
CHARTS = ("low_excess", "high_excess")
FILES = {
    "derive_source": "derive_iso_n7_bundle_g3_adjacent_no_parent_general_attachment_losses_rank7_g5_finish.py",
    "derive_report": "iso_n7_bundle_g3_adjacent_no_parent_general_attachment_losses_exact_rank7_g5_finish_20260831.json",
    "probe_source": "probe_iso_n7_bundle_g3_adjacent_no_parent_four_attachment_22_joint_floor_rank7_g5_finish.py",
    "low_report": "iso_n7_bundle_g3_adjacent_no_parent_four_attachment_22_joint_floor_low_excess_m9_probe_rank7_g5_finish_20260831.json",
    "high_report": "iso_n7_bundle_g3_adjacent_no_parent_four_attachment_22_joint_floor_high_excess_m9_probe_rank7_g5_finish_20260831.json",
    "bernstein_source": "prove_iso_n7_bundle_g1_sum0_dense_isolates_rank7_g4_piecewise.py",
}
EXPECTED = {
    "derive_source": "441AE5CB4936CB8F84AC0B064D07338AAAF708435A5F5032AB8A8820F667688A",
    "derive_report": "CB3E129A9F2E6EBF6F5AF6D70B917147121041505A312628A39BB4960C79F699",
    "probe_source": "2636FA010CDBCED387BFEB8E269D71D08EBED8F75E8761BB71F6046F85E79213",
    "low_report": "F65BAFFB42E4363B2E4D8E47235176347F397FD7114159E741379E54BB461B4C",
    "high_report": "774104595CF7AC8A2E7CFB71E67C9B6F547DC96441BC1A981B38E69B530E128E",
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
    certificates, denominators, representative = {}, {}, None
    for short, chart in (("low", "low_excess"), ("high", "high_excess")):
        probe = json.loads((HERE / FILES[f"{short}_report"]).read_text(encoding="utf-8"))
        assert probe["marker"] == PROBE_MARKER and probe["chart"] == chart
        assert probe["threshold_m"] == 9 and probe["threshold_n"] == 11
        assert probe["summary"]["negative_tail_scalar_coefficients"] == 0
        values = build_value(chart)
        certificates[chart], denominators[chart] = certify(values["value"], values["variables"], values["m"], probe["summary"])
        representative = values

    assert representative is not None
    m, coefficients = representative["m"], representative["coefficients"]
    W = {int(str(symbol)[1:]): symbol for expression in coefficients.values() for symbol in expression.free_symbols if str(symbol).startswith("W")}
    tail = sp.Symbol("tail", nonnegative=True)
    W2_min = sp.expand(m*(m-1)/2-(m-4))
    for rank in (3, 4):
        upper = sp.expand(coefficients[rank].subs({W[2]: W2_min, W[3]: 0, W[4]: 0}))
        assert all(value < 0 for value in sp.Poly(upper.subs(m, tail+9), tail).coeffs())
    assert sp.factor(representative["p5_floor"]-(13*m**2-23*m+104)) == 0
    assert sp.factor(representative["q5_floor"]-(13*m**2-23*m+104)) == 0
    assert all(value > 0 for value in sp.Poly(representative["p5_floor"].subs(m, tail+9), tail).coeffs())

    x = next(symbol for symbol in representative["degree_p"].free_symbols if str(symbol) == "degree_p_parameter")
    y = next(symbol for symbol in representative["degree_q"].free_symbols if str(symbol) == "degree_q_parameter")
    assert sp.expand(representative["degree_p"]-(2+(m-8)*x)) == 0
    assert sp.expand(representative["degree_q"]-(2+(m-8)*(1-x)*y)) == 0

    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": "If adjacent marks have exactly four attachments distributed 2+2, all four roots are nonisolated in distinct components of isolate-free W, and n>=11, then no-parent G3>=0.",
        "coverage": {"geometry": "adjacent", "mode": "no_parent", "attachments": 4, "distribution": "split_mark_2plus2", "orders": "n>=11", "condition": "W isolate-free and all roots nonisolated in distinct components"},
        "degree_simplex": {"domain": "Dp>=2,Dq>=2,Dp+Dq<=m-4", "parameterization": ["Dp=2+(m-8)x", "Dq=2+(m-8)(1-x)y", "0<=x,y<=1"], "full_triangle_covered": True},
        "rank3_joint_floor": {
            "formula": "J3>=2*C(m-1-D/2,2)-2e+2D-m+2",
            "proof": "For each two-root family, sum the single-root induced-pair lower bounds, subtract the exact double-root intersection m-2-D, and apply Jensen to the two root degrees.",
        },
        "bilinear_audit": {"all_ten_terms_preserved_in_exact_identity": True, "retained_positive_terms": "10P2Q2+14(P2*Q3_floor+P3_floor*Q2)", "five_other_nonnegative_terms_dropped": True, "two_negative_rank2_rank5_terms_absorbed": True, "rank5_absorption_floor": str(representative["p5_floor"])},
        "weighted_root_shadows": {"P": {key: None if value is None else str(value) for key, value in representative["p_data"].items()}, "Q": {key: None if value is None else str(value) for key, value in representative["q_data"].items()}},
        "forest_moment_domain": {"isolate_free_edge_floor": "e>=m/2", "four_component_edge_ceiling": "e<=m-4", "omega_charts": list(CHARTS)},
        "certificates": certificates,
        "positive_denominators": denominators,
        "root_zero_base": str(representative["base"]),
        "coverage_gap_within_stated_split22_all_nonisolated_isolatefree_branch": None,
        "universal_split22_four_attachment_guard": False,
        "dependencies_sha256": EXPECTED,
        "scope": "Split-mark 2+2 exactly four attachments, all roots nonisolated, W isolate-free, n>=11; isolated roots, isolate padding, and >=5 attachments separate.",
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
