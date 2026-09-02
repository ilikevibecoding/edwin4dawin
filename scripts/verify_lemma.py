#!/usr/bin/env python3
"""Verify the descent-propagation lemma; print one PASS/FAIL line per check.

Lemma: if p_{r-1} >= p_r > 0, WR_r (p_{r-1} <= r p_r) and ISO_r
(Q_r = r p_r^2 + p_{r-1}^2 - (r+1) p_{r-1} p_{r+1} >= 0) hold, then
p_{r+1} <= p_r.  Exit status is 0 iff every check passes.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from erdos993.lemma import factored_difference, lemma_checks  # noqa: E402


def main() -> int:
    print(f"sympy.factor((r+1) - r*x - 1/x) = {factored_difference()}")
    results = lemma_checks()
    for name, passed in results:
        print(f"{'PASS' if passed else 'FAIL'}: {name}")
    ok = all(passed for _, passed in results)
    print("RESULT: descent-propagation lemma", "VERIFIED" if ok else "NOT VERIFIED")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
