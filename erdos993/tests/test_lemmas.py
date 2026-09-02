"""pytest coverage for docs/REDUCTION_LEMMA_AND_PROVED_CASES.md.

Two layers:

1. every item of ``scripts/verify_lemmas_symbolic.py`` is run as its own test
   (the script is loaded from its path, so the tests and the CLI cannot drift);
2. independent unit tests that restate the key facts of the note directly
   against ``erdos993lib`` with exact arithmetic (ints / Fraction / sympy).

Run with:  python3 -m pytest tests/test_lemmas.py -q
"""

from __future__ import annotations

import importlib.util
import itertools
import os
import sys
from fractions import Fraction
from math import comb

import pytest
import sympy as sp

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from erdos993lib.checks import analyze, is_unimodal, iso_value, tail_cutoff, wr_slack  # noqa: E402
from erdos993lib.families import caterpillar, double_broom, path, spider, star  # noqa: E402
from erdos993lib.indpoly import indpoly_bruteforce, indpoly_forest  # noqa: E402
from erdos993lib.trees import forest_polys, free_trees, parent_to_edges  # noqa: E402


def _load_script():
    spec = importlib.util.spec_from_file_location(
        "verify_lemmas_symbolic", os.path.join(ROOT, "scripts", "verify_lemmas_symbolic.py")
    )
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


VLS = _load_script()


# ---------------------------------------------------------------------------
# layer 1: the script's items, one test each
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("item,title,fn", VLS.CHECKS, ids=[f"item{c[0]}" for c in VLS.CHECKS])
def test_script_item(item, title, fn):
    check = VLS.run_check(item, title, fn)
    assert check.results, f"[{item}] recorded no sub-checks"
    assert not check.failures, f"[{item}] {title}: {check.failures}"


def test_script_reports_failure_and_nonzero_exit(capsys):
    """A failing sub-check must produce a FAIL line and exit status 1."""

    def broken(c):
        c.expect(1 + 1 == 3, "deliberately false")

    original = VLS.CHECKS
    try:
        VLS.CHECKS = [("X", "injected failure", broken)]
        assert VLS.main([]) == 1
    finally:
        VLS.CHECKS = original
    out = capsys.readouterr().out
    assert "FAIL [X]" in out and "deliberately false" in out and "SOME CHECKS FAILED" in out


def test_script_main_passes_quietly(capsys):
    assert VLS.main(["-q"]) == 0
    out = capsys.readouterr().out
    assert "ALL CHECKS PASSED" in out and "FAIL" not in out


# ---------------------------------------------------------------------------
# layer 2: independent restatements
# ---------------------------------------------------------------------------


def test_reduction_lemma_identity_and_bruteforce():
    r, a, b, c = sp.symbols("r a b c")
    assert sp.expand(r * b**2 - (r + 1) * b * a + a**2 - (r * b - a) * (b - a)) == 0
    Q = r * b**2 + a**2 - (r + 1) * a * c
    assert sp.expand((r + 1) * a * (b - c) - Q - (r * b - a) * (a - b)) == 0
    for rr, A, B, C in itertools.product(range(1, 5), range(1, 13), range(0, 13), range(0, 30)):
        if A <= rr * B and B <= A and rr * B * B + A * A - (rr + 1) * A * C >= 0:
            assert C <= B


def test_ratio_form_is_nonpositive_on_interval():
    # r x + 1/x <= r + 1 on [1/r, 1], with equality exactly at the endpoints, exact rationals
    # (for r = 1 the interval is the single point x = 1, where equality holds)
    for r in range(1, 8):
        for k in range(0, 41):
            x = Fraction(1, r) + (1 - Fraction(1, r)) * Fraction(k, 40)
            value = r * x + 1 / x - (r + 1)
            assert value <= 0
            assert (value == 0) == (r == 1 or k in (0, 40))


def test_conditional_unimodality_theorem_small_domain():
    for alpha in range(1, 6):
        L = tail_cutoff(alpha)
        for rest in itertools.product(range(1, 6), repeat=alpha):
            p = (1,) + rest
            tail = all(p[r] >= p[r + 1] for r in range(L, alpha))
            desc = all(wr_slack(p, r) >= 0 and iso_value(p, r) >= 0 for r in range(1, L) if p[r] <= p[r - 1])
            if tail and desc:
                assert is_unimodal(p), p
                assert max(p) == max(p[: L + 1]), p


def test_non_unimodal_sequence_with_tail_violates_iso():
    p = (1, 5, 4, 5, 1)  # alpha = 4, L = 3, TAIL holds (5 >= 1), not unimodal
    assert not is_unimodal(p)
    assert tail_cutoff(4) == 3 and p[3] >= p[4]
    rep = analyze(p)  # must not raise: hypotheses do not all hold
    assert rep["iso_failures_prefix"] == [2] and iso_value(p, 2) == -18


@pytest.mark.parametrize(
    "graph",
    [star(k) for k in range(1, 12)]
    + [path(k) for k in range(1, 12)]
    + [spider([1, 2, 3]), spider([2, 2, 2, 2]), double_broom(3, 4, 2), caterpillar([2, 0, 3, 1])],
    ids=lambda g: f"n{g[0]}e{len(g[1])}",
)
def test_low_order_coefficients_named_families(graph):
    n, edges = graph
    p = indpoly_forest(n, edges)
    if n <= 16:
        assert indpoly_bruteforce(n, edges) == p
    e, S, T, P = VLS.forest_invariants(n, edges)
    assert [VLS.coef(p, k) for k in range(4)] == [1, n, comb(n, 2) - e, comb(n, 3) - e * (n - 2) + S]
    assert VLS.coef(p, 4) == VLS.formula_p4(n, e, S, T, P)


def test_iso1_iso2_wr_on_all_trees_up_to_11():
    for n in range(1, 12):
        for parent in free_trees(n):
            edges = parent_to_edges(parent)
            p = indpoly_forest(n, edges)
            e, S, _T, _P = VLS.forest_invariants(n, edges)
            assert VLS.Q(p, 1) == n + 1 + 2 * e > 0
            assert VLS.Q(p, 2) >= VLS.g_int(n, e) >= (n - 1) * (n - 2) + n * n >= 1
            assert wr_slack(p, 1) >= 0
            if n >= 4:
                assert wr_slack(p, 2) >= 0
            else:
                assert tail_cutoff(len(p) - 1) - 1 < 2  # r = 2 not in the prefix


def test_iso2_on_all_forests_up_to_11_star_is_the_unique_minimiser():
    cache = {}
    for n in range(1, 12):
        values = []
        for sizes, _idxs, p in forest_polys(n, cache):
            e = n - len(sizes)
            q2 = VLS.Q(p, 2)
            assert q2 >= VLS.g_int(n, e) > 0
            values.append(q2)
        assert min(values) == (n - 1) * (n - 2) + n * n
        assert values.count(min(values)) == 1


def test_star_margin_exact_and_tends_to_zero():
    prev = None
    for n in range(3, 60):
        p = indpoly_forest(*star(n))
        margin = Fraction(VLS.Q(p, 2), p[1] * p[2])
        assert margin == Fraction(2, n) + Fraction(2 * n, (n - 1) * (n - 2))
        if prev is not None:
            assert margin < prev
        prev = margin
    assert prev < Fraction(1, 10)


def test_wr2_fails_for_p3_but_is_not_required():
    p = indpoly_forest(*path(3))
    assert p == [1, 3, 1] and wr_slack(p, 2) < 0
    rep = analyze(p)
    assert rep["L"] == 1 and rep["wr_failures_prefix"] == [] and rep["unimodal"]


def test_newton_chain_on_a_real_rooted_example():
    x = sp.symbols("x")
    p = indpoly_forest(*path(10))  # claw-free, hence real-rooted (Chudnovsky-Seymour)
    alpha = len(p) - 1
    assert len(sp.Poly(list(reversed(p)), x).real_roots()) == alpha
    for r in range(1, alpha):
        newton_rhs = Fraction(p[r - 1] * p[r + 1]) * (1 + Fraction(1, r)) * (1 + Fraction(1, alpha - r))
        D = Fraction(p[r] ** 2) - newton_rhs
        assert D >= 0
        assert iso_value(p, r) == p[r - 1] ** 2 + r * D + Fraction(p[r - 1] * p[r + 1] * (r + 1), alpha - r)
        assert iso_value(p, r) >= p[r - 1] ** 2 > 0


def test_stars_not_real_rooted_for_m_ge_3():
    x = sp.symbols("x")
    assert sp.discriminant((1 + x) ** 3 + x, x) == -31
    for m in range(3, 9):
        poly = sp.Poly(list(reversed(indpoly_forest(*star(m + 1)))), x)
        assert poly.as_expr().equals(sp.expand((1 + x) ** m + x))
        assert len(poly.real_roots()) < m
    assert sp.discriminant((1 + x) ** 2 + x, x) == 5  # K_{1,2} = P_3 is real-rooted


def test_tail_theorem_is_not_universal_but_holds_for_small_forests():
    assert indpoly_bruteforce(6, [(0, 1), (1, 2), (0, 2), (3, 4), (4, 5), (3, 5)]) == [1, 6, 9]
    cache = {}
    for n in range(1, 11):
        for _sizes, _idxs, p in forest_polys(n, cache):
            a = len(p) - 1
            assert all(p[r] >= p[r + 1] for r in range(tail_cutoff(a), a))


def test_corollary_alpha_at_most_5_unimodal_via_framework():
    """For alpha <= 5 the prefix is r in {1, 2}; WR/ISO there are theorems, TAIL is cited: unimodal."""
    cache = {}
    seen = 0
    for n in range(1, 12):
        for _sizes, _idxs, p in forest_polys(n, cache):
            a = len(p) - 1
            if a <= 5:
                seen += 1
                rep = analyze(p)
                assert rep["L"] <= 3 and rep["wr_iso_tail_hypotheses_hold"] and rep["unimodal"]
    assert seen > 100


def test_crude_iso3_bound_fails_on_stars():
    for m in range(4, 25):
        n = m + 1
        p = indpoly_forest(*star(n))
        e, S, T, P = VLS.forest_invariants(*star(n))
        U4 = comb(n, 4) - e * comb(n - 2, 2) + (n - 3) * S + (comb(e, 2) - S)
        assert VLS.coef(p, 4) == U4 - T - P and T == comb(m, 3) and P == 0
        assert VLS.Q(p, 3) == comb(m, 2) * comb(m + 1, 3) > 0
        assert 3 * VLS.coef(p, 3) ** 2 + VLS.coef(p, 2) ** 2 - 4 * VLS.coef(p, 2) * U4 < 0
