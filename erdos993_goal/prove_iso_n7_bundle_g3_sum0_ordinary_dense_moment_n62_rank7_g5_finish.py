#!/usr/bin/env python3
"""Fail-closed dense ordinary-parent rank-seven G3 theorem from n=62."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_iso_n7_bundle_g3_sum0_dense_extension_threshold_rank7_g5_finish import (
    choose_poly,
)
from probe_iso_n7_bundle_g3_sum0_ordinary_safe_cap_moment_rank7_g5_finish import (
    build_value,
)
from prove_iso_n7_bundle_g1_sum0_dense_isolates_rank7_g4_piecewise import (
    efficient_certify_bernstein,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "iso_n7_bundle_g3_sum0_ordinary_dense_moment_n62_exact_"
    "rank7_g5_finish_20260831.json"
)
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G3_SUM0_ORDINARY_DENSE_MOMENT_N62_RANK7_G5_FINISH"
THRESHOLD_N = 62
THRESHOLD_M = THRESHOLD_N - 2
FILES = {
    "parent_report": "iso_n7_bundle_g3_parent_modes_exact_rank7_g4_piecewise_20260831.json",
    "probe_source": "probe_iso_n7_bundle_g3_sum0_ordinary_safe_cap_moment_rank7_g5_finish.py",
    "probe_report": (
        "iso_n7_bundle_g3_sum0_ordinary_safe_cap_moment_pay_shadow_n62_probe_"
        "rank7_g5_finish_20260831.json"
    ),
    "bernstein_source": "prove_iso_n7_bundle_g1_sum0_dense_isolates_rank7_g4_piecewise.py",
    "moment_source": "prove_iso_n7_bundle_g4_sum0_piecewise_bernstein_rank7_g4_piecewise.py",
    "moment_report": "iso_n7_bundle_g4_sum0_piecewise_bernstein_exact_rank7_g4_piecewise_20260831.json",
}
EXPECTED = {
    "parent_report": "6977AF4DC4A353F5520BF6ED4450F0594DDDB7F8541128D28D52B8E77A4EB132",
    "probe_source": "FB074FED9A5B0D53FEA383802DA55118B67FFB5DC4A5614390E6835D50E11583",
    "probe_report": "02419D9DA68965B06D1BE06D9871313E078123FBF60D02472D212396EE867314",
    "bernstein_source": "2C810925F74E9F3F893F9434D195225CA04E5150CE78770B23F65E9BB15FA2CF",
    "moment_source": "24E9538B8DA863D884BA2522E6D10316181F21206BE53A5C472D80C9DCE62FB5",
    "moment_report": "E602040E714BF069F56DFB6C2BE94728595B087C530FF77371777662550E99C1",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    for key, digest in EXPECTED.items():
        assert sha256(HERE / FILES[key]) == digest, key
    probe = json.loads((HERE / FILES["probe_report"]).read_text(encoding="utf-8"))
    moment = json.loads((HERE / FILES["moment_report"]).read_text(encoding="utf-8"))
    assert probe["marker"] == (
        "PROBE_EXACT_ISO_N7_BUNDLE_G3_SUM0_ORDINARY_SAFE_CAP_MOMENT_"
        "RANK7_G5_FINISH"
    )
    assert probe["mode"] == "ordinary_parent_p_u0_v0"
    assert probe["threshold_n"] == THRESHOLD_N
    assert probe["c4_mode"] == "pay" and probe["r3_shadow"] is True
    assert probe["summary"]["negative_tail_scalar_coefficients"] == 0
    assert probe["summary"]["first_negative"] == []
    assert probe["summary"]["degree_profile"] == [6, 4, 2, 1, 1, 1, 1]
    assert probe["summary"]["bernstein_controls"] == 1680
    assert probe["summary"]["tail_scalar_coefficients"] == 21840
    assert probe["summary"]["minimum_tail_scalar_coefficient"] == "128"
    assert moment["marker"] == (
        "PASS_EXACT_ISO_N7_BUNDLE_G4_SUM0_PIECEWISE_BERNSTEIN_RANK7_G4_PIECEWISE"
    )

    m, variables, value, exact, coefficients, lower, c3_floor, c5_ceiling = build_value(
        pay_c4=True, use_r3_shadow=True
    )
    tail = sp.Symbol("tail", nonnegative=True)

    # Recheck every sign used when eliminating the rooted parent rows.
    assert all(coefficient > 0 for coefficient in sp.Poly(
        c3_floor.subs(m, tail + THRESHOLD_M), tail
    ).all_coeffs())
    assert all(coefficient < 0 for coefficient in sp.Poly(
        c5_ceiling.subs(m, tail + THRESHOLD_M), tail
    ).all_coeffs())
    lower_w2 = choose_poly(m, 2) - (m - 1)
    lower_w3 = choose_poly(m, 3) - (m - 1) * (m - 2)
    c3_upper = (
        -8 * lower_w2 + 34 * choose_poly(m, 3) + 34 * choose_poly(m, 4)
        + 8 * choose_poly(m, 5) - 8 * m
    )
    c5_upper = -26 * lower_w2 - 12 * lower_w3 + 34 * m
    shadow_upper = sp.cancel(
        c5_upper + 6 * c3_upper / choose_poly(m - 4, 2)
    )
    shadow_numerator, shadow_denominator = map(sp.expand, sp.fraction(shadow_upper))
    assert all(coefficient > 0 for coefficient in sp.Poly(
        shadow_denominator.subs(m, tail + THRESHOLD_M), tail
    ).all_coeffs())
    assert all(coefficient < 0 for coefficient in sp.Poly(
        shadow_numerator.subs(m, tail + THRESHOLD_M), tail
    ).all_coeffs())

    shifted = sp.cancel(value.subs(m, tail + THRESHOLD_M))
    numerator, denominator = map(sp.expand, sp.fraction(shifted))
    if sp.LC(sp.Poly(denominator, tail)) < 0:
        numerator, denominator = -numerator, -denominator
    assert sp.factor(denominator) == 80640 * (tail + THRESHOLD_M) ** 4
    assert all(coefficient > 0 for coefficient in sp.Poly(
        denominator, tail
    ).all_coeffs())
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

    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": (
            "Let the two marked vertices be nonadjacent and have no neighbours in an "
            "isolate-free unmarked forest W, and let p be the ordinary parent in W. "
            "In the sum0-compatible mask p_u0_v0, if n=|W|+2>=62, then the exact "
            "rank-seven bundle coefficient G3 is nonnegative."
        ),
        "coverage": {
            "coefficient": "G3",
            "geometry": "nonadjacent_common0_sum0",
            "mode": "ordinary_parent_p_u0_v0",
            "orders": "n>=62",
            "unmarked_core_orders": "m>=60",
            "condition": (
                "W is isolate-free; hence its designated ordinary parent p has at "
                "least one neighbour"
            ),
        },
        "finite_seam_guard": {
            "already_closed_by_finite_all_mode_enumeration": "2<=n<=10",
            "not_closed_by_this_dense_theorem": "11<=n<=61 (equivalently 9<=m<=59)",
            "isolated_parent_guard": (
                "If p is isolated while W has a nonempty core, this theorem does not "
                "apply; that rooted-core class remains separate."
            ),
        },
        "certificate": certificate,
        "positive_denominator": str(sp.factor(denominator)),
        "proof_facts": {
            "ordinary_row_identity": str(exact),
            "ordinary_row_coefficients": {
                str(rank): str(coefficient) for rank, coefficient in coefficients.items()
            },
            "safe_lower": str(lower),
            "c3_positive_floor": str(c3_floor),
            "c5_negative_ceiling": str(c5_ceiling),
            "R4_payment": (
                "c4=-68W2-26W3+2W4-8m and R4<=C(m-2,3); discard the positive "
                "2W4*R4 part and pay the remaining negative part at the cap"
            ),
            "R3_R5_shadow": (
                "Writing R3=T2 and R5=T4 in W-N[p], every independent four-set "
                "contains six pairs and each pair extends to at most C(m-4,2) "
                "four-sets, so R3>=6R5/C(m-4,2). The certified coefficientwise "
                "upper bound makes c5+6c3/C(m-4,2)<=0 for m>=60, allowing the "
                "combined coordinate to be paid at R5<=C(m-2,4)."
            ),
            "edge_interval": (
                "minimum degree at least one gives m/2<=e; forest acyclicity gives e<=m-1"
            ),
            "wedge_interval": (
                "2e^2/m-e<=Omega by degree Cauchy; Omega<=C(e,2)<=e^2/2"
            ),
            "subtree_interval": (
                "2Omega(Omega-e)/(3e)<=tau<=Omega*e/2"
            ),
            "exact_W4_identity": (
                "W4=C(m,4)-e*C(m-2,2)+Omega*(m-4)+C(e,2)-tau"
            ),
            "blocked_extensions": (
                "For k=4,...,7, (m-k)Wk-2e*C(m-2,k-1) <= "
                "(k+1)W(k+1) <= (m-k)Wk"
            ),
            "actual_point_embedding": (
                "Every isolate-free rooted forest row determines parameters in the "
                "certified unit box; impossible relaxed points only strengthen the proof."
            ),
        },
        "exact_power_inversion": True,
        "coverage_gap_within_stated_dense_G3_branch": None,
        "universal_ordinary_G3_guard": False,
        "dependencies_sha256": EXPECTED,
        "scope": (
            "Only ordinary-parent p_u0_v0 nonadjacent/common0/sum0 rank-seven G3 "
            "with isolate-free W and n>=62. Finite n<=61, isolated-parent rooted "
            "cores, other geometries, and other parent modes are separate."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "coverage_gap_within_stated_dense_G3_branch": None,
        "finite_seam": report["finite_seam_guard"]["not_closed_by_this_dense_theorem"],
        "degree_profile": certificate["degree_profile"],
        "bernstein_controls": certificate["bernstein_coefficients"],
        "tail_power_coefficients": certificate["tail_power_coefficients"],
        "minimum_tail_power_coefficient": certificate["minimum_tail_power_coefficient"],
        "exact_power_inversion": True,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
