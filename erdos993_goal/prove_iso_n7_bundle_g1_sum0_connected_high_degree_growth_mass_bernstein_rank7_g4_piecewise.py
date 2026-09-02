#!/usr/bin/env python3
"""Exact all-order leaf-growth certificate for the connected G1 cone.

The cone keeps the exact degree stars, the universal connected-tree floor
P4>=n-3, the coupling -E5>=E4/2, and the safe E6/E7/E8 support caps.  Its
remaining J4/L5 trapezoid has nine exact tensor Bernstein controls.

For a leaf addition at a maximum-degree vertex, each control difference is a
polynomial of degree at most three in the degree-profile feature sums.  Split
each positive excess x_v=d_v-1 into x_v identical mass units.  Polarization
then writes the difference as a sum of one symmetric three-mass-unit kernel.
This program certifies every kernel coefficient on the complete domain
n>=40, 4<=d<=n-5, 1<=x,y,z<=d-1.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from analyze_iso_n7_bundle_g1_sum0_connected_high_degree_growth_kernel_rank7_g4_piecewise import (
    d,
    growth_differences,
    mass_triple_kernel,
    n,
    w,
    y,
    z,
)
from probe_iso_n7_bundle_g1_sum0_connected_high_degree_growth_mass_bernstein_rank7_g4_piecewise import (
    A,
    R,
    U,
    V,
    W,
    cube_bernstein_coefficients,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g1_sum0_connected_high_degree_growth_mass_bernstein_exact_rank7_g4_piecewise_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G1_SUM0_CONNECTED_HIGH_DEGREE_GROWTH_MASS_BERNSTEIN_RANK7_G4_PIECEWISE"
DEPENDENCIES = {
    "analyze_iso_n7_bundle_g1_sum0_connected_high_degree_growth_symbolic_rank7_g4_piecewise.py":
        "0C38A6BF758EB0D825A33028169784C9729A942E86B0FAB16F04648C234167C1",
    "analyze_iso_n7_bundle_g1_sum0_connected_high_degree_growth_kernel_rank7_g4_piecewise.py":
        "45BE71B408374A269F4B7D1B05C527D71CA56E26BC57E4758635478888A2F04A",
    "probe_iso_n7_bundle_g1_sum0_connected_high_degree_growth_mass_bernstein_rank7_g4_piecewise.py":
        "1884EED3B63BCCC5689E17D76071988D654E63A0FA198C538A1EA44C9015B96F",
}
UNIQUE_CONTROLS = (0, 3, 4, 5, 6, 7, 8)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def record_controls(stream, label, polynomial):
    degrees, controls = cube_bernstein_coefficients(polynomial)
    negative = 0
    minimum = None
    for key, value in sorted(controls.items()):
        negative += 1 if bool(value < 0) else 0
        candidate = (value, key)
        minimum = candidate if minimum is None else min(minimum, candidate)
        stream.update(f"{label}|{key}|{value}\n".encode("ascii"))
    return {
        "cube_degrees": list(degrees),
        "coefficient_count": len(controls),
        "negative_count": negative,
        "minimum": [str(minimum[0]), list(minimum[1])],
    }


def main() -> None:
    for name, digest in DEPENDENCIES.items():
        assert sha256(HERE/name) == digest, name

    differences = growth_differences()
    assert sp.expand(differences[0]-differences[1]) == 0
    assert sp.expand(differences[0]-differences[2]) == 0
    stream = hashlib.sha256()
    control_reports = []
    grand_total = 0
    grand_negative = 0
    global_minimum = None

    for index in UNIQUE_CONTROLS:
        kernel = mass_triple_kernel(differences[index])
        numerator, denominator = sp.cancel(kernel).as_numer_denom()
        factored_denominator = sp.factor(denominator)
        assert factored_denominator in (
            60480*(n-2)**3,
            120960*(n-2)**3,
        )
        sectors = []
        for maximum_excess in range(31):
            substitution = {
                n: 40+R,
                d: 4+maximum_excess,
                y: 1+(maximum_excess+2)*U,
                z: 1+(maximum_excess+2)*V,
                w: 1+(maximum_excess+2)*W,
            }
            sector = record_controls(
                stream,
                f"c{index}|a{maximum_excess}",
                numerator.subs(substitution),
            )
            sector["maximum_degree_excess"] = maximum_excess
            sectors.append(sector)

        tail_substitution = {
            n: 40+A+R,
            d: 35+A,
            y: 1+(33+A)*U,
            z: 1+(33+A)*V,
            w: 1+(33+A)*W,
        }
        tail = record_controls(
            stream, f"c{index}|tail", numerator.subs(tail_substitution)
        )
        coefficient_count = sum(sector["coefficient_count"] for sector in sectors)+tail["coefficient_count"]
        negative_count = sum(sector["negative_count"] for sector in sectors)+tail["negative_count"]
        local_minimum = min(
            [(sp.Rational(sector["minimum"][0]), "finite", sector["maximum_degree_excess"], sector["minimum"][1]) for sector in sectors]
            +[(sp.Rational(tail["minimum"][0]), "tail", None, tail["minimum"][1])]
        )
        assert coefficient_count == 125195
        assert negative_count == 0
        grand_total += coefficient_count
        grand_negative += negative_count
        global_minimum = local_minimum if global_minimum is None else min(global_minimum, local_minimum)
        control_reports.append({
            "control_index": index,
            "denominator": str(factored_denominator),
            "finite_sector_count": len(sectors),
            "finite_coefficient_count_each": sectors[0]["coefficient_count"],
            "tail_coefficient_count": tail["coefficient_count"],
            "coefficient_count": coefficient_count,
            "negative_count": negative_count,
            "minimum": [str(local_minimum[0]), local_minimum[1], local_minimum[2], local_minimum[3]],
        })

    assert grand_total == 876365
    assert grand_negative == 0
    assert global_minimum[0] == 358
    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": (
            "For the exact connected-tree degree-profile G1 relaxation defined "
            "by the pinned symbolic source, every one of its nine tensor "
            "Bernstein controls is nondecreasing under addition of a leaf to a "
            "maximum-degree vertex whenever n>=40, the old profile has at "
            "least three branching vertices, and maximum degree is at least 4."
        ),
        "mass_polarization": {
            "total_mass": "N=sum_v(d_v-1)=n-2",
            "feature_identity": (
                "sum_v C(d_v,r)=sum over N mass units of "
                "C(x+1,r)/x, where a vertex of excess x contributes x units"
            ),
            "kernel_identity": (
                "Each control difference has aggregate degree at most three, "
                "so it equals the ordered sum of its symmetric three-mass-unit kernel."
            ),
            "domain": "n>=40, 4<=d_max<=n-5, 1<=unit labels<=d_max-1",
        },
        "gapless_domain_partition": {
            "finite_sectors": (
                "d_max=4+a for a=0..30, n=40+R, and each unit label "
                "1+(a+2)u with R>=0 and 0<=u<=1"
            ),
            "tail_sector": (
                "d_max=35+A, n=40+A+R, and each unit label "
                "1+(33+A)u with A,R>=0 and 0<=u<=1"
            ),
            "coverage_gap": None,
        },
        "certificate": {
            "nine_controls": True,
            "identical_controls": [0, 1, 2],
            "unique_controls_checked": list(UNIQUE_CONTROLS),
            "unique_coefficient_count": grand_total,
            "negative_coefficient_count": grand_negative,
            "global_minimum_numerator_coefficient": str(global_minimum[0]),
            "control_reports": control_reports,
            "ordered_coefficient_stream_sha256": stream.hexdigest().upper(),
        },
        "coverage_gap_within_growth_scope": None,
        "scope": (
            "This proves all-order leaf-growth monotonicity for the stated "
            "degree-profile relaxation. A positive finite base and validity of "
            "every support cap are separate dependencies before promotion to "
            "actual connected-tree G1 nonnegativity."
        ),
        "dependencies_sha256": DEPENDENCIES,
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True)+"\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "unique_controls": len(UNIQUE_CONTROLS),
        "unique_coefficient_count": grand_total,
        "negative_coefficient_count": grand_negative,
        "global_minimum_numerator_coefficient": str(global_minimum[0]),
        "ordered_coefficient_stream_sha256": stream.hexdigest().upper(),
        "coverage_gap_within_growth_scope": None,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
