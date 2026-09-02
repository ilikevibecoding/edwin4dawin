#!/usr/bin/env python3
"""Fail-closed isolate-padding monotonicity for rank-seven G3 sum0.

The positive-order Newton coefficients of G3(H+sK1) are proved nonnegative
for every forest H of order at least two.  The complete exact Bernstein tensors
are inverted before promotion.  H_0=G3(H) is deliberately not claimed here.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_iso_n7_bundle_g3_sum0_dense_extension_threshold_rank7_g5_finish import (
    build_value,
    choose_poly,
)
from probe_iso_n7_bundle_g3_sum0_isolate_padding_extension_rank7_g5_finish import (
    padding_coefficients,
)
from prove_iso_n7_bundle_g1_sum0_dense_isolates_rank7_g4_piecewise import (
    efficient_certify_bernstein,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "iso_n7_bundle_g3_sum0_isolate_padding_exact_"
    "rank7_g5_finish_20260831.json"
)
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G3_SUM0_ISOLATE_PADDING_RANK7_G5_FINISH"
THRESHOLD_H = 2
FILES = {
    "padding_probe_source": "probe_iso_n7_bundle_g3_sum0_isolate_padding_extension_rank7_g5_finish.py",
    "bernstein_source": "prove_iso_n7_bundle_g1_sum0_dense_isolates_rank7_g4_piecewise.py",
    **{
        f"H{index}_probe_report": (
            "iso_n7_bundle_g3_sum0_isolate_padding_H"
            f"{index}_h2_extension_probe_rank7_g5_finish_20260831.json"
        )
        for index in range(1, 9)
    },
}
EXPECTED = {
    "padding_probe_source": "FE2BE9628740630587E2CCF107A2BE8D6A55181482228EA640668E7DD78AC758",
    "bernstein_source": "2C810925F74E9F3F893F9434D195225CA04E5150CE78770B23F65E9BB15FA2CF",
    "H1_probe_report": "705385E5B986891F3F40A54E39E9C951EB1D58F7A0280155431EE304344F40ED",
    "H2_probe_report": "8CE9F3F33E4C56A3CFA6115088F2F4D8312DB7A445C21E55B20E81CF204F9B5A",
    "H3_probe_report": "8778FC6C930C6078418AB2AC413A659D74340E9413A39D822E30601A9B319A8D",
    "H4_probe_report": "CFA5E219C42B346A95FE0433F44A05BB15D5C31671022D81837D90FB1C893BD9",
    "H5_probe_report": "7538C339D1D963CF129AE7E1C5A9437D85F4B287DEEA8F646ADC235C5F0280D8",
    "H6_probe_report": "A96F801239E22D5BAE0CB0912988BE5711B9453A071EB725BC93E89A8180B7AE",
    "H7_probe_report": "1D022DBCD650D992F38B61C0D5978F99C1E89A715EAEF1CA51CBED0216463364",
    "H8_probe_report": "3785EFFE926CD2A4FAE721A4013F571D7F6E329BCF8608287AC5D25A30479668",
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
            "PROBE_EXACT_ISO_N7_BUNDLE_G3_SUM0_ISOLATE_PADDING_EXTENSION_RANK7_G5_FINISH"
        )
        assert probe["newton_index"] == index
        assert probe["threshold_h"] == THRESHOLD_H
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
        edge_parameter,
        omega_parameter,
        *(extension_parameters[rank] for rank in range(4, 9)),
    )
    tail = sp.Symbol("tail", nonnegative=True)
    certificates = {}
    total_controls = 0
    total_scalars = 0
    global_minimum = None
    for index in range(1, 9):
        value = sp.cancel(coefficients[index].subs({
            core[rank]: rows[rank] for rank in range(2, 9)
        }, simultaneous=True).subs(h, tail+THRESHOLD_H))
        numerator, denominator = map(sp.expand, sp.fraction(value))
        if sp.LC(sp.Poly(denominator, tail)) < 0:
            numerator, denominator = -numerator, -denominator
        denominator_poly = sp.Poly(denominator, tail)
        assert all(value > 0 for value in denominator_poly.all_coeffs())
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
        assert certificate["exact_power_inversion"] is True
        local_minimum = sp.Rational(certificate["minimum_tail_power_coefficient"])
        assert local_minimum > 0
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

    # Independent exact Newton recomposition, not merely coefficient sampling.
    m, _dense_variables, _dense_value, reduced, _dense_intervals = build_value()
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
        **{
            sp.Symbol(f"W{rank}", nonnegative=True): padded_rows[rank]
            for rank in range(2, 9)
        },
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
            "For every forest H on h>=2 vertices, all positive-order Newton "
            "coefficients H_j (j=1,...,8) in G3(H+sK1) are strictly positive "
            "on the certified relaxation, hence nonnegative for the exact "
            "forest. Therefore G3(H+sK1)>=G3(H) whenever G3(H)>=0."
        ),
        "identity": "G3(H+sK1)=sum_{j=0}^8 H_j(H)*C(s,j)",
        "H0_scope_guard": (
            "H_0=G3(H) is not proved here; this theorem is a transfer from an "
            "already-closed base forest H."
        ),
        "coverage": {
            "core_orders": "h>=2",
            "isolate_padding": "every integer s>=0",
            "coefficient": "rank-seven G3",
            "geometry_mode": "no-parent nonadjacent/common0/sum0",
        },
        "certificates": certificates,
        "aggregate": {
            "newton_coefficients": 8,
            "bernstein_controls": total_controls,
            "tail_power_coefficients": total_scalars,
            "minimum_tail_power_coefficient": str(global_minimum),
            "exact_power_inversion": True,
            "exact_newton_recomposition": True,
        },
        "proof_facts": {
            "forest_moment_embedding": (
                "0<=e<=h-1, 2e^2/h-e<=Omega<=e^2/2"
            ),
            "blocked_extension_embedding": (
                "((h-k)Ik-2e*C(h-2,k-1))/(k+1)<=I(k+1)"
                "<=(h-k)Ik/(k+1), k=3,...,7"
            ),
            "binomial_nonnegativity": "C(s,j)>=0 for integer s>=0",
        },
        "exact_power_inversion": True,
        "coverage_gap_within_positive_order_padding_coefficients": None,
        "dependencies_sha256": EXPECTED,
        "scope": (
            "This proves isolate-padding transfer only for rank-seven G3 "
            "no-parent common0/sum0. It does not prove the base value H_0, "
            "other geometries, or parent modes."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True)+"\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "coverage_gap_within_positive_order_padding_coefficients": None,
        **report["aggregate"],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
