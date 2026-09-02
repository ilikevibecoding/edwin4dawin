#!/usr/bin/env python3
"""Fail-closed assembly of rank-five g1 in the singleton_endpoint mode.

The canonical mode has a unique non-bundle parent p equal to one of the two
marks.  After orienting the marks so that p=u, the marks are either adjacent,
connected and nonadjacent, or in distinct components.  The three cases are
disjoint and exhaustive.  Exact u-v symmetry supplies the p=v orientation.

This wrapper only assembles already frozen all-order certificates.  In
particular, the q=1 theorem is retained as the pinned base row inside the full
connected-nonadjacent Newton certificate; it is not counted as a fourth mark
placement.
"""

from __future__ import annotations

import hashlib
import json
from fractions import Fraction
from pathlib import Path

import sympy as sp

import derive_iso_n5_bundle_g12_canonical_configuration_g1_bernstein as canonical


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g1_singleton_endpoint_all_placements_assembled_exact_root_20260830.json"
MARKER = "PASS_EXACT_ISO_N5_G1_SINGLETON_ENDPOINT_ALL_PLACEMENTS_ROOT"

DEPENDENCIES = {
    "derive_iso_n5_bundle_g12_canonical_configuration_g1_bernstein.py":
        "9DDDB5A367BE06872D44615781CE32A069C8623FCB99C8965A845C1BCF873058",
    "prove_iso_n5_g1_singleton_endpoint_u_all_stars_adjacent_all_order_g1_nonadjacent.py":
        "CEF6012671822C85FA3054CC4099B087CED82C4577750D56E1B491AA98C5C7AE",
    "iso_n5_g1_singleton_endpoint_u_all_stars_adjacent_all_order_exact_g1_nonadjacent_20260830.json":
        "BDF3A15FC630E420FE3A6B93E37B687A36547E23AC9716FAA180DBE56AD2D618",
    "prove_iso_n5_g1_singleton_endpoint_disconnected_marks_all_order_g1_nonadjacent.py":
        "069758702D283597D8FD57252993472B91817EC6F14FFD140053ADAF11DA7020",
    "iso_n5_g1_singleton_endpoint_disconnected_marks_all_order_exact_g1_nonadjacent_20260830.json":
        "7595033ABB01C3CAA558E69E73B3591AA7A05272C6D43EBD800618840FDA9609",
    "prove_iso_n5_g1_singleton_endpoint_connected_nonadjacent_q1_all_order_g1_nonadjacent.py":
        "294BA12923A399C5833E50A7CE0441CAD09839081D2AC20585EFF67276E35FFE",
    "iso_n5_g1_singleton_endpoint_connected_nonadjacent_q1_all_order_exact_g1_nonadjacent_20260830.json":
        "88C1E88C06F9C9E4A3B715E436333B4FF8675322852BCAA89BD01988A379E866",
    "prove_iso_n5_g1_singleton_endpoint_connected_nonadjacent_all_order_g1_nonadjacent.py":
        "95613BAAD75BAA5BD2ABF3175F60F3908EE3BCF2736D0B0F099878C56413723C",
    "iso_n5_g1_singleton_endpoint_connected_nonadjacent_all_order_exact_g1_nonadjacent_20260830.json":
        "F383B98F7E7FCDF619ABB691B7C10B5E2360B204CAEF560073C4ACCD801E4A2E",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def text_sha256(value: object) -> str:
    return hashlib.sha256(str(value).encode()).hexdigest().upper()


def load(name: str):
    return json.loads((HERE / name).read_text(encoding="utf-8"))


def check_partition() -> list[dict[str, object]]:
    """Check the complete feasible truth table edge => same component."""

    feasible = (
        (False, False, "disconnected_marks"),
        (True, False, "connected_nonadjacent_marks"),
        (True, True, "adjacent_marks"),
    )

    def classify(same_component: bool, edge: bool) -> str:
        assert not edge or same_component
        if not same_component:
            return "disconnected_marks"
        return "adjacent_marks" if edge else "connected_nonadjacent_marks"

    records = []
    for same_component, edge, expected in feasible:
        result = classify(same_component, edge)
        assert result == expected
        records.append({
            "same_component": same_component,
            "edge": edge,
            "placement": result,
        })
    assert len({record["placement"] for record in records}) == 3
    return records


def check_endpoint_symmetry() -> dict[str, object]:
    """Rebuild g1 and verify p=u is carried exactly to p=v by u<->v."""

    crows, drows, g1, _g2 = canonical.raw_coefficients()
    assert text_sha256(sp.factor(g1)) == (
        "377C226C7EBF648416E49B55E2800E87F0E6FE2B5C76880E5ABF1FFB8E47C3EF"
    )

    swap_all = {
        **{crows[1][rank]: crows[2][rank] for rank in range(7)},
        **{crows[2][rank]: crows[1][rank] for rank in range(7)},
        **{drows[1][rank]: drows[2][rank] for rank in range(7)},
        **{drows[2][rank]: drows[1][rank] for rank in range(7)},
    }
    assert sp.expand(g1.xreplace(swap_all) - g1) == 0

    # If p=u, D=(C_U,C_U,C_W,C_W).  If p=v, deleting v instead gives
    # D=(C_V,C_W,C_V,C_W).  The two specializations are exchanged by the
    # same simultaneous mark swap.
    d_parent_u = (crows[1], crows[1], crows[3], crows[3])
    d_parent_v = (crows[2], crows[3], crows[2], crows[3])
    g1_parent_u = sp.expand(
        canonical.substitute_rows(g1, crows, drows, crows, d_parent_u)
    )
    g1_parent_v = sp.expand(
        canonical.substitute_rows(g1, crows, drows, crows, d_parent_v)
    )
    swap_c = {
        **{crows[1][rank]: crows[2][rank] for rank in range(7)},
        **{crows[2][rank]: crows[1][rank] for rank in range(7)},
    }
    assert sp.expand(g1_parent_u.xreplace(swap_c) - g1_parent_v) == 0
    assert len(g1_parent_u.as_ordered_terms()) == 38
    assert len(g1_parent_v.as_ordered_terms()) == 38
    assert text_sha256(g1_parent_u) == (
        "4D7A10496E16E67AC6E6DD21049D5AED4047E5E020536043FE1975889DB196D8"
    )
    assert text_sha256(g1_parent_v) == (
        "4AD969C9D8B655B6B5B7BE509390A40CC819FC8959BAF2C40789C692DB77C597"
    )
    return {
        "canonical_parent_u_rows": "D=(C_U,C_U,C_W,C_W)",
        "canonical_parent_v_rows": "D=(C_V,C_W,C_V,C_W)",
        "g1_mark_swap_difference": 0,
        "parent_specialization_swap_difference": 0,
        "parent_u_terms": 38,
        "parent_v_terms": 38,
        "parent_u_expression_sha256": text_sha256(g1_parent_u),
        "parent_v_expression_sha256": text_sha256(g1_parent_v),
    }


def main() -> None:
    for name, expected in DEPENDENCIES.items():
        assert sha256(HERE / name) == expected, name

    adjacent = load(
        "iso_n5_g1_singleton_endpoint_u_all_stars_adjacent_all_order_exact_g1_nonadjacent_20260830.json"
    )
    disconnected = load(
        "iso_n5_g1_singleton_endpoint_disconnected_marks_all_order_exact_g1_nonadjacent_20260830.json"
    )
    q1 = load(
        "iso_n5_g1_singleton_endpoint_connected_nonadjacent_q1_all_order_exact_g1_nonadjacent_20260830.json"
    )
    connected = load(
        "iso_n5_g1_singleton_endpoint_connected_nonadjacent_all_order_exact_g1_nonadjacent_20260830.json"
    )

    assert adjacent["marker"] == (
        "PASS_EXACT_ISO_N5_G1_SINGLETON_ENDPOINT_U_ALL_STARS_ADJACENT_ALL_ORDER_G1_NONADJACENT"
    )
    assert disconnected["marker"] == (
        "PASS_EXACT_ISO_N5_G1_SINGLETON_ENDPOINT_DISCONNECTED_MARKS_ALL_ORDER_G1_NONADJACENT"
    )
    assert q1["marker"] == (
        "PASS_EXACT_ISO_N5_G1_SINGLETON_ENDPOINT_CONNECTED_NONADJACENT_Q1_ALL_ORDER_G1_NONADJACENT"
    )
    assert connected["marker"] == (
        "PASS_EXACT_ISO_N5_G1_SINGLETON_ENDPOINT_CONNECTED_NONADJACENT_ALL_ORDER_G1_NONADJACENT"
    )

    assert adjacent["source_sha256"] == DEPENDENCIES[
        "prove_iso_n5_g1_singleton_endpoint_u_all_stars_adjacent_all_order_g1_nonadjacent.py"
    ]
    assert disconnected["source_sha256"] == DEPENDENCIES[
        "prove_iso_n5_g1_singleton_endpoint_disconnected_marks_all_order_g1_nonadjacent.py"
    ]
    assert q1["source_sha256"] == DEPENDENCIES[
        "prove_iso_n5_g1_singleton_endpoint_connected_nonadjacent_q1_all_order_g1_nonadjacent.py"
    ]
    assert connected["source_sha256"] == DEPENDENCIES[
        "prove_iso_n5_g1_singleton_endpoint_connected_nonadjacent_all_order_g1_nonadjacent.py"
    ]

    # Adjacent all-star certificate.
    adjacent_small = adjacent["certificates"]["N_0_1_with_remaining_star"]
    adjacent_large = adjacent["certificates"]["N_ge_2"]
    assert [item["core_order"] for item in adjacent_small] == [0, 1]
    assert [item["coefficient_count"] for item in adjacent_small] == [84, 84]
    assert all(Fraction(item["minimum"]) == Fraction(1, 3) for item in adjacent_small)
    assert adjacent_large["bernstein_rows"] == 12
    assert adjacent_large["coefficient_count"] == 1440
    assert Fraction(adjacent_large["minimum"]) == Fraction(1, 3)

    # Disconnected-mark certificate.
    disconnected_finite = disconnected["finite"]
    disconnected_large = disconnected["large"]
    assert disconnected_finite["forests"] == 2949
    assert disconnected_finite["rows"] == 1884
    assert disconnected_finite["checks"] == 5555916
    assert disconnected_finite["minimum"] == 0
    assert disconnected_finite["value_stream_hash"] == (
        "5E9469823430B5F809E8EAF70EDEEB3E2C37D351F3F65A40D5D41248A0BE0814"
    )
    assert disconnected_large["branches"] == 3768
    assert disconnected_large["cube_rows"] == 44765
    assert disconnected_large["homogeneous_coefficients"] == 2498626
    assert disconnected_large["power_terms"] == 977552
    assert Fraction(disconnected_large["minimum"]) == 16
    assert disconnected_large["branch_record_hash"] == (
        "68545DCB24A60C39F92F8FA9246FC5D562543EC3948ACAE853686BDEF4F49048"
    )

    # Connected q=1 base face.
    assert q1["finite"]["forests"] == 2947
    assert q1["finite"]["cells"] == 234560
    assert q1["finite"]["minimum"] == 0
    assert q1["finite"]["value_stream_hash"] == (
        "8315DD06E67ABA329AB066B88B1597A53D04D9C056F0C7FE47E08CBF2CF11A11"
    )
    assert q1["large_order"]["branches"] == 6
    assert q1["large_order"]["bernstein_rows"] == 16340
    assert q1["large_order"]["coefficients"] == 159230
    assert q1["large_order"]["branch_record_hash"] == (
        "F480D25E42F3E54634AF5C120F7711CCE316D22F8A14EDE548E692300BF1A476"
    )
    assert min(Fraction(record["minimum"]) for record in q1["large_order"]["records"]) == Fraction(9, 56)

    # Full connected-nonadjacent certificate.  Its row zero is exactly the
    # frozen q=1 theorem above; rows 1..44 cover every extra-star pattern.
    assert connected["dependencies_sha256"][
        "prove_iso_n5_g1_singleton_endpoint_connected_nonadjacent_q1_all_order_g1_nonadjacent.py"
    ] == DEPENDENCIES[
        "prove_iso_n5_g1_singleton_endpoint_connected_nonadjacent_q1_all_order_g1_nonadjacent.py"
    ]
    assert connected["dependencies_sha256"][
        "iso_n5_g1_singleton_endpoint_connected_nonadjacent_q1_all_order_exact_g1_nonadjacent_20260830.json"
    ] == DEPENDENCIES[
        "iso_n5_g1_singleton_endpoint_connected_nonadjacent_q1_all_order_exact_g1_nonadjacent_20260830.json"
    ]
    assert connected["finite"]["forests"] == 2947
    assert connected["finite"]["cells"] == 234560
    assert connected["finite"]["rows"] == 45
    assert connected["finite"]["row_checks"] == 10555200
    assert connected["finite"]["minimum"] == 0
    assert connected["finite"]["value_stream_hash"] == (
        "26CA9E0DE48932337C170C6DFEFB9BA7AD8CF64123477E58E7DA06B180195925"
    )
    assert connected["large"]["newton_rows"] == 45
    assert connected["large"]["new_large_rows"] == 44
    assert connected["large"]["pinned_q1_rows"] == 1
    assert connected["large"]["branches"] == 264
    assert connected["large"]["bernstein_rows"] == 43611
    assert connected["large"]["coefficients"] == 384079
    assert connected["large"]["power_terms"] == 22187
    assert Fraction(connected["large"]["minimum"]) == Fraction(2, 21)
    assert connected["large"]["record_hash"] == (
        "462D50D8D171289CC878DAA3E829F2698611816C610B68478B93AA291C7AB804"
    )

    placement_table = check_partition()
    symmetry = check_endpoint_symmetry()

    report = {
        "marker": MARKER,
        "theorem": (
            "For every canonical rank-five singleton_endpoint configuration, "
            "with the unique non-bundle parent p equal to u or v, g1 is nonnegative."
        ),
        "canonical_mode": {
            "name": "singleton_endpoint",
            "definition": "the unique non-bundle parent p belongs to {u,v}",
            "orientation": (
                "Orient p=u. Exact u-v symmetry gives p=v without adding a new geometry case."
            ),
            "endpoint_symmetry": symmetry,
        },
        "placement_partition": {
            "logical_constraint": "uv is an edge implies u and v lie in the same component",
            "truth_table": placement_table,
            "pairwise_disjoint": True,
            "exhaustive": True,
            "q1_role": (
                "Nested base face of connected_nonadjacent_marks, not a fourth placement; "
                "it is pinned as Newton row zero in the full connected theorem."
            ),
        },
        "case_certificates": {
            "adjacent_marks": {
                "marker": adjacent["marker"],
                "all_orders": True,
                "all_extra_child_stars": True,
                "coefficient_count": sum(item["coefficient_count"] for item in adjacent_small)
                    + adjacent_large["coefficient_count"],
                "minimum": "1/3",
            },
            "connected_nonadjacent_marks": {
                "marker": connected["marker"],
                "q1_base_marker": q1["marker"],
                "all_orders": True,
                "all_extra_child_stars": True,
                "finite_forests": connected["finite"]["forests"],
                "finite_rooted_cells": connected["finite"]["cells"],
                "finite_row_checks": connected["finite"]["row_checks"],
                "newton_rows": connected["large"]["newton_rows"],
                "large_branches": connected["large"]["branches"],
                "large_bernstein_rows": connected["large"]["bernstein_rows"],
                "large_coefficients": connected["large"]["coefficients"],
                "large_minimum": connected["large"]["minimum"],
            },
            "disconnected_marks": {
                "marker": disconnected["marker"],
                "all_orders": True,
                "all_extra_child_stars": True,
                "arbitrary_unmarked_components": True,
                "finite_forests": disconnected_finite["forests"],
                "finite_checks": disconnected_finite["checks"],
                "large_branches": disconnected_large["branches"],
                "large_cube_rows": disconnected_large["cube_rows"],
                "large_coefficients": disconnected_large["homogeneous_coefficients"],
                "large_minimum": disconnected_large["minimum"],
            },
        },
        "dependencies_sha256": DEPENDENCIES,
        "scope": (
            "Exactly canonical rank-five singleton_endpoint g1, for p=u and p=v. "
            "No other canonical g1 mode, g2, all N5, or Erdos Problem 993 is claimed."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": report["marker"],
        "placements": [record["placement"] for record in placement_table],
        "endpoint_orientations": ["p=u", "p=v by exact symmetry"],
        "connected_newton_rows": connected["large"]["newton_rows"],
        "connected_large_coefficients": connected["large"]["coefficients"],
        "disconnected_large_coefficients": disconnected_large["homogeneous_coefficients"],
        "scope": report["scope"],
    }, indent=2))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
