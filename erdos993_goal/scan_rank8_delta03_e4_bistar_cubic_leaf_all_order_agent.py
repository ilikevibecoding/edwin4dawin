#!/usr/bin/env python3
"""Exact all-order Newton scan for the e=4 bistar cubic leaf root."""

from __future__ import annotations

import hashlib
import itertools
import json
import math
import time
from functools import lru_cache
from pathlib import Path

from audit_rank8_delta013_e2_double_claws_n23_independent import delta0, delta1, delta2, delta3, forest_poly


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta03_e4_bistar_cubic_leaf_all_order_exact_agent_20260823.json"
MAX_RANK = 8
SAMPLES = 29
DEGREE_BOUNDS = (28, 28, 27, 26)
DELTAS = (delta0, delta1, delta2, delta3)
EXPECTED = {
    "rank8_delta03_e4_skeleton_root_partition_exact_agent_20260823.json": "E68D35E2CA3D5E061AACB7D45CD5B5D5A5ABA61FB0F8621111367E0CC1BA8F28",
    "rank8_delta03_e4_skeleton_root_partition_independent_audit_agent_20260823.json": "207813C6F056BA63945B0025A0E1E907117F2CD09DA88891BD0F7820636C065C",
    "rank8_delta03_e4_skeletons_order27_exact_agent_20260823.json": "257C7549AFEB4BB70ACAAA3DE416A27E5C14565EBEB4A56BC0E2343629498C8E",
    "rank8_delta03_e4_skeletons_order27_independent_audit_agent_20260823.json": "FFC1EE49014697148539AC7701DCA1446C33D483C491F96DE8E298B6B93DB4E6",
    "rank8_delta03_e4_bistar_cubic_leaf_newton_reduction_exact_agent_20260823.json": "E6DF06BA4055AE0AE862BD1A9D90514094B291DFF08D9FE626C0D40108FF4E6C",
    "certify_rank8_delta03_e4_bistar_cubic_leaf_newton_reduction_agent.py": "79E3B150A8B511E9C51F5FA85C3791CBE072788797A521AD4F314E68743F42C4",
    "audit_rank8_delta013_e2_double_claws_n23_independent.py": "B28D1264C8A80F711F68E5DDDC88CDAACEF8FE1C9D1AD812882F3E6782BFF6D8",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


@lru_cache(maxsize=None)
def path(order: int) -> tuple[int, ...]:
    if order == -1:
        return (1,) + (0,) * MAX_RANK
    if order <= -2:
        return (0,) * (MAX_RANK + 1)
    return tuple(math.comb(order - k + 1, k) if order - k + 1 >= k else 0 for k in range(MAX_RANK + 1))


def add(*rows):
    return tuple(sum(row[k] for row in rows) for k in range(MAX_RANK + 1))


def convolve(*factors):
    out = [1] + [0] * MAX_RANK
    for factor in factors:
        new = [0] * (MAX_RANK + 1)
        for i, left in enumerate(out):
            if left:
                for j, right in enumerate(factor[: MAX_RANK + 1 - i]):
                    if right:
                        new[i + j] += left * right
        out = new
    return tuple(out)


def shifted(row):
    return (0,) + row[:MAX_RANK]


@lru_cache(maxsize=None)
def states(arms: tuple[int, ...]):
    return convolve(*(path(a) for a in arms)), shifted(convolve(*(path(a - 1) for a in arms)))


def bistar_core(lengths: tuple[int, int, int, int, int, int]):
    q1, q2, q3, c1, c2, spine = lengths
    q0, qx = states((q1, q2, q3))
    c0, cx = states((c1, c2))
    return add(
        convolve(q0, c0, path(spine - 1)),
        convolve(qx, c0, path(spine - 2)),
        convolve(q0, cx, path(spine - 2)),
        convolve(qx, cx, path(spine - 3)),
    )


def polys(lengths):
    core = bistar_core(lengths)
    reduced = list(lengths)
    reduced[4] -= 1
    return core, bistar_core(tuple(reduced))


def attach(adjacency, start, length):
    previous = start
    for _ in range(length):
        vertex = len(adjacency)
        adjacency.append([])
        adjacency[previous].append(vertex)
        adjacency[vertex].append(previous)
        previous = vertex
    return previous


def literal_tree(lengths):
    q1, q2, q3, c_other, incident, spine = lengths
    adjacency = [[]]
    quartic = 0
    cubic = attach(adjacency, quartic, spine)
    for length in (q1, q2, q3):
        attach(adjacency, quartic, length)
    attach(adjacency, cubic, c_other)
    root = attach(adjacency, cubic, incident)
    assert len(adjacency) == 1 + sum(lengths)
    return adjacency, root


def keys():
    ordinary = (*range(1, 7), "L")
    incident = (*range(1, 8), "L")
    spine = (*range(1, 8), "L")
    for qarms, other, root_arm, bridge in itertools.product(
        itertools.combinations_with_replacement(ordinary, 3), ordinary, incident, spine
    ):
        flat = (*qarms, other, root_arm, bridge)
        flags = tuple(value == "L" for value in flat)
        yield (qarms, other, root_arm, bridge), flat, flags


def base_lengths(flat):
    return [((7 if i < 4 else 8) if value == "L" else int(value)) for i, value in enumerate(flat)]


def ray_lengths(flat, flags, extra):
    out = base_lengths(flat)
    out[flags.index(True)] += extra
    return tuple(out)


def differences(values):
    out = []
    row = values
    while row:
        out.append(row[0])
        row = [right - left for left, right in zip(row, row[1:])]
    return tuple(out)


def stream_update(digest, record):
    digest.update(json.dumps(record, separators=(",", ":"), sort_keys=True).encode())
    digest.update(b"\n")


def update_min(stats, field, value, witness):
    if stats[field] is None or value < stats[field]:
        stats[field] = value
        stats[field + "_witness"] = witness


def main() -> None:
    actual = {name: sha256(HERE / name) for name in EXPECTED}
    assert actual == EXPECTED
    started = time.perf_counter()
    minima = {str(rank): {field: None for field in (
        "finite", "finite_witness", "d0", "d0_witness", "d1", "d1_witness", "higher", "higher_witness"
    )} for rank in range(4)}
    coefficient_digest = hashlib.sha256()
    finite_digest = hashlib.sha256()
    all_short = finite = mixed = all_long = rays = zero_higher = literal_checks = 0

    for key, flat, flags in keys():
        if not any(flags):
            all_short += 1
            lengths = tuple(int(value) for value in flat)
            order = 1 + sum(lengths)
            if order < 27:
                continue
            core, deleted = polys(lengths)
            values = tuple(delta(core, deleted) for delta in DELTAS)
            assert min(values) > 0, (key, values)
            for rank, value in enumerate(values):
                update_min(minima[str(rank)], "finite", value, {"key": key, "order": order, "value": value})
            stream_update(finite_digest, [key, order, values])
            if finite < 128:
                adjacency, root = literal_tree(lengths)
                assert tuple(forest_poly(adjacency)) == core
                assert tuple(forest_poly(adjacency, root)) == deleted
                literal_checks += 1
            finite += 1
            continue

        if all(flags):
            all_long += 1
        else:
            mixed += 1
        baseline = 1 + sum(base_lengths(flat))
        shift = max(0, 27 - baseline)
        sampled = [[] for _ in range(4)]
        for sample in range(SAMPLES):
            lengths = ray_lengths(flat, flags, shift + sample)
            core, deleted = polys(lengths)
            for rank, delta in enumerate(DELTAS):
                sampled[rank].append(delta(core, deleted))
            if literal_checks < 320 and sample in (0, 13, 28):
                adjacency, root = literal_tree(lengths)
                assert tuple(forest_poly(adjacency)) == core
                assert tuple(forest_poly(adjacency, root)) == deleted
                literal_checks += 1
        coefficients = tuple(differences(row) for row in sampled)
        for rank, row in enumerate(coefficients):
            degree = DEGREE_BOUNDS[rank]
            assert row[0] > 0 and row[1] > 0 and min(row[2 : degree + 1]) >= 0, (key, rank, row)
            assert all(value == 0 for value in row[degree + 1 :])
            witness = {"key": key, "baseline_order": baseline, "order_shift": shift}
            stats = minima[str(rank)]
            update_min(stats, "d0", row[0], {**witness, "power": 0, "value": row[0]})
            update_min(stats, "d1", row[1], {**witness, "power": 1, "value": row[1]})
            higher = min(row[2 : degree + 1])
            power = 2 + row[2 : degree + 1].index(higher)
            update_min(stats, "higher", higher, {**witness, "power": power, "value": higher})
            zero_higher += sum(value == 0 for value in row[2 : degree + 1])
        stream_update(coefficient_digest, [key, baseline, shift, coefficients])
        rays += 1

    assert (all_short, finite, mixed, all_long, rays) == (16464, 3850, 21167, 1, 21168)
    payload = {
        "schema": "rank8-delta03-e4-bistar-cubic-leaf-all-order-exact-agent-v1",
        "status": "PASS_EXACT_RANK8_DELTA03_E4_BISTAR_CUBIC_LEAF_N27_PLUS",
        "theorem": "For a cubic-side terminal leaf root in every quartic--cubic e=4 bistar subdivision and every n>=27, Delta0 through Delta3 are strictly positive.",
        "root_orbit": "quartic_cubic_bistar:cubic_leaf",
        "quotient_counts": {"all_short_total": all_short, "all_short_n27_plus": finite, "mixed_rays": mixed, "all_long_rays": all_long, "non_all_short_rays": rays},
        "rank_ray_samples": rays * 4 * SAMPLES,
        "samples_per_rank_ray": SAMPLES,
        "degree_bounds": {str(i): value for i, value in enumerate(DEGREE_BOUNDS)},
        "newton_gate": "d0>0,d1>0,d2..d_degree>=0 and coefficients above the proven degree vanish",
        "minimum_values_and_coefficients": minima,
        "zero_higher_coefficients": zero_higher,
        "coefficient_stream_sha256": coefficient_digest.hexdigest().upper(),
        "finite_value_stream_sha256": finite_digest.hexdigest().upper(),
        "literal_formula_self_checks": literal_checks,
        "immutable_input_hashes": actual,
        "runtime_seconds": time.perf_counter() - started,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": "Exactly the cubic-leaf root orbit; the other 17 not-yet-closed e=4 root orbits remain separate after combining with the two branch roots.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("FINITE", finite, "RAYS", rays, "RANK_SAMPLES", payload["rank_ray_samples"])
    print("STREAM", payload["coefficient_stream_sha256"], payload["finite_value_stream_sha256"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
