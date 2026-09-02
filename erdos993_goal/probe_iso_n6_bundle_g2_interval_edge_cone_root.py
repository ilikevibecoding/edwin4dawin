#!/usr/bin/env python3
"""Interval/edge-budget cone probe for exact rank-six g2 parent modes.

All non-base marked-category coefficients are eliminated with exact forest
intervals.  The remaining A2/B2/W2/Z3 polynomial is tested on the five exact
marked-neighbour edge-budget boxes in tensor Bernstein form.  This is a probe:
it records negative controls instead of asserting a theorem.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from prove_iso_n6_bundle_g4_marked_edge_bernstein_g1_bernstein import (
    marked_geometry_branches,
    substitute_edge_geometry,
    tensor_bernstein,
)


HERE = Path(__file__).resolve().parent
INPUT = HERE / "iso_n6_bundle_g2_exact_parent_modes_probe_root_20260831.json"
OUTPUT = HERE / "iso_n6_bundle_g2_interval_edge_cone_probe_root_20260831.json"
MARKER = "PROBE_EXACT_ISO_N6_BUNDLE_G2_INTERVAL_EDGE_CONE_ROOT"
THRESHOLD = 41


def choose(h, k):
    return sp.prod(h - offset for offset in range(k)) / sp.factorial(k)


def forest_lower(h, k):
    assert k >= 2
    return (
        sp.prod(h - offset for offset in range(k - 1))
        * (h - (k * k - 1))
        / sp.factorial(k)
    )


def shifted_split(expression, n, tail):
    shifted = sp.together(expression.subs(n, tail + THRESHOLD))
    numerator, denominator = sp.fraction(shifted)
    numerator, denominator = sp.expand(numerator), sp.expand(denominator)
    if sp.LC(sp.Poly(denominator, tail)) < 0:
        numerator, denominator = -numerator, -denominator
    assert denominator.free_symbols <= {tail}
    denominator_polynomial = sp.Poly(denominator, tail)
    assert all(value >= 0 for value in denominator_polynomial.all_coeffs())
    generators = tuple(sorted(numerator.free_symbols, key=str))
    polynomial = sp.Poly(numerator, *generators) if generators else None
    terms = polynomial.terms() if polynomial is not None else [((), numerator)]
    positive = sp.Integer(0)
    negative = sp.Integer(0)
    for powers, coefficient in terms:
        monomial = sp.prod(
            generator ** power for generator, power in zip(generators, powers)
        )
        if coefficient >= 0:
            positive += coefficient * monomial
        else:
            negative += -coefficient * monomial
    positive = sp.together(positive / denominator)
    negative = sp.together(negative / denominator)
    p_original = sp.together(positive.subs(tail, n - THRESHOLD))
    q_original = sp.together(negative.subs(tail, n - THRESHOLD))
    check_numerator, _ = sp.fraction(sp.cancel(
        expression - p_original + q_original
    ))
    assert sp.expand(check_numerator) == 0
    return positive, negative, p_original, q_original


def eliminate_interval(
    expression, variable, lower, upper, n, tail, lower_nonnegative=False
):
    def rational_term_count(value):
        numerator, _ = sp.fraction(sp.together(value))
        generators = tuple(sorted(numerator.free_symbols, key=str))
        if not generators:
            return 0 if numerator == 0 else 1
        return len(sp.Poly(sp.expand(numerator), *generators).terms())

    polynomial = sp.Poly(expression, variable)
    result = polynomial.coeff_monomial(1)
    rows = []
    for power in range(1, polynomial.degree() + 1):
        coefficient = polynomial.coeff_monomial(variable ** power)
        p_shift, q_shift, p_original, q_original = shifted_split(
            coefficient, n, tail
        )
        positive_lower = (
            lower ** power if lower_nonnegative else
            lower if power == 1 else sp.Integer(0)
        )
        result += p_original * positive_lower - q_original * upper ** power
        rows.append({
            "power": power,
            "coefficient": str(sp.factor(coefficient)),
            "positive_shifted_terms": rational_term_count(p_shift),
            "negative_shifted_terms": rational_term_count(q_shift),
            "lower": str(sp.factor(positive_lower)),
            "upper": str(sp.factor(upper)),
        })
    result = sp.together(result)
    assert variable not in result.free_symbols
    return result, rows


def bernstein_summary(expression, variables, tail):
    degrees, values = tensor_bernstein(expression, variables)
    scalar_negative = 0
    scalar_total = 0
    minimum = None
    first_negative = []
    stream = hashlib.sha256()
    for index in sorted(values):
        value = values[index]
        stream.update(f"{degrees}|{index}|{sp.srepr(value)};".encode())
        polynomial = sp.Poly(sp.expand(value), tail)
        for coefficient in polynomial.all_coeffs():
            scalar_total += 1
            minimum = coefficient if minimum is None else min(minimum, coefficient)
            if coefficient < 0:
                scalar_negative += 1
                if len(first_negative) < 12:
                    first_negative.append({
                        "index": list(index), "value": str(value),
                        "negative_coefficient": str(coefficient),
                    })
    return {
        "variables": list(map(str, variables)),
        "degree_profile": list(degrees),
        "bernstein_controls": len(values),
        "tail_scalar_coefficients": scalar_total,
        "negative_tail_scalar_coefficients": scalar_negative,
        "minimum_tail_scalar_coefficient": str(minimum),
        "first_negative": first_negative,
        "ordered_stream_sha256": stream.hexdigest().upper(),
    }


def main() -> None:
    source = json.loads(INPUT.read_text(encoding="utf-8"))
    assert source["marker"] == "PROBE_EXACT_ISO_N6_BUNDLE_G2_PARENT_MODES_ROOT"
    symbols = {"n": sp.Symbol("n", nonnegative=True)}
    for family in "WABZ":
        for rank in range(2, 8):
            symbols[f"{family}{rank}"] = sp.Symbol(f"{family}{rank}", nonnegative=True)
    n = symbols["n"]
    tail = sp.Symbol("t", nonnegative=True)
    m = n - 2
    edge_cap = choose(m, 2) - symbols["W2"]

    def shared_edge_lower(h, k):
        # Every category graph is induced inside W and therefore has at most
        # edge_cap edges.  Each bad k-set containing a fixed edge injects into
        # a (k-2)-subset of its h vertices; choose(h,k-2) is a globally safe
        # polynomial upper bound, including the small-h integer cases.
        return choose(h, k) - edge_cap * choose(h, k - 2)

    def inherited_edge_upper(h, k):
        # Removing m-h vertices deletes at most m(m-h) W-edges, hence the
        # induced category retains at least edge_cap-m(m-h) edges.  A bad
        # k-set is counted at most k-1 times.  The factor below is a globally
        # safe lower bound for binom(h-2,k-2)/(k-1), exact when h=m.
        retained_edge_lower = edge_cap - m * (m - h)
        extension_lower = k * choose(h, k) / (m * (m - 1))
        return choose(h, k) - retained_edge_lower * extension_lower

    intervals = {}
    for rank in range(3, 8):
        intervals[f"A{rank}"] = (
            shared_edge_lower(symbols["A2"], rank - 1),
            inherited_edge_upper(symbols["A2"], rank - 1),
        )
        intervals[f"B{rank}"] = (
            shared_edge_lower(symbols["B2"], rank - 1),
            inherited_edge_upper(symbols["B2"], rank - 1),
        )
        exact_w_bad_incidence = edge_cap * choose(m - 2, rank - 2)
        intervals[f"W{rank}"] = (
            choose(m, rank) - exact_w_bad_incidence,
            choose(m, rank) - exact_w_bad_incidence / (rank - 1),
        )
    for rank in range(4, 8):
        intervals[f"Z{rank}"] = (
            shared_edge_lower(symbols["Z3"], rank - 2),
            inherited_edge_upper(symbols["Z3"], rank - 2),
        )

    # W is a forest, hence e(W)<=m-1.  At n>=41 these lower bounds are
    # coefficientwise positive for every W rank used below, so positive powers
    # may retain lower**power rather than falling back to zero.
    for rank in range(3, 5):
        coarse_w_lower = sp.expand(
            choose(m, rank) - (m - 1) * choose(m, rank - 2)
        )
        shifted_coarse = sp.Poly(
            sp.expand(coarse_w_lower.subs(n, tail + THRESHOLD)), tail
        )
        assert all(coefficient >= 0 for coefficient in shifted_coarse.coeffs())

    box_a, box_b, box_c, box_d = sp.symbols("a b c d", nonnegative=True)
    modes = {}
    for mode in ("no_parent", "endpoint_u", "endpoint_v"):
        current = sp.expand(sp.sympify(
            source["modes"][mode]["expression"], locals=symbols
        ))
        sequence = []
        for rank in range(7, 2, -1):
            labels = [f"A{rank}", f"B{rank}", f"W{rank}"]
            if rank >= 4:
                labels.append(f"Z{rank}")
            for label in labels:
                lower, upper = intervals[label]
                current, rows = eliminate_interval(
                    current, symbols[label], lower, upper, n, tail,
                    lower_nonnegative=label.startswith("W"),
                )
                sequence.append({"variable": label, "payments": rows})
        assert current.free_symbols <= {
            n, symbols["A2"], symbols["B2"], symbols["W2"], symbols["Z3"]
        }
        branch_rows = []
        for branch in marked_geometry_branches(
            tail + THRESHOLD - 2, box_a, box_b, box_c, box_d
        ):
            label, variables, value = substitute_edge_geometry(
                current, n, tail + THRESHOLD, branch
            )
            value = sp.together(value)
            value_numerator, value_denominator = sp.fraction(value)
            value_numerator = sp.expand(value_numerator)
            value_denominator = sp.expand(value_denominator)
            if sp.LC(sp.Poly(value_denominator, tail)) < 0:
                value_numerator, value_denominator = -value_numerator, -value_denominator
            assert value_denominator.free_symbols <= {tail}
            assert all(
                coefficient >= 0
                for coefficient in sp.Poly(value_denominator, tail).all_coeffs()
            )
            summary = bernstein_summary(value_numerator, variables, tail)
            summary["cleared_positive_denominator"] = str(sp.factor(value_denominator))
            branch_rows.append({
                "geometry": label,
                "summary": summary,
            })
        modes[mode] = {
            "elimination_sequence": sequence,
            "edge_residual": str(sp.factor(current)),
            "branches": branch_rows,
            "total_negative_tail_coefficients": sum(
                row["summary"]["negative_tail_scalar_coefficients"]
                for row in branch_rows
            ),
        }

    report = {
        "marker": MARKER,
        "threshold": THRESHOLD,
        "forest_interval": {
            "upper": (
                "For W, i_k<=binom(m,k)-e(W)binom(m-2,k-2)/(k-1); "
                "for induced A/B/Z categories, inherited-edge incidence gives "
                "the displayed rational upper interval."
            ),
            "lower": "i_k(F)>=binom(h,k)-e(W)*binom(h,k-2)",
            "proof": (
                "Each A/B/Z/W category graph is induced inside W and has at "
                "most e(W) edges. Union-bound non-independent k-sets by their "
                "first edge; binom(h,k-2) is at least the number of ways to "
                "extend that edge and is polynomially safe at small h. For W, "
                "the exact bad-set incidence sum is e*binom(m-2,k-2), while a "
                "bad k-set in a forest contains at most k-1 edges; division by "
                "k-1 therefore gives the stated rigorous upper bound."
                " Removing m-h vertices deletes at most m(m-h) edges, and "
                "k*binom(h,k)/(m(m-1)) is a safe lower polynomial for the "
                "per-edge extension factor used in the A/B/Z upper bounds."
            ),
        },
        "modes": modes,
        "status": "diagnostic interval/edge cone; theorem only if every negative count is zero",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "threshold": THRESHOLD,
        "mode_negative_counts": {
            key: row["total_negative_tail_coefficients"] for key, row in modes.items()
        },
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
