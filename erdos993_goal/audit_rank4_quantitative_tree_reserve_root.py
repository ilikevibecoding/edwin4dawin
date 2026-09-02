#!/usr/bin/env python3
"""Independent algebraic audit of the quantitative rank-four reserve."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


ROOT = Path(__file__).resolve().parent
PRIMARY = ROOT / "rank4_quantitative_tree_reserve_exact_root_20260823.json"
OUTPUT = ROOT / "rank4_quantitative_tree_reserve_independent_audit_root_20260823.json"
EXPECTED = {
    PRIMARY.name: "C7C19AFA2C06C1309B388399A26818EBC85D77F9D0494B182428B006AAEDE6F0",
    "verify_rank4_quantitative_tree_reserve_root.py":
        "41F7BFD003F8956A4A8F5DFDDEC7536BFC1C9CB0540CF9BE72B2FE1132DB4148",
    "verify_rank4_three_halves_leaf_certificate.py":
        "96CBFFC37EA83C71A5E9B8C79440B00AF00138A67C0FF926DBD3B2FD7BEA1396",
    "RANK4_THREE_HALVES_LEAF_CERTIFICATE_2026-07-27.md":
        "65D25F0F6F7E7BDE888712D5AEEE37D747100AF79BD38531DFE893CB234E4732",
    "verify_rank7_terminal_broom_middle_differences.py":
        "805CDE618B12FEBB51E3F6AB29E1A9174F170C9108EDF5CD65333907A14781D2",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    primary = json.loads(PRIMARY.read_text(encoding="utf-8"))
    assert primary["status"] == "PASS_EXACT_QUANTITATIVE_Q4_TREE_RESERVE_N20_PLUS"

    n, m, c3, c4, c5 = sp.symbols("n m c3 c4 c5", positive=True)
    epsilon = sp.Rational(5_006_347, 3_686_400_000)
    assert sp.Rational(primary["epsilon"]) == epsilon

    # A separate Faulhaber derivation, checked by its defining recurrence.
    leaf_sum = sp.factor(sp.summation(m**6, (m, 20, n - 1)))
    reported_sum = sp.sympify(primary["induction"]["sum_formula"], locals={"n": n})
    assert sp.factor(leaf_sum - reported_sum) == 0
    assert leaf_sum.subs(n, 20) == 0
    assert sp.factor(leaf_sum.subs(n, n + 1) - leaf_sum - n**6) == 0
    q4_floor = sp.factor(epsilon * leaf_sum)
    assert sp.factor(
        q4_floor
        - sp.sympify(primary["induction"]["Q4_lower_bound"], locals={"n": n})
    ) == 0

    # Independently verify that the explicit star-center increment also has
    # the advertised epsilon reserve for every n>=20 by shifted coefficients.
    r = sp.symbols("r", nonnegative=True)
    ell = n - 1
    star_increment = sp.factor(
        ell**2 * (ell - 2) * (ell - 1) ** 2 * (7 * ell - 5) / 144
    )
    star_margin_num = sp.together(star_increment - epsilon * n**6).as_numer_denom()[0]
    star_shift = sp.Poly(sp.expand(star_margin_num.subs(n, r + 20)), r)
    assert all(coefficient > 0 for coefficient in star_shift.all_coeffs())

    # Re-derive the coordinate identity without importing the primary route.
    q4 = 8 * c4**2 - c3 * c4 - 10 * c3 * c5
    x = c3 / c4
    d4 = 1 - c3 * c5 / c4**2
    d4_low = (2 + x) / 10
    assert sp.factor(d4 - d4_low - q4 / (10 * c4**2)) == 0

    d4_ceiling = sp.Rational(1559, 3575)
    x_floor = 4 / (n - 3)
    denominator_ceiling = 10 * sp.binomial(n, 4) ** 2 * (
        d4_ceiling - (2 + x_floor) / 10
    )
    u_floor = sp.factor(q4_floor / denominator_ceiling)
    reported_u = sp.sympify(
        primary["rank8_D4_coordinate_corollary"]["U_lower_bound"],
        locals={"n": n, "binomial": sp.binomial},
    )
    assert sp.factor(u_floor - reported_u) == 0
    assert sp.factor(d4_ceiling - (2 + x_floor) / 10).subs(n, 20) > 0
    shifted_factor_num = sp.together(d4_ceiling - (2 + x_floor) / 10).as_numer_denom()[0]
    assert all(
        coefficient > 0
        for coefficient in sp.Poly(sp.expand(shifted_factor_num.subs(n, r + 20)), r).all_coeffs()
    )

    sample_replays = []
    for row in primary["rank8_D4_coordinate_corollary"]["samples"]:
        order = row["order"]
        q_value = sp.factor(q4_floor.subs(n, order))
        u_value = sp.factor(u_floor.subs(n, order))
        assert str(q_value) == row["Q4_lower_bound"]
        assert str(u_value) == row["rank8_U_lower_bound"]
        assert q_value > 0 and u_value > 0
        sample_replays.append({
            "order": order,
            "Q4_lower_bound": str(q_value),
            "rank8_U_lower_bound": str(u_value),
        })

    payload = {
        "schema": "rank4-quantitative-tree-reserve-independent-audit-root-v1",
        "status": "PASS_INDEPENDENT_QUANTITATIVE_Q4_TREE_RESERVE_AUDIT",
        "methods": [
            "independent Faulhaber summation plus recurrence check",
            "shifted-coefficient proof of the star-center epsilon margin",
            "symbolic re-derivation of d4-d4_low=Q4/(10*c4^2)",
            "independent denominator-ceiling derivation and exact sample replay",
        ],
        "epsilon": str(epsilon),
        "sum_formula": str(leaf_sum),
        "rank8_U_lower_bound": str(u_floor),
        "sample_replays": sample_replays,
        "immutable_inputs": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "This audits a quantitative rank-four input only; it does not prove the "
            "pending rank-eight residuals or Problem 993."
        ),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("OUTPUT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
