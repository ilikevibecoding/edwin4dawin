#!/usr/bin/env python3
"""Fail-closed endpoint-parent isolate-padding theorem for rank-seven G3."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_iso_n7_bundle_g3_sum0_dense_extension_threshold_rank7_g5_finish import (
    choose_poly,
)
from probe_iso_n7_bundle_g3_sum0_endpoint_dense_moment_rank7_g5_finish import (
    endpoint_reduced,
)
from probe_iso_n7_bundle_g3_sum0_endpoint_isolate_padding_rank7_g5_finish import (
    padding_coefficients,
)
from prove_iso_n7_bundle_g1_sum0_dense_isolates_rank7_g4_piecewise import (
    efficient_certify_bernstein,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "iso_n7_bundle_g3_sum0_endpoint_isolate_padding_exact_"
    "rank7_g5_finish_20260831.json"
)
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G3_SUM0_ENDPOINT_ISOLATE_PADDING_RANK7_G5_FINISH"
FILES = {
    "padding_probe_source": "probe_iso_n7_bundle_g3_sum0_endpoint_isolate_padding_rank7_g5_finish.py",
    "bernstein_source": "prove_iso_n7_bundle_g1_sum0_dense_isolates_rank7_g4_piecewise.py",
    **{
        f"H{index}_probe_report": (
            "iso_n7_bundle_g3_sum0_endpoint_isolate_padding_H"
            f"{index}_h2_probe_rank7_g5_finish_20260831.json"
        )
        for index in range(1, 9)
    },
}
EXPECTED = {
    "padding_probe_source": "AEA3969ECB7C8882B5724044CE51EEFD732D0E283FFBFB961156AF76A04697BA",
    "bernstein_source": "2C810925F74E9F3F893F9434D195225CA04E5150CE78770B23F65E9BB15FA2CF",
    "H1_probe_report": "5783F9FD7ED9FC5739271B3FB695469E2D9788D48B9942AA5AA10A7363765EE3",
    "H2_probe_report": "08D040FAE0944B85292FDD8DE6519178F28C5DD9592D8F526680EA2A268AF432",
    "H3_probe_report": "3308AE50424A03477E4284EB09AA5FAA483C2C845DDF19B221640C25C1C38DFB",
    "H4_probe_report": "07C2B0DDBDA5FB5A93E9F131B19057DB1F3D5A4474734BD7E761875639255C9C",
    "H5_probe_report": "24DE6380F32DBEAE2A625F8E1BDD7BF7153184C9812DBD67F83B66839F584F9A",
    "H6_probe_report": "1340A627D767A0C8AFA8194D55FD4043E4F016D4D1CE013D0876628B87D49EFD",
    "H7_probe_report": "EF3F6ED0DA5710F33DD682EECC3857DD452F9526968BE4196EB6ADD25E7B029D",
    "H8_probe_report": "292C54499D24B82E0F7CE7AB93841D614A7D1BD8A554B309AC1D36F39A6D4495",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    for key, digest in EXPECTED.items():
        assert sha256(HERE/FILES[key]) == digest, key
    probes = {}
    for index in range(1, 9):
        probe = json.loads((HERE/FILES[f"H{index}_probe_report"]).read_text(
            encoding="utf-8"
        ))
        assert probe["marker"] == (
            "PROBE_EXACT_ISO_N7_BUNDLE_G3_SUM0_ENDPOINT_ISOLATE_PADDING_RANK7_G5_FINISH"
        )
        assert probe["newton_index"] == index and probe["threshold_h"] == 2
        assert probe["modes"] == ["endpoint_u", "endpoint_v"]
        assert probe["summary"]["negative_tail_scalar_coefficients"] == 0
        probes[index] = probe
    h, core, coefficients = padding_coefficients()
    edge_parameter, omega_parameter = sp.symbols(
        "edge_parameter omega_parameter", nonnegative=True
    )
    extension_parameters = {
        rank: sp.Symbol(f"extension{rank}_parameter", nonnegative=True)
        for rank in range(4, 9)
    }
    edge = (h-1)*edge_parameter
    omega_lower = 2*edge**2/h-edge
    omega_upper = edge**2/2
    omega = omega_lower+omega_parameter*(omega_upper-omega_lower)
    rows = {
        2: choose_poly(h, 2)-edge,
        3: choose_poly(h, 3)-edge*(h-2)+omega,
    }
    for rank in range(4, 9):
        previous = rank-1
        lower = (
            (h-previous)*rows[previous]
            - 2*edge*choose_poly(h-2, previous-1)
        )/rank
        upper = (h-previous)*rows[previous]/rank
        rows[rank] = sp.expand(
            lower+extension_parameters[rank]*(upper-lower)
        )
    variables = (
        edge_parameter, omega_parameter,
        *(extension_parameters[rank] for rank in range(4, 9)),
    )
    tail = sp.Symbol("tail", nonnegative=True)
    certificates = {}
    total_controls = total_scalars = 0
    global_minimum = None
    for index in range(1, 9):
        value = sp.cancel(coefficients[index].subs({
            core[rank]: rows[rank] for rank in range(2, 9)
        }, simultaneous=True).subs(h, tail+2))
        numerator, denominator = map(sp.expand, sp.fraction(value))
        if sp.LC(sp.Poly(denominator, tail)) < 0:
            numerator, denominator = -numerator, -denominator
        assert all(value > 0 for value in sp.Poly(denominator, tail).all_coeffs())
        assert sp.expand(
            denominator-sp.sympify(
                probes[index]["summary"]["positive_denominator"],
                locals={"tail": tail},
            )
        ) == 0
        certificate = efficient_certify_bernstein(numerator, variables, tail)
        summary = probes[index]["summary"]
        assert certificate["degree_profile"] == summary["degree_profile"]
        assert certificate["bernstein_coefficients"] == summary["bernstein_controls"]
        assert certificate["tail_power_coefficients"] == summary[
            "tail_scalar_coefficients"
        ]
        assert certificate["minimum_tail_power_coefficient"] == summary[
            "minimum_tail_scalar_coefficient"
        ]
        assert certificate["ordered_stream_sha256"] == summary[
            "ordered_stream_sha256"
        ]
        local_minimum = sp.Rational(certificate["minimum_tail_power_coefficient"])
        assert local_minimum > 0 and certificate["exact_power_inversion"] is True
        global_minimum = (
            local_minimum if global_minimum is None
            else min(global_minimum, local_minimum)
        )
        total_controls += certificate["bernstein_coefficients"]
        total_scalars += certificate["tail_power_coefficients"]
        certificates[f"H{index}"] = {
            "exact_newton_coefficient": str(coefficients[index]),
            "positive_denominator": str(sp.factor(denominator)),
            **certificate,
        }

    m, W, reduced = endpoint_reduced()
    isolates = sp.Symbol("isolates", nonnegative=True, integer=True)
    padded_rows = {
        rank: sp.expand(sum(
            choose_poly(isolates, rank-j)*core[j]
            for j in range(rank+1)
        ))
        for rank in range(2, 9)
    }
    padded = sp.expand(reduced.subs({
        m: h+isolates,
        **{W[rank]: padded_rows[rank] for rank in range(2, 9)},
    }, simultaneous=True))
    recomposed = sp.expand(sum(
        coefficients[index]*choose_poly(isolates, index)
        for index in range(9)
    ))
    assert sp.expand(padded-recomposed) == 0
    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": (
            "For every forest H on h>=2 vertices, in either endpoint-parent "
            "sum0 mode, all positive-order Newton coefficients in "
            "G3(H+sK1) are nonnegative. Hence G3(H+sK1)>=G3(H) whenever "
            "the endpoint base value G3(H) is nonnegative."
        ),
        "identity": "G3_endpoint(H+sK1)=sum_{j=0}^8 H_j(H)*C(s,j)",
        "modes": ["endpoint_u", "endpoint_v"],
        "H0_scope_guard": "H0=G3_endpoint(H) is not proved by this transfer theorem.",
        "certificates": certificates,
        "aggregate": {
            "newton_coefficients": 8,
            "bernstein_controls": total_controls,
            "tail_power_coefficients": total_scalars,
            "minimum_tail_power_coefficient": str(global_minimum),
            "exact_power_inversion": True,
            "exact_newton_recomposition": True,
        },
        "coverage_gap_within_positive_order_endpoint_padding": None,
        "dependencies_sha256": EXPECTED,
        "scope": (
            "Endpoint-parent nonadjacent/common0/sum0 rank-seven G3 isolate "
            "padding only; base positivity and other modes are separate."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True)+"\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "coverage_gap_within_positive_order_endpoint_padding": None,
        **report["aggregate"],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
