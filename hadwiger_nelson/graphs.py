"""Unit-distance graphs with exact coordinates.

A *unit-distance graph* is a finite set of points in the plane, with an edge
between two points exactly when their euclidean distance is 1.  If such a
graph needs k colors, then so does the whole plane, because any proper
coloring of the plane restricts to a proper coloring of the graph.
"""

from __future__ import annotations

from fractions import Fraction
from typing import List, Sequence, Tuple

from .qfield import QF, dist2

Point = Tuple[QF, QF]
Edge = Tuple[int, int]  # 0-based, i < j

ONE = QF.rational(1)


def verify_unit_edges(points: Sequence[Point], edges: Sequence[Edge]) -> None:
    """Assert (in exact arithmetic) that every listed edge has length exactly 1."""
    for i, j in edges:
        d2 = dist2(points[i], points[j])
        if d2 != ONE:
            raise AssertionError(
                f"edge ({i},{j}) has squared length {d2!r}, not 1"
            )


def unit_distance_edges(points: Sequence[Point]) -> List[Edge]:
    """All pairs at distance exactly 1, computed from scratch.

    A float prefilter skips pairs whose approximate squared distance is far
    from 1; every candidate that survives is confirmed in exact arithmetic.
    The prefilter is sound: coordinates here are < 16 in magnitude, so the
    float evaluation of dist^2 (a sum of 8 exact terms q_d*sqrt(d) with
    moderate rationals q_d) is accurate to far better than the 0.5 margin
    used below, hence no true unit pair is skipped.
    """
    xy = [(float(p[0]), float(p[1])) for p in points]
    edges: List[Edge] = []
    n = len(points)
    for i in range(n):
        xi, yi = xy[i]
        for j in range(i + 1, n):
            dx = xi - xy[j][0]
            dy = yi - xy[j][1]
            approx = dx * dx + dy * dy
            if abs(approx - 1.0) > 0.5:
                continue
            if dist2(points[i], points[j]) == ONE:
                edges.append((i, j))
    return edges


def load_edge_file(path: str) -> Tuple[int, List[Edge]]:
    """Read a DIMACS-style edge file: header 'p edge n m', lines 'e i j' (1-based)."""
    n = None
    edges: List[Edge] = []
    with open(path) as f:
        for line in f:
            parts = line.split()
            if not parts or parts[0] == "c":
                continue
            if parts[0] == "p":
                n = int(parts[2])
            elif parts[0] == "e":
                i, j = int(parts[1]) - 1, int(parts[2]) - 1
                edges.append((min(i, j), max(i, j)))
    if n is None:
        raise ValueError(f"{path}: missing 'p edge' header")
    return n, sorted(set(edges))


# ---------------------------------------------------------------------------
# The Moser spindle (Moser & Moser, 1961): 7 points, 11 unit edges, needs 4
# colors.  Two unit rhombi (pairs of unit triangles) share the hinge A; the
# second rhombus is the first rotated about A by theta = arccos(5/6), chosen
# so the far tips D and D' end up at distance exactly 1:
#     |D| = sqrt(3)  and  |D - D'|^2 = 2*3*(1 - 5/6) = 1.
# ---------------------------------------------------------------------------

def moser_spindle() -> List[Point]:
    half = QF.rational(Fraction(1, 2))
    s3 = QF.sqrt_rational(3)
    A: Point = (QF.rational(0), QF.rational(0))
    B: Point = (QF.rational(1), QF.rational(0))
    C: Point = (half, half * s3)
    D: Point = (B[0] + C[0], B[1] + C[1])

    cos_t = QF.rational(Fraction(5, 6))
    sin_t = QF.sqrt_rational(11) / 6

    def rot(p: Point) -> Point:
        return (cos_t * p[0] - sin_t * p[1], sin_t * p[0] + cos_t * p[1])

    return [A, B, C, D, rot(B), rot(C), rot(D)]


def brute_force_colorings(n: int, edges: Sequence[Edge], k: int) -> int:
    """Count proper k-colorings by exhaustive search (fine for tiny graphs)."""
    count = 0
    adj = [[] for _ in range(n)]
    for i, j in edges:
        adj[j].append(i)  # only earlier neighbours needed

    color = [0] * n

    def rec(v: int):
        nonlocal count
        if v == n:
            count += 1
            return
        for c in range(k):
            if all(color[u] != c for u in adj[v]):
                color[v] = c
                rec(v + 1)

    rec(0)
    return count


def find_coloring_brute(n: int, edges: Sequence[Edge], k: int) -> List[int] | None:
    """First proper k-coloring found by backtracking, or None."""
    adj = [[] for _ in range(n)]
    for i, j in edges:
        adj[j].append(i)
    color = [-1] * n

    def rec(v: int) -> bool:
        if v == n:
            return True
        for c in range(k):
            if all(color[u] != c for u in adj[v]):
                color[v] = c
                if rec(v + 1):
                    return True
        color[v] = -1
        return False

    return list(color) if rec(0) else None


def assert_proper_coloring(edges: Sequence[Edge], coloring: Sequence[int]) -> None:
    for i, j in edges:
        if coloring[i] == coloring[j]:
            raise AssertionError(f"edge ({i},{j}) is monochromatic (color {coloring[i]})")
