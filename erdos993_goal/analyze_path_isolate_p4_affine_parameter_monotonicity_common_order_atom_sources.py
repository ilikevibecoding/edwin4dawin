#!/usr/bin/env python3
"""Audit coefficient geometry of the common-order L and reserve sources.

The common-order identity uses

    Phi_j(H) = C(n,j) [diag] A^a T^b w^j (1+z)^(n-j) H,
    L_j = Phi_j(L),
    n R_j = (n-j) Phi_j(S),  S=T^2 Q/(1+z).

This script checks the two hardest representative families after exact
parameter specialization.  In particular it asks whether the source
coefficients themselves give a positive-mixture proof, or whether the
observed convexity is created only after the binomial transform.
"""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp

from analyze_path_isolate_p4_bottom_pair_affine_two_kernel import A, T, V, m, q, w, x, z
from analyze_path_isolate_p4_group_affine_grouped_tail_symbolic import c
from probe_path_isolate_p4_affine_parameter_monotonicity_reaggregated_v import (
    bottom_increment,
    group_increment,
    quotient,
)

AA, VV, TT = sp.symbols("AA VV TT")


def coefficient_map(expression: sp.Expr) -> dict[tuple[int, int], int]:
    return {
        tuple(map(int, exponent)): int(coefficient)
        for exponent, coefficient in sp.Poly(sp.expand(expression), z, w).terms()
    }


def signs(values: list[tuple[int, int]]) -> list[dict]:
    result = []
    for index, value in values:
        if value == 0:
            continue
        sign = 1 if value > 0 else -1
        if not result or result[-1]["sign"] != sign:
            result.append({"sign": sign, "start": index, "end": index})
        else:
            result[-1]["end"] = index
    return result


def projected_sign_blocks(source: dict[tuple[int, int], int], mode: str) -> list[dict]:
    projected: dict[int, int] = {}
    for (pz, pw), value in source.items():
        index = {
            "z": pz,
            "w": pw,
            "sum": pz + pw,
            "difference": pz - pw,
        }[mode]
        projected[index] = projected.get(index, 0) + value
    return signs(sorted(projected.items()))


def row_sign_words(source: dict[tuple[int, int], int]) -> list[dict]:
    if not source:
        return []
    maximum_w = max(pw for _, pw in source)
    result = []
    for pz in range(max(pz for pz, _ in source) + 1):
        word = "".join(
            "." if (pz, pw) not in source
            else "+" if source[pz, pw] > 0
            else "-" if source[pz, pw] < 0
            else "0"
            for pw in range(maximum_w + 1)
        )
        if set(word) != {"."}:
            result.append({"z": pz, "w_increasing": word})
    return result


def homogeneous_sign_audit(source: dict[tuple[int, int], int]) -> list[dict]:
    result = []
    for degree in sorted({pz + pw for pz, pw in source}):
        values = [
            value for (pz, pw), value in source.items() if pz + pw == degree
        ]
        result.append({
            "degree": degree,
            "positive_count": sum(value > 0 for value in values),
            "negative_count": sum(value < 0 for value in values),
            "coefficient_sum_sign": (
                1 if sum(values) > 0 else -1 if sum(values) < 0 else 0
            ),
        })
    return result


def symmetric_basis_audit(expression: sp.Expr) -> dict:
    symmetric, remainder, mapping = sp.symmetrize(
        sp.expand(expression), [z, w], formal=True
    )
    if remainder != 0:
        return {"symmetric": False, "remainder": str(remainder)}
    s1, s2 = (item[0] for item in mapping)
    av = sp.expand(symmetric.subs({s1: VV - 1, s2: AA - VV}))
    vt = sp.expand(
        symmetric.subs({
            s1: VV - 1,
            s2: (VV**2 - VV - TT) / 2,
        })
    )

    def summary(candidate: sp.Expr, variables: tuple[sp.Symbol, ...]) -> dict:
        poly = sp.Poly(candidate, *variables)
        terms = poly.terms()
        return {
            "term_count": len(terms),
            "negative_coefficient_count": sum(
                1 for _, coefficient in terms if coefficient < 0
            ),
            "rational_noninteger_coefficient_count": sum(
                1 for _, coefficient in terms if coefficient.q != 1
            ),
            "expression": str(candidate) if len(terms) <= 120 else None,
        }

    return {
        "symmetric": True,
        "A_V": summary(av, (AA, VV)),
        "V_T": summary(vt, (VV, TT)),
    }


def audit(package: str, parity: int, coordinate: str, values: dict) -> dict:
    d_expression, reserve_expression = (
        group_increment(parity, coordinate)
        if package == "group"
        else bottom_increment(parity, coordinate)
    )
    common = T**3 if package == "group" else q**2 * T**3
    d_reduced = quotient(d_expression, common)
    reserve_reduced = quotient(reserve_expression, common)
    ell = quotient(d_reduced - reserve_reduced, V)
    q_source = quotient(reserve_reduced, T**2)
    s_source = quotient(T**2 * q_source, 1 + z)
    symmetric_reserve_core = quotient(T**2 * q_source, A)

    ell_map = coefficient_map(ell.subs(values))
    minus_ell_map = {key: -value for key, value in ell_map.items()}
    s_map = coefficient_map(s_source.subs(values))
    specialized_minus_ell = sp.expand(-ell.subs(values))
    specialized_s = sp.expand(s_source.subs(values))
    specialized_symmetric_reserve_core = sp.expand(
        symmetric_reserve_core.subs(values)
    )
    common_support = sorted(set(minus_ell_map) & set(s_map))
    ell_only = sorted(set(minus_ell_map) - set(s_map))
    s_only = sorted(set(s_map) - set(minus_ell_map))

    ratios = [
        sp.Rational(minus_ell_map[key], s_map[key])
        for key in common_support if s_map[key]
    ]
    return {
        "package": package,
        "parity": parity,
        "coordinate": coordinate,
        "parameters": {str(symbol): int(value) for symbol, value in values.items()},
        "minus_L_term_count": len(minus_ell_map),
        "minus_L_negative_coefficient_count": sum(value < 0 for value in minus_ell_map.values()),
        "minus_L_zero_coefficient_count": sum(value == 0 for value in minus_ell_map.values()),
        "S_term_count": len(s_map),
        "S_nonpositive_coefficient_count": sum(value <= 0 for value in s_map.values()),
        "common_support_count": len(common_support),
        "minus_L_only_support_count": len(ell_only),
        "S_only_support_count": len(s_only),
        "minus_L_only_first": [list(key) for key in ell_only[:20]],
        "S_only_first": [list(key) for key in s_only[:20]],
        "common_coefficient_ratio_min": str(min(ratios)) if ratios else None,
        "common_coefficient_ratio_max": str(max(ratios)) if ratios else None,
        "minus_L_projected_sign_blocks": {
            mode: projected_sign_blocks(minus_ell_map, mode)
            for mode in ("z", "w", "sum", "difference")
        },
        "minus_L_row_sign_words": row_sign_words(minus_ell_map),
        "minus_L_homogeneous_sign_audit": homogeneous_sign_audit(
            minus_ell_map
        ),
        "minus_L_symmetric_basis": symmetric_basis_audit(
            specialized_minus_ell
        ),
        "S_symmetric_basis": symmetric_basis_audit(specialized_s),
        "symmetric_reserve_core_basis": symmetric_basis_audit(
            specialized_symmetric_reserve_core
        ),
    }


def main() -> None:
    records = [
        audit("group", 0, "m", {c: 1, m: 16, x: 40}),
        audit("bottom", 1, "x", {m: 20, x: 40}),
    ]
    report = {
        "status": "EXACT_COMMON_ORDER_ATOM_SOURCE_AUDIT",
        "records": records,
    }
    Path(
        "path_isolate_p4_affine_parameter_monotonicity_"
        "common_order_atom_sources_20260802.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
