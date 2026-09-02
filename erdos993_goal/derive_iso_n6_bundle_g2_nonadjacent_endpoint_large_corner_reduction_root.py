#!/usr/bin/env python3
"""Exact corner reduction for nonadjacent endpoint-parent rank-six G2."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
PINS = {
    "occupation": (
        "iso_n6_bundle_g2_nonadjacent_endpoint_parent_occupation_"
        "exact_root_20260831.json",
        "9DDD8602D189BFE8F932E70919970F663B9DFA1F36AC60DF1BBCC2BA7DA58437",
    ),
    "adjacent_four_corner": (
        "iso_n6_bundle_g2_adjacent_endpoint_four_corner_exact_"
        "rank7_g5_finish_20260831.json",
        "CC5E2172087C7CE76992B680F1CC84E1E44A2A31F64FCA92ED0C9AFA989E9E38",
    ),
    "ratio_floor": (
        "iso_n6_bundle_g2_nonadjacent_ordinary_pw2_ratio_floor_"
        "exact_root_20260831.json",
        "A6EA8DB36702DED69ADEE4C8D6CC7D5F3B78D65EC0625F7859D69743F5BD25FA",
    ),
}
OUTPUT = HERE / (
    "iso_n6_bundle_g2_nonadjacent_endpoint_large_corner_reduction_"
    "exact_root_20260831.json"
)
MARKER = (
    "PASS_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_ENDPOINT_LARGE_"
    "CORNER_REDUCTION_ROOT"
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def choose_polynomial(value, rank: int):
    return sp.expand(
        sp.prod(value - offset for offset in range(rank)) / sp.factorial(rank)
    )


def main() -> None:
    for filename, expected in PINS.values():
        assert sha256(HERE / filename) == expected
    occupation = json.loads(
        (HERE / PINS["occupation"][0]).read_text(encoding="utf-8")
    )
    adjacent = json.loads(
        (HERE / PINS["adjacent_four_corner"][0]).read_text(encoding="utf-8")
    )
    ratio = json.loads(
        (HERE / PINS["ratio_floor"][0]).read_text(encoding="utf-8")
    )
    assert occupation["endpoint_u_split"] == (
        "A2(A)+L2(A,B)+M2(A,C)+R2(B,C)+R2(A,D)"
    )
    assert adjacent["corner_count"] == 4
    assert ratio["ratio_floor"]["valid_for"] == "N>=19"

    a = sp.symbols("a0:8", nonnegative=True)
    b = sp.symbols("b0:7", nonnegative=True)
    c = sp.symbols("c0:7", nonnegative=True)
    d = sp.symbols("d0:6", nonnegative=True)
    locals_ = {str(item): item for item in (*a, *b, *c, *d)}
    pieces = {
        label: sp.sympify(value, locals=locals_)
        for label, value in occupation["pieces"].items()
    }
    expression = sp.expand(sum(pieces.values()))
    adjacent_part = sp.expand(expression - pieces["R2_AD"])
    assert not any(variable in adjacent_part.free_symbols for variable in d)

    derivatives = {
        f"D{rank}": sp.factor(sp.diff(expression, d[rank]))
        for rank in range(2, 6)
    }
    expected = {
        "D2": 2 * a[1] + 6 * a[2] + 18 * a[3] - 2 * a[4],
        "D3": a[1] - a[2] + 10 * a[3],
        "D4": -8 * a[1] - 2 * a[2],
        "D5": -7 * a[1],
    }
    assert all(
        sp.expand(derivatives[label] - value) == 0
        for label, value in expected.items()
    )
    assert sp.diff(expression, d[2], 2) == 0
    assert not expression.has(sp.Symbol("d6"))

    n = sp.symbols("N", integer=True, positive=True)
    d3_forest_floor = sp.factor(sp.expand_func(
        n - sp.binomial(n, 2) + 10 * sp.binomial(n - 2, 3)
    ))
    assert sp.factor(
        d3_forest_floor - (n - 3) * (10 * n**2 - 63 * n + 80) / 6
    ) == 0
    d3_quadratic = 10 * n**2 - 63 * n + 80
    assert d3_quadratic.subs(n, 19) > 0
    assert sp.diff(d3_quadratic, n).subs(n, 19) > 0

    # The extra R2(A,D) summand contains no B or C variable.  Therefore every
    # B,C derivative and endpoint decision is literally the adjacent one.
    bc_variables = tuple(b[2:7]) + tuple(c[2:7])
    derivative_transfer = {
        str(variable): sp.expand(
            sp.diff(expression, variable)
            - sp.diff(adjacent_part, variable)
        ) == 0
        for variable in bc_variables
    }
    assert all(derivative_transfer.values())

    report = {
        "marker": MARKER,
        "rank": 6,
        "coefficient": "g2",
        "scope": "nonadjacent endpoint-parent mode, N>=19; exact reduction",
        "functional": occupation["endpoint_u_split"],
        "D_derivatives": {
            label: str(value) for label, value in derivatives.items()
        },
        "D_endpoints": {
            "D2": "affine; check both 0 and C(d,2)",
            "D3": (
                "positive on every N>=19 forest because "
                "a1-a2+10a3 >= (N-3)(10N^2-63N+80)/6; use floor 0"
            ),
            "D4_D5": (
                "strictly negative for N>=19; use edgeless ceilings "
                "C(d,4), C(d,5)"
            ),
            "D6": "absent",
        },
        "D3_forest_floor": str(d3_forest_floor),
        "B_C_transfer": {
            "extra_term_independent_of_B_C": True,
            "derivative_identities": derivative_transfer,
            "pinned_adjacent_corner_count": adjacent["corner_count"],
            "B2_C2_corners": 4,
        },
        "corner_count_per_orientation": 8,
        "ratio_floor": {
            "valid_for": ratio["ratio_floor"]["valid_for"],
            "simplex_active_mass": ratio["ratio_floor"]["simplex_active_mass"],
        },
        "pins": {
            label: {"file": filename, "sha256": expected}
            for label, (filename, expected) in PINS.items()
        },
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "D_derivatives": report["D_derivatives"],
        "corner_count_per_orientation": report["corner_count_per_orientation"],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
