#!/usr/bin/env python3
"""Universal isolate-free-H theorem for bilinear mixed four-attachment splits."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_iso_n7_bundle_g3_adjacent_no_parent_four_attachment_split_bilinear_mixed_isolated_rank7_g5_finish import CONFIG, build_value, rank2_cap
from prove_iso_n7_bundle_g1_sum0_dense_isolates_rank7_g4_piecewise import efficient_certify_bernstein


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_four_attachment_split_bilinear_mixed_isolated_exact_rank7_g5_finish_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_FOUR_ATTACHMENT_SPLIT_BILINEAR_MIXED_ISOLATED_RANK7_G5_FINISH"
PROBE_MARKER = "PROBE_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_FOUR_ATTACHMENT_SPLIT_BILINEAR_MIXED_ISOLATED_RANK7_G5_FINISH"
CHARTS = ("low_excess", "high_excess")
FILES = {
    "derive_source": "derive_iso_n7_bundle_g3_adjacent_no_parent_four_attachment_split_isolated_patterns_rank7_g5_finish.py",
    "derive_report": "iso_n7_bundle_g3_adjacent_no_parent_four_attachment_split_isolated_patterns_exact_rank7_g5_finish_20260831.json",
    "probe_source": "probe_iso_n7_bundle_g3_adjacent_no_parent_four_attachment_split_bilinear_mixed_isolated_rank7_g5_finish.py",
    "bernstein_source": "prove_iso_n7_bundle_g1_sum0_dense_isolates_rank7_g4_piecewise.py",
}
EXPECTED = {
    "derive_source": "06E88B0A55A9FF91B8FD5CD2940B37FF6948E193B1968FA931DEEA3BE09D5186",
    "derive_report": "51FFA1836D05390B7A2065D1D1EADE5E23DF97800461E084080B0135FB865318",
    "probe_source": "84DC890863FC59EDA4ED4FC1876F89D3E208412374919C5467A4C78D75BA8A2C",
    "bernstein_source": "2C810925F74E9F3F893F9434D195225CA04E5150CE78770B23F65E9BB15FA2CF",
}
REPORT_HASHES = {
    ("31_p0_q1", "low_excess"): "55ADAE2AEA156DB32B8FCF6399D734732A2ECCD2DE2E18A2DA093F0EC03341FC",
    ("31_p0_q1", "high_excess"): "CB0029FA651C94D20E6E43AAD7E976CF4D6AF79A321BA5859B23F4F776B58AFB",
    ("31_p0_q2", "low_excess"): "8BB196BF07EAD876D97A4BB02C7882D275BAC32D9AC393EA35F68CD7548F059B",
    ("31_p0_q2", "high_excess"): "66700702E1B1794056018CD898FD967984DC05F56719641F31312A4764CED305",
    ("22_p0_q1", "low_excess"): "B810B1D1129065BB39E46094251B5EA4F68794482DF1FEEC9913480C6F97404F",
    ("22_p0_q1", "high_excess"): "6F6B3C915D5875240D5BAEBB7BAD1BAFE85B5F9AB778BA3DDA8D96A1579154D2",
    ("22_p1_q1", "low_excess"): "CB3A9AC999C20428DBCB0EDA1740431362F3649FE8B943445F1A34DDD9F3DFFE",
    ("22_p1_q1", "high_excess"): "3AD866823C7EE6238A01281D4CF20B4AE635178D1D9BD5B2E86D3758991D3A5C",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def report_path(config_key: str, chart: str) -> Path:
    threshold = CONFIG[config_key]["threshold_h"]
    return HERE / f"iso_n7_bundle_g3_adjacent_no_parent_four_attachment_split_bilinear_{config_key}_{chart}_h{threshold}_probe_rank7_g5_finish_20260831.json"


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
    certificates, cr_certificates, cu_certificates, denominators, algebra = {}, {}, {}, {}, {}
    for config_key, config in CONFIG.items():
        certificates[config_key], cr_certificates[config_key], cu_certificates[config_key] = {}, {}, {}
        for chart in CHARTS:
            assert sha256(report_path(config_key, chart)) == REPORT_HASHES[(config_key, chart)]
            probe = json.loads(report_path(config_key, chart).read_text(encoding="utf-8"))
            assert probe["marker"] == PROBE_MARKER and probe["config"] == config_key and probe["chart"] == chart
            assert probe["summary"]["negative_tail_scalar_coefficients"] == 0
            assert probe["negative_cR_summary"]["negative_tail_scalar_coefficients"] == 0
            assert probe["negative_cU_summary"]["negative_tail_scalar_coefficients"] == 0
            values = build_value(config_key, chart)
            h, variables, threshold = values["h"], values["variables"], config["threshold_h"]
            certificates[config_key][chart], denominators[f"{config_key}:{chart}:main"] = certify(values["value"], variables, h, threshold, probe["summary"])
            cr_certificates[config_key][chart], denominators[f"{config_key}:{chart}:cr"] = certify(-values["cr_value"], variables[:5], h, threshold, probe["negative_cR_summary"])
            cu_certificates[config_key][chart], denominators[f"{config_key}:{chart}:cu"] = certify(-values["cu_value"], variables[:5], h, threshold, probe["negative_cU_summary"])
            algebra[config_key] = values

    tail = sp.Symbol("tail", nonnegative=True)
    sign_audit = {}
    for config_key, values in algebra.items():
        config = CONFIG[config_key]
        h, threshold = values["h"], config["threshold_h"]
        A = {int(str(symbol)[1:]): symbol for coefficients in (values["shadow_rd"], values["shadow_ud"]) for expression in coefficients.values() for symbol in expression.free_symbols if str(symbol).startswith("A")}
        total_roots = config["R_roots"]+config["U_roots"]
        edge_max = h-total_roots
        A2_min = sp.expand(h*(h-1)/2-edge_max)
        A3_min = sp.expand(h*(h-1)*(h-2)/6-edge_max*(h-2)+(2*edge_max-h))
        family_audit = {}
        for label, coefficients, nested_b, nested_c, roots in (
            ("R", values["shadow_rd"], values["br"], values["cr"], config["R_roots"]),
            ("U", values["shadow_ud"], values["bu"], values["cu"], config["U_roots"]),
        ):
            assert all(value <= 0 for value in sp.Poly(coefficients[4], h, *(A[k] for k in sorted(A))).coeffs())
            d3_zero = sp.expand(coefficients[3].subs({A[2]: 0, A[3]: 0, A[4]: 0}))
            assert all(value < 0 for value in sp.Poly(d3_zero.subs(h, tail+threshold), tail).coeffs())
            assert sp.factor(nested_b-(coefficients[3]+coefficients[4]*(h-4)/3)) == 0
            for rank in (5, 6, 7):
                floor = sp.expand(coefficients[rank].subs({A[2]: A2_min}))
                assert all(value > 0 for value in sp.Poly(floor.subs(h, tail+threshold), tail).coeffs())
            expected_cap = rank2_cap(h, roots)
            actual_cap = values["R2cap"] if label == "R" else values["U2cap"]
            assert sp.expand(actual_cap-expected_cap) == 0
            family_audit[label] = {"rank4_replaced_by_safe_negative_monomial_lower": str(values["rank4_negative_monomial_lowers"][label]), "nested_b_strictly_negative": True, "nested_c_nonpositive_certificate": True, "positive_ranks_5_7_after_absorption": True, "rank2_cap": str(expected_cap)}
        sign_audit[config_key] = {"families": family_audit, "negative_bilinear_absorption": values["negative_absorption"], "remaining_bilinear_terms_nonnegative_and_dropped": True}

    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": "All four bilinear mixed-isolated split exactly-four adjacent no-parent symmetry classes listed here have G3>=0 for isolate-free H at every relevant total order n>=11.",
        "coverage": {
            "3+1": {"p0_q1": "h>=8", "p0_q2": "h>=7"},
            "2+2": {"p0_q1 and symmetric p1_q0": "h>=8", "p1_q1": "h>=7"},
            "condition": "H isolate-free; every surviving attachment root is nonisolated in its own component",
        },
        "certificates": certificates,
        "negative_cR_certificates": cr_certificates,
        "negative_cU_certificates": cu_certificates,
        "positive_denominators": denominators,
        "sign_and_bilinear_audit": sign_audit,
        "coverage_gap_within_stated_bilinear_mixed_isolated_isolatefree_H_patterns": None,
        "universal_split_four_attachment_guard": False,
        "dependencies_sha256": EXPECTED | {f"report:{config_key}:{chart}": REPORT_HASHES[(config_key, chart)] for config_key in CONFIG for chart in CHARTS},
        "scope": "Bilinear mixed-isolated split exactly-four attachment patterns with isolate-free H; linear/all-isolated patterns, isolate padding, and >=5 attachments separate.",
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
