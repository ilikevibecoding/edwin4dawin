#!/usr/bin/env python3
"""Fail-closed assembly of every large-broom internal-ordinary g1 cell.

For ``ell=8+h`` the exact tensor-binomial reduction has the 28 nonzero
Newton cells ``(h_index,k_index)`` with ``h_index+k_index<=6``.  The lower
fifteen cells are supplied by pinned all-parent theorems.  This assembler
independently replays the remaining thirteen cells on the diagonals five
and six.

For a parent forest with marked vertices p,v write

    W=A, P=A+xB, V=A+xC,
    E=A+xB+xC+epsilon*x^2D,

where A,B,C,D have coefficientwise nonnegative independence polynomials
and epsilon is zero/one on the adjacent/nonadjacent face.  Every diagonal
six cell is coefficientwise positive in these partition coordinates.  A
diagonal five cell minus 28 times componentwise interval sum 5 for the
rooted deletion pair V <= E, after adjoining six isolates, is likewise
coefficientwise positive.  The pinned all-componentwise interval theorem
proves that payment nonnegative.  No numerical optimizer is used here.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from derive_iso_n5_g1_internal_endpoint_broom_parameters_root import (
    isolate_times_path,
    path_coefficient,
    tensor_binomial,
)
from derive_iso_n5_g1_internal_ordinary_broom_factor_root import (
    ordinary_expression,
)
from prove_iso_n5_disconnected_m5_all_componentwise_g1_nonadjacent import (
    H,
    P as ROOTED_P,
    interval_cells,
    unique_expressions,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g1_internal_ordinary_large_broom_all_cells_exact_root_20260830.json"
MARKER = "PASS_EXACT_ISO_N5_G1_INTERNAL_ORDINARY_LARGE_BROOM_ALL_CELLS_ROOT"

HIGH_CELLS = tuple(
    (h_index, k_index)
    for total in (5, 6)
    for h_index in range(total + 1)
    for k_index in (total - h_index,)
)
TOP4_CELLS = tuple((h_index, 4 - h_index) for h_index in range(5))
DIAGONAL3_CELLS = tuple((h_index, 3 - h_index) for h_index in range(4))
DIAGONAL2_CELLS = tuple((h_index, 2 - h_index) for h_index in range(3))
OFF_ORIGIN_CELLS = ((0, 1), (1, 0))
ORIGIN_CELL = ((0, 0),)
ALL_CELLS = tuple(
    (h_index, k_index)
    for total in range(7)
    for h_index in range(total + 1)
    for k_index in (total - h_index,)
)

DEPENDENCIES = {
    "derive_iso_n5_g1_internal_endpoint_broom_parameters_root.py":
        "2582BFF4BBA40A2B11D27AB5A3256D291271EB45BF61827D60EC5ADB220B2879",
    "derive_iso_n5_g1_internal_ordinary_broom_factor_root.py":
        "183528806BCBEBC38C9C2D1830D86CE83BD5567FD4DA333CFFAEA8FE406C5605",
    "prove_iso_n5_disconnected_m5_all_componentwise_g1_nonadjacent.py":
        "FCA5115C5D303352DBBC001B305207D583219335326BC48D0C4BFEEE90FB5C1B",
    "iso_n5_disconnected_m5_all_componentwise_exact_g1_nonadjacent_20260830.json":
        "27E70D94ED97F659E62D63527365906D33123EFDB4E6F8168951061B83BFCCA1",
    "probe_iso_n5_g1_internal_ordinary_partition_global_cone_root.py":
        "1300E09097AA1BC59D0187690452E58078997E1106B991257DD040B0458C3D9B",
    "iso_n5_g1_internal_ordinary_partition_global_cone_probe_root_20260830.json":
        "97ED9D50746D2F3A9B0ED7EE1CE2A51363E38B45B91B8CBA6A432BD8F2DAAF27",
    "prove_iso_n5_g1_internal_ordinary_top_diagonal_motif_root.py":
        "BE0174179EA0286BF24EAEAAFBB5ADEEB071D3ABA096AFEE7EBBF941ABB51F58",
    "iso_n5_g1_internal_ordinary_top_diagonal_motif_exact_root_20260830.json":
        "165B8576E207745474279AB8DCCA31831567C04DB4914824BCCF0C05757D0298",
    "assemble_iso_n5_g1_internal_ordinary_diagonal3_all_parent_root.py":
        "1FAE8FDCF7C153349868D19A2A706AAAE0E1E490D16E5433F5F44BD3E9C49452",
    "iso_n5_g1_internal_ordinary_diagonal3_all_parent_exact_root_20260830.json":
        "7DF473F86BDFD2459E50803DF0AB5150B395A920F4FD17BF25BE13F782E154C4",
    "assemble_iso_n5_g1_internal_ordinary_diagonal2_all_parent_root.py":
        "9B19F709DA7273F492F0DA4821DF93861579F4A1E652F8E790967DED58172D0F",
    "iso_n5_g1_internal_ordinary_diagonal2_all_parent_exact_root_20260830.json":
        "2C25F3D4E0536F97EC7F3F3C0D2FA2D246EA7F73F35ACF989F32C88230518C5E",
    "prove_iso_n5_g1_internal_ordinary_low6_finite_all_parent_root.py":
        "2D1E7EE9C92A2F75CAD47325508A0D5D2F60352F22A23D0F7652F9D0938BD19B",
    "iso_n5_g1_internal_ordinary_low6_finite_all_parent_exact_root_20260830.json":
        "E9563D5C3EE7D6C24D101CB4C1736913DDCBC68311CEB2451C6725B834380906",
    "prove_iso_n5_g1_internal_ordinary_low_off_origin_large_order_root.py":
        "BFB9A1C3461BEC55423793DF8068E508E86BD8858848B2A00D913DB22F5CE5AE",
    "iso_n5_g1_internal_ordinary_low_off_origin_large_order_exact_root_20260830.json":
        "7D6EB0B121E48B32ED640C4D288F8178070E5C4E2CE633946A672F4E82F6BA95",
    "prove_iso_n5_g1_internal_ordinary_low00_parent_interval_cone_root.py":
        "2A02C0A99CEA66A681D6F5D56AF6B3CAE3C8485AB8C6ADB1F3CA851033E3BECD",
    "iso_n5_g1_internal_ordinary_low00_parent_interval_cone_exact_root_20260830.json":
        "324E9C104CAE1C50237EF767FD1339C820B8164ABDA81371CEB82F5719DA78D1",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str) -> dict:
    return json.loads((HERE / name).read_text(encoding="utf-8"))


def at(row, index):
    return row[index] if 0 <= index < len(row) else sp.Integer(0)


def add_isolates(row, amount, maximum):
    return tuple(sp.expand(sum(
        sp.binomial(amount, added) * at(row, rank - added)
        for added in range(rank + 1)
    )) for rank in range(maximum + 1))


def polynomial_certificate(expression, variables):
    polynomial = sp.Poly(sp.expand(expression), *variables)
    terms = tuple(polynomial.terms())
    coefficients = tuple(value for _powers, value in terms)
    assert coefficients and all(value >= 0 for value in coefficients)
    stream = "".join(f"{powers}:{value};" for powers, value in terms)
    return {
        "monomials": len(terms),
        "minimum_coefficient": str(min(coefficients)),
        "residual_stream_sha256": hashlib.sha256(stream.encode()).hexdigest().upper(),
    }


def replay_high_cells(newton_cells, rows):
    a = (sp.Integer(1), *sp.symbols("a1:7"))
    b = (sp.Integer(1), *sp.symbols("b1:6"))
    c = (sp.Integer(1), *sp.symbols("c1:6"))
    d = (sp.Integer(1), *sp.symbols("d1:5"))
    rooted_intervals = unique_expressions(interval_cells(ROOTED_P, H))[1:]
    # unique_expressions contains all sixteen sums; the probe omits the
    # identically zero first entry before assigning labels 2,...,16.
    assert len(rooted_intervals) == 15
    interval_sum_5 = rooted_intervals[3]

    probe = load(
        "iso_n5_g1_internal_ordinary_partition_global_cone_probe_root_20260830.json"
    )
    assert probe["marker"] == (
        "PROBE_EXACT_ISO_N5_G1_INTERNAL_ORDINARY_PARTITION_GLOBAL_CONE_ROOT"
    )
    face_reports = []
    for epsilon in (0, 1):
        partition_rules = {}
        for rank in range(1, 7):
            partition_rules.update({
                rows["W"][rank]: at(a, rank),
                rows["P"][rank]: at(a, rank) + at(b, rank - 1),
                rows["V"][rank]: at(a, rank) + at(c, rank - 1),
                rows["E"][rank]: (
                    at(a, rank) + at(b, rank - 1) + at(c, rank - 1)
                    + epsilon * at(d, rank - 2)
                ),
            })
        variables = tuple((*a[1:], *b[1:], *c[1:], *(d[1:] if epsilon else ())))

        vrow = (sp.Integer(1), *rows["V"][1:7])
        erow = (sp.Integer(1), *rows["E"][1:7])
        qrow = (sp.Integer(1),) + tuple(
            sp.expand(erow[index + 1] - vrow[index + 1])
            for index in range(5)
        )
        v_extended = add_isolates(vrow, 6, 6)
        q_extended = add_isolates(qrow, 6, 5)
        mapping = {
            ROOTED_P[0]: 1,
            H[0]: 1,
            **{ROOTED_P[index]: v_extended[index] for index in range(1, 7)},
            **{H[index]: q_extended[index] for index in range(1, 6)},
        }
        payment = sp.expand(interval_sum_5.subs(mapping).subs(partition_rules))

        saved_face = next(face for face in probe["faces"] if face["epsilon"] == epsilon)
        saved = {
            (row["h_index"], row["k_index"]): row
            for row in saved_face["forms"] if row["exact_rational_certificate"]
        }
        assert set(saved) == set(HIGH_CELLS)

        cells = []
        for index in HIGH_CELLS:
            target = sp.expand(newton_cells[index].subs(partition_rules))
            if sum(index) == 5:
                residual = sp.expand(target - 28 * payment)
                payment_label = "28*V_Qv_interval_sum_5_plus_6_isolates"
                assert saved[index]["basis_weights"] == {
                    "V_Qv_interval_sum_5_plus_6_isolates": "28"
                }
            else:
                residual = target
                payment_label = "none; coefficientwise nonnegative target"
                assert saved[index].get("basis_weights", {}) == {}
            replay = polynomial_certificate(residual, variables)
            assert replay["minimum_coefficient"] == saved[index]["minimum_residual_scalar"]
            assert replay["residual_stream_sha256"] == saved[index]["residual_stream_sha256"]
            cells.append({
                "cell": list(index),
                "payment": payment_label,
                **replay,
            })
        face_reports.append({
            "epsilon": epsilon,
            "geometry": "adjacent" if epsilon == 0 else "nonadjacent",
            "cells": cells,
        })
    return face_reports


def main() -> None:
    actual = {name: sha256(HERE / name) for name in DEPENDENCIES}
    assert actual == DEPENDENCIES

    interval = load(
        "iso_n5_disconnected_m5_all_componentwise_exact_g1_nonadjacent_20260830.json"
    )
    assert interval["marker"] == (
        "PASS_EXACT_ISO_N5_DISCONNECTED_M5_ALL_COMPONENTWISE_G1_NONADJACENT"
    )
    assert interval["unique_sums_1_through_8"]["unique_sums"] == [1, 8]
    sum5 = next(
        row for row in interval["unique_sums_1_through_8"]["rows"]
        if row["unique_sum"] == 5
    )
    assert sum5["lower_bound"] == "(m + 3*n + 1)/2"
    assert sp.Rational(sum5["minimum_n_power_coefficient"]) == sp.Rational(1, 2)

    expression, rows = ordinary_expression()
    h, k = sp.symbols("h k", integer=True, nonnegative=True)
    ell = 8 + h
    child_rules = {}
    for rank in range(1, 7):
        u_value = isolate_times_path(k, ell - 1, rank)
        x_value = sp.expand(u_value + path_coefficient(ell - 2, rank - 1))
        z_value = isolate_times_path(k, ell - 2, rank)
        y_value = sp.expand(z_value + path_coefficient(ell - 3, rank - 1))
        child_rules.update({
            rows["X"][rank]: x_value,
            rows["U"][rank]: u_value,
            rows["Y"][rank]: y_value,
            rows["Z"][rank]: z_value,
        })
    degrees, newton_cells = tensor_binomial(
        sp.expand(expression.subs(child_rules)), (h, k)
    )
    assert degrees == (6, 6)
    assert len(newton_cells) == 49
    assert {
        index for index, form in newton_cells.items() if form != 0
    } == set(ALL_CELLS)
    high_faces = replay_high_cells(newton_cells, rows)

    top4 = load(
        "iso_n5_g1_internal_ordinary_top_diagonal_motif_exact_root_20260830.json"
    )
    diagonal3 = load(
        "iso_n5_g1_internal_ordinary_diagonal3_all_parent_exact_root_20260830.json"
    )
    diagonal2 = load(
        "iso_n5_g1_internal_ordinary_diagonal2_all_parent_exact_root_20260830.json"
    )
    finite = load(
        "iso_n5_g1_internal_ordinary_low6_finite_all_parent_exact_root_20260830.json"
    )
    off_origin = load(
        "iso_n5_g1_internal_ordinary_low_off_origin_large_order_exact_root_20260830.json"
    )
    origin = load(
        "iso_n5_g1_internal_ordinary_low00_parent_interval_cone_exact_root_20260830.json"
    )

    assert top4["marker"] == "PASS_EXACT_ISO_N5_G1_INTERNAL_ORDINARY_TOP_DIAGONAL_MOTIF_ROOT"
    assert tuple(map(tuple, top4["top_diagonal"])) == TOP4_CELLS
    assert top4["proved_cells_total"] == 10
    assert diagonal3["marker"] == "PASS_EXACT_ISO_N5_G1_INTERNAL_ORDINARY_DIAGONAL3_ALL_PARENT_ROOT"
    assert tuple(map(tuple, diagonal3["cells"])) == DIAGONAL3_CELLS
    assert diagonal2["marker"] == "PASS_EXACT_ISO_N5_G1_INTERNAL_ORDINARY_DIAGONAL2_ALL_PARENT_ROOT"
    assert tuple(map(tuple, diagonal2["cells"])) == DIAGONAL2_CELLS
    assert finite["marker"] == "PASS_EXACT_ISO_N5_G1_INTERNAL_ORDINARY_LOW6_FINITE_ALL_PARENT_ROOT"
    assert finite["A_orders_covered"] == [0, 9]
    assert finite["negative_values"] == 0
    assert all(list(index) in finite["cells"] for index in (*DIAGONAL2_CELLS, *OFF_ORIGIN_CELLS, *ORIGIN_CELL))
    assert off_origin["marker"] == "PASS_EXACT_ISO_N5_G1_INTERNAL_ORDINARY_LOW_OFF_ORIGIN_LARGE_ORDER_ROOT"
    assert off_origin["cutoff"] == 10
    assert off_origin["negative_power_coefficients"] == 0
    assert origin["marker"] == "PASS_EXACT_ISO_N5_G1_INTERNAL_ORDINARY_LOW00_PARENT_INTERVAL_CONE_ROOT"
    assert "every finite parent-side forest" in origin["theorem"]

    groups = {
        "direct_interval_high_diagonals_5_6": set(HIGH_CELLS),
        "motif_diagonal_4": set(TOP4_CELLS),
        "all_parent_diagonal_3": set(DIAGONAL3_CELLS),
        "all_parent_diagonal_2": set(DIAGONAL2_CELLS),
        "finite_plus_large_off_origin": set(OFF_ORIGIN_CELLS),
        "universal_origin": set(ORIGIN_CELL),
    }
    counted = []
    for group in groups.values():
        counted.extend(group)
    assert len(counted) == len(set(counted)) == 28
    assert set(counted) == set(ALL_CELLS)

    report = {
        "marker": MARKER,
        "theorem": (
            "For every h,k>=0, every finite parent forest, and both parent-mark "
            "geometries, all 28 tensor-Newton cells of internal-spine/broom "
            "ordinary-parent g1 with ell=8+h are nonnegative."
        ),
        "tensor_degrees_h_k": list(degrees),
        "all_cells": [list(index) for index in ALL_CELLS],
        "coverage_groups": {
            name: [list(index) for index in sorted(group)]
            for name, group in groups.items()
        },
        "coverage_count": len(counted),
        "duplicate_cells": len(counted) - len(set(counted)),
        "missing_cells": [
            list(index) for index in sorted(set(ALL_CELLS) - set(counted))
        ],
        "high_diagonal_solver_free_replay": {
            "payment_theorem": (
                "componentwise rooted-deletion interval sum 5, preserved after "
                "adjoining six isolates"
            ),
            "payment_weight_on_diagonal_5": 28,
            "diagonal_6_payment": 0,
            "faces": high_faces,
        },
        "low_cell_order_join": {
            "finite": "all parent forests of order 0..9 on all six h+k<=2 cells",
            "large_off_origin": "all parent forests of order >=10 on (0,1),(1,0)",
            "origin": "all finite parent forests on (0,0)",
            "gap": False,
        },
        "dependencies_sha256": DEPENDENCIES,
        "status": "exact all-parent theorem for every ell>=8 internal-ordinary g1 cell",
        "scope": (
            "This closes the ell>=8 large-broom sector of the internal-spine "
            "ordinary-parent g1 mode.  Brooms with ell<8, the other g1/g2 "
            "modes, and Erdos Problem 993 remain separate."
        ),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "coverage_count": report["coverage_count"],
        "duplicate_cells": report["duplicate_cells"],
        "missing_cells": report["missing_cells"],
        "coverage_groups": report["coverage_groups"],
        "high_face_minima": [
            {
                "epsilon": face["epsilon"],
                "minimum": min(
                    sp.Rational(cell["minimum_coefficient"])
                    for cell in face["cells"]
                ),
            }
            for face in high_faces
        ],
        "status": report["status"],
        "scope": report["scope"],
    }, indent=2, sort_keys=True, default=str))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
