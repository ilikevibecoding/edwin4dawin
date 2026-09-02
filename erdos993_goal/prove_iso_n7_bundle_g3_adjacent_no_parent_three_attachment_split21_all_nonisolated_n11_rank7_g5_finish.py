#!/usr/bin/env python3
"""Large-order 2+1 split-mark adjacent no-parent G3 theorem."""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_iso_n7_bundle_g3_adjacent_no_parent_three_attachment_split21_unioncap_rank7_g5_finish import build_value
from prove_iso_n7_bundle_g1_sum0_dense_isolates_rank7_g4_piecewise import efficient_certify_bernstein


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_three_attachment_split21_all_nonisolated_n11_exact_rank7_g5_finish_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_THREE_ATTACHMENT_SPLIT21_ALL_NONISOLATED_N11_RANK7_G5_FINISH"
VERTICES = ("minimum", "P_min_Q_max", "P_max_Q_min")
CHARTS = ("low_excess", "high_excess")
FILES = {
    "derive_source": "derive_iso_n7_bundle_g3_adjacent_no_parent_three_attachment_distributions_rank7_g5_finish.py",
    "derive_report": "iso_n7_bundle_g3_adjacent_no_parent_three_attachment_distributions_exact_rank7_g5_finish_20260831.json",
    "probe_source": "probe_iso_n7_bundle_g3_adjacent_no_parent_three_attachment_split21_unioncap_rank7_g5_finish.py",
    "bernstein_source": "prove_iso_n7_bundle_g1_sum0_dense_isolates_rank7_g4_piecewise.py",
}
EXPECTED = {
    "derive_source": "FF6C5D235514BB6C666E209EC81D3686EEF08C28CCA8D75AF634AEB71004E0B2",
    "derive_report": "D0E4E00568DA8C9AC448D80F005DF18019ED718AF3C1F9B670BEE7D51B5A9B00",
    "probe_source": "C8F72F9F79133FC971C5C9FF9CE0557B6DBDC09EF936F25E5B1514C48866149F",
    "bernstein_source": "2C810925F74E9F3F893F9434D195225CA04E5150CE78770B23F65E9BB15FA2CF",
}
REPORT_HASHES = {
    ("minimum", "low_excess"): "144CF6B778B1BD29C7A1D25010E91412131973F0D9B6B7471A4DB155B4DD3E9F",
    ("minimum", "high_excess"): "8EED01266B3DF3745ECB80AC50E0334326155D6824EAFA9CC98A6D89ACE87C00",
    ("P_min_Q_max", "low_excess"): "E251AB4D104A51253D8E7971C52141EFD98783C8079B43372E756AA2482BF9DD",
    ("P_min_Q_max", "high_excess"): "D42065A87BB0FD0DE710B4096B9C55D62CB4A22025ADF966E03E111BCF7025A8",
    ("P_max_Q_min", "low_excess"): "36A03E19DCE996B8A5DC47682F298669005D03581D77E2B8FCCCD1B1A9A66204",
    ("P_max_Q_min", "high_excess"): "20E6A03942D4E7F3D9F9F109495CD191411F8A4C34D5FB86BD5D0F99E7023E68",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def report_path(vertex: str, chart: str) -> Path:
    return HERE / f"iso_n7_bundle_g3_adjacent_no_parent_three_attachment_split21_unioncap_{vertex}_{chart}_n11_probe_rank7_g5_finish_20260831.json"


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
    for key, digest in REPORT_HASHES.items():
        assert sha256(report_path(*key)) == digest, key

    certificates = {}
    denominators = {}
    representative = None
    for vertex in VERTICES:
        certificates[vertex] = {}
        for chart in CHARTS:
            probe = json.loads(report_path(vertex, chart).read_text(encoding="utf-8"))
            assert probe["marker"] == "PROBE_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_THREE_ATTACHMENT_SPLIT21_UNIONCAP_RANK7_G5_FINISH"
            assert probe["degree_vertex"] == vertex and probe["chart"] == chart
            assert probe["threshold_m"] == 9 and probe["threshold_n"] == 11
            assert probe["summary"]["negative_tail_scalar_coefficients"] == 0
            values = build_value(chart, vertex)
            m, variables, expression = values[:3]
            certificates[vertex][chart], denominators[f"{vertex}:{chart}"] = certify(expression, variables, m, probe["summary"])
            representative = values

    m, _variables, _expression, base, pd, qd, _lower, p5_floor, q5_floor, _degree_data = representative
    W = {int(str(symbol)[1:]): symbol for expression in (*pd.values(), *qd.values()) for symbol in expression.free_symbols if str(symbol).startswith("W")}
    tail = sp.Symbol("tail", nonnegative=True)

    # Reconstruct the generic degree-dependent lower.  Here r is the degree
    # of the single P root and D is the degree sum of the two Q roots.
    r, D = sp.symbols("r D", real=True)
    p2 = m-1-r
    bp = sp.expand(pd[3]+pd[4]*(m-3-r)/3)
    p3_upper = sp.expand((m-2-r)*p2/2)
    p_lower = sp.expand(pd[2]*p2+bp*p3_upper)
    q2 = 2*m-3-D
    q3_upper = sp.expand(((m-3)*q2-m+1+D)/2)
    bq = sp.expand(qd[3]+qd[4]*(m-4)/3)
    q_lower = sp.expand(qd[2]*q2+bq*q3_upper-qd[4]*(m-2-D)/3)
    degree_lower = sp.expand(p_lower+q_lower)

    assert sp.diff(degree_lower, r, D) == 0
    assert sp.diff(degree_lower, D, 2) == 0
    second = sp.factor(sp.diff(degree_lower, r, 2))
    third = sp.factor(sp.diff(degree_lower, r, 3))
    assert sp.factor(third+pd[4]) == 0
    edge_ceiling_W2 = sp.expand(m*(m-1)/2-(m-3))
    third_floor = sp.expand(third.subs({W[2]: edge_ceiling_W2, W[3]: 0, W[4]: 0}))
    assert all(value > 0 for value in sp.Poly(third_floor.subs(m, tail+9), tail).coeffs())
    second_at_max_r = sp.expand(second.subs(r, m-5))
    second_ceiling = sp.expand(second_at_max_r.subs({W[2]: edge_ceiling_W2, W[3]: 0, W[4]: 0}))
    assert all(value < 0 for value in sp.Poly(second_ceiling.subs(m, tail+9), tail).coeffs())
    # Thus the lower is jointly concave on r>=1,D>=2,r+D<=m-3 and its
    # minimum occurs at the three certified vertices.

    for d4, d3 in ((pd[4], pd[3]), (qd[4], qd[3])):
        ceiling = sp.expand(d4.subs({W[2]: edge_ceiling_W2, W[3]: 0, W[4]: 0}))
        assert all(value < 0 for value in sp.Poly(ceiling.subs(m, tail+9), tail).coeffs())
        assert sp.expand(d3.subs({W[2]: 0, W[3]: 0, W[4]: 0})).subs(m, 9) < 0
    assert sp.factor(p5_floor-(13*m**2-23*m-4)) == 0
    assert sp.factor(q5_floor-(13*m**2-13*m+11)) == 0
    assert all(value > 0 for value in sp.Poly(p5_floor.subs(m, tail+9), tail).coeffs())
    assert all(value > 0 for value in sp.Poly(q5_floor.subs(m, tail+9), tail).coeffs())

    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": "If adjacent marks have exactly three attachments distributed 2+1, all three roots are nonisolated in distinct components of isolate-free W, and n>=11, then no-parent G3>=0.",
        "coverage": {"geometry": "adjacent", "mode": "no_parent", "attachments": 3, "distribution": "split_mark_2plus1", "orders": "n>=11", "condition": "W isolate-free and all roots nonisolated in distinct components"},
        "bilinear_audit": {"all_ten_terms_preserved_in_exact_identity": True, "eight_nonnegative_terms_dropped": True, "two_negative_rank2_rank5_terms_absorbed": True, "P5_absorption_floor": str(p5_floor), "Q5_absorption_floor": str(q5_floor)},
        "degree_simplex": {"domain": "r>=1,D>=2,r+D<=m-3", "joint_concavity_proved": True, "vertices": {"minimum": ["r=1", "D=2"], "P_min_Q_max": ["r=1", "D=m-4"], "P_max_Q_min": ["r=m-5", "D=2"]}, "generic_lower": str(degree_lower)},
        "weighted_root_shadows": {"P": ["P2=m-1-r", "2P3<=(m-2-r)P2", "3P4<=(m-3-r)P3"], "Q": ["Q2=2m-3-D", "2Q3<=(m-3)Q2-m+1+D", "3Q4<=(m-4)Q3-(m-2-D)"]},
        "forest_moment_domain": {"isolate_free_edge_floor": "e>=m/2", "three_component_edge_ceiling": "e<=m-3", "omega_charts": list(CHARTS)},
        "certificates": certificates,
        "positive_denominators": denominators,
        "root_zero_base": str(base),
        "coverage_gap_within_stated_split21_all_nonisolated_isolatefree_branch": None,
        "universal_split21_three_attachment_guard": False,
        "dependencies_sha256": EXPECTED | {f"report:{vertex}:{chart}": REPORT_HASHES[(vertex, chart)] for vertex in VERTICES for chart in CHARTS},
        "scope": "Split-mark 2+1 exactly three attachments, all roots nonisolated, W isolate-free, n>=11; isolated roots and isolate padding separate.",
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True)+"\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({"marker": MARKER, "degree_vertices": list(VERTICES), "charts": list(CHARTS), "coverage_gap_within_stated_branch": None}, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
