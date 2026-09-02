#!/usr/bin/env python3
"""Fail-closed endpoint_v sum1 G3 base theorem when x is isolated in W."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_iso_n7_bundle_g3_sum1_endpoint_v_xisolated_moment_rank7_g5_finish import build_value
from prove_iso_n7_bundle_g1_sum0_dense_isolates_rank7_g4_piecewise import efficient_certify_bernstein


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g3_sum1_endpoint_v_xisolated_n11_exact_rank7_g5_finish_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G3_SUM1_ENDPOINT_V_XISOLATED_N11_RANK7_G5_FINISH"
FILES = {
    "probe_source": "probe_iso_n7_bundle_g3_sum1_endpoint_v_xisolated_moment_rank7_g5_finish.py",
    "low_report": "iso_n7_bundle_g3_sum1_endpoint_v_xisolated_low_excess_n11_probe_rank7_g5_finish_20260831.json",
    "high_report": "iso_n7_bundle_g3_sum1_endpoint_v_xisolated_high_excess_n11_probe_rank7_g5_finish_20260831.json",
    "isolatefree_source": "prove_iso_n7_bundle_g3_sum1_endpoint_v_isolatefree_n11_rank7_g5_finish.py",
    "isolatefree_report": "iso_n7_bundle_g3_sum1_endpoint_v_isolatefree_n11_exact_rank7_g5_finish_20260831.json",
    "bernstein_source": "prove_iso_n7_bundle_g1_sum0_dense_isolates_rank7_g4_piecewise.py",
}
EXPECTED = {
    "probe_source": "7801F47CE31D784DEC4BDD6DD673490C060CACF8A6E65629D99589D7B2F428B2",
    "low_report": "70632D7956F43A0A632FD393560300A48E98591FA604646806901B7A6A94486F",
    "high_report": "08A790D7C3C9227F98486B8779CC0DC114C6639E0E2452614ACDA5ED2741EE2A",
    "isolatefree_source": "CE19AEDAC3146BC1D80B6129383326CC859BD13171FFD37505838BCA4876C722",
    "isolatefree_report": "3E384835CD8B2CCE422A28A2BDC02A5F0D61108ADBE36E3EFC4C20D2EDE5789B",
    "bernstein_source": "2C810925F74E9F3F893F9434D195225CA04E5150CE78770B23F65E9BB15FA2CF",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    for key, digest in EXPECTED.items():
        assert sha256(HERE / FILES[key]) == digest, key
    inherited = json.loads((HERE / FILES["isolatefree_report"]).read_text(encoding="utf-8"))
    assert inherited["coverage_gap_within_stated_endpoint_v_isolatefree_sum1_G3"] is None
    tail = sp.Symbol("tail", nonnegative=True)
    certificates = {}
    denominators = {}
    exact_expression = None
    for short, chart in (("low", "low_excess"), ("high", "high_excess")):
        probe = json.loads((HERE / FILES[f"{short}_report"]).read_text(encoding="utf-8"))
        assert probe["marker"] == "PROBE_EXACT_ISO_N7_BUNDLE_G3_SUM1_ENDPOINT_V_XISOLATED_MOMENT_RANK7_G5_FINISH"
        assert probe["chart"] == chart and probe["threshold_n"] == 11
        assert probe["summary"]["negative_tail_scalar_coefficients"] == 0
        q, variables, value, exact_expression = build_value(chart)
        numerator, denominator = map(sp.expand, sp.fraction(sp.cancel(value.subs(q, tail+8))))
        assert all(coefficient > 0 for coefficient in sp.Poly(denominator, tail, variables[0]).coeffs())
        certificate = efficient_certify_bernstein(numerator, variables, tail)
        summary = probe["summary"]
        assert certificate["degree_profile"] == summary["degree_profile"]
        assert certificate["bernstein_coefficients"] == summary["bernstein_controls"]
        assert certificate["tail_power_coefficients"] == summary["tail_scalar_coefficients"]
        assert certificate["minimum_tail_power_coefficient"] == summary["minimum_tail_scalar_coefficient"]
        assert certificate["ordered_stream_sha256"] == summary["ordered_stream_sha256"]
        assert certificate["exact_power_inversion"] is True
        certificates[chart] = certificate
        denominators[chart] = str(sp.factor(denominator))

    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": (
            "In endpoint_v common0/sum1 with B active, suppose its unique W-neighbour "
            "x is isolated inside W. Let K be the remaining nonempty isolate-free "
            "forest. If the stripped base order n=|K|+3>=11, then G3>=0."
        ),
        "coverage": {
            "coefficient": "G3", "geometry": "nonadjacent_common0_sum1",
            "mode": "endpoint_v", "unique_marked_neighbour_x": "isolated in W",
            "base_orders": "n>=11", "core_orders": "|K|>=8",
        },
        "row_identity": "For W=K+xK1, W_j=T_j+T_(j-1) and R_j=T_(j-1).",
        "exact_expression_in_K_rows": str(exact_expression),
        "moment_charts": {
            "certificates": certificates,
            "positive_denominators": denominators,
            "chart_geometry_and_tau_proof": "Inherited exactly from the pinned endpoint_v isolate-free theorem and applied to K.",
        },
        "coverage_gap_within_stated_endpoint_v_xisolated_sum1_base": None,
        "universal_endpoint_sum1_guard": False,
        "dependencies_sha256": EXPECTED,
        "scope": "Only endpoint_v x-isolated common0/sum1 G3 n>=11; finite bases, padding, endpoint_u, ordinary parent, and other geometries remain separate.",
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER, "charts": list(certificates),
        "total_bernstein_controls": sum(value["bernstein_coefficients"] for value in certificates.values()),
        "minimum_tail_power_coefficient": str(min(sp.Rational(value["minimum_tail_power_coefficient"]) for value in certificates.values())),
        "coverage_gap_within_stated_endpoint_v_xisolated_sum1_base": None,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
