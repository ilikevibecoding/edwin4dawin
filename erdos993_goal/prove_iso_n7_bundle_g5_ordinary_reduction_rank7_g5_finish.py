#!/usr/bin/env python3
"""Exact ordinary-parent reduction to the no-parent rank-seven g5 mode.

For every forest C of order n>=18, marks u,v, and ordinary deleted parent p,
the exact rank-seven bundle coefficient g5(C,C-p;u,v) is at least the
corresponding no-parent coefficient g5(C,C;u,v).

The proof is an exact nonnegative decomposition.  PFk denotes the F-category
independent k-sets containing p.  Removing the fixed vertices gives the
standard downward-shadow inequalities used below.  Coarse forest edge-union
bounds for the W rows complete the payment.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
INPUT = HERE / "iso_n7_bundle_g5_parent_modes_probe_rank7_g5_tail_20260831.json"
PARENT_SOURCE = HERE / "explore_iso_n7_bundle_g5_parent_modes_rank7_g5_tail.py"
OUTPUT = HERE / "iso_n7_bundle_g5_ordinary_reduction_exact_rank7_g5_finish_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G5_ORDINARY_REDUCTION_RANK7_G5_FINISH"
EXPECTED = {
    PARENT_SOURCE.name: "B5968431C7AC00E325D1372D4A23F19BFD98BB71491CD30ABF38204E126329E5",
    INPUT.name: "FF80D6A3F382E27E55316C6A31CE58D9D9E0DBC9027F38177F565ABA7D016309",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    for name, digest in EXPECTED.items():
        assert sha256(HERE / name) == digest
    report = json.loads(INPUT.read_text(encoding="utf-8"))
    assert report["marker"] == "PROBE_EXACT_ISO_N7_BUNDLE_G5_PARENT_MODES_RANK7_G5_TAIL"

    names = {"n"}
    names.update(f"{family}{rank}" for family in "WABZ" for rank in range(2, 8))
    names.update(
        f"P{family}{rank}"
        for family, ranks in {
            "A": (4, 5, 6), "B": (4, 5, 6),
            "W": (3, 4, 5, 6), "Z": (5, 6),
        }.items()
        for rank in ranks
    )
    s = {name: sp.Symbol(name, nonnegative=True) for name in sorted(names)}
    n = s["n"]
    ordinary = sp.expand(
        sp.sympify(report["modes"]["ordinary_parent"]["expression"], locals=s)
    )
    no_parent = sp.expand(
        sp.sympify(report["modes"]["no_parent"]["expression"], locals=s)
    )
    pvars = tuple(
        sorted((symbol for symbol in ordinary.free_symbols if str(symbol).startswith("P")), key=str)
    )
    assert sp.expand(ordinary.subs({variable: 0 for variable in pvars}) - no_parent) == 0
    correction = sp.expand(ordinary - no_parent)

    A2, B2, W2, W3 = (s[name] for name in ("A2", "B2", "W2", "W3"))
    A3, B3, Z2, Z3 = (s[name] for name in ("A3", "B3", "Z2", "Z3"))
    PA4, PA5, PA6 = (s[name] for name in ("PA4", "PA5", "PA6"))
    PB4, PB5, PB6 = (s[name] for name in ("PB4", "PB5", "PB6"))
    PW3, PW4, PW5, PW6 = (s[name] for name in ("PW3", "PW4", "PW5", "PW6"))
    PZ5, PZ6 = (s[name] for name in ("PZ5", "PZ6"))

    w2_floor = (n - 3) * (n - 4) / 2
    w3_floor = (n - 3) * (n - 4) * (n - 8) / 6

    shadow = {
        "sA5": (n - 5) * PA4 - 3 * PA5,
        "sA6": (n - 6) * PA5 - 4 * PA6,
        "sB5": (n - 5) * PB4 - 3 * PB5,
        "sB6": (n - 6) * PB5 - 4 * PB6,
        "sW4": (n - 5) * PW3 - 3 * PW4,
        "sW5": (n - 6) * PW4 - 4 * PW5,
        "sZ6": (n - 5) * PZ5 - 3 * PZ6,
    }

    k_ab = (9 * n**2 - 77 * n + 214) / 6
    decomp_a = (
        k_ab * PA4
        + (8 * B2 + 8 * (W2 - w2_floor)) * PA4
        + (15 * n - 10) * shadow["sA5"] / 6
        + sp.Rational(3, 2) * shadow["sA6"]
    )
    decomp_b = (
        k_ab * PB4
        + (8 * A2 + 8 * (W2 - w2_floor)) * PB4
        + (15 * n - 10) * shadow["sB5"] / 6
        + sp.Rational(3, 2) * shadow["sB6"]
    )
    decomp_z = (
        (10 * n + 22) * PZ5 / 3
        + sp.Rational(14, 3) * shadow["sZ6"]
    )

    c3 = A2 + B2 + 8 * A3 + 8 * B3 + 2 * W2 + 8 * W3 + 8 * Z3 - 2 * n
    c4 = 2 * (W2 - 3 * A2 - 3 * B2 - 7 * Z2 - n - 2)
    c3_floor = 2 * w2_floor + 8 * w3_floor - 2 * n
    c4_floor = n**2 - 21 * n + 18
    d_floor = -(4 * n**2 + n - 6) / 2
    k_w = (4 * n**3 - 95 * n**2 + 501 * n - 726) / 6
    decomp_w = (
        k_w * PW3
        + (c3 - c3_floor) * PW3
        + (c4 - c4_floor) * PW4
        + (-d_floor) * shadow["sW4"] / 3
        + (6 * n - 5) * shadow["sW5"] / 2
        + 2 * PW6
    )

    decomposition = sp.expand(decomp_a + decomp_b + decomp_w + decomp_z)
    assert sp.expand(correction - decomposition) == 0

    tail = sp.Symbol("t", nonnegative=True)
    coefficient_checks = {
        "k_ab_shift18": sp.expand((6 * k_ab).subs(n, tail + 18)),
        "k_w_shift18": sp.expand((6 * k_w).subs(n, tail + 18)),
        "minus_d_floor_shift18": sp.expand((-2 * d_floor).subs(n, tail + 18)),
        "15n_minus_10_shift18": sp.expand((15 * n - 10).subs(n, tail + 18)),
        "6n_minus_5_shift18": sp.expand((6 * n - 5).subs(n, tail + 18)),
        "z_coefficient_shift18": sp.expand((10 * n + 22).subs(n, tail + 18)),
    }
    assert all(
        all(coefficient >= 0 for coefficient in sp.Poly(value, tail).all_coeffs())
        for value in coefficient_checks.values()
    )

    # Exact nonnegative decompositions of the two row-floor slacks used above.
    delta_c3 = sp.factor(c3 - c3_floor)
    expected_delta_c3 = (
        A2 + B2 + 8 * A3 + 8 * B3 + 8 * Z3
        + 2 * (W2 - w2_floor) + 8 * (W3 - w3_floor)
    )
    assert sp.expand(delta_c3 - expected_delta_c3) == 0
    delta_c4 = sp.factor(c4 - c4_floor)
    expected_delta_c4 = (
        2 * (W2 - w2_floor)
        + 6 * ((n - 2) - A2) + 6 * ((n - 2) - B2)
        + 14 * (1 - Z2)
    )
    assert sp.expand(delta_c4 - expected_delta_c4) == 0

    out = {
        "marker": MARKER,
        "theorem": (
            "For every forest C of order n>=18, every ordered pair of distinct "
            "marks, and every ordinary parent p, the exact rank-seven bundle "
            "g5 in mode D=C-p is at least its no-parent D=C value."
        ),
        "threshold": 18,
        "exact_identity_verified": True,
        "ordinary_minus_no_parent": str(sp.factor(correction)),
        "nonnegative_decomposition": {
            "A_chain": str(sp.factor(decomp_a)),
            "B_chain": str(sp.factor(decomp_b)),
            "W_chain": str(sp.factor(decomp_w)),
            "Z_chain": str(sp.factor(decomp_z)),
        },
        "shadow_slacks": {name: str(value) for name, value in shadow.items()},
        "shadow_justification": (
            "After deleting the fixed parent and fixed included marks, each PFk "
            "is a level of a downward-closed independence complex on at most "
            "n-3 remaining vertices. Double-counting deletion/extension pairs "
            "gives the seven displayed nonnegative shadow slacks."
        ),
        "forest_row_floors": {
            "W2": str(w2_floor),
            "W3": str(w3_floor),
            "justification": (
                "W is a forest on n-2 vertices with at most n-3 edges. Edge "
                "union bounds give W2>=C(n-2,2)-(n-3) and "
                "W3>=C(n-2,3)-(n-3)(n-4)."
            ),
            "delta_c3": str(delta_c3),
            "delta_c4": str(delta_c4),
        },
        "shifted_coefficient_checks": {
            name: str(value) for name, value in coefficient_checks.items()
        },
        "dependencies_sha256": EXPECTED,
        "scope": (
            "Exact reduction of ordinary-parent g5 to no-parent g5 for n>=18. "
            "It does not itself prove the no-parent coefficient nonnegative."
        ),
        "status": MARKER,
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(out, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "threshold": 18,
        "exact_identity_verified": True,
        "shifted_coefficient_checks": out["shifted_coefficient_checks"],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", out["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
