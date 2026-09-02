#!/usr/bin/env python3
"""Fail-closed dense-core rank-seven G3 theorem from total order eleven.

The exact W4 edge/wedge/subtree identity removes the impossible endpoint that
forced the earlier n>=127 cutoff.  The full seven-dimensional Bernstein tensor
is converted and inverted exactly before promotion.
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
from prove_iso_n7_bundle_g1_sum0_dense_isolates_rank7_g4_piecewise import (
    efficient_certify_bernstein,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "iso_n7_bundle_g3_sum0_dense_moment_n11_exact_"
    "rank7_g5_finish_20260831.json"
)
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G3_SUM0_DENSE_MOMENT_N11_RANK7_G5_FINISH"
THRESHOLD_N = 11
FILES = {
    "parent_report": "iso_n7_bundle_g3_parent_modes_exact_rank7_g4_piecewise_20260831.json",
    "probe_source": "probe_iso_n7_bundle_g3_sum0_dense_moment_extension_rank7_g5_finish.py",
    "probe_report": "iso_n7_bundle_g3_sum0_dense_moment_extension_n11_probe_rank7_g5_finish_20260831.json",
    "bernstein_source": "prove_iso_n7_bundle_g1_sum0_dense_isolates_rank7_g4_piecewise.py",
    "moment_source": "prove_iso_n7_bundle_g4_sum0_piecewise_bernstein_rank7_g4_piecewise.py",
    "moment_report": "iso_n7_bundle_g4_sum0_piecewise_bernstein_exact_rank7_g4_piecewise_20260831.json",
}
EXPECTED = {
    "parent_report": "6977AF4DC4A353F5520BF6ED4450F0594DDDB7F8541128D28D52B8E77A4EB132",
    "probe_source": "B7ADA766474BF167EDCA35F6D21E7BB3307129A3720A7A43D1156F02F9C988A1",
    "probe_report": "F90F8E5CA0B069077CF107F0FD827B06CD4CB4167855A85CD6229C1750ABDB03",
    "bernstein_source": "2C810925F74E9F3F893F9434D195225CA04E5150CE78770B23F65E9BB15FA2CF",
    "moment_source": "24E9538B8DA863D884BA2522E6D10316181F21206BE53A5C472D80C9DCE62FB5",
    "moment_report": "E602040E714BF069F56DFB6C2BE94728595B087C530FF77371777662550E99C1",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def build_moment_value():
    m, _old_variables, _old_value, reduced, _old_intervals = build_value()
    edge_parameter, omega_parameter, tau_parameter = sp.symbols(
        "edge_parameter omega_parameter tau_parameter", nonnegative=True
    )
    extension_parameters = {
        rank: sp.Symbol(f"extension{rank}_parameter", nonnegative=True)
        for rank in range(5, 9)
    }
    edge = m/2+(m/2-1)*edge_parameter
    omega_lower = 2*edge**2/m-edge
    omega_upper = edge**2/2
    omega = omega_lower+omega_parameter*(omega_upper-omega_lower)
    tau_lower = 2*omega*(omega-edge)/(3*edge)
    tau_upper = omega*edge/2
    tau = sp.cancel(tau_lower+tau_parameter*(tau_upper-tau_lower))
    bad4 = (
        edge*choose_poly(m-2, 2)
        - omega*(m-4)-edge*(edge-1)/2+tau
    )
    rows = {
        2: choose_poly(m, 2)-edge,
        3: choose_poly(m, 3)-edge*(m-2)+omega,
        4: choose_poly(m, 4)-bad4,
    }
    for rank in range(5, 9):
        previous = rank-1
        lower = (
            (m-previous)*rows[previous]
            - 2*edge*choose_poly(m-2, previous-1)
        )/rank
        upper = (m-previous)*rows[previous]/rank
        rows[rank] = sp.expand(
            lower+extension_parameters[rank]*(upper-lower)
        )
    value = sp.cancel(reduced.subs({
        sp.Symbol(f"W{rank}", nonnegative=True): rows[rank]
        for rank in range(2, 9)
    }, simultaneous=True))
    variables = (
        edge_parameter, omega_parameter, tau_parameter,
        *(extension_parameters[rank] for rank in range(5, 9)),
    )
    return m, variables, value, reduced


def main() -> None:
    for key, digest in EXPECTED.items():
        assert sha256(HERE/FILES[key]) == digest, key
    probe = json.loads((HERE/FILES["probe_report"]).read_text(encoding="utf-8"))
    moment = json.loads((HERE/FILES["moment_report"]).read_text(encoding="utf-8"))
    assert probe["marker"] == (
        "PROBE_EXACT_ISO_N7_BUNDLE_G3_SUM0_DENSE_MOMENT_EXTENSION_RANK7_G5_FINISH"
    )
    assert probe["threshold_n"] == THRESHOLD_N
    assert probe["summary"]["negative_tail_scalar_coefficients"] == 0
    assert probe["summary"]["degree_profile"] == [6, 4, 2, 1, 1, 1, 1]
    assert probe["summary"]["bernstein_controls"] == 1680
    assert probe["summary"]["tail_scalar_coefficients"] == 21840
    assert probe["summary"]["minimum_tail_scalar_coefficient"] == "128"
    assert moment["marker"] == (
        "PASS_EXACT_ISO_N7_BUNDLE_G4_SUM0_PIECEWISE_BERNSTEIN_RANK7_G4_PIECEWISE"
    )

    m, variables, value, reduced = build_moment_value()
    tail = sp.Symbol("tail", nonnegative=True)
    shifted = sp.cancel(value.subs(m, tail+THRESHOLD_N-2))
    numerator, denominator = map(sp.expand, sp.fraction(shifted))
    if sp.LC(sp.Poly(denominator, tail)) < 0:
        numerator, denominator = -numerator, -denominator
    assert sp.factor(denominator) == 80640*(tail+9)**4
    assert all(coefficient > 0 for coefficient in sp.Poly(
        denominator, tail
    ).all_coeffs())
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
            "Let the two marked vertices be nonadjacent and have no neighbours "
            "in an isolate-free unmarked forest W, and use no-parent mode D=C. "
            "If n=|W|+2>=11, then the exact rank-seven bundle coefficient G3 "
            "is nonnegative."
        ),
        "coverage": {
            "coefficient": "G3",
            "geometry": "nonadjacent_common0_sum0",
            "mode": "no_parent",
            "orders": "n>=11",
            "unmarked_core_orders": "m>=9",
            "condition": "the unmarked forest W has minimum degree at least one",
        },
        "certificate": certificate,
        "positive_denominator": str(sp.factor(denominator)),
        "proof_facts": {
            "edge_interval": (
                "minimum degree at least one gives m/2<=e; forest acyclicity "
                "gives e<=m-1"
            ),
            "wedge_interval": (
                "2e^2/m-e<=Omega by degree Cauchy; "
                "Omega<=C(e,2)<=e^2/2"
            ),
            "subtree_interval": (
                "2Omega(Omega-e)/(3e)<=tau<=Omega*e/2. The lower bound "
                "follows from degree-cubic Cauchy and tau>=sum_v C(d_v,3); "
                "the upper bound charges each three-edge subtree to at least "
                "two of its wedges and a third edge."
            ),
            "exact_W4_identity": (
                "W4=C(m,4)-e*C(m-2,2)+Omega*(m-4)+C(e,2)-tau"
            ),
            "blocked_extensions": (
                "For k=4,...,7, (m-k)Wk-2e*C(m-2,k-1) "
                "<= (k+1)W(k+1) <= (m-k)Wk"
            ),
            "actual_point_embedding": (
                "Every isolate-free forest row determines parameters in the "
                "certified unit box; the relaxation may contain impossible "
                "points but cannot omit an actual forest."
            ),
        },
        "exact_reduced_expression": str(reduced),
        "exact_power_inversion": True,
        "coverage_gap_within_stated_dense_G3_branch": None,
        "dependencies_sha256": EXPECTED,
        "scope": (
            "This theorem closes only the isolate-free no-parent "
            "nonadjacent/common0/sum0 G3 branch for n>=11. Isolate padding, "
            "finite n<=10, other geometries, and parent modes are separate."
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
