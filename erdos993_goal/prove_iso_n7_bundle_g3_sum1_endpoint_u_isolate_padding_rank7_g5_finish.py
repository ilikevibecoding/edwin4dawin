#!/usr/bin/env python3
"""Fail-closed isolate-padding theorem for inactive-endpoint sum1 G3."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_iso_n7_bundle_g3_sum0_dense_extension_threshold_rank7_g5_finish import choose_poly
from probe_iso_n7_bundle_g3_sum1_endpoint_intersected_tau_moment_rank7_g5_finish import reduced
from probe_iso_n7_bundle_g3_sum1_endpoint_u_isolate_padding_safe_cap_rank7_g5_finish import (
    extension_value,
    padding_coefficients,
)
from prove_iso_n7_bundle_g1_sum0_dense_isolates_rank7_g4_piecewise import efficient_certify_bernstein


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g3_sum1_endpoint_u_isolate_padding_exact_rank7_g5_finish_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G3_SUM1_ENDPOINT_U_ISOLATE_PADDING_RANK7_G5_FINISH"
PROBE_MARKER = "PROBE_EXACT_ISO_N7_BUNDLE_G3_SUM1_ENDPOINT_U_ISOLATE_PADDING_SAFE_CAP_RANK7_G5_FINISH"
FILES = {
    "probe_source": "probe_iso_n7_bundle_g3_sum1_endpoint_u_isolate_padding_safe_cap_rank7_g5_finish.py",
    "tiny_source": "audit_iso_n7_bundle_g3_sum1_endpoint_u_padding_tiny_rank7_g5_finish.py",
    "tiny_report": "iso_n7_bundle_g3_sum1_endpoint_u_padding_tiny_audit_exact_rank7_g5_finish_20260831.json",
    "bernstein_source": "prove_iso_n7_bundle_g1_sum0_dense_isolates_rank7_g4_piecewise.py",
    **{
        f"H{i}_report": (
            "iso_n7_bundle_g3_sum1_endpoint_u_isolate_padding_H" + str(i)
            + f"_safe_cap_h{4 if i == 1 else 2}_probe_rank7_g5_finish_20260831.json"
        ) for i in range(1, 9)
    },
}
EXPECTED = {
    "probe_source": "1E6DC6DA413AB19CFE2C3EBA0ECB39082088C270356A7A2DBC871978C9BD250A",
    "tiny_source": "E93BA125FD5A2416665ED7C0CDE610E851487D479C6A8252FB76474A1114351E",
    "tiny_report": "5739FFA050F93F24574C2A02BD6DBDCEE4E89DB6250835586C73A7863EB17224",
    "bernstein_source": "2C810925F74E9F3F893F9434D195225CA04E5150CE78770B23F65E9BB15FA2CF",
    "H1_report": "39D7046D67879CCFD0B04664B8837A6E3D39E25CF337606D2B6B945C1EBB753F",
    "H2_report": "A3986F18F6E49F2CFCC541B8440294D14064F3D1D2D9A3A33C4E5B1BFA07265C",
    "H3_report": "7B97DB5BE593F94DCB046EE361FC1C9747FA8FB468F714E019DFC03BDCEC3719",
    "H4_report": "3580409A781A5D80B9F084B910A39A5D839A055623AA07DADEAA18A58505252D",
    "H5_report": "0F418B5DBEC71E514D87B4E8A98EF4FCA8EBD61FF10227F60E01E3A7B1DF128B",
    "H6_report": "E5162A5D80E8DDCB637FEF976FA064D8047036CD27D7E95C2CABDF3B1849DB89",
    "H7_report": "973096E13B6E8E4ED0706B94C25C96BAF180BBE692557109ABD149A33D2D0321",
    "H8_report": "A36A9BF7D2DF1BD7E203D38B1FFB755050CE3C8F9E88E99BBFFF002E0A1A4965",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    for key, digest in EXPECTED.items():
        assert sha256(HERE / FILES[key]) == digest, key
    probes = {}
    for index in range(1, 9):
        probe = json.loads((HERE / FILES[f"H{index}_report"]).read_text(encoding="utf-8"))
        assert probe["marker"] == PROBE_MARKER and probe["newton_index"] == index
        assert probe["threshold_h"] == (4 if index == 1 else 2)
        assert probe["summary"]["negative_tail_scalar_coefficients"] == 0
        probes[index] = probe
    h, I, J, coefficients = padding_coefficients()
    certificates = {}
    total_controls = total_scalars = 0
    minimum = None
    for index in range(1, 9):
        vh, variables, value, exact, lower, audit = extension_value(index)
        assert vh == h and sp.expand(exact-coefficients[index]) == 0
        threshold = 4 if index == 1 else 2
        tail = sp.Symbol("tail", nonnegative=True)
        numerator, denominator = map(sp.expand, sp.fraction(sp.cancel(value.subs(h, tail+threshold))))
        if sp.LC(sp.Poly(denominator, tail)) < 0:
            numerator, denominator = -numerator, -denominator
        assert all(v > 0 for v in sp.Poly(denominator, tail).all_coeffs())
        certificate = efficient_certify_bernstein(numerator, variables, tail)
        summary = probes[index]["summary"]
        assert certificate["degree_profile"] == summary["degree_profile"]
        assert certificate["bernstein_coefficients"] == summary["bernstein_controls"]
        assert certificate["tail_power_coefficients"] == summary["tail_scalar_coefficients"]
        assert certificate["minimum_tail_power_coefficient"] == summary["minimum_tail_scalar_coefficient"]
        assert certificate["ordered_stream_sha256"] == summary["ordered_stream_sha256"]
        assert certificate["exact_power_inversion"] is True
        local = sp.Rational(certificate["minimum_tail_power_coefficient"])
        assert local > 0
        minimum = local if minimum is None else min(minimum, local)
        total_controls += certificate["bernstein_coefficients"]
        total_scalars += certificate["tail_power_coefficients"]
        certificates[f"H{index}"] = {
            "threshold_h": threshold, "safe_lower": str(lower), "root_cap_audit": audit,
            "positive_denominator": str(sp.factor(denominator)), **certificate,
        }
    tiny = json.loads((HERE / FILES["tiny_report"]).read_text(encoding="utf-8"))
    assert tiny["marker"] == "PASS_EXACT_ISO_N7_BUNDLE_G3_SUM1_ENDPOINT_U_PADDING_TINY_AUDIT_RANK7_G5_FINISH"
    assert tiny["rooted_row_count"] == 13 and tiny["minimum_H1"] == 92
    assert min(tiny["one_vertex_edgeless_newton_coefficients"].values()) >= 0

    m, W, R, exact, _base, _coefficients, _b, _c = reduced("endpoint_u")
    isolates = sp.Symbol("isolates", nonnegative=True, integer=True)
    pw = {k: sp.expand(sum(choose_poly(isolates, k-j)*I[j] for j in range(k+1))) for k in range(2, 9)}
    pr = {k: sp.expand(sum(choose_poly(isolates, k-j)*J[j] for j in range(k+1))) for k in range(2, 8)}
    padded = sp.expand(exact.subs({
        m: h+isolates, **{W[k]: pw[k] for k in range(2, 9)}, **{R[k]: pr[k] for k in range(2, 8)},
    }, simultaneous=True))
    recomposed = sp.expand(sum(coefficients[i]*choose_poly(isolates, i) for i in range(9)))
    assert sp.expand(padded-recomposed) == 0
    report = {
        "marker": MARKER, "status": "proved exact",
        "theorem": "Every positive-order isolate-padding Newton coefficient for inactive-endpoint common0/sum1 G3 is positive.",
        "H0_scope_guard": "H0 is the base value and is not proved here.",
        "tiny_exact_audit": {
            "rooted_rows": 13, "minimum_H1": 92,
            "one_vertex_edgeless_newton_coefficients": tiny["one_vertex_edgeless_newton_coefficients"],
        },
        "certificates": certificates,
        "aggregate": {
            "newton_coefficients": 8, "bernstein_controls": total_controls,
            "tail_power_coefficients": total_scalars, "minimum_tail_power_coefficient": str(minimum),
            "exact_power_inversion": True, "exact_newton_recomposition": True,
        },
        "coverage_gap_within_positive_order_endpoint_u_sum1_padding": None,
        "dependencies_sha256": EXPECTED,
        "scope": "Inactive-endpoint common0/sum1 G3 padding only.",
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER, "coverage_gap_within_positive_order_endpoint_u_sum1_padding": None,
        **report["aggregate"],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
