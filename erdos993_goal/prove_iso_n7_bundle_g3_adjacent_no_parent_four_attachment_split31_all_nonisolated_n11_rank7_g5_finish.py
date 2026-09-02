#!/usr/bin/env python3
"""Large-order 3+1 split-mark adjacent no-parent G3 theorem."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_iso_n7_bundle_g3_adjacent_no_parent_four_attachment_two_sided_shadow_rank7_g5_finish import build_value, side_shadow
from prove_iso_n7_bundle_g1_sum0_dense_isolates_rank7_g4_piecewise import efficient_certify_bernstein


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_four_attachment_split31_all_nonisolated_n11_exact_rank7_g5_finish_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_FOUR_ATTACHMENT_SPLIT31_ALL_NONISOLATED_N11_RANK7_G5_FINISH"
PROBE_MARKER = "PROBE_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_FOUR_ATTACHMENT_TWO_SIDED_SHADOW_RANK7_G5_FINISH"
VERTICES = ("minimum", "P_min_Q_max", "P_max_Q_min")
CHARTS = ("low_excess", "high_excess")
FILES = {
    "derive_source": "derive_iso_n7_bundle_g3_adjacent_no_parent_general_attachment_losses_rank7_g5_finish.py",
    "derive_report": "iso_n7_bundle_g3_adjacent_no_parent_general_attachment_losses_exact_rank7_g5_finish_20260831.json",
    "probe_source": "probe_iso_n7_bundle_g3_adjacent_no_parent_four_attachment_two_sided_shadow_rank7_g5_finish.py",
    "bernstein_source": "prove_iso_n7_bundle_g1_sum0_dense_isolates_rank7_g4_piecewise.py",
}
EXPECTED = {
    "derive_source": "441AE5CB4936CB8F84AC0B064D07338AAAF708435A5F5032AB8A8820F667688A",
    "derive_report": "CB3E129A9F2E6EBF6F5AF6D70B917147121041505A312628A39BB4960C79F699",
    "probe_source": "8C50D737CBCEA85FA4396B43555C5FC61E492F95088DB2BA6D42C29C36C80DE3",
    "bernstein_source": "2C810925F74E9F3F893F9434D195225CA04E5150CE78770B23F65E9BB15FA2CF",
}
REPORT_HASHES = {
    ("minimum", "low_excess"): "CF4EC57E2E533F312293DACE8508A00DB62B032F3BA5DFD9D446C3F1086C2606",
    ("minimum", "high_excess"): "AD1A0F21FED527DA480105B89FA7720DD523DEE8C1E93AB2D28AB60258A054DA",
    ("P_min_Q_max", "low_excess"): "E0210D1B566CF4F2E0603140594E1394EEB9D6A9E52BAA03D22693DB59BF20FC",
    ("P_min_Q_max", "high_excess"): "33D114B43242F18FF5A0F1CECE3B1E08FE870079B3F715F49D76BC5EFB74D903",
    ("P_max_Q_min", "low_excess"): "7463FEFB043DBB98257C649136DBC691B0DE94EDE1A3FAE371A38F851E0BE7AE",
    ("P_max_Q_min", "high_excess"): "B6DC2D946B2F41804270DAF53CCEC65CF9F24502E3C9CFC74E13B8C5CE50FBD3",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def report_path(vertex: str, chart: str) -> Path:
    return HERE / f"iso_n7_bundle_g3_adjacent_no_parent_four_attachment_two_sided_shadow_31_{vertex}_{chart}_m9_probe_rank7_g5_finish_20260831.json"


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
            assert probe["marker"] == PROBE_MARKER
            assert probe["distribution"] == "3+1" and probe["degree_vertex"] == vertex
            assert probe["chart"] == chart and probe["threshold_m"] == 9 and probe["threshold_n"] == 11
            assert probe["summary"]["negative_tail_scalar_coefficients"] == 0
            values = build_value("3+1", chart, vertex)
            certificates[vertex][chart], denominators[f"{vertex}:{chart}"] = certify(
                values["value"], values["variables"], values["m"], probe["summary"]
            )
            representative = values

    assert representative is not None
    m, pd, qd = representative["m"], representative["pd"], representative["qd"]
    W = {int(str(symbol)[1:]): symbol for expression in (*pd.values(), *qd.values()) for symbol in expression.free_symbols if str(symbol).startswith("W")}
    tail = sp.Symbol("tail", nonnegative=True)
    r, D = sp.symbols("r D", real=True)
    p_lower, p_data = side_shadow(m, 1, r, pd)
    q_lower, q_data = side_shadow(m, 3, D, qd)
    degree_lower = sp.expand(p_lower+q_lower+10*p_data["row2"]*q_data["row2"])

    # The safe lower is affine in D.  On each of the two D-boundaries it is
    # strictly concave in r, so its minimum is at the three simplex vertices.
    assert sp.diff(degree_lower, D, 2) == 0
    assert sp.diff(degree_lower, r, D) == 10
    second_horizontal = sp.expand(sp.diff(degree_lower.subs(D, 3), r, 2))
    second_sloped = sp.expand(sp.diff(degree_lower.subs(D, m-4-r), r, 2))
    assert sp.expand(second_sloped-second_horizontal+20) == 0
    third = sp.expand(sp.diff(second_horizontal, r))
    edge_ceiling_W2 = sp.expand(m*(m-1)/2-(m-4))
    third_floor = sp.expand(third.subs({W[2]: edge_ceiling_W2, W[3]: 0, W[4]: 0}))
    assert all(value > 0 for value in sp.Poly(third_floor.subs(m, tail+9), tail).coeffs())
    second_at_max = sp.expand(second_horizontal.subs(r, m-7))
    second_upper = sp.expand(second_at_max.subs({W[2]: edge_ceiling_W2, W[3]: 0, W[4]: 0}))
    assert all(value < 0 for value in sp.Poly(second_upper.subs(m, tail+9), tail).coeffs())
    assert all(value < 0 for value in sp.Poly((second_upper-20).subs(m, tail+9), tail).coeffs())

    # Both nested rooted-shadow coefficients are nonpositive throughout the
    # same domain.  Hence every use of the upper shadows has the safe direction.
    nested_sign_audit = {}
    for label, coefficients in (("P", pd), ("Q", qd)):
        for rank in (3, 4):
            coefficient = coefficients[rank]
            upper = sp.expand(coefficient.subs({W[2]: edge_ceiling_W2, W[3]: 0, W[4]: 0}))
            assert all(value < 0 for value in sp.Poly(upper.subs(m, tail+9), tail).coeffs())
            nested_sign_audit[f"{label}{rank}"] = str(upper)

    assert sp.factor(representative["p5_floor"]-(13*m**2-33*m+119)) == 0
    assert sp.factor(representative["q5_floor"]-(13*m**2-13*m+99)) == 0
    assert all(value > 0 for value in sp.Poly(representative["p5_floor"].subs(m, tail+9), tail).coeffs())
    assert all(value > 0 for value in sp.Poly(representative["q5_floor"].subs(m, tail+9), tail).coeffs())

    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": "If adjacent marks have exactly four attachments distributed 3+1, all four roots are nonisolated in distinct components of isolate-free W, and n>=11, then no-parent G3>=0.",
        "coverage": {"geometry": "adjacent", "mode": "no_parent", "attachments": 4, "distribution": "split_mark_3plus1", "orders": "n>=11", "condition": "W isolate-free and all roots nonisolated in distinct components"},
        "bilinear_audit": {
            "all_ten_terms_preserved_in_exact_identity": True,
            "retained_positive_term": "10*P2*Q2",
            "seven_other_nonnegative_terms_dropped": True,
            "two_negative_rank2_rank5_terms_absorbed": True,
            "P5_absorption_floor": str(representative["p5_floor"]),
            "Q5_absorption_floor": str(representative["q5_floor"]),
        },
        "degree_simplex": {
            "domain": "r>=1,D>=3,r+D<=m-4",
            "affine_in_D": True,
            "concave_on_both_D_boundary_segments": True,
            "vertices": {"minimum": ["r=1", "D=3"], "P_min_Q_max": ["r=1", "D=m-5"], "P_max_Q_min": ["r=m-7", "D=3"]},
            "generic_safe_degree_lower": str(degree_lower),
            "horizontal_second_derivative": str(second_horizontal),
            "sloped_second_derivative": str(second_sloped),
        },
        "weighted_root_shadows": {
            "P_one_root": ["P2=m-1-r", "2P3<=(m-2-r)P2", "3P4<=(m-3-r)P3"],
            "Q_three_roots": ["Q2=3m-6-D", "2Q3<=(m-3)Q2-3-H3", "3Q4<=(m-4)Q3-E3-H4"],
            "nested_sign_audit": nested_sign_audit,
        },
        "forest_moment_domain": {"isolate_free_edge_floor": "e>=m/2", "four_component_edge_ceiling": "e<=m-4", "omega_charts": list(CHARTS)},
        "certificates": certificates,
        "positive_denominators": denominators,
        "root_zero_base": str(representative["base"]),
        "coverage_gap_within_stated_split31_all_nonisolated_isolatefree_branch": None,
        "universal_split31_four_attachment_guard": False,
        "dependencies_sha256": EXPECTED | {f"report:{vertex}:{chart}": REPORT_HASHES[(vertex, chart)] for vertex in VERTICES for chart in CHARTS},
        "scope": "Split-mark 3+1 exactly four attachments, all roots nonisolated, W isolate-free, n>=11; isolated roots, isolate padding, 2+2, and >=5 attachments separate.",
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
