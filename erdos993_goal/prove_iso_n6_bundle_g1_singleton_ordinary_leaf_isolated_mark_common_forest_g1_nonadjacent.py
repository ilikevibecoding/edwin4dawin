#!/usr/bin/env python3
"""Exact all-order isolated-mark arbitrary-forest theorem for the G1 leaf delta."""

from __future__ import annotations

import copy
import gc
import hashlib
import json
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path

import sympy as sp

from explore_iso_n6_bundle_g1_singleton_ordinary_leaf_isolated_mark_common_forest_cone_g1_nonadjacent import (
    coefficient_sign,
)
from probe_iso_n5_disconnected_m5_componentwise_all_intervals_exact_g1_nonadjacent import (
    ratio_parameterization,
)
from probe_iso_n6_bundle_g1_singleton_ordinary_leaf_isolated_mark_common_forest_finite_g1_nonadjacent import (
    finite_certificate,
)
from probe_iso_n6_bundle_g1_singleton_ordinary_leaf_isolated_mark_common_forest_rank4_ratio_g1_nonadjacent import (
    common_expression,
    shift_and_homogenize,
    tensor_bernstein_general,
)
from validate_tensor_bernstein_general_sparse_equivalence import (
    reference,
    reference_shift,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "iso_n6_bundle_g1_singleton_ordinary_leaf_isolated_mark_common_forest_"
    "exact_g1_nonadjacent_20260831.json"
)
MARKER = (
    "PASS_EXACT_ISO_N6_BUNDLE_G1_SINGLETON_ORDINARY_LEAF_ISOLATED_MARK_"
    "COMMON_FOREST_G1_NONADJACENT"
)
PINNED = {
    "large_cone_engine": (
        "probe_iso_n6_bundle_g1_singleton_ordinary_leaf_isolated_mark_common_forest_rank4_ratio_g1_nonadjacent.py",
        "35D61A4FD392AEC269CFE4A39A4A89FD4DFE2F6BCD224EEA15ADDEFA3F26E6E8",
    ),
    "finite_engine": (
        "probe_iso_n6_bundle_g1_singleton_ordinary_leaf_isolated_mark_common_forest_finite_g1_nonadjacent.py",
        "6AEF4F8F1EABC1E898E6228ED21B6500E962B0D3B4943C9A8C9155DE2B63C29F",
    ),
    "transform_equivalence_engine": (
        "validate_tensor_bernstein_general_sparse_equivalence.py",
        "F0B0AE1178EA47AB6BB633ED9C7716C326183BAFA6185AB5D62894944AEB76C6",
    ),
    "common_forest_formula": (
        "explore_iso_n6_bundle_g1_singleton_ordinary_leaf_isolated_mark_common_forest_cone_g1_nonadjacent.py",
        "74D28ED2F14C2303E411FF6B1945F8C6C6ED05E03BF351FF447A6AC56BCD4D0B",
    ),
    "leaf_delta_formula": (
        "explore_iso_n6_bundle_g1_singleton_ordinary_leaf_motif_ie_cutoff_g1_nonadjacent.py",
        "C0B8BD01DBE2B1C2D798C426B49A1F1B5DE4C4566A2B1B2C7C86068540820015",
    ),
    "rank6_ratio_cone": (
        "probe_iso_n5_disconnected_m5_componentwise_all_intervals_exact_g1_nonadjacent.py",
        "72795F07C3C0A30CF0B6E05C2980AA97367763EEC6AC8B43514F873AA23D6CFF",
    ),
    "unlabeled_forest_generator": (
        "prove_iso_n5_c5_disconnected_nonadjacent_g1_nonadjacent.py",
        "DD1112EC4A72A9DA18979084D03462AC0073E8C86927E3306142171E39134A05",
    ),
    "forest_independence_polynomial": (
        "probe_iso_leaf_cross_remainder_root.py",
        "A9C643C3A223E004365E5013A2433517BC60073D1B230D92477FFDC7E3B6A5F1",
    ),
    "large_sibling_tail_source": (
        "prove_iso_n6_bundle_g1_singleton_ordinary_leaf_large_sibling_tail_g1_nonadjacent.py",
        "15A54315418206D19A72C65D7014A66AD30B65E2C0EA52190BD99E1B1B944EF2",
    ),
    "large_sibling_tail_report": (
        "iso_n6_bundle_g1_singleton_ordinary_leaf_large_sibling_tail_exact_g1_nonadjacent_20260831.json",
        "6D33CE02C35DE5E52225952CE36838A0AD23206B0D7ACC0B47183A62B6CDD34D",
    ),
}
EXPECTED_LARGE = {
    ("collision", "high"): {
        "power_terms": 330054,
        "cube_degrees": [6, 6, 6, 7],
        "bernstein_rows": 2744,
        "positive": 8532574,
        "minimum": "11/42000",
        "rows_sha256": "B73673803222C8E064F41E7CE74BC4E9392476BE09373EC6715B3B20A97F15E4",
    },
    ("collision", "low"): {
        "power_terms": 239694,
        "cube_degrees": [6, 6, 6, 2, 7],
        "bernstein_rows": 8232,
        "positive": 8524635,
        "minimum": "1/1200",
        "rows_sha256": "56FD73584D37814E84E3E28E852E433007962B047899F04C6C4AC82D83BE044C",
    },
    ("distinct", "high"): {
        "power_terms": 330129,
        "cube_degrees": [6, 6, 6, 7],
        "bernstein_rows": 2744,
        "positive": 8532574,
        "minimum": "11/42000",
        "rows_sha256": "4C5F11E48DF5599521CB9A1A6BBB5A42632BCBD74C29734A197E65FD9CEC9A3D",
    },
    ("distinct", "low"): {
        "power_terms": 239747,
        "cube_degrees": [6, 6, 6, 2, 7],
        "bernstein_rows": 8232,
        "positive": 8524635,
        "minimum": "1/1200",
        "rows_sha256": "1F49C275351B16416744071B7B4C71272DEE27787B59F25CE97EFE7CB38200AA",
    },
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def transform_equivalence_certificate():
    variables = sp.symbols("N h A B w tau z0 z1")
    N, h, A, B, w, tau, z0, z1 = variables
    expression = sp.expand(
        7 * N**3 * A**2 * w * z0
        - 5 * h * B**3 * tau**2 * z1
        + 11 * N * h**2 * A * B * w**2 * tau
        + 13 * A**2 * B**2 * tau**3 * z0 * z1
        - 17 * N**2 * w**2 * z1**2
        + 19
    )
    polynomial = sp.Poly(expression, *variables)
    expected = reference(polynomial, 2, 4)
    actual = tensor_bernstein_general(polynomial, 2, 4)
    assert actual == expected
    expected_shift = reference_shift(expected[1], 2, 2)
    actual_shift = shift_and_homogenize(
        copy.deepcopy(actual[1]), 2, 2, progress=False
    )
    assert actual_shift == expected_shift
    return {
        "marker": "PASS_EXACT_TENSOR_BERNSTEIN_GENERAL_SPARSE_STREAM_EQUIVALENCE",
        "power_terms": len(polynomial.terms()),
        "cube_degrees": actual[0],
        "tensor_rows": len(actual[1]),
        "positive": actual_shift[0],
        "negative": actual_shift[1],
        "minimum": str(actual_shift[2]),
        "rows_sha256": actual_shift[3],
    }


def large_sector_certificate(task):
    mode, sector = task
    n = sp.Symbol("n", integer=True, positive=True)
    N, h, t = sp.symbols("N h t", integer=True, nonnegative=True)
    A, B = sp.symbols("A B", nonnegative=True)
    tau = sp.Symbol("tau", nonnegative=True)
    k = (sp.Integer(1), N, *sp.symbols(
        "k2:8", integer=True, nonnegative=True
    ))
    mark_count = 3 if mode == "collision" else 4
    expression = common_expression(mode, n, N, h, t, k)
    derivative = sp.expand(sp.diff(expression, k[7]))
    sign = coefficient_sign(
        derivative, (N, h, t, *tuple(x for x in k[2:] if x != k[7]))
    )
    assert sign == -1
    extension_bound = sp.Rational(1, 7) * (N - 6) * k[6]
    lower = sp.expand(expression.subs(k[7], extension_bound))
    bounded = sp.expand(lower.subs(
        t, sp.Rational(11, 10) * (N + h + mark_count) * tau
    ))
    cubes, simplex, substitutions, cone, rho1 = ratio_parameterization(
        sector, N, A, B, k, 6
    )
    substituted = sp.factor(bounded.subs(substitutions))
    numerator, denominator = sp.fraction(sp.together(substituted))
    assert denominator.is_Rational and denominator > 0
    all_cubes = (*cubes, tau)
    variables = (N, h, *all_cubes, *simplex)
    polynomial = sp.Poly(numerator, *variables)
    power_terms = len(polynomial.terms())
    degrees, rows = tensor_bernstein_general(
        polynomial, power_count=2, cube_count=len(all_cubes)
    )
    del polynomial, numerator, substituted, bounded, lower, expression
    gc.collect()
    positive, negative, minimum, rows_digest = shift_and_homogenize(
        rows,
        power_count=2,
        simplex_length=len(simplex),
        threshold=13,
        progress=False,
    )
    result = {
        "mode": mode,
        "sector": sector,
        "cone": cone,
        "rho1_edge_identity": str(rho1),
        "top_endpoint_derivative_coefficient_sign": sign,
        "extension_ceiling": "k7 <= (N-6)k6/7",
        "low_sibling_guard": "t=(11/10)(N+h+marks)tau, 0<=tau<=1",
        "positive_denominator": str(denominator),
        "power_terms": power_terms,
        "cube_degrees": degrees,
        "bernstein_rows": len(rows),
        "homogeneous_positive": positive,
        "homogeneous_negative": negative,
        "minimum": str(minimum),
        "rows_sha256": rows_digest,
    }
    expected = EXPECTED_LARGE[task]
    assert result["power_terms"] == expected["power_terms"]
    assert result["cube_degrees"] == expected["cube_degrees"]
    assert result["bernstein_rows"] == expected["bernstein_rows"]
    assert result["homogeneous_positive"] == expected["positive"]
    assert result["homogeneous_negative"] == 0
    assert result["minimum"] == expected["minimum"]
    assert result["rows_sha256"] == expected["rows_sha256"]
    return result


def main():
    for _label, (name, expected) in PINNED.items():
        assert sha256(HERE / name) == expected

    equivalence = transform_equivalence_certificate()
    finite = {
        mode: finite_certificate(mode, verbose=False)
        for mode in ("collision", "distinct")
    }
    tasks = [
        ("collision", "high"),
        ("collision", "low"),
        ("distinct", "high"),
        ("distinct", "low"),
    ]
    with ProcessPoolExecutor(max_workers=4) as executor:
        futures = {task: executor.submit(large_sector_certificate, task) for task in tasks}
        large = {f"{mode}_{sector}": futures[(mode, sector)].result()
                 for mode, sector in tasks}

    report = {
        "marker": MARKER,
        "rank": 6,
        "coefficient": "g1",
        "canonical_mode": "singleton_ordinary ordinary-leaf reduction",
        "family": {
            "common_core": "an arbitrary anonymous forest K of order N",
            "extra_isolates": "h arbitrary anonymous isolates",
            "mark_placement": (
                "all distinguished core marks are isolated: p,u,v in collision; "
                "p,q,u,v in distinct"
            ),
            "sibling_count": "t arbitrary after adjoining the pinned large-sibling tail",
        },
        "proof_partition": {
            "finite": "all unlabeled forests N=0,...,13, exact tau-Bernstein rows",
            "large": "N>=13, exact max-rank6 ratio cone in high/low gap sectors",
            "sibling_low": "10t<=11n, parameterized by tau in [0,1]",
            "sibling_high": "10t>=11n, pinned universal large-sibling-tail theorem",
            "overlaps": "N=13 and 10t=11n are deliberately covered on both sides",
        },
        "transform_equivalence": equivalence,
        "finite_certificates": finite,
        "large_certificates": large,
        "checks": {
            "finite_both_modes_exact_nonnegative": True,
            "large_four_sectors_exact_nonnegative": True,
            "all_four_large_row_hashes_locked": True,
            "order_partition_gapless": True,
            "sibling_partition_gapless": True,
            "sparse_stream_transform_matches_reference_exactly": True,
        },
        "theorem": (
            "For every singleton-ordinary rank-six G1 ordinary-leaf instance in "
            "which all distinguished core marks are isolated and the remaining "
            "common core is an arbitrary forest, the complete leaf increment is "
            "nonnegative for every sibling count."
        ),
        "remaining_obligation": (
            "singleton-ordinary >=5-edge low-sibling cores in which one or more "
            "distinguished marks are incident with a core edge, plus the other "
            "canonical rank-six G1 modes outside this leaf slice"
        ),
        "scope_guard": (
            "This theorem closes the arbitrary-common-forest isolated-mark slice; "
            "it is not the universal rank-six G1 theorem, all N6, or Problem 993."
        ),
        "pinned_dependencies": {
            label: {"file": name, "sha256": expected}
            for label, (name, expected) in PINNED.items()
        },
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    report_hash = hashlib.sha256(raw.encode()).hexdigest().upper()
    print(json.dumps({
        "marker": MARKER,
        "checks": report["checks"],
        "large_certificates": {
            key: {
                "minimum": value["minimum"],
                "rows_sha256": value["rows_sha256"],
            }
            for key, value in large.items()
        },
        "remaining_obligation": report["remaining_obligation"],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", report_hash)
    print(MARKER)


if __name__ == "__main__":
    main()
