#!/usr/bin/env python3
"""Fail-closed ordinary G3 theorem when the designated parent is isolated."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_iso_n7_bundle_g3_sum0_ordinary_parent_isolated_moment_rank7_g5_finish import (
    build_value,
)
from prove_iso_n7_bundle_g1_sum0_dense_isolates_rank7_g4_piecewise import (
    efficient_certify_bernstein,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "iso_n7_bundle_g3_sum0_ordinary_parent_isolated_moment_n11_exact_"
    "rank7_g5_finish_20260831.json"
)
MARKER = (
    "PASS_EXACT_ISO_N7_BUNDLE_G3_SUM0_ORDINARY_PARENT_ISOLATED_"
    "MOMENT_N11_RANK7_G5_FINISH"
)
THRESHOLD_N = 11
THRESHOLD_Q = THRESHOLD_N - 3
FILES = {
    "parent_report": "iso_n7_bundle_g3_parent_modes_exact_rank7_g4_piecewise_20260831.json",
    "probe_source": (
        "probe_iso_n7_bundle_g3_sum0_ordinary_parent_isolated_moment_"
        "rank7_g5_finish.py"
    ),
    "probe_report": (
        "iso_n7_bundle_g3_sum0_ordinary_parent_isolated_moment_n11_probe_"
        "rank7_g5_finish_20260831.json"
    ),
    "bernstein_source": "prove_iso_n7_bundle_g1_sum0_dense_isolates_rank7_g4_piecewise.py",
    "moment_source": "prove_iso_n7_bundle_g4_sum0_piecewise_bernstein_rank7_g4_piecewise.py",
    "moment_report": "iso_n7_bundle_g4_sum0_piecewise_bernstein_exact_rank7_g4_piecewise_20260831.json",
}
EXPECTED = {
    "parent_report": "6977AF4DC4A353F5520BF6ED4450F0594DDDB7F8541128D28D52B8E77A4EB132",
    "probe_source": "ECD4C81208B3A8186406031E78B7688DE9C5E5D8E2B1E8ABAA0F10C2665F0ED6",
    "probe_report": "0BAB8A8BA5BC368D244634E3F73D99578CF165A0F58C16E9F6571098DEC84BD0",
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
        "PROBE_EXACT_ISO_N7_BUNDLE_G3_SUM0_ORDINARY_PARENT_ISOLATED_"
        "MOMENT_RANK7_G5_FINISH"
    )
    assert probe["threshold_n"] == THRESHOLD_N
    assert probe["summary"]["negative_tail_scalar_coefficients"] == 0
    assert probe["summary"]["first_negative"] == []
    assert probe["summary"]["degree_profile"] == [6, 4, 2, 1, 1, 1, 1]
    assert probe["summary"]["bernstein_controls"] == 1680
    assert probe["summary"]["tail_scalar_coefficients"] == 21840
    assert probe["summary"]["minimum_tail_scalar_coefficient"] == "128"
    assert moment["marker"] == (
        "PASS_EXACT_ISO_N7_BUNDLE_G4_SUM0_PIECEWISE_BERNSTEIN_RANK7_G4_PIECEWISE"
    )

    q, variables, value, isolated_exact = build_value()
    tail = sp.Symbol("tail", nonnegative=True)
    shifted = sp.cancel(value.subs(q, tail + THRESHOLD_Q))
    numerator, denominator = map(sp.expand, sp.fraction(shifted))
    if sp.LC(sp.Poly(denominator, tail)) < 0:
        numerator, denominator = -numerator, -denominator
    assert sp.factor(denominator) == 80640 * (tail + THRESHOLD_Q) ** 4
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
            "Let the ordinary parent p be isolated, and after deleting p and every "
            "other isolated unmarked vertex let K be the remaining nonempty "
            "isolate-free forest. In the nonadjacent/common0/sum0-compatible mask "
            "p_u0_v0, if the base total order n=|K|+3>=11, then the exact rank-seven "
            "bundle coefficient G3 is nonnegative."
        ),
        "coverage": {
            "coefficient": "G3",
            "geometry": "nonadjacent_common0_sum0",
            "mode": "ordinary_parent_p_u0_v0",
            "ordinary_parent": "isolated",
            "orders": "base n>=11",
            "core_orders": "q=|K|>=8",
            "condition": "K is nonempty and isolate-free",
        },
        "finite_seam_guard": {
            "already_closed_by_finite_all_mode_enumeration": "base 2<=n<=10",
            "not_closed_within_isolated_parent_base_class": None,
            "extra_isolates": (
                "Transferred separately by the pinned ordinary-parent isolate-padding "
                "theorem; this dense-core theorem asserts only the stripped base."
            ),
        },
        "certificate": certificate,
        "positive_denominator": str(sp.factor(denominator)),
        "proof_facts": {
            "exact_isolated_parent_reduction": str(isolated_exact),
            "row_substitution": (
                "For W=K+pK1, W_k=T_k+T_(k-1) and the parent-containing row "
                "R_k=T_(k-1)."
            ),
            "edge_interval": (
                "K isolate-free gives q/2<=e; forest acyclicity gives e<=q-1"
            ),
            "wedge_interval": (
                "2e^2/q-e<=Omega by degree Cauchy; Omega<=C(e,2)<=e^2/2"
            ),
            "subtree_interval": (
                "2Omega(Omega-e)/(3e)<=tau<=Omega*e/2"
            ),
            "exact_T4_identity": (
                "T4=C(q,4)-e*C(q-2,2)+Omega*(q-4)+C(e,2)-tau"
            ),
            "blocked_extensions": (
                "For k=4,...,7, (q-k)Tk-2e*C(q-2,k-1) <= "
                "(k+1)T(k+1) <= (q-k)Tk"
            ),
            "actual_point_embedding": (
                "Every isolate-free core K determines parameters in the certified unit box."
            ),
        },
        "exact_power_inversion": True,
        "coverage_gap_within_stated_isolated_parent_base_branch": None,
        "universal_ordinary_G3_guard": False,
        "dependencies_sha256": EXPECTED,
        "scope": (
            "Only the stripped isolated ordinary-parent p_u0_v0 nonadjacent/common0/"
            "sum0 rank-seven G3 base. The padding transfer, nonisolated parent, other "
            "geometries, and other parent modes are separate."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "coverage_gap_within_stated_isolated_parent_base_branch": None,
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
