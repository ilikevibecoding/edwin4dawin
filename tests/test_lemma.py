"""Tests for the sympy verification of the descent-propagation lemma."""

import random
import subprocess
import sys
from fractions import Fraction
from pathlib import Path

import sympy as sp

from erdos993.checks import descent_propagation_check
from erdos993.lemma import (
    check_sequence,
    exhaustive_integer_check,
    explicit_intervals_hold,
    factored_difference,
    integer_identity_holds,
    lemma_checks,
    lemma_hypotheses,
    random_sequence_check,
    rational_grid_check,
    rational_identity_holds,
    sign_on_interval_holds,
    slack_identity_holds,
    verify_lemma,
)

ROOT = Path(__file__).resolve().parent.parent


def test_verify_lemma():
    assert verify_lemma() is True
    checks = lemma_checks(random_trials=100)
    assert len(checks) == 8 and all(passed for _, passed in checks)


def test_individual_symbolic_checks():
    assert rational_identity_holds()
    assert slack_identity_holds()
    assert integer_identity_holds()
    assert sign_on_interval_holds()
    assert explicit_intervals_hold(max_r=5)
    assert rational_grid_check(max_r=6, steps=12)
    r, x = sp.symbols("r x", positive=True)
    assert sp.cancel(factored_difference() - (1 - x) * (r * x - 1) / x) == 0


def test_verify_lemma_script_prints_pass_lines():
    result = subprocess.run(
        [sys.executable, str(ROOT / "scripts" / "verify_lemma.py")], capture_output=True, text=True, check=True
    )
    lines = result.stdout.splitlines()
    assert sum(line.startswith("PASS:") for line in lines) == 8
    assert not any(line.startswith("FAIL") for line in lines)
    assert lines[-1] == "RESULT: descent-propagation lemma VERIFIED"


def test_identity_is_not_trivially_true():
    r, x = sp.symbols("r x", positive=True)
    wrong = (1 - x) * (r * x + 1) / x
    assert sp.cancel(((r + 1) - r * x - 1 / x) - wrong) != 0


def test_real_inequality_at_rational_points():
    for r in range(1, 12):
        for k in range(0, 41):
            x = Fraction(1, r) + Fraction(k, 40) * (1 - Fraction(1, r))
            assert r * x + 1 / x <= r + 1
        for x in (Fraction(1, r) - Fraction(1, 1000), 1 + Fraction(1, 1000)):
            assert r * x + 1 / x > r + 1


def test_integer_checks_are_non_vacuous_and_clean():
    applications, violations = exhaustive_integer_check(max_r=4, max_value=15)
    assert applications > 0 and violations == 0
    applications, violations = random_sequence_check(trials=400, seed=1)
    assert applications > 0 and violations == 0


def test_lemma_module_agrees_with_checks_module():
    rng = random.Random(3)
    for _ in range(500):
        seq = [rng.randint(1, 40) for _ in range(rng.randint(3, 9))]
        applications, violations = check_sequence(seq)
        report = descent_propagation_check(seq)
        assert violations == 0 and report.consistent
        assert applications == len(report.applied_at)


def test_hypotheses_helper():
    assert lemma_hypotheses(2, 5, 3, 2)
    assert not lemma_hypotheses(2, 5, 3, 3)
    assert not lemma_hypotheses(2, 5, 2, 0)
    assert not lemma_hypotheses(1, 0, 0, 5)
    assert not lemma_hypotheses(2, 3, 5, 1)
