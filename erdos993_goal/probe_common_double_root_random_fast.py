#!/usr/bin/env python3
"""Fast adversarial search for the common-double-root smoothing theorem.

For a monic polynomial g=x^2 prod(x-r_i) with distinct negative r_i, form

    p=(g'/x).

Choose q with the same leading coefficient as p, one zero at the origin,
and one root in every gap between consecutive roots of p.  Then h=x*q has
the same leading coefficient as g', shares the double boundary zero of g,
and h/x interlaces g'/x.  We test

    (D_X+D_Y)^d(g(X)g(Y))
      -(D_X+D_Y)^(d-2)(h(X)h(Y))

on random positive-direction affine lines at both the conjectured stronger
threshold d=floor((N+3)/2) and the Erdős endpoint d=floor(2N/3)+1.

Floating point is used only as a counterexample finder.  Any suspicious
case is replayed over exact rationals with SymPy and certified by Sturm
root counting before it is reported as a counterexample.
"""

from __future__ import annotations

import json
import math
import random
from pathlib import Path

import numpy as np
import sympy as sp


OUT = Path("common_double_root_random_fast_probe_20260802.json")
RNG = random.Random(993_20260802 + 17)
X, Y, z = sp.symbols("X Y z")


def poly_from_roots_ascending(roots: list[float], leading: float = 1.0) -> np.ndarray:
    out = np.array([leading], dtype=float)
    for root in roots:
        out = np.convolve(out, np.array([-root, 1.0]))
    return out


def derivative_ascending(p: np.ndarray, order: int = 1) -> np.ndarray:
    out = p.copy()
    for _ in range(order):
        out = np.array([(i + 1) * out[i + 1] for i in range(len(out) - 1)])
    return out


def affine_compose_ascending(p: np.ndarray, base: float, direction: float) -> np.ndarray:
    out = np.array([0.0])
    power = np.array([1.0])
    affine = np.array([base, direction])
    for coeff in p:
        if len(out) < len(power):
            out = np.pad(out, (0, len(power) - len(out)))
        out[:len(power)] += coeff * power
        power = np.convolve(power, affine)
    return np.trim_zeros(out, "b")


def add_scaled(a: np.ndarray, b: np.ndarray, scale: float) -> np.ndarray:
    n = max(len(a), len(b))
    out = np.zeros(n)
    out[:len(a)] += a
    out[:len(b)] += scale * b
    return np.trim_zeros(out, "b")


def target_line(g: np.ndarray, h: np.ndarray, d: int,
                xbase: int, xdir: int, ybase: int, ydir: int) -> np.ndarray:
    gd = [g]
    for _ in range(d):
        gd.append(derivative_ascending(gd[-1]))
    hd = [h]
    for _ in range(d - 2):
        hd.append(derivative_ascending(hd[-1]))
    out = np.array([0.0])
    for k in range(d + 1):
        left = affine_compose_ascending(gd[k], xbase, xdir)
        right = affine_compose_ascending(gd[d-k], ybase, ydir)
        out = add_scaled(out, np.convolve(left, right), math.comb(d, k))
    for k in range(d - 1):
        left = affine_compose_ascending(hd[k], xbase, xdir)
        right = affine_compose_ascending(hd[d-2-k], ybase, ydir)
        out = add_scaled(out, np.convolve(left, right), -math.comb(d-2, k))
    # Do not trim a small *relative* leading coefficient.  Positive-direction
    # lines can be extremely ill-scaled while retaining the full exact degree;
    # dropping that coefficient manufactures a lower-degree polynomial with a
    # spurious complex pair.  Exact zeros have already been removed by
    # add_scaled/trim_zeros.
    return np.trim_zeros(out, "b")


def nonreal_count(coeffs: np.ndarray) -> int:
    if len(coeffs) <= 1:
        return 0
    roots = np.roots(coeffs[::-1] / np.max(np.abs(coeffs)))
    return sum(abs(root.imag) > 2e-6 * (1 + abs(root)) for root in roots)


def rational_between(left: float, right: float, mode: int) -> sp.Rational:
    if mode == 0:
        theta = RNG.random()
    elif mode == 1:
        theta = 10 ** (-RNG.uniform(2, 8))
    elif mode == 2:
        theta = 1 - 10 ** (-RNG.uniform(2, 8))
    elif mode == 3:
        theta = RNG.betavariate(0.12, 0.12)
    else:
        theta = RNG.betavariate(2.0, 2.0)
    value = left + theta * (right - left)
    return sp.Rational(int(round(value * 10**9)), 10**9)


def exact_replay(g_roots: list[int], q_roots: list[sp.Rational], d: int,
                 line: tuple[int, int, int, int]) -> dict[str, object] | None:
    g = sp.expand(X**2 * sp.prod(X-r for r in g_roots))
    gp = sp.diff(g, X)
    lead = sp.Poly(gp, X).LC()
    qpoly = sp.expand(lead * X * sp.prod(X-r for r in q_roots))
    h = sp.expand(X * qpoly)
    assert sp.Poly(h, X).LC() == lead
    p0 = sp.Poly(sp.cancel(gp / X), X)
    qp = sp.Poly(sp.cancel(h / X), X)
    assert int(p0.count_roots(-sp.oo, sp.oo)) == p0.degree()
    assert int(qp.count_roots(-sp.oo, sp.oo)) == qp.degree()
    target = sp.expand(sum(
        sp.binomial(d, k) * sp.diff(g, X, k)
        * sp.diff(g.subs(X, Y), Y, d-k)
        for k in range(d+1)
    ) - sum(
        sp.binomial(d-2, k) * sp.diff(h, X, k)
        * sp.diff(h.subs(X, Y), Y, d-2-k)
        for k in range(d-1)
    ))
    xb, xd, yb, yd = line
    raw = sp.Poly(sp.expand(target.subs({X: xb+xd*z, Y: yb+yd*z})), z)
    real = int(raw.count_roots(-sp.oo, sp.oo))
    if real == raw.degree():
        return None
    values = [sp.Rational(raw.nth(i)) for i in range(raw.degree()+1)]
    den = sp.ilcm(*[v.q for v in values])
    ints = [int(v*den) for v in values]
    divisor = abs(math.gcd(*ints))
    return {
        "N": sp.Poly(g, X).degree(), "d": d,
        "g_nonzero_roots": g_roots,
        "q_nonzero_roots": [str(r) for r in q_roots],
        "line": {"X": f"{xb}+{xd}z", "Y": f"{yb}+{yd}z"},
        "degree": raw.degree(), "real_roots": real,
        "nonreal_roots": raw.degree()-real,
        "primitive_coefficients_ascending": [v//divisor for v in ints],
        "g": str(g), "h": str(h),
    }


def main() -> None:
    records: list[dict[str, object]] = []
    witness = None
    total_lines = 0
    for N in range(4, 21):
        model_count = 240 if N <= 12 else 120
        failures = 0
        for model in range(model_count):
            # Mixed root geometries: dense, highly gapped, and clustered.
            root_pool = list(range(-80*N, -1))
            if model % 3 == 0:
                g_roots = sorted(RNG.sample(root_pool, N-2))
            elif model % 3 == 1:
                gaps = [RNG.randint(1, 4) * (1 + RNG.randint(0, 9)**2) for _ in range(N-2)]
                g_roots = []
                current = 0
                for gap in reversed(gaps):
                    current -= gap
                    g_roots.append(current)
                g_roots.sort()
            else:
                center = -RNG.randint(3*N, 20*N)
                offsets = sorted(RNG.sample(range(-4*N, 4*N+1), N-2))
                g_roots = [center+v for v in offsets]
            if len(set(g_roots)) != N-2 or max(g_roots) >= 0:
                continue
            g = poly_from_roots_ascending([0.0, 0.0] + [float(r) for r in g_roots])
            gp = derivative_ascending(g)
            p0 = gp[1:]  # exact division by x in ascending coefficients
            critical = sorted(root.real for root in np.roots(p0[::-1])
                              if abs(root.imag) < 1e-7)
            if len(critical) != N-2 or critical[-1] >= 0:
                continue
            mode = model % 5
            q_roots = [rational_between(critical[i], critical[i+1], mode)
                       for i in range(len(critical)-1)]
            q_float = poly_from_roots_ascending(
                [0.0] + [float(r) for r in q_roots], leading=float(gp[-1])
            )
            h = np.concatenate(([0.0], q_float))
            for d in sorted({(N+3)//2, 2*N//3+1}):
                for _ in range(14):
                    line = (RNG.randint(-250, 100), RNG.randint(1, 80),
                            RNG.randint(-250, 100), RNG.randint(1, 80))
                    coeffs = target_line(g, h, d, *line)
                    total_lines += 1
                    if nonreal_count(coeffs):
                        exact = exact_replay(g_roots, q_roots, d, line)
                        if exact is not None:
                            witness = exact
                            failures += 1
                            break
                if witness:
                    break
            if witness:
                break
        record = {"N": N, "models": model_count,
                  "thresholds": sorted({(N+3)//2, 2*N//3+1}),
                  "failures": failures}
        records.append(record)
        print(record, flush=True)
        if witness:
            break
    report = {
        "kind": "common_double_root_random_fast_probe",
        "date": "2026-08-02",
        "status": "EXACT_COUNTEREXAMPLE" if witness else "NO_COUNTEREXAMPLE_IN_FAST_PROBE",
        "hypotheses": "g,h negative-rooted; common largest double root 0; h/x interlaces g'/x; matching leading coefficients",
        "tested_orders": ["floor((N+3)/2)", "floor(2N/3)+1"],
        "exact_or_screened_lines": total_lines,
        "records": records,
        "witness": witness,
        "warning": "No-counterexample output is floating-point screening evidence only; any reported counterexample is replayed by exact Sturm counting.",
    }
    OUT.write_text(json.dumps(report, indent=2)+"\n", encoding="utf-8")
    print(json.dumps({"status": report["status"], "lines": total_lines,
                      "output": str(OUT.resolve())}, indent=2))


if __name__ == "__main__":
    main()
