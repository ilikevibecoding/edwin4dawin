#!/usr/bin/env python3
"""Exact algebra for the tuned four-way endpoint completion.

For four derivative types x_1,...,x_4, the multiaffine part of

    (1-lambda*(x_1+...+x_4))*prod_i(1+x_i)

has a coefficient a_s=1-s*lambda on every squarefree monomial of size s.
It is stable, and its differential version preserves stability.  Apply two
copies, one at each reflected path endpoint.  In the balanced one-deletion
grade, all non-full terms occur in complementary pairs.  Reflection symmetry
makes their actions equal, so their aggregate coefficient is

    8*a_1*a_3 + 6*a_2**2.

The two real values lambda=(7+-sqrt(7))/12 kill this contaminant exactly.
The surviving grades then have the normalized weights 1,-2,1.

This proves the local completion/cancellation identity.  It does not by
itself prove that extracting the balanced grade preserves stability.
"""

from __future__ import annotations

import hashlib
import itertools
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
LAM = sp.symbols("lambda", real=True)
X = sp.symbols("x1:5")


def multiaffine_part(poly: sp.Expr, variables: tuple[sp.Symbol, ...]) -> sp.Expr:
    expanded = sp.Poly(sp.expand(poly), *variables)
    answer = sp.S.Zero
    for powers, coefficient in expanded.terms():
        if all(power <= 1 for power in powers):
            answer += coefficient * sp.prod(
                variable**power for variable, power in zip(variables, powers)
            )
    return sp.expand(answer)


def sha256_text(value: sp.Expr) -> str:
    return hashlib.sha256(sp.srepr(sp.expand(value)).encode("utf-8")).hexdigest()


def main() -> None:
    coefficients = [sp.S.One] + [1 - size * LAM for size in range(1, 5)]
    stable_parent = (1 - LAM * sum(X)) * sp.prod(1 + variable for variable in X)
    completion = multiaffine_part(stable_parent, X)
    expected = sp.expand(sum(
        coefficients[size]
        * sum(
            sp.prod(X[index] for index in subset)
            for subset in itertools.combinations(range(4), size)
        )
        for size in range(5)
    ))
    assert sp.expand(completion - expected) == 0

    # In balanced grade (1,1,1,1), the two endpoint subsets are complements.
    balanced_one = sp.expand(sum(
        coefficients[len(subset)] * coefficients[4 - len(subset)]
        for size in range(5)
        for subset in itertools.combinations(range(4), size)
    ))
    full_contribution = sp.expand(2 * coefficients[4])
    contaminant = sp.factor(balanced_one - full_contribution)
    assert sp.expand(contaminant - 2 * (24 * LAM**2 - 28 * LAM + 7)) == 0

    tuning_polynomial = 24 * LAM**2 - 28 * LAM + 7
    roots = sp.solve(tuning_polynomial, LAM)
    assert roots == [sp.Rational(7, 12) - sp.sqrt(7) / 12,
                     sp.sqrt(7) / 12 + sp.Rational(7, 12)]

    root_records = []
    for root in roots:
        a4 = sp.simplify(coefficients[4].subs(LAM, root))
        assert a4.is_negative
        assert sp.simplify(contaminant.subs(LAM, root)) == 0
        assert sp.simplify(balanced_one.subs(LAM, root) - 2 * a4) == 0
        # Scaling the product of the four derivative directions by -1/a4
        # makes a full four-way contraction have coefficient -1.
        scale_product = sp.simplify(-1 / a4)
        normalized = [sp.S.One, sp.simplify(2 * a4 * scale_product),
                      sp.simplify(a4**2 * scale_product**2)]
        assert normalized == [1, -2, 1]
        root_records.append({
            "lambda": str(root),
            "a4": str(a4),
            "positive_direction_scale_product": str(scale_product),
            "normalized_balanced_weights": [str(value) for value in normalized],
        })

    report = {
        "status": "ALL_ORDER_LOCAL_COMPLETION_IDENTITY_PROVED",
        "stable_parent": str(stable_parent),
        "multiaffine_completion": str(completion),
        "coefficient_by_subset_size": [str(value) for value in coefficients],
        "balanced_one_grade": str(sp.factor(balanced_one)),
        "full_only_part": str(full_contribution),
        "partial_contraction_contaminant": str(contaminant),
        "tuning_polynomial": str(tuning_polynomial),
        "roots": root_records,
        "completion_sha256": sha256_text(completion),
        "scope": (
            "The stable local completion and reflected-endpoint cancellation "
            "are exact in every order.  A proof that the required balanced "
            "grade extraction preserves stability on the path/Wishart image "
            "is still required."
        ),
    }
    out = HERE / "tuned_endpoint_relaxed_completion_20260804.json"
    out.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))
    print(out)


if __name__ == "__main__":
    main()
