"""Machine-checked bounds for the Hadwiger-Nelson problem (chromatic number of the plane).

The problem is open: it is known only that 5 <= CNP <= 7.  This package verifies both of
those bounds computationally, from first principles, with exact arithmetic.
"""

from .field import Alg
from .geometry import Point, unit_distance_edges
from .graphs import (
    UnitDistanceGraph,
    de_grey_graph,
    golomb_graph,
    hexagon_h,
    moser_spindle,
)

__all__ = [
    "Alg",
    "Point",
    "UnitDistanceGraph",
    "de_grey_graph",
    "golomb_graph",
    "hexagon_h",
    "moser_spindle",
    "unit_distance_edges",
]
