#!/usr/bin/env python3
"""Exact assembly of the exterior sector theorem and the Duran fixed ceiling.

The half-angle argument for

    M_n(d;z)=P_B[(4q-d)^n](z)

uses only rho>n-1 when z=rho*exp(2i*psi); it does not require rho to equal
the forest target radius.  Hence, after the two polar derivatives and the
Grace--Walsh lift, the symmetric-outlier polynomial has no nonreal zero on
any circle of radius rho>n-1.  The reachable-boundary argument then gives
the same exterior exclusion for arbitrary outliers u,v in [0,1].

For n=r+2 and B>=3r+4 the forest radius

    R0^2=(B+r+1)(B+r)/16

satisfies R0>r+1=n-1.  Therefore every nonreal exceptional pair is inside
the R0 disk.  The reflected-Pochhammer variation theorem bounds every
unselected positive real root by r+1, and the negative-axis barrier bounds
every unselected negative real root below in modulus by (B-3)/4<R0.
Consequently the residual quadratic product satisfies

    G2 <= R0^2=N(N-1)/16.

This script verifies the all-rank algebraic margins and checks the exact
dependency reports used by this assembly.  The analytic inputs are the
Laguerre polar-derivative theorem, Grace--Walsh--Szego, total-positivity
variation diminution, and the classical Pochhammer negative-zero theorem.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
REPORT = HERE / "exterior_sector_fixed_ceiling_exact_20260809.json"


DEPENDENCIES = {
    "half_angle": (
        "half_angle_sector_grace_lift_exact_20260809.json",
        "PASS_EXACT_ALL_RANK_HALF_ANGLE_SECTOR_AND_ARBITRARY_BENIGN_LIFT",
    ),
    "reachable_boundary": (
        "fixed_circle_topological_meixner_reduction_exact_20260809.json",
        "PASS_EXACT_TOPOLOGICAL_BOUNDARY_AND_MEIXNER_MATRIX_REDUCTION",
    ),
    "positive_endpoint": (
        "positive_endpoint_pochhammer_variation_exact_20260809.json",
        "PASS_EXACT_ALL_RANK_POSITIVE_ENDPOINT_THEOREM",
    ),
    "negative_endpoint": (
        "window_all_stage_negative_axis_barrier_exact_20260809.json",
        "PASS_EXACT_ALL_STAGE_NEGATIVE_AXIS_BARRIER",
    ),
    "second_margin": (
        "actual_duran_second_margin_coefficientwise_exact_20260809.json",
        "PASS_EXACT_ALL_RANK_DURAN_SECOND_MARGIN_THEOREM",
    ),
    "fixed_ceiling_reduction": (
        "actual_duran_fixed_ambient_product_reduction_exact_20260809.json",
        "PASS_EXACT_REDUCTION_AND_FIXED_CEILING_FINITE_AUDIT",
    ),
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    B, rho, D, P = sp.symbols("B rho D P", positive=True)

    # The half-angle boundary contradiction is uniform in rho.  Its only
    # spectral hypothesis is rho>D, with 0<=D<=n-1.
    denominator_at_pmax = sp.factor(
        ((B + 2 * D) * (rho + D) - 2 * P).subs(P, D * (B + D))
    )
    assert sp.factor(
        denominator_at_pmax - (B * (rho - D) + 2 * D * rho)
    ) == 0

    crossing_margin = sp.factor(
        (rho + D) ** 2 * (B + D + rho)
        - D * (B + D) * (3 * rho + D)
    )
    crossing_factor = sp.factor(
        rho * (B * (rho - D) + 3 * D * rho + rho**2)
    )
    assert sp.factor(crossing_margin - crossing_factor) == 0

    # The same positive factor supplies the initial orientation at psi=0.
    orientation_margin = sp.factor(
        (B + D + rho) * (rho + D) ** 2
        - D * (B + D) * (3 * rho + D)
    )
    assert sp.factor(orientation_margin - crossing_factor) == 0

    r, slack, radial_slack = sp.symbols(
        "r slack radial_slack", integer=True, nonnegative=True
    )
    B_forest = 3 * r + 4 + slack
    n = r + 2
    N = B_forest + r + 1
    R0_squared = sp.factor(N * (N - 1) / 16)
    R0_margin = sp.factor(R0_squared - (n - 1) ** 2)
    R0_numerator = sp.Poly(
        sp.together(R0_margin).as_numer_denom()[0], r, slack
    )
    assert all(coefficient >= 0 for coefficient in R0_numerator.coeffs())
    assert R0_margin.subs({r: 0, slack: 0}) > 0

    negative_threshold_squared = sp.factor((B_forest - 3) ** 2 / 16)
    negative_margin = sp.factor(R0_squared - negative_threshold_squared)
    negative_numerator = sp.Poly(
        sp.together(negative_margin).as_numer_denom()[0], r, slack
    )
    assert all(coefficient >= 0 for coefficient in negative_numerator.coeffs())
    assert negative_margin.subs({r: 0, slack: 0}) > 0

    # The Duran first-margin reserve comparison, independently reconstructed.
    alpha, delta, m = sp.symbols(
        "alpha delta m", integer=True, nonnegative=True
    )
    x, epsilon = sp.symbols("x epsilon", integer=True, nonnegative=True)
    beta = epsilon - sp.Rational(1, 2)
    N_window = 4 * x + 2 * epsilon - 1 - delta
    direct_gap = sp.factor(16 * x * (x + beta) - N_window * (N_window - 1))
    # With x=n-m+1 and delta=p-alpha-(4m-3), the notebook's expression
    # uses the dependent identities among x, alpha, delta, m and epsilon.
    p = 2 * (x + m - 1) + epsilon
    alpha_identity = sp.solve(
        sp.Eq(delta, p - alpha - (4 * m - 3)), x
    )[0]
    substituted_gap = sp.factor(direct_gap.subs(x, alpha_identity))
    expected_gap = sp.factor(
        4 * alpha * delta
        + 2 * alpha
        + 3 * delta**2
        + 8 * delta * m
        - 5 * delta
        + 4 * m
        - 4
    )
    assert sp.factor((substituted_gap - expected_gap).subs(epsilon, 0)) == 0
    assert sp.factor((substituted_gap - expected_gap).subs(epsilon, 1)) == 0

    dependency_records: dict[str, dict[str, object]] = {}
    for label, (filename, status) in DEPENDENCIES.items():
        path = HERE / filename
        payload = json.loads(path.read_text(encoding="utf-8"))
        assert payload["status"] == status
        dependency_records[label] = {
            "file": filename,
            "status": status,
            "sha256": sha256(path),
        }

    payload = {
        "kind": "exterior_half_angle_and_fixed_ceiling_assembly",
        "date": "2026-08-09",
        "status": "PASS_EXACT_ALL_RANK_EXTERIOR_SECTOR_AND_DURAN_FIXED_CEILING",
        "exterior_sector_theorem": (
            "For every rho>n-1, B>0, 0<t<=1 and every positive benign list, "
            "the symmetric-outlier transform has no zero on the open upper "
            "circle |z|=rho.  The proof is the half-angle argument with its "
            "radius treated as a free variable."
        ),
        "full_outlier_lift": (
            "The zero and one outlier edges plus the affine reachable-region "
            "continuation lift the exterior exclusion to all 0<=u,v<=1."
        ),
        "real_endpoint_theorem": (
            "After the r largest positive roots are selected, every remaining "
            "positive root is <=r+1 and every remaining negative root is "
            ">-(B-3)/4; both thresholds lie strictly inside R0."
        ),
        "fixed_ceiling": "G2<=R0^2=N(N-1)/16",
        "crossing_margin": str(crossing_margin),
        "crossing_margin_factor": str(crossing_factor),
        "R0_squared": str(R0_squared),
        "positive_radius_margin": str(R0_margin),
        "negative_radius_margin": str(negative_margin),
        "duran_reserve_gap": str(expected_gap),
        "dependencies": dependency_records,
        "consequence": (
            "Together with the already proved second Duran margin and the "
            "strict reserve gap, both final Jacobi pivots are positive."
        ),
        "remaining_scope": [
            "independently replay the complete forest-to-window reduction",
            "audit every use of external classical theorems and hypotheses",
            "perform a current literature search before claiming a resolution",
        ],
    }
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print(f"dependencies={len(dependency_records)}")
    print(f"report={REPORT}")


if __name__ == "__main__":
    main()
