#!/usr/bin/env python3
"""Adversarial probe for the normalized deletion/contraction multiplier.

Let a be monic, negative-rooted, degree N, divisible by x^2, with the sum
of the positive root magnitudes normalized to N(2N-3).  Put

    g=((E+N-3)/(2N-3))a,
    h=((N-E)/(2N-3))a.

Then g and h are the deletion/contraction pair from the stable polarization
of a, they share x^2, h<<g, and leading(h)=leading(g').  We test the sharp
endpoint target, separately recording whether h also interlaces g'.

Floating point is a finder only.  Suspicious cases are reconstructed over
the rationals and certified by exact Sturm counting.
"""

from __future__ import annotations

import json
import math
import random
from pathlib import Path

import numpy as np
import sympy as sp

from probe_common_double_root_random_fast import (
    X, Y, z, add_scaled, affine_compose_ascending, derivative_ascending,
    nonreal_count, poly_from_roots_ascending, target_line,
)


OUT = Path("normalized_deletion_contraction_threshold_probe_20260802.json")
RNG = random.Random(993_20260802 + 29)


def alternating_real_roots(a: np.ndarray, b: np.ndarray) -> bool:
    ar = sorted(root.real for root in np.roots(a[::-1])
                if abs(root.imag) < 2e-7*(1+abs(root)))
    br = sorted(root.real for root in np.roots(b[::-1])
                if abs(root.imag) < 2e-7*(1+abs(root)))
    if len(ar) != len(a)-1 or len(br) != len(b)-1 or len(ar) != len(br):
        return False
    return (all(ar[i] < br[i] for i in range(len(ar)))
            and all(br[i] < ar[i+1] for i in range(len(ar)-1))) or (
            all(br[i] < ar[i] for i in range(len(ar)))
            and all(ar[i] < br[i+1] for i in range(len(ar)-1))
    )


def exact_replay(root_weights: list[int], N: int, d: int,
                 line: tuple[int, int, int, int]) -> dict[str, object] | None:
    L = 2*N-3
    scale = sp.Rational(N*L, sum(root_weights))
    roots = [scale*w for w in root_weights]
    a = sp.expand(X**2 * sp.prod(X+r for r in roots))
    g = sp.expand((X*sp.diff(a, X)+(N-3)*a)/L)
    h = sp.expand((N*a-X*sp.diff(a, X))/L)
    assert sp.Poly(g, X).LC() == 1
    assert sp.Poly(h, X).LC() == sp.Poly(sp.diff(g, X), X).LC() == N
    assert sp.expand(g+h-a) == 0
    target = sp.expand(sum(
        sp.binomial(d, k)*sp.diff(g, X, k)*sp.diff(g.subs(X, Y), Y, d-k)
        for k in range(d+1)
    )-sum(
        sp.binomial(d-2, k)*sp.diff(h, X, k)*sp.diff(h.subs(X, Y), Y, d-2-k)
        for k in range(d-1)
    ))
    xb, xd, yb, yd = line
    lp = sp.Poly(sp.expand(target.subs({X: xb+xd*z, Y: yb+yd*z})), z)
    real = int(lp.count_roots(-sp.oo, sp.oo))
    if real == lp.degree():
        return None
    vals = [sp.Rational(lp.nth(i)) for i in range(lp.degree()+1)]
    den = sp.ilcm(*[v.q for v in vals])
    ints = [int(v*den) for v in vals]
    div = abs(math.gcd(*ints))
    gp0 = sp.Poly(sp.cancel(sp.diff(g, X)/X), X)
    h0 = sp.Poly(sp.cancel(h/X), X)
    gp_intervals = gp0.intervals(eps=sp.Rational(1, 10**18))
    h_intervals = h0.intervals(eps=sp.Rational(1, 10**18))
    def midpoint(item: object) -> sp.Rational:
        interval, multiplicity = item
        left, right = interval
        return (sp.Rational(left)+sp.Rational(right))/2

    simple = all(item[1] == 1 for item in gp_intervals+h_intervals)
    merged = (sorted(
        [(midpoint(item), "gprime") for item in gp_intervals]
        + [(midpoint(item), "h") for item in h_intervals]
    ) if simple else [])
    exact_alternation = (
        simple and len(gp_intervals) == gp0.degree()
        and len(h_intervals) == h0.degree()
        and all(merged[k][1] != merged[k+1][1]
                for k in range(len(merged)-1))
    )
    return {
        "N": N, "d": d,
        "unscaled_positive_root_weights": root_weights,
        "root_scale": str(scale),
        "positive_root_magnitudes": [str(r) for r in roots],
        "g": str(g), "h": str(h),
        "g_prime_over_x_intervals": [str(v) for v in gp_intervals],
        "h_over_x_intervals": [str(v) for v in h_intervals],
        "h_proper_gprime_exact_alternation": exact_alternation,
        "line": {"X": f"{xb}+{xd}z", "Y": f"{yb}+{yd}z"},
        "degree": lp.degree(), "real_roots": real,
        "nonreal_roots": lp.degree()-real,
        "primitive_coefficients_ascending": [v//div for v in ints],
    }


def main() -> None:
    records = []
    first_any = None
    first_double_proper = None
    total_lines = 0
    for N in range(4, 19):
        d = 2*N//3+1
        models = 500 if N <= 10 else 240
        accepted_double = 0
        failures_any = 0
        failures_double = 0
        for model in range(models):
            n = N-2
            mode = model % 5
            if mode == 0:
                weights = [RNG.randint(1, 100) for _ in range(n)]
            elif mode == 1:
                weights = [1+RNG.randint(0, 9)**3 for _ in range(n)]
            elif mode == 2:
                weights = [1 for _ in range(n)]
                weights[RNG.randrange(n)] = 10**RNG.randint(2, 7)
            elif mode == 3:
                weights = [RNG.randint(1, 5) * 10**RNG.randint(0, 5) for _ in range(n)]
            else:
                weights = [RNG.randint(1, 10) for _ in range(n)]
                weights.sort(reverse=bool(model & 1))
            scale = N*(2*N-3)/sum(weights)
            roots = [scale*w for w in weights]
            a = poly_from_roots_ascending([0.0, 0.0]+[-float(r) for r in roots])
            indices = np.arange(len(a), dtype=float)
            L = 2*N-3
            g = a*(indices+N-3)/L
            h = a*(N-indices)/L
            while len(h) > 1 and abs(h[-1]) < 1e-8:
                h = h[:-1]
            gp0 = derivative_ascending(g)[1:]
            h0 = h[1:]
            double_proper = alternating_real_roots(gp0, h0)
            if double_proper:
                accepted_double += 1
            for _ in range(12):
                line = (RNG.randint(-300, 100), RNG.randint(1, 90),
                        RNG.randint(-300, 100), RNG.randint(1, 90))
                coeffs = target_line(g, h, d, *line)
                total_lines += 1
                if nonreal_count(coeffs):
                    exact = exact_replay(weights, N, d, line)
                    if exact is None:
                        continue
                    failures_any += 1
                    if first_any is None:
                        first_any = exact
                    if exact["h_proper_gprime_exact_alternation"]:
                        failures_double += 1
                        if first_double_proper is None:
                            first_double_proper = exact
                    break
            if first_double_proper is not None:
                break
        rec = {"N": N, "d": d, "models": models,
               "accepted_h_proper_gprime": accepted_double,
               "exact_failures_any": failures_any,
               "exact_failures_with_h_proper_gprime": failures_double}
        records.append(rec)
        print(rec, flush=True)
        if first_double_proper is not None:
            break
    report = {
        "kind": "normalized_deletion_contraction_threshold_probe",
        "date": "2026-08-02",
        "status": "DOUBLE_PROPER_COUNTEREXAMPLE" if first_double_proper else (
            "UNFILTERED_COUNTEREXAMPLE_ONLY" if first_any else "NO_COUNTEREXAMPLE_IN_FAST_PROBE"
        ),
        "pair": "g=(E+N-3)a/(2N-3), h=(N-E)a/(2N-3)",
        "normalization": "a monic, negative-rooted, divisible by x^2, sum(root magnitudes)=N(2N-3)",
        "threshold": "d=floor(2N/3)+1",
        "records": records,
        "screened_lines": total_lines,
        "first_unfiltered_counterexample": first_any,
        "first_counterexample_also_satisfying_h_proper_gprime": first_double_proper,
        "warning": "No-counterexample conclusions are finite floating-point screens; every reported failure is exact.",
    }
    OUT.write_text(json.dumps(report, indent=2)+"\n", encoding="utf-8")
    print(json.dumps({"status": report["status"], "lines": total_lines,
                      "output": str(OUT.resolve())}, indent=2))


if __name__ == "__main__":
    main()
