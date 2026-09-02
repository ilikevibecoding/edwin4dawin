"""Stress-test the full-space hyperbolicity suggested by the determinant parent.

For B with eigenvalues 1 (2N-2 times), 1+alpha, 1-alpha, compute

    q_A(t) = [s^d] det(t I - A + s B).

If D_B^d det were hyperbolic with respect to I, q_A would be real-rooted for
every real symmetric A.  In a basis diagonalizing B,

    q_A(t) = sum_{|S|=d} prod_{i in S} b_i
                         det(t I - A[S^c,S^c]).

Diagonal A is handled by a fast bivariate-product dynamic program; general A
uses the principal-minor formula directly.
"""

from __future__ import annotations

from itertools import combinations
from math import sqrt

import numpy as np
import sympy as sp


def add_desc(a: np.ndarray, b: np.ndarray) -> np.ndarray:
    """Add coefficient arrays in descending powers, padding on the left."""
    if len(a) < len(b):
        a = np.pad(a, (len(b) - len(a), 0))
    elif len(b) < len(a):
        b = np.pad(b, (len(a) - len(b), 0))
    return a + b


def diagonal_coefficient(a: np.ndarray, b: np.ndarray, d: int) -> np.ndarray:
    """Return [s^d] product_i (t-a_i+s b_i), descending in t."""
    dp = [np.array([1.0])] + [np.array([0.0]) for _ in range(d)]
    used = 0
    for ai, bi in zip(a, b):
        new = [np.array([0.0]) for _ in range(d + 1)]
        for j in range(min(used, d) + 1):
            new[j] = add_desc(new[j], np.convolve(dp[j], [1.0, -ai]))
            if j < d:
                new[j + 1] = add_desc(new[j + 1], bi * dp[j])
        dp = new
        used += 1
    return np.trim_zeros(dp[d], "f")


def symmetric_coefficient(A: np.ndarray, b: np.ndarray, d: int) -> np.ndarray:
    """Principal-minor expansion for a general symmetric A."""
    n = len(b)
    degree = n - d
    ans = np.zeros(degree + 1)
    all_indices = np.arange(n)
    for S_tuple in combinations(range(n), d):
        S = np.fromiter(S_tuple, dtype=int)
        mask = np.ones(n, dtype=bool)
        mask[S] = False
        comp = all_indices[mask]
        eigs = np.linalg.eigvalsh(A[np.ix_(comp, comp)])
        ans += np.prod(b[S]) * np.poly(eigs)
    return ans


def root_report(coeff: np.ndarray, tol: float = 2e-6) -> tuple[float, np.ndarray]:
    coeff = coeff / np.max(np.abs(coeff))
    roots = np.roots(coeff)
    scale = np.maximum(1.0, np.abs(roots))
    defect = float(np.max(np.abs(roots.imag) / scale))
    return defect, roots


def parameters(m: int, alpha_scale: float = 1.0) -> tuple[int, int, np.ndarray, float]:
    N = 3 * m + 3
    d = 2 * m + 3
    alpha = alpha_scale * N / sqrt(d * (d - 1))
    b = np.array([1.0] * (2 * N - 2) + [1.0 + alpha, 1.0 - alpha])
    return 2 * N, d, b, alpha


def diagonal_trials(m: int, trials: int, rng: np.random.Generator) -> tuple[float, dict]:
    n, d, b, alpha = parameters(m)
    worst = (-1.0, {})
    distributions = (
        lambda: rng.normal(size=n),
        lambda: rng.uniform(-5, 5, size=n),
        lambda: np.sort(rng.normal(size=n)) * rng.lognormal(0, 1),
        lambda: rng.choice([-10.0, -1.0, 0.0, 1.0, 10.0], size=n),
    )
    for trial in range(trials):
        a = distributions[trial % len(distributions)]()
        coeff = diagonal_coefficient(a, b, d)
        defect, roots = root_report(coeff)
        if defect > worst[0]:
            worst = (defect, {"trial": trial, "a": a, "coeff": coeff, "roots": roots})
        if defect > 2e-6:
            break
    print(
        f"diagonal m={m} n={n} d={d} alpha={alpha:.9g}: "
        f"max relative imaginary part {worst[0]:.6g} at trial {worst[1]['trial']}"
    )
    if worst[0] > 2e-6:
        print("  COUNTEREXAMPLE diagonal=", np.array2string(worst[1]["a"], precision=8))
        print("  roots=", np.array2string(worst[1]["roots"], precision=8))
    return worst


def general_trials(m: int, trials: int, rng: np.random.Generator) -> tuple[float, dict]:
    n, d, b, alpha = parameters(m)
    worst = (-1.0, {})
    for trial in range(trials):
        G = rng.normal(size=(n, n))
        A = (G + G.T) / 2
        coeff = symmetric_coefficient(A, b, d)
        defect, roots = root_report(coeff)
        if defect > worst[0]:
            worst = (defect, {"trial": trial, "A": A, "coeff": coeff, "roots": roots})
        if defect > 2e-6:
            break
    print(
        f"general  m={m} n={n} d={d} alpha={alpha:.9g}: "
        f"max relative imaginary part {worst[0]:.6g} at trial {worst[1]['trial']}"
    )
    if worst[0] > 2e-6:
        print("  COUNTEREXAMPLE roots=", np.array2string(worst[1]["roots"], precision=8))
    return worst


def alpha_sweep(m: int, trials: int, rng: np.random.Generator) -> None:
    n, d, _, base_alpha = parameters(m)
    samples = [rng.normal(size=n) for _ in range(trials)]
    print(f"alpha sweep m={m}; base alpha={base_alpha:.9g}")
    for scale in [0.0, 0.25, 0.5, 0.75, 0.9, 1.0, 1.1, 1.25, 1.5, 2.0]:
        _, _, b, alpha = parameters(m, scale)
        worst = 0.0
        for a in samples:
            defect, _ = root_report(diagonal_coefficient(a, b, d))
            worst = max(worst, defect)
        print(f"  scale={scale:4.2f} alpha={alpha:10.6f} worst={worst:.6g}")


def exact_diagonal_witness(rng: np.random.Generator) -> None:
    """Find a small rational witness by giving the exceptional coordinates equal shifts."""
    t = sp.symbols("t")
    d = 5
    alpha = sp.Rational(3) / sp.sqrt(5)
    b = [sp.Integer(1)] * 10 + [1 + alpha, 1 - alpha]
    for trial in range(2000):
        common = int(rng.integers(-3, 4))
        shifts = [int(x) for x in rng.integers(-3, 4, size=10)] + [common, common]
        dp = [sp.Integer(1)] + [sp.Integer(0)] * d
        for ai, bi in zip(shifts, b):
            new = [sp.Integer(0)] * (d + 1)
            for j in range(d + 1):
                new[j] += (t - ai) * dp[j]
                if j < d:
                    new[j + 1] += bi * dp[j]
            dp = new
        polynomial = sp.Poly(sp.cancel(dp[d]), t)
        assert all(coefficient.is_Rational for coefficient in polynomial.all_coeffs())
        roots = np.roots([float(c) for c in polynomial.all_coeffs()])
        if max(abs(root.imag) for root in roots) > 1e-5:
            real_roots = polynomial.count_roots(-sp.oo, sp.oo)
            print("exact rational diagonal witness")
            print("  shifts=", shifts)
            print("  polynomial=", polynomial.as_expr())
            print(f"  degree={polynomial.degree()} exact_real_roots={real_roots}")
            print("  numerical_roots=", np.array2string(roots, precision=10))
            return
    raise RuntimeError("No exact diagonal witness found")


def main() -> None:
    rng = np.random.default_rng(993_2026)
    for m in range(1, 7):
        diagonal_trials(m, 2000, rng)
    exact_diagonal_witness(rng)
    alpha_sweep(1, 500, rng)
    # One full symmetric test is enough to falsify the stronger statement if it fails.
    general_trials(1, 30, rng)


if __name__ == "__main__":
    main()
