"""Exact benign PF collision rejecting length-three nonvanishing."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from prove_quartic_minimal_compatibility_resultants import X, window_polynomial


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "pf_length3_benign_collision_exact_20260806.json"


def digest(poly: sp.Poly) -> str:
    _, cleared = poly.clear_denoms(convert=True)
    _, primitive = cleared.primitive()
    return hashlib.sha256(",".join(map(str, primitive.all_coeffs())).encode("ascii")).hexdigest()


def main() -> None:
    p, alpha = 23, 6
    u, v = sp.Rational(1, 10), sp.Rational(1)
    x = sp.Rational(-55365151838956793227, 2432902493487393708)
    gamma = [sp.Integer(1), -(u + v), u * v]
    rows = [
        sp.Poly(X**j * window_polynomial(p - 2 * j, alpha + j, gamma).as_expr(), X)
        for j in range(4)
    ]
    d0 = sp.Poly(rows[1].as_expr() ** 2 - rows[0].as_expr() * rows[2].as_expr(), X)
    d2 = sp.Poly(rows[2].as_expr() ** 2 - rows[1].as_expr() * rows[3].as_expr(), X)
    e = sp.Poly(rows[0].as_expr() * rows[3].as_expr() - rows[1].as_expr() * rows[2].as_expr(), X)
    values = [d2.eval(x), e.eval(x), d0.eval(x)]
    orientation = 1 if values[0] > 0 else -1
    weights = [orientation * value for value in values]
    assert all(value > 0 for value in weights)
    pf_gap = sp.factor(weights[1] ** 2 - 4 * weights[0] * weights[2])
    assert pf_gap > 0

    q0 = sp.Poly(sum(weights[j] * rows[j].as_expr() for j in range(3)), X)
    q1 = sp.Poly(sum(weights[j] * rows[j + 1].as_expr() for j in range(3)), X)
    assert q0.eval(x) == q1.eval(x) == 0
    below0 = int(sp.polys.polytools.count_roots(q0, -sp.oo, x))
    below1 = int(sp.polys.polytools.count_roots(q1, -sp.oo, x))
    assert below0 == below1 == 1
    derivative_product = sp.factor(q0.diff().eval(x) * q1.diff().eval(x))
    assert derivative_product > 0
    assert sp.polys.polytools.count_roots(q0, -sp.oo, sp.oo) == q0.degree()
    assert sp.polys.polytools.count_roots(q1, -sp.oo, sp.oo) == q1.degree()

    ratio0 = sp.factor(weights[0] / weights[2])
    ratio1 = sp.factor(weights[1] / weights[2])
    q_approx = float(ratio0) ** 0.5
    z_approx = float(ratio1) - 2 * q_approx
    assert z_approx > 0
    report = {
        "status": "EXACT_BENIGN_PF_LENGTH3_COMMON_ROOT_COLLISION",
        "parameters": {
            "p": p,
            "alpha": alpha,
            "reserve_index": 3,
            "u": str(u),
            "v": str(v),
            "common_root": str(x),
            "common_root_approx": float(x),
            "normalized_q_approx": q_approx,
            "normalized_z_approx": z_approx,
        },
        "checks": {
            "weights_strictly_positive": True,
            "pf_discriminant_strictly_positive": True,
            "q0_q1_common_root_exact": True,
            "q0_real_root_count": q0.degree(),
            "q1_real_root_count": q1.degree(),
            "strict_root_counts_below_collision": [below0, below1],
            "derivative_product_positive": True,
            "collision_branch": "same-index second root",
        },
        "digests": {
            "weight_triple": hashlib.sha256(",".join(map(str, weights)).encode("ascii")).hexdigest(),
            "pf_gap": hashlib.sha256(str(pf_gap).encode("ascii")).hexdigest(),
            "q0": digest(q0),
            "q1": digest(q1),
            "derivative_product": hashlib.sha256(str(derivative_product).encode("ascii")).hexdigest(),
        },
        "logical_implication": (
            "The PF length-three pair can have a common root, so uniform "
            "resultant nonvanishing is false.  This collision is benign: the "
            "same indexed simple root branches meet and compatibility survives."
        ),
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(OUTPUT)


if __name__ == "__main__":
    main()
