"""Symbolic test of a two-endpoint Hermitian PSD derivative lift.

For one endpoint, the PSD block direction

    [[I, c e f*], [c f e*, I]]

realizes S^2-2c^2 D_E D_F at a block-diagonal determinant.  With two
endpoints, real off-diagonal phases create cross-pair terms.  This script
tests whether orthogonal Hermitian phases (1 and i) cancel those terms and
make the fourth mixed derivative equal the desired product of two endpoint
contractions.
"""

from __future__ import annotations

import json
import random
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
REPORT = HERE / "two_endpoint_psd_lift_probe_20260804.json"

a, b, c, e, f, g = sp.symbols("a b c e f g", real=True)
x, y, z1, z2, w1, w2 = sp.symbols("x y z1 z2 w1 w2")
t1, t2, amp = sp.symbols("t1 t2 amp", real=True)


def coeff(expr, variable, degree):
    return sp.expand(expr).coeff(variable, degree)


def apply_S(expr, order):
    out = expr
    for _ in range(order):
        out = sp.diff(out, x) + sp.diff(out, y)
    return out


def desired_expression():
    AX = sp.Matrix([[a + x + z1, b], [b, c + x + z2]])
    DY = sp.Matrix([[e + y + w1, f], [f, g + y + w2]])
    base = sp.expand(AX.det() * DY.det())
    first = apply_S(base, 2) - sp.diff(base, z1, w1)
    target = apply_S(first, 2) - sp.diff(first, z2, w2)
    return sp.expand(target.subs({x: 0, y: 0, z1: 0, z2: 0, w1: 0, w2: 0}))


def lifted_expression(second_phase):
    A = sp.Matrix([[a, b], [b, c]])
    D = sp.Matrix([[e, f], [f, g]])
    zero = sp.zeros(2)
    M = A.row_join(zero).col_join(zero.row_join(D))
    identity = sp.eye(2)

    C1 = sp.Matrix([[amp, 0], [0, 0]])
    C2 = sp.Matrix([[0, 0], [0, amp * second_phase]])
    B1 = identity.row_join(C1).col_join(sp.conjugate(C1.T).row_join(identity))
    B2 = identity.row_join(C2).col_join(sp.conjugate(C2.T).row_join(identity))
    determinant = sp.expand((M + t1 * B1 + t2 * B2).det())
    mixed_derivative = 4 * coeff(coeff(determinant, t1, 2), t2, 2)
    # c^2=1/2; all surviving powers are even after a valid phase cancellation.
    return sp.expand(mixed_derivative.subs(amp**4, sp.Rational(1, 4)).subs(amp**2, sp.Rational(1, 2)))


def apply_endpoint_contractions(expr, endpoint_count: int, endpoint_weight: int):
    out = expr
    for index in range(endpoint_count):
        out = apply_S(out, 2) - endpoint_weight * sp.diff(out, sp.Symbol(f"z{index}"), sp.Symbol(f"w{index}"))
    substitutions = {x: 0, y: 0}
    substitutions.update({sp.Symbol(f"z{index}"): 0 for index in range(endpoint_count)})
    substitutions.update({sp.Symbol(f"w{index}"): 0 for index in range(endpoint_count)})
    return sp.expand(out.subs(substitutions))


def numeric_all_size_test(size: int, endpoint_count: int, seed: int, phases=None, nonorthogonal=False):
    """Exact random-matrix test with amplitude one, hence endpoint weight two."""
    rng = random.Random(seed)
    raw_a = sp.Matrix(size, size, lambda i, j: rng.randint(-4, 6))
    raw_d = sp.Matrix(size, size, lambda i, j: rng.randint(-4, 6))
    A = raw_a + raw_a.T + (3 * size + 7) * sp.eye(size)
    D = raw_d + raw_d.T + (3 * size + 11) * sp.eye(size)
    zvars = sp.symbols(f"z0:{endpoint_count}")
    wvars = sp.symbols(f"w0:{endpoint_count}")
    if nonorthogonal:
        xvectors = [sp.Matrix([rng.randint(1, 4) for _ in range(size)]) for _ in range(endpoint_count)]
        yvectors = [sp.Matrix([rng.randint(1, 4) for _ in range(size)]) for _ in range(endpoint_count)]
    else:
        xvectors = [sp.eye(size)[:, index] for index in range(endpoint_count)]
        yvectors = [sp.eye(size)[:, index] for index in range(endpoint_count)]
    AX = A + x * sp.eye(size)
    DY = D + y * sp.eye(size)
    for index in range(endpoint_count):
        AX += zvars[index] * (xvectors[index] * xvectors[index].T)
        DY += wvars[index] * (yvectors[index] * yvectors[index].T)
    desired = apply_endpoint_contractions(sp.expand(AX.det() * DY.det()), endpoint_count, 2)

    zero = sp.zeros(size)
    M = A.row_join(zero).col_join(zero.row_join(D))
    tvars = sp.symbols(f"q0:{endpoint_count}")
    pencil = M
    phases = phases or [sp.Integer(1)] * endpoint_count
    for index in range(endpoint_count):
        cross = phases[index] * xvectors[index] * yvectors[index].T
        direction = sp.eye(size).row_join(cross).col_join(sp.conjugate(cross.T).row_join(sp.eye(size)))
        pencil += tvars[index] * direction
    determinant = sp.Poly(sp.expand(pencil.det()), *tvars)
    monomial = sp.Mul(*[variable**2 for variable in tvars])
    lifted = (2 ** endpoint_count) * determinant.coeff_monomial(monomial)
    residual = sp.factor(lifted - desired)
    return {
        "size": size,
        "endpoint_count": endpoint_count,
        "seed": seed,
        "phases": [str(phase) for phase in phases],
        "nonorthogonal": nonorthogonal,
        "identity": residual == 0,
        "residual": str(residual),
    }


def main():
    desired = desired_expression()
    lifted_real = lifted_expression(sp.Integer(1))
    lifted_quadrature = lifted_expression(sp.I)
    real_residual = sp.factor(lifted_real - desired)
    quadrature_residual = sp.factor(lifted_quadrature - desired)
    all_size_checks = [
        numeric_all_size_test(3, 2, 993_20260804),
        numeric_all_size_test(3, 2, 994_20260804, [sp.Integer(1), sp.I]),
        numeric_all_size_test(4, 2, 995_20260804),
        numeric_all_size_test(4, 2, 996_20260804, [sp.Integer(1), sp.I]),
        numeric_all_size_test(3, 2, 997_20260804, [sp.Integer(1), sp.I], True),
        numeric_all_size_test(4, 2, 998_20260804, [sp.Integer(1), sp.I], True),
    ]
    real_checks = [item for item in all_size_checks if item["phases"] == ["1", "1"]]
    quadrature_checks = [item for item in all_size_checks if item["phases"] == ["1", "I"]]
    report = {
        "status": (
            "QUADRATURE_PSD_LIFT_PROBE"
            if (
                real_residual == 0
                and quadrature_residual == 0
                and all(item["identity"] for item in quadrature_checks)
                and all(not item["identity"] for item in real_checks)
            )
            else "NO_IDENTITY"
        ),
        "real_phase_residual": str(real_residual),
        "quadrature_phase_residual": str(quadrature_residual),
        "desired": str(desired),
        "lifted_real": str(lifted_real),
        "lifted_quadrature": str(lifted_quadrature),
        "all_size_checks": all_size_checks,
        "scope": (
            "A symbolic 2x2 identity would identify the local cycle cancellation. "
            "It would still need an all-size mixed-determinant derivation."
        ),
    }
    REPORT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "status": report["status"],
        "real_phase_residual": report["real_phase_residual"],
        "quadrature_phase_residual": report["quadrature_phase_residual"],
        "report": str(REPORT),
    }, indent=2))


if __name__ == "__main__":
    main()
