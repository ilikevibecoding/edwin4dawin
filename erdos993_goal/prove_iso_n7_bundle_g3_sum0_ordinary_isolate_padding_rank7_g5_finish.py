#!/usr/bin/env python3
"""Fail-closed ordinary-parent isolate-padding theorem for rank-seven G3."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_iso_n7_bundle_g3_sum0_dense_extension_threshold_rank7_g5_finish import (
    choose_poly,
)
from probe_iso_n7_bundle_g3_sum0_ordinary_isolate_padding_safe_cap_rank7_g5_finish import (
    extension_value,
    padding_coefficients,
)
from probe_iso_n7_bundle_g3_sum0_ordinary_safe_cap_moment_rank7_g5_finish import (
    ordinary_reduced,
)
from prove_iso_n7_bundle_g1_sum0_dense_isolates_rank7_g4_piecewise import (
    efficient_certify_bernstein,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "iso_n7_bundle_g3_sum0_ordinary_isolate_padding_exact_"
    "rank7_g5_finish_20260831.json"
)
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G3_SUM0_ORDINARY_ISOLATE_PADDING_RANK7_G5_FINISH"
PROBE_MARKER = (
    "PROBE_EXACT_ISO_N7_BUNDLE_G3_SUM0_ORDINARY_ISOLATE_PADDING_"
    "SAFE_CAP_RANK7_G5_FINISH"
)
FILES = {
    "padding_probe_source": (
        "probe_iso_n7_bundle_g3_sum0_ordinary_isolate_padding_safe_cap_"
        "rank7_g5_finish.py"
    ),
    "bernstein_source": "prove_iso_n7_bundle_g1_sum0_dense_isolates_rank7_g4_piecewise.py",
    **{
        f"H{index}_probe_report": (
            "iso_n7_bundle_g3_sum0_ordinary_isolate_padding_H"
            f"{index}_safe_cap_h{3 if index == 1 else 2}_probe_"
            "rank7_g5_finish_20260831.json"
        )
        for index in range(1, 9)
    },
}
EXPECTED = {
    "padding_probe_source": "20DE9BD7C786EA1B83E61BA8E44FB000B663F4B59C55A0AD4E2FAA2AE75D1979",
    "bernstein_source": "2C810925F74E9F3F893F9434D195225CA04E5150CE78770B23F65E9BB15FA2CF",
    "H1_probe_report": "4FC40FC48F7758975FE51226C5D64DE17897AFE362E0E68EFAE71D3A71C557B7",
    "H2_probe_report": "70809ACEF97CB290B4D20E3F8954975C453EFACE0B5B1DABA2C96488F3BB0480",
    "H3_probe_report": "0E2AC75310B8AC1D793820B60490648313D0C941B73DBB57E74E2DBE13BF4D43",
    "H4_probe_report": "E5F6108F68F45928F872D8E53532DFFDC90892516B9655029CA00D08A6A3A656",
    "H5_probe_report": "98958AACEA634AAF2DAC18BD1BD23646553638E50505133D88AD4B4FFD9645A2",
    "H6_probe_report": "2DD33539548B98435552FB0202FA77847E0825C35909F79B929F0DA57FBC0E41",
    "H7_probe_report": "F8FDEFE53B6B5B2E688941E3BC898770A477E96C8C0BB463B95DD26143EDEE28",
    "H8_probe_report": "DA03188A79277F58119D6B3E5BA41A8B16D53F1293690EB003BB0D5D8E3A1410",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    for key, digest in EXPECTED.items():
        assert sha256(HERE / FILES[key]) == digest, key

    probes = {}
    for index in range(1, 9):
        probe = json.loads((HERE / FILES[f"H{index}_probe_report"]).read_text(
            encoding="utf-8"
        ))
        assert probe["marker"] == PROBE_MARKER
        assert probe["newton_index"] == index
        assert probe["threshold_h"] == (3 if index == 1 else 2)
        assert probe["summary"]["negative_tail_scalar_coefficients"] == 0
        assert probe["summary"]["first_negative"] == []
        probes[index] = probe

    h, I, J, coefficients = padding_coefficients()
    certificates = {}
    total_controls = total_scalars = 0
    global_minimum = None
    for index in range(1, 9):
        value_h, variables, value, exact_coefficient, lower, audit = extension_value(index)
        assert value_h == h and sp.expand(exact_coefficient - coefficients[index]) == 0
        threshold = 3 if index == 1 else 2
        tail = sp.Symbol("tail", nonnegative=True)
        shifted = sp.cancel(value.subs(h, tail + threshold))
        numerator, denominator = map(sp.expand, sp.fraction(shifted))
        if sp.LC(sp.Poly(denominator, tail)) < 0:
            numerator, denominator = -numerator, -denominator
        assert all(coefficient > 0 for coefficient in sp.Poly(denominator, tail).all_coeffs())
        assert sp.expand(
            denominator
            - sp.sympify(
                probes[index]["summary"]["positive_denominator"],
                locals={"tail": tail},
            )
        ) == 0
        certificate = efficient_certify_bernstein(numerator, variables, tail)
        summary = probes[index]["summary"]
        assert certificate["degree_profile"] == summary["degree_profile"]
        assert certificate["bernstein_coefficients"] == summary["bernstein_controls"]
        assert certificate["tail_power_coefficients"] == summary["tail_scalar_coefficients"]
        assert certificate["minimum_tail_power_coefficient"] == summary[
            "minimum_tail_scalar_coefficient"
        ]
        assert certificate["ordered_stream_sha256"] == summary["ordered_stream_sha256"]
        local_minimum = sp.Rational(certificate["minimum_tail_power_coefficient"])
        assert local_minimum > 0 and certificate["exact_power_inversion"] is True
        global_minimum = (
            local_minimum if global_minimum is None else min(global_minimum, local_minimum)
        )
        total_controls += certificate["bernstein_coefficients"]
        total_scalars += certificate["tail_power_coefficients"]
        certificates[f"H{index}"] = {
            "threshold_h": threshold,
            "exact_newton_coefficient": str(coefficients[index]),
            "safe_lower": str(lower),
            "parent_cap_audit": audit,
            "positive_denominator": str(sp.factor(denominator)),
            **certificate,
        }

    # The sole point not covered by the H1 h>=3 cone is h=2.  There are only
    # two rooted forests: 2K1 with p at either vertex, and K2 with p at an
    # endpoint.  Evaluate all eight Newton coefficients exactly.
    finite_h2 = {}
    for name, independent_rows, parent_rows in (
        (
            "two_isolated_vertices",
            {0: 1, 1: 2, 2: 1, **{rank: 0 for rank in range(3, 9)}},
            {0: 0, 1: 1, 2: 1, **{rank: 0 for rank in range(3, 8)}},
        ),
        (
            "single_edge_parent_endpoint",
            {0: 1, 1: 2, **{rank: 0 for rank in range(2, 9)}},
            {0: 0, 1: 1, **{rank: 0 for rank in range(2, 8)}},
        ),
    ):
        values = [
            int(coefficients[index].subs({
                h: 2,
                **{I[rank]: independent_rows[rank] for rank in range(2, 9)},
                **{J[rank]: parent_rows[rank] for rank in range(1, 8)},
            }))
            for index in range(1, 9)
        ]
        assert all(value > 0 for value in values)
        finite_h2[name] = values
    assert finite_h2 == {
        "two_isolated_vertices": [825, 5498, 18920, 37876, 45845, 33102, 13138, 2208],
        "single_edge_parent_endpoint": [160, 2408, 12499, 31480, 43281, 33246, 13402, 2208],
    }

    # Reconstruct the full padded ordinary-parent expression exactly.  J0=0
    # because the empty independent set does not contain the parent; J1=1.
    m, W, R, exact, _loss_coeffs, _lower, _c3, _c5 = ordinary_reduced()
    isolates = sp.Symbol("isolates", nonnegative=True, integer=True)
    padded_w = {
        rank: sp.expand(sum(
            choose_poly(isolates, rank-j) * I[j] for j in range(rank+1)
        ))
        for rank in range(2, 9)
    }
    padded_r = {
        rank: sp.expand(sum(
            choose_poly(isolates, rank-j) * J[j] for j in range(rank+1)
        ))
        for rank in range(3, 8)
    }
    padded = sp.expand(exact.subs({
        m: h + isolates,
        **{W[rank]: padded_w[rank] for rank in range(2, 9)},
        **{R[rank]: padded_r[rank] for rank in range(3, 8)},
    }, simultaneous=True))
    recomposed = sp.expand(sum(
        coefficients[index] * choose_poly(isolates, index)
        for index in range(9)
    ))
    assert sp.expand(padded - recomposed) == 0

    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": (
            "For every rooted forest (H,p) on h>=2 vertices in the ordinary-parent "
            "nonadjacent/common0/sum0 mode, all positive-order Newton coefficients "
            "in G3(H+sK1,p) are positive. Hence G3(H+sK1,p)>=G3(H,p) whenever "
            "the ordinary-parent base value G3(H,p) is nonnegative."
        ),
        "identity": "G3_ordinary(H+sK1,p)=sum_{j=0}^8 H_j(H,p)*C(s,j)",
        "compatibility_guard": (
            "Among ordinary-parent masks, sum0 forces p_u0_v0; no other ordinary "
            "mask is asserted by this theorem."
        ),
        "H0_scope_guard": "H0=G3_ordinary(H,p) is not proved by this transfer theorem.",
        "finite_h2_exact_newton_H1_through_H8": finite_h2,
        "certificates": certificates,
        "aggregate": {
            "newton_coefficients": 8,
            "bernstein_controls": total_controls,
            "tail_power_coefficients": total_scalars,
            "minimum_tail_power_coefficient": str(global_minimum),
            "exact_power_inversion": True,
            "exact_newton_recomposition": True,
            "finite_h2_rooted_forests": 2,
        },
        "coverage_gap_within_positive_order_ordinary_padding": None,
        "dependencies_sha256": EXPECTED,
        "scope": (
            "Ordinary-parent p_u0_v0 nonadjacent/common0/sum0 rank-seven G3 isolate "
            "padding only; base positivity, other geometries, and other parent modes "
            "are separate."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "coverage_gap_within_positive_order_ordinary_padding": None,
        **report["aggregate"],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
