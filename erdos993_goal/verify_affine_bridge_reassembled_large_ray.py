#!/usr/bin/env python3
"""Exact large-ray audit after terminal affine layer positivity fails.

This deliberately keeps the complete ``V^r`` homogenizer.  It evaluates the
bottom-package point (m,x,r)=(120,240,80) in both parities and checks the
central Pascal recurrence in three equivalent forms.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from probe_affine_bridge_shifted_predecessors import (
    V_dict,
    multiply,
    power,
    sources,
)
from verify_affine_bridge_planar_layer_counterexample import outer_coefficient
from probe_path_isolate_p4_group_affine_southwest_square_entry import evaluate


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def audit(parity: int) -> dict:
    m_value = 120
    x_value = 240
    order = 80
    a_value = m_value + x_value - 3
    b_value = 2 * m_value + parity - 5
    diagonal_target = m_value + order + 6

    base_source, reserve_source = sources("bottom", parity)
    base = evaluate(base_source, 0, m_value, x_value, diagonal_target)
    reserve = evaluate(reserve_source, 0, m_value, x_value, diagonal_target)

    v_order = power(V_dict, order, diagonal_target)
    v_next = multiply(v_order, V_dict, diagonal_target)
    base_order = multiply(base, v_order, diagonal_target)
    reserve_order = multiply(reserve, v_order, diagonal_target)
    base_next = multiply(base, v_next, diagonal_target)
    reserve_next = multiply(reserve, v_next, diagonal_target)

    # U_r and Z_r are the two spatial predecessors at order r.  Symmetry
    # supplies the second off-diagonal predecessor.
    base_u = outer_coefficient(
        base_order, a_value, b_value,
        diagonal_target, diagonal_target - 1,
    )
    reserve_u = outer_coefficient(
        reserve_order, a_value, b_value,
        diagonal_target, diagonal_target - 1,
    )
    base_z = outer_coefficient(
        base_order, a_value, b_value,
        diagonal_target, diagonal_target,
    )
    reserve_z = outer_coefficient(
        reserve_order, a_value, b_value,
        diagonal_target, diagonal_target,
    )
    u_value = base_u + order * reserve_u
    z_value = base_z + order * reserve_z
    reassembled = 2 * u_value + z_value

    # Direct V^(r+1) extraction of B+rP is the same reassembled target.
    base_next_central = outer_coefficient(
        base_next, a_value, b_value,
        diagonal_target, diagonal_target,
    )
    reserve_next_central = outer_coefficient(
        reserve_next, a_value, b_value,
        diagonal_target, diagonal_target,
    )
    reassembled_direct = base_next_central + order * reserve_next_central
    full_next = reassembled + reserve_next_central
    full_next_direct = base_next_central + (order + 1) * reserve_next_central

    assert reassembled == reassembled_direct
    assert full_next == full_next_direct
    assert reassembled > 0
    assert reserve_next_central > 0
    assert full_next > 0

    return {
        "package": "bottom",
        "parity": parity,
        "m": m_value,
        "x": x_value,
        "r": order,
        "outer_A_exponent": a_value,
        "outer_T_exponent": b_value,
        "diagonal_target": diagonal_target,
        "U_r": u_value,
        "Z_r": z_value,
        "two_U_r_plus_Z_r": reassembled,
        "direct_V_to_r_plus_1_B_plus_rP": reassembled_direct,
        "next_reserve_calR_r_plus_1_N_N": reserve_next_central,
        "full_boundary_triple": full_next,
        "direct_next_central_B_plus_r_plus_1_P": full_next_direct,
        "strict_signs": {
            "two_U_r_plus_Z_r_positive": reassembled > 0,
            "next_reserve_positive": reserve_next_central > 0,
            "full_boundary_triple_positive": full_next > 0,
        },
    }


def main() -> None:
    records = [audit(parity) for parity in (0, 1)]
    output = Path("affine_bridge_reassembled_large_ray_exact_20260811.json")
    report = {
        "status": "PASS_REASSEMBLED_AFFINE_TARGET_AT_LAYER_COUNTEREXAMPLE",
        "identity": (
            "2U_r+Z_r=[z^Nw^N]A^aT^bV^(r+1)(B+rP); adding "
            "calR_(r+1)(N,N) gives [z^Nw^N]A^aT^bV^(r+1)(B+(r+1)P)"
        ),
        "records": records,
        "scope_warning": (
            "This is an exact audit of the known terminal-layer counterexample, "
            "not an all-parameter proof."
        ),
    }
    output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "status": report["status"],
        "values": [
            {
                "parity": record["parity"],
                "two_U_plus_Z": record["two_U_r_plus_Z_r"],
                "next_reserve": record["next_reserve_calR_r_plus_1_N_N"],
                "full": record["full_boundary_triple"],
            }
            for record in records
        ],
        "output": str(output),
    }, indent=2))
    print("script_sha256", sha256(Path(__file__)))
    print("report_sha256", sha256(output))


if __name__ == "__main__":
    main()
