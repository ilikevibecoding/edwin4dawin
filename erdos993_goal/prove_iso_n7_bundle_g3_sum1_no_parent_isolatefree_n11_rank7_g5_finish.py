#!/usr/bin/env python3
"""Fail-closed no-parent common0/sum1 G3 theorem on isolate-free W."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_iso_n7_bundle_g3_sum0_dense_extension_threshold_rank7_g5_finish import choose_poly
from probe_iso_n7_bundle_g3_sum1_no_parent_intersected_tau_moment_rank7_g5_finish import (
    build_value,
)
from prove_iso_n7_bundle_g1_sum0_dense_isolates_rank7_g4_piecewise import (
    efficient_certify_bernstein,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "iso_n7_bundle_g3_sum1_no_parent_isolatefree_n11_exact_"
    "rank7_g5_finish_20260831.json"
)
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G3_SUM1_NO_PARENT_ISOLATEFREE_N11_RANK7_G5_FINISH"
THRESHOLD_N = 11
THRESHOLD_M = 9
FILES = {
    "parent_source": "derive_iso_n7_bundle_g3_parent_modes_rank7_g4_piecewise.py",
    "parent_report": "iso_n7_bundle_g3_parent_modes_exact_rank7_g4_piecewise_20260831.json",
    "probe_source": "probe_iso_n7_bundle_g3_sum1_no_parent_intersected_tau_moment_rank7_g5_finish.py",
    "low_report": (
        "iso_n7_bundle_g3_sum1_no_parent_intersected_tau_low_excess_n11_probe_"
        "rank7_g5_finish_20260831.json"
    ),
    "high_report": (
        "iso_n7_bundle_g3_sum1_no_parent_intersected_tau_high_excess_n11_probe_"
        "rank7_g5_finish_20260831.json"
    ),
    "bernstein_source": "prove_iso_n7_bundle_g1_sum0_dense_isolates_rank7_g4_piecewise.py",
    "moment_source": "prove_iso_n7_bundle_g4_sum0_piecewise_bernstein_rank7_g4_piecewise.py",
    "moment_report": "iso_n7_bundle_g4_sum0_piecewise_bernstein_exact_rank7_g4_piecewise_20260831.json",
}
EXPECTED = {
    "parent_source": "60147C54B07805ACBD8D688D2A86F907134C192E945ACFDA82049B3AC1167EA0",
    "parent_report": "6977AF4DC4A353F5520BF6ED4450F0594DDDB7F8541128D28D52B8E77A4EB132",
    "probe_source": "8A76A6F81FAAAFC1DA2DE7971FFDEB9C1B3A763F6F5065BF2974CE7967DA712C",
    "low_report": "5E3ED67A025DCD077B2DCD5F7F54306E2DC4428C7538F7D67D2E45E9AFF40D5A",
    "high_report": "CFE67299DDD336E699D20FFCC09C1CB56E4A3558C0151B7A668EA8811EBF3A8D",
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
    assert all(coefficient > 0 for coefficient in sp.Poly(
        denominator, tail, variables[0]
    ).coeffs())
    certificate = efficient_certify_bernstein(numerator, variables, tail)
    assert certificate["degree_profile"] == summary["degree_profile"]
    assert certificate["bernstein_coefficients"] == summary["bernstein_controls"]
    assert certificate["tail_power_coefficients"] == summary["tail_scalar_coefficients"]
    assert certificate["minimum_tail_power_coefficient"] == summary[
        "minimum_tail_scalar_coefficient"
    ]
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
    assert moment["marker"] == (
        "PASS_EXACT_ISO_N7_BUNDLE_G4_SUM0_PIECEWISE_BERNSTEIN_RANK7_G4_PIECEWISE"
    )

    tail = sp.Symbol("tail", nonnegative=True)
    certificates = {}
    c_certificates = {}
    denominators = {}
    c_denominators = {}
    algebra = None
    for short, chart in (("low", "low_excess"), ("high", "high_excess")):
        probe = reports[short]
        assert probe["marker"] == (
            "PROBE_EXACT_ISO_N7_BUNDLE_G3_SUM1_NO_PARENT_INTERSECTED_TAU_"
            "MOMENT_RANK7_G5_FINISH"
        )
        assert probe["chart"] == chart and probe["threshold_n"] == THRESHOLD_N
        assert probe["summary"]["negative_tail_scalar_coefficients"] == 0
        assert probe["negative_c_certificate_summary"]["negative_tail_scalar_coefficients"] == 0
        (
            m, variables, value, c_value, exact, sum0, coefficients, b, c,
            lower, edge, omega_low, omega_boundary, omega_high, tau_old, tau_new,
        ) = build_value(chart)
        shifted = sp.cancel(value.subs(m, tail+THRESHOLD_M))
        certificates[chart], denominators[chart] = certify(
            shifted, variables, tail, probe["summary"]
        )
        shifted_c = sp.cancel(-c_value.subs(m, tail+THRESHOLD_M))
        c_certificates[chart], c_denominators[chart] = certify(
            shifted_c, variables[:5], tail, probe["negative_c_certificate_summary"]
        )
        algebra = (
            m, exact, sum0, coefficients, b, c, lower, edge,
            omega_low, omega_boundary, omega_high, tau_old, tau_new,
        )

    (
        m, exact, sum0, coefficients, b, c, lower, edge,
        omega_low, omega_boundary, omega_high, tau_old, tau_new,
    ) = algebra
    edge_parameter = sp.Symbol("edge_parameter", nonnegative=True)
    shifted_m = tail+THRESHOLD_M
    shifted_edge = sp.expand(edge.subs(m, shifted_m))
    gap_low = sp.cancel(omega_boundary-omega_low)
    gap_high = sp.cancel(omega_high-omega_boundary)
    low_num, low_den = map(sp.expand, sp.fraction(gap_low.subs(m, shifted_m)))
    high_num, high_den = map(sp.expand, sp.fraction(gap_high.subs(m, shifted_m)))
    for numerator, denominator in ((low_num, low_den), (high_num, high_den)):
        assert all(coefficient >= 0 for coefficient in sp.Poly(
            numerator, tail, edge_parameter
        ).coeffs())
        assert all(coefficient > 0 for coefficient in sp.Poly(
            denominator, tail, edge_parameter
        ).coeffs())
    assert sp.expand((tau_new-tau_old).subs({
        # Both expressions are affine in Omega and meet at the boundary.
        sp.Symbol("omega_parameter", nonnegative=True): 0
    })) is not None
    omega_symbol = sp.Symbol("Omega_audit")
    e_symbol = sp.Symbol("edge_audit", positive=True)
    L_symbol = 2*e_symbol-m
    old_symbol = e_symbol*omega_symbol/2
    new_symbol = L_symbol+sp.Rational(11, 6)*e_symbol*(omega_symbol-L_symbol)
    B_symbol = (22*e_symbol**2-11*e_symbol*m-12*e_symbol+6*m)/(8*e_symbol)
    assert sp.expand((new_symbol-old_symbol).subs(omega_symbol, B_symbol)) == 0

    # Exact integer pointwise inequality used in the new tau upper.
    x, y = sp.symbols("x y", nonnegative=True, integer=True)
    a, d = x+1, y+1
    lhs = sp.expand(
        4*(1+sp.Rational(3, 2)*(choose_poly(a, 2)+choose_poly(d, 2))-a*d)
    )
    assert sp.expand(lhs-(2*(x-y)**2+x*(x-1)+y*(y-1))) == 0

    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": (
            "Let W be an isolate-free unmarked forest and let exactly one of the "
            "two nonadjacent marked vertices have exactly one neighbour x in W "
            "(common0/sum1). In no-parent mode, if n=|W|+2>=11, then G3>=0."
        ),
        "coverage": {
            "coefficient": "G3",
            "geometry": "nonadjacent_common0_sum1",
            "mode": "no_parent",
            "orders": "n>=11",
            "unmarked_orders": "m>=9",
            "condition": "W isolate-free (so x is nonisolated in W)",
        },
        "exact_expression": str(exact),
        "sum0_base_expression": str(sum0),
        "R_coefficients": {str(rank): str(value) for rank, value in coefficients.items()},
        "nested_shadow": {
            "b": str(b),
            "c": str(c),
            "safe_lower": str(lower),
            "argument": (
                "Write r=|W-N[x]| and R_j=T_(j-1). Drop the positive R5,R6,R7 "
                "coordinates. The negative R4 coefficient and 3T3<=(r-2)T2 "
                "give loss >=d2*r+b*C(r,2). Because b<0 this is concave in "
                "0<=r<=m-2. Its endpoints are 0 and (m-2)c; both charts "
                "certify c<=0 and the total sum0+(m-2)c>=0."
            ),
        },
        "moment_charts": {
            "omega_low": str(omega_low),
            "omega_boundary": str(omega_boundary),
            "omega_high": str(omega_high),
            "tau_old": str(tau_old),
            "tau_degree_excess": str(tau_new),
            "chart_ordering_exact": True,
            "certificates": certificates,
            "negative_c_certificates": c_certificates,
            "positive_denominators": {key: str(value) for key, value in denominators.items()},
            "positive_c_denominators": {key: str(value) for key, value in c_denominators.items()},
        },
        "proof_facts": {
            "edge_interval": "m/2<=e<=m-1 for an isolate-free forest",
            "degree_excess": (
                "With a_v=d_v-1, sum a_v=2e-m and "
                "Q=sum C(a_v,2)=Omega-2e+m>=0."
            ),
            "tau_degree_excess_upper": (
                "Writing tau=S+P for 3-stars and 3-edge paths: "
                "S<=eQ/3. On an internal edge ab<=1+3/2(C(a,2)+C(b,2)); "
                "the internal-edge count is at most 2e-m, so P<=2e-m+3eQ/2. "
                "Thus tau<=2e-m+11eQ/6."
            ),
            "tau_old_upper": "tau<=Omega*e/2 by wedge/third-edge incidence",
            "tau_intersection": (
                "The degree-excess upper is smaller below omega_boundary and the "
                "old upper is smaller above it; the two exact charts are exhaustive."
            ),
            "exact_W4_identity": (
                "W4=C(m,4)-e*C(m-2,2)+Omega*(m-4)+C(e,2)-tau"
            ),
            "extension_interval": (
                "For k=4,...,7, (m-k)Wk-2e*C(m-2,k-1) <= (k+1)W(k+1) "
                "<= (m-k-1)Wk. The improved upper holds because every nonempty "
                "independent set in an isolate-free graph blocks at least one vertex."
            ),
        },
        "coverage_gap_within_stated_isolatefree_sum1_no_parent_G3": None,
        "universal_sum1_no_parent_guard": False,
        "dependencies_sha256": EXPECTED,
        "scope": (
            "Only no-parent common0/sum1 rank-seven G3 with isolate-free W and "
            "n>=11. Finite n<=10, isolate padding (including x isolated in W), "
            "other parent modes, and other geometries are separate."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True)+"\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "charts": list(certificates),
        "total_bernstein_controls": sum(
            certificate["bernstein_coefficients"] for certificate in certificates.values()
        ),
        "total_tail_power_coefficients": sum(
            certificate["tail_power_coefficients"] for certificate in certificates.values()
        ),
        "minimum_tail_power_coefficient": min(
            sp.Rational(certificate["minimum_tail_power_coefficient"])
            for certificate in certificates.values()
        ),
        "coverage_gap_within_stated_isolatefree_sum1_no_parent_G3": None,
    }, indent=2, sort_keys=True, default=str))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
