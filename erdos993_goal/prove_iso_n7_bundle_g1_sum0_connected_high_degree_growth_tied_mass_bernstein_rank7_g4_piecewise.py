#!/usr/bin/env python3
"""Exact tied-maximum leaf-growth certificate for the connected G1 cone."""

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
)
from prove_iso_n7_bundle_g1_sum0_connected_high_degree_growth_mass_bernstein_rank7_g4_piecewise import (
    record_controls,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g1_sum0_connected_high_degree_growth_tied_mass_bernstein_exact_rank7_g4_piecewise_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G1_SUM0_CONNECTED_HIGH_DEGREE_GROWTH_TIED_MASS_BERNSTEIN_RANK7_G4_PIECEWISE"
DEPENDENCIES = {
    "analyze_iso_n7_bundle_g1_sum0_connected_high_degree_growth_symbolic_rank7_g4_piecewise.py":
        "0C38A6BF758EB0D825A33028169784C9729A942E86B0FAB16F04648C234167C1",
    "analyze_iso_n7_bundle_g1_sum0_connected_high_degree_growth_kernel_rank7_g4_piecewise.py":
        "45BE71B408374A269F4B7D1B05C527D71CA56E26BC57E4758635478888A2F04A",
    "probe_iso_n7_bundle_g1_sum0_connected_high_degree_growth_mass_bernstein_rank7_g4_piecewise.py":
        "1884EED3B63BCCC5689E17D76071988D654E63A0FA198C538A1EA44C9015B96F",
    "prove_iso_n7_bundle_g1_sum0_connected_high_degree_growth_mass_bernstein_rank7_g4_piecewise.py":
        "8F1472DB8344C52FDEFFE3BC331107707A5BFB5AF7643ED013AF4B1D1C0E95F5",
}
UNIQUE_CONTROLS = (0, 3, 4, 5, 6, 7, 8)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    for name, digest in DEPENDENCIES.items():
        assert sha256(HERE/name) == digest, name
    differences = growth_differences()
    assert sp.expand(differences[0]-differences[1]) == 0
    assert sp.expand(differences[0]-differences[2]) == 0
    stream = hashlib.sha256()
    reports = []
    grand_total = 0
    grand_negative = 0
    global_minimum = None
    for index in UNIQUE_CONTROLS:
        kernel = mass_triple_kernel(differences[index])
        numerator, denominator = sp.cancel(kernel).as_numer_denom()
        factored_denominator = sp.factor(denominator)
        assert factored_denominator in (60480*(n-2)**3, 120960*(n-2)**3)
        sectors = []
        for maximum_excess in range(33):
            substitution = {
                n: 41+R,
                d: 3+maximum_excess,
                y: 1+(maximum_excess+2)*U,
                z: 1+(maximum_excess+2)*V,
                w: 1+(maximum_excess+2)*W,
            }
            sector = record_controls(
                stream, f"c{index}|a{maximum_excess}",
                numerator.subs(substitution),
            )
            sector["selected_degree_excess"] = maximum_excess
            sectors.append(sector)
        tail = record_controls(stream, f"c{index}|tail", numerator.subs({
            n: 41+A+R,
            d: 36+A,
            y: 1+(35+A)*U,
            z: 1+(35+A)*V,
            w: 1+(35+A)*W,
        }))
        count = sum(sector["coefficient_count"] for sector in sectors)+tail["coefficient_count"]
        negative = sum(sector["negative_count"] for sector in sectors)+tail["negative_count"]
        local_minimum = min(
            [(sp.Rational(sector["minimum"][0]), "finite", sector["selected_degree_excess"], sector["minimum"][1]) for sector in sectors]
            +[(sp.Rational(tail["minimum"][0]), "tail", None, tail["minimum"][1])]
        )
        assert count == 132055
        assert negative == 0
        grand_total += count
        grand_negative += negative
        global_minimum = local_minimum if global_minimum is None else min(global_minimum, local_minimum)
        reports.append({
            "control_index": index,
            "denominator": str(factored_denominator),
            "finite_sector_count": len(sectors),
            "finite_coefficient_count_each": sectors[0]["coefficient_count"],
            "tail_coefficient_count": tail["coefficient_count"],
            "coefficient_count": count,
            "negative_count": negative,
            "minimum": [str(local_minimum[0]), local_minimum[1], local_minimum[2], local_minimum[3]],
        })
    assert grand_total == 924385
    assert grand_negative == 0
    assert global_minimum[0] == 358
    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": (
            "Every tensor control of the connected-tree degree-profile G1 "
            "relaxation is nondecreasing under a leaf addition at a selected "
            "vertex of degree d when the old order n>=41, 3<=d<=n-5, and "
            "every old degree excess is at most d. This includes decrementing "
            "one part of a tied maximum in the new profile."
        ),
        "mass_polarization": {
            "total_mass": "N=n-2",
            "selected_degree_domain": "3<=d<=n-5",
            "mass_unit_domain": "1<=unit label<=d",
        },
        "gapless_domain_partition": {
            "finite_sectors": (
                "d=3+a for a=0..32, n=41+R, unit=1+(a+2)u, "
                "R>=0, 0<=u<=1"
            ),
            "tail_sector": (
                "d=36+A, n=41+A+R, unit=1+(35+A)u, "
                "A,R>=0, 0<=u<=1"
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
            "control_reports": reports,
            "ordered_coefficient_stream_sha256": stream.hexdigest().upper(),
        },
        "coverage_gap_within_tied_growth_scope": None,
        "scope": (
            "Exact all-order growth theorem for the degree-profile relaxation. "
            "The order-41 base and support-cap validity remain separate "
            "dependencies before actual connected-tree G1 promotion."
        ),
        "dependencies_sha256": DEPENDENCIES,
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True)+"\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "unique_coefficient_count": grand_total,
        "negative_coefficient_count": grand_negative,
        "global_minimum_numerator_coefficient": str(global_minimum[0]),
        "ordered_coefficient_stream_sha256": stream.hexdigest().upper(),
        "coverage_gap_within_tied_growth_scope": None,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
