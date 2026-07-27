#!/usr/bin/env python3
"""Certify everything humanity currently knows about the Hadwiger-Nelson
problem (the chromatic number of the plane, posed ~1950):

    5  <=  chi(R^2)  <=  7      -- and that is where it still stands.

Run:  python3 verify.py [--graphs 529,510] [--figures] [--workdir DIR]

Requires kissat and drat-trim for the >= 5 step (tools/get_solvers.sh
builds both from source; or set $KISSAT / $DRAT_TRIM).
"""

from __future__ import annotations

import argparse
import sys
import tempfile

from hadwiger_nelson.lower_bounds import five_chromatic_report, spindle_report
from hadwiger_nelson.upper_bound import verify_seven_coloring


def hr(title: str) -> None:
    print()
    print("=" * 74)
    print(title)
    print("=" * 74)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--graphs", default="529,510",
                    help="comma-separated 5-chromatic graphs from data/ (default: 529,510)")
    ap.add_argument("--figures", action="store_true", help="render PNGs into figures/")
    ap.add_argument("--workdir", default=None, help="scratch dir for CNF/proof files")
    args = ap.parse_args()
    work = args.workdir or tempfile.mkdtemp(prefix="hadwiger-nelson-")

    hr("LOWER BOUND chi >= 4 : Moser spindle (Moser & Moser, 1961)")
    sp = spindle_report()
    print(f"  points: {sp['n']}   unit edges found from exact coordinates: {sp['edges']}")
    print("  every edge length verified == 1 exactly in Q(sqrt3, sqrt5, sqrt11)")
    print(f"  proper 3-colorings (exhaustive over 3^7 = 2187): {sp['proper_3_colorings']}")
    print(f"  a proper 4-coloring: {sp['coloring4']}")
    print("  => the spindle needs 4 colors; so does the plane.          chi(R^2) >= 4")

    five = None
    hr("LOWER BOUND chi >= 5 : 5-chromatic unit-distance graphs (de Grey 2018 era)")
    for name in [g.strip() for g in args.graphs.split(",") if g.strip()]:
        r = five_chromatic_report(name, work)
        five = five or r
        print(f"  G{name}: {r['n']} vertices, {r['edges']} edges")
        print(f"    exact check: all {r['edges']} edges have length exactly 1 "
              f"({r['time_exact_edge_check_s']}s)")
        print(f"    recomputed unit pairs from coordinates alone: identical edge set "
              f"({r['time_recompute_edges_s']}s)")
        print(f"    4-coloring: UNSAT by kissat ({r['time_unsat_s']}s); DRAT proof "
              f"verified by drat-trim ({r['time_drat_check_s']}s)")
        print(f"    5-coloring: found by kissat ({r['time_5coloring_s']}s) and "
              f"checked proper on every edge")
        print(f"    => chi(G{name}) = 5 exactly.                        chi(R^2) >= 5")

    hr("UPPER BOUND chi <= 7 : hexagonal tiling (Hadwiger 1945 / Isbell ~1950)")
    seven = verify_seven_coloring()
    print(f"  hexagon circumradius s = {seven['scale']} (all checks exact rationals)")
    print(f"  same hexagon      => distance <= 2s = {seven['same_cell_max_dist']} < 1")
    print(f"  same color, different hexagons => squared center distance "
          f">= 21 s^2 = {seven['center_gap_sq']}")
    print(f"    (minimum of m^2+mn+n^2 over the color-0 sublattice: "
          f"{seven['min_same_color_norm']}, by finite enumeration)")
    print(f"  needed: 21 s^2 > (1+2s)^2 = {seven['needed_gap_sq']}  -- holds")
    print("  => no two points at distance 1 share a color.              chi(R^2) <= 7")

    if args.figures:
        from hadwiger_nelson.figures import render_all
        for p in render_all(sp, five, "figures"):
            print(f"  wrote {p}")

    hr("VERDICT")
    print("  Certified today, on this machine:   5 <= chi(R^2) <= 7")
    print("  Value of chi(R^2): STILL OPEN since ~1950. Nobody knows if it is 5, 6 or 7.")
    print("  (It may even depend on the axiom of choice -- Shelah & Soifer 2003.)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
