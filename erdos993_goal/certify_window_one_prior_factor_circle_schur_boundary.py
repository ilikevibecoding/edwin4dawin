"""Exact Bernstein certificate for the one-prior-factor circle boundary.

This is the quartic (second negative append) analogue of
``certify_window_base_circle_schur_boundary.py``.  For L >= 10 and
0 <= u,v,p,t <= 1, define

    R0(z) = 16 z^2 + 4 ((L+3)(u+v)-4) z
            + uv(L+3)(L+2),
    R1(z) = z R0(z-1) - p(z+L+1)R0(z),
    Q(z)  = z R1(z-1) - t(z+L)R1(z),
    rho^2 = L(L+1)/16.

Write Q=sum(c_j z^j), with c4 first.  If Q has a conjugate pair on
|z|=rho, factor it as

    Q/c4 = (z^2-2Xz+rho^2)(z^2-Az+B).

Coefficient matching gives a linear equation E1=C+D*X=0 and a quadratic
equation E2=0.  Their resultant is N.  When D is nonzero, E1 fixes X and

    W = C^2-rho^2 D^2 = D^2(X^2-rho^2).

Thus a nonreal circle pair would require N=0 and W<0.  This program uses
exact integer Bernstein arithmetic on the compact five-cube obtained from
L=10/(1-a).  Cells are discharged either by the N/W implication, by an exact
off-locus monotonicity test showing E2 has no target-disk root, or by an exact
companion certificate.  A separately generated exact companion report handles
the simultaneous degeneracy C=D=0.
"""

from __future__ import annotations

import argparse
import hashlib
import itertools
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

from certify_pf_length3_repeated_branch_core import (
    integer_power_to_bernstein_reduced,
)
from certify_pf_length3_repeated_positive_root_orientation import (
    elevate_tensor_to_shape,
)
from certify_pf_length3_uniform_inner_orientation import midpoint_split_exact


HERE = Path(__file__).resolve().parent
DEFAULT_OUTPUT = (
    HERE / "window_one_prior_factor_circle_schur_boundary_exact_20260809.json"
)
AFFINE_MULTIPLIER_MIN_DEPTH = 220


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


def polynomial_to_power_array(poly: sp.Poly) -> tuple[np.ndarray, dict]:
    degrees = tuple(poly.degree(variable) for variable in poly.gens)
    result = np.zeros(tuple(degree + 1 for degree in degrees), dtype=object)
    denominators = [coefficient.q for _, coefficient in poly.terms()]
    common = math.lcm(*map(int, denominators)) if denominators else 1
    for monomial, coefficient in poly.terms():
        result[monomial] = int(coefficient * common)
    result = divide_common_gcd(result)
    return result, {
        "degrees": list(degrees),
        "terms": len(poly.terms()),
        "clearing_denominator": common,
    }


def positive_denominator(denominator: sp.Expr, variables: tuple[sp.Symbol, ...]) -> bool:
    """Audit the simple projective denominators used here."""

    projective_variable = variables[0]
    d = sp.Dummy("d", positive=True)
    denominator = sp.factor(denominator.subs(projective_variable, 1 - d))
    coefficient, factors = sp.factor_list(denominator)
    if coefficient <= 0:
        return False
    for factor, exponent in factors:
        if factor != d or exponent < 0:
            return False
    return True


def normalize_projective_denominator(
    numerator: sp.Expr,
    denominator: sp.Expr,
    projective_variable: sp.Symbol,
) -> tuple[sp.Expr, sp.Expr]:
    """Move a constant minus sign so the denominator is positive for a<1."""

    d = sp.Dummy("d", positive=True)
    rewritten = sp.factor(denominator.subs(projective_variable, 1 - d))
    coefficient, _ = sp.factor_list(rewritten)
    if coefficient < 0:
        return -numerator, -denominator
    return numerator, denominator


def build_polynomials() -> tuple[dict[str, sp.Poly], dict]:
    a, u, v, p, t = sp.symbols("a u v p t")
    L, z, X = sp.symbols("L z X")
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

    quartic = sp.Poly(sp.expand(z * r1(z - 1) - t * (z + L) * r1(z)), z)
    c4, c3, c2, c1, c0 = quartic.all_coeffs()
    assert sp.factor(c4 - 16 * (1 - p) * (1 - t)) == 0

    # E1=C+D*X=0 and E2=A2*X^2+A1*X+A0=0.
    C = sp.factor(rho2 * c1 - rho2**2 * c3)
    D = sp.factor(-2 * (rho2**2 * c4 - c0))
    A2 = sp.factor(4 * c4 * rho2)
    A1 = sp.factor(2 * c3 * rho2)
    A0 = sp.factor(rho2 * c2 - c0 - rho2**2 * c4)
    E1 = C + D * X
    E2 = A2 * X**2 + A1 * X + A0
    resultant = sp.factor(A2 * C**2 - A1 * C * D + A0 * D**2)
    assert sp.factor(sp.resultant(E1, E2, X) - resultant) == 0
    W = sp.factor(C**2 - rho2 * D**2)
    q = sp.factor(c2 + 2 * rho2 * c4)
    H_off_locus = sp.factor(2 * rho2 * q - D)
    E2_constant = sp.factor(rho2 * c2 - c0 - rho2**2 * c4)
    off_locus_expressions = {
        "minus_c3": -c3,
        "derivative_margin": sp.factor(c3**2 - 16 * rho2 * c4**2),
        "H_off_locus": H_off_locus,
        "endpoint_off_locus_margin": sp.factor(
            H_off_locus**2 - 16 * rho2**3 * c3**2
        ),
        "E2_constant": E2_constant,
        "E2_constant_margin": sp.factor(
            E2_constant**2 - 4 * rho2**3 * c3**2
        ),
    }
    print("symbolic circle resultant audited", flush=True)

    # Remove only factors that are strictly positive for L>=10.  This reduces
    # the projective degree without changing a zero set or a sign.
    resultant_core = sp.cancel(resultant / (L**3 * (L + 1) ** 3))
    W_core = sp.cancel(W / (L**2 * (L + 1) ** 2))
    assert sp.cancel(resultant - L**3 * (L + 1) ** 3 * resultant_core) == 0
    assert sp.cancel(W - L**2 * (L + 1) ** 2 * W_core) == 0

    d = 1 - a
    projective_L = sp.Rational(10, 1) / d
    projected: dict[str, sp.Poly] = {}
    denominators: dict[str, str] = {}
    hashes: dict[str, str] = {}
    for name, expression in {
        "N": resultant_core,
        "W": W_core,
        "C": C / (L * (L + 1)),
        "D": D / (L * (L + 1)),
        **off_locus_expressions,
    }.items():
        projected_expression = sp.cancel(expression.subs(L, projective_L))
        numerator, denominator = projected_expression.as_numer_denom()
        numerator, denominator = normalize_projective_denominator(
            numerator, denominator, a
        )
        if name in {
            "N",
            "W",
            "minus_c3",
            "derivative_margin",
            "H_off_locus",
            "endpoint_off_locus_margin",
            "E2_constant",
            "E2_constant_margin",
        } and not positive_denominator(
            denominator, (a, u, v, p, t)
        ):
            raise AssertionError(f"unaudited denominator for {name}: {denominator}")
        poly = sp.Poly(sp.expand(numerator), a, u, v, p, t, domain=sp.QQ)
        projected[name] = poly
        denominators[name] = str(denominator)
        hashes[name] = hashlib.sha256(str(poly.as_expr()).encode("utf-8")).hexdigest()
        print(f"projected {name}: degrees={poly.degree_list()}, terms={len(poly.terms())}", flush=True)

    append_swap = {p: t, t: p}
    append_parameter_symmetry = {}
    for name in ("N", "W"):
        difference = sp.expand(
            projected[name].as_expr()
            - projected[name].as_expr().xreplace(append_swap)
        )
        assert difference == 0
        append_parameter_symmetry[name] = "invariant under p<->t"

    A_corner, U_corner, V_corner, P_corner, T_corner = sp.symbols(
        "A_corner U_corner V_corner P_corner T_corner"
    )
    degree_drop_corner_map = {
        a: A_corner,
        u: sp.Rational(7, 8) + U_corner / 8,
        v: sp.Rational(7, 8) + V_corner / 8,
        p: sp.Rational(7, 8) + P_corner / 8,
        t: sp.Rational(7, 8) + T_corner / 8,
    }
    degree_drop_distance = (1 - u) + (1 - v) + (1 - p) + (1 - t)
    degree_drop_guard_polynomial = sp.Poly(
        sp.expand(
            (
                projected["N"].as_expr()
                - (1 - a) * degree_drop_distance
            ).subs(degree_drop_corner_map)
        ),
        A_corner,
        U_corner,
        V_corner,
        P_corner,
        T_corner,
        domain=sp.QQ,
    )
    degree_drop_guard_controls, degree_drop_guard_metadata = controls_for(
        degree_drop_guard_polynomial
    )
    degree_drop_guard_bounds = bounds(degree_drop_guard_controls)
    assert degree_drop_guard_bounds[0] >= 0

    metadata = {
        "variables": ["a", "u", "v", "p", "t"],
        "compactification": "L=10/(1-a)",
        "domain": "0<=a,u,v,p,t<=1",
        "quartic_leading_coefficient": str(sp.factor(c4)),
        "linear_circle_equation": "E1=C+D*X",
        "quadratic_circle_equation": "E2=A2*X^2+A1*X+A0",
        "C": str(C),
        "D": str(D),
        "A2": str(A2),
        "A1": str(A1),
        "A0": str(A0),
        "off_locus_identities": {
            "q": "c2+2*rho^2*c4",
            "H": "2*rho^2*q-D",
            "E2_at_rho": "(H+4*c3*rho^3)/2",
        },
        "off_locus_strict_inequalities": [
            "c3<0",
            "c3^2>16*rho^2*c4^2",
            "H>0",
            "H^2>16*rho^6*c3^2",
        ],
        "direct_E2_positivity_inequalities": [
            "K=rho^2*c2-c0-rho^4*c4>0",
            "K^2>4*rho^6*c3^2",
            "c4>=0",
        ],
        "positive_denominators": denominators,
        "projected_polynomial_sha256": hashes,
        "append_parameter_symmetry": append_parameter_symmetry,
        "all_infinite_degree_drop_corner": {
            "box": "0<=a<=1, 7/8<=u,v,p,t<=1",
            "inequality": (
                "N>=(1-a)*((1-u)+(1-v)+(1-p)+(1-t))"
            ),
            "consequence": (
                "For finite L one has a<1, so N=0 forces u=v=p=t=1; "
                "then c4=16(1-p)(1-t)=0.  Thus there is no N=0 "
                "point in the finite-L, finite-append domain."
            ),
            "polynomial": degree_drop_guard_metadata,
            "minimum_control": degree_drop_guard_bounds[0],
            "maximum_control": degree_drop_guard_bounds[1],
            "polynomial_sha256": hashlib.sha256(
                str(degree_drop_guard_polynomial.as_expr()).encode("utf-8")
            ).hexdigest(),
        },
        "degenerate_locus": "C=D=0 requires a separate audit",
    }
    return projected, metadata


def controls_for(poly: sp.Poly) -> tuple[np.ndarray, dict]:
    power, metadata = polynomial_to_power_array(poly)
    return integer_power_to_bernstein_reduced(power), metadata


def bounds(array: np.ndarray) -> tuple[int, int]:
    return min(map(int, array.flat)), max(map(int, array.flat))


def nonnegative_modulo_constraint(target: np.ndarray, constraint: np.ndarray) -> bool:
    """Find rational lambda with target-lambda*constraint >= 0 coefficientwise."""

    lower: Fraction | None = None
    upper: Fraction | None = None
    for target_value, constraint_value in zip(target.flat, constraint.flat):
        target_value = int(target_value)
        constraint_value = int(constraint_value)
        if constraint_value == 0:
            if target_value < 0:
                return False
            continue
        bound = Fraction(target_value, constraint_value)
        if constraint_value > 0:
            if upper is None or bound < upper:
                upper = bound
        elif lower is None or lower < bound:
            lower = bound
    return lower is None or upper is None or lower <= upper


def scaled_float(value: int, exponent: int) -> float:
    """Convert a large integer to a safely scaled float for LP proposals."""

    if value == 0:
        return 0.0
    magnitude = abs(value)
    shift = max(0, magnitude.bit_length() - 53)
    answer = math.ldexp(float(magnitude >> shift), shift - exponent)
    return -answer if value < 0 else answer


def coordinate_product_controls(array: np.ndarray, axis: int) -> np.ndarray:
    """Controls for a positive scalar multiple of y_axis times a polynomial."""

    moved = np.moveaxis(array, axis, 0)
    result = np.zeros((moved.shape[0] + 1,) + moved.shape[1:], dtype=object)
    for index in range(1, result.shape[0]):
        # If the source degree is n, this represents (n+1)*y*P.  The
        # harmless positive scale is absorbed into the affine multiplier.
        result[index] = index * moved[index - 1]
    return np.moveaxis(result, 0, axis)


def exact_affine_multiplier_verify(
    target: np.ndarray,
    bases: list[np.ndarray],
    coefficients: tuple[Fraction, ...],
) -> bool:
    common = math.lcm(*(value.denominator for value in coefficients))
    integers = [
        value.numerator * (common // value.denominator) for value in coefficients
    ]
    for index in np.ndindex(target.shape):
        remainder = common * int(target[index])
        remainder -= sum(
            coefficient * int(base[index])
            for coefficient, base in zip(integers, bases)
        )
        if remainder < 0:
            return False
    return True


def polynomial_multiplier_nonnegative(
    target: np.ndarray, constraint: np.ndarray, degree: int
) -> tuple[list[str], tuple[Fraction, ...]] | None:
    """Propose and exactly verify W-lambda(y)N>=0 for local lambda."""

    assert degree in (1, 2, 4)
    target_shape = tuple(size + degree for size in target.shape)
    target_elevated = elevate_tensor_to_shape(target, target_shape, exact=True)
    bases = [elevate_tensor_to_shape(constraint, target_shape, exact=True)]
    basis_names = ["1"]
    for axis in range(constraint.ndim):
        bases.append(
            elevate_tensor_to_shape(
                coordinate_product_controls(constraint, axis),
                target_shape,
                exact=True,
            )
        )
        basis_names.append(f"y_{axis}")
    for monomial_degree in range(2, degree + 1):
        for axes in itertools.combinations_with_replacement(
            range(constraint.ndim), monomial_degree
        ):
            product = constraint
            for axis in axes:
                product = coordinate_product_controls(product, axis)
            bases.append(elevate_tensor_to_shape(product, target_shape, exact=True))
            basis_names.append("*".join(f"y_{axis}" for axis in axes))

    rows = list(zip(target_elevated.flat, *(base.flat for base in bases)))
    matrix = np.empty((len(rows), len(bases) + 1), dtype=float)
    right_hand_side = np.empty(len(rows), dtype=float)
    for row_index, row in enumerate(rows):
        integers = tuple(map(int, row))
        exponent = max(max(abs(value).bit_length() for value in integers), 1)
        right_hand_side[row_index] = scaled_float(integers[0], exponent)
        matrix[row_index, :-1] = [
            scaled_float(value, exponent) for value in integers[1:]
        ]
        matrix[row_index, -1] = 1.0
    proposal = linprog(
        c=np.array([0.0] * len(bases) + [-1.0]),
        A_ub=matrix,
        b_ub=right_hand_side,
        bounds=[(None, None)] * (len(bases) + 1),
        method="highs",
        options={"presolve": True},
    )
    if not proposal.success:
        return None
    candidates = (
        tuple(Fraction(float(value)) for value in proposal.x[:-1]),
        tuple(Fraction(str(float(value))) for value in proposal.x[:-1]),
    )
    for candidate in candidates:
        if exact_affine_multiplier_verify(target_elevated, bases, candidate):
            return basis_names, candidate
    return None


def leaf_reason(
    controls: dict[str, np.ndarray],
    box: tuple[tuple[Fraction, Fraction], ...],
    depth: tuple[int, ...],
    max_depth: int,
) -> tuple[str, tuple[list[str], tuple[Fraction, ...]] | None] | None:
    a_box, u_box, v_box, p_box, t_box = box
    if (
        u_box[0] >= Fraction(7, 8)
        and v_box[0] >= Fraction(7, 8)
        and p_box[0] >= Fraction(7, 8)
        and t_box[0] >= Fraction(7, 8)
    ):
        return "all_infinite_degree_drop_open_domain_N_positive", None
    off_locus_names = (
        "minus_c3",
        "derivative_margin",
        "H_off_locus",
        "endpoint_off_locus_margin",
    )
    if all(bounds(controls[name])[0] > 0 for name in off_locus_names):
        return "E2_has_no_root_inside_target_circle", None
    if (
        bounds(controls["E2_constant"])[0] > 0
        and bounds(controls["E2_constant_margin"])[0] > 0
    ):
        return "E2_positive_inside_target_circle", None
    small_root_box = (
        (
            u_box[1] <= Fraction(1, 16)
            and v_box[1] <= Fraction(1, 8)
        )
        or (
            u_box[1] <= Fraction(1, 8)
            and v_box[1] <= Fraction(1, 16)
        )
    )
    separated_append_box = (
        (
            p_box[0] >= Fraction(1, 4)
            and p_box[1] <= Fraction(1, 2)
            and t_box[0] >= Fraction(3, 4)
            and t_box[1] <= Fraction(7, 8)
        )
        or (
            p_box[0] >= Fraction(3, 4)
            and p_box[1] <= Fraction(7, 8)
            and t_box[0] >= Fraction(1, 4)
            and t_box[1] <= Fraction(1, 2)
        )
    )
    if (
        a_box[1] <= Fraction(1, 4)
        and small_root_box
        and separated_append_box
    ):
        return "companion_degenerate_neighborhood_certificate", None
    middle_root_box = (
        u_box[0] >= Fraction(1, 16)
        and u_box[1] <= Fraction(1, 8)
        and v_box[0] >= Fraction(1, 16)
        and v_box[1] <= Fraction(1, 8)
    )
    middle_append_box = (
        (
            p_box[0] >= Fraction(3, 8)
            and p_box[1] <= Fraction(1, 2)
            and t_box[0] >= Fraction(3, 4)
            and t_box[1] <= Fraction(7, 8)
        )
        or (
            p_box[0] >= Fraction(3, 4)
            and p_box[1] <= Fraction(7, 8)
            and t_box[0] >= Fraction(3, 8)
            and t_box[1] <= Fraction(1, 2)
        )
    )
    if a_box[1] <= Fraction(1, 4) and middle_root_box and middle_append_box:
        return "companion_degenerate_neighborhood_certificate", None
    degree_drop_append_box = (
        (
            p_box[0] >= Fraction(1, 4)
            and p_box[1] <= Fraction(3, 8)
            and t_box[0] >= Fraction(7, 8)
        )
        or (
            p_box[0] >= Fraction(7, 8)
            and t_box[0] >= Fraction(1, 4)
            and t_box[1] <= Fraction(3, 8)
        )
    )
    if (
        a_box[1] <= Fraction(1, 4)
        and small_root_box
        and degree_drop_append_box
    ):
        return "companion_degenerate_neighborhood_certificate", None
    upper_append_box = (
        (
            p_box[0] >= Fraction(3, 8)
            and p_box[1] <= Fraction(1, 2)
            and t_box[0] >= Fraction(7, 8)
        )
        or (
            p_box[0] >= Fraction(7, 8)
            and t_box[0] >= Fraction(3, 8)
            and t_box[1] <= Fraction(1, 2)
        )
    )
    if (
        u_box[1] <= Fraction(1, 8)
        and v_box[1] <= Fraction(1, 8)
        and upper_append_box
    ):
        return "companion_degenerate_neighborhood_certificate", None
    # The nondegenerate companion is naturally stated in the h-chart
    # h=15*p*t+p+t-1, not merely on the convenient inner rectangle
    # 3/16<=p,t<=1/4.  Since h is increasing in p and t on the unit box,
    # these endpoint tests prove that the whole cell lies in its audited
    # strip -1/4<=h<=7/16.  The companion singles out p as the chart
    # coordinate, so retain its exact 1/8<=p<=1/4 requirement.
    h_box = (
        15 * p_box[0] * t_box[0] + p_box[0] + t_box[0] - 1,
        15 * p_box[1] * t_box[1] + p_box[1] + t_box[1] - 1,
    )
    upper_corner_chart = (
        (
            p_box[0] >= Fraction(1, 8)
            and p_box[1] <= Fraction(1, 4)
        )
        or (
            t_box[0] >= Fraction(1, 8)
            and t_box[1] <= Fraction(1, 4)
        )
    )
    lower_tail_corner_chart = (
        u_box[0] >= Fraction(1, 2)
        and v_box[0] >= Fraction(1, 2)
        and (
            (p_box[0] >= 0 and p_box[1] <= Fraction(1, 8))
            or (t_box[0] >= 0 and t_box[1] <= Fraction(1, 8))
        )
    )
    if (
        a_box[0] >= Fraction(7, 8)
        and h_box[0] >= Fraction(-1, 4)
        and h_box[1] <= Fraction(7, 16)
        and (upper_corner_chart or lower_tail_corner_chart)
    ):
        return "companion_nondegenerate_corner_certificate", None
    low, high = bounds(controls["N"])
    if low > 0:
        return "N>0", None
    if high < 0:
        return "N<0", None
    if nonnegative_modulo_constraint(controls["W"], controls["N_for_W"]):
        return "W>=0_on_N=0", None
    if sum(depth) >= min(max_depth, AFFINE_MULTIPLIER_MIN_DEPTH):
        affine = polynomial_multiplier_nonnegative(
            controls["W"], controls["N_for_W"], degree=1
        )
        if affine is not None:
            return "W>=0_on_N=0_affine_multiplier", affine
    if sum(depth) >= max_depth:
        quadratic = polynomial_multiplier_nonnegative(
            controls["W"], controls["N_for_W"], degree=2
        )
        if quadratic is not None:
            return "W>=0_on_N=0_quadratic_multiplier", quadratic
        quartic = polynomial_multiplier_nonnegative(
            controls["W"], controls["N_for_W"], degree=4
        )
        if quartic is not None:
            return "W>=0_on_N=0_quartic_multiplier", quartic
    return None


def choose_axis(controls: dict[str, np.ndarray], depth: tuple[int, ...]) -> int:
    target = controls["N"]
    low, high = bounds(target)
    if not (low <= 0 <= high):
        target = controls["W"]
    scores = []
    for axis in range(target.ndim):
        variation = max(abs(int(value)) for value in np.diff(target, axis=axis).flat)
        scores.append((variation.bit_length() if variation else -1) - depth[axis])
    return max(range(target.ndim), key=lambda axis: scores[axis])


def certify(max_cells: int, max_depth: int, progress_every: int) -> dict:
    started = time.monotonic()
    companion_requirements = {
        HERE / "window_one_prior_factor_circle_nondegenerate_corner_exact_20260809.json": (
            "PASS_EXACT_NONDEGENERATE_SECOND_STAGE_CORNER"
        ),
        HERE
        / "window_one_prior_factor_circle_degenerate_neighborhood_exact_20260809.json": (
            "PASS_EXACT_SECOND_STAGE_DEGENERATE_NEIGHBORHOOD"
        ),
        HERE / "window_one_prior_factor_circle_degeneracy_exact_20260809.json": (
            "PASS_EXACT_SECOND_STAGE_DEGENERACY"
        ),
    }
    for path, required_status in companion_requirements.items():
        companion_report = json.loads(path.read_text(encoding="utf-8"))
        if companion_report.get("status") != required_status:
            raise AssertionError(
                f"companion certificate {path.name} does not have {required_status}"
            )
    polynomials, derivation = build_polynomials()
    arrays: dict[str, np.ndarray] = {}
    polynomial_metadata: dict[str, dict] = {}
    for name in (
        "N",
        "W",
        "minus_c3",
        "derivative_margin",
        "H_off_locus",
        "endpoint_off_locus_margin",
        "E2_constant",
        "E2_constant_margin",
    ):
        arrays[name], polynomial_metadata[name] = controls_for(polynomials[name])
    target_shape = tuple(max(a, b) for a, b in zip(arrays["N"].shape, arrays["W"].shape))
    arrays["N"] = elevate_tensor_to_shape(arrays["N"], target_shape, exact=True)
    arrays["W"] = elevate_tensor_to_shape(arrays["W"], target_shape, exact=True)
    arrays["N_for_W"] = arrays["N"].copy()

    initial_box = tuple((Fraction(0), Fraction(1)) for _ in range(5))
    stack = [Cell(arrays, (0, 0, 0, 0, 0), "", initial_box)]
    reasons: Counter[str] = Counter()
    multiplier_certificates = []
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
                        "current_address": cell.address,
                        "current_box": [
                            [str(lower), str(upper)]
                            for lower, upper in cell.box
                        ],
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
        reason_record = leaf_reason(cell.controls, cell.box, cell.depth, max_depth)
        if reason_record:
            reason, multiplier = reason_record
            reasons[reason] += 1
            if multiplier is not None:
                basis_names, coefficients = multiplier
                multiplier_certificates.append(
                    {
                        "address": cell.address,
                        "depth": list(cell.depth),
                        "box": [
                            [str(lower), str(upper)] for lower, upper in cell.box
                        ],
                        "lambda_basis": basis_names,
                        "lambda_coefficients": [str(value) for value in coefficients],
                        "verification": (
                            "All controls of W-lambda(y)N are nonnegative after "
                            "exact rational degree elevation."
                        ),
                    }
                )
            continue
        if sum(cell.depth) >= max_depth:
            unresolved = {"reason": "max_depth", "address": cell.address, "depth": cell.depth}
            break
        axis = choose_axis(cell.controls, cell.depth)
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
        "status": (
            "PASS_EXACT_ONE_PRIOR_FACTOR_SECOND_APPEND_CIRCLE_BOUND"
            if unresolved is None
            else "INCOMPLETE"
        ),
        "claim": (
            "For finite L>=10 and finite append parameters 0<=p,t<1, every "
            "nondegenerate parameter cell is discharged either by excluding "
            "N=0, proving W>=0 on N=0, proving E2 has no root in the target "
            "disk, or invoking an exact companion certificate."
        ),
        "consequence": (
            "Together with the validated C=D=0 companion certificate, the "
            "second-append quartic in the finite-parameter domain has no "
            "nonreal pair on the target circle."
        ),
        "bernstein_tensor_shape": list(target_shape),
        "processed_cells": processed,
        "certified_leaves": sum(reasons.values()),
        "leaf_reasons": dict(reasons),
        "polynomial_multiplier_certificates": multiplier_certificates,
        "affine_multiplier_minimum_total_depth": AFFINE_MULTIPLIER_MIN_DEPTH,
        "deepest": deepest,
        "polynomials": polynomial_metadata,
        "companion_corner_certificate": {
            "script": "certify_window_one_prior_factor_circle_nondegenerate_corner.py",
            "report": "window_one_prior_factor_circle_nondegenerate_corner_exact_20260809.json",
            "required_status": "PASS_EXACT_NONDEGENERATE_SECOND_STAGE_CORNER",
            "original_parameter_box": (
                "upper chart and p<->t image: 7/8<=a<=1, "
                "0<=u,v<=1, 1/8<=p<=1/4; "
                "lower-tail chart: 7/8<=a<=1, 1/2<=u,v<=1, "
                "0<=p<=1/8; both charts and their images use "
                "-1/4<=15*p*t+p+t-1<=7/16"
            ),
            "orientation_identity": "projected N and W are invariant under p<->t",
        },
        "companion_degenerate_neighborhood_certificate": {
            "script": (
                "certify_window_one_prior_factor_circle_degenerate_neighborhood.py"
            ),
            "report": (
                "window_one_prior_factor_circle_degenerate_neighborhood_exact_20260809.json"
            ),
            "required_status": "PASS_EXACT_SECOND_STAGE_DEGENERATE_NEIGHBORHOOD",
            "original_parameter_box": (
                "The four dyadic boxes and exact symmetric copies recorded in "
                "the companion report"
            ),
        },
        "companion_degeneracy_certificate": {
            "script": "certify_window_one_prior_factor_circle_degeneracy.py",
            "report": "window_one_prior_factor_circle_degeneracy_exact_20260809.json",
            "required_status": "PASS_EXACT_SECOND_STAGE_DEGENERACY",
            "locus": "C=D=0",
        },
        "derivation": derivation,
        "unresolved": unresolved,
        "elapsed_seconds": round(time.monotonic() - started, 3),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-cells", type=int, default=100_000)
    parser.add_argument("--max-depth", type=int, default=220)
    parser.add_argument("--progress-every", type=int, default=500)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()
    report = certify(args.max_cells, args.max_depth, args.progress_every)
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
