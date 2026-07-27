"""Exact planar geometry over K, plus certified unit-distance edge detection."""

from __future__ import annotations

from dataclasses import dataclass
from fractions import Fraction
from typing import Iterable, Sequence

from .field import Alg, ONE, find_prime_with_roots, rat


@dataclass(frozen=True)
class Point:
    x: Alg
    y: Alg

    def __add__(self, other: "Point") -> "Point":
        return Point(self.x + other.x, self.y + other.y)

    def __sub__(self, other: "Point") -> "Point":
        return Point(self.x - other.x, self.y - other.y)

    def as_floats(self) -> tuple[float, float]:
        return float(self.x), float(self.y)


@dataclass(frozen=True)
class Rotation:
    """Rotation by an angle whose cosine and sine both lie in K."""

    cos: Alg
    sin: Alg
    center: Point | None = None

    def __call__(self, p: Point) -> Point:
        if self.center is not None:
            p = p - self.center
        rotated = Point(self.cos * p.x - self.sin * p.y, self.sin * p.x + self.cos * p.y)
        if self.center is not None:
            rotated = rotated + self.center
        return rotated

    def about(self, center: Point) -> "Rotation":
        return Rotation(self.cos, self.sin, center)

    def check_orthogonal(self) -> bool:
        """cos^2 + sin^2 == 1, i.e. this really is a rigid rotation."""
        return (self.cos.square() + self.sin.square()) == ONE


ORIGIN = Point(rat(0), rat(0))


def rotation_60(k: int = 1) -> Rotation:
    """Rotation by k * 60 degrees:  cos = 1/2, sin = sqrt(3)/2 for k = 1."""
    cos, sin = rat(1), rat(0)
    step_cos, step_sin = rat(1, 2), Alg.sqrt(3) / 2
    for _ in range(k % 6):
        cos, sin = cos * step_cos - sin * step_sin, sin * step_cos + cos * step_sin
    return Rotation(cos, sin)


def rotation_double_arcsin(n: int) -> Rotation:
    """Rotation by 2*arcsin(1/n):  cos = 1 - 2/n^2, sin = 2*sqrt(n^2 - 1)/n^2."""
    return Rotation(rat(n * n - 2, n * n), Alg.sqrt(n * n - 1) * Fraction(2, n * n))


def rotation_quarter_turn_plus_arcsin(n: int, sign: int) -> Rotation:
    """Rotation by pi/2 + sign*arcsin(1/n):  cos = -sign/n, sin = sqrt(n^2 - 1)/n."""
    return Rotation(rat(-sign, n), Alg.sqrt(n * n - 1) / n)


def reflect_x_axis(p: Point) -> Point:
    """Negate the y-coordinate."""
    return Point(p.x, -p.y)


def dihedral_orbit(points: Iterable[Point]) -> list[Point]:
    """Close a point set under the order-12 dihedral group: 60-degree rotations and y-negation."""
    rotations = [rotation_60(k) for k in range(6)]
    out: dict[tuple, Point] = {}
    for p in points:
        for base in (p, reflect_x_axis(p)):
            for rot in rotations:
                q = rot(base)
                out.setdefault((q.x.c, q.y.c), q)
    return list(out.values())


def dedupe(points: Iterable[Point]) -> list[Point]:
    out: dict[tuple, Point] = {}
    for p in points:
        out.setdefault((p.x.c, p.y.c), p)
    return list(out.values())


def squared_distance(a: Point, b: Point) -> Alg:
    dx, dy = a.x - b.x, a.y - b.y
    return dx.square() + dy.square()


@dataclass
class EdgeReport:
    """Outcome of the two-stage unit-distance search."""

    edges: list[tuple[int, int]]
    candidates_examined: int
    false_positives: int
    prime: int


def unit_distance_edges(points: Sequence[Point], prime_lower: int = 10**9) -> EdgeReport:
    """All pairs at *exactly* distance 1, with no reliance on floating point.

    Stage 1 reduces every coordinate through a ring homomorphism K -> F_p and keeps the
    pairs whose squared distance is 1 in F_p.  A homomorphism sends 0 to 0, so a genuine
    unit-distance pair can never be discarded here: the filter has no false negatives.
    Stage 2 re-checks every surviving pair with exact rational arithmetic in K, which
    removes the (rare) modular coincidences.  The result is therefore exactly the set of
    unit-distance pairs.
    """
    import numpy as np

    p, roots = find_prime_with_roots(lower=prime_lower)
    xs = np.array([pt.x.mod_p(roots, p) for pt in points], dtype=np.int64)
    ys = np.array([pt.y.mod_p(roots, p) for pt in points], dtype=np.int64)

    candidates: list[tuple[int, int]] = []
    n = len(points)
    # Row-blocked to keep peak memory modest for graphs with a few thousand vertices.
    block = max(1, 2_000_000 // max(n, 1))
    for start in range(0, n, block):
        stop = min(start + block, n)
        dx = (xs[start:stop, None] - xs[None, :]) % p
        dy = (ys[start:stop, None] - ys[None, :]) % p
        d2 = (dx * dx % p + dy * dy % p) % p
        rows, cols = np.nonzero(d2 == 1)
        for r, c in zip(rows.tolist(), cols.tolist()):
            i = start + r
            if i < c:
                candidates.append((i, c))

    edges = []
    false_positives = 0
    for i, j in candidates:
        if squared_distance(points[i], points[j]) == ONE:
            edges.append((i, j))
        else:
            false_positives += 1
    edges.sort()
    return EdgeReport(edges, len(candidates), false_positives, p)
