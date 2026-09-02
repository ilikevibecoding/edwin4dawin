#!/usr/bin/env python3
"""Fail-closed endpoint_v common0/sum1 G3 theorem on isolate-free W."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_iso_n7_bundle_g3_sum0_dense_extension_threshold_rank7_g5_finish import choose_poly
from probe_iso_n7_bundle_g3_sum1_endpoint_intersected_tau_moment_rank7_g5_finish import build_value
from prove_iso_n7_bundle_g1_sum0_dense_isolates_rank7_g4_piecewise import efficient_certify_bernstein


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g3_sum1_endpoint_v_isolatefree_n11_exact_rank7_g5_finish_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G3_SUM1_ENDPOINT_V_ISOLATEFREE_N11_RANK7_G5_FINISH"
THRESHOLD_N = 11
THRESHOLD_M = 9
FILES = {
    "parent_source": "derive_iso_n7_bundle_g3_parent_modes_rank7_g4_piecewise.py",
    "parent_report": "iso_n7_bundle_g3_parent_modes_exact_rank7_g4_piecewise_20260831.json",
    "identity_source": "probe_iso_n7_bundle_g3_sum1_endpoint_identities_rank7_g5_finish.py",
    "identity_report": "iso_n7_bundle_g3_sum1_endpoint_identities_probe_rank7_g5_finish_20260831.json",
    "probe_source": "probe_iso_n7_bundle_g3_sum1_endpoint_intersected_tau_moment_rank7_g5_finish.py",
    "low_report": "iso_n7_bundle_g3_sum1_endpoint_v_intersected_tau_low_excess_n11_probe_rank7_g5_finish_20260831.json",
    "high_report": "iso_n7_bundle_g3_sum1_endpoint_v_intersected_tau_high_excess_n11_probe_rank7_g5_finish_20260831.json",
    "bernstein_source": "prove_iso_n7_bundle_g1_sum0_dense_isolates_rank7_g4_piecewise.py",
    "moment_source": "prove_iso_n7_bundle_g4_sum0_piecewise_bernstein_rank7_g4_piecewise.py",
    "moment_report": "iso_n7_bundle_g4_sum0_piecewise_bernstein_exact_rank7_g4_piecewise_20260831.json",
}
EXPECTED = {
    "parent_source": "60147C54B07805ACBD8D688D2A86F907134C192E945ACFDA82049B3AC1167EA0",
    "parent_report": "6977AF4DC4A353F5520BF6ED4450F0594DDDB7F8541128D28D52B8E77A4EB132",
    "identity_source": "E6300CAA765F333C528FBE8F59BF4C215D1A090C66BE49BC9BCF456B8C94ED34",
    "identity_report": "1C5F2259404A99790240FE9E5AC29AB353A3AA3639072A578ED9FCB95567668C",
    "probe_source": "41663E486D6BF3F396C0D6014361DE9D6F78E0D02D779B7DC1FE7CA98B6B1732",
    "low_report": "AF412202F73E22DF74B0C303C04D6F2F5A65B5C4D7946F29FC0D577CD2790087",
    "high_report": "FB90B31B688C74D5F41167BA32AE8E7BD42BC9AD76ED7A3D55E44AA98B8C97CD",
    "bernstein_source": "2C810925F74E9F3F893F9434D195225CA04E5150CE78770B23F65E9BB15FA2CF",
    "moment_source": "24E9538B8DA863D884BA2522E6D10316181F21206BE53A5C472D80C9DCE62FB5",
    "moment_report": "E602040E714BF069F56DFB6C2BE94728595B087C530FF77371777662550E99C1",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def certify(expression, variables, tail, summary):
    numerator, denominator = map(sp.expand, sp.fraction(sp.cancel(expression)))
    if sp.LC(sp.Poly(denominator, tail, variables[0])) < 0:
        numerator, denominator = -numerator, -denominator
    assert all(coefficient > 0 for coefficient in sp.Poly(denominator, tail, variables[0]).coeffs())
    certificate = efficient_certify_bernstein(numerator, variables, tail)
    assert certificate["degree_profile"] == summary["degree_profile"]
    assert certificate["bernstein_coefficients"] == summary["bernstein_controls"]
    assert certificate["tail_power_coefficients"] == summary["tail_scalar_coefficients"]
    assert certificate["minimum_tail_power_coefficient"] == summary["minimum_tail_scalar_coefficient"]
    assert certificate["ordered_stream_sha256"] == summary["ordered_stream_sha256"]
    assert certificate["exact_power_inversion"] is True
    return certificate, sp.factor(denominator)


def main() -> None:
    for key, digest in EXPECTED.items():
        assert sha256(HERE / FILES[key]) == digest, key
    reports = {
        chart: json.loads((HERE / FILES[f"{chart}_report"]).read_text(encoding="utf-8"))
        for chart in ("low", "high")
    }
    moment = json.loads((HERE / FILES["moment_report"]).read_text(encoding="utf-8"))
    assert moment["marker"] == "PASS_EXACT_ISO_N7_BUNDLE_G4_SUM0_PIECEWISE_BERNSTEIN_RANK7_G4_PIECEWISE"

    tail = sp.Symbol("tail", nonnegative=True)
    certificates = {}
    c_certificates = {}
    denominators = {}
    c_denominators = {}
    algebra = None
    for short, chart in (("low", "low_excess"), ("high", "high_excess")):
        probe = reports[short]
        assert probe["marker"] == "PROBE_EXACT_ISO_N7_BUNDLE_G3_SUM1_ENDPOINT_INTERSECTED_TAU_MOMENT_RANK7_G5_FINISH"
        assert probe["mode"] == "endpoint_v" and probe["chart"] == chart
        assert probe["threshold_n"] == THRESHOLD_N
        assert probe["summary"]["negative_tail_scalar_coefficients"] == 0
        assert probe["negative_c_certificate_summary"]["negative_tail_scalar_coefficients"] == 0
        m, variables, value, c_value, exact, base, coefficients, b, c, lower = build_value("endpoint_v", chart)
        certificates[chart], denominators[chart] = certify(
            sp.cancel(value.subs(m, tail+THRESHOLD_M)), variables, tail, probe["summary"]
        )
        c_certificates[chart], c_denominators[chart] = certify(
            sp.cancel(-c_value.subs(m, tail+THRESHOLD_M)),
            variables[:5], tail, probe["negative_c_certificate_summary"],
        )
        algebra = m, exact, base, coefficients, b, c, lower

    m, exact, base, coefficients, b, c, lower = algebra
    W = {rank: sp.Symbol(f"W{rank}", nonnegative=True) for rank in range(2, 9)}
    lower_w2 = choose_poly(m, 2)-(m-1)
    for expression in (coefficients[4], b):
        ceiling = sp.expand(expression.subs({W[2]: lower_w2, W[3]: 0, W[4]: 0}))
        assert all(value < 0 for value in sp.Poly(ceiling.subs(m, tail+THRESHOLD_M), tail).all_coeffs())
    assert all(
        coefficient >= 0
        for rank in (5, 6, 7)
        for coefficient in sp.Poly(coefficients[rank], *sorted(coefficients[rank].free_symbols, key=str)).coeffs()
    )

    # Audit that the two moment charts meet and cover the full feasible wedge interval.
    e, omega = sp.symbols("e omega", positive=True)
    L = 2*e-m
    H = e**2/2
    B = (22*e**2-11*e*m-12*e+6*m)/(8*e)
    old = e*omega/2
    new = L+sp.Rational(11, 6)*e*(omega-L)
    assert sp.expand((new-old).subs(omega, B)) == 0
    edge_parameter = sp.Symbol("edge_parameter", nonnegative=True)
    edge = m/2+(m/2-1)*edge_parameter
    for gap in (sp.cancel((B-L).subs(e, edge)), sp.cancel((H-B).subs(e, edge))):
        numerator, denominator = map(sp.expand, sp.fraction(gap.subs(m, tail+THRESHOLD_M)))
        assert all(value >= 0 for value in sp.Poly(numerator, tail, edge_parameter).coeffs())
        assert all(value > 0 for value in sp.Poly(denominator, tail, edge_parameter).coeffs())

    x, y = sp.symbols("x y", nonnegative=True, integer=True)
    a, d = x+1, y+1
    inequality = sp.expand(4*(1+sp.Rational(3, 2)*(choose_poly(a, 2)+choose_poly(d, 2))-a*d))
    assert sp.expand(inequality-(2*(x-y)**2+x*(x-1)+y*(y-1))) == 0

    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": (
            "In algebraic endpoint_v mode, let W be isolate-free and let the B-mark "
            "have its unique W-neighbour x while the A-mark has none. If n=|W|+2>=11, "
            "then the rank-seven common0/sum1 coefficient G3 is nonnegative."
        ),
        "coverage": {
            "coefficient": "G3", "geometry": "nonadjacent_common0_sum1",
            "mode": "endpoint_v", "orders": "n>=11", "unmarked_orders": "m>=9",
            "condition": "W isolate-free and B is the active mark",
        },
        "exact_expression": str(exact),
        "R_zero_base_expression": str(base),
        "R_coefficients": {str(rank): str(value) for rank, value in coefficients.items()},
        "nested_shadow": {
            "b": str(b), "c": str(c), "safe_lower": str(lower),
            "argument": (
                "With r=|W-N[x]| and R_j=T_(j-1), drop positive R5,R6,R7. "
                "The negative R4 coefficient and 3T3<=(r-2)T2 give a concave "
                "quadratic loss on 0<=r<=m-2. The exact endpoint charts certify "
                "c<=0 and base+(m-2)c>=0."
            ),
        },
        "moment_charts": {
            "boundary": str(B), "chart_ordering_exact": True,
            "certificates": certificates, "negative_c_certificates": c_certificates,
            "positive_denominators": {key: str(value) for key, value in denominators.items()},
            "positive_c_denominators": {key: str(value) for key, value in c_denominators.items()},
        },
        "coverage_gap_within_stated_endpoint_v_isolatefree_sum1_G3": None,
        "universal_endpoint_sum1_guard": False,
        "dependencies_sha256": EXPECTED,
        "scope": (
            "Only endpoint_v common0/sum1 rank-seven G3 with B active, isolate-free W, "
            "and n>=11. endpoint_u, finite n<=10, isolate padding, x isolated, ordinary "
            "parent, and other geometries are separate."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "charts": list(certificates),
        "total_bernstein_controls": sum(value["bernstein_coefficients"] for value in certificates.values()),
        "minimum_tail_power_coefficient": str(min(sp.Rational(value["minimum_tail_power_coefficient"]) for value in certificates.values())),
        "coverage_gap_within_stated_endpoint_v_isolatefree_sum1_G3": None,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
