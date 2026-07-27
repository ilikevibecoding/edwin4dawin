"""Constructions of the classical unit-distance graphs used for lower bounds on CNP."""

from __future__ import annotations

from dataclasses import dataclass
from fractions import Fraction
from typing import Sequence

from .field import Alg, rat
from .geometry import (
    ORIGIN,
    EdgeReport,
    Point,
    Rotation,
    dedupe,
    dihedral_orbit,
    rotation_60,
    rotation_double_arcsin,
    rotation_quarter_turn_plus_arcsin,
    unit_distance_edges,
)

R3 = Alg.sqrt(3)
R11 = Alg.sqrt(11)
R33 = Alg.sqrt(33)


@dataclass
class UnitDistanceGraph:
    name: str
    points: list[Point]
    edges: list[tuple[int, int]]
    report: EdgeReport | None = None

    @property
    def order(self) -> int:
        return len(self.points)

    @property
    def size(self) -> int:
        return len(self.edges)

    def __str__(self) -> str:
        return f"{self.name}: {self.order} vertices, {self.size} edges"


def build(name: str, points: Sequence[Point]) -> UnitDistanceGraph:
    pts = list(points)
    report = unit_distance_edges(pts)
    return UnitDistanceGraph(name, pts, report.edges, report)


# ---------------------------------------------------------------------------------
# Small classical graphs
# ---------------------------------------------------------------------------------


def hexagon_h() -> UnitDistanceGraph:
    """de Grey's H: the centre and vertices of a regular hexagon of side 1 (7 vertices)."""
    return build("H (hexagon + centre)", [ORIGIN] + [rotation_60(k)(Point(rat(1), rat(0))) for k in range(6)])


def moser_spindle() -> UnitDistanceGraph:
    """The Moser spindle (1961): 7 vertices, 11 edges, chromatic number 4.

    Two rhombi of two unit triangles each, hinged at the origin and splayed so that their
    far vertices (both at distance sqrt(3) from the hinge) are exactly 1 apart.  That needs
    a rotation with cos = 5/6, sin = sqrt(11)/6, since 3*(2 - 2*cos) = 1.
    """
    rhombus = [
        ORIGIN,
        Point(R3 / 2, rat(1, 2)),
        Point(R3 / 2, rat(-1, 2)),
        Point(R3, rat(0)),
    ]
    hinge = Rotation(rat(5, 6), R11 / 6)
    return build("Moser spindle", dedupe(rhombus + [hinge(p) for p in rhombus]))


def golomb_graph() -> UnitDistanceGraph:
    """The Golomb graph: 10 vertices, 18 edges, chromatic number 4.

    A unit hexagon with its centre, plus a unit-side triangle (circumradius 1/sqrt(3))
    rotated by the angle with cos = sqrt(3)/6 so that its vertices are 1 away from
    alternate hexagon vertices.
    """
    hexagon = [ORIGIN] + [rotation_60(k)(Point(rat(1), rat(0))) for k in range(6)]
    spin = Rotation(R3 / 6, R33 / 6)
    inner_seed = spin(Point(R3 / 3, rat(0)))
    triangle = [rotation_60(2 * k)(inner_seed) for k in range(3)]
    return build("Golomb graph", dedupe(hexagon + triangle))


# ---------------------------------------------------------------------------------
# de Grey's 1581-vertex graph G
# ---------------------------------------------------------------------------------


def de_grey_seed_set() -> list[Point]:
    """The 39-point set S of de Grey (2018), arXiv:1804.02385, section 5, step (1).

    Transcribed verbatim; note sqrt(12) = 2*sqrt(3), 1/sqrt(12) = sqrt(3)/6 and
    1/sqrt(3) = sqrt(3)/3.
    """
    return [
        Point(rat(0), rat(0)),
        Point(rat(1, 3), rat(0)),
        Point(rat(1), rat(0)),
        Point(rat(2), rat(0)),
        Point((R33 - rat(3)) / 6, rat(0)),
        Point(rat(1, 2), R3 / 6),
        Point(rat(1), R3 / 3),
        Point(rat(3, 2), R3 / 2),
        Point(rat(7, 6), R11 / 6),
        Point(rat(1, 6), (R3 * 2 - R11) / 6),
        Point(rat(5, 6), (R3 * 2 - R11) / 6),
        Point(rat(2, 3), (R11 - R3) / 6),
        Point(rat(2, 3), (R3 * 3 - R11) / 6),
        Point(R33 / 6, R3 / 6),
        Point((R33 + rat(3)) / 6, R3 / 3),
        Point((R33 + rat(1)) / 6, (R3 * 3 - R11) / 6),
        Point((R33 - rat(1)) / 6, (R3 * 3 - R11) / 6),
        Point((R33 + rat(1)) / 6, (R11 - R3) / 6),
        Point((R33 - rat(1)) / 6, (R11 - R3) / 6),
        Point((R33 - rat(2)) / 6, (R3 * 2 - R11) / 6),
        Point((R33 - rat(4)) / 6, (R3 * 2 - R11) / 6),
        Point((R33 + rat(13)) / 12, (R11 - R3) / 12),
        Point((R33 + rat(11)) / 12, (R3 + R11) / 12),
        Point((R33 + rat(9)) / 12, (R11 - R3) / 4),
        Point((R33 + rat(9)) / 12, (R3 * 3 + R11) / 12),
        Point((R33 + rat(7)) / 12, (R3 + R11) / 12),
        Point((R33 + rat(7)) / 12, (R3 * 3 - R11) / 12),
        Point((R33 + rat(5)) / 12, (R3 * 5 - R11) / 12),
        Point((R33 + rat(5)) / 12, (R11 - R3) / 12),
        Point((R33 + rat(3)) / 12, (R11 * 3 - R3 * 5) / 12),
        Point((R33 + rat(3)) / 12, (R3 + R11) / 12),
        Point((R33 + rat(3)) / 12, (R3 * 3 - R11) / 12),
        Point((R33 + rat(1)) / 12, (R11 - R3) / 12),
        Point((R33 - rat(1)) / 12, (R3 * 3 - R11) / 12),
        Point((R33 - rat(3)) / 12, (R11 - R3) / 12),
        Point((rat(15) - R33) / 12, (R11 - R3) / 4),
        Point((rat(15) - R33) / 12, (R3 * 7 - R11 * 3) / 12),
        Point((rat(13) - R33) / 12, (R3 * 3 - R11) / 12),
        Point((rat(11) - R33) / 12, (R11 - R3) / 12),
    ]


def de_grey_vertices() -> list[Point]:
    """Steps (2)-(7) of de Grey's recipe for the 1581-vertex graph G."""
    s_a = dihedral_orbit(de_grey_seed_set())  # step (2): 397 points

    spin = rotation_double_arcsin(4)  # step (3): rotate by 2*arcsin(1/4)
    s_b = [spin(p) for p in s_a]

    deleted = {
        (rat(1, 3).c, rat(0).c),
        (rat(-1, 3).c, rat(0).c),
    }
    y = [p for p in dedupe(s_a + s_b) if (p.x.c, p.y.c) not in deleted]  # step (4)

    pivot = Point(rat(-2), rat(0))
    y_a = [rotation_quarter_turn_plus_arcsin(8, +1).about(pivot)(p) for p in y]  # step (5)
    y_b = [rotation_quarter_turn_plus_arcsin(8, -1).about(pivot)(p) for p in y]  # step (6)

    return dedupe(y_a + y_b)  # step (7)


def de_grey_graph() -> UnitDistanceGraph:
    """de Grey's G: 1581 vertices, not 4-colourable, so CNP >= 5."""
    return build("de Grey G", de_grey_vertices())


REGISTRY = {
    "hexagon": hexagon_h,
    "spindle": moser_spindle,
    "golomb": golomb_graph,
    "degrey": de_grey_graph,
}
