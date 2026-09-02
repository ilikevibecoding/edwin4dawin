#!/usr/bin/env python3
"""Large-order 3+0 same-mark adjacent no-parent G3 theorem."""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_iso_n7_bundle_g3_adjacent_no_parent_three_attachment_same_mark_unioncap_rank7_g5_finish import build_value
from prove_iso_n7_bundle_g1_sum0_dense_isolates_rank7_g4_piecewise import efficient_certify_bernstein


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_three_attachment_same_mark_all_nonisolated_n11_exact_rank7_g5_finish_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_THREE_ATTACHMENT_SAME_MARK_ALL_NONISOLATED_N11_RANK7_G5_FINISH"
FILES = {
    "derive_source": "derive_iso_n7_bundle_g3_adjacent_no_parent_three_attachment_distributions_rank7_g5_finish.py",
    "derive_report": "iso_n7_bundle_g3_adjacent_no_parent_three_attachment_distributions_exact_rank7_g5_finish_20260831.json",
    "probe_source": "probe_iso_n7_bundle_g3_adjacent_no_parent_three_attachment_same_mark_unioncap_rank7_g5_finish.py",
    "low_report": "iso_n7_bundle_g3_adjacent_no_parent_three_attachment_same_mark_unioncap_low_excess_n11_probe_rank7_g5_finish_20260831.json",
    "high_report": "iso_n7_bundle_g3_adjacent_no_parent_three_attachment_same_mark_unioncap_high_excess_n11_probe_rank7_g5_finish_20260831.json",
    "bernstein_source": "prove_iso_n7_bundle_g1_sum0_dense_isolates_rank7_g4_piecewise.py",
}
EXPECTED = {
    "derive_source": "FF6C5D235514BB6C666E209EC81D3686EEF08C28CCA8D75AF634AEB71004E0B2",
    "derive_report": "D0E4E00568DA8C9AC448D80F005DF18019ED718AF3C1F9B670BEE7D51B5A9B00",
    "probe_source": "B3A5AC97562EB191D4CCD5AB3BD9966CD033A71DA39709A8D98C363A41DB7E9A",
    "low_report": "4FEB7D775E266F85616D30658ACB78B7CE08558F7B25E52E6D034CB689AD6F81",
    "high_report": "C16D5A7C5A75B974158C2D322BC53117DB9594C4468A39A9E668186D12EA780E",
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

    certificates = {}
    denominators = {}
    algebra = None
    for short, chart in (("low", "low_excess"), ("high", "high_excess")):
        probe = json.loads((HERE / FILES[f"{short}_report"]).read_text(encoding="utf-8"))
        assert probe["marker"] == "PROBE_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_THREE_ATTACHMENT_SAME_MARK_UNIONCAP_RANK7_G5_FINISH"
        assert probe["chart"] == chart and probe["threshold_m"] == 9 and probe["threshold_n"] == 11
        assert probe["summary"]["negative_tail_scalar_coefficients"] == 0
        values = build_value(chart)
        m, variables, expression = values[:3]
        certificates[chart], denominators[chart] = certify(expression, variables, m, probe["summary"])
        algebra = values[4:]

    base, coefficients, b, c, lower, degree_sum, q2, q3_upper, q4_extra = algebra
    del c
    m = next(symbol for symbol in lower.free_symbols if str(symbol) == "m")
    W = {int(str(symbol)[1:]): symbol for symbol in lower.free_symbols if str(symbol).startswith("W")}
    tail = sp.Symbol("tail", nonnegative=True)

    # The nested signs used by the weighted union shadow are elementary.
    d4 = coefficients[4]
    d3 = coefficients[3]
    d4_ceiling = sp.expand(d4.subs({W[2]: (m-1)*(m-2)/2, W[3]: 0, W[4]: 0}))
    assert all(value < 0 for value in sp.Poly(d4_ceiling.subs(m, tail+9), tail).coeffs())
    assert all(sp.diff(d4, W[k]) < 0 for k in (2, 3, 4))
    assert all(sp.diff(d3, W[k]) < 0 for k in (2, 3, 4))
    assert sp.expand(d3.subs({W[2]: 0, W[3]: 0, W[4]: 0})) == -7*m
    assert sp.factor(b-(d3+d4*(m-4)/3)) == 0

    root_parameter = next(symbol for symbol in degree_sum.free_symbols if str(symbol) == "root_degree_parameter")
    assert sp.expand(degree_sum-(3+(m-6)*root_parameter)) == 0
    assert sp.expand(q2-(3*m-6-degree_sum)) == 0
    root_degree_symbol = sp.Symbol("D")
    q2_D = 3*m-6-root_degree_symbol
    h3_D = 3*m-8-2*root_degree_symbol
    assert sp.expand(q3_upper-(((m-3)*q2_D-3-h3_D)/2).subs(root_degree_symbol, degree_sum)) == 0
    assert sp.expand(q4_extra-(-4*m+10+3*degree_sum)) == 0

    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": "If adjacent marks have exactly three same-mark attachments at nonisolated roots in distinct components of isolate-free W and n>=11, then no-parent G3>=0.",
        "coverage": {"geometry": "adjacent", "mode": "no_parent", "attachments": 3, "distribution": "same_mark_3plus0", "orders": "n>=11", "condition": "W isolate-free and all three roots nonisolated in distinct components"},
        "weighted_union_shadow": {
            "degree_sum_range": "3<=D<=m-3",
            "Q2_identity": "Q2=3m-6-D",
            "H3_identity": "H3=3m-8-2D",
            "E3_identity": "E3=3m-7-2D",
            "triple_rank4_count": "m-3-D",
            "Q3_bound": "2Q3<=(m-3)Q2-3-H3",
            "Q4_bound": "3Q4<=(m-4)Q3-4m+10+3D",
            "d4_strictly_negative": True,
            "b_strictly_negative": True,
            "safe_lower": str(lower),
        },
        "forest_moment_domain": {"isolate_free_edge_floor": "e>=m/2", "three_component_edge_ceiling": "e<=m-3", "omega_charts": ["low_excess", "high_excess"]},
        "certificates": certificates,
        "positive_denominators": denominators,
        "root_zero_base": str(base),
        "root_loss_coefficients": {str(k): str(v) for k, v in coefficients.items()},
        "coverage_gap_within_stated_same_mark_all_nonisolated_isolatefree_branch": None,
        "universal_same_mark_three_attachment_guard": False,
        "dependencies_sha256": EXPECTED,
        "scope": "Same-mark exactly three attachments, all roots nonisolated, W isolate-free, n>=11; isolated roots and isolate padding separate.",
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({"marker": MARKER, "charts": list(certificates), "coverage_gap_within_stated_branch": None}, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
