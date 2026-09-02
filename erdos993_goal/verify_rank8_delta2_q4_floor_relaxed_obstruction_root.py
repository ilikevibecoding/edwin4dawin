#!/usr/bin/env python3
"""Exact obstruction showing the Q4 floor alone does not close Delta2.

The witness is in the enlarged normalized coefficient box, not asserted to
come from a tree.  Its purpose is to fail-close an insufficient proof route.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_rank8_delta2_source_curvatures import build


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "rank8_delta2_q4_floor_relaxed_obstruction_exact_root_20260823.json"
EXPECTED = {
    "probe_rank8_delta2_source_curvatures.py":
        "85E45BA23A606EDB7526D75134F1956AE8B5C49D8B4CB404A16897B5A4CE3D0C",
    "verify_rank8_q8_terminal_reduction.py":
        "389216D19951A28784C46E57393F1F9CD5BBE41625DCD317C664F701EC2EC4B7",
    "rank4_quantitative_tree_reserve_exact_root_20260823.json":
        "C7C19AFA2C06C1309B388399A26818EBC85D77F9D0494B182428B006AAEDE6F0",
    "rank4_quantitative_tree_reserve_independent_audit_root_20260823.json":
        "BD36DBFE3EFDA9FBBA54513C12E7785D48AAEBE063EA0C8114F4CD102AB566B4",
    "verify_rank7_terminal_broom_middle_differences.py":
        "805CDE618B12FEBB51E3F6AB29E1A9174F170C9108EDF5CD65333907A14781D2",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    reserve = json.loads(
        (ROOT / "rank4_quantitative_tree_reserve_exact_root_20260823.json")
        .read_text(encoding="utf-8")
    )
    N = sp.symbols("N", positive=True)
    u_floor = sp.sympify(
        reserve["rank8_D4_coordinate_corollary"]["U_lower_bound"],
        locals={"n": N, "binomial": sp.binomial},
    )

    value, (n, w, x, U, V, Z) = build(1, "lcross")
    rows = []
    for order in (27, 28, 40, 80, 200, 1000):
        t = sp.Rational(1, order)
        y = 3 + sp.Rational(4347, 190) * t
        r = sp.Rational(4, 3) + (
            sp.Rational(760, 471) - sp.Rational(4, 3)
        ) * sp.Rational(23, order)
        uv = sp.factor(u_floor.subs(N, order))
        assert 0 < uv < 1
        exact = sp.cancel(value.subs({
            n: order,
            w: t * y,
            x: t * y * r,
            U: uv,
            V: 1,
            Z: 0,
        }))
        numerator, denominator = sp.fraction(exact)
        assert denominator > 0 and numerator < 0
        rows.append({
            "order": order,
            "t": str(t),
            "y_upper": str(y),
            "r_upper": str(r),
            "U": str(uv),
            "V": 1,
            "Z": 0,
            "Delta2_relaxed_value": str(exact),
            "decimal": str(sp.N(exact, 18)),
        })
        print("NEGATIVE_RELAXED", order, sp.N(exact, 12), flush=True)

    payload = {
        "schema": "rank8-delta2-q4-floor-relaxed-obstruction-root-v1",
        "status": "EXACT_RELAXED_OBSTRUCTION_Q4_FLOOR_ALONE_INSUFFICIENT",
        "claim": (
            "Even after imposing the new all-tree quantitative Q4 lower floor, "
            "the enlarged Delta2 k=1/lower-cross coefficient box contains exact "
            "negative points. Therefore that floor alone cannot certify Delta2."
        ),
        "witnesses": rows,
        "required_next_input": (
            "A joint realizability inequality coupling c4,c5,c6,c7 and the rooted "
            "deletion coordinates, or a structural degree-surplus induction."
        ),
        "immutable_inputs": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "These are relaxed coefficient-box witnesses, not independence sequences "
            "of trees and not counterexamples to Problem 993."
        ),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("OUTPUT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
