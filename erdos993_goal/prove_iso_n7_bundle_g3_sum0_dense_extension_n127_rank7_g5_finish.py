#!/usr/bin/env python3
"""Fail-closed dense-core theorem for rank-seven G3 from order 127.

This promotes the passing reconnaissance cone only after rebuilding the exact
literal coefficient, converting the complete seven-dimensional power tensor
to Bernstein form, and inverting that conversion exactly.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_iso_n7_bundle_g3_sum0_dense_extension_threshold_rank7_g5_finish import (
    build_value,
)
from prove_iso_n7_bundle_g1_sum0_dense_isolates_rank7_g4_piecewise import (
    efficient_certify_bernstein,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "iso_n7_bundle_g3_sum0_dense_extension_n127_exact_"
    "rank7_g5_finish_20260831.json"
)
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G3_SUM0_DENSE_EXTENSION_N127_RANK7_G5_FINISH"
THRESHOLD_N = 127
FILES = {
    "parent_report": "iso_n7_bundle_g3_parent_modes_exact_rank7_g4_piecewise_20260831.json",
    "probe_source": "probe_iso_n7_bundle_g3_sum0_dense_extension_threshold_rank7_g5_finish.py",
    "probe_report": "iso_n7_bundle_g3_sum0_dense_extension_threshold_n127_probe_rank7_g5_finish_20260831.json",
    "bernstein_source": "prove_iso_n7_bundle_g1_sum0_dense_isolates_rank7_g4_piecewise.py",
}
EXPECTED = {
    "parent_report": "6977AF4DC4A353F5520BF6ED4450F0594DDDB7F8541128D28D52B8E77A4EB132",
    "probe_source": "3C775701FE66FEAAE27FE56F794A6BAED75BF3FB1F0253127A732F255AA03F11",
    "probe_report": "0BC7019F7E4BC83F38A73141781086A472FA0ECA203E1B79C1269455E4365FAE",
    "bernstein_source": "2C810925F74E9F3F893F9434D195225CA04E5150CE78770B23F65E9BB15FA2CF",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    for key, digest in EXPECTED.items():
        assert sha256(HERE/FILES[key]) == digest, key
    probe = json.loads((HERE/FILES["probe_report"]).read_text(encoding="utf-8"))
    assert probe["marker"] == (
        "PROBE_EXACT_ISO_N7_BUNDLE_G3_SUM0_DENSE_EXTENSION_THRESHOLD_RANK7_G5_FINISH"
    )
    assert probe["threshold_n"] == THRESHOLD_N
    assert probe["summary"]["negative_tail_scalar_coefficients"] == 0
    assert probe["summary"]["degree_profile"] == [4, 2, 2, 1, 1, 1, 1]
    assert probe["summary"]["bernstein_controls"] == 720
    assert probe["summary"]["minimum_tail_scalar_coefficient"] == "128"

    m, variables, value, reduced, _intervals = build_value()
    tail = sp.Symbol("tail", nonnegative=True)
    shifted = sp.cancel(value.subs(m, tail+THRESHOLD_N-2))
    numerator, denominator = map(sp.expand, sp.fraction(shifted))
    if sp.LC(sp.Poly(denominator, tail)) < 0:
        numerator, denominator = -numerator, -denominator
    assert sp.factor(denominator) == 80640*(tail+125)**2
    assert all(coefficient > 0 for coefficient in sp.Poly(denominator, tail).all_coeffs())

    certificate = efficient_certify_bernstein(numerator, variables, tail)
    assert certificate["degree_profile"] == [4, 2, 2, 1, 1, 1, 1]
    assert certificate["bernstein_coefficients"] == 720
    assert certificate["exact_power_inversion"] is True
    assert certificate["minimum_tail_power_coefficient"] == "128"
    assert certificate["ordered_stream_sha256"] == probe["summary"][
        "ordered_stream_sha256"
    ]

    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": (
            "Let the two marked vertices be nonadjacent and have no neighbours "
            "in the unmarked forest W, and use no-parent mode D=C. If W has "
            "minimum degree at least one and n=|W|+2>=127, then the exact "
            "rank-seven bundle coefficient G3 is nonnegative."
        ),
        "coverage": {
            "coefficient": "G3",
            "geometry": "nonadjacent_common0_sum0",
            "mode": "no_parent",
            "orders": "n>=127",
            "condition": "the unmarked forest W has minimum degree at least one",
        },
        "certificate": certificate,
        "positive_denominator": str(sp.factor(denominator)),
        "proof_facts": {
            "forest_edge_interval": (
                "minimum degree at least one gives m/2<=e; acyclicity gives e<=m-1"
            ),
            "wedge_interval": (
                "2e^2/m-e<=Omega by Cauchy on degrees; "
                "Omega<=C(e,2)<=e^2/2 because every wedge is an edge pair"
            ),
            "blocked_extension_interval": (
                "For k=3,...,7, (m-k)Wk-2e*C(m-2,k-1) "
                "<= (k+1)W(k+1) <= (m-k)Wk. The lower bound charges every "
                "blocked extension to an oriented edge and its remaining k-1 vertices."
            ),
            "actual_point_embedding": (
                "Each exact forest row therefore determines parameters in [0,1] "
                "in the certified seven-dimensional box."
            ),
        },
        "exact_reduced_expression": str(reduced),
        "exact_power_inversion": True,
        "coverage_gap_within_stated_dense_G3_branch": None,
        "dependencies_sha256": EXPECTED,
        "scope": (
            "This is a large-order theorem only for the no-parent "
            "nonadjacent/common0/sum0 G3 branch with an isolate-free unmarked "
            "forest. Orders n<127, forests with isolated unmarked vertices, "
            "other geometries, and parent modes remain separate."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True)+"\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "coverage_gap_within_stated_dense_G3_branch": None,
        "degree_profile": certificate["degree_profile"],
        "bernstein_controls": certificate["bernstein_coefficients"],
        "tail_power_coefficients": certificate["tail_power_coefficients"],
        "minimum_tail_power_coefficient": certificate[
            "minimum_tail_power_coefficient"
        ],
        "exact_power_inversion": True,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
