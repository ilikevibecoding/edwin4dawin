#!/usr/bin/env python3
"""Exact occupancy-balancing theorem for the balanced m=0 row sector.

This is a structural theorem, not the terminal m=0 sign proof.  It removes
the occupancy-histogram dimension from the exact all-row certificate: within
each class of equal centre degree, the coefficientwise minimum is attained
when the occupied-arm counts differ by at most one.
"""

from __future__ import annotations

import hashlib
import json
import os
from functools import lru_cache
from math import comb
from pathlib import Path

import sympy as sp

from scan_terminal_q3_low_newton_m0_balanced_all_row_sector_exact_adversary import (
    component_base_rows,
    convolve,
    histograms,
    row_power,
)


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "balanced_subdivided_star_occupancy_balancing_exact_adversary_20260829.json"
NOTE = ROOT / "BALANCED_SUBDIVIDED_STAR_OCCUPANCY_BALANCING_2026-08-29.md"
DEPENDENCY = ROOT / "scan_terminal_q3_low_newton_m0_balanced_all_row_sector_exact_adversary.py"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def C(n: int, k: int) -> int:
    return comb(n, k) if 0 <= k <= n else 0


@lru_cache(maxsize=None)
def balanced_group_row(
    centres: int, degree: int, occupied: int, maximum: int
) -> tuple[int, ...]:
    """Coefficientwise-minimum product of component F^0 rows."""
    if centres == 0:
        assert occupied == 0
        return (1,) + (0,) * maximum
    assert 0 <= occupied <= centres * degree
    low, high_count = divmod(occupied, centres)
    assert low <= degree and low + (high_count > 0) <= degree
    low_row = component_base_rows(degree, low, maximum)[0]
    output = row_power(low_row, centres - high_count, maximum)
    if high_count:
        high_row = component_base_rows(degree, low + 1, maximum)[0]
        output = convolve(
            output, row_power(high_row, high_count, maximum), maximum
        )
    return output


def exchange_identity() -> dict[str, object]:
    """Prove the exact coefficient-positive unit occupancy exchange."""
    x = sp.symbols("x")
    A, B = 1 + x, 1 + 2 * x
    checks = 0
    minimum_coefficient = None
    for degree in range(1, 13):
        for v in range(1, degree + 1):
            for u in range(v, degree):
                F = lambda y: B**y * A ** (degree - y) + x * A**y
                lhs = sp.expand(F(u + 1) * F(v - 1) - F(u) * F(v))
                k = u - v + 1
                rhs = sp.expand(
                    x**5
                    * B ** (v - 1)
                    * A ** (degree - u + v - 2)
                    * sum(A ** (2 * (k - 1 - i)) * B**i for i in range(k))
                )
                assert sp.expand(lhs - rhs) == 0
                coefficients = sp.Poly(rhs, x).all_coeffs()
                assert all(value >= 0 for value in coefficients)
                local = min(int(value) for value in coefficients)
                minimum_coefficient = (
                    local
                    if minimum_coefficient is None
                    else min(minimum_coefficient, local)
                )
                checks += 1
    return {
        "identity": (
            "F_(u+1)F_(v-1)-F_uF_v=x^5 B^(v-1) "
            "A^(r-u+v-2) sum_(i=0)^(u-v) A^(2(u-v-i))B^i"
        ),
        "definitions": "A=1+x, B=1+2x, F_y=B^y A^(r-y)+x A^y",
        "scope": "1<=v<=u<r; every displayed factor is coefficientwise nonnegative",
        "symbolic_instances": checks,
        "minimum_expanded_coefficient": minimum_coefficient,
        "induction": (
            "If two occupancies differ by at least two, moving one occupied "
            "arm from the larger to the smaller reverses the displayed "
            "unequalizing exchange and weakly decreases the product.  Repeating "
            "terminates exactly at occupancies differing by at most one."
        ),
    }


def finite_histogram_audit() -> dict[str, object]:
    classes = histogram_rows = coefficient_checks = 0
    minimum_slack = None
    first_equality = None
    for centres in range(1, 8):
        for degree in range(0, 8):
            maximum = max(8, centres * max(1, degree) + centres)
            by_total: dict[int, list[tuple[int, ...]]] = {}
            for histogram in histograms(centres, degree):
                occupied = sum(index * count for index, count in enumerate(histogram))
                row = (1,) + (0,) * maximum
                for value, count in enumerate(histogram):
                    if count:
                        component = component_base_rows(degree, value, maximum)[0]
                        row = convolve(row, row_power(component, count, maximum), maximum)
                by_total.setdefault(occupied, []).append(row)
                histogram_rows += 1
            for occupied, rows in by_total.items():
                floor = balanced_group_row(centres, degree, occupied, maximum)
                for row in rows:
                    for rank, (actual, bound) in enumerate(zip(row, floor)):
                        slack = actual - bound
                        assert slack >= 0
                        if slack == 0 and first_equality is None:
                            first_equality = [centres, degree, occupied, rank]
                        minimum_slack = slack if minimum_slack is None else min(minimum_slack, slack)
                        coefficient_checks += 1
            classes += 1
    return {
        "degree_classes": classes,
        "histogram_rows": histogram_rows,
        "coefficient_checks": coefficient_checks,
        "minimum_slack": minimum_slack,
        "first_equality": first_equality,
    }


def theorem_note() -> str:
    return """# Balanced subdivided-star occupancy balancing

Date: 2026-08-29

For a centre of degree `r` with `y` occupied arms, put

```text
A=1+x, B=1+2x,
F_y=B^y A^(r-y)+x A^y.
```

For `1<=v<=u<r`, direct expansion gives

```text
F_(u+1)F_(v-1)-F_uF_v
=x^5 B^(v-1) A^(r-u+v-2)
  sum_(i=0)^(u-v) A^(2(u-v-i))B^i >=coeff 0.       (1)
```

Thus an unequalizing transfer weakly increases the product.  Reversing such
transfers proves that, among equal-degree centres with a fixed total number
of occupied arms, the coefficientwise minimum is attained when the centre
occupancies differ by at most one.

For balanced arm counts `R=d*q+s`, apply (1) independently to the `s`
degree-`q+1` centres and the `d-s` degree-`q` centres.  If their occupied-arm
totals are `Y_hi,Y_lo`, the exact all-row lower is therefore the product of
the two balanced group rows.  The excluded-centre product
`H^0=B^(Y_hi+Y_lo)A^(R-Y_hi-Y_lo)` is distribution-independent, so subtracting
it gives the simultaneous coefficientwise lower for `E^0=F^0-H^0`.

This is an all-order structural theorem.  It removes the occupancy-histogram
dimension from the retained-`h_(j-1)` certificate, but does not by itself
prove the remaining scalar sign, terminal Newton `m=0`, or Erdos Problem 993.

Replay:

```powershell
python .\\prove_balanced_subdivided_star_occupancy_balancing_adversary.py
```

Required marker:

```text
PASS_EXACT_ALL_ORDER_BALANCED_OCCUPANCY_BALANCING
```
"""


def main() -> None:
    identity = exchange_identity()
    audit = finite_histogram_audit()
    NOTE.write_text(theorem_note(), encoding="utf-8")
    payload = {
        "schema": "balanced-subdivided-star-occupancy-balancing-exact-adversary-v1",
        "status": "PASS_EXACT_ALL_ORDER_BALANCED_OCCUPANCY_BALANCING",
        "theorem": {
            "equal_degree_minimum": (
                "At fixed centre degree r and total occupied-arm count, "
                "prod_i F_(y_i) is coefficientwise minimized when the y_i "
                "differ by at most one."
            ),
            "balanced_two_class_reduction": (
                "For R=dq+s, apply the theorem separately to the s degree-(q+1) "
                "centres and d-s degree-q centres.  Since H^0=B^Y A^(R-Y) "
                "depends only on Y, the same canonical product minimizes E^0."
            ),
        },
        "exact_exchange_proof": identity,
        "finite_histogram_audit": audit,
        "dependency_sha256": {DEPENDENCY.name: sha256(DEPENDENCY)},
        "note_sha256": sha256(NOTE),
        "scope_warning": (
            "This is an all-order occupancy-row theorem, not the all-parameter "
            "m=0 sign certificate or Erdos Problem 993."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"])
    print("exact_exchange_proof", identity)
    print("finite_histogram_audit", audit)
    print("source_sha256", payload["source_sha256"])
    print("report_sha256", sha256(OUTPUT))
    print("note_sha256", payload["note_sha256"])


if __name__ == "__main__":
    main()
