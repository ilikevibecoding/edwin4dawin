#!/usr/bin/env python3
"""All-order terminal-q3 Newton m=0 theorem for the marked-isolate j=3 lane.

The remainder is an arbitrary no-isolate forest.  The proof retains the exact
joint correlations among its order, component count, branching moment,
maximum excess degree, and connected four-vertex subtrees.  It deliberately
does not use the false independent U-shadow relaxation.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "terminal_q3_m0_marked_isolate_j3_all_order_exact_root_20260831.json"
MARKER = "PASS_EXACT_ALL_ORDER_TERMINAL_Q3_M0_MARKED_ISOLATE_J3_ROOT"

PINNED = {
    "retained_hprev": {
        "source": "prove_terminal_q3_m0_retained_hprev_decomposition_adversary.py",
        "source_sha256": "0982211C9A94754F22F74F29E37392DFA5AC03ABA7BEAAC875A888AC1C6E10DA",
        "report": "terminal_q3_m0_retained_hprev_decomposition_exact_adversary_20260829.json",
        "report_sha256": "CB72F4A59A716BD34BC938C7A09D44E2A150E186003E3EBAE82A8161B8881D11",
        "status": "PASS_EXACT_TERMINAL_M0_RETAINED_HPREV_DECOMPOSITION",
    },
    "three_edge_subtree_bound": {
        "source": "prove_forest_three_edge_subtree_joint_qw_bound_root.py",
        "source_sha256": "DC821C4A48A9AFA65E00C2A7627441FA073494E31DF54FAD8F0710F432D19EF5",
        "report": "forest_three_edge_subtree_joint_qw_bound_exact_root_20260831.json",
        "report_sha256": "3FDD0369DDD96CDBCA42AF02C26893BBE5FF43EC05676B1D7751BFB6532446A2",
        "status": "PASS_EXACT_ALL_ORDER_FOREST_THREE_EDGE_SUBTREE_JOINT_QW_BOUND_ROOT",
    },
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def verify_dependencies() -> dict:
    replay = {}
    for label, pin in PINNED.items():
        source = HERE / pin["source"]
        report = HERE / pin["report"]
        assert sha256(source) == pin["source_sha256"]
        assert sha256(report) == pin["report_sha256"]
        data = json.loads(report.read_text(encoding="utf-8"))
        assert data["status"] == pin["status"]
        assert data["source_sha256"] == pin["source_sha256"]
        replay[label] = {
            "source_sha256": pin["source_sha256"],
            "report_sha256": pin["report_sha256"],
            "status": pin["status"],
        }
    return replay


def choose_polynomial(value, rank: int):
    return sp.prod(value - offset for offset in range(rank)) / sp.factorial(rank)


def bernstein_coefficients(expression, variable):
    polynomial = sp.Poly(sp.cancel(expression), variable)
    degree = polynomial.degree()
    output = []
    for index in range(degree + 1):
        coefficient = sp.cancel(sum(
            polynomial.nth(power)
            * sp.binomial(index, power)
            / sp.binomial(degree, power)
            for power in range(index + 1)
        ))
        output.append(coefficient)
    return output


def polynomial_stats(expression, variables) -> dict:
    polynomial = sp.Poly(sp.expand(expression), *variables)
    coefficients = polynomial.coeffs()
    denominators = [int(value.q) for value in coefficients]
    return {
        "monomials": len(polynomial.terms()),
        "negative_coefficients": sum(value.is_negative is True for value in coefficients),
        "minimum_coefficient": str(min(coefficients)),
        "denominator_lcm": sp.ilcm(*denominators),
    }


def update_stream(stream, label: str, expression, variables) -> None:
    polynomial = sp.Poly(sp.expand(expression), *variables)
    for monomial, coefficient in polynomial.terms():
        stream.update(
            (f"{label}|{','.join(map(str, monomial))}|{coefficient}\n").encode()
        )


def main() -> None:
    dependencies = verify_dependencies()

    # Remainder coordinates.  If it has order N and h components, then
    # Q=N-2h and N=Q+2+2r with r=h-1.  Also W=Q+B.
    q, r, b, tau = sp.symbols("q r b tau", nonnegative=True)
    n = q + 2 + 2 * r
    edges = (n + q) / 2
    wedges = q + b
    c = choose_polynomial

    # Exact low rows of the independence polynomial f and the exactly-one-
    # induced-edge polynomial z for a forest.
    f2 = c(n, 2) - edges
    z3 = edges * (n - 2) - 2 * wedges
    f3 = c(n, 3) - edges * (n - 2) + wedges
    z4 = (
        edges * c(n - 2, 2)
        - 2 * c(edges, 2)
        - 2 * wedges * (n - 4)
        + 3 * tau
    )
    f4 = (
        c(n, 4)
        - edges * c(n - 2, 2)
        + c(edges, 2)
        + wedges * (n - 4)
        - tau
    )

    # An isolated marked root and the mandatory terminal leaf multiply the
    # excluded block by (1+x)^2.  This is the retained-h_(j-1) coefficient at
    # target j=3, specialized without dropping any row.
    p0 = f3 + 2 * f2 + n
    r0 = z4 + 2 * z3 + edges
    c0 = z3 + 2 * f2
    a0 = f2
    determinant = p0 * c0 - a0 * r0
    u3 = f4 + 2 * f3 + f2
    e3 = z4 + 2 * f3
    delta = sp.cancel(a0 * (
        4 * determinant * u3
        + p0 * (4 * f3 * (c0 + r0) - 3 * (p0 + a0) * e3)
    ))

    # The tau dependence is convex with a closed square second derivative.
    second_derivative = sp.factor(sp.diff(delta, tau, 2))
    expected_second = 6 * (n**2 - 2 * n - q)**2
    assert sp.simplify(second_derivative - expected_second) == 0

    # Matching remainder Q=0: every component is K2.  The displayed factor is
    # nonnegative for every r>=0 and supported j=3 begins at r>=2.
    matching = sp.factor(delta.subs({q: 0, b: 0, tau: 0}))
    matching_expected = (
        sp.Rational(16, 9)
        * r**2
        * (r + 1)**4
        * (2 * r**4 + 16 * r**3 + 67 * r**2 + 98 * r + 51)
    )
    assert sp.simplify(matching - matching_expected) == 0

    # Q>0.  Put p=max_v(deg(v)-1), u=Q-p, and a=p-1.  The branching moment
    # lies in C(p,2)<=B<=C(p,2)+(p-1)u/2, so a Bernstein coordinate y in
    # [0,1] parameterizes the entire (slightly relaxed) feasible interval.
    p, a, u, y, s = sp.symbols("p a u y s", nonnegative=True)
    tau_cap = (p + 1) * b / 3 + p * (q - p)
    cone_substitution = {
        q: p + u,
        b: p * (p - 1) / 2 + y * (p - 1) * u / 2,
    }

    minus_derivative_at_cap = sp.cancel(
        -sp.diff(delta, tau)
        .subs(tau, tau_cap)
        .subs(cone_substitution, simultaneous=True)
        .subs(p, a + 1)
    )
    delta_at_cap = sp.cancel(
        delta
        .subs(tau, tau_cap)
        .subs(cone_substitution, simultaneous=True)
        .subs(p, a + 1)
    )

    derivative_bernstein = bernstein_coefficients(minus_derivative_at_cap, y)
    delta_bernstein = bernstein_coefficients(delta_at_cap, y)
    assert len(derivative_bernstein) == 3
    assert len(delta_bernstein) == 4

    derivative_stats = [
        polynomial_stats(coefficient, (a, u, r))
        for coefficient in derivative_bernstein
    ]
    expected_derivative_stats = [
        {"monomials": 165, "negative_coefficients": 0, "minimum_coefficient": "1/12", "denominator_lcm": 24},
        {"monomials": 165, "negative_coefficients": 0, "minimum_coefficient": "1/12", "denominator_lcm": 48},
        {"monomials": 165, "negative_coefficients": 0, "minimum_coefficient": "1/12", "denominator_lcm": 24},
    ]
    assert derivative_stats == expected_derivative_stats

    # Bernstein coefficients 1,2,3 of delta(cap) are coefficientwise positive.
    positive_delta_stats = [
        polynomial_stats(delta_bernstein[index], (a, u, r))
        for index in (1, 2, 3)
    ]
    expected_positive_delta_stats = [
        {"monomials": 349, "negative_coefficients": 0, "minimum_coefficient": "1/216", "denominator_lcm": 432},
        {"monomials": 349, "negative_coefficients": 0, "minimum_coefficient": "1/108", "denominator_lcm": 432},
        {"monomials": 349, "negative_coefficients": 0, "minimum_coefficient": "1/72", "denominator_lcm": 144},
    ]
    assert positive_delta_stats == expected_positive_delta_stats

    # The y=0 face is the only Bernstein coefficient not coefficientwise
    # positive in the raw basis.  It factors as a manifestly positive f2
    # factor times G/144.  G is coefficientwise positive for a=0,1,2 and,
    # after the exact shift a=3+s, for the entire remaining half-line.
    face_factor = (
        a**2 + 4 * a * r + 2 * a * u + 3 * a
        + 4 * r**2 + 4 * r * u + 8 * r
        + u**2 + 3 * u + 2
    )
    face_core = sp.factor(sp.cancel(144 * delta_bernstein[0] / face_factor))
    assert sp.simplify(delta_bernstein[0] - face_factor * face_core / 144) == 0

    face_branches = {
        "a=0": polynomial_stats(face_core.subs(a, 0), (u, r)),
        "a=1": polynomial_stats(face_core.subs(a, 1), (u, r)),
        "a=2": polynomial_stats(face_core.subs(a, 2), (u, r)),
        "a>=3_shift_a=3+s": polynomial_stats(face_core.subs(a, s + 3), (s, u, r)),
    }
    expected_face_branches = {
        "a=0": {"monomials": 44, "negative_coefficients": 0, "minimum_coefficient": "2", "denominator_lcm": 1},
        "a=1": {"monomials": 44, "negative_coefficients": 0, "minimum_coefficient": "2", "denominator_lcm": 1},
        "a=2": {"monomials": 44, "negative_coefficients": 0, "minimum_coefficient": "2", "denominator_lcm": 1},
        "a>=3_shift_a=3+s": {"monomials": 199, "negative_coefficients": 0, "minimum_coefficient": "2", "denominator_lcm": 1},
    }
    assert face_branches == expected_face_branches

    # Hash the complete exact coefficient stream, not just the summary counts.
    stream = hashlib.sha256()
    for index, coefficient in enumerate(derivative_bernstein):
        update_stream(stream, f"minus_derivative_bernstein_{index}", coefficient, (a, u, r))
    for index in (1, 2, 3):
        update_stream(stream, f"delta_cap_bernstein_{index}", delta_bernstein[index], (a, u, r))
    update_stream(stream, "face_a0", face_core.subs(a, 0), (u, r))
    update_stream(stream, "face_a1", face_core.subs(a, 1), (u, r))
    update_stream(stream, "face_a2", face_core.subs(a, 2), (u, r))
    update_stream(stream, "face_age3", face_core.subs(a, s + 3), (s, u, r))

    payload = {
        "status": MARKER,
        "scope": "Terminal-q3 Newton degree m=0, target j=3, isolated marked root, mandatory terminal leaf, and an arbitrary no-isolate forest remainder.",
        "dependencies": dependencies,
        "exact_low_rows": {
            "f2": str(sp.factor(f2)),
            "f3": str(sp.factor(f3)),
            "z3": str(sp.factor(z3)),
            "z4": str(sp.factor(z4)),
            "f4": str(sp.factor(f4)),
        },
        "tau_control": {
            "second_derivative": str(second_derivative),
            "cap": "tau <= (p+1)B/3+p(Q-p)",
            "logic": "delta is convex in tau; its derivative at the cap is nonpositive, so delta is decreasing throughout the feasible interval and is minimized at the cap",
            "minus_derivative_bernstein_stats": derivative_stats,
        },
        "cap_sign": {
            "bernstein_degree": 3,
            "positive_indices_1_2_3": positive_delta_stats,
            "index_0_factor": str(face_factor),
            "index_0_core_branches": face_branches,
        },
        "matching_Q0_factor": str(matching),
        "coefficient_stream_sha256": stream.hexdigest().upper(),
        "coverage_gap_within_scope": None,
        "scope_guard": "This closes only the displayed marked-isolate j=3 terminal-m=0 lane. It does not close j>=4, nonisolated marked roots, the complete terminal payment, unimodality, or Erdos Problem 993.",
        "source_sha256": sha256(Path(__file__)),
    }
    OUTPUT.write_text(
        json.dumps(payload, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
        newline="\n",
    )
    print(json.dumps({
        "status": payload["status"],
        "coverage_gap_within_scope": payload["coverage_gap_within_scope"],
        "coefficient_stream_sha256": payload["coefficient_stream_sha256"],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", payload["source_sha256"])
    print("REPORT_SHA256", sha256(OUTPUT))
    print(MARKER)


if __name__ == "__main__":
    main()
