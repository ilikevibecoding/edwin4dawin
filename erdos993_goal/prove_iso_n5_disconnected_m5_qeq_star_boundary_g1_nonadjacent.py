#!/usr/bin/env python3
"""Exact q=e star-boundary theorem for the open disconnected M5 sums.

For an active rooted tree pair P=T-u, H=T-N[u], let S=N_T(u),
e_P=|E(P)| and q=sum_{v in S} deg_P(v).  On the face q=e_P every edge
of P is incident to S.  Since S is independent and contains exactly one
vertex from each component of P, P is a disjoint union of stars centered
at S.  Writing their centre degrees as m_i>=0 gives

    I(P;x)=prod_i ((1+x)**m_i+x),    I(H;x)=(1+x)**M,
    M=sum_i m_i=e_P.

This replay derives the product coefficients through rank six from the
power sums of the m_i and proves the four previously open left-centered
Psi interval sums (unique sums 12,14,15,16) by a complete multivariate
integer-binomial certificate.  Together with the pinned middle-interval
theorem, all sixteen interval sums are therefore nonnegative on q=e_P.

The result is an exact boundary theorem.  It does not prove the interior
q<e_P, transport an arbitrary common unmarked factor, or prove all M5.
"""

from __future__ import annotations

import hashlib
import itertools
import json
import math
import os
from pathlib import Path

import sympy as sp

from prove_iso_n5_disconnected_m5_middle_interval_g1_nonadjacent import (
    H,
    P,
    interval_cells,
    unique_expressions,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_disconnected_m5_qeq_star_boundary_exact_g1_nonadjacent_20260830.json"
MARKER = "PASS_EXACT_ISO_N5_DISCONNECTED_M5_QEQ_STAR_BOUNDARY_G1_NONADJACENT"
RANK = 6
OPEN_INDICES = (11, 13, 14, 15)
EXPECTED_COUNTS = {
    11: (12, 51),
    13: (19, 95),
    14: (19, 95),
    15: (30, 169),
}
DEPENDENCIES = {
    "derive_iso_n5_disconnected_mark_factorization_g1_nonadjacent.py":
        "E2670AD49B1888880D375199A8B4B15A1FEE502E18B81DCF5D28A44AE406CAD3",
    "prove_iso_n5_disconnected_m5_middle_interval_g1_nonadjacent.py":
        "079C32D829AA91F29B539B869FA57C946BE0DD101AE06E6B5A80A41207AECD31",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def polynomial_hash(polynomial: sp.Poly) -> str:
    payload = "\n".join(
        f"{','.join(map(str, monomial))}:{coefficient}"
        for monomial, coefficient in polynomial.terms()
    ).encode()
    return hashlib.sha256(payload).hexdigest().upper()


def derive_product_coefficients():
    """Derive [x^k] prod_i((1+x)^m_i+x) through k=6."""
    x, m = sp.symbols("x m")
    parameters = sp.symbols(
        "d M " + " ".join(f"S{degree}" for degree in range(2, RANK + 1)),
        integer=True,
        nonnegative=True,
    )
    d, M, *higher = parameters
    power_sums = {0: d, 1: M} | {
        degree: higher[degree - 2] for degree in range(2, RANK + 1)
    }
    factor = sp.expand_func(sum(
        sp.binomial(m, degree) * x**degree for degree in range(RANK + 1)
    ) + x)
    log_factor = sp.series(sp.log(factor), x, 0, RANK + 1).removeO().expand()

    def sum_over_centres(expression):
        polynomial = sp.Poly(sp.expand(expression), m)
        return sp.expand(sum(
            coefficient * power_sums[exponent[0]]
            for exponent, coefficient in polynomial.terms()
        ))

    log_product = sum(
        sum_over_centres(log_factor.coeff(x, degree)) * x**degree
        for degree in range(1, RANK + 1)
    )
    product = sp.series(sp.exp(log_product), x, 0, RANK + 1).removeO().expand()
    coefficients = tuple(
        sp.expand(product.coeff(x, degree)) for degree in range(RANK + 1)
    )
    assert coefficients[0] == 1
    assert coefficients[1] == d + M
    return parameters, coefficients


def difference_at_zero(poly, first, second, v, t):
    out = sp.expand(poly)
    for _ in range(first):
        out = sp.expand(out.subs(v, v + 1) - out)
    for _ in range(second):
        out = sp.expand(out.subs(t, t + 1) - out)
    return sp.expand(out.subs({v: 0, t: 0}))


def product_binomial_certificate(expression, parameters, unique_index):
    """Prove one twice-scaled margin in the product-binomial basis."""
    d, M, *higher = parameters
    t, u, v = sp.symbols("t u v", integer=True, nonnegative=True)
    positive_centres = u + 1

    # The four margins have total y-degree at most six.  Seven placeholders
    # therefore capture every stable symmetric coefficient, including its
    # dependence on the number s=u+1 of positive-degree centres.
    y = sp.symbols("y0:7", integer=True, nonnegative=True)
    y_power_sums = {
        degree: sum(value**degree for value in y)
        for degree in range(1, RANK + 1)
    }
    substitutions = {
        d: positive_centres + t,
        M: positive_centres + y_power_sums[1],
    }
    for degree in range(2, RANK + 1):
        substitutions[higher[degree - 2]] = positive_centres + sum(
            math.comb(degree, exponent) * y_power_sums[exponent]
            for exponent in range(1, degree + 1)
        )

    # Positive degrees are m_i=1+y_i.  Twice the interval sum has integral
    # scalar coefficients after this substitution.
    substituted = sp.Poly(sp.expand(2 * expression.subs(substitutions)), *y)
    assert substituted.total_degree() <= 6

    # y^p=sum_a a! S(p,a) binom(y,a), applied independently to each y_i.
    product_binomial = {}
    for powers, coefficient in substituted.terms():
        choices = [
            [
                (
                    index,
                    sp.factorial(index)
                    * sp.functions.combinatorial.numbers.stirling(
                        power, index, kind=2
                    ),
                )
                for index in range(power + 1)
            ]
            for power in powers
        ]
        for selected in itertools.product(*choices):
            multiindex = tuple(item[0] for item in selected)
            factor = sp.prod(item[1] for item in selected)
            if factor:
                product_binomial[multiindex] = sp.expand(
                    product_binomial.get(multiindex, 0) + coefficient * factor
                )

    # Symmetry makes the coefficient depend only on the sorted nonzero
    # binomial orders.  Equality across representatives is checked exactly.
    by_partition = {}
    for multiindex, coefficient in product_binomial.items():
        partition = tuple(sorted(
            (entry for entry in multiindex if entry), reverse=True
        ))
        coefficient = sp.expand(coefficient)
        if partition in by_partition:
            assert sp.expand(by_partition[partition] - coefficient) == 0
        else:
            by_partition[partition] = coefficient

    rows = []
    nonzero_count = 0
    for partition in sorted(by_partition, key=lambda item: (sum(item), item)):
        # A term with support ell exists only for s>=ell.  The empty term has
        # s>=1.  Shift to s=support+v before taking the exact (v,t) binomial
        # expansion of its coefficient.
        support = max(1, len(partition))
        coefficient = sp.expand(by_partition[partition].subs(
            u, v + support - 1
        ))
        reconstructed = 0
        basis = []
        for first in range(sp.degree(coefficient, v) + 1):
            for second in range(sp.degree(coefficient, t) + 1):
                value = difference_at_zero(
                    coefficient, first, second, v, t
                )
                assert value.is_Integer
                assert value >= 0
                if value:
                    nonzero_count += 1
                    basis.append({
                        "v_choose": first,
                        "zero_centres_choose": second,
                        "coefficient": int(value),
                    })
                    reconstructed += (
                        value * sp.binomial(v, first) * sp.binomial(t, second)
                    )
        assert sp.expand(sp.expand_func(reconstructed) - coefficient) == 0
        rows.append({
            "product_binomial_partition": list(partition),
            "minimum_positive_degree_centres": support,
            "coefficient_at_s_equals_support_plus_v": str(sp.factor(coefficient)),
            "nonnegative_v_zero_centres_binomial_basis": basis,
        })

    expected_partitions, expected_nonzero = EXPECTED_COUNTS[unique_index]
    assert len(rows) == expected_partitions
    assert nonzero_count == expected_nonzero
    return {
        "unique_expression_index_one_based": unique_index + 1,
        "twice_margin_in_power_sums": str(sp.factor(2 * expression)),
        "placeholder_count": len(y),
        "total_y_degree": substituted.total_degree(),
        "expanded_y_monomials": len(substituted.terms()),
        "expanded_y_polynomial_hash": polynomial_hash(substituted),
        "product_binomial_partition_count": len(rows),
        "nonzero_nonnegative_basis_coefficients": nonzero_count,
        "minimum_basis_coefficient": min(
            entry["coefficient"]
            for row in rows
            for entry in row["nonnegative_v_zero_centres_binomial_basis"]
        ),
        "partitions": rows,
    }


def integer_partitions(total, maximum=None):
    """Nonincreasing positive integer partitions of total."""
    if total == 0:
        yield ()
        return
    if maximum is None or maximum > total:
        maximum = total
    for first in range(maximum, 0, -1):
        for rest in integer_partitions(total - first, first):
            yield (first, *rest)


def convolve(left, right, rank=RANK):
    out = [0] * (rank + 1)
    for i, a in enumerate(left):
        for j, b in enumerate(right):
            if i + j <= rank:
                out[i + j] += a * b
    return out


def literal_audit(parameters, product_coefficients, original_expressions):
    """Independent coefficient multiplication for every boundary type n<=12."""
    derived_evaluator = sp.lambdify(parameters, product_coefficients, modules="math")
    margin_evaluator = sp.lambdify(
        (*P, *H),
        [sp.expand(2 * original_expressions[index]) for index in OPEN_INDICES],
        modules="math",
    )
    cases = 0
    coefficient_checks = 0
    margin_checks = 0
    minima = [None] * len(OPEN_INDICES)
    rows = {}
    for n in range(1, 13):
        local_cases = 0
        local_minima = [None] * len(OPEN_INDICES)
        for centres in range(1, n + 1):
            leaves = n - centres
            for positive in integer_partitions(leaves):
                if len(positive) > centres:
                    continue
                degrees = (*positive, *((0,) * (centres - len(positive))))
                direct = [1] + [0] * RANK
                for degree in degrees:
                    branch = [1, degree + 1] + [
                        math.comb(degree, rank) for rank in range(2, RANK + 1)
                    ]
                    direct = convolve(direct, branch)
                moments = [
                    centres,
                    leaves,
                    *(sum(degree**rank for degree in degrees)
                      for rank in range(2, RANK + 1)),
                ]
                # lambdify evaluates the rational moment formulas in floating
                # arithmetic; every exact value is integral, so round before
                # the literal equality check.
                formula = [int(round(value)) for value in derived_evaluator(*moments)]
                assert formula == direct, (n, degrees, formula, direct)
                coefficient_checks += RANK + 1

                p = (*direct, 0)
                h = tuple(math.comb(leaves, rank) for rank in range(RANK + 1))
                doubled = [int(value) for value in margin_evaluator(*p, *h)]
                assert all(value >= 0 for value in doubled)
                for position, value in enumerate(doubled):
                    minima[position] = (
                        value if minima[position] is None else min(minima[position], value)
                    )
                    local_minima[position] = (
                        value if local_minima[position] is None
                        else min(local_minima[position], value)
                    )
                margin_checks += len(doubled)
                cases += 1
                local_cases += 1
        rows[str(n)] = {
            "order_n": n,
            "degree_partition_cases": local_cases,
            "minimum_twice_open_interval_sums": local_minima,
        }
    return {
        "orders": [1, 12],
        "degree_partition_cases": cases,
        "direct_product_coefficient_checks": coefficient_checks,
        "open_interval_margin_checks": margin_checks,
        "global_minimum_twice_open_interval_sums": minima,
        "rows": rows,
        "role": "literal derivation audit only; the product-binomial certificate is all-order",
    }


def no_positive_degree_centres_certificate(open_expressions, parameters):
    """Handle M=0, when every centre has degree zero and P=(1+x)^t."""
    d, M, *higher = parameters
    t, v = sp.symbols("t v", integer=True, nonnegative=True)
    substitutions = {d: t, M: 0, **{symbol: 0 for symbol in higher}}
    formulas = [sp.factor(2 * expression.subs(substitutions)) for expression in open_expressions]
    expected = [
        t * (t - 1) * (2 * t**2 + 2 * t + 3) / 3,
        t * (t - 1) * (48 * t**3 - 67 * t**2 - 17 * t + 38) / 120,
        t**2 * (t - 1)**3 / 4,
        t**2 * (t - 2) * (t - 1) * (49 * t**2 - 108 * t + 83) / 360,
    ]
    assert all(sp.expand(left - right) == 0 for left, right in zip(formulas, expected))
    cubic_shift = sp.expand((48 * t**3 - 67 * t**2 - 17 * t + 38).subs(t, v + 2))
    assert cubic_shift == 48 * v**3 + 221 * v**2 + 291 * v + 120
    quadratic = 49 * t**2 - 108 * t + 83
    assert sp.discriminant(quadratic, t) == -4604
    return {
        "twice_sum_formulas_in_zero_centres_t": [str(value) for value in formulas],
        "sum14_cubic_at_t_equals_2_plus_v": str(cubic_shift),
        "sum16_quadratic_discriminant": -4604,
        "sign_argument": (
            "Sums 12 and 15 factor visibly.  For sum 14 the only nontrivial "
            "range is t>=2, where the displayed shifted cubic has positive "
            "coefficients.  For sum 16 t=0,1,2 gives zero from the linear "
            "factors, and the remaining quadratic is positive everywhere "
            "because its leading coefficient is positive and its discriminant is -4604."
        ),
    }


def main():
    for name, expected in DEPENDENCIES.items():
        assert sha256(HERE / name) == expected, name

    parameters, product_coefficients = derive_product_coefficients()
    _d, M, *_higher = parameters
    expressions = unique_expressions(interval_cells(P, H))
    assert len(expressions) == 16
    substitutions = {
        P[index]: product_coefficients[index] for index in range(RANK + 1)
    }
    substitutions.update({
        H[index]: sp.expand_func(sp.binomial(M, index))
        for index in range(RANK + 1)
    })
    open_expressions = [
        sp.factor(expressions[index].subs(substitutions))
        for index in OPEN_INDICES
    ]
    assert all(not expression.has(*P, *H) for expression in open_expressions)

    zero_case = no_positive_degree_centres_certificate(open_expressions, parameters)
    symbolic_rows = [
        product_binomial_certificate(expression, parameters, index)
        for index, expression in zip(OPEN_INDICES, open_expressions)
    ]
    literal = literal_audit(parameters, product_coefficients, expressions)

    report = {
        "marker": MARKER,
        "theorem": (
            "For every active rooted pair P=T-u, H=T-N[u] on the boundary "
            "q=sum_{v in N(u)}deg_P(v)=e(P), unique left-centered Psi interval "
            "sums 12,14,15,16 are nonnegative.  With the pinned middle-interval "
            "theorem, all sixteen unique Psi interval sums are nonnegative on this face."
        ),
        "geometry": {
            "active_pair": "S=N_T(u) is independent and contains one vertex in every component of P=T-u; H=P-S",
            "edge_identity": "e(P)=|P|-|S|",
            "boundary": "q=sum_{v in S}deg_P(v)=e(P)",
            "star_conclusion": (
                "S is independent, so q counts without duplication the P-edges "
                "incident to S.  Equality q=e(P) says every P-edge is incident "
                "to the unique S-vertex of its component; each component is a star."
            ),
            "centre_degrees": "m_i>=0, M=sum_i m_i=e(P)",
            "P_polynomial": "prod_i((1+x)^m_i+x)",
            "H_polynomial": "(1+x)^M",
        },
        "derived_product_coefficients": {
            f"p{rank}": str(sp.factor(coefficient))
            for rank, coefficient in enumerate(product_coefficients)
        },
        "open_unique_expression_indices_one_based": [index + 1 for index in OPEN_INDICES],
        "no_positive_degree_centres": zero_case,
        "all_order_product_binomial_certificates": symbolic_rows,
        "literal_audit": literal,
        "pinned_dependencies": DEPENDENCIES,
        "scope": (
            "Exact q=e(P) active-root boundary theorem.  It does not prove the "
            "interior q<e(P), a correction monotone in e(P)-q, arbitrary common "
            "unmarked-component transport, all disconnected M5, M5+3C5, g1, "
            "all N5, or Erdos Problem 993."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(raw, encoding="utf-8", newline="\n")
    os.replace(temporary, OUTPUT)
    print(json.dumps({
        "marker": MARKER,
        "open_unique_sums_closed": len(OPEN_INDICES),
        "partition_counts": [row["product_binomial_partition_count"] for row in symbolic_rows],
        "nonzero_basis_counts": [row["nonzero_nonnegative_basis_coefficients"] for row in symbolic_rows],
        "literal_degree_partition_cases": literal["degree_partition_cases"],
        "source_sha256": report["source_sha256"],
        "report_sha256": sha256(OUTPUT),
    }, indent=2), flush=True)
    print(MARKER, flush=True)


if __name__ == "__main__":
    main()
