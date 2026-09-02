"""Exact audit of the C=D=0 degeneracy in the second-append quartic.

The companion verifier derives the circle-factor equations

    E1(X)=C+D X=0,
    E2(X)=4 c4 rho^2 X^2+2 c3 rho^2 X
          +(rho^2 c2-c0-rho^4 c4)=0.

When C=D=0, the quartic is reciprocal with respect to |z|=rho and E1 no
longer determines X.  Put q=c2+2 rho^2 c4.  On C=D=0 this program proves

    c3 <= 0,
    c3^2 >= 16 rho^2 c4^2,
    q >= 0,
    q^2 >= 4 rho^2 c3^2.

For 0<p,t<1, c4=16(1-p)(1-t)>0.  Hence c3/c4<=-4rho, while
q/c4+2(c3/c4)rho>=0.  The normalized E2 is decreasing throughout
[-rho,rho] and is nonnegative at rho, so it has no zero with |X|<rho.
Thus the degenerate locus cannot contain a nonreal target-circle pair.

Every leaf certificate is exact: for each target T it finds rational
lambda,mu such that T-lambda*C-mu*D has nonnegative Bernstein controls.
SciPy is used only to propose candidates; acceptance is by integer/Fraction
arithmetic.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import time
from collections import Counter
from dataclasses import dataclass
from fractions import Fraction
from pathlib import Path

import numpy as np
import sympy as sp
from scipy.optimize import linprog

from certify_pf_length3_repeated_branch_core import integer_power_to_bernstein_reduced
from certify_pf_length3_repeated_positive_root_orientation import elevate_tensor_to_shape
from certify_pf_length3_uniform_inner_orientation import midpoint_split_exact


HERE = Path(__file__).resolve().parent
DEFAULT_OUTPUT = HERE / "window_one_prior_factor_circle_degeneracy_exact_20260809.json"
TARGETS = ("minus_c3", "derivative_margin", "q_positive", "endpoint_margin")


@dataclass
class Cell:
    controls: dict[str, np.ndarray]
    depth: tuple[int, int, int, int, int]
    address: str
    box: tuple[tuple[Fraction, Fraction], ...]


def divide_common_gcd(array: np.ndarray) -> np.ndarray:
    common = 0
    for value in array.flat:
        common = math.gcd(common, abs(int(value)))
        if common == 1:
            return array
    if common <= 1:
        return array
    result = np.empty_like(array)
    for index, value in enumerate(array.flat):
        result.flat[index] = int(value) // common
    return result


def polynomial_to_controls(poly: sp.Poly) -> tuple[np.ndarray, dict]:
    degrees = tuple(poly.degree(variable) for variable in poly.gens)
    power = np.zeros(tuple(degree + 1 for degree in degrees), dtype=object)
    denominators = [coefficient.q for _, coefficient in poly.terms()]
    common = math.lcm(*map(int, denominators)) if denominators else 1
    for monomial, coefficient in poly.terms():
        power[monomial] = int(coefficient * common)
    power = divide_common_gcd(power)
    return integer_power_to_bernstein_reduced(power), {
        "degrees": list(degrees),
        "terms": len(poly.terms()),
        "clearing_denominator": common,
    }


def project_with_positive_denominator(
    expression: sp.Expr,
    L: sp.Symbol,
    a: sp.Symbol,
) -> tuple[sp.Expr, str]:
    projected = sp.cancel(expression.subs(L, sp.Rational(10, 1) / (1 - a)))
    numerator, denominator = projected.as_numer_denom()
    d = sp.Dummy("d", positive=True)
    rewritten = sp.factor(denominator.subs(a, 1 - d))
    coefficient, factors = sp.factor_list(rewritten)
    if coefficient < 0:
        numerator, denominator = -numerator, -denominator
        coefficient = -coefficient
    assert coefficient > 0
    assert all(factor == d and exponent >= 0 for factor, exponent in factors)
    return sp.expand(numerator), str(sp.factor(denominator))


def build_polynomials() -> tuple[dict[str, sp.Poly], dict]:
    a, u, v, p, t = sp.symbols("a u v p t")
    L, z = sp.symbols("L z")
    S, P = u + v, u * v
    rho2 = L * (L + 1) / 16

    def r0(argument: sp.Expr) -> sp.Expr:
        return (
            16 * argument**2
            + 4 * ((L + 3) * S - 4) * argument
            + P * (L + 3) * (L + 2)
        )

    def r1(argument: sp.Expr) -> sp.Expr:
        return argument * r0(argument - 1) - p * (argument + L + 1) * r0(argument)

    c4, c3, c2, c1, c0 = sp.Poly(
        sp.expand(z * r1(z - 1) - t * (z + L) * r1(z)), z
    ).all_coeffs()
    assert sp.factor(c4 - 16 * (1 - p) * (1 - t)) == 0
    C = sp.cancel((rho2 * c1 - rho2**2 * c3) / (L * (L + 1)))
    D = sp.cancel(-2 * (rho2**2 * c4 - c0) / (L * (L + 1)))
    q = sp.factor(c2 + 2 * rho2 * c4)
    expressions = {
        "C": C,
        "D": D,
        "minus_c3": -c3,
        "derivative_margin": sp.factor(c3**2 - 16 * rho2 * c4**2),
        "q_positive": q,
        "endpoint_margin": sp.factor(q**2 - 4 * rho2 * c3**2),
    }
    polynomials: dict[str, sp.Poly] = {}
    denominators: dict[str, str] = {}
    hashes: dict[str, str] = {}
    for name, expression in expressions.items():
        numerator, denominator = project_with_positive_denominator(expression, L, a)
        poly = sp.Poly(numerator, a, u, v, p, t, domain=sp.QQ)
        polynomials[name] = poly
        denominators[name] = denominator
        hashes[name] = hashlib.sha256(str(poly.as_expr()).encode("utf-8")).hexdigest()
        print(f"projected {name}: degrees={poly.degree_list()}, terms={len(poly.terms())}", flush=True)
    return polynomials, {
        "variables": ["a", "u", "v", "p", "t"],
        "compactification": "L=10/(1-a)",
        "domain": "0<=a,u,v,p,t<=1; conclusion used for 0<p,t<1",
        "quartic_leading_coefficient": "16*(1-p)*(1-t)",
        "positive_denominators": denominators,
        "projected_polynomial_sha256": hashes,
    }


def exact_nonnegative(
    target: np.ndarray,
    C: np.ndarray,
    D: np.ndarray,
    lam: Fraction,
    mu: Fraction,
) -> bool:
    common = math.lcm(lam.denominator, mu.denominator)
    li = lam.numerator * (common // lam.denominator)
    mi = mu.numerator * (common // mu.denominator)
    for target_value, c_value, d_value in zip(target.flat, C.flat, D.flat):
        if common * int(target_value) - li * int(c_value) - mi * int(d_value) < 0:
            return False
    return True


def nonnegative_modulo_one(target: np.ndarray, constraint: np.ndarray) -> Fraction | None:
    lower: Fraction | None = None
    upper: Fraction | None = None
    for target_value, constraint_value in zip(target.flat, constraint.flat):
        target_value, constraint_value = int(target_value), int(constraint_value)
        if constraint_value == 0:
            if target_value < 0:
                return None
            continue
        bound = Fraction(target_value, constraint_value)
        if constraint_value > 0:
            if upper is None or bound < upper:
                upper = bound
        elif lower is None or lower < bound:
            lower = bound
    if lower is not None and upper is not None and lower > upper:
        return None
    if lower is None and upper is None:
        return Fraction(0)
    if lower is None:
        return upper
    if upper is None:
        return lower
    return (lower + upper) / 2


def scaled_float(value: int, exponent: int) -> float:
    if value == 0:
        return 0.0
    magnitude = abs(value)
    shift = max(0, magnitude.bit_length() - 53)
    truncated = magnitude >> shift
    result = math.ldexp(float(truncated), shift - exponent)
    return -result if value < 0 else result


def nonnegative_modulo_two(
    target: np.ndarray,
    C: np.ndarray,
    D: np.ndarray,
) -> tuple[bool, str]:
    if min(map(int, target.flat)) >= 0:
        return True, "direct"
    lam = nonnegative_modulo_one(target, C)
    if lam is not None and exact_nonnegative(target, C, D, lam, Fraction(0)):
        return True, "C"
    mu = nonnegative_modulo_one(target, D)
    if mu is not None and exact_nonnegative(target, C, D, Fraction(0), mu):
        return True, "D"

    target_values = list(map(int, target.flat))
    c_values = list(map(int, C.flat))
    d_values = list(map(int, D.flat))
    rows = len(target_values)
    float_A = np.empty((rows, 3), dtype=float)
    float_b = np.empty(rows, dtype=float)
    for index, (tv, cv, dv) in enumerate(zip(target_values, c_values, d_values)):
        exponent = max(abs(tv).bit_length(), abs(cv).bit_length(), abs(dv).bit_length(), 1)
        float_A[index, 0] = scaled_float(cv, exponent)
        float_A[index, 1] = scaled_float(dv, exponent)
        float_A[index, 2] = 1.0
        float_b[index] = scaled_float(tv, exponent)
    proposal = linprog(
        c=np.array([0.0, 0.0, -1.0]),
        A_ub=float_A,
        b_ub=float_b,
        bounds=[(None, None), (None, None), (None, None)],
        method="highs",
        options={"presolve": True},
    )
    if not proposal.success:
        return False, "none"

    lam_float, mu_float = map(float, proposal.x[:2])
    candidates: list[tuple[Fraction, Fraction, str]] = [
        (Fraction(lam_float), Fraction(mu_float), "float_vertex"),
        (
            Fraction(str(lam_float)).limit_denominator(10**12),
            Fraction(str(mu_float)).limit_denominator(10**12),
            "decimal_vertex",
        ),
    ]
    residual = float_b - float_A[:, 0] * lam_float - float_A[:, 1] * mu_float
    active = np.argsort(residual)[: min(18, rows)]
    for position, first in enumerate(active):
        for second in active[position + 1 :]:
            c_first, d_first = c_values[int(first)], d_values[int(first)]
            c_second, d_second = c_values[int(second)], d_values[int(second)]
            determinant = c_first * d_second - c_second * d_first
            if determinant == 0:
                continue
            lam_exact = Fraction(
                target_values[int(first)] * d_second - target_values[int(second)] * d_first,
                determinant,
            )
            mu_exact = Fraction(
                c_first * target_values[int(second)] - c_second * target_values[int(first)],
                determinant,
            )
            candidates.append((lam_exact, mu_exact, "exact_active_pair"))
    for lam_candidate, mu_candidate, method in candidates:
        if exact_nonnegative(target, C, D, lam_candidate, mu_candidate):
            return True, method
    return False, "rounding"


def bounds(array: np.ndarray) -> tuple[int, int]:
    return min(map(int, array.flat)), max(map(int, array.flat))


def leaf_reason(
    controls: dict[str, np.ndarray],
    box: tuple[tuple[Fraction, Fraction], ...],
) -> tuple[str | None, str | None, Counter[str]]:
    a_box, u_box, v_box, p_box, t_box = box
    high_auv = min(a_box[0], u_box[0], v_box[0]) >= Fraction(1, 2)
    chart_a = p_box[1] <= Fraction(1, 2) and t_box[1] <= Fraction(1, 2)
    chart_b = p_box[0] >= Fraction(1, 2) and t_box[1] <= Fraction(1, 8)
    chart_c = p_box[1] <= Fraction(1, 8) and t_box[0] >= Fraction(1, 2)
    if high_auv and (chart_a or chart_b or chart_c):
        # The separately replayed chart identities give C-20D >= k(1-a)
        # with k>0.  Hence C and D cannot both vanish for finite L.
        label = "A" if chart_a else ("B" if chart_b else "C")
        return f"corner_{label}_C_minus_20D_positive", None, Counter()
    for constraint in ("C", "D"):
        low, high = bounds(controls[constraint])
        if low > 0 or high < 0:
            return f"{constraint}_nonzero", None, Counter()
    methods: Counter[str] = Counter()
    for target in TARGETS:
        success, method = nonnegative_modulo_two(
            controls[target], controls["C"], controls["D"]
        )
        if not success:
            return None, target, methods
        methods[f"{target}:{method}"] += 1
    return "all_targets", None, methods


def choose_axis(
    controls: dict[str, np.ndarray],
    depth: tuple[int, ...],
    failed: str | None,
) -> int:
    names = ("C", "D", failed) if failed else ("C", "D")
    scores = []
    for axis in range(5):
        variation = 0
        for name in names:
            if name is None:
                continue
            current = max(abs(int(value)) for value in np.diff(controls[name], axis=axis).flat)
            variation = max(variation, current.bit_length() if current else 0)
        scores.append(variation - depth[axis])
    return max(range(5), key=lambda axis: scores[axis])


def certify(max_cells: int, max_depth: int, progress_every: int) -> dict:
    started = time.monotonic()
    polynomials, derivation = build_polynomials()
    controls: dict[str, np.ndarray] = {}
    polynomial_metadata: dict[str, dict] = {}
    for name, polynomial in polynomials.items():
        controls[name], polynomial_metadata[name] = polynomial_to_controls(polynomial)
    target_shape = tuple(max(array.shape[axis] for array in controls.values()) for axis in range(5))
    for name, array in tuple(controls.items()):
        controls[name] = elevate_tensor_to_shape(array, target_shape, exact=True)

    # Exact corner identity on
    # a,u,v in [1/2,1] and p,t in [0,1/2].  Unit variables A,U,V,pp,tt
    # parametrize those five intervals.  The primitive elevated Bernstein
    # tensors represent 96*(C-20D) and 6*(1-a), respectively.
    a, u, v, p, t = sp.symbols("a u v p t")
    A, U, V, pp, tt = sp.symbols("A U V pp tt")
    chart_substitution = {
        a: (1 + A) / 2,
        u: (1 + U) / 2,
        v: (1 + V) / 2,
        p: pp / 2,
        t: tt / 2,
    }
    corner_expression = sp.Poly(
        sp.expand((polynomials["C"].as_expr() - 20 * polynomials["D"].as_expr()).subs(chart_substitution)),
        A,
        U,
        V,
        pp,
        tt,
        domain=sp.QQ,
    )
    corner_height = sp.Poly(
        sp.expand((1 - a).subs(chart_substitution)), A, U, V, pp, tt, domain=sp.QQ
    )
    corner_controls, _ = polynomial_to_controls(corner_expression)
    height_controls, _ = polynomial_to_controls(corner_height)
    height_controls = elevate_tensor_to_shape(height_controls, corner_controls.shape, exact=True)
    corner_origin = {A: 0, U: 0, V: 0, pp: 0, tt: 0}
    corner_origin_value = sp.Rational(corner_expression.eval(corner_origin))
    height_origin_value = sp.Rational(corner_height.eval(corner_origin))
    corner_scale = Fraction(
        int(corner_controls[(0, 0, 0, 0, 0)]) * int(corner_origin_value.q),
        int(corner_origin_value.p),
    )
    height_scale = Fraction(
        int(height_controls[(0, 0, 0, 0, 0)]) * int(height_origin_value.q),
        int(height_origin_value.p),
    )
    assert corner_scale == 96 and height_scale == 6
    corner_remainder = corner_controls - 4600 * height_controls
    assert min(map(int, corner_remainder.flat)) >= 0
    corner_identity_audit = {
        "A": {
            "chart": "1/2<=a,u,v<=1 and 0<=p,t<=1/2",
            "control_scales": {"C-20D": str(corner_scale), "1-a": str(height_scale)},
            "integer_control_identity": "controls(C-20D)-4600*controls(1-a)>=0",
            "physical_inequality": "C-20D >= (575/2)*(1-a)",
            "minimum_remainder_control": min(map(int, corner_remainder.flat)),
            "maximum_remainder_control": max(map(int, corner_remainder.flat)),
            "zero_remainder_controls": sum(int(value) == 0 for value in corner_remainder.flat),
        }
    }
    for label, p_map, t_map in (
        ("B", (1 + pp) / 2, tt / 8),
        ("C", pp / 8, (1 + tt) / 2),
    ):
        chart_substitution = {
            a: (1 + A) / 2,
            u: (1 + U) / 2,
            v: (1 + V) / 2,
            p: p_map,
            t: t_map,
        }
        chart_target = sp.Poly(
            sp.expand(
                (
                    polynomials["C"].as_expr()
                    - 20 * polynomials["D"].as_expr()
                    - (1 - a)
                ).subs(chart_substitution)
            ),
            A,
            U,
            V,
            pp,
            tt,
            domain=sp.QQ,
        )
        chart_controls, _ = polynomial_to_controls(chart_target)
        assert min(map(int, chart_controls.flat)) >= 0
        corner_identity_audit[label] = {
            "chart": (
                "1/2<=a,u,v<=1, 1/2<=p<=1, 0<=t<=1/8"
                if label == "B"
                else "1/2<=a,u,v<=1, 0<=p<=1/8, 1/2<=t<=1"
            ),
            "physical_inequality": "C-20D >= 1-a",
            "minimum_control": min(map(int, chart_controls.flat)),
            "maximum_control": max(map(int, chart_controls.flat)),
            "zero_controls": sum(int(value) == 0 for value in chart_controls.flat),
        }

    # Seed all 32 half-cubes so the exact corner chart is represented by one
    # inherited flag and all other cells use the general equality certificate.
    seeds: list[tuple[dict[str, np.ndarray], tuple[int, ...], str]] = [
        (controls, tuple(), "")
    ]
    for axis in range(5):
        next_seeds = []
        for seed_controls, bits, address in seeds:
            children = [dict(), dict()]
            for name, array in seed_controls.items():
                children[0][name], children[1][name] = midpoint_split_exact(array, axis)
            next_seeds.append((children[0], bits + (0,), address + f"{axis}L"))
            next_seeds.append((children[1], bits + (1,), address + f"{axis}R"))
        seeds = next_seeds
    stack = []
    for seed_controls, bits, address in seeds:
        seed_box = tuple(
            (Fraction(0), Fraction(1, 2)) if bit == 0 else (Fraction(1, 2), Fraction(1))
            for bit in bits
        )
        stack.append(Cell(seed_controls, (1, 1, 1, 1, 1), address, seed_box))
    reasons: Counter[str] = Counter()
    methods: Counter[str] = Counter()
    deepest = [0, 0, 0, 0, 0]
    unresolved = None
    processed = 0
    while stack:
        cell = stack.pop()
        processed += 1
        if progress_every and processed % progress_every == 0:
            print(
                json.dumps(
                    {
                        "processed": processed,
                        "stack": len(stack),
                        "leaves": sum(reasons.values()),
                        "leaf_reasons": dict(reasons),
                        "deepest": deepest,
                        "elapsed_seconds": round(time.monotonic() - started, 3),
                    }
                ),
                flush=True,
            )
        if processed > max_cells:
            unresolved = {"reason": "max_cells", "address": cell.address, "depth": cell.depth}
            break
        reason, failed, leaf_methods = leaf_reason(cell.controls, cell.box)
        if reason:
            reasons[reason] += 1
            methods.update(leaf_methods)
            continue
        if sum(cell.depth) >= max_depth:
            unresolved = {
                "reason": "max_depth",
                "address": cell.address,
                "depth": cell.depth,
                "failed_target": failed,
            }
            break
        axis = choose_axis(cell.controls, cell.depth, failed)
        children = [dict(), dict()]
        for name, array in cell.controls.items():
            children[0][name], children[1][name] = midpoint_split_exact(array, axis)
        next_depth = list(cell.depth)
        next_depth[axis] += 1
        deepest[axis] = max(deepest[axis], next_depth[axis])
        midpoint = (cell.box[axis][0] + cell.box[axis][1]) / 2
        left_box = list(cell.box)
        right_box = list(cell.box)
        left_box[axis] = (cell.box[axis][0], midpoint)
        right_box[axis] = (midpoint, cell.box[axis][1])
        stack.append(
            Cell(
                children[1],
                tuple(next_depth),
                cell.address + f"{axis}R",
                tuple(right_box),
            )
        )
        stack.append(
            Cell(
                children[0],
                tuple(next_depth),
                cell.address + f"{axis}L",
                tuple(left_box),
            )
        )

    return {
        "status": "PASS_EXACT_SECOND_STAGE_DEGENERACY" if unresolved is None else "INCOMPLETE",
        "claim": (
            "On C=D=0 and L>=10, c3<=0, c3^2>=16*rho^2*c4^2, "
            "q>=0, and q^2>=4*rho^2*c3^2."
        ),
        "consequence": "The degenerate quartic has no nonreal pair on the target circle.",
        "bernstein_tensor_shape": list(target_shape),
        "processed_cells": processed,
        "certified_leaves": sum(reasons.values()),
        "leaf_reasons": dict(reasons),
        "multiplier_methods": dict(methods),
        "deepest": deepest,
        "polynomials": polynomial_metadata,
        "corner_identity_audit": corner_identity_audit,
        "derivation": derivation,
        "unresolved": unresolved,
        "elapsed_seconds": round(time.monotonic() - started, 3),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-cells", type=int, default=50_000)
    parser.add_argument("--max-depth", type=int, default=200)
    parser.add_argument("--progress-every", type=int, default=250)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()
    report = certify(args.max_cells, args.max_depth, args.progress_every)
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
