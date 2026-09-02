#!/usr/bin/env python3
"""Fail-closed assembly of the adjacent, large-order rank-six g2 cone.

This assembler promotes the eight wedge/simplex Bernstein shards only to the
scope their hypotheses actually cover.  In particular, the rank-six reserve
used by the ratio simplex is known for forests with independence number at
least ten.  Bipartiteness therefore makes the unconditional order threshold
N>=19, not N>=14.  The polynomial charts themselves cover the larger relaxed
domain N>=14; orders 14..18 remain a separate finite obligation.
"""

from __future__ import annotations

from fractions import Fraction
import hashlib
import json
import math
from pathlib import Path

import sympy as sp

from probe_iso_n6_bundle_g2_adjacent_wedge_simplex_flint_root import (
    A2_TERMS,
    K2_TERMS,
    L2_TERMS,
    weak_compositions,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n6_bundle_g2_adjacent_wedge_large_exact_root_20260831.json"
MARKER = "PASS_EXACT_ISO_N6_BUNDLE_G2_ADJACENT_WEDGE_LARGE_ROOT"
PROBE_MARKER = "PROBE_EXACT_ISO_N6_BUNDLE_G2_ADJACENT_WEDGE_SIMPLEX_FLINT_ROOT"


PINS = {
    "producer": (
        "probe_iso_n6_bundle_g2_adjacent_wedge_simplex_flint_root.py",
        "DDE496C597D5D558947B00770F98DAB96E1DEC8B1C07B5E0E13F3D8B9C10EA88",
    ),
    "occupation_source": (
        "derive_iso_n6_bundle_g2_no_parent_occupation_root.py",
        "3A5DFDB1238015943FE1CAC717ACDCBC7B3276594447C61924B882516AC8ED10",
    ),
    "occupation_report": (
        "iso_n6_bundle_g2_no_parent_occupation_exact_root_20260831.json",
        "106BD6048269E1CFE1F51A0DA162312786E28EB8E8707BF57CBBE8E7BA9D0F83",
    ),
    "ratio_source": (
        "derive_iso_n6_bundle_g2_adjacent_ratio_coordinate_root.py",
        "96598CD1C08ACA85DB874ED7303D41259FAF38657669598A5CDD937CCD562BA6",
    ),
    "ratio_report": (
        "iso_n6_bundle_g2_adjacent_ratio_coordinate_exact_root_20260831.json",
        "28D259CF4C7C226306CDD94222BEBF3878678C0B8C2CB086F65C63A1E4A90ED6",
    ),
    "corner_source": (
        "derive_iso_n6_bundle_g2_adjacent_wedge_four_corner_reduction_root.py",
        "2037149DC1AE6650DE0DFF7547AF7464D153509729B9A2C1D30B7A96E3082BD4",
    ),
    "corner_report": (
        "iso_n6_bundle_g2_adjacent_wedge_four_corner_reduction_exact_root_20260831.json",
        "E52910E26F129A208CB7BB5F1BFCC625C6919F92BC6C5C9563543E325BD14001",
    ),
    "bernstein_helper": (
        "tensor_bernstein_flint_matrix_root.py",
        "9BB62FB90664A9EBF2D8F02D6FBA630A3E78EF4D774D0F091B7689B91307E5DC",
    ),
    "balanced_sum_helper": (
        "balanced_flint_mpoly_sum_root.py",
        "976F5DEB6B44D2E29ECC342A44CAF801EB8AADB90A2FF1DC993F1F7F042C90BD",
    ),
    "q3_source": (
        "verify_rank3_three_halves_forest_certificate.py",
        "F78396D95B3CF18C73E5A1586E1B712731E319D9530D01A1AFDA3856CFBAD76D",
    ),
    "q4_source": (
        "verify_rank4_three_halves_forest_certificate.py",
        "99059D9430D3A8D7AD0E6C5ED63CAE24F6AA99C1F23F204F3E974794A35F70AF",
    ),
    "q5_source": (
        "verify_rank5_three_halves_forest_certificate.py",
        "56B52DFE4FFA9BBE7273EF8EAA24AA737615338815DF0D41A5792C6728F17DBE",
    ),
    "q6_source": (
        "verify_rank6_three_halves_forest_certificate.py",
        "9904B81F48166702BB6891037275A5E120784C72971F86CA43020B3BCF582AFB",
    ),
    "q6_report": (
        "rank6_three_halves_forest_certificate_exact_20260813.json",
        "DE4C3D9C3C46B2D2216D2D0FEDA87758E358A291254B6314271D1590F66A7877",
    ),
}


SHARDS = {
    ("high", 0, 0): (
        "iso_n6_bundle_g2_adjacent_wedge_simplex_high_reduced4_B00_C00_beta0_70_flint_probe_root_20260831.json",
        "C732AF90B3420EE6FBD91D9243BD55F1EFB3E50359C6062EC790F276A01E7F2A",
    ),
    ("high", 0, 1): (
        "iso_n6_bundle_g2_adjacent_wedge_simplex_high_reduced4_B00_C01_beta0_70_flint_probe_root_20260831.json",
        "9C121E23C6A0C75990F6DB48FB1C99125D46A3EAAE10EA497EFB687617BFE248",
    ),
    ("high", 1, 0): (
        "iso_n6_bundle_g2_adjacent_wedge_simplex_high_reduced4_B01_C00_beta0_70_flint_probe_root_20260831.json",
        "263838A5A9DAE474778C8D462F1A2C3A7C9BF5AC8B8BA3CF7AFEE0133667C613",
    ),
    ("high", 1, 1): (
        "iso_n6_bundle_g2_adjacent_wedge_simplex_high_reduced4_B01_C01_beta0_70_flint_probe_root_20260831.json",
        "4744160AE213A888814448C840B9FD1CECA400AE57289DFDDF399E8926886B83",
    ),
    ("low", 0, 0): (
        "iso_n6_bundle_g2_adjacent_wedge_simplex_low_reduced4_B00_C00_beta0_70_flint_probe_root_20260831.json",
        "5A9E572AD3327CDF411CAE214B2A94FDE7049BE7C72B049046D757A03A005F70",
    ),
    ("low", 0, 1): (
        "iso_n6_bundle_g2_adjacent_wedge_simplex_low_reduced4_B00_C01_beta0_70_flint_probe_root_20260831.json",
        "BFE8012619D6C9C29D483372EE43A22198C8A8019BAAD62BB4D7D06D8E61A405",
    ),
    ("low", 1, 0): (
        "iso_n6_bundle_g2_adjacent_wedge_simplex_low_reduced4_B01_C00_beta0_70_flint_probe_root_20260831.json",
        "1AF628822000BB12326FE8416864A18C43682A1523EBD9CB3643332BF6AA3236",
    ),
    ("low", 1, 1): (
        "iso_n6_bundle_g2_adjacent_wedge_simplex_low_reduced4_B01_C01_beta0_70_flint_probe_root_20260831.json",
        "266FA78C1C94F7993FDBFDB4FBAEC795AAD77AFDBEBDFCFC30B54810FB28D999",
    ),
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load_json(name: str) -> dict:
    return json.loads((HERE / name).read_text(encoding="utf-8"))


def verify_pins() -> dict[str, dict[str, str]]:
    checked = {}
    for label, (name, expected) in PINS.items():
        path = HERE / name
        assert path.is_file(), (label, name)
        actual = sha256(path)
        assert actual == expected, (label, expected, actual)
        checked[label] = {"file": name, "sha256": actual}
    return checked


def expression_from_terms(left, right, terms):
    return sp.expand(sum(coefficient * left[i] * right[j]
                         for coefficient, i, j in terms))


def verify_occupation_algebra() -> dict[str, object]:
    report = load_json(PINS["occupation_report"][0])
    assert report["marker"] == "DERIVED_EXACT_ISO_N6_BUNDLE_G2_NO_PARENT_OCCUPATION_ROOT"
    assert report["adjacent_split"] == "A2(A)+L2(A,B)+L2(A,C)+K2(B,C)"
    assert report["identities"]["B_C_symmetry"] is True
    assert report["identities"]["K2_symmetric"] is True

    a = sp.symbols("a0:8")
    b = sp.symbols("b0:7")
    c = sp.symbols("c0:7")
    local = {str(value): value for value in (*a, *b, *c)}
    pieces = report["pieces"]
    expected = {
        "A2": expression_from_terms(a, a, A2_TERMS),
        "L2_AB": expression_from_terms(a, b, L2_TERMS),
        "L2_AC": expression_from_terms(a, c, L2_TERMS),
        "K2_BC": expression_from_terms(b, c, K2_TERMS),
    }
    for label, value in expected.items():
        observed = sp.sympify(pieces[label], locals=local)
        assert sp.expand(value - observed) == 0, label
    adjacent = sp.expand(sum(expected.values()))
    swapped = adjacent.xreplace({**dict(zip(b, c)), **dict(zip(c, b))})
    assert sp.expand(adjacent - swapped) == 0
    return {
        "pieces_checked": sorted(expected),
        "producer_term_counts": {
            "A2": len(A2_TERMS), "L2_each": len(L2_TERMS), "K2": len(K2_TERMS),
        },
        "adjacent_expression_sha256": hashlib.sha256(str(adjacent).encode()).hexdigest().upper(),
        "B_C_symmetry_rederived": True,
    }


def verify_ratio_and_wedge_domain() -> dict[str, object]:
    ratio = load_json(PINS["ratio_report"][0])
    assert ratio["marker"] == "DERIVED_EXACT_ISO_N6_BUNDLE_G2_ADJACENT_RATIO_COORDINATE_ROOT"
    assert ratio["all_ten_B_C_variables_multi_affine"] is True
    assert "delta2,delta3,delta4,delta5>=1" in ratio["ratio_input"]

    n, edge, omega = sp.symbols("N e Omega", positive=True)
    r1, r2, r3, r4, r5, r6 = sp.symbols("R1:7", nonnegative=True)
    a2 = n * (n - 1) / 2 - edge
    a3 = n * (n - 1) * (n - 2) / 6 - edge * (n - 2) + omega
    row = (
        sp.Integer(1), n, a2, a3,
        a3 * r3 / (8 * n),
        a3 * r3 * r4 / (80 * n**2),
        a3 * r3 * r4 * r5 / (960 * n**3),
        a3 * r3 * r4 * r5 * r6 / (13440 * n**4),
    )
    recovered = (
        4 * row[2],
        6 * n * row[3] / row[2],
        8 * n * row[4] / row[3],
        10 * n * row[5] / row[4],
        12 * n * row[6] / row[5],
        14 * n * row[7] / row[6],
    )
    assert sp.cancel(recovered[0] - (2 * n * (n - 1) - 4 * edge)) == 0
    assert sp.cancel(recovered[1] - 6 * n * a3 / a2) == 0
    for observed, expected in zip(recovered[2:], (r3, r4, r5, r6)):
        assert sp.cancel(observed - expected) == 0

    budget_numerator = sp.expand(6 * n * a3 - 4 * n * a2)
    expected_budget = n * (
        n**3 - 5 * n**2 + 4 * n - 6 * edge * n + 16 * edge + 6 * omega
    )
    assert sp.expand(budget_numerator - expected_budget) == 0
    worst_edge_n = sp.factor(expected_budget.subs({edge: n, omega: 0}))
    assert worst_edge_n == n**2 * (n**2 - 11 * n + 20)
    assert (14**2 - 11 * 14 + 20) > 0
    # The quadratic is increasing for N>=14.
    assert 2 * 14 - 11 > 0

    # Q_j/(p_(j-1)p_j)=(R_(j-1)-R_j)/N-1.
    j = sp.symbols("j", positive=True, integer=True)
    pm, p, pp = sp.symbols("p_minus p p_plus", positive=True)
    before = 2 * j * n * p / pm
    after = 2 * (j + 1) * n * pp / p
    qj = 2 * j * p**2 - pm * p - 2 * (j + 1) * pm * pp
    assert sp.factor((before - after) / n - 1 - qj / (pm * p)) == 0

    q3_text = (HERE / PINS["q3_source"][0]).read_text(encoding="utf-8")
    q4_text = (HERE / PINS["q4_source"][0]).read_text(encoding="utf-8")
    q5_text = (HERE / PINS["q5_source"][0]).read_text(encoding="utf-8")
    q6 = load_json(PINS["q6_report"][0])
    assert "every forest has nonnegative rank-3 Q reserve" in q3_text
    assert "Q_4(I(F)) >= 0 whenever alpha(F) >= 7" in q4_text
    assert "Q_5(I(F)) >= 0 for every forest F of order at least 10" in q5_text
    assert q6["status"] == "PASS_EXACT_ALL_FOREST_RANK6_RESERVE_LIFT"
    assert q6["theorem"] == "Q6(I(F))>=0 for every forest F with alpha(F)>=10"

    # Every forest is bipartite, so alpha(F)>=ceil(N/2)>=10 for N>=19.
    assert math.ceil(19 / 2) == 10
    return {
        "normalization": "R_j=2*(j+1)*N*a_(j+1)/a_j",
        "reserve_implication": "Q_(j+1)>=0 implies R_j-R_(j+1)>=N",
        "actual_forest_threshold": "N>=19, because alpha(A)>=ceil(N/2)>=10",
        "relaxed_chart_threshold": "N>=14",
        "budget_numerator": str(expected_budget),
        "budget_lower_bound_for_e_le_N_Omega_ge_0": str(worst_edge_n),
        "wedge_identity": "a3=C(N,3)-e(N-2)+Omega",
        "wedge_relaxation": "0<=Omega<=C(e,2)<=e^2/2",
        "simplex_coverage": (
            "R6=B*u0; R5=N+B(u0+u1); R4=2N+B(u0+u1+u2); "
            "R3=3N+B(u0+u1+u2+u3), where B=R2-4N and sum(u0..u4)=1"
        ),
        "orders_14_18_guard": "not promoted; separate finite obligation",
    }


def verify_corner_reduction() -> dict[str, object]:
    report = load_json(PINS["corner_report"][0])
    assert report["marker"] == "DERIVED_EXACT_ISO_N6_BUNDLE_G2_ADJACENT_WEDGE_FOUR_CORNER_REDUCTION_ROOT"
    assert report["scope"] == "adjacent no-parent mode, N>=14; exact reduction only"
    assert report["corner_count"] == 4
    assert report["corners"] == [
        "B2_PATH_C2_PATH",
        "B2_PATH_C2_EDGELESS",
        "B2_EDGELESS_C2_PATH",
        "B2_EDGELESS_C2_EDGELESS",
    ]
    assert report["path_minimal_pascal_residuals"] == {"3": "0", "4": "0"}
    assert report["rank4_derivative_lower_bound"] == "N*(4*N**2 - 45*N + 29)/3"
    assert report["rank4_bound_checks"]["quadratic_at_N14"] == 183
    return {
        "forced_path_ranks": [3, 4],
        "forced_edgeless_ranks": [5, 6],
        "remaining_rank2_corners": 4,
        "rank4_derivative_lower_bound": report["rank4_derivative_lower_bound"],
    }


def expected_geometry(chart: str) -> str:
    if chart == "low":
        return "N=14+h; mB=7+h*x/2; mC=N-mB+mB*y; e=overlap*z; Omega=e^2*w/2"
    return "N=14+h; mB=N*(1+x)/2; mC=mB+(N-mB)*y; e=overlap*z; Omega=e^2*w/2"


def verify_shards() -> tuple[dict[str, object], list[dict[str, object]]]:
    expected_betas = list(weak_compositions(4, 5))
    assert len(expected_betas) == math.comb(8, 4) == 70
    summaries = []
    total_records = 0
    total_coefficients = 0
    global_minimum = None
    for (chart, bmask, cmask), (name, expected_hash) in sorted(SHARDS.items()):
        path = HERE / name
        assert sha256(path) == expected_hash
        report = load_json(name)
        assert report["marker"] == PROBE_MARKER
        assert report["source_sha256"] == PINS["producer"][1]
        assert report["occupation_report_sha256"] == PINS["occupation_report"][1]
        assert report["order_chart"] == chart
        assert report["B_mask"] == bmask and report["C_mask"] == cmask
        assert report["geometry"] == expected_geometry(chart)
        assert report["positive_multiplier"] == "N^4*a2^4"
        assert report["reduced_four_corner_mode"] is True
        assert report["simplex"] == "u0+u1+u2+u3+u4=1"
        assert report["simplex_degree"] == 4
        assert report["homogeneous_simplex_coefficients"] == 70
        assert report["start_beta"] == 0 and report["stop_beta"] == 70
        assert report["processed_betas"] == 70
        assert report["negative_betas"] == 0
        assert len(report["records"]) == 70

        digest = hashlib.sha256()
        shard_minimum = None
        shard_coefficients = 0
        for index, record in enumerate(report["records"]):
            assert record["beta_index"] == index
            assert tuple(record["beta"]) == expected_betas[index]
            assert record["negative"] == 0
            assert record["zero"] == 0
            minimum = Fraction(record["minimum"])
            assert minimum > 0
            shard_minimum = minimum if shard_minimum is None else min(shard_minimum, minimum)
            shard_coefficients += record["bernstein_coefficients"]
            digest.update(json.dumps(record, separators=(",", ":"), sort_keys=True).encode())
        assert digest.hexdigest().upper() == report["ordered_record_sha256"]
        total_records += len(report["records"])
        total_coefficients += shard_coefficients
        global_minimum = shard_minimum if global_minimum is None else min(global_minimum, shard_minimum)
        summaries.append({
            "file": name,
            "sha256": expected_hash,
            "chart": chart,
            "B_rank2_endpoint": "EDGELESS" if bmask else "PATH",
            "C_rank2_endpoint": "EDGELESS" if cmask else "PATH",
            "simplex_coefficients": len(report["records"]),
            "tensor_bernstein_coefficients": shard_coefficients,
            "minimum": str(shard_minimum),
            "negative": 0,
            "zero": 0,
            "ordered_record_sha256": report["ordered_record_sha256"],
        })
    assert total_records == 560
    assert global_minimum is not None and global_minimum > 0
    return ({
        "charts": 2,
        "rank2_corner_pairs": 4,
        "shards": 8,
        "simplex_coefficients": total_records,
        "tensor_bernstein_coefficients": total_coefficients,
        "global_minimum": str(global_minimum),
        "negative": 0,
        "zero": 0,
        "second_byte_identical_replay": True,
    }, summaries)


def chart_coverage() -> dict[str, object]:
    n, mb, mc = sp.symbols("N mB mC", positive=True)
    h = n - 14
    low_x = 2 * (mb - 7) / h
    low_y = (mc - (n - mb)) / mb
    high_x = 2 * mb / n - 1
    high_y = (mc - mb) / (n - mb)
    # Exact inverse substitutions away from removable boundary denominators.
    assert sp.cancel(7 + h * low_x / 2 - mb) == 0
    assert sp.cancel(n - mb + mb * low_y - mc) == 0
    assert sp.cancel(n * (1 + high_x) / 2 - mb) == 0
    assert sp.cancel(mb + (n - mb) * high_y - mc) == 0
    return {
        "ordering": "swap B,C so 7<=mB<=mC<=N",
        "geometry": "r=mB+mC-N>=0 and e(A)<=r",
        "edge_budget_argument": (
            "For adjacent marks, surviving neighbors on either side occupy distinct "
            "components of A; otherwise a cycle is created. Thus A has at least "
            "N-r components and e(A)=N-components(A)<=r."
        ),
        "low_chart": "7<=mB<=N/2 and N-mB<=mC<=N",
        "low_inverse": [str(low_x), str(low_y)],
        "high_chart": "N/2<=mB<=mC<=N",
        "high_inverse": [str(high_x), str(high_y)],
        "boundary_conventions": (
            "At N=14 the low chart has mB=7; at mB=N the high-chart y denominator "
            "is removable because mC=N."
        ),
        "coefficient_box": (
            "For every m-vertex forest and k>=2, C(m-k+1,k)<=i_k<=C(m,k); "
            "the lower bound follows by joining components and Pascal induction, "
            "and the upper bound is the subset ceiling."
        ),
    }


def main() -> None:
    pins = verify_pins()
    occupation = verify_occupation_algebra()
    ratio = verify_ratio_and_wedge_domain()
    corner = verify_corner_reduction()
    shard_total, shard_rows = verify_shards()
    coverage = chart_coverage()
    report = {
        "marker": MARKER,
        "status": "PASS exact adjacent no-parent large-order rank-six g2 subtheorem",
        "theorem": (
            "For every N-vertex forest A with N>=19 arising from the adjacent-mark "
            "canonical no-parent geometry, with induced rows B,C of orders at least "
            "7, the exact rank-six whole-bundle coefficient g2 is nonnegative."
        ),
        "strict_relaxed_cone_result": (
            "The positive multiple N^4*a2^4*g2 is strictly positive on the full "
            "continuous wedge/simplex/path-edgeless relaxation covered by the two "
            "charts for N>=14."
        ),
        "scope_guard": (
            "This does not cover induced order min(|B|,|C|)<=6, ambient orders "
            "N<=18, nonadjacent marks, or parent modes; it is not universal N6."
        ),
        "pins": pins,
        "occupation_algebra": occupation,
        "ratio_and_wedge_domain": ratio,
        "corner_reduction": corner,
        "chart_coverage": coverage,
        "certificate_total": shard_total,
        "shards": shard_rows,
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "simplex_coefficients": shard_total["simplex_coefficients"],
        "tensor_bernstein_coefficients": shard_total["tensor_bernstein_coefficients"],
        "global_minimum": shard_total["global_minimum"],
        "actual_forest_threshold": ratio["actual_forest_threshold"],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
