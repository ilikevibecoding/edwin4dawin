#!/usr/bin/env python3
"""Derive the coefficient-extraction integrand for the bottom pair.

If I(c,d) is the internal-group integrand, then after aligning the
coefficient targets

  H(j,0)+H(j,1)

is represented by

  I(0,j) + j*z*w*(1+z)*(1+w)*I(1,j-1).

This script forms its two-layer lift residual, removes the common
(Z+W)^(j-5) factor, specializes j=2m+epsilon in the stable range,
and checks the resulting parameter polynomial coefficientwise.
"""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp

import derive_path_isolate_p4_group_integrand as group


def main() -> None:
    print("deriving common internal-group integrand", flush=True)
    integrand, alignment = group.derive_integrand()
    q = group.q
    length = group.length
    c = group.c
    d = group.d
    z = group.z
    w = group.w
    Z = group.Z
    W = group.W
    T = group.T
    j, m, s_distance, x = sp.symbols(
        "j m s x", integer=True, nonnegative=True
    )

    print("forming aligned bottom-pair integrand", flush=True)
    integrand_t = integrand.xreplace({Z + W: T})
    h_zero = integrand_t.subs(
        {c: 0, d: j}, simultaneous=True
    )
    h_one = integrand_t.subs(
        {c: 1, d: j - 1}, simultaneous=True
    )
    pair = sp.expand(
        h_zero
        + j * z * w * (1 + z) * (1 + w) * h_one
    )
    new_pair = pair.subs(
        {q: q + 1, length: length + 2, j: j + 2},
        simultaneous=True,
    )
    residual = sp.expand(
        (1 + z) * (1 + w) * new_pair - z * w * pair
    )

    print("removing common T^(j-5) factor", flush=True)
    reduced = sp.Add(
        *(
            sp.powdenest(
                sp.powsimp(
                    term / T ** (j - 5),
                    force=True,
                ),
                force=True,
            )
            for term in sp.Add.make_args(residual)
        )
    )
    reports = []
    total_negative = 0
    total_prefix_failures = 0
    remaining_symbolic_powers = []
    for parity in (0, 1):
        print(f"specializing parity={parity}", flush=True)
        stable = reduced.subs(
            {
                j: 2 * m + parity,
                q: m + s_distance + 2,
                length: (
                    2 * (m + s_distance + 2) - 4 + x
                ),
            },
            simultaneous=True,
        )
        stable = sp.cancel(stable)
        symbolic_powers = [
            str(power)
            for power in stable.atoms(sp.Pow)
            if power.exp.has(m)
        ]
        remaining_symbolic_powers.extend(
            {
                "parity_epsilon": parity,
                "power": power,
            }
            for power in symbolic_powers
        )
        expanded = sp.expand(
            stable.subs(T, Z + W).subs(
                {
                    Z: z * (1 + z),
                    W: w * (1 + w),
                }
            )
        )
        numerator, denominator = map(
            sp.factor, sp.fraction(expanded)
        )
        polynomial = sp.Poly(
            sp.expand(numerator),
            z,
            w,
            m,
            s_distance,
            x,
        )
        terms = polynomial.terms()
        Path(
            "path_isolate_p4_bottom_pair_lift_integrand_"
            f"parity{parity}_terms_20260801.json"
        ).write_text(
            json.dumps(
                {
                    "parity_epsilon": parity,
                    "variables": ["z", "w", "m", "s", "x"],
                    "common_factor": (
                        "(Z+W)^(2m+epsilon-5)"
                    ),
                    "denominator": str(denominator),
                    "terms": [
                        {
                            "monomial_z_w_m_s_x": list(monomial),
                            "coefficient": str(coefficient),
                        }
                        for monomial, coefficient in terms
                    ],
                },
                indent=2,
            )
            + "\n",
            encoding="utf-8",
        )
        negative = [
            (monomial, coefficient)
            for monomial, coefficient in terms
            if coefficient < 0
        ]
        total_negative += len(negative)
        coefficient_lookup = {
            monomial: coefficient
            for monomial, coefficient in terms
        }
        symmetry_failures = []
        chains = {}
        for monomial, coefficient in terms:
            power_z, power_w, *parameter_powers = monomial
            swapped = (
                power_w,
                power_z,
                *parameter_powers,
            )
            if coefficient_lookup.get(swapped, 0) != coefficient:
                symmetry_failures.append(
                    {
                        "monomial_z_w_m_s_x": list(monomial),
                        "coefficient": str(coefficient),
                    }
                )
            if power_z < power_w:
                continue
            key = (
                tuple(parameter_powers),
                power_z + power_w,
            )
            imbalance = power_z - power_w
            multiplicity = 1 if imbalance == 0 else 2
            chains.setdefault(key, {})[imbalance] = (
                multiplicity * coefficient
            )
        prefix_failures = []
        prefix_checks = 0
        minimum_prefix = None
        for (
            parameter_powers,
            total_degree,
        ), chain in chains.items():
            running = 0
            for imbalance in sorted(chain):
                running += chain[imbalance]
                prefix_checks += 1
                record = {
                    "parameter_powers_m_s_x": list(
                        parameter_powers
                    ),
                    "total_z_w_degree": total_degree,
                    "through_imbalance": imbalance,
                    "prefix": str(running),
                }
                if (
                    minimum_prefix is None
                    or running < int(minimum_prefix["prefix"])
                ):
                    minimum_prefix = record
                if running < 0:
                    prefix_failures.append(record)
        total_prefix_failures += len(prefix_failures)
        reports.append(
            {
                "parity_epsilon": parity,
                "common_factor": (
                    "(Z+W)^(2m+epsilon-5)"
                ),
                "denominator": str(denominator),
                "degree_z_w_m_s_x": list(
                    polynomial.degree_list()
                ),
                "term_count": len(terms),
                "negative_coefficient_count": len(negative),
                "smallest_coefficient": str(
                    min(
                        coefficient
                        for _, coefficient in terms
                    )
                ),
                "symmetry_failure_count": len(
                    symmetry_failures
                ),
                "imbalance_prefix_checks": prefix_checks,
                "negative_imbalance_prefix_count": len(
                    prefix_failures
                ),
                "minimum_imbalance_prefix": minimum_prefix,
                "first_negative_imbalance_prefixes": (
                    prefix_failures[:50]
                ),
                "first_negative_terms": [
                    {
                        "monomial_z_w_m_s_x": list(monomial),
                        "coefficient": str(coefficient),
                    }
                    for monomial, coefficient in negative[:50]
                ],
            }
        )

    passed = (
        total_negative == 0 and not remaining_symbolic_powers
    )
    report = {
        "status": (
            "PASS_PATH_ISOLATE_P4_BOTTOM_PAIR_LIFT_INTEGRAND"
            if passed
            else "FAIL_PATH_ISOLATE_P4_BOTTOM_PAIR_LIFT_INTEGRAND"
        ),
        "alignment": alignment,
        "pair_integrand": (
            "I(0,j)+j*z*w*(1+z)*(1+w)*I(1,j-1)"
        ),
        "lift_alignment": (
            "(1+z)(1+w) Pair(q+1,L+2,j+2)"
            " - zw Pair(q,L,j)"
        ),
        "remaining_symbolic_power_count": len(
            remaining_symbolic_powers
        ),
        "remaining_symbolic_powers": (
            remaining_symbolic_powers[:50]
        ),
        "negative_coefficient_count": total_negative,
        "imbalance_grouped_status": (
            "PASS_IMBALANCE_PREFIX_GROUPING"
            if total_prefix_failures == 0
            else "FAIL_IMBALANCE_PREFIX_GROUPING"
        ),
        "negative_imbalance_prefix_count": (
            total_prefix_failures
        ),
        "reports": reports,
        "warning": (
            "A negative raw coefficient only refutes this stronger "
            "integrand certificate, not the extracted lift."
        ),
    }
    Path(
        "path_isolate_p4_bottom_pair_lift_integrand_20260730.json"
    ).write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, indent=2))
    if not passed:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
