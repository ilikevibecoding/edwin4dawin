#!/usr/bin/env python3
"""Fail-closed inactive-endpoint common0/sum1 G3 theorem on isolate-free W."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_iso_n7_bundle_g3_sum1_endpoint_u_intersected_tau_moment_rank7_g5_finish import (
    build_value,
    moment_rows,
)
from prove_iso_n7_bundle_g1_sum0_dense_isolates_rank7_g4_piecewise import efficient_certify_bernstein


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g3_sum1_endpoint_u_isolatefree_n11_exact_rank7_g5_finish_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G3_SUM1_ENDPOINT_U_ISOLATEFREE_N11_RANK7_G5_FINISH"
FILES = {
    "probe_source": "probe_iso_n7_bundle_g3_sum1_endpoint_u_intersected_tau_moment_rank7_g5_finish.py",
    "low_report": "iso_n7_bundle_g3_sum1_endpoint_u_intersected_tau_low_excess_n11_probe_rank7_g5_finish_20260831.json",
    "high_report": "iso_n7_bundle_g3_sum1_endpoint_u_intersected_tau_high_excess_n11_probe_rank7_g5_finish_20260831.json",
    "shared_source": "probe_iso_n7_bundle_g3_sum1_endpoint_intersected_tau_moment_rank7_g5_finish.py",
    "bernstein_source": "prove_iso_n7_bundle_g1_sum0_dense_isolates_rank7_g4_piecewise.py",
    "moment_source": "prove_iso_n7_bundle_g4_sum0_piecewise_bernstein_rank7_g4_piecewise.py",
    "moment_report": "iso_n7_bundle_g4_sum0_piecewise_bernstein_exact_rank7_g4_piecewise_20260831.json",
}
EXPECTED = {
    "probe_source": "8BB1473A8B13164B94241BE218AD327B7A7945AF1F9CCF6CC5BD0BC0CF864602",
    "low_report": "1BB77815D8D3A43E020E2E39CB6924C8AAD959737BDFED7C00C12C24E9D038FA",
    "high_report": "3C544202335362FE5EC0C9D9B610B58173AA9B9ED5B7F34BF31FA6B56BE16CE4",
    "shared_source": "41663E486D6BF3F396C0D6014361DE9D6F78E0D02D779B7DC1FE7CA98B6B1732",
    "bernstein_source": "2C810925F74E9F3F893F9434D195225CA04E5150CE78770B23F65E9BB15FA2CF",
    "moment_source": "24E9538B8DA863D884BA2522E6D10316181F21206BE53A5C472D80C9DCE62FB5",
    "moment_report": "E602040E714BF069F56DFB6C2BE94728595B087C530FF77371777662550E99C1",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def certify(expression, variables, m, summary):
    tail = sp.Symbol("tail", nonnegative=True)
    numerator, denominator = map(sp.expand, sp.fraction(sp.cancel(expression.subs(m, tail+9))))
    if sp.LC(sp.Poly(denominator, tail, variables[0])) < 0:
        numerator, denominator = -numerator, -denominator
    assert all(value > 0 for value in sp.Poly(denominator, tail, variables[0]).coeffs())
    result = efficient_certify_bernstein(numerator, variables, tail)
    assert result["degree_profile"] == summary["degree_profile"]
    assert result["bernstein_coefficients"] == summary["bernstein_controls"]
    assert result["tail_power_coefficients"] == summary["tail_scalar_coefficients"]
    assert result["minimum_tail_power_coefficient"] == summary["minimum_tail_scalar_coefficient"]
    assert result["ordered_stream_sha256"] == summary["ordered_stream_sha256"]
    assert result["exact_power_inversion"] is True
    return result, str(sp.factor(denominator))


def main() -> None:
    for key, digest in EXPECTED.items():
        assert sha256(HERE / FILES[key]) == digest, key
    certificates = {}
    sign_certificates = {}
    denominators = {}
    algebra = None
    for short, chart in (("low", "low_excess"), ("high", "high_excess")):
        report = json.loads((HERE / FILES[f"{short}_report"]).read_text(encoding="utf-8"))
        assert report["marker"] == "PROBE_EXACT_ISO_N7_BUNDLE_G3_SUM1_ENDPOINT_U_INTERSECTED_TAU_MOMENT_RANK7_G5_FINISH"
        assert report["chart"] == chart and report["threshold_n"] == 11
        for key in ("summary", "negative_c_certificate_summary", "negative_d4_certificate_summary", "negative_b_certificate_summary"):
            assert report[key]["negative_tail_scalar_coefficients"] == 0
        m, variables, value, c_value, exact, base, coefficients, b, c, lower = build_value("endpoint_u", chart)
        main_certificate, denominators[f"{chart}_main"] = certify(value, variables, m, report["summary"])
        c_certificate, denominators[f"{chart}_minus_c"] = certify(-c_value, variables[:5], m, report["negative_c_certificate_summary"])
        sign_m, sign_variables, rows, d4, sign_b = moment_rows(chart)
        assert sign_m == m and sp.expand(sign_b-b) == 0 and sp.expand(d4-coefficients[4]) == 0
        substitutions = {sp.Symbol(f"W{k}", nonnegative=True): rows[k] for k in range(2, 5)}
        d4_certificate, denominators[f"{chart}_minus_d4"] = certify(-d4.subs(substitutions), sign_variables, m, report["negative_d4_certificate_summary"])
        b_certificate, denominators[f"{chart}_minus_b"] = certify(-b.subs(substitutions), sign_variables, m, report["negative_b_certificate_summary"])
        certificates[chart] = main_certificate
        sign_certificates[chart] = {"minus_c": c_certificate, "minus_d4": d4_certificate, "minus_b": b_certificate}
        algebra = exact, base, coefficients, b, c, lower

    exact, base, coefficients, b, c, lower = algebra
    assert all(
        coefficient >= 0
        for rank in (5, 6, 7)
        for coefficient in sp.Poly(coefficients[rank], *sorted(coefficients[rank].free_symbols, key=str)).coeffs()
    )
    report = {
        "marker": MARKER, "status": "proved exact",
        "theorem": (
            "In endpoint_u mode with B the active mark (so the endpoint is inactive), "
            "if W is isolate-free and n=|W|+2>=11, then common0/sum1 G3>=0."
        ),
        "coverage": {
            "coefficient": "G3", "geometry": "nonadjacent_common0_sum1",
            "mode": "endpoint_u", "relative_endpoint": "inactive", "orders": "n>=11",
            "unmarked_orders": "m>=9", "condition": "W isolate-free and B active",
        },
        "exact_expression": str(exact), "R_zero_base_expression": str(base),
        "R_coefficients": {str(rank): str(value) for rank, value in coefficients.items()},
        "nested_shadow": {
            "b": str(b), "c": str(c), "safe_lower": str(lower),
            "argument": (
                "The two exhaustive wedge charts independently certify d4<0 and b<0, "
                "closing the sign gap left by the crude W2-only ceiling. Then the same "
                "root-shadow concavity gives endpoints 0 and (m-2)c, with c<=0 and "
                "base+(m-2)c>=0 certified in both charts."
            ),
        },
        "certificates": certificates,
        "sign_certificates": sign_certificates,
        "positive_denominators": denominators,
        "sign_split_exhaustion": "low_excess union high_excess is the full feasible Omega interval; both have d4<0 and b<0, so no residual sign cell remains.",
        "coverage_gap_within_stated_endpoint_u_isolatefree_sum1_G3": None,
        "universal_endpoint_sum1_guard": False,
        "dependencies_sha256": EXPECTED,
        "scope": "Only inactive-endpoint common0/sum1 G3 with isolate-free W and n>=11; finite bases, padding, x-isolated, and ordinary modes remain separate.",
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER, "charts": list(certificates),
        "main_bernstein_controls": sum(value["bernstein_coefficients"] for value in certificates.values()),
        "sign_gap": None, "coverage_gap_within_stated_endpoint_u_isolatefree_sum1_G3": None,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
