from fractions import Fraction

import pytest

from hadwiger_nelson.coloring import (
    brute_force_chromatic_number,
    brute_force_coloring,
    is_proper,
    sat_k_colorable,
)
from hadwiger_nelson.graphs import de_grey_graph, golomb_graph, hexagon_h, moser_spindle
from hadwiger_nelson.upper_bound import (
    NUM_COLORS,
    eisenstein_norm,
    lattice_color,
    stress_test,
    verify_upper_bound,
)


# --- lower bounds ---------------------------------------------------------------


def test_hexagon_is_three_chromatic():
    g = hexagon_h()
    assert brute_force_chromatic_number(g.order, g.edges) == 3


def test_moser_spindle_is_four_chromatic():
    g = moser_spindle()
    assert brute_force_coloring(g.order, g.edges, 3) is None
    coloring = brute_force_coloring(g.order, g.edges, 4)
    assert coloring is not None and is_proper(g.edges, coloring)


def test_golomb_graph_is_four_chromatic():
    g = golomb_graph()
    assert brute_force_coloring(g.order, g.edges, 3) is None
    assert brute_force_coloring(g.order, g.edges, 4) is not None


def test_brute_force_and_sat_agree_on_small_graphs():
    for factory in (hexagon_h, moser_spindle, golomb_graph):
        g = factory()
        for k in (2, 3, 4):
            assert (brute_force_coloring(g.order, g.edges, k) is not None) == sat_k_colorable(
                g.order, g.edges, k
            ).satisfiable


def test_de_grey_graph_is_five_colorable():
    """The easy half of chi(G) = 5; the UNSAT half is the slow test below."""
    g = de_grey_graph()
    result = sat_k_colorable(g.order, g.edges, 5)
    assert result.satisfiable
    assert is_proper(g.edges, result.coloring)


@pytest.mark.slow
def test_de_grey_graph_is_not_four_colorable():
    g = de_grey_graph()
    assert not sat_k_colorable(g.order, g.edges, 4).satisfiable


# --- upper bound ----------------------------------------------------------------


def test_isbell_certificate_is_valid():
    certificate = verify_upper_bound()
    assert certificate.valid
    assert certificate.min_same_color_center_norm == NUM_COLORS


def test_colour_classes_are_cosets_of_an_index_seven_sublattice():
    assert lattice_color(0, 0) == 0
    assert lattice_color(1, 2) == 0  # the generator 1 + 2w
    assert lattice_color(-2, 3) == 0  # w * (1 + 2w)
    assert eisenstein_norm(1, 2) == 7
    assert eisenstein_norm(-2, 3) == 7
    for a in range(-20, 21):
        for b in range(-20, 21):
            if (a, b) != (0, 0) and lattice_color(a, b) == 0:
                assert eisenstein_norm(a, b) >= 7


def test_colour_is_additive_on_the_lattice():
    for a, b, c, d in ((1, 0, 0, 1), (3, -2, -1, 5), (7, 7, -4, 2)):
        assert lattice_color(a + c, b + d) == (lattice_color(a, b) + lattice_color(c, d)) % NUM_COLORS


def test_radius_window_is_exactly_the_expected_interval():
    """2r < 1 and r*(sqrt(21) - 2) > 1 both hold precisely on (1/(sqrt21-2), 1/2)."""
    assert verify_upper_bound(Fraction(9, 20)).valid
    assert not verify_upper_bound(Fraction(1, 2)).diameter_ok  # r too large
    assert not verify_upper_bound(Fraction(3, 8)).separation_ok  # r too small


def test_no_monochromatic_unit_distance_pair_in_sample():
    clashes, samples = stress_test(samples=20_000)
    assert clashes == 0 and samples == 20_000
