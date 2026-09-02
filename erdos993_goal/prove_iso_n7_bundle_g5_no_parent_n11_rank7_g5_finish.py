#!/usr/bin/env python3
"""Fail-closed exact no-parent rank-seven g5 theorem for every n >= 11.

The five exhaustive marked geometries were computed once together and once
independently branch-by-branch.  This freezer requires byte-pinned inputs and
identical ordered exact Bernstein streams before it states the theorem.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g5_no_parent_n11_exact_rank7_g5_finish_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G5_NO_PARENT_N11_RANK7_G5_FINISH"
THRESHOLD = 11
FILES = {
    "engine_source": "probe_iso_n7_bundle_g5_all_geometries_coupled_moment_threshold11_rank7_g5_finish.py",
    "combined": "iso_n7_bundle_g5_all_geometries_coupled_moment_threshold11_probe_rank7_g5_finish_20260831.json",
    "adjacent": "iso_n7_bundle_g5_adjacent_coupled_moment_threshold11_probe_rank7_g5_finish_20260831.json",
    "common1": "iso_n7_bundle_g5_common1_coupled_moment_threshold11_probe_rank7_g5_finish_20260831.json",
    "sum0": "iso_n7_bundle_g5_sum0_coupled_moment_threshold11_probe_rank7_g5_finish_20260831.json",
    "sum1": "iso_n7_bundle_g5_sum1_coupled_moment_threshold11_probe_rank7_g5_finish_20260831.json",
    "sumge2": "iso_n7_bundle_g5_sumge2_coupled_moment_threshold11_probe_rank7_g5_finish_20260831.json",
    "parent_modes": "iso_n7_bundle_g5_parent_modes_probe_rank7_g5_tail_20260831.json",
    "g4_moment_source": "prove_iso_n7_bundle_g4_sum0_piecewise_bernstein_rank7_g4_piecewise.py",
    "g4_moment_report": "iso_n7_bundle_g4_sum0_piecewise_bernstein_exact_rank7_g4_piecewise_20260831.json",
    "g4_sum1_source": "prove_iso_n7_bundle_g4_sum1_coupled_moment_bernstein_rank7_g4_piecewise.py",
    "g4_sum1_report": "iso_n7_bundle_g4_sum1_coupled_moment_bernstein_exact_rank7_g4_piecewise_20260831.json",
    "bernstein_source": "probe_iso_n7_bundle_g5_threshold11_fast_rank7_g5_tail.py",
    "geometry_source": "prove_iso_n6_bundle_g4_marked_edge_bernstein_g1_bernstein.py",
}
EXPECTED = {
    "engine_source": "4FEAB95A47F8A57281EF3B084272DB595223590A914117C76D511F78833BC8DB",
    "combined": "4D3FC4FC11E5678A25E27E56A61FC29C5D54C46706612934B719CE8FEB716A15",
    "adjacent": "DF545624273D6AC55F7D4ECA1AAD27C627AB77822A5268052F24A3EED21E3977",
    "common1": "96EA1D6CC409526CBC9179E01C8126CE0CBBDA5D90D975A5304228B38651845C",
    "sum0": "15056D959DDEFF3E99138E4847EEBFA1C1937EC60FEB9D1B700BDE67F4A1395D",
    "sum1": "79F0304FE88A47AF77909B50A1FEDDF60E86B7F9AF208C9509CCAC638881AFDD",
    "sumge2": "49306C42A37DB336E492750E51431264B54F8DA868BB57A0D1EDE16C6E06A4C5",
    "parent_modes": "FF80D6A3F382E27E55316C6A31CE58D9D9E0DBC9027F38177F565ABA7D016309",
    "g4_moment_source": "24E9538B8DA863D884BA2522E6D10316181F21206BE53A5C472D80C9DCE62FB5",
    "g4_moment_report": "E602040E714BF069F56DFB6C2BE94728595B087C530FF77371777662550E99C1",
    "g4_sum1_source": "501E9E7F12781A5A3B2F821C78A8B251EC7A39EC72D47E0522AFE466AF7C136B",
    "g4_sum1_report": "7A3969BBCA7B945D72E33BB8A036F3C6747CEA960BA76CF1C51FD81A5C92844C",
    "bernstein_source": "C8C1ED22A53E5C624849D17741CF99714D63D33950191F8EFD9C7317E243A941",
    "geometry_source": "6B3106BCEE7F7ECA68C4C5B6861EF018E7E2023DFD8BA091CDAC1EA1FB0085A6",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(key: str):
    return json.loads((HERE / FILES[key]).read_text(encoding="utf-8"))


def main() -> None:
    for key, digest in EXPECTED.items():
        assert sha256(HERE / FILES[key]) == digest, key

    combined = load("combined")
    assert combined["threshold"] == THRESHOLD
    expected_geometry = [
        "adjacent",
        "nonadjacent_common1",
        "nonadjacent_common0_sum0",
        "nonadjacent_common0_sum1",
        "nonadjacent_common0_sum_ge2",
    ]
    assert [row["geometry"] for row in combined["rows"]] == expected_geometry
    combined_rows = {row["geometry"]: row["summary"] for row in combined["rows"]}
    independent = {
        "adjacent": load("adjacent")["rows"][0]["summary"],
        "nonadjacent_common1": load("common1")["rows"][0]["summary"],
        "nonadjacent_common0_sum0": load("sum0")["rows"][0]["summary"],
        "nonadjacent_common0_sum1": load("sum1")["rows"][0]["summary"],
        "nonadjacent_common0_sum_ge2": load("sumge2")["floor_summaries"]["shadow"],
    }
    for geometry in expected_geometry:
        # This equality includes the degree profile, exact coefficient count,
        # exact minimum, denominator and ordered full-stream digest.
        if geometry == "nonadjacent_common0_sum_ge2":
            # The independent engine names the two moment-box parameters y,z;
            # the combined engine names them q,r.  All ordered coefficients
            # and every other exact field must agree.
            assert combined_rows[geometry]["variables"] == ["a", "b", "c", "q", "r"]
            assert independent[geometry]["variables"] == ["a", "b", "c", "y", "z"]
            assert {
                key: value for key, value in combined_rows[geometry].items()
                if key != "variables"
            } == {
                key: value for key, value in independent[geometry].items()
                if key != "variables"
            }
        else:
            assert combined_rows[geometry] == independent[geometry], geometry
        assert combined_rows[geometry]["negative_tail_scalar_coefficients"] == 0
        assert sp.Rational(
            combined_rows[geometry]["minimum_tail_scalar_coefficient"]
        ) > 0

    # The bad-five shadow is used in the direction required by the exact g5
    # expression.  Verify that direction from the pinned reconstructed mode.
    parent = load("parent_modes")
    symbols = {"n": sp.Symbol("n", nonnegative=True)}
    for family in "WABZ":
        for rank in range(2, 8):
            symbols[f"{family}{rank}"] = sp.Symbol(
                f"{family}{rank}", nonnegative=True
            )
    expression = sp.expand(sp.sympify(
        parent["modes"]["no_parent"]["expression"], locals=symbols
    ))
    derivative = sp.factor(sp.diff(expression, symbols["W5"]))
    expected_derivative = -2*(
        22*symbols["A2"] + 22*symbols["B2"] + 21*symbols["W2"]
        + 13*symbols["Z2"] + 88*symbols["n"] + 16
    )
    assert sp.expand(derivative-expected_derivative) == 0

    summaries = {
        geometry: {
            "degree_profile": row["degree_profile"],
            "bernstein_controls": row["bernstein_controls"],
            "tail_scalar_coefficients": row["tail_scalar_coefficients"],
            "minimum_tail_scalar_coefficient": row["minimum_tail_scalar_coefficient"],
            "ordered_stream_sha256": row["ordered_stream_sha256"],
            "independent_stream_match": True,
        }
        for geometry, row in combined_rows.items()
    }
    report = {
        "marker": MARKER,
        "status": "proved exact",
        "threshold": THRESHOLD,
        "theorem": (
            "For every forest C of order n>=11 and every ordered pair of "
            "distinct marks u,v, the exact rank-seven bundle coefficient g5 "
            "in no-parent mode D=C is nonnegative."
        ),
        "geometries": expected_geometry,
        "summaries": summaries,
        "total_bernstein_controls": sum(
            row["bernstein_controls"] for row in combined_rows.values()
        ),
        "total_tail_scalar_coefficients": sum(
            row["tail_scalar_coefficients"] for row in combined_rows.values()
        ),
        "negative_tail_scalar_coefficients": 0,
        "proof_facts": {
            "geometry": (
                "The five boxes are exhaustive.  The adjacent box uses the exact "
                "r=m-e>=1, x+y<=r parameterization; sum1 uses A/B symmetry."
            ),
            "forest_moments": (
                "Omega is parameterized between 2e^2/m-e and e^2/2; tau is "
                "parameterized between 2Omega(Omega-e)/(3e) and Omega e/2."
            ),
            "exact_W4": (
                "bad4=e*C(m-2,2)-Omega*(m-4)-C(e,2)+tau and "
                "W4=C(m,4)-bad4."
            ),
            "W5_shadow": (
                "bad5>=(m-4)bad4/5 by extension double counting.  The exact "
                "W5 derivative is nonpositive, so W5=C(m,5)-bad5 is replaced "
                "by its valid upper bound in a lower certificate."
            ),
            "higher_rows": (
                "W6/W7 and A/B/Z higher rows use pinned exact edge-incidence "
                "and induced-forest containment intervals."
            ),
            "Bernstein": (
                "Every displayed control and tail coefficient is computed over "
                "the rationals; a second branch-by-branch run reproduces each "
                "ordered coefficient-stream digest exactly."
            ),
        },
        "W5_derivative": str(derivative),
        "dependencies_sha256": EXPECTED,
        "scope": (
            "Exact no-parent g5 theorem for n>=11.  Parent modes and finite "
            "orders n<=10 are separate pinned certificates."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    assert report["negative_tail_scalar_coefficients"] == 0
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    digest = hashlib.sha256(encoded.encode()).hexdigest().upper()
    print(json.dumps({
        "marker": MARKER,
        "negative_tail_scalar_coefficients": 0,
        "total_bernstein_controls": report["total_bernstein_controls"],
        "total_tail_scalar_coefficients": report["total_tail_scalar_coefficients"],
        "minima": {
            key: value["minimum_tail_scalar_coefficient"]
            for key, value in summaries.items()
        },
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", digest)
    print(MARKER)


if __name__ == "__main__":
    main()
