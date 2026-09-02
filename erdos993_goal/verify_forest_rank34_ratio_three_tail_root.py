#!/usr/bin/env python3
"""Certify i4(F) >= 3*i3(F) for every forest of order at least 33.

The independence-set inclusion--exclusion formulas through rank four use
only the order n, the number of edges e, the number of adjacent edge pairs
w, and the number t of connected three-edge sets:

    i3 = C(n,3) - e(n-2) + w,
    i4 = C(n,4) - e C(n-2,2) + w(n-4) + C(e,2) - t.

For a forest, e <= n-1, Cauchy's inequality gives
w >= 2e^2/n-e, and trivially t <= C(e,3).  The target i4-3*i3 is
increasing in w and decreasing in t once n>=33, so these two substitutions
give a valid lower bound.  The remaining two-variable polynomial is checked
exactly on n>=33 and 0<=e<=n-1 by tensor Bernstein coefficients.
"""

from __future__ import annotations

import hashlib
import json
import os
import platform
from pathlib import Path

import sympy as sp

from explore_rank4_three_halves_grouped import (
    minimum_with_index,
    tensor_bernstein_fast,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "forest_rank34_ratio_three_tail_exact_root_20260826.json"
CUTOFF = 33


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def choose(value: sp.Expr, rank: int) -> sp.Expr:
    return sp.prod(value - offset for offset in range(rank)) / sp.factorial(rank)


def certificate() -> dict[str, object]:
    n, edges, wedges, triples = sp.symbols(
        "n edges wedges triples", real=True
    )
    i3 = choose(n, 3) - edges * (n - 2) + wedges
    i4 = (
        choose(n, 4)
        - edges * choose(n - 2, 2)
        + wedges * (n - 4)
        + choose(edges, 2)
        - triples
    )
    target = sp.expand(i4 - 3 * i3)
    assert sp.diff(target, wedges) == n - 7
    assert sp.diff(target, triples) == -1

    lower = sp.factor(
        target.subs(
            {
                wedges: 2 * edges**2 / n - edges,
                triples: choose(edges, 3),
            }
        )
    )

    reciprocal_order, edge_fraction = sp.symbols(
        "reciprocal_order edge_fraction", nonnegative=True
    )
    mapped = sp.cancel(
        lower.subs(
            {
                n: sp.Integer(CUTOFF) / reciprocal_order,
                edges: (
                    sp.Integer(CUTOFF) / reciprocal_order - 1
                ) * edge_fraction,
            },
            simultaneous=True,
        )
        * reciprocal_order**4
    )
    assert sp.denom(mapped) == 1
    polynomial = sp.expand(mapped)
    variables = (reciprocal_order, edge_fraction)
    degrees, coefficients = tensor_bernstein_fast(polynomial, variables)
    minimum, index = minimum_with_index(coefficients)
    negatives = sum(1 for value in coefficients.flat if bool(value < 0))
    zeros = sum(1 for value in coefficients.flat if bool(value == 0))
    assert negatives == 0
    assert minimum >= 0

    return {
        "cutoff": CUTOFF,
        "degrees": [int(value) for value in degrees],
        "Bernstein_coefficients": int(coefficients.size),
        "negative_coefficients": negatives,
        "zero_coefficients": zeros,
        "minimum_coefficient": str(minimum),
        "minimum_index": [int(value) for value in index],
        "mapped_polynomial": str(sp.factor(polynomial)),
        "lower_bound": str(lower),
    }


def main() -> int:
    exact = certificate()
    payload = {
        "schema": "forest-rank34-ratio-three-tail-root-v1",
        "status": "PASS_EXACT_FOREST_I4_AT_LEAST_THREE_I3_ORDER33_PLUS",
        "theorem": (
            "Every forest F of order n>=33 satisfies "
            "i4(F)>=3*i3(F), equivalently i3(F)/i4(F)<=1/3."
        ),
        "proof": {
            "inclusion_exclusion": (
                "i3=C(n,3)-e(n-2)+w and "
                "i4=C(n,4)-e*C(n-2,2)+w(n-4)+C(e,2)-t"
            ),
            "forest_bounds": [
                "0<=e<=n-1",
                "w>=2e^2/n-e by Cauchy on the degree sequence",
                "t<=C(e,3)",
            ],
            "monotonicity": (
                "i4-3*i3 has wedge derivative n-7>0 and "
                "connected-triple derivative -1"
            ),
            "unit_box_map": (
                "n=33/reciprocal_order and "
                "e=(n-1)*edge_fraction"
            ),
            "exact_certificate": exact,
        },
        "immutable_inputs": {
            "explore_rank4_three_halves_grouped.py": sha256(
                HERE / "explore_rank4_three_halves_grouped.py"
            )
        },
        "software": {
            "python": platform.python_version(),
            "sympy": sp.__version__,
        },
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "This is the rank-(3,4) forest ratio tail only; the strong-Q5 "
            "assembly and the rank-8 theorem require separate certificates."
        ),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"])
    print("DEGREES", exact["degrees"])
    print("COEFFICIENTS", exact["Bernstein_coefficients"])
    print("MINIMUM", exact["minimum_coefficient"], exact["minimum_index"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
