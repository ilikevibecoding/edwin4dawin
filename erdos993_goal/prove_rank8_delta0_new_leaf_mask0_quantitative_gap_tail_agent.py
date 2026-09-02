#!/usr/bin/env python3
"""Exact Bernstein seal of the Delta0 new-leaf mask-0 tail.

Scope: N=|D|>=40, r=deg_A(v)>=10, and m=N-r=|F|>=16.  The two top
coordinates are placed at their selected-degree lower endpoints.  The lower
coefficient cone uses the exact distinguished-root gap

  d5-f5 >= sum_{j=0}^4 C(m-j+1,j) C(r-j,5-j).

All arithmetic is sparse integer arithmetic.  The three box variables are
converted to degree-(4,4,4) Bernstein form, and every resulting coefficient
is certified on the complete integer (N,r) tail by positive-coefficient cone
translations.
"""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path

from flint import fmpz_mpoly_ctx

from analyze_rank8_delta0_new_leaf_joint_selected_boundary_bounded_agent import (
    base_polynomial,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta0_new_leaf_mask0_quantitative_gap_tail_exact_agent_20260823.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def sparse_sha256(polynomials) -> str:
    digest = hashlib.sha256()
    for label, polynomial in polynomials:
        digest.update(str(label).encode())
        digest.update(b"\0")
        for monomial, coefficient in sorted(polynomial.to_dict().items()):
            digest.update(",".join(str(int(value)) for value in monomial).encode())
            digest.update(b":")
            digest.update(str(int(coefficient)).encode())
            digest.update(b";")
        digest.update(b"\n")
    return digest.hexdigest().upper()


def nonnegative_coefficients(polynomial) -> tuple[bool, int, int]:
    coefficients = [int(value) for value in polynomial.to_dict().values()]
    if not coefficients:
        return True, 0, 0
    return all(value >= 0 for value in coefficients), len(coefficients), min(coefficients)


def build_cleared_box():
    base = base_polynomial()
    context = fmpz_mpoly_ctx.get(["N", "r", "X", "V", "T"])
    N, r, X, V, T = context.gens()
    m = N - r
    d_selected_den = N**2 - 15 * N + 10
    x_den = (N - 5) * d_selected_den
    x_num = 6 * d_selected_den + 60 * (N - 1) * X
    n_falling_6 = context.constant(1)
    for offset in range(6):
        n_falling_6 *= N - offset

    h120 = context.constant(0)
    for j in range(5):
        term = context.constant(math.comb(5, j))
        for offset in range(j):
            term *= m - j + 1 - offset
        for offset in range(5 - j):
            term *= r - j - offset
        h120 += term
    y_den = x_den * n_falling_6
    y_num_without_v = x_num * n_falling_6 - 6 * h120 * x_den

    f_selected_den = m**2 - 15 * m + 10
    t_den = (m - 5) * f_selected_den
    t_num = 6 * f_selected_den + 60 * (m - 1) * T
    z_num_without_v = y_num_without_v * t_den
    z_den = y_den * t_num

    maxima = (1, 2, 4)
    cleared = context.constant(0)
    for (n_power, x_power, y_power, z_power), coefficient in base.terms():
        term = context.constant(int(coefficient)) * N**n_power
        term *= x_num**x_power * x_den ** (maxima[0] - x_power)
        term *= (y_num_without_v * V) ** y_power
        term *= y_den ** (maxima[1] - y_power)
        term *= (z_num_without_v * V) ** z_power
        term *= z_den ** (maxima[2] - z_power)
        cleared += term
    return cleared, h120


def power_coefficients(cleared):
    coefficient_context = fmpz_mpoly_ctx.get(["N", "r"])
    grouped: dict[tuple[int, int, int], dict[tuple[int, int], int]] = {}
    for monomial, coefficient in cleared.to_dict().items():
        n_power, r_power, x_power, v_power, t_power = monomial
        grouped.setdefault((x_power, v_power, t_power), {})[(n_power, r_power)] = int(
            coefficient
        )
    return coefficient_context, {
        key: coefficient_context.from_dict(value) for key, value in grouped.items()
    }


def bernstein_coefficients(coefficient_context, power):
    # All three degrees are exactly four.  Multiplication by 12^3 clears the
    # only conversion denominators C(4,j).
    out = {}
    for i in range(5):
        for j in range(5):
            for k in range(5):
                value = coefficient_context.constant(0)
                for (a, b, c), coefficient in power.items():
                    if a > i or b > j or c > k:
                        continue
                    weight = (
                        math.comb(i, a)
                        * (12 // math.comb(4, a))
                        * math.comb(j, b)
                        * (12 // math.comb(4, b))
                        * math.comb(k, c)
                        * (12 // math.comb(4, c))
                    )
                    value += coefficient * weight
                out[(i, j, k)] = value
    return out


def audit_tail_cones(coefficients):
    context = next(iter(coefficients.values())).context()
    A, B = context.gens()
    rows = []
    all_pass = True
    for index, coefficient in sorted(coefficients.items()):
        # r=10+a, m=16+b, N=26+a+b.  If a>=14, put
        # a=14+A,b=B.  Otherwise fix a=0,...,13 and put N=40+B.
        large_a = coefficient.compose(40 + A + B, 24 + A)
        large_pass, large_terms, large_min = nonnegative_coefficients(large_a)
        strips = []
        for a0 in range(14):
            strip = coefficient.compose(40 + B, context.constant(10 + a0))
            passed, terms, minimum = nonnegative_coefficients(strip)
            strips.append(
                {"a": a0, "terms": terms, "minimum_coefficient": str(minimum), "pass": passed}
            )
        passed = large_pass and all(row["pass"] for row in strips)
        all_pass &= passed
        rows.append(
            {
                "bernstein_index": list(index),
                "pass": passed,
                "a_at_least_14": {
                    "terms": large_terms,
                    "minimum_coefficient": str(large_min),
                    "pass": large_pass,
                },
                "a_0_through_13": strips,
            }
        )
    return all_pass, rows


def main() -> None:
    cleared, h120 = build_cleared_box()
    coefficient_context, power = power_coefficients(cleared)
    degrees = tuple(max(index[axis] for index in power) for axis in range(3))
    assert degrees == (4, 4, 4)
    bernstein = bernstein_coefficients(coefficient_context, power)
    assert len(bernstein) == 125
    passed, rows = audit_tail_cones(bernstein)
    assert passed
    payload = {
        "schema": "rank8-delta0-new-leaf-mask0-quantitative-gap-tail-v1",
        "status": "PASS_EXACT_DELTA0_NEW_LEAF_MASK0_N40_R10_M16_TAIL",
        "scope": "N=|D|>=40, r=deg_A(v)>=10, m=N-r=|F|>=16, mask0 selected lower c8 and d7 endpoints",
        "exact_box": [
            "6/(N-5)<=x=d5/d6<=6N/(N^2-15N+10)",
            "0<=y=f5/d6<=x-G/binom(N,6)",
            "6/(m-5)<=t=f5/f6<=6m/(m^2-15m+10)",
            "z=f6/d6=y/t",
            "G=sum_{j=0}^4 binom(m-j+1,j)binom(r-j,5-j)",
        ],
        "cleared_power_terms": len(cleared.to_dict()),
        "power_box_degrees": [int(value) for value in degrees],
        "power_coefficient_blocks": len(power),
        "bernstein_coefficients": len(bernstein),
        "sparse_sha256": {
            "cleared_power_polynomial": sparse_sha256([("cleared", cleared)]),
            "power_coefficient_blocks": sparse_sha256(sorted(power.items())),
            "bernstein_coefficient_blocks_scaled_by_12_cubed": sparse_sha256(
                sorted(bernstein.items())
            ),
        },
        "tail_partition": (
            "write r=10+a,m=16+b,N=26+a+b; certify a>=14 after "
            "a=14+A and certify a=0..13 after N=40+B"
        ),
        "tail_audit": rows,
        "120G_polynomial": str(h120),
        "source_sha256": {
            "analyze_rank8_delta0_new_leaf_joint_selected_boundary_bounded_agent.py": sha256(
                HERE / "analyze_rank8_delta0_new_leaf_joint_selected_boundary_bounded_agent.py"
            ),
            "analyze_rank8_delta03_arbitrary_leaf_extension_symbolic_agent.py": sha256(
                HERE / "analyze_rank8_delta03_arbitrary_leaf_extension_symbolic_agent.py"
            ),
        },
        "proof_boundary": (
            "This seals only mask0 and only N>=40,r>=10,m>=16.  The finite "
            "26<=N<=39 cells, r<=9, m<=15, masks1..3, q=v, Delta1..3, "
            "connected Q8, and Problem 993 remain open."
        ),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("POWER_TERMS", payload["cleared_power_terms"])
    print("BERNSTEIN", payload["bernstein_coefficients"])
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
