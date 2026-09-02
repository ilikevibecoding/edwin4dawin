"""Deterministic verification of reversible exact Bernstein navigation."""

import random

import numpy as np

from certify_pf_length3_repeated_half_toric_core import midpoint_restrict_exact
from exact_bernstein_navigation import midpoint_unrestrict_exact, navigate_controls_exact


def split(controls, axis, side):
    return {
        name: midpoint_restrict_exact(array, axis, side)
        for name, array in controls.items()
    }


def verify_inverse():
    rng = random.Random(993)
    checks = 0
    for ndim in range(1, 6):
        for axis in range(ndim):
            for degree in range(8):
                shape = [rng.randrange(1, 4) for _ in range(ndim)]
                shape[axis] = degree + 1
                parent = np.array(
                    [rng.randrange(-(10**20), 10**20) for _ in range(int(np.prod(shape)))],
                    dtype=object,
                ).reshape(shape)
                for side in "LR":
                    child = midpoint_restrict_exact(parent, axis, side)
                    recovered = midpoint_unrestrict_exact(child, axis, side)
                    assert np.array_equal(recovered, parent), (shape, axis, side)
                    checks += 1
    for trial in range(100):
        shape = tuple(rng.randrange(2, 6) for _ in range(5))
        original = np.array(
            [rng.randrange(-(10**12), 10**12) for _ in range(int(np.prod(shape)))],
            dtype=object,
        ).reshape(shape)
        current = original
        path = []
        for _ in range(30):
            axis = rng.randrange(5)
            side = rng.choice("LR")
            current = midpoint_restrict_exact(current, axis, side)
            path.append((axis, side))
        for axis, side in reversed(path):
            current = midpoint_unrestrict_exact(current, axis, side)
        assert np.array_equal(current, original), trial
        checks += 1
    return checks


def make_base(rng):
    base = {}
    for name, shape in (
        ("R", (4, 3, 3, 2, 2)),
        ("A", (3, 4, 2, 3, 2)),
        ("I", (2, 3, 4, 2, 3)),
    ):
        base[name] = np.array(
            [rng.randrange(-(10**9), 10**9) for _ in range(int(np.prod(shape)))],
            dtype=object,
        ).reshape(shape)
    return base


def verify_navigation():
    rng = random.Random(9932026)
    base = make_base(rng)

    def axis_for(address):
        return (len(address) // 2 * 3 + address.count("R") * 2 + 1) % 5

    def is_leaf(address):
        depth = len(address) // 2
        return depth >= 8 or (
            depth >= 3 and (sum(map(ord, address)) + depth) % 5 == 0
        )

    reference_stack = [("", {name: array.copy() for name, array in base.items()})]
    reversible_address = ""
    reversible = {name: array.copy() for name, array in base.items()}
    pending = []
    processed = 0
    while reference_stack:
        processed += 1
        reference_address, reference = reference_stack.pop()
        assert reference_address == reversible_address
        assert all(
            np.array_equal(reference[name], reversible[name]) for name in base
        ), (processed, reference_address)
        if is_leaf(reference_address):
            if not reference_stack:
                assert not pending
                break
            target = pending.pop()
            assert target == reference_stack[-1][0]
            reversible = navigate_controls_exact(
                reversible,
                reversible_address,
                target,
                midpoint_restrict_exact,
            )
            reversible_address = target
            continue
        axis = axis_for(reference_address)
        left_address = reference_address + f"{axis}L"
        right_address = reference_address + f"{axis}R"
        reference_stack.append((left_address, split(reference, axis, "L")))
        reference_stack.append((right_address, split(reference, axis, "R")))
        pending.append(left_address)
        reversible = split(reversible, axis, "R")
        reversible_address = right_address

    def from_root(address):
        controls = {name: array.copy() for name, array in base.items()}
        for offset in range(0, len(address), 2):
            controls = split(controls, int(address[offset]), address[offset + 1])
        return controls

    unrelated = 100
    for trial in range(unrelated):
        first = "".join(
            f"{rng.randrange(5)}{rng.choice('LR')}" for _ in range(rng.randrange(15))
        )
        second = "".join(
            f"{rng.randrange(5)}{rng.choice('LR')}" for _ in range(rng.randrange(15))
        )
        moved = navigate_controls_exact(
            from_root(first), first, second, midpoint_restrict_exact
        )
        expected = from_root(second)
        assert all(np.array_equal(moved[name], expected[name]) for name in base), (
            trial,
            first,
            second,
        )
    return processed, unrelated


def main():
    inverse_checks = verify_inverse()
    dfs_cells, unrelated = verify_navigation()
    print(f"PASS exact midpoint inverse: {inverse_checks} deterministic checks")
    print(f"PASS reversible DFS exact equivalence: {dfs_cells} cells")
    print(f"PASS unrelated-address navigation: {unrelated} exact comparisons")


if __name__ == "__main__":
    main()
