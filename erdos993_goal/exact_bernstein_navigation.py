"""Exact reversible navigation for integer-scaled Bernstein tensors.

The exact midpoint restriction used by the Erdős #993 certificate multiplies
every child Bernstein control by ``2**degree``.  Both the left and right
restriction maps are triangular, so their parent controls can be recovered by
exact integer division.  This permits a depth-first cover to retain deferred
siblings only as addresses while moving between nearby leaves, instead of
reconstructing every deferred cell from the root atlas.
"""

import math

import numpy as np


def _exact_quotient(array: np.ndarray, divisor: int) -> np.ndarray:
    """Return ``array / divisor`` and reject a non-integral input."""

    quotient = array // divisor
    values = array.flat if isinstance(array, np.ndarray) else (array,)
    if any(value % divisor for value in values):
        raise ArithmeticError("midpoint inverse encountered a non-integral control")
    return quotient


def midpoint_unrestrict_exact(array: np.ndarray, axis: int, side: str) -> np.ndarray:
    """Invert one exact integer-scaled midpoint Bernstein restriction.

    If the parent has degree ``n`` in ``axis``, the restriction routine stores
    ``2**n`` times the ordinary Bernstein controls of the selected half.  The
    left map is lower triangular and the right map is upper triangular.
    """

    moved = np.moveaxis(array, axis, 0)
    degree = moved.shape[0] - 1
    parent = np.empty_like(moved)

    if side == "L":
        for index in range(degree + 1):
            target = _exact_quotient(moved[index], 2 ** (degree - index))
            for prior in range(index):
                target = target - math.comb(index, prior) * parent[prior]
            parent[index] = target
    elif side == "R":
        for index in range(degree, -1, -1):
            target = _exact_quotient(moved[index], 2**index)
            for later in range(index + 1, degree + 1):
                target = target - math.comb(degree - index, later - index) * parent[later]
            parent[index] = target
    else:
        raise ValueError(f"invalid restriction side {side!r}")

    return np.moveaxis(parent, 0, axis)


def address_tokens(address: str):
    """Parse an axis/side address into validated ``(axis, side)`` tokens."""

    if len(address) % 2:
        raise ValueError("address must contain axis/side pairs")
    tokens = []
    for offset in range(0, len(address), 2):
        axis = int(address[offset])
        side = address[offset + 1]
        if axis not in range(5) or side not in "LR":
            raise ValueError(f"invalid address token {address[offset:offset + 2]!r}")
        tokens.append((axis, side))
    return tokens


def navigate_controls_exact(controls, current_address, target_address, restrict):
    """Consume controls at one address and recover controls at another.

    ``restrict`` must be the matching integer-scaled single-side midpoint
    restriction routine.  Navigation first inverts the current suffix back to
    the longest common prefix, then restricts down the target suffix.
    """

    current = address_tokens(current_address)
    target = address_tokens(target_address)
    common = 0
    while common < min(len(current), len(target)) and current[common] == target[common]:
        common += 1

    for axis, side in reversed(current[common:]):
        recovered = {}
        for name in tuple(controls):
            array = controls.pop(name)
            recovered[name] = midpoint_unrestrict_exact(array, axis, side)
        controls = recovered

    for axis, side in target[common:]:
        restricted = {}
        for name in tuple(controls):
            array = controls.pop(name)
            restricted[name] = restrict(array, axis, side)
        controls = restricted

    return controls
