#!/usr/bin/env python3
"""Random hyperbolicity probe for the homogeneous three-variable reserve."""

from __future__ import annotations

import json
import math
import random
from pathlib import Path

from flint import ctx, fmpz_poly
import sympy as sp

from analyze_group_reserve_factor_prefix_crosses import sparse
from analyze_path_isolate_p4_bottom_pair_affine_two_kernel import A, T, V, q, w, z
from probe_path_isolate_p4_group_affine_southwest_square_entry import evaluate


OUTPUT_PATH = Path("group_reserve_multivariate_stability_probe_20260802.json")


def coefficient_array(source, a, b, cap):
    expression = sp.Poly(sp.expand(source * A**a * T**b), z, w)
    return {(i, j): int(expression.coeff_monomial(z**i * w**j)) for i in range(cap + 1) for j in range(cap + 1)}


def line_polynomial(K, r, N, base, direction):
    # P(s,x,y)=sum multinomial(r;h,j,r-h-j) K[N-h,N-j] x^h y^j s^(r-h-j).
    s0, x0, y0 = base
    ds, dx, dy = direction

    def multiply(left, right):
        out = [0] * (len(left) + len(right) - 1)
        for i, u in enumerate(left):
            for j, v in enumerate(right):
                out[i + j] += u * v
        return out

    def powers(c0, c1):
        out = [[1]]
        for _ in range(r):
            out.append(multiply(out[-1], [c0, c1]))
        return out

    spowers, xpowers, ypowers = powers(s0, ds), powers(x0, dx), powers(y0, dy)
    result = [0] * (r + 1)
    for h in range(r + 1):
        for j in range(r - h + 1):
            c = K.get((N - h, N - j), 0)
            if not c:
                continue
            multinomial = math.factorial(r) // (math.factorial(h) * math.factorial(j) * math.factorial(r - h - j))
            term = multiply(multiply(xpowers[h], ypowers[j]), spowers[r - h - j])
            for degree, value in enumerate(term):
                result[degree] += c * multinomial * value
    return result


def nonreal_count(values):
    return sum(m for root, m in fmpz_poly(values).complex_roots() if not root.imag.is_zero())


def main():
    ctx.prec = 80
    rng = random.Random(9930203)
    F = sp.expand(2 * A * (A - 1) + (V + 1) ** 2)
    G = sp.expand(A * T**2 - q)
    sources = {
        "bare": sp.Integer(1),
        "smoother": sp.expand((z + w) * (z**2 + w**2)),
        "full": sp.expand((z + w) * (z**2 + w**2) * F * G**2),
    }
    failures = []
    trials = 0
    for m, e, s in [(2, 0, 2), (3, 0, 3), (4, 0, 4), (4, 8, 2)]:
        a, b, r, N = 3 * m + 1 + e, 2 * m + 1, m + s, 2 * m + s + 4
        for stage, source in sources.items():
            K = coefficient_array(source, a, b, N)
            for _ in range(100):
                base = tuple(rng.randint(-8, 8) for _ in range(3))
                direction = tuple(rng.randint(1, 8) for _ in range(3))
                values = line_polynomial(K, r, N, base, direction)
                nonreal = nonreal_count(values)
                trials += 1
                if nonreal:
                    failures.append({"m": m, "e": e, "s": s, "stage": stage, "base": base, "direction": direction, "nonreal": nonreal})
                    if len(failures) >= 20:
                        break
            if len(failures) >= 20:
                break
        if len(failures) >= 20:
            break
    report = {
        "status": "PASS_MULTIVARIATE_STABILITY_PROBE" if not failures else "MULTIVARIATE_STABILITY_FAILURE",
        "completed_trials": trials,
        "failure_count": len(failures),
        "first_failures": failures,
        "warning": "Random line tests are necessary evidence only, not a stability proof.",
    }
    OUTPUT_PATH.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
