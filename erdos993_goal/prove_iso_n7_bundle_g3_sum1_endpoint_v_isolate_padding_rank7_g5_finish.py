#!/usr/bin/env python3
"""Fail-closed isolate-padding theorem for endpoint_v common0/sum1 G3."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_iso_n7_bundle_g3_sum0_dense_extension_threshold_rank7_g5_finish import choose_poly
from probe_iso_n7_bundle_g3_sum1_endpoint_intersected_tau_moment_rank7_g5_finish import reduced
from probe_iso_n7_bundle_g3_sum1_endpoint_v_isolate_padding_safe_cap_rank7_g5_finish import (
    extension_value,
    padding_coefficients,
)
from prove_iso_n7_bundle_g1_sum0_dense_isolates_rank7_g4_piecewise import efficient_certify_bernstein


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g3_sum1_endpoint_v_isolate_padding_exact_rank7_g5_finish_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G3_SUM1_ENDPOINT_V_ISOLATE_PADDING_RANK7_G5_FINISH"
PROBE_MARKER = "PROBE_EXACT_ISO_N7_BUNDLE_G3_SUM1_ENDPOINT_V_ISOLATE_PADDING_SAFE_CAP_RANK7_G5_FINISH"
FILES = {
    "padding_probe_source": "probe_iso_n7_bundle_g3_sum1_endpoint_v_isolate_padding_safe_cap_rank7_g5_finish.py",
    "tiny_source": "audit_iso_n7_bundle_g3_sum1_endpoint_v_padding_tiny_rank7_g5_finish.py",
    "tiny_report": "iso_n7_bundle_g3_sum1_endpoint_v_padding_tiny_audit_exact_rank7_g5_finish_20260831.json",
    "bernstein_source": "prove_iso_n7_bundle_g1_sum0_dense_isolates_rank7_g4_piecewise.py",
    **{
        f"H{index}_report": (
            "iso_n7_bundle_g3_sum1_endpoint_v_isolate_padding_H" + str(index)
            + f"_safe_cap_h{4 if index == 1 else 2}_probe_rank7_g5_finish_20260831.json"
        )
        for index in range(1, 9)
    },
}
EXPECTED = {
    "padding_probe_source": "4B9BA1C55F36B322F841D2BF6447D522122C8A2F3C731728BB9DE6975942D21C",
    "tiny_source": "3271B76D09CF971737E8ACFC718DDBF2EC8A740A4B71A62B06D091BE986944DE",
    "tiny_report": "D56ACD532C3B8568F07048B8F08C2A7E8E83BB4318C015DDD6D7467EBE6BCEC9",
    "bernstein_source": "2C810925F74E9F3F893F9434D195225CA04E5150CE78770B23F65E9BB15FA2CF",
    "H1_report": "B2A2E4C0CED841035AB457B09D359EBD51502C8356DBD5766436540E0179F7DA",
    "H2_report": "4126259B195223A64F22C6FD4C269F2B967263B0EBC3833AD820BC8E3F5FED77",
    "H3_report": "C658DADCD6546B0F186EE487E3709F1C587BF5A882570D87535F3307A860B14D",
    "H4_report": "879B86957D4C767A3512B9D5A123D9061E1849EED865A08B0373BCA008B05E8F",
    "H5_report": "2226AE095763AC28CFE7972920C00F68F939A8DADC768D35E1BFCD50E3795535",
    "H6_report": "137F4A3CCA9EE52B336A3D303AB8BC06AB5479610FD82939056E354F811FBA27",
    "H7_report": "82E8DD86CBC7F8CFADFF47F72FF78C67EDD53DB7F2680E9F247C5F0329BF9BDB",
    "H8_report": "C2F1AF76A298AF7BF2A0B07953DF5920A5188FA5534726EE6CEF598EF8F275F2",
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
        assert probe["summary"]["first_negative"] == []
        probes[index] = probe

    h, I, J, coefficients = padding_coefficients()
    certificates = {}
    total_controls = total_scalars = 0
    global_minimum = None
    for index in range(1, 9):
        value_h, variables, value, exact_coefficient, lower, audit = extension_value(index)
        assert value_h == h and sp.expand(exact_coefficient-coefficients[index]) == 0
        threshold = 4 if index == 1 else 2
        tail = sp.Symbol("tail", nonnegative=True)
        numerator, denominator = map(sp.expand, sp.fraction(sp.cancel(value.subs(h, tail+threshold))))
        if sp.LC(sp.Poly(denominator, tail)) < 0:
            numerator, denominator = -numerator, -denominator
        assert all(value > 0 for value in sp.Poly(denominator, tail).all_coeffs())
        certificate = efficient_certify_bernstein(numerator, variables, tail)
        summary = probes[index]["summary"]
        assert certificate["degree_profile"] == summary["degree_profile"]
        assert certificate["bernstein_coefficients"] == summary["bernstein_controls"]
        assert certificate["tail_power_coefficients"] == summary["tail_scalar_coefficients"]
        assert certificate["minimum_tail_power_coefficient"] == summary["minimum_tail_scalar_coefficient"]
        assert certificate["ordered_stream_sha256"] == summary["ordered_stream_sha256"]
        assert certificate["exact_power_inversion"] is True
        local_minimum = sp.Rational(certificate["minimum_tail_power_coefficient"])
        assert local_minimum > 0
        global_minimum = local_minimum if global_minimum is None else min(global_minimum, local_minimum)
        total_controls += certificate["bernstein_coefficients"]
        total_scalars += certificate["tail_power_coefficients"]
        certificates[f"H{index}"] = {
            "threshold_h": threshold, "exact_newton_coefficient": str(coefficients[index]),
            "safe_lower": str(lower), "root_cap_audit": audit,
            "positive_denominator": str(sp.factor(denominator)), **certificate,
        }

    tiny = json.loads((HERE / FILES["tiny_report"]).read_text(encoding="utf-8"))
    assert tiny["marker"] == "PASS_EXACT_ISO_N7_BUNDLE_G3_SUM1_ENDPOINT_V_PADDING_TINY_AUDIT_RANK7_G5_FINISH"
    assert tiny["rooted_row_count"] == 13 and tiny["minimum_H1"] == 92
    assert min(tiny["one_vertex_edgeless_newton_coefficients"].values()) >= 0

    m, W, R, exact, _base, _coefficients, _b, _c = reduced("endpoint_v")
    isolates = sp.Symbol("isolates", nonnegative=True, integer=True)
    padded_w = {
        rank: sp.expand(sum(choose_poly(isolates, rank-j)*I[j] for j in range(rank+1)))
        for rank in range(2, 9)
    }
    padded_r = {
        rank: sp.expand(sum(choose_poly(isolates, rank-j)*J[j] for j in range(rank+1)))
        for rank in range(2, 8)
    }
    padded = sp.expand(exact.subs({
        m: h+isolates, **{W[k]: padded_w[k] for k in range(2, 9)},
        **{R[k]: padded_r[k] for k in range(2, 8)},
    }, simultaneous=True))
    recomposed = sp.expand(sum(coefficients[index]*choose_poly(isolates, index) for index in range(9)))
    assert sp.expand(padded-recomposed) == 0

    report = {
        "marker": MARKER, "status": "proved exact",
        "theorem": (
            "For every rooted forest (H,x), all positive-order Newton coefficients "
            "of endpoint_v common0/sum1 G3 on H+sK1 are positive. Hence padding "
            "preserves nonnegativity of every closed base."
        ),
        "identity": "G3_endpoint_v_sum1(H+sK1,x)=sum_{j=0}^8 H_j(H,x)C(s,j)",
        "H0_scope_guard": "H0 is the base G3 value and is not proved by this transfer theorem.",
        "tiny_exact_audit": {
            "rooted_rows": tiny["rooted_row_count"], "minimum_H1": tiny["minimum_H1"],
            "one_vertex_edgeless_newton_coefficients": tiny["one_vertex_edgeless_newton_coefficients"],
        },
        "certificates": certificates,
        "aggregate": {
            "newton_coefficients": 8, "bernstein_controls": total_controls,
            "tail_power_coefficients": total_scalars,
            "minimum_tail_power_coefficient": str(global_minimum),
            "exact_power_inversion": True, "exact_newton_recomposition": True,
        },
        "coverage_gap_within_positive_order_endpoint_v_sum1_padding": None,
        "dependencies_sha256": EXPECTED,
        "scope": "endpoint_v common0/sum1 rank-seven G3 isolate padding only; base positivity and endpoint_u remain separate.",
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER, "coverage_gap_within_positive_order_endpoint_v_sum1_padding": None,
        **report["aggregate"],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
