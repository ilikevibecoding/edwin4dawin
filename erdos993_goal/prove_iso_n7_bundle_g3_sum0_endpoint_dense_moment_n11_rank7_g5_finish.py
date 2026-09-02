#!/usr/bin/env python3
"""Fail-closed endpoint-parent dense moment theorem for rank-seven G3."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_iso_n7_bundle_g3_sum0_endpoint_dense_moment_rank7_g5_finish import (
    build_value,
)
from prove_iso_n7_bundle_g1_sum0_dense_isolates_rank7_g4_piecewise import (
    efficient_certify_bernstein,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "iso_n7_bundle_g3_sum0_endpoint_dense_moment_n11_exact_"
    "rank7_g5_finish_20260831.json"
)
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G3_SUM0_ENDPOINT_DENSE_MOMENT_N11_RANK7_G5_FINISH"
FILES = {
    "parent_report": "iso_n7_bundle_g3_parent_modes_exact_rank7_g4_piecewise_20260831.json",
    "probe_source": "probe_iso_n7_bundle_g3_sum0_endpoint_dense_moment_rank7_g5_finish.py",
    "probe_report": "iso_n7_bundle_g3_sum0_endpoint_dense_moment_n11_probe_rank7_g5_finish_20260831.json",
    "bernstein_source": "prove_iso_n7_bundle_g1_sum0_dense_isolates_rank7_g4_piecewise.py",
    "moment_source": "prove_iso_n7_bundle_g4_sum0_piecewise_bernstein_rank7_g4_piecewise.py",
    "moment_report": "iso_n7_bundle_g4_sum0_piecewise_bernstein_exact_rank7_g4_piecewise_20260831.json",
}
EXPECTED = {
    "parent_report": "6977AF4DC4A353F5520BF6ED4450F0594DDDB7F8541128D28D52B8E77A4EB132",
    "probe_source": "5B3ED5A9E9AA13BF5E54A50A8BB23430AA605995B85C1D74685BBA5D61358028",
    "probe_report": "4DE2A0A650BC5FD532E8189DE1E6348A0B63AE7F6CBBE89C2342C56200EF42E7",
    "bernstein_source": "2C810925F74E9F3F893F9434D195225CA04E5150CE78770B23F65E9BB15FA2CF",
    "moment_source": "24E9538B8DA863D884BA2522E6D10316181F21206BE53A5C472D80C9DCE62FB5",
    "moment_report": "E602040E714BF069F56DFB6C2BE94728595B087C530FF77371777662550E99C1",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    for key, digest in EXPECTED.items():
        assert sha256(HERE/FILES[key]) == digest, key
    probe = json.loads((HERE/FILES["probe_report"]).read_text(encoding="utf-8"))
    moment = json.loads((HERE/FILES["moment_report"]).read_text(encoding="utf-8"))
    assert probe["marker"] == (
        "PROBE_EXACT_ISO_N7_BUNDLE_G3_SUM0_ENDPOINT_DENSE_MOMENT_RANK7_G5_FINISH"
    )
    assert probe["modes"] == ["endpoint_u", "endpoint_v"]
    assert probe["endpoint_symmetry_checked"] is True
    assert probe["threshold_n"] == 11
    assert probe["summary"]["negative_tail_scalar_coefficients"] == 0
    assert moment["marker"] == (
        "PASS_EXACT_ISO_N7_BUNDLE_G4_SUM0_PIECEWISE_BERNSTEIN_RANK7_G4_PIECEWISE"
    )
    m, variables, value, reduced = build_value()
    tail = sp.Symbol("tail", nonnegative=True)
    shifted = sp.cancel(value.subs(m, tail+9))
    numerator, denominator = map(sp.expand, sp.fraction(shifted))
    if sp.LC(sp.Poly(denominator, tail)) < 0:
        numerator, denominator = -numerator, -denominator
    assert sp.factor(denominator) == 80640*(tail+9)**4
    assert all(value > 0 for value in sp.Poly(denominator, tail).all_coeffs())
    certificate = efficient_certify_bernstein(numerator, variables, tail)
    summary = probe["summary"]
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
    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": (
            "In either endpoint-parent mode, with nonadjacent marks having no "
            "unmarked neighbours and an isolate-free unmarked forest W, the "
            "exact rank-seven bundle G3 is nonnegative whenever n=|W|+2>=11."
        ),
        "coverage": {
            "coefficient": "G3",
            "modes": ["endpoint_u", "endpoint_v"],
            "geometry": "nonadjacent_common0_sum0",
            "orders": "n>=11",
            "unmarked_core_orders": "m>=9",
            "condition": "minimum degree of W is at least one",
        },
        "certificate": certificate,
        "positive_denominator": str(sp.factor(denominator)),
        "proof_facts": {
            "endpoint_symmetry": "endpoint_u and endpoint_v reduced rows are identical",
            "moment_box": (
                "m/2<=e<=m-1, 2e^2/m-e<=Omega<=e^2/2, "
                "2Omega(Omega-e)/(3e)<=tau<=Omega*e/2"
            ),
            "exact_W4": (
                "W4=C(m,4)-e*C(m-2,2)+Omega*(m-4)+C(e,2)-tau"
            ),
            "extensions": "blocked-extension coupled intervals for W5,...,W8",
        },
        "exact_reduced_expression": str(reduced),
        "exact_power_inversion": True,
        "coverage_gap_within_stated_endpoint_dense_branch": None,
        "dependencies_sha256": EXPECTED,
        "scope": (
            "Endpoint-parent common0/sum0 G3 with isolate-free W and n>=11 "
            "only; padding and finite orders are separate."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True)+"\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "coverage_gap_within_stated_endpoint_dense_branch": None,
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
