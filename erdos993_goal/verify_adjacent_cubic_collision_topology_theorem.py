"""Dependency and integrity validator for the all-order quartic window theorem."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "adjacent_cubic_collision_topology_theorem_20260806.json"


REQUIRED_TAIL_RECORDS = {
    "delta",
    "d1_minus_a2",
    "d1_inside_trailing_spectrum",
    "trailing_trace_gap",
    "lower_tail_square_gap",
    "z_minus_a1_scaled",
    "z_minus_a2_scaled",
    "z_characteristic_scaled",
    "quarter_interval_scale_d0",
    "quarter_interval_scale_d1",
    "quarter_interval_scale_d2",
    *(f"quarter_interval_bernstein_{index}" for index in range(4)),
}


def load(name: str) -> dict:
    return json.loads((HERE / name).read_text(encoding="utf-8"))


def sha256(name: str) -> str:
    return hashlib.sha256((HERE / name).read_bytes()).hexdigest()


def ordinary_positive(record: dict) -> None:
    assert (
        record["strictly_positive_control_count"]
        + len(record.get("zero_control_indices", []))
        == record["bernstein_control_count"]
    )


def validate_tail_report(parity: str) -> dict[str, object]:
    name = f"tail_collision_quarter_lemma_{parity}_exact_20260806.json"
    report = load(name)
    assert report["status"] == "EXACT_TAIL_COLLISION_QUARTER_LEMMA_INGREDIENTS"
    assert set(report["records"]) == REQUIRED_TAIL_RECORDS

    for record in report["records"].values():
        ordinary_positive(record["denominator"])

    quadratic = report["records"]["quarter_interval_bernstein_0"]["numerator"]
    assert quadratic["degrees_r_u_v_c"] == [11, 2, 2, 2]
    assert quadratic["uv_bernstein_slice_count"] == 9
    assert len(quadratic["slices"]) == 9
    for item in quadratic["slices"]:
        assert set(item) == {
            "index_u_v",
            "constant",
            "leading",
            "four_ac_minus_b_squared",
            "middle_digest",
        }

    cubic = report["records"]["quarter_interval_bernstein_1"]["numerator"]
    assert cubic["degrees_r_u_v_c"] == [15, 3, 3, 3]
    assert cubic["uv_bernstein_slice_count"] == 16
    coefficientwise = [
        item for item in cubic["slices"]
        if item["method"] == "all four c-power coefficients positive"
    ]
    discriminant = [
        item for item in cubic["slices"]
        if "negative c" in item["method"]
    ]
    assert len(coefficientwise) == len(discriminant) == 8
    assert all("negative_discriminant" in item for item in discriminant)

    for index, expected_count in ((2, 125), (3, 150)):
        numerator = report["records"][f"quarter_interval_bernstein_{index}"]["numerator"]
        assert numerator["bernstein_control_count"] == expected_count
        ordinary_positive(numerator)

    ordinary_positive(report["records"]["lower_tail_square_gap"]["numerator"])
    return {
        "file": name,
        "sha256": sha256(name),
        "record_count": len(report["records"]),
        "quadratic_slice_count": 9,
        "cubic_slice_split": {"coefficientwise": 8, "negative_discriminant": 8},
    }


def main() -> None:
    tail = {parity: validate_tail_report(parity) for parity in ("odd", "even")}

    identities_name = "tail_collision_topology_identities_exact_20260806.json"
    identities = load(identities_name)
    assert identities["status"] == "PASS_EXACT_TAIL_COLLISION_TOPOLOGY_IDENTITIES"

    prefix_name = "shared_classical_prefix_spectral_floor_exact_20260806.json"
    prefix = load(prefix_name)
    assert prefix["status"] == "EXACT_SHARED_PREFIX_SPECTRAL_FLOOR"

    small_name = "small_reserve_tail_collision_one_twentieth_exact_20260806.json"
    small = load(small_name)
    assert small["status"] == "EXACT_SMALL_RESERVE_TAIL_COLLISION_ONE_TWENTIETH"
    assert {
        (item["parity"], item["r"], len(item["controls"])) for item in small["cases"]
    } == {("odd", 0, 4), ("odd", 1, 4), ("even", 0, 4)}

    one_sided_name = "one_sided_adjacent_cubic_darboux_inertia_20260806.json"
    one_sided = load(one_sided_name)
    assert one_sided["status"] == "EXACT_ONE_SIDED_DARBOUX_BERNSTEIN_AUDIT"
    assert one_sided["all_certified"] is True

    ground_name = "adjacent_cubic_closest_root_turan_theorem_20260806.json"
    ground = load(ground_name)
    assert ground["status"] == "ALL_ORDER_CLOSEST_ROOT_INEQUALITY_PROVED"

    cubic_name = "two_outlier_one_negative_factor_theorem_20260805.json"
    cubic = load(cubic_name)
    assert cubic["status"] == "ALL_ORDER_TWO_OUTLIER_ONE_NEGATIVE_FACTOR_THEOREM"

    source_names = [
        "verify_adjacent_cubic_collision_topology_theorem.py",
        "verify_tail_collision_topology_identities.py",
        "derive_tail_collision_quarter_lemma.py",
        "certify_tail_collision_quarter_lemma.py",
        "certify_tail_collision_interval_flint.py",
        "flint_multivariate_rational.py",
        "certify_small_reserve_tail_collision_bound.py",
    ]
    dependencies = [identities_name, prefix_name, small_name, one_sided_name, ground_name, cubic_name]
    report = {
        "status": "ALL_ORDER_ADJACENT_CUBIC_COMPATIBILITY_AND_QUARTIC_WINDOW_PROVED",
        "tail_collision_certificates": tail,
        "dependency_reports": {
            name: {"status": load(name)["status"], "sha256": sha256(name)}
            for name in dependencies
        },
        "source_sha256": {name: sha256(name) for name in source_names},
        "logical_chain": [
            "Exact cross identities force every common full eigenvalue onto the finite collision polynomial C(y).",
            "The two parity sign packages place every equal-inertia tail collision on the ground branch below 1/4.",
            "The prefix quarter floor, with exact 1/20 exceptions, makes every same-index collision a full ground collision.",
            "Connected continuation and the all-order ground Turan inequality give u_i<=h_i for every root index.",
            "Together with v_i<=u_(i+1), the two adjacent cubic summands have a common interlacer.",
            "The factorial recursion makes every positive quartic combination real-rooted; coefficient positivity makes all roots negative.",
        ],
        "scope": {
            "input": "Gamma=(1-u*t)(1-v*t)(t+c)(t+d), 0<=u,v<=1, c,d>0",
            "sharp_reserve": "p-alpha>=13",
            "orders": "all odd and even orders",
            "claim": "all-order gamma-degree-four two-outlier window theorem",
            "not_claimed": "arbitrary numbers of appended negative factors or the full forest conjecture",
        },
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(OUTPUT)


if __name__ == "__main__":
    main()
