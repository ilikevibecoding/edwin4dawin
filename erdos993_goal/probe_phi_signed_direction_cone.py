"""Probe the signed derivative direction suggested by the two-slot factorization.

For c^2=1/2 and S=D_X+D_Y,

    S^2-D_z D_w = (S+c(D_z+D_w))(S-c(D_z+D_w))

on inputs which are multiaffine in z,w.  The positive factor is an ordinary
stability preserver.  This script tests the genuinely delicate negative
factor in two ways:

1. proper position of A=(D_X-cD_z1)Phi_N below Phi_N;
2. stability after the first and second negative factors, with S-smoothing.

The tests use c=1/sqrt(2) numerically and are probes only, not proofs.
"""

from __future__ import annotations

import argparse
import json
import math
import random
from math import comb, factorial
from pathlib import Path

import numpy as np
import sympy as sp


HERE = Path(__file__).resolve().parent
REPORT = HERE / "phi_signed_direction_cone_probe_20260804.json"

x, y, z1, z2, w1, w2, u, tau = sp.symbols("x y z1 z2 w1 w2 u tau")
C = sp.sqrt(2) / 2


def g(n: int, var: sp.Symbol) -> sp.Expr:
    if n <= 0:
        return sp.Integer(0)
    return sp.Add(*[
        sp.Rational(comb(n + a - 1, n - a), factorial(a)) * var**a
        for a in range(1, n + 1)
    ])


def phi(n: int, var: sp.Symbol, a: sp.Symbol, b: sp.Symbol) -> sp.Expr:
    return g(n, var) + g(n - 1, var) * (a + b) + g(n - 2, var) * a * b


def S(poly: sp.Expr, order: int = 1) -> sp.Expr:
    out = poly
    for _ in range(order):
        out = sp.diff(out, x) + sp.diff(out, y)
    return sp.expand(out)


def Lminus(poly: sp.Expr, za: sp.Symbol, wa: sp.Symbol) -> sp.Expr:
    return sp.expand(S(poly) - C * (sp.diff(poly, za) + sp.diff(poly, wa)))


def Lplus(poly: sp.Expr, za: sp.Symbol, wa: sp.Symbol) -> sp.Expr:
    return sp.expand(S(poly) + C * (sp.diff(poly, za) + sp.diff(poly, wa)))


def positive_line(
    terms: list[tuple[tuple[int, ...], complex]],
    variables: tuple[sp.Symbol, ...],
    rng: random.Random,
) -> tuple[np.ndarray, dict[str, object]]:
    bases = [rng.randint(-29, 31) for _ in variables]
    dirs = [rng.randint(1, 13) for _ in variables]
    powers: list[list[np.ndarray]] = []
    max_exponents = [max((m[i] for m, _ in terms), default=0) for i in range(len(variables))]
    for a, b, max_e in zip(bases, dirs, max_exponents):
        row = [np.asarray([1.0], dtype=np.complex128)]
        linear = np.asarray([float(a), float(b)], dtype=np.complex128)
        for _ in range(max_e):
            row.append(np.polynomial.polynomial.polymul(row[-1], linear))
        powers.append(row)
    degree = max((sum(m) for m, _ in terms), default=0)
    ascending = np.zeros(degree + 1, dtype=np.complex128)
    for monomial, coeff in terms:
        term = np.asarray([coeff], dtype=np.complex128)
        for i, exponent in enumerate(monomial):
            term = np.polynomial.polynomial.polymul(term, powers[i][exponent])
        ascending[: len(term)] += term
    while len(ascending) > 1 and abs(ascending[-1]) < 1e-11:
        ascending = ascending[:-1]
    coeffs = ascending[::-1]
    roots = np.roots(coeffs) if len(coeffs) > 1 else np.asarray([], dtype=np.complex128)
    max_imag = float(max((abs(r.imag) for r in roots), default=0.0))
    real = int(sum(abs(r.imag) <= 2e-6 * (1 + abs(r.real)) for r in roots))
    return roots, {
        "degree": int(len(coeffs) - 1),
        "real_roots_numeric": real,
        "max_abs_imag": max_imag,
        "bases": bases,
        "directions": dirs,
    }


def screen(poly: sp.Expr, variables: tuple[sp.Symbol, ...], trials: int, rng: random.Random) -> dict[str, object]:
    p = sp.Poly(poly, *variables, extension=C)
    terms = [(monomial, complex(sp.N(coeff, 30))) for monomial, coeff in p.terms()]
    worst: dict[str, object] | None = None
    failures: list[dict[str, object]] = []
    for trial in range(trials):
        _, item = positive_line(terms, variables, rng)
        item["trial"] = trial
        if worst is None or float(item["max_abs_imag"]) > float(worst["max_abs_imag"]):
            worst = item
        if int(item["real_roots_numeric"]) != int(item["degree"]):
            failures.append(item)
            break
    return {"trials_run": trial + 1, "failures": failures, "worst": worst}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-n", type=int, default=14)
    parser.add_argument("--trials", type=int, default=40)
    args = parser.parse_args()

    rng = random.Random(993_20260804_3)
    report: dict[str, object] = {
        "status": "PASS_PROBE_ONLY",
        "c": "1/sqrt(2)",
        "individual_proper_position": [],
        "staged": [],
    }

    for n in range(3, args.max_n + 1):
        f = phi(n, x, z1, z2)
        a = sp.expand(sp.diff(f, x) - C * sp.diff(f, z1))
        proper = sp.expand(f + u * a)
        test = screen(proper, (x, z1, z2, u), args.trials, rng)
        report["individual_proper_position"].append({"N": n, **test})
        if test["failures"]:
            report["status"] = "FAILS_INDIVIDUAL_PROPER_POSITION"
            print(f"N={n}: individual proper-position obstruction")
            break
        print(f"N={n}: individual proper-position screen clean")

    # First complete complement factor, then ask when the second signed factor
    # becomes stable after k ordinary S derivatives.  Specialize each consumed
    # state pair immediately to keep expressions small.
    for n in range(4, args.max_n + 1):
        p = phi(n, x, z1, z2) * phi(n, y, w1, w2)
        first = Lplus(Lminus(p, z1, w1), z1, w1).subs({z1: 0, w1: 0})
        row: dict[str, object] = {"N": n, "orders": []}
        # The conjectural cone 2d-N>=5 becomes k=d-4>=ceil((N-3)/2).
        k0 = max(0, math.ceil((n - 3) / 2))
        for k in range(max(0, k0 - 1), k0 + 2):
            smoothed = S(first, k)
            negative2 = Lminus(smoothed, z2, w2)
            test = screen(negative2, (x, y, z2, w2), args.trials, rng)
            row["orders"].append({"k": k, "candidate_boundary": k == k0, **test})
            label = "clean" if not test["failures"] else "FAIL"
            print(f"N={n}, k={k}: second negative factor {label}")
        report["staged"].append(row)

    REPORT.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(REPORT)


if __name__ == "__main__":
    main()
