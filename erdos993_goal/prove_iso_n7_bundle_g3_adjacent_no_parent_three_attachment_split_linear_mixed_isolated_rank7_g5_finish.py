#!/usr/bin/env python3
"""Universal isolate-free-H theorem for the three linear 2+1 mixed patterns."""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_iso_n7_bundle_g3_adjacent_no_parent_three_attachment_split_linear_mixed_isolated_rank7_g5_finish import CONFIG, build_value
from prove_iso_n7_bundle_g1_sum0_dense_isolates_rank7_g4_piecewise import efficient_certify_bernstein


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_three_attachment_split_linear_mixed_isolated_exact_rank7_g5_finish_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_THREE_ATTACHMENT_SPLIT_LINEAR_MIXED_ISOLATED_RANK7_G5_FINISH"
CHARTS = ("low_excess", "high_excess")
FILES = {
    "derive_source": "derive_iso_n7_bundle_g3_adjacent_no_parent_three_attachment_isolated_patterns_rank7_g5_finish.py",
    "derive_report": "iso_n7_bundle_g3_adjacent_no_parent_three_attachment_isolated_patterns_exact_rank7_g5_finish_20260831.json",
    "probe_source": "probe_iso_n7_bundle_g3_adjacent_no_parent_three_attachment_split_linear_mixed_isolated_rank7_g5_finish.py",
    "finite_source": "prove_iso_n7_bundle_g3_adjacent_no_parent_three_attachment_split_p0q2_finite_h7_rank7_g5_finish.py",
    "finite_report": "iso_n7_bundle_g3_adjacent_no_parent_three_attachment_split_p0q2_finite_h7_exact_rank7_g5_finish_20260831.json",
    "bernstein_source": "prove_iso_n7_bundle_g1_sum0_dense_isolates_rank7_g4_piecewise.py",
}
EXPECTED = {
    "derive_source": "9D46FCE74417CBDCAD1A26A0294F553ED8F1E7B07FB6F79106CBD0D105C9CF08",
    "derive_report": "9BCB510FBD8C450A50B6905962E2464CF7B805887D0E3F0225A686EDF729E52F",
    "probe_source": "4EDBA885CD587A8EBC2455DF0078BE4A7ED0F6767B4B4870324FB7B020E3FE6D",
    "finite_source": "EC71B229C467EDF66A9ECF12A2370E72FCA543EA48FD00AB8CB89086D66BC9CF",
    "finite_report": "449F5D97D57BD138721F0254EFDD60E5A7B92983118DED042AC9F86FA039D105",
    "bernstein_source": "2C810925F74E9F3F893F9434D195225CA04E5150CE78770B23F65E9BB15FA2CF",
}
REPORT_HASHES = {
    ("p1_q0", "low_excess"): "F17FC45A399FEFC0D18315E4CD2C87075A38B1AAA4F08FEEFBD3FEE452E10992",
    ("p1_q0", "high_excess"): "51A87341D19D50442D80059846B3E75B0B5F750F53A081F63B3CEEA660848A7D",
    ("p1_q1", "low_excess"): "A0758BE75E322FCE36597EFE74DE72BAF8D13497F49E04409121D90385E3581E",
    ("p1_q1", "high_excess"): "B4E7EC0B4AEA0B197EDEE157C886CA0F485F3C5A1DCD0D8A0BBF7BF1F13B995A",
    ("p0_q2", "low_excess"): "0A038ECD13EEBF2728180E26A30CE2D246F74FD85D1C1378224F10126AB3CF72",
    ("p0_q2", "high_excess"): "E4F0FDD08C363AB67A3739E38761922E84B5994DD997B511984B84C75F836AE9",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def report_path(pattern: str, chart: str) -> Path:
    threshold = CONFIG[pattern]["threshold_h"]
    return HERE / f"iso_n7_bundle_g3_adjacent_no_parent_three_attachment_split_{pattern}_{chart}_h{threshold}_probe_rank7_g5_finish_20260831.json"


def certify(expression, variables, h, threshold, summary):
    tail = sp.Symbol("tail", nonnegative=True)
    numerator, denominator = map(sp.expand, sp.fraction(sp.cancel(expression.subs(h, tail+threshold))))
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
    finite = json.loads((HERE / FILES["finite_report"]).read_text(encoding="utf-8"))
    assert finite["marker"] == "PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_THREE_ATTACHMENT_SPLIT_P0Q2_FINITE_H7_RANK7_G5_FINISH"
    assert finite["coverage_gap_within_p0q2_h7"] is None
    certificates, c_certificates, denominators, algebra = {}, {}, {}, {}
    for pattern, config in CONFIG.items():
        certificates[pattern], c_certificates[pattern] = {}, {}
        for chart in CHARTS:
            assert sha256(report_path(pattern, chart)) == REPORT_HASHES[(pattern, chart)]
            probe = json.loads(report_path(pattern, chart).read_text(encoding="utf-8"))
            assert probe["marker"] == "PROBE_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_THREE_ATTACHMENT_SPLIT_LINEAR_MIXED_ISOLATED_RANK7_G5_FINISH"
            assert probe["pattern"] == pattern and probe["chart"] == chart
            assert probe["summary"]["negative_tail_scalar_coefficients"] == 0
            assert probe["negative_c_summary"]["negative_tail_scalar_coefficients"] == 0
            values = build_value(pattern, chart)
            h, variables, expression, c_value = values[:4]
            threshold = config["threshold_h"]
            certificates[pattern][chart], denominators[f"{pattern}:{chart}:main"] = certify(expression, variables, h, threshold, probe["summary"])
            c_certificates[pattern][chart], denominators[f"{pattern}:{chart}:c"] = certify(-c_value, variables[:5], h, threshold, probe["negative_c_summary"])
            algebra[pattern] = values[5:]

    tail = sp.Symbol("tail", nonnegative=True)
    sign_audit = {}
    for pattern, values in algebra.items():
        base, coefficients, b, c, lower, rank2_cap = values
        del base, c, lower
        config = CONFIG[pattern]
        threshold = config["threshold_h"]
        h = next(symbol for expression in coefficients.values() for symbol in expression.free_symbols if str(symbol) == "h")
        A = {int(str(symbol)[1:]): symbol for expression in coefficients.values() for symbol in expression.free_symbols if str(symbol).startswith("A")}
        edge_max = h-config["surviving_roots"]
        A2_min = sp.expand(h*(h-1)/2-edge_max)
        A3_min = sp.expand(h*(h-1)*(h-2)/6-edge_max*(h-2)+(2*edge_max-h))
        d4_ceiling = sp.expand(coefficients[4].subs({A[2]: A2_min, A[3]: A3_min, A[4]: 0}))
        assert all(value < 0 for value in sp.Poly(d4_ceiling.subs(h, tail+threshold), tail).coeffs())
        assert sp.expand(coefficients[3].subs({A[2]: 0, A[3]: 0, A[4]: 0})).subs(h, threshold) < 0
        assert sp.factor(b-(coefficients[3]+coefficients[4]*(h-4)/3)) == 0
        for rank in (5, 6, 7):
            floor = sp.expand(coefficients[rank].subs({A[2]: A2_min}))
            assert all(value > 0 for value in sp.Poly(floor.subs(h, tail+threshold), tail).coeffs())
        expected_cap = (h-2) if config["surviving_roots"] == 1 else (2*h-5)
        assert sp.expand(rank2_cap-expected_cap) == 0
        sign_audit[pattern] = {"d4_strictly_negative": True, "b_strictly_negative": True, "positive_ranks_5_7": True, "rank2_cap": str(rank2_cap)}

    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": "The linear mixed-isolated 2+1 exactly-three adjacent no-parent patterns p1_q0, p1_q1, and p0_q2 have G3>=0 for isolate-free H at all relevant n>=11; p0_q2 h=7 is supplied by complete finite census and h>=8 by the moment theorem.",
        "coverage": {"patterns": {"p1_q0": "h>=8 (n>=11)", "p1_q1": "h>=7 (n>=11)", "p0_q2": "h=7 finite plus h>=8"}, "condition": "H isolate-free; surviving roots nonisolated in distinct components"},
        "certificates": certificates,
        "negative_c_certificates": c_certificates,
        "positive_denominators": denominators,
        "finite_p0q2_h7": finite["counts"],
        "sign_audit": sign_audit,
        "coverage_gap_within_stated_linear_mixed_isolated_isolatefree_H_patterns": None,
        "universal_split_three_attachment_guard": False,
        "dependencies_sha256": EXPECTED | {f"report:{pattern}:{chart}": REPORT_HASHES[(pattern, chart)] for pattern in CONFIG for chart in CHARTS},
        "scope": "Split 2+1 exactly-three attachment linear mixed-isolated patterns with isolate-free H; p0_q1 and arbitrary further isolate padding separate.",
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True)+"\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({"marker": MARKER, "patterns": list(CONFIG), "charts": list(CHARTS), "coverage_gap_within_stated_patterns": None}, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
