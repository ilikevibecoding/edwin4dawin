#!/usr/bin/env python3
"""Universal isolate-free-H theorem for linear mixed four-attachment splits."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_iso_n7_bundle_g3_adjacent_no_parent_four_attachment_split_linear_mixed_isolated_rank7_g5_finish import CONFIG, build_value
from prove_iso_n7_bundle_g1_sum0_dense_isolates_rank7_g4_piecewise import efficient_certify_bernstein


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_four_attachment_split_linear_mixed_isolated_exact_rank7_g5_finish_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_FOUR_ATTACHMENT_SPLIT_LINEAR_MIXED_ISOLATED_RANK7_G5_FINISH"
PROBE_MARKER = "PROBE_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_FOUR_ATTACHMENT_SPLIT_LINEAR_MIXED_ISOLATED_RANK7_G5_FINISH"
CHARTS = ("low_excess", "high_excess")
FILES = {
    "derive_source": "derive_iso_n7_bundle_g3_adjacent_no_parent_four_attachment_split_isolated_patterns_rank7_g5_finish.py",
    "derive_report": "iso_n7_bundle_g3_adjacent_no_parent_four_attachment_split_isolated_patterns_exact_rank7_g5_finish_20260831.json",
    "probe_source": "probe_iso_n7_bundle_g3_adjacent_no_parent_four_attachment_split_linear_mixed_isolated_rank7_g5_finish.py",
    "bernstein_source": "prove_iso_n7_bundle_g1_sum0_dense_isolates_rank7_g4_piecewise.py",
}
EXPECTED = {
    "derive_source": "06E88B0A55A9FF91B8FD5CD2940B37FF6948E193B1968FA931DEEA3BE09D5186",
    "derive_report": "51FFA1836D05390B7A2065D1D1EADE5E23DF97800461E084080B0135FB865318",
    "probe_source": "CA4293B2C84FD2D5C976E98CD7CD92CBCB8061B32CEC88AD28319B4D3C2FBA0C",
    "bernstein_source": "2C810925F74E9F3F893F9434D195225CA04E5150CE78770B23F65E9BB15FA2CF",
}
REPORT_HASHES = {
    ("31_p1_q0", "low_excess"): "254B2C4B415E1DCA8B048B83CE4ACA38BBD961350579612F7BBB50671BCF9A7F",
    ("31_p1_q0", "high_excess"): "BA100337CCAC62806F5B94D32501894B5E740409394828DD798E00716EE58932",
    ("31_p1_q1", "low_excess"): "E270EFD0779A0AC68D371D173A3DFFCA8281E6165B14D0D849CB401EE8A330F5",
    ("31_p1_q1", "high_excess"): "7C72E3F4004D02B65A8C1E7B50C3E480DD24EAEBF0D79A77ACD514C1342902D5",
    ("31_p1_q2", "low_excess"): "666680915022BF1D29A4AEF3733FAC587D613719E9C2D1B901CCB915A85D47F3",
    ("31_p1_q2", "high_excess"): "525DD8DEF71540D9CD5E582A4BD64D08A0444E6A6F823909C62E290DDF081A7D",
    ("31_p0_q3", "low_excess"): "82E2A8BE3BC6D1AB85313460F5EEECD89A991BCDEF97A3112D642BB06660E6E6",
    ("31_p0_q3", "high_excess"): "582CD99568905CC567D1950796A61C7007E6B9EE0E066974614075F364450562",
    ("22_p0_q2", "low_excess"): "08A996E61BD6ECD85561B597006740516865BE110696660355FE3C6B6D84A417",
    ("22_p0_q2", "high_excess"): "4D8203E08091D61DA2934555574B1F9F894D959B47A0B6AF24ADC6BFB59804C6",
    ("22_p1_q2", "low_excess"): "E89743E793C50B2B8CE1E45B26F86FCF6068E0ED1E77828C7A47EC921ACDA42D",
    ("22_p1_q2", "high_excess"): "7C5032DE35E5BFB127AB1D2600CEB3CB510A4D81854CEB29B61DBE0E60CA6576",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def report_path(config_key: str, chart: str) -> Path:
    threshold = CONFIG[config_key]["threshold_h"]
    return HERE / f"iso_n7_bundle_g3_adjacent_no_parent_four_attachment_split_linear_{config_key}_{chart}_h{threshold}_probe_rank7_g5_finish_20260831.json"


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
    certificates, c_certificates, denominators, algebra = {}, {}, {}, {}
    for config_key, config in CONFIG.items():
        certificates[config_key], c_certificates[config_key] = {}, {}
        for chart in CHARTS:
            assert sha256(report_path(config_key, chart)) == REPORT_HASHES[(config_key, chart)]
            probe = json.loads(report_path(config_key, chart).read_text(encoding="utf-8"))
            assert probe["marker"] == PROBE_MARKER and probe["config"] == config_key and probe["chart"] == chart
            assert probe["summary"]["negative_tail_scalar_coefficients"] == 0
            assert probe["negative_c_summary"]["negative_tail_scalar_coefficients"] == 0
            values = build_value(config_key, chart)
            h, variables = values["h"], values["variables"]
            threshold = config["threshold_h"]
            certificates[config_key][chart], denominators[f"{config_key}:{chart}:main"] = certify(values["value"], variables, h, threshold, probe["summary"])
            c_certificates[config_key][chart], denominators[f"{config_key}:{chart}:c"] = certify(-values["c_value"], variables[:5], h, threshold, probe["negative_c_summary"])
            algebra[config_key] = values

    tail = sp.Symbol("tail", nonnegative=True)
    sign_audit = {}
    for config_key, values in algebra.items():
        config = CONFIG[config_key]
        threshold, roots = config["threshold_h"], config["surviving_roots"]
        h, coefficients = values["h"], values["effective_coefficients"]
        A = {int(str(symbol)[1:]): symbol for expression in coefficients.values() for symbol in expression.free_symbols if str(symbol).startswith("A")}
        edge_max = h-roots
        A2_min = sp.expand(h*(h-1)/2-edge_max)
        A3_min = sp.expand(h*(h-1)*(h-2)/6-edge_max*(h-2)+(2*edge_max-h))
        assert all(value <= 0 for value in sp.Poly(coefficients[4], h, *(A[k] for k in sorted(A))).coeffs())
        d3_zero = sp.expand(coefficients[3].subs({A[2]: 0, A[3]: 0, A[4]: 0}))
        assert all(value < 0 for value in sp.Poly(d3_zero.subs(h, tail+threshold), tail).coeffs())
        assert sp.factor(values["nested_b"]-(coefficients[3]+coefficients[4]*(h-4)/3)) == 0
        for rank in (5, 6, 7):
            floor = sp.expand(coefficients[rank].subs({A[2]: A2_min}))
            assert all(value > 0 for value in sp.Poly(floor.subs(h, tail+threshold), tail).coeffs())
        expected_cap = sp.expand(roots*h-sp.binomial(roots+1, 2)-roots)
        assert sp.expand(values["rank2_cap"]-expected_cap) == 0
        sign_audit[config_key] = {"rank4_replaced_by_safe_negative_monomial_lower": str(values["rank4_negative_monomial_lower"]), "nested_b_strictly_negative": True, "nested_c_nonpositive_certificate": True, "positive_ranks_5_7": True, "rank2_cap": str(expected_cap)}

    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": "All six linear mixed-isolated split exactly-four adjacent no-parent patterns listed here have G3>=0 for isolate-free H at every relevant total order n>=11.",
        "coverage": {
            "3+1": {"p1_q0": "h>=8", "p1_q1": "h>=7", "p1_q2": "h>=6", "p0_q3": "h>=6"},
            "2+2": {"p0_q2 and symmetric p2_q0": "h>=7", "p1_q2 and symmetric p2_q1": "h>=6"},
            "condition": "H isolate-free; every surviving attachment root is nonisolated in its own component",
        },
        "certificates": certificates,
        "negative_c_certificates": c_certificates,
        "positive_denominators": denominators,
        "sign_audit": sign_audit,
        "coverage_gap_within_stated_linear_mixed_isolated_isolatefree_H_patterns": None,
        "universal_split_four_attachment_guard": False,
        "dependencies_sha256": EXPECTED | {f"report:{config_key}:{chart}": REPORT_HASHES[(config_key, chart)] for config_key in CONFIG for chart in CHARTS},
        "scope": "Linear mixed-isolated split exactly-four attachment patterns with isolate-free H; bilinear patterns, all-isolated patterns, isolate padding, and >=5 attachments separate.",
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True)+"\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({"marker": MARKER, "configs": list(CONFIG), "charts": list(CHARTS), "coverage_gap_within_stated_patterns": None}, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
