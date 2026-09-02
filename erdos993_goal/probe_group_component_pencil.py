#!/usr/bin/env python3
"""Exact root audit of the core-plus-inherited group Schur pencil."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import sympy as sp

from probe_group_catalan_square_core import matrix, schur_tail
from prove_scaled_bottom_kernel_network import binomial_antidiagonal, catalan_u_toeplitz


OUT = Path("group_component_pencil_probe_20260803.json")
t = sp.symbols("t")


def components(m: int) -> tuple[sp.Matrix, sp.Matrix, sp.Matrix]:
    d = 2 * m + 5
    e = d - 2
    n = 3 * m + 5
    size = n + 1
    toeplitz = catalan_u_toeplitz(n)
    b_group = binomial_antidiagonal(d, n)
    p_scaled = binomial_antidiagonal(e, n) + sp.Matrix(
        matrix(e, power=1, limit=n)
    )

    observed = list(range(d + 1))
    group_tail = list(range(d + 1, size))
    p_core = list(range(e + 1))
    p_tail = list(range(e + 1, size))
    b0 = b_group.extract(observed, observed)
    t0 = toeplitz.extract(observed, list(range(size)))
    t1 = toeplitz.extract(group_tail, list(range(size)))
    correction = (t0.T * b0.inv() * t0).extract(p_core, p_core)

    pcc = p_scaled.extract(p_core, p_core)
    pcf = p_scaled.extract(p_core, p_tail)
    pfc = p_scaled.extract(p_tail, p_core)
    pff = p_scaled.extract(p_tail, p_tail)
    sigma_p = pff - pfc * pcc.inv() * pcf
    h = pfc * pcc.inv()
    core_inverse = (pcc.inv() - correction).inv()
    t1c = t1.extract(range(m), p_core)
    t1f = t1.extract(range(m), p_tail)
    adjusted = t1c + t1f * h
    core = -adjusted * core_inverse * adjusted.T
    inherited = -t1f * sigma_p * t1f.T
    actual = schur_tail(matrix(d, power=2, limit=n), d)
    assert core + inherited == actual
    reversal = sp.eye(m)[:, ::-1]
    return core * reversal, inherited * reversal, actual * reversal


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-m", type=int, default=10)
    args = parser.parse_args()
    records = []
    for m in range(1, args.max_m + 1):
        core, inherited, actual = components(m)
        polynomial = sp.Poly((core + t * inherited).det(), t, domain=sp.QQ)
        real = polynomial.count_roots(-sp.oo, sp.oo)
        negative = polynomial.count_roots(-sp.oo, 0)
        positive = polynomial.count_roots(0, sp.oo)
        nonreal = polynomial.degree() - real
        assert negative + positive == real
        assert sp.factor(polynomial.eval(1) - actual.det()) == 0
        records.append(
            {
                "m": m,
                "degree": int(polynomial.degree()),
                "exact_real_roots": int(real),
                "nonreal_roots": int(nonreal),
                "negative_roots": int(negative),
                "positive_roots": int(positive),
                "sign_at_t_0": int(sp.sign(polynomial.eval(0))),
                "sign_at_t_1": int(sp.sign(polynomial.eval(1))),
            }
        )
        print(records[-1], flush=True)

    report = {
        "status": (
            "GROUP_COMPONENT_PENCIL_NOT_REAL_ROOTED"
            if any(record["nonreal_roots"] for record in records)
            else "PASS_EXACT_GROUP_COMPONENT_PENCIL_ROOT_AUDIT"
        ),
        "records": records,
        "scope": "Finite exact generalized-eigenvalue evidence, not an all-order theorem.",
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
