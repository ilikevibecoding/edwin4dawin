#!/usr/bin/env python3
"""Fast filtered search in the normalized deletion/contraction family.

Unlike the broader companion probe, this skips every model unless h/x and
g'/x numerically interlace, and performs exact replay only on a suspected
endpoint failure.  It is intended to search many more root geometries.
"""

from __future__ import annotations

import json
import random
from pathlib import Path

import numpy as np

from probe_common_double_root_random_fast import (
    derivative_ascending, nonreal_count, poly_from_roots_ascending, target_line,
)
from probe_normalized_deletion_contraction_threshold import (
    alternating_real_roots, exact_replay,
)


OUT = Path("normalized_double_proper_filtered_fast_probe_20260802.json")
RNG = random.Random(993_20260802 + 31)


def main() -> None:
    records = []
    witness = None
    total_lines = 0
    for N in range(4, 25):
        d = 2*N//3+1
        attempts = 0
        accepted = 0
        target_accepts = 700 if N <= 12 else 300
        maximum_attempts = 18000
        while accepted < target_accepts and attempts < maximum_attempts:
            attempts += 1
            n = N-2
            mode = attempts % 7
            if mode == 0:
                weights = [RNG.randint(1, 1000) for _ in range(n)]
            elif mode == 1:
                weights = [1+RNG.randint(0, 15)**2 for _ in range(n)]
            elif mode == 2:
                weights = [1+RNG.randint(0, 7)**3 for _ in range(n)]
            elif mode == 3:
                weights = [RNG.randint(1, 5)*10**RNG.randint(0, 3) for _ in range(n)]
            elif mode == 4:
                weights = sorted([RNG.randint(1, 1000) for _ in range(n)])
            elif mode == 5:
                weights = sorted([RNG.randint(1, 1000) for _ in range(n)], reverse=True)
            else:
                # Perturb the actual root-like geometric decay without using
                # the actual hypergeometric polynomial.
                ratio = RNG.uniform(1.25, 2.8)
                weights = [max(1, int(10**6/ratio**k * RNG.uniform(.7, 1.3)))
                           for k in range(n)]
            scale = N*(2*N-3)/sum(weights)
            magnitudes = [scale*w for w in weights]
            a = poly_from_roots_ascending([0.0, 0.0]+[-r for r in magnitudes])
            idx = np.arange(len(a), dtype=float)
            L = 2*N-3
            g = a*(idx+N-3)/L
            h = a*(N-idx)/L
            while len(h) > 1 and abs(h[-1]) < 1e-8*max(1.0, np.max(np.abs(h))):
                h = h[:-1]
            if not alternating_real_roots(derivative_ascending(g)[1:], h[1:]):
                continue
            accepted += 1
            for _ in range(18):
                line = (RNG.randint(-500, 200), RNG.randint(1, 140),
                        RNG.randint(-500, 200), RNG.randint(1, 140))
                coeffs = target_line(g, h, d, *line)
                total_lines += 1
                if nonreal_count(coeffs):
                    candidate = exact_replay(weights, N, d, line)
                    if (candidate is not None
                            and candidate["h_proper_gprime_exact_alternation"]):
                        witness = candidate
                        break
            if witness is not None:
                break
        rec = {"N": N, "d": d, "attempts": attempts,
               "accepted_h_proper_gprime": accepted,
               "exact_failure": int(witness is not None)}
        records.append(rec)
        print(rec, flush=True)
        if witness is not None:
            break
    report = {
        "kind": "normalized_double_proper_filtered_fast_probe",
        "date": "2026-08-02",
        "status": "EXACT_COUNTEREXAMPLE" if witness else "NO_COUNTEREXAMPLE_IN_FILTERED_FAST_PROBE",
        "pair": "g=(E+N-3)a/(2N-3), h=(N-E)a/(2N-3)",
        "extra_hypothesis": "h/x interlaces g'/x",
        "threshold": "d=floor(2N/3)+1",
        "records": records,
        "screened_lines": total_lines,
        "witness": witness,
        "warning": "Finite numerical screening is evidence only; a reported failure is replayed exactly.",
    }
    OUT.write_text(json.dumps(report, indent=2)+"\n", encoding="utf-8")
    print(json.dumps({"status": report["status"], "lines": total_lines,
                      "output": str(OUT.resolve())}, indent=2))


if __name__ == "__main__":
    main()
