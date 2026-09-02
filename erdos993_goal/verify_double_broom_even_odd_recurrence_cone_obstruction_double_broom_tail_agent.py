#!/usr/bin/env python3
"""Exact obstruction to the natural even/odd recurrence-state cone.

This does not refute the double-broom diagonal inequality.  It refutes the
specific attempt to prove it by pairing cleared one-index numerator states
``(N_0,N_1)``, ``(N_2,N_3)``, ``(N_4,N_5)`` and requiring every paired
inverse-denominator contribution to have nonnegative diagonals.  It also
refutes every hard partition of the six states into independent nonnegative
blocks (including every non-contiguous assignment) and the
obvious repair that transfers a rank-independent fraction of ``N_2`` to the
leading pair, even if all later states are pooled to fund the transfer.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from prove_iso_double_broom_diagonal_gap_agent import (
    all_diagonal_values,
    literal_terminal,
    p,
    sha256,
    w,
    z,
)
from prove_iso_double_broom_mixed_reduction_agent import phi


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "double_broom_even_odd_recurrence_cone_obstruction_exact_double_broom_tail_agent_20260829.json"
v = sp.symbols("v")


def main() -> None:
    # Corrected one-index denominator: differentiation makes every primitive
    # factor double.  Its inverse coefficients K_r are explicit positive sums.
    denominator = sp.expand((1 - v * phi) ** 2 * (1 - v * z) ** 2 * (1 - v * w) ** 2)
    d = [denominator.coeff(v, k) for k in range(7)]
    max_index = 12
    gaps = [
        sp.expand(
            literal_terminal(6, 0, j)
            - literal_terminal(5, 0, j)
            - p * literal_terminal(4, 0, j)
        )
        for j in range(max_index + 1)
    ]
    states = [
        sp.expand(sum(d[k] * gaps[j - k] for k in range(min(6, j) + 1)))
        for j in range(max_index + 1)
    ]
    assert all(state == 0 for state in states[6:])

    inverse = []
    for index in range(max_index + 1):
        value = 0
        for a in range(index + 1):
            for b in range(index - a + 1):
                c = index - a - b
                value += (a + 1) * (b + 1) * (c + 1) * phi**a * z**b * w**c
        inverse.append(sp.expand(value))

    # Check D(v) * sum K_r v^r = 1 to the replay bound, and then replay the
    # literal gap sequence from the six cleared numerator states.
    inverse_checks = reconstruction_checks = 0
    for index in range(max_index + 1):
        coefficient = sp.expand(
            sum(d[k] * inverse[index - k] for k in range(min(6, index) + 1))
        )
        assert coefficient == (1 if index == 0 else 0)
        inverse_checks += 1
        reconstructed = sp.expand(
            sum(inverse[index - t] * states[t] for t in range(min(5, index) + 1))
        )
        assert sp.expand(reconstructed - gaps[index]) == 0
        reconstruction_checks += 1

    # Natural leading even/odd pairing at target j=2.
    pair01 = sp.expand(inverse[2] * states[0] + inverse[1] * states[1])
    compensating_state2 = states[2]
    full_gap = gaps[2]
    pair01_diagonal = [int(value) for value in all_diagonal_values(pair01)]
    state2_diagonal = [int(value) for value in all_diagonal_values(compensating_state2)]
    full_gap_diagonal = [int(value) for value in all_diagonal_values(full_gap)]
    rank = 3
    assert pair01_diagonal[rank] == -54
    assert state2_diagonal[rank] == 70
    assert full_gap_diagonal[rank] == 16
    assert pair01_diagonal[rank] + state2_diagonal[rank] == full_gap_diagonal[rank]

    # No constant scalar lambda can repair the first pair by transferring
    # lambda*K_(j-2)N2 from the second pair.  Two exact cells at j=12 force
    # incompatible lower and upper bounds.
    split_index = 12
    split_carrier = sp.expand(inverse[split_index - 2] * states[2])
    split_leading = sp.expand(
        inverse[split_index] * states[0]
        + inverse[split_index - 1] * states[1]
    )
    split_second = sp.expand(
        inverse[split_index - 2] * states[2]
        + inverse[split_index - 3] * states[3]
    )
    split_carrier_diagonal = all_diagonal_values(split_carrier)
    split_leading_diagonal = all_diagonal_values(split_leading)
    split_second_diagonal = all_diagonal_values(split_second)
    lower_rank = 16
    upper_rank = 8
    assert split_leading_diagonal[lower_rank] == -3506
    assert split_carrier_diagonal[lower_rank] == 3880
    assert split_second_diagonal[upper_rank] == 618640
    assert split_carrier_diagonal[upper_rank] == 1266132
    lower_bound = sp.Rational(3506, 3880)
    upper_bound = sp.Rational(618640, 1266132)
    assert lower_bound == sp.Rational(1753, 1940)
    assert upper_bound == sp.Rational(154660, 316533)
    assert lower_bound > upper_bound

    # Every nontrivial contiguous cut N0..Nc | N(c+1)..N5 has an exact
    # negative block diagonal.  These five witnesses exhaust all cuts.
    contiguous_specs = [
        (0, "right", 1, 3, -259),
        (1, "left", 2, 3, -54),
        (2, "right", 3, 4, -544),
        (3, "left", 5, 5, -960),
        (4, "right", 5, 5, -69),
    ]
    contiguous_witnesses = []
    for cut_after, side, index, witness_rank, expected in contiguous_specs:
        state_range = (
            range(0, cut_after + 1)
            if side == "left"
            else range(cut_after + 1, 6)
        )
        block = sp.expand(
            sum(
                inverse[index - t] * states[t]
                for t in state_range
                if t <= index
            )
        )
        block_diagonal = all_diagonal_values(block)
        assert block_diagonal[witness_rank] == expected
        contiguous_witnesses.append(
            {
                "cut": f"N0..N{cut_after} | N{cut_after + 1}..N5",
                "failed_side": side,
                "newton_pair": [0, index],
                "rank": witness_rank,
                "value": expected,
            }
        )

    # Stronger than a global-constant obstruction: even lambda=lambda_j is
    # impossible.  At the single index j=4, give the leading pair lambda*C2
    # and allow *all* remaining states to fund the transfer.  Two ranks force
    # incompatible bounds.
    index_split = 4
    index_leading = sp.expand(
        inverse[index_split] * states[0]
        + inverse[index_split - 1] * states[1]
    )
    index_carrier = sp.expand(inverse[index_split - 2] * states[2])
    index_full = gaps[index_split]
    index_leading_diagonal = all_diagonal_values(index_leading)
    index_carrier_diagonal = all_diagonal_values(index_carrier)
    index_full_diagonal = all_diagonal_values(index_full)
    index_lower_rank = 8
    index_upper_rank = 4
    assert index_leading_diagonal[index_lower_rank] == -498
    assert index_carrier_diagonal[index_lower_rank] == 600
    assert index_leading_diagonal[index_upper_rank] == -1098
    assert index_carrier_diagonal[index_upper_rank] == 1540
    assert index_full_diagonal[index_upper_rank] == 50
    index_tail_at_upper = (
        index_full_diagonal[index_upper_rank]
        - index_leading_diagonal[index_upper_rank]
    )
    assert index_tail_at_upper == 1148
    index_lower_bound = sp.Rational(498, 600)
    index_upper_bound = sp.Rational(index_tail_at_upper, 1540)
    assert index_lower_bound == sp.Rational(83, 100)
    assert index_upper_bound == sp.Rational(41, 55)
    assert index_lower_bound > index_upper_bound

    # Exhaust all unique nontrivial hard bipartitions.  Fix N0 on the left to
    # quotient by swapping the two blocks.  Every one of the 31 masks has a
    # literal negative block diagonal by j<=5.  This also rules out a hard
    # partition into any larger number of independently nonnegative blocks,
    # since such a partition can be coarsened to a nontrivial bipartition.
    hard_contributions = {}
    for index in range(6):
        for state_index in range(6):
            if state_index <= index:
                hard_contributions[index, state_index] = all_diagonal_values(
                    sp.expand(inverse[index - state_index] * states[state_index])
                )
            else:
                hard_contributions[index, state_index] = []
    hard_partition_witnesses = []
    hard_signature_counts = {}
    for mask in range(1, 1 << 6):
        if not (mask & 1) or mask == (1 << 6) - 1:
            continue
        left_states = [state for state in range(6) if (mask >> state) & 1]
        right_states = [state for state in range(6) if not ((mask >> state) & 1)]
        witness = None
        for index in range(6):
            maximum_rank = max(
                [len(hard_contributions[index, state]) for state in range(6)]
                + [0]
            )
            for witness_rank in range(maximum_rank):
                left_value = sum(
                    hard_contributions[index, state][witness_rank]
                    if witness_rank < len(hard_contributions[index, state])
                    else 0
                    for state in left_states
                )
                right_value = sum(
                    hard_contributions[index, state][witness_rank]
                    if witness_rank < len(hard_contributions[index, state])
                    else 0
                    for state in right_states
                )
                if left_value < 0 or right_value < 0:
                    witness = {
                        "left_states": left_states,
                        "right_states": right_states,
                        "newton_pair": [0, index],
                        "rank": witness_rank,
                        "left_value": int(left_value),
                        "right_value": int(right_value),
                        "failed_side": "left" if left_value < 0 else "right",
                    }
                    signature = (
                        index,
                        witness_rank,
                        int(left_value),
                        int(right_value),
                        witness["failed_side"],
                    )
                    hard_signature_counts[signature] = (
                        hard_signature_counts.get(signature, 0) + 1
                    )
                    break
            if witness is not None:
                break
        assert witness is not None
        hard_partition_witnesses.append(witness)
    assert len(hard_partition_witnesses) == 31
    assert max(witness["newton_pair"][1] for witness in hard_partition_witnesses) <= 5

    stream = hashlib.sha256()
    for index, coefficient in enumerate(d):
        stream.update(f"D,{index},{sp.srepr(coefficient)};".encode())
    for index in range(6):
        stream.update(f"N,{index},{sp.srepr(states[index])};".encode())
    stream.update(f"P01,2,{sp.srepr(pair01)};".encode())
    stream.update(f"G,2,{sp.srepr(full_gap)};".encode())
    stream.update(f"SPLIT_C,12,{sp.srepr(split_carrier)};".encode())
    stream.update(f"SPLIT_A,12,{sp.srepr(split_leading)};".encode())
    stream.update(f"SPLIT_B,12,{sp.srepr(split_second)};".encode())
    stream.update(f"INDEX_SPLIT_A,4,{sp.srepr(index_leading)};".encode())
    stream.update(f"INDEX_SPLIT_C,4,{sp.srepr(index_carrier)};".encode())
    for witness in contiguous_witnesses:
        stream.update(f"CUT,{json.dumps(witness, sort_keys=True)};".encode())
    for witness in hard_partition_witnesses:
        stream.update(f"HARD,{json.dumps(witness, sort_keys=True)};".encode())

    report = {
        "marker": "FOUND_EXACT_DOUBLE_BROOM_ALL_HARD_STATE_PARTITIONS_AND_INDEX_SCALAR_RECURRENCE_CONE_OBSTRUCTIONS",
        "claim_refuted": (
            "The natural pairing of cleared numerator states (N0,N1), "
            "(N2,N3), (N4,N5) is an invariant cone whose every paired "
            "inverse-denominator contribution has nonnegative diagonals."
        ),
        "not_refuted": (
            "The connected double-broom diagonal gap itself; the omitted N2 "
            "state compensates the negative leading pair at this cell."
        ),
        "one_index_slice": "i=0, generating variable v for j",
        "path_order": 6,
        "target_newton_pair": [0, 2],
        "target_rank": rank,
        "denominator": str(sp.factor(denominator)),
        "denominator_degree": int(sp.degree(denominator, v)),
        "cleared_state_support": [0, 5],
        "leading_pair_diagonal": pair01_diagonal,
        "compensating_N2_diagonal": state2_diagonal,
        "full_gap_diagonal": full_gap_diagonal,
        "exact_payment_at_target_rank": {
            "leading_pair_N0_N1": -54,
            "compensating_N2": 70,
            "full_gap": 16,
            "identity": "-54 + 70 = 16",
        },
        "constant_N2_split_obstruction": {
            "split_rule": (
                "add lambda*K_(j-2)N2 to pair (N0,N1) and subtract it "
                "from pair (N2,N3)"
            ),
            "newton_pair": [0, split_index],
            "lower_bound_witness": {
                "rank": lower_rank,
                "leading_pair": -3506,
                "split_carrier": 3880,
                "required": "lambda >= 1753/1940",
            },
            "upper_bound_witness": {
                "rank": upper_rank,
                "second_pair": 618640,
                "split_carrier": 1266132,
                "required": "lambda <= 154660/316533",
            },
            "bounds": [str(lower_bound), str(upper_bound)],
            "cross_product_gap": int(
                lower_bound.p * upper_bound.q - upper_bound.p * lower_bound.q
            ),
            "conclusion": "no real constant lambda satisfies both exact cells",
        },
        "contiguous_two_block_obstruction": {
            "claim_refuted": (
                "There is a nontrivial contiguous cut of N0,...,N5 into two "
                "blocks whose inverse-denominator contributions both have "
                "nonnegative diagonals."
            ),
            "cuts_exhausted": 5,
            "witnesses": contiguous_witnesses,
        },
        "all_hard_state_partitions_obstruction": {
            "claim_refuted": (
                "The six cleared numerator states can be assigned without "
                "splitting to two or more independent blocks whose inverse-"
                "denominator contributions all have nonnegative diagonals."
            ),
            "unique_bipartitions_after_fixing_N0_left": 31,
            "unique_bipartitions_refuted": len(hard_partition_witnesses),
            "maximum_witness_newton_index": max(
                witness["newton_pair"][1] for witness in hard_partition_witnesses
            ),
            "signature_histogram": [
                {
                    "newton_index": signature[0],
                    "rank": signature[1],
                    "left_value": signature[2],
                    "right_value": signature[3],
                    "failed_side": signature[4],
                    "partition_count": count,
                }
                for signature, count in sorted(hard_signature_counts.items())
            ],
            "witnesses": hard_partition_witnesses,
            "larger_partition_corollary": (
                "Any partition into at least two independently nonnegative "
                "hard blocks coarsens to a nontrivial bipartition, so none exists."
            ),
        },
        "index_dependent_scalar_N2_split_obstruction": {
            "strength": (
                "lambda may depend on j, and all N2..N5 states are pooled "
                "to fund the tail side; lambda is only required to be rank-independent"
            ),
            "newton_pair": [0, index_split],
            "lower_bound_witness": {
                "rank": index_lower_rank,
                "leading_pair": -498,
                "split_carrier": 600,
                "required": "lambda_4 >= 83/100",
            },
            "upper_bound_witness": {
                "rank": index_upper_rank,
                "all_later_states_before_transfer": 1148,
                "split_carrier": 1540,
                "full_gap": 50,
                "required": "lambda_4 <= 41/55",
            },
            "bounds": [str(index_lower_bound), str(index_upper_bound)],
            "cross_product_gap": int(
                index_lower_bound.p * index_upper_bound.q
                - index_upper_bound.p * index_lower_bound.q
            ),
            "conclusion": (
                "no real rank-independent lambda_4 works, so an arbitrary "
                "index-dependent scalar sequence lambda_j cannot repair the cone"
            ),
        },
        "inverse_series_checks": inverse_checks,
        "literal_reconstruction_checks": reconstruction_checks,
        "value_stream_sha256": stream.hexdigest().upper(),
        "source_sha256": sha256(Path(__file__).resolve()),
        "dependency_sha256": {
            "literal_gap_source": sha256(HERE / "prove_iso_double_broom_diagonal_gap_agent.py"),
            "mixed_source": sha256(HERE / "prove_iso_double_broom_mixed_reduction_agent.py"),
            "corrected_generating_source": sha256(
                HERE / "derive_iso_double_broom_diagonal_gap_newton_generating_agent.py"
            ),
            "corrected_generating_report": sha256(
                HERE / "iso_double_broom_diagonal_gap_newton_generating_exact_agent_20260829.json"
            ),
        },
        "remaining_obligation": (
            "Use a genuinely fractional rank-sensitive/operator-valued "
            "cross-payment, a cone not induced by hard state grouping, or "
            "another exact route."
        ),
        "scope_guard": (
            "Exact finite counterexample to one proposed recurrence cone only; "
            "not a counterexample to the double-broom theorem, arbitrary-forest "
            "ISO, or Erdős Problem 993."
        ),
    }
    OUTPUT.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(json.dumps({**report, "report_sha256": sha256(OUTPUT)}, indent=2))


if __name__ == "__main__":
    main()
