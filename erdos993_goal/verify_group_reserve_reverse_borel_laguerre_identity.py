"""Exact certificates for the reverse-Borel/Laguerre reserve reduction.

For a bivariate polynomial K define

    B_N[K](X,Y) = sum K[N-h,N-j] X^h Y^j/(h! j!).

This script verifies, over exact rationals, the differential-operator
identity B_N[S K] = S(d_X,d_Y)B_N[K], the generalized-Laguerre seed,
the shift identities used by the hard group source, and the Jensen-component
identity linking B_N[K] to the homogeneous reserve polynomial.
"""

from __future__ import annotations

import json
import math
from collections import defaultdict
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
OUT = HERE / "group_reserve_reverse_borel_laguerre_identity_certificate_20260802.json"

z, w, X, Y, s, x, y = sp.symbols("z w X Y s x y")
A = (1 + z) * (1 + w)
T = z * (1 + z) + w * (1 + w)
Q = z * w
V = 1 + z + w
F = 2 * A * (A - 1) + (V + 1) ** 2
G = A * T**2 - Q
H = (z + w) * (z**2 + w**2) * F * G**2


def coeff2(poly: sp.Expr, i: int, j: int) -> sp.Expr:
    if i < 0 or j < 0:
        return sp.S.Zero
    return sp.Poly(sp.expand(poly), z, w).coeff_monomial(z**i * w**j)


def borel(poly: sp.Expr, n: int) -> sp.Expr:
    p = sp.Poly(sp.expand(poly), z, w)
    ans = sp.S.Zero
    for h in range(n + 1):
        for j in range(n + 1):
            c = p.coeff_monomial(z ** (n - h) * w ** (n - j))
            if c:
                ans += c * X**h * Y**j / (sp.factorial(h) * sp.factorial(j))
    return sp.expand(ans)


def apply_operator(source: sp.Expr, target: sp.Expr) -> sp.Expr:
    ans = sp.S.Zero
    for (i, j), c in sp.Poly(sp.expand(source), z, w).terms():
        ans += c * sp.diff(target, X, i, Y, j)
    return sp.expand(ans)


def laguerre_seed(n: int, a: int, var: sp.Symbol) -> sp.Expr:
    return sp.expand(
        sum(
            sp.binomial(a, n - h) * var**h / sp.factorial(h)
            for h in range(n + 1)
        )
    )


def base_family(n: int, a: int, b: int) -> sp.Expr:
    if n < 0:
        return sp.S.Zero
    seed = laguerre_seed(n, a, X) * laguerre_seed(n, a, Y)
    return apply_operator(T**b, seed)


# A shift key (dn, da, db) denotes B_{N-dn}^{a+da,b+db}.
Shift = tuple[int, int, int]


def shift_add(left: dict[Shift, int], right: dict[Shift, int]) -> dict[Shift, int]:
    out: defaultdict[Shift, int] = defaultdict(int)
    for key, value in left.items():
        out[key] += value
    for key, value in right.items():
        out[key] += value
    return {key: value for key, value in sorted(out.items()) if value}


def shift_scale(source: dict[Shift, int], scalar: int) -> dict[Shift, int]:
    return {key: scalar * value for key, value in source.items() if scalar * value}


def shift_mul(left: dict[Shift, int], right: dict[Shift, int]) -> dict[Shift, int]:
    out: defaultdict[Shift, int] = defaultdict(int)
    for (n1, a1, b1), c1 in left.items():
        for (n2, a2, b2), c2 in right.items():
            out[(n1 + n2, a1 + a2, b1 + b2)] += c1 * c2
    return {key: value for key, value in sorted(out.items()) if value}


I_SHIFT = {(0, 0, 0): 1}
A_SHIFT = {(0, 1, 0): 1}
Q_SHIFT = {(1, 0, 0): 1}
T_SHIFT = {(0, 0, 1): 1}
ZSUM_SHIFT = shift_add(shift_add(A_SHIFT, shift_scale(Q_SHIFT, -1)), shift_scale(I_SHIFT, -1))
Z2SUM_SHIFT = shift_add(
    shift_add(
        shift_add(shift_mul(A_SHIFT, A_SHIFT), shift_mul(Q_SHIFT, Q_SHIFT)),
        I_SHIFT,
    ),
    shift_add(
        shift_scale(shift_mul(A_SHIFT, Q_SHIFT), -2),
        shift_scale(A_SHIFT, -2),
    ),
)
F_SHIFT = {
    (0, 2, 0): 3,
    (2, 0, 0): 1,
    (0, 0, 0): 1,
    (1, 1, 0): -2,
    (1, 0, 0): -2,
}
G_SHIFT = {(0, 1, 2): 1, (1, 0, 0): -1}
H_SHIFT = shift_mul(
    shift_mul(shift_mul(ZSUM_SHIFT, Z2SUM_SHIFT), F_SHIFT),
    shift_mul(G_SHIFT, G_SHIFT),
)


def eval_shift(expansion: dict[Shift, int], n: int, a: int, b: int) -> sp.Expr:
    return sp.expand(
        sum(c * base_family(n - dn, a + da, b + db) for (dn, da, db), c in expansion.items())
    )


def homogeneous_component(poly: sp.Expr, degree: int, variables: tuple[sp.Symbol, ...]) -> sp.Expr:
    ans = sp.S.Zero
    P = sp.Poly(sp.expand(poly), *variables)
    for monom, c in P.terms():
        if sum(monom) == degree:
            term = c
            for variable, exponent in zip(variables, monom):
                term *= variable**exponent
            ans += term
    return sp.expand(ans)


def main() -> None:
    checks: list[dict[str, object]] = []

    # Universal multiplication/differentiation identity on varied exact data.
    test_sources = [1 + z + 2 * w + z * w, z + w, z**2 + w**2, F, G]
    test_kernels = [A**2 * T, A**3 * T**2, (1 + z + w + 2 * z * w) * A]
    operator_count = 0
    for n in range(1, 6):
        for source in test_sources:
            for kernel in test_kernels:
                lhs = borel(source * kernel, n)
                rhs = apply_operator(source, borel(kernel, n))
                assert sp.expand(lhs - rhs) == 0
                operator_count += 1
    checks.append({"name": "borel_multiplication_is_differentiation", "cases": operator_count, "passed": True})

    # Generalized Laguerre seed and its one-variable differential shifts.
    laguerre_count = 0
    for n in range(0, 8):
        for a in range(n, n + 6):
            p = laguerre_seed(n, a, X)
            assert sp.expand(p - sp.assoc_laguerre(n, a - n, -X)) == 0
            if n >= 1:
                assert sp.expand(sp.diff(p, X) - laguerre_seed(n - 1, a, X)) == 0
                assert sp.expand((sp.diff(p, X) + sp.diff(p, X, 2)) - laguerre_seed(n - 1, a + 1, X)) == 0
            assert sp.expand(p + sp.diff(p, X) - laguerre_seed(n, a + 1, X)) == 0
            laguerre_count += 1
    checks.append({"name": "laguerre_seed_and_derivative_shifts", "cases": laguerre_count, "passed": True})

    # Direct coefficient extraction agrees with the Laguerre convolution.
    family_count = 0
    for n in range(0, 7):
        for a in range(n, n + 3):
            for b in range(0, 4):
                assert sp.expand(borel(A**a * T**b, n) - base_family(n, a, b)) == 0
                family_count += 1
    checks.append({"name": "laguerre_binomial_convolution", "cases": family_count, "passed": True})

    # Compact shift identities for Q=zw, V, F, G, and the complete source H.
    shift_count = 0
    for n, a, b in [(3, 4, 0), (4, 5, 1), (5, 7, 2), (6, 8, 1)]:
        base = base_family(n, a, b)
        local = [
            (A, A_SHIFT),
            (T, T_SHIFT),
            (Q, Q_SHIFT),
            (z + w, ZSUM_SHIFT),
            (z**2 + w**2, Z2SUM_SHIFT),
            (F, F_SHIFT),
            (G, G_SHIFT),
        ]
        for source, expansion in local:
            assert sp.expand(apply_operator(source, base) - eval_shift(expansion, n, a, b)) == 0
            shift_count += 1

    # H is larger, so use two representative truncations.
    for n, a, b in [(4, 5, 0), (5, 6, 1)]:
        assert sp.expand(apply_operator(H, base_family(n, a, b)) - eval_shift(H_SHIFT, n, a, b)) == 0
        shift_count += 1
    checks.append({"name": "source_operator_shift_identities", "cases": shift_count, "passed": True})

    # The important G^2 identity is recorded separately.
    g2_count = 0
    for n, a, b in [(2, 3, 0), (3, 5, 1), (5, 7, 2), (7, 9, 0)]:
        lhs = apply_operator(G**2, base_family(n, a, b))
        rhs = (
            base_family(n, a + 2, b + 4)
            - 2 * base_family(n - 1, a + 1, b + 2)
            + base_family(n - 2, a, b)
        )
        assert sp.expand(lhs - rhs) == 0
        g2_count += 1
    checks.append({"name": "G_squared_discrete_second_difference", "cases": g2_count, "passed": True})

    # Jensen identity: P_{r,N}/r! is the degree-r component of exp(s)B_N[K].
    jensen_count = 0
    for n, r, a, b in [(3, 2, 4, 0), (4, 3, 5, 1), (5, 4, 6, 1)]:
        kernel = sp.expand(A**a * T**b)
        phi = borel(kernel, n).subs({X: x, Y: y})
        exp_trunc = sum(s**ell / sp.factorial(ell) for ell in range(r + 1))
        component = homogeneous_component(sp.expand(exp_trunc * phi), r, (s, x, y))
        direct = sp.S.Zero
        for h in range(r + 1):
            for j in range(r - h + 1):
                ell = r - h - j
                c = coeff2(kernel, n - h, n - j)
                direct += sp.factorial(r) * c * s**ell * x**h * y**j / (
                    sp.factorial(ell) * sp.factorial(h) * sp.factorial(j)
                )
        assert sp.expand(direct - sp.factorial(r) * component) == 0
        jensen_count += 1
    checks.append({"name": "homogeneous_Jensen_component_identity", "cases": jensen_count, "passed": True})

    payload = {
        "kind": "group_reserve_reverse_borel_laguerre_identity_certificate",
        "date": "2026-08-02",
        "status": "PASS_EXACT_IDENTITIES",
        "definition": "B_N[K]=sum_{h,j>=0} [z^(N-h)w^(N-j)]K X^hY^j/(h!j!)",
        "laguerre_seed": "P_N^a(X)=L_N^(a-N)(-X)",
        "G_squared_shift": "B_N^(a+2,b+4)-2 B_(N-1)^(a+1,b+2)+B_(N-2)^(a,b)",
        "complete_source_shift_term_count": len(H_SHIFT),
        "complete_source_shift_expansion": [
            {"N_drop": dn, "a_raise": da, "b_raise": db, "coefficient": c}
            for (dn, da, db), c in H_SHIFT.items()
        ],
        "checks": checks,
    }
    OUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"status": payload["status"], "checks": checks, "H_shift_terms": len(H_SHIFT), "output": str(OUT)}, indent=2))


if __name__ == "__main__":
    main()
