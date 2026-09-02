"""Tests for the exact sequence checks."""

import random
from fractions import Fraction

import pytest

from erdos993.checks import (
    FrameworkInconsistency,
    L_cutoff,
    descent_conditional_iso_violations,
    descent_propagation_check,
    first_descent,
    first_weak_descent,
    full_report,
    is_log_concave,
    is_unimodal,
    iso_failures,
    iso_holds,
    iso_normalized_slack,
    iso_value,
    iso_values,
    iso_violations,
    log_concavity_breaks,
    mode,
    mode_range,
    tail_check,
    tail_cutoff,
    tail_failures,
    unimodality,
    unimodality_via_framework,
    wr_failures,
    wr_holds,
    wr_violations,
)


def test_tail_cutoff_values():
    expected = {0: 0, 1: 1, 2: 1, 3: 2, 4: 3, 5: 3, 6: 4, 7: 5, 8: 5, 9: 6, 10: 7, 20: 13, 21: 14}
    for alpha, value in expected.items():
        assert tail_cutoff(alpha) == value
    for alpha in range(0, 200):
        assert 3 * tail_cutoff(alpha) >= 2 * alpha - 1 > 3 * (tail_cutoff(alpha) - 1)
    with pytest.raises(ValueError):
        tail_cutoff(-1)
    with pytest.raises(TypeError):
        tail_cutoff(2.0)


def test_is_unimodal_with_ties_and_mode_range():
    assert unimodality([1]).mode_range == (0, 0)
    assert is_unimodal([1, 2, 2, 1]) is True
    assert mode_range([1, 2, 2, 1]) == (1, 2) and mode([1, 2, 2, 1]) == 1
    assert mode_range([1, 2, 3]) == (2, 2) and mode([1, 2, 3]) == 2
    assert mode_range([3, 2, 1]) == (0, 0)
    assert mode_range([2, 2, 2]) == (0, 2)
    assert is_unimodal([1, 3, 2, 3, 1]) is False
    assert not is_unimodal([2, 2, 1, 1, 2])
    assert not is_unimodal([1, 2, 1, 2])
    assert mode_range([1, 3, 2, 3, 1]) == (1, 3)
    assert unimodality([1, 5, 6, 2]).maximum == 6 and mode([1, 5, 6, 2]) == 2
    with pytest.raises(ValueError):
        is_unimodal([])
    with pytest.raises(TypeError):
        is_unimodal([1, 2.0])


def test_spec_names_on_hand_computed_sequences():
    star5 = [1, 6, 10, 10, 5, 1]
    assert L_cutoff(5) == 3 and [L_cutoff(a) for a in range(8)] == [0, 1, 1, 2, 3, 3, 4, 5]
    assert wr_violations(star5) == [] and iso_violations(star5) == []
    assert iso_values(star5) == [1 * 36 + 1 - 2 * 10, 2 * 100 + 36 - 3 * 6 * 10, 3 * 100 + 100 - 4 * 10 * 5, 4 * 25 + 100 - 5 * 10 * 1]
    assert tail_check(star5) and first_descent(star5) == 4 and mode(star5) == 2

    p = [1, 2, 1, 100]
    assert iso_violations(p) == [2] and descent_conditional_iso_violations(p) == [2]
    assert wr_violations([1, 3, 1]) == [2]
    assert descent_conditional_iso_violations([1, 1, 5]) == [1]
    assert descent_conditional_iso_violations([1, 2, 30]) == [] and iso_violations([1, 2, 30]) == [1]
    assert not tail_check([1, 2, 3, 4, 5])


def test_full_report_dict():
    rep = full_report([1, 6, 10, 10, 5, 1])
    assert rep["alpha"] == 5 and rep["L"] == 3 and rep["unimodal"] and rep["log_concave"]
    assert rep["mode"] == 2 and rep["mode_range"] == (2, 3)
    assert rep["first_descent"] == 4 and rep["first_weak_descent"] == 3
    assert rep["wr_violations"] == [] and rep["iso_violations"] == [] and rep["lc_breaks"] == []
    assert rep["descent_conditional_iso_violations"] == [] and rep["tail_ok"]
    assert rep["framework_certified"] and rep["framework_case"] == "lemma_chain" and rep["lemma_steps"] == [3]
    assert all(type(v) is int for v in rep["iso_values"])
    bad = full_report([1, 2, 1, 100])
    assert not bad["framework_certified"] and bad["iso_violations_le_L"] == [2] and not bad["unimodal"]
    assert bad["descent_conditional_iso_violations"] == [2] and not bad["tail_ok"] and bad["tail_failures"] == [2]


def test_log_concavity():
    assert is_log_concave([1, 5, 6, 2])
    assert log_concavity_breaks([1, 5, 6, 2]) == []
    assert not is_log_concave([1, 2, 5, 1])
    assert log_concavity_breaks([1, 2, 5, 1]) == [1]
    assert log_concavity_breaks([1, 1, 1]) == []
    assert log_concavity_breaks([1]) == []


def test_descents():
    assert first_descent([1, 2, 3]) is None
    assert first_descent([1, 3, 3, 2]) == 3
    assert first_weak_descent([1, 3, 3, 2]) == 2
    assert first_weak_descent([1, 2, 3]) is None
    assert first_descent([2, 1]) == 1


def test_wr_and_iso_on_p6():
    p = [1, 6, 10, 4]
    assert wr_failures(p) == []
    assert all(wr_holds(p, r) for r in range(1, 4))
    assert iso_values(p) == [1 * 36 + 1 - 2 * 1 * 10, 2 * 100 + 36 - 3 * 6 * 4]
    assert iso_values(p) == [17, 164]
    assert iso_value(p, 2) == 164
    assert iso_holds(p, 1)
    assert iso_failures(p) == []
    assert iso_normalized_slack(p, 1) == Fraction(17, 6)
    with pytest.raises(IndexError):
        iso_value(p, 3)
    with pytest.raises(IndexError):
        wr_holds(p, 0)


def test_wr_and_iso_failures_detected():
    assert wr_failures([1, 3, 1]) == [2]
    assert wr_failures([1, 10, 36, 56, 35, 6]) == [5]
    assert iso_failures([1, 1, 5]) == [1]
    assert iso_values([1, 1, 5]) == [1 + 1 - 2 * 5]
    assert iso_failures([1, 2, 1, 100]) == [2]


def test_tail_failures():
    assert tail_failures([1, 6, 10, 4]) == []
    assert tail_failures([1, 2, 3, 4, 5]) == [3]
    assert tail_failures([1, 2, 1, 3, 2, 1]) == []
    assert tail_failures([1]) == []


def test_descent_propagation_check_reports_steps():
    report = descent_propagation_check([1, 5, 6, 2, 0])
    assert report.consistent
    assert [step.r for step in report.steps] == [1, 2, 3]
    step3 = report.steps[2]
    assert step3.strict_descent and step3.weak_descent and step3.wr and step3.iso
    assert step3.applies and step3.conclusion
    assert report.applied_at == [3]
    assert bool(report)
    assert descent_propagation_check([1]).steps == ()


def test_descent_propagation_never_inconsistent_on_random_sequences():
    rng = random.Random(7)
    fired = 0
    for _ in range(3000):
        length = rng.randint(2, 10)
        seq = [rng.randint(0, 50) for _ in range(length)]
        report = descent_propagation_check(seq)
        assert report.consistent, seq
        fired += len(report.applied_at)
    assert fired > 0


def test_framework_on_known_sequences():
    star = [1, 6, 10, 10, 5, 1]
    result = unimodality_via_framework(star)
    assert result.certified and result.hypotheses_hold and result.unimodal
    assert result.cutoff == 3 and result.case == "lemma_chain" and result.lemma_steps == [3]
    assert result.mode_index == 2
    assert bool(result)

    path10 = [1, 10, 36, 56, 35, 6]
    result = unimodality_via_framework(path10)
    assert result.certified and result.case == "descent_after_cutoff" and result.mode_index == 3

    increasing = [1, 2]
    result = unimodality_via_framework(increasing)
    assert result.certified and result.case == "increasing"

    assert unimodality_via_framework([1]).certified


def test_framework_reports_hypothesis_failures():
    seq = [1, 1, 5]
    result = unimodality_via_framework(seq)
    assert not result.certified and not result.hypotheses_hold
    assert result.iso_failures == [1] and result.wr_failures == []
    assert not bool(result)

    seq = [1, 5, 2, 1]
    result = unimodality_via_framework(seq)
    assert result.cutoff == 2
    assert result.wr_failures == [2]


def test_framework_never_certifies_non_unimodal_sequences():
    rng = random.Random(11)
    certified = 0
    for _ in range(5000):
        length = rng.randint(1, 9)
        seq = [rng.randint(1, 30) for _ in range(length)]
        try:
            result = unimodality_via_framework(seq)
        except FrameworkInconsistency as exc:
            pytest.fail(f"framework inconsistent on {seq}: {exc}")
        if result.certified:
            certified += 1
            assert is_unimodal(seq)
    assert certified > 0


def test_framework_requires_positive_entries():
    result = unimodality_via_framework([0, 0, 5, 3])
    assert result.hypotheses_hold and not result.positive and not result.certified
    assert result.unimodal


def test_framework_exhaustive_small_sequences_never_inconsistent():
    import itertools

    certified = 0
    for length in range(1, 7):
        for seq in itertools.product(range(0, 4), repeat=length):
            result = unimodality_via_framework(seq)
            if result.certified:
                certified += 1
                assert is_unimodal(seq)
    assert certified > 0


def test_framework_declines_when_tail_property_fails():
    seq = [1, 4, 8, 10, 11]
    assert wr_failures(seq) == [] and iso_failures(seq) == []
    result = unimodality_via_framework(seq)
    assert result.tail_failures == [3]
    assert result.hypotheses_hold and not result.certified and result.unimodal
