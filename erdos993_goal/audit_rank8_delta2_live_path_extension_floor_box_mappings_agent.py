#!/usr/bin/env python3
"""Independent exact mapping audit for the active extension-floor boxes.

This audit imports no production tensor code.  It pins the active source and
all theorem inputs, reconstructs both piecewise Z-floor substitutions, proves
their cleared denominators positive on the two unit boxes, and checks the
tighter coupled-coordinate bindings used by the active runs.
"""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta2_live_path_extension_floor_box_mappings_independent_audit_agent_20260825.json"
EXPECTED = {
    "certify_rank8_delta2_live_path_extension_floor_box_root.py": "AEFADCD38F4A2902F7D328E8E304362B9BAD8C4294C816DC1CB9A028126E3533",
    "verify_rank8_root_deletion_extension_floor_root.py": "2BB6CE48D9A8B49BCDE3B65FF07AB8F11FACC6397CC2A4E6064B6B5F5AEB76B3",
    "rank8_root_deletion_extension_floor_exact_root_20260825.json": "BEE275224112110FEFBE2985EC3F58C039CF158371F58C3FC23AF89DD58D31D9",
    "audit_rank8_root_deletion_extension_floor_root.py": "5C9FABCFEB4EE4987B85F361600525CD2D62121C9423872C2B6E634BDFA92920",
    "rank8_root_deletion_extension_floor_independent_audit_root_20260825.json": "B2B3F3994D683582DCBF91BD403D3C130588BDBE4405A94F6E847A70B3AB7281",
    "verify_rank8_n28_tight_coordinate_chords_root.py": "F0EC00028526D82952FF7F072B6DDAB1A2638554333F2B2D743ED650845336BC",
    "rank8_n28_tight_coordinate_chords_exact_root_20260825.json": "6C8393A292044D7843898BBE1F72C5416BD39EA49691D3DD03400A76CD12CA7D",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def bernstein_coefficients(poly: sp.Expr, variable: sp.Symbol) -> list[sp.Rational]:
    power = sp.Poly(sp.expand(poly), variable, domain=sp.QQ)
    degree = power.degree()
    coefficients = [power.nth(k) for k in range(degree + 1)]
    return [
        sp.factor(
            sum(
                coefficients[k] * sp.Rational(math.comb(i, k), math.comb(degree, k))
                for k in range(i + 1)
            )
        )
        for i in range(degree + 1)
    ]


def main() -> None:
    actual = {name: sha256(HERE / name) for name in EXPECTED}
    assert actual == EXPECTED

    theorem = json.loads((HERE / "rank8_root_deletion_extension_floor_exact_root_20260825.json").read_text())
    theorem_audit = json.loads(
        (HERE / "rank8_root_deletion_extension_floor_independent_audit_root_20260825.json").read_text()
    )
    chords = json.loads((HERE / "rank8_n28_tight_coordinate_chords_exact_root_20260825.json").read_text())
    assert theorem["status"] == "PASS_EXACT_ALL_ORDER_ROOT_DELETION_EXTENSION_FLOOR"
    assert theorem_audit["status"] == "PASS_INDEPENDENT_ROOT_DELETION_EXTENSION_FLOOR_AUDIT"
    assert chords["status"] == "PASS_EXACT_N28_PLUS_TIGHT_COORDINATE_CHORDS"
    assert theorem_audit["immutable_inputs"] == {
        "verify_rank8_root_deletion_extension_floor_root.py": EXPECTED[
            "verify_rank8_root_deletion_extension_floor_root.py"
        ],
        "rank8_root_deletion_extension_floor_exact_root_20260825.json": EXPECTED[
            "rank8_root_deletion_extension_floor_exact_root_20260825.json"
        ],
    }

    n, t, T, Zc = sp.symbols("n t T Zc")
    e3 = (n**2 - 26 * n + 100) / (n**2 - 19 * n + 72)
    b4 = ((n - 11) * (n - 12) * (n - 13)) / (
        (n - 11) * (n - 12) * (n - 13) + 7 * (n - 5) * (n - 6)
    )
    domains = {}
    for name, t_map, p, q, endpoint_orders in (
        (
            "finite",
            sp.Rational(1, 41) + (sp.Rational(1, 28) - sp.Rational(1, 41)) * T,
            1 - 26 * t + 100 * t**2,
            7 * t * (1 - 4 * t),
            (41, 28),
        ),
        (
            "tail",
            T / 42,
            sp.prod(1 - j * t for j in (11, 12, 13)),
            7 * t * (1 - 5 * t) * (1 - 6 * t),
            (None, 42),
        ),
    ):
        d = sp.expand(p + q)
        expected_floor = e3 if name == "finite" else b4
        assert sp.cancel(expected_floor.subs(n, 1 / t) - p / d) == 0
        assert sp.cancel((p + q * Zc).subs(Zc, 0) / d - p / d) == 0
        assert sp.cancel((p + q * Zc).subs(Zc, 1) / d - 1) == 0
        mapped = {label: sp.expand(expression.subs(t, t_map)) for label, expression in {"p": p, "q": q, "d": d}.items()}
        bernstein = {label: bernstein_coefficients(expression, T) for label, expression in mapped.items()}
        assert all(value > 0 for value in bernstein["p"])
        assert all(value >= 0 for value in bernstein["q"])
        assert all(value > 0 for value in bernstein["d"])
        assert sp.cancel(t_map.subs(T, 0) - (0 if endpoint_orders[0] is None else sp.Rational(1, endpoint_orders[0]))) == 0
        assert sp.cancel(t_map.subs(T, 1) - sp.Rational(1, endpoint_orders[1])) == 0
        domains[name] = {
            "t_map": str(t_map),
            "endpoint_orders": [endpoint_orders[0], endpoint_orders[1]],
            "p": str(sp.factor(p)),
            "q": str(sp.factor(q)),
            "d": str(sp.factor(d)),
            "positive_denominator_bernstein": [str(value) for value in bernstein["d"]],
            "nonnegative_q_bernstein": [str(value) for value in bernstein["q"]],
        }

    samples = {row["order"]: row for row in theorem["rank8_corollary"]["samples"]}
    for order in (28, 31, 40, 41):
        assert samples[order]["extension_d3"] == str(sp.factor(e3.subs(n, order)))
        assert samples[order]["active_branch"] == "extension_d3"
    for order in (42, 80, 200, 1000):
        assert samples[order]["binomial_d4"] == str(sp.factor(b4.subs(n, order)))
        assert samples[order]["active_branch"] == "binomial_d4"

    source_text = (HERE / "certify_rank8_delta2_live_path_extension_floor_box_root.py").read_text()
    required_fragments = (
        'choices=("finite", "tail")',
        "sp.Rational(1, 41) + (sp.Rational(1, 28) - sp.Rational(1, 41)) * T",
        "p = 1 - 26 * t_map + 100 * t_map**2",
        "q = 7 * t_map * (1 - 4 * t_map)",
        "t_map = T / 42",
        "p = sp.prod(1 - j * t_map for j in (11, 12, 13))",
        "q = 7 * t_map * (1 - 5 * t_map) * (1 - 6 * t_map)",
        "y_upper = 3 + sp.Rational(546, 25) * t_map",
        "r_upper = sp.Rational(4, 3) + sp.Rational(1008, 173) * t_map",
        "term *= z_powers[z_power] * d_powers[z_degree - z_power]",
    )
    assert all(fragment in source_text for fragment in required_fragments)
    assert chords["bounds"] == {
        "y": "y<=3+(546/25)t",
        "r": "r<=4/3+(1008/173)t",
    }

    payload = {
        "schema": "rank8-delta2-live-path-extension-floor-box-mappings-independent-audit-agent-v1",
        "status": "PASS_INDEPENDENT_EXACT_EXTENSION_FLOOR_BOX_MAPPING_AUDIT",
        "method": "No production tensor import; exact symbolic reconstruction and source-text binding.",
        "domains": domains,
        "coordinate_chords": chords["bounds"],
        "source_binding_fragments": list(required_fragments),
        "immutable_inputs": actual,
        "finalization_boundary": (
            "The active box source itself pins the primary extension-floor and chord reports. "
            "A final theorem assembler must additionally pin this mapping audit and the no-import "
            "extension-floor audit; box PASS results remain path/domain-scoped."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
