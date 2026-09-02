#!/usr/bin/env python3
"""Search exact disjoint midpoint AM-GM payments on the mixed zero-slack faces."""

from __future__ import annotations

import argparse
import json

from diagnose_rank8_low_low_a23_mixed_faces_zero_slack_exact_root import build


def candidate_rows(positive, negative, limit):
    result = {}
    for target, demand in negative.items():
        options = []
        for low, low_capacity in positive.items():
            high = tuple(2 * target[i] - low[i] for i in range(len(target)))
            if min(high) < 0 or low >= high or high not in positive:
                continue
            four_product = 4 * low_capacity * positive[high]
            if four_product >= demand * demand:
                options.append((low, high, four_product - demand * demand))
        result[target] = sorted(options, key=lambda row: (row[2], row[0], row[1]))[:limit]
    return result


def disjoint_matching(candidate_map, node_limit):
    nodes = 0

    def search(remaining, used, selected):
        nonlocal nodes
        nodes += 1
        if nodes > node_limit:
            return None
        if not remaining:
            return dict(selected)
        available = {
            target: [
                row for row in candidate_map[target]
                if row[0] not in used and row[1] not in used
            ]
            for target in remaining
        }
        target = min(remaining, key=lambda item: (len(available[item]), item))
        if not available[target]:
            return None
        next_remaining = tuple(item for item in remaining if item != target)
        for row in available[target]:
            selected[target] = row
            answer = search(next_remaining, used | {row[0], row[1]}, selected)
            if answer is not None:
                return answer
            del selected[target]
        return None

    answer = search(tuple(candidate_map), set(), {})
    return answer, nodes


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--candidate-limit", type=int, default=128)
    parser.add_argument("--node-limit", type=int, default=1_000_000)
    args = parser.parse_args()
    output = {}
    for face in ((0, 1), (1, 0)):
        face_rows = {}
        for label, polynomial in build(face).items():
            terms = {
                tuple(map(int, monomial)): int(coefficient)
                for monomial, coefficient in polynomial.terms()
            }
            positive = {key: value for key, value in terms.items() if value > 0}
            negative = {key: -value for key, value in terms.items() if value < 0}
            candidates = candidate_rows(positive, negative, args.candidate_limit)
            if negative and all(candidates.values()):
                selected, nodes = disjoint_matching(candidates, args.node_limit)
            else:
                selected, nodes = ({} if not negative else None), 0
            row = {
                "terms": len(terms),
                "negative_terms": len(negative),
                "candidate_minimum": min(map(len, candidates.values())) if candidates else None,
                "candidate_maximum": max(map(len, candidates.values())) if candidates else None,
                "search_nodes": nodes,
                "disjoint_matching": selected is not None,
            }
            if selected is not None:
                row["allocations"] = [
                    {
                        "negative_monomial": list(target),
                        "demand": negative[target],
                        "source_low": {
                            "monomial": list(source[0]),
                            "capacity": positive[source[0]],
                        },
                        "source_high": {
                            "monomial": list(source[1]),
                            "capacity": positive[source[1]],
                        },
                        "slack": source[2],
                    }
                    for target, source in sorted(selected.items())
                ]
            face_rows[label] = row
            print(face, label, row["negative_terms"], row["candidate_minimum"], row["disjoint_matching"], nodes, flush=True)
        output[",".join(map(str, face))] = face_rows
    print(json.dumps(output, separators=(",", ":")), flush=True)


if __name__ == "__main__":
    main()
