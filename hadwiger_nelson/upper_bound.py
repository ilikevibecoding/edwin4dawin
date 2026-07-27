"""Upper bound chi(R^2) <= 7: the classic hexagonal 7-coloring
(Hadwiger 1945 / attributed to Isbell around 1950), verified with exact
rational arithmetic.

Construction.  Fix a rational scale s (hexagon circumradius) and take the
triangular lattice of centers  c(m,n) = m*a + n*b  with

    a = (sqrt3*s, 0),      b = (sqrt3*s/2, 3s/2),
    |m*a + n*b|^2 = 3*s^2*(m^2 + m*n + n^2).

Color center c(m,n) with  (m + 3n) mod 7,  and color every point of the
plane like its nearest center (ties broken arbitrarily).  The Voronoi cells
are regular hexagons of circumradius s — the familiar 7-colored hexagon
tiling in which each hexagon is surrounded by the six other colors.

Proof obligations, each checked exactly below:

(1) Covering radius = s: every point of the plane lies within distance s of
    some center.  The lattice's Delaunay triangles (translates of
    {0, a, b} and {a, b, a+b}, two congruent equilateral triangles that
    tile the plane) have circumradius exactly s, and every point of a
    triangle is within its circumradius of one of the corners.
    ==> two points colored by the SAME center are at distance <= 2s.

(2) Same color, different centers: the difference vector (m, n) != 0
    satisfies m + 3n == 0 (mod 7), which forces the quadratic form
    N(m,n) = m^2 + m*n + n^2 to be >= 7.  (Finite check: N(m,n) >=
    (m^2+n^2)/2 because N - (m^2+n^2)/2 = (m+n)^2/2 >= 0, so only
    m^2 + n^2 < 14 needs enumeration.)  Hence same-colored centers are
    >= sqrt(21)*s apart, and points they own are >= sqrt(21)*s - 2s apart.

(3) Rational inequalities:  2s < 1  and  21*s^2 > (1 + 2s)^2.

Together: two points at distance exactly 1 can share neither a center
(<= 2s < 1) nor a color across centers (>= sqrt(21)*s - 2s > 1).  So the
7-coloring is proper and chi(R^2) <= 7.
"""

from __future__ import annotations

from fractions import Fraction
from typing import Dict

from .qfield import QF, dist2


def verify_seven_coloring(s: Fraction = Fraction(9, 20)) -> Dict[str, object]:
    s = Fraction(s)
    if s <= 0:
        raise ValueError("scale must be positive")

    # (1) circumradius of the Delaunay triangle {0, a, b} is exactly s.
    sqrt3 = QF.sqrt_rational(3)
    zero = QF.rational(0)
    O = (zero, zero)
    A = (sqrt3 * s, zero)
    B = (sqrt3 * s / 2, QF.rational(Fraction(3, 2) * s))
    center = (sqrt3 * s / 2, QF.rational(s / 2))  # claimed circumcenter
    s2 = QF.rational(s * s)
    for corner in (O, A, B):
        if dist2(center, corner) != s2:
            raise AssertionError("circumradius of Delaunay triangle is not s")
    # (and the lattice norm form really is 3*s^2*(m^2+mn+n^2))
    for m, n in ((1, 0), (0, 1), (1, 1), (2, -1), (1, 2)):
        v = (m * A[0] + n * B[0], m * A[1] + n * B[1])
        expect = QF.rational(3 * s * s * (m * m + m * n + n * n))
        if dist2(v, (zero, zero)) != expect:
            raise AssertionError("lattice norm form check failed")

    # (2) minimum of N(m,n) = m^2+mn+n^2 over nonzero (m,n) with 7 | m+3n.
    #     N >= (m^2+n^2)/2, so N < 7 requires m^2+n^2 < 14, i.e. |m|,|n| <= 3.
    min_norm = None
    for m in range(-3, 4):
        for n in range(-3, 4):
            if (m, n) == (0, 0) or (m + 3 * n) % 7 != 0:
                continue
            norm = m * m + m * n + n * n
            min_norm = norm if min_norm is None else min(min_norm, norm)
    if min_norm != 7:
        raise AssertionError(f"same-color sublattice minimum is {min_norm}, expected 7")

    # (3) the two strict rational inequalities.
    same_cell_diam = 2 * s                     # <= diameter of a cell's disk
    gap_sq = 21 * s * s                        # squared distance between same-colored centers
    if not (same_cell_diam < 1):
        raise AssertionError("2s < 1 fails")
    if not (gap_sq > (1 + 2 * s) ** 2):
        raise AssertionError("sqrt(21)*s - 2s > 1 fails")

    return {
        "scale": s,
        "same_cell_max_dist": same_cell_diam,           # 9/10 < 1
        "min_same_color_norm": min_norm,                # 7
        "center_gap_sq": gap_sq,                        # 1701/400
        "needed_gap_sq": (1 + 2 * s) ** 2,              # 361/100
        "colors": 7,
    }
