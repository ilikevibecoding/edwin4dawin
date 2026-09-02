#!/usr/bin/env python3
"""Verify the common down-link variance decomposition of live NCL."""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp


OUTPUT = Path("terminal_common_downlink_ncl_certificate_20260729.json")


def main() -> None:
    r = sp.symbols("r", positive=True, integer=True)
    k = r + 1
    u, d, n = sp.symbols("u D N", positive=True)
    w2 = sp.symbols("W2", real=True)
    mean_a2 = sp.symbols("E_A2", nonnegative=True)
    mean_n2_over_d = sp.symbols(
        "E_n2_over_d", nonnegative=True
    )
    q = sp.symbols("Q", real=True)
    delta = sp.symbols("delta", nonnegative=True)

    var_a = mean_a2 - u**2
    mean_v2_nu = mean_n2_over_d / d
    mean_v_nu = n / d
    var_v_nu = mean_v2_nu - mean_v_nu**2

    local_f = r + mean_a2 - w2
    reserve_f = r + u**2 - w2
    assert sp.factor(reserve_f - (local_f - var_a)) == 0

    local_t = k + mean_v2_nu - q / d
    reserve_t = k + mean_v_nu**2 - q / d
    assert sp.factor(reserve_t - (local_t - var_v_nu)) == 0

    s = u / d
    theta = r / (d + r)
    zeta = n / d - k * u / r
    coupling = (r * n - k * u * (r + 2)) / d
    base = (
        k
        * (r + 2)
        * (u - r)
        * (1 / r + 1 / d)
        + zeta * (r + 2 + r**2 / u)
        - 2 * k * s * delta
    )
    ncl = (
        2 * k * reserve_t
        - coupling * reserve_f / u
        + base
        - 2 * k * theta * zeta**2
    )
    average_local = (
        2 * k * local_t
        - coupling * local_f / u
        + base
    )
    quadratic_correction = (
        coupling * var_a / u
        - 2 * k * var_v_nu
        - 2 * k * theta * zeta**2
    )
    assert sp.factor(
        ncl - average_local - quadratic_correction
    ) == 0

    mean_h2_over_d = sp.symbols(
        "E_H2_over_d", nonnegative=True
    )
    mean_h = d * zeta
    # H_K=n_K-(k*u/r)d_K.  Its weighted second moment obeys
    # E[H_K^2/d_K]/D=E_nu[(V_K-k*u/r)^2].
    h_second_substitution = {
        mean_h2_over_d: d * (var_v_nu + zeta**2)
    }
    psd_spread = (
        mean_h2_over_d / d
        - mean_h**2 / (d * (d + r))
    )
    assert sp.factor(
        psd_spread.subs(h_second_substitution)
        - (var_v_nu + theta * zeta**2)
    ) == 0
    quadratic_psd_form = coupling * var_a / u - 2 * k * psd_spread

    report = {
        "status": "PASS_SYMBOLIC",
        "identities": {
            "R_F_downlink": True,
            "R_T_size_biased_downlink": True,
            "NCL_local_plus_quadratic_correction": True,
            "augmented_variance_PSD_identity": True,
        },
        "definitions": {
            "mu": (
                "natural down-link law on independent "
                "(r-2)-sets K, weighted by the residual order"
            ),
            "A_K": "2*i_2(H_K)/i_1(H_K)",
            "d_K": (
                "{2*i_2(H_K)+r*i_1(J_K)}/i_1(H_K)"
            ),
            "n_K": (
                "{6*i_3(H_K)+2(r+1)i_2(J_K)}/i_1(H_K)"
            ),
            "nu": "d_K-size-biased version of mu",
            "V_K": "n_K/d_K",
        },
        "downlink_reserves": {
            "R_F": (
                "E_mu[r+A_K^2-B_K]-Var_mu(A_K), "
                "B_K=6*i_3(H_K)/i_1(H_K)"
            ),
            "R_T": (
                "E_nu[(r+1)+V_K^2-Q_K/d_K]"
                "-Var_nu(V_K)"
            ),
        },
        "quadratic_correction": (
            "(C/u)Var_mu(A_K)"
            "-2(r+1)Xi"
        ),
        "augmented_variance": (
            "Xi=Var_nu(V_K)+theta(E_nu[V_K]-(r+1)u/r)^2"
            "=E_mu[H_K^2/d_K]/D"
            "-E_mu[H_K]^2/{D(D+r)}, "
            "H_K=n_K-(r+1)u*d_K/r"
        ),
        "mixture_interpretation": (
            "Xi=(D+r)/D times the variance of the mixture having "
            "mass D from V_K under nu and an extra atom of mass r "
            "at (r+1)u/r"
        ),
        "scope": (
            "Algebraic decomposition only; positivity of the full "
            "local-plus-correction expression remains unproved."
        ),
    }
    OUTPUT.write_text(
        json.dumps(report, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
