#!/usr/bin/env python3
"""Fail-closed no-parent sum1 G3 base theorem when x is isolated in W."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_iso_n7_bundle_g3_sum1_no_parent_xisolated_moment_rank7_g5_finish import (
    build_value,
)
from prove_iso_n7_bundle_g1_sum0_dense_isolates_rank7_g4_piecewise import (
    efficient_certify_bernstein,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "iso_n7_bundle_g3_sum1_no_parent_xisolated_n11_exact_"
    "rank7_g5_finish_20260831.json"
)
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G3_SUM1_NO_PARENT_XISOLATED_N11_RANK7_G5_FINISH"
FILES = {
    "probe_source": "probe_iso_n7_bundle_g3_sum1_no_parent_xisolated_moment_rank7_g5_finish.py",
    "low_report": (
        "iso_n7_bundle_g3_sum1_no_parent_xisolated_low_excess_n11_probe_"
        "rank7_g5_finish_20260831.json"
    ),
    "high_report": (
        "iso_n7_bundle_g3_sum1_no_parent_xisolated_high_excess_n11_probe_"
        "rank7_g5_finish_20260831.json"
    ),
    "isolatefree_source": "prove_iso_n7_bundle_g3_sum1_no_parent_isolatefree_n11_rank7_g5_finish.py",
    "isolatefree_report": "iso_n7_bundle_g3_sum1_no_parent_isolatefree_n11_exact_rank7_g5_finish_20260831.json",
    "bernstein_source": "prove_iso_n7_bundle_g1_sum0_dense_isolates_rank7_g4_piecewise.py",
}
EXPECTED = {
    "probe_source": "E211CFB4B5F5BD1BD071D109FB1428EB922A6388A25B785D0DA20D413336D474",
    "low_report": "D4EE34EC5076388199C4C71DC9AD3764FD65D2FA3D613E338E075AB44D9F706E",
    "high_report": "DDE93077A40C0A87A97FB2E4BC7F40146B519237339941E4409577B674242301",
    "isolatefree_source": "FF0A6C0BCBE809A5AE0ED1B3A75AC1D4946DAC846A94E6038497B9D1F83E12E2",
    "isolatefree_report": "C1FCD2097AFB7C62187EF2D1C6D7F5D0662A624F5134E29D68FECAA1904BB6DB",
    "bernstein_source": "2C810925F74E9F3F893F9434D195225CA04E5150CE78770B23F65E9BB15FA2CF",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    for key, digest in EXPECTED.items():
        assert sha256(HERE / FILES[key]) == digest, key
    inherited = json.loads((HERE / FILES["isolatefree_report"]).read_text(encoding="utf-8"))
    assert inherited["coverage_gap_within_stated_isolatefree_sum1_no_parent_G3"] is None
    tail = sp.Symbol("tail", nonnegative=True)
    certificates = {}
    denominators = {}
    exact_expression = None
    for short, chart in (("low", "low_excess"), ("high", "high_excess")):
        probe = json.loads((HERE / FILES[f"{short}_report"]).read_text(encoding="utf-8"))
        assert probe["marker"] == (
            "PROBE_EXACT_ISO_N7_BUNDLE_G3_SUM1_NO_PARENT_XISOLATED_MOMENT_"
            "RANK7_G5_FINISH"
        )
        assert probe["chart"] == chart and probe["threshold_n"] == 11
        assert probe["summary"]["negative_tail_scalar_coefficients"] == 0
        q, variables, value, exact_expression = build_value(chart)
        shifted = sp.cancel(value.subs(q, tail+8))
        numerator, denominator = map(sp.expand, sp.fraction(shifted))
        assert all(coefficient > 0 for coefficient in sp.Poly(
            denominator, tail, variables[0]
        ).coeffs())
        certificate = efficient_certify_bernstein(numerator, variables, tail)
        summary = probe["summary"]
        assert certificate["degree_profile"] == summary["degree_profile"]
        assert certificate["bernstein_coefficients"] == summary["bernstein_controls"]
        assert certificate["tail_power_coefficients"] == summary["tail_scalar_coefficients"]
        assert certificate["minimum_tail_power_coefficient"] == summary[
            "minimum_tail_scalar_coefficient"
        ]
        assert certificate["ordered_stream_sha256"] == summary["ordered_stream_sha256"]
        assert certificate["exact_power_inversion"] is True
        certificates[chart] = certificate
        denominators[chart] = str(sp.factor(denominator))

    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": (
            "In no-parent common0/sum1 geometry, suppose the unique W-neighbour "
            "x of one mark is isolated inside W. Delete x and every other isolated "
            "W-vertex and let K be the remaining nonempty isolate-free forest. If "
            "the stripped base order n=|K|+3>=11, then G3>=0."
        ),
        "coverage": {
            "coefficient": "G3",
            "geometry": "nonadjacent_common0_sum1",
            "mode": "no_parent",
            "unique_marked_neighbour_x": "isolated in W",
            "base_orders": "n>=11",
            "core_orders": "|K|>=8",
        },
        "row_identity": (
            "For W=K+xK1, W_j=T_j+T_(j-1) and the x-containing row "
            "R_j=T_(j-1)."
        ),
        "exact_expression_in_K_rows": str(exact_expression),
        "moment_charts": {
            "certificates": certificates,
            "positive_denominators": denominators,
            "chart_geometry_and_tau_proof": (
                "Imported fail-closed from the pinned isolate-free sum1 theorem; "
                "the same exact degree-excess/old-tau intersection is applied to K."
            ),
        },
        "coverage_gap_within_stated_xisolated_sum1_no_parent_base": None,
        "universal_sum1_no_parent_guard": False,
        "dependencies_sha256": EXPECTED,
        "scope": (
            "Only the stripped x-isolated base of no-parent common0/sum1 G3 for "
            "n>=11. Finite bases, restoring isolates, x nonisolated, other modes, "
            "and other geometries are separate."
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
        "coverage_gap_within_stated_xisolated_sum1_no_parent_base": None,
    }, indent=2, sort_keys=True, default=str))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
