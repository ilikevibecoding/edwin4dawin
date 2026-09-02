"""Certify that the WROM enumeration is complete up to NMAX.

For every n <= NMAX the canonical form (AHU nested tuple, rooted at the centre)
of every level sequence produced by ``wrom_level_sequences(n)`` is computed;
the forms are required to be pairwise distinct and their number to equal
Otter's count ``free_tree_counts(n)[n]`` computed from the recurrence.  Since
the canonical form is an isomorphism invariant, t(n) pairwise-distinct forms
are t(n) isomorphism classes, i.e. the enumeration is complete.

Canonical forms are stored as compact parenthesis strings to keep memory
modest (n = 22: 5.6M strings).  Output: reports/tree_distinctness_certificate.json

Usage: python3 certify_distinct.py NMAX
"""

from __future__ import annotations

import hashlib
import json
import os
import sys
import time

from counts import free_tree_counts
from treegen import canonical_form, level_sequence_to_parents, wrom_level_sequences

HERE = os.path.dirname(os.path.abspath(__file__))


def paren(t) -> str:
    return "(" + "".join(paren(c) for c in t) + ")"


def main() -> int:
    nmax = int(sys.argv[1]) if len(sys.argv) > 1 else 22
    counts = free_tree_counts(nmax)
    rows = []
    ok = True
    for n in range(1, nmax + 1):
        t0 = time.time()
        seen = set()
        dup = 0
        h = hashlib.sha256()
        for ls in wrom_level_sequences(n):
            s = paren(canonical_form(level_sequence_to_parents(ls)))
            if s in seen:
                dup += 1
            else:
                seen.add(s)
        for s in sorted(seen):
            h.update(s.encode())
            h.update(b"\n")
        row = {
            "n": n,
            "distinct_canonical_forms": len(seen),
            "duplicates": dup,
            "otter_count": counts[n],
            "complete": dup == 0 and len(seen) == counts[n],
            "sha256_sorted_canonical_forms": h.hexdigest(),
            "seconds": round(time.time() - t0, 1),
        }
        ok &= row["complete"]
        rows.append(row)
        print(json.dumps(row), flush=True)
        del seen
    out = {"nmax": nmax, "all_complete": ok, "rows": rows,
           "marker": "PASS_TREE_ENUMERATION_DISTINCT_AND_COMPLETE" if ok else "FAIL"}
    with open(os.path.join(HERE, "reports", "tree_distinctness_certificate.json"), "w") as fh:
        json.dump(out, fh, indent=1)
    print(out["marker"])
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
