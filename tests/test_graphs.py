import math

from hadwiger_nelson.field import ONE, Alg, rat
from hadwiger_nelson.geometry import (
    Point,
    dihedral_orbit,
    rotation_60,
    rotation_double_arcsin,
    rotation_quarter_turn_plus_arcsin,
    squared_distance,
    unit_distance_edges,
)
from hadwiger_nelson.graphs import (
    de_grey_graph,
    de_grey_seed_set,
    de_grey_vertices,
    golomb_graph,
    hexagon_h,
    moser_spindle,
)


def test_rotations_are_rigid():
    for rot in (
        rotation_60(1),
        rotation_60(3),
        rotation_double_arcsin(4),
        rotation_quarter_turn_plus_arcsin(8, +1),
        rotation_quarter_turn_plus_arcsin(8, -1),
    ):
        assert rot.check_orthogonal()


def test_rotation_60_has_order_six():
    assert rotation_60(6).cos == ONE
    assert rotation_60(6).sin.is_zero()


def test_hexagon_h():
    g = hexagon_h()
    assert (g.order, g.size) == (7, 12)


def test_moser_spindle():
    g = moser_spindle()
    assert (g.order, g.size) == (7, 11)


def test_golomb_graph():
    g = golomb_graph()
    assert (g.order, g.size) == (10, 18)


def test_every_reported_edge_is_exactly_unit_length():
    for factory in (hexagon_h, moser_spindle, golomb_graph):
        g = factory()
        for u, v in g.edges:
            assert squared_distance(g.points[u], g.points[v]) == ONE


def test_de_grey_stage_sizes_match_the_paper():
    """arXiv:1804.02385 states |S| = 39, |S_a| = 397 and |G| = 1581."""
    seed = de_grey_seed_set()
    assert len(seed) == 39
    assert len(dihedral_orbit(seed)) == 397
    assert len(de_grey_vertices()) == 1581


def test_de_grey_graph_size():
    g = de_grey_graph()
    assert (g.order, g.size) == (1581, 7877)


def test_de_grey_edges_are_exact_and_complete():
    g = de_grey_graph()
    reported = set(g.edges)
    for u, v in reported:
        assert squared_distance(g.points[u], g.points[v]) == ONE
    # The modular pre-filter cannot drop a true edge, so the only way to lose one is a bug
    # in the exact re-check.  Cross-check against floating point on a coarse grid.
    coords = [p.as_floats() for p in g.points]
    approx = set()
    for i, (xi, yi) in enumerate(coords):
        for j in range(i + 1, len(coords)):
            xj, yj = coords[j]
            if abs(math.hypot(xi - xj, yi - yj) - 1.0) < 1e-9:
                approx.add((i, j))
    assert approx == reported


def test_near_misses_are_not_reported_as_edges():
    """A float comparison with a loose tolerance would call these adjacent; exact does not."""
    points = [
        Point(rat(0), rat(0)),
        Point(rat(10**9 - 1, 10**9), rat(0)),
        Point(rat(1), rat(0)),
    ]
    assert unit_distance_edges(points).edges == [(0, 2)]


def test_unit_distance_edges_on_a_triangular_lattice_patch():
    root3 = Alg.sqrt(3)
    points = [
        Point(rat(a) + rat(b, 2), root3 * b / 2)
        for a in range(-2, 3)
        for b in range(-2, 3)
    ]
    report = unit_distance_edges(points)
    for u, v in report.edges:
        assert squared_distance(points[u], points[v]) == ONE
    # Interior lattice points have all six neighbours present.
    degree = {i: 0 for i in range(len(points))}
    for u, v in report.edges:
        degree[u] += 1
        degree[v] += 1
    assert max(degree.values()) == 6


def test_de_grey_contains_no_duplicate_points():
    points = de_grey_vertices()
    assert len({(p.x.c, p.y.c) for p in points}) == len(points)
