"""Command line interface.

    python3 -m erdos993 scan-trees N [--min-n M] [--res R --mod K] [--backend B] [--json]
    python3 -m erdos993 poly EDGELIST [--n N]
    python3 -m erdos993 poly --parents "0 1 1 2 2"
    python3 -m erdos993 verify-lemma
    python3 -m erdos993 counts [--max-trees N] [--max-forests N]
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from fractions import Fraction
from typing import Sequence

from .checks import (
    is_log_concave,
    iso_failures,
    iso_values,
    log_concavity_breaks,
    tail_cutoff,
    tail_failures,
    unimodality,
    unimodality_via_framework,
    wr_failures,
)
from .enumerate import verify_forest_counts, verify_tree_counts
from .indpoly import (
    independence_polynomial_forest,
    independence_polynomial_parent_array,
    poly_to_string,
)
from .lemma import verify_lemma
from .scan import OrderStats, Witness, scan_orders

SCAN_COLUMNS = (
    ("n", "n"),
    ("trees", "trees"),
    ("nonUM", "non_unimodal_trees"),
    ("LCbrk", "lc_break_pairs"),
    ("WRf(r<=L)", "wr_fail_cut_pairs"),
    ("WRf(all)", "wr_fail_all_pairs"),
    ("ISOf(all)", "iso_fail_pairs"),
    ("ISOf(r<=L)", "iso_fail_cut_pairs"),
    ("TAILf", "tail_fail_pairs"),
    ("uncert", "framework_gap_trees"),
)


def _fmt_witness_value(value) -> str:
    if isinstance(value, Fraction):
        return f"{value.numerator}/{value.denominator}"
    return str(value)


def _witness_line(label: str, w: Witness | None) -> str:
    if w is None:
        return f"{label}: none"
    where = "" if w.r is None else f" r={w.r}"
    value = "" if w.value is None else f" value={_fmt_witness_value(w.value)}"
    return f"{label}:{where}{value} parents={' '.join(map(str, w.parents))} poly={w.poly}"


def format_scan_table(rows: Sequence[OrderStats]) -> str:
    """Render the per-order statistics as a fixed-width text table."""
    header = [name for name, _ in SCAN_COLUMNS] + [
        "WRgap",
        "minQ",
        "@r",
        "minQ(r>=2)",
        "@r",
        "minSlack",
        "@r",
    ]
    table = [header]
    for s in rows:
        cells = [str(getattr(s, attr)) for _, attr in SCAN_COLUMNS]
        cells.append("-" if s.wr_fail_min_gap is None else str(s.wr_fail_min_gap))
        for w in (s.min_q, s.min_q_r_ge2, s.min_slack):
            if w is None:
                cells += ["-", "-"]
            else:
                cells += [_fmt_witness_value(w.value), str(w.r)]
        table.append(cells)
    widths = [max(len(row[i]) for row in table) for i in range(len(header))]
    lines = []
    for row in table:
        lines.append("  ".join(cell.rjust(widths[i]) for i, cell in enumerate(row)))
    return "\n".join(lines)


def _witness_json(w: Witness | None):
    if w is None:
        return None
    value = w.value
    if isinstance(value, Fraction):
        value = {"numerator": value.numerator, "denominator": value.denominator}
    return {"n": w.n, "r": w.r, "value": value, "parents": list(w.parents), "poly": list(w.poly)}


def _stats_json(s: OrderStats) -> dict:
    out = {attr: getattr(s, attr) for _, attr in SCAN_COLUMNS}
    out.update(
        {
            "lc_break_trees": s.lc_break_trees,
            "wr_fail_cut_trees": s.wr_fail_cut_trees,
            "iso_fail_trees": s.iso_fail_trees,
            "lemma_inconsistent_trees": s.lemma_inconsistent_trees,
            "framework_certified_trees": s.framework_certified_trees,
            "min_q_r_histogram": {str(k): v for k, v in sorted(s.min_q_r_histogram.items())},
            "wr_fail_min_gap": s.wr_fail_min_gap,
            "min_q": _witness_json(s.min_q),
            "min_q_cut": _witness_json(s.min_q_cut),
            "min_q_r_ge2": _witness_json(s.min_q_r_ge2),
            "min_slack": _witness_json(s.min_slack),
            "non_unimodal_witness": _witness_json(s.non_unimodal_witness),
            "lc_break_witness": _witness_json(s.lc_break_witness),
            "wr_fail_cut_witness": _witness_json(s.wr_fail_cut_witness),
            "iso_fail_witness": _witness_json(s.iso_fail_witness),
            "tail_fail_witness": _witness_json(s.tail_fail_witness),
        }
    )
    return out


def cmd_scan_trees(args: argparse.Namespace) -> int:
    rows: list[OrderStats] = []
    for stats in scan_orders(args.N, min_n=args.min_n, res=args.res, mod=args.mod, backend=args.backend):
        rows.append(stats)
        if not args.json:
            print(f"n={stats.n}: {stats.trees} trees scanned", file=sys.stderr, flush=True)
    if args.json:
        json.dump([_stats_json(s) for s in rows], sys.stdout, indent=2)
        print()
        return 0
    print(format_scan_table(rows))
    print()
    print("Column legend: nonUM = trees with a non-unimodal sequence; LCbrk = (tree, r) pairs with")
    print("p_r^2 < p_{r-1} p_{r+1}; WRf = pairs with p_{r-1} > r p_r; ISOf = pairs with Q_r < 0;")
    print("TAILf = pairs with r >= L(alpha) and p_r < p_{r+1}; uncert = trees not certified by the")
    print("WR+ISO(r<=L)+TAIL framework; WRgap = min over trees of (first WR-failing r) - L;")
    print("minQ = min over trees and r of Q_r (Q_1 = 3n-1 for every tree); minQ(r>=2) = same over")
    print("r >= 2; minSlack = min of Q_r / (p_{r-1} p_r) = r x + 1/x - (r+1) y (exact rational).")
    print("L = ceil((2 alpha - 1)/3).")
    print()
    print("Witnesses (gentreeg parent arrays, 1-indexed; poly = [p_0, ..., p_alpha]):")
    for s in rows:
        print(f"n={s.n}")
        print("  " + _witness_line("min Q_r", s.min_q))
        print("  " + _witness_line("min Q_r (r<=L)", s.min_q_cut))
        print("  " + _witness_line("min Q_r (r>=2)", s.min_q_r_ge2))
        print("  " + _witness_line("min slack", s.min_slack))
        hist = ", ".join(f"r={r}: {c}" for r, c in sorted(s.min_q_r_histogram.items()))
        print(f"  argmin_r Q_r histogram over trees: {hist if hist else 'n/a'}")
        for label, w in (
            ("NON-UNIMODAL", s.non_unimodal_witness),
            ("LC break", s.lc_break_witness),
            ("WR failure (r<=L)", s.wr_fail_cut_witness),
            ("ISO failure", s.iso_fail_witness),
            ("TAIL failure", s.tail_fail_witness),
        ):
            if w is not None:
                print("  " + _witness_line(label, w))
        if s.lemma_inconsistent_trees:
            print(f"  LEMMA INCONSISTENCY in {s.lemma_inconsistent_trees} trees (should be impossible)")
    return 0


def parse_edge_list(text: str) -> list[tuple[int, int]]:
    """Parse an edge list such as ``"0-1,1-2,1-3"`` or ``"0 1 1 2 1 3"``.

    All non-negative integers in the text are read in order and paired up.
    """
    numbers = [int(tok) for tok in re.findall(r"\d+", text)]
    if len(numbers) % 2:
        raise ValueError("edge list must contain an even number of vertex labels")
    return [(numbers[i], numbers[i + 1]) for i in range(0, len(numbers), 2)]


def describe_polynomial(poly: Sequence[int]) -> str:
    """Multi-line human readable report on a coefficient sequence."""
    alpha = len(poly) - 1
    cutoff = tail_cutoff(alpha)
    um = unimodality(poly)
    fw = unimodality_via_framework(poly)
    wr_bad = wr_failures(poly)
    lines = [
        f"I(x) = {poly_to_string(poly)}",
        f"coefficients = {list(poly)}",
        f"alpha = {alpha}, L(alpha) = {cutoff}",
        f"unimodal = {um.unimodal} (mode range {um.mode_range}, maximum {um.maximum})",
        f"log-concave = {is_log_concave(poly)} (breaks at r = {log_concavity_breaks(poly)})",
        f"WR failures: all r = {wr_bad}; r <= L = {[r for r in wr_bad if r <= cutoff]}",
        f"ISO values Q_1..Q_{max(alpha - 1, 0)} = {iso_values(poly)}",
        f"ISO failures = {iso_failures(poly)}",
        f"tail failures (r >= L with p_r < p_(r+1)) = {tail_failures(poly)}",
        f"framework: hypotheses hold = {fw.hypotheses_hold}, certified unimodal = {fw.certified}, "
        f"case = {fw.case}, lemma applied at r = {fw.lemma_steps}",
    ]
    return "\n".join(lines)


def cmd_poly(args: argparse.Namespace) -> int:
    if args.parents is not None:
        parents = [int(tok) for tok in re.findall(r"\d+", args.parents)]
        poly = independence_polynomial_parent_array(parents)
    else:
        if args.edgelist is None:
            raise SystemExit("poly: give an EDGELIST or --parents")
        edges = parse_edge_list(args.edgelist)
        n = args.n if args.n is not None else (max((max(e) for e in edges), default=-1) + 1)
        poly = independence_polynomial_forest(n, edges)
    print(describe_polynomial(poly))
    return 0


def cmd_verify_lemma(args: argparse.Namespace) -> int:
    ok = verify_lemma(random_trials=args.trials, seed=args.seed)
    print(f"descent-propagation lemma verified: {ok}")
    return 0 if ok else 1


def cmd_counts(args: argparse.Namespace) -> int:
    trees = verify_tree_counts(args.max_trees, backend=args.backend)
    for n, (found, expected) in trees.items():
        print(f"trees   n={n:2d}: {found:6d} (A000055: {expected})")
    forests = verify_forest_counts(args.max_forests, backend=args.backend)
    for n, (found, expected) in forests.items():
        print(f"forests n={n:2d}: {found:6d} (A005195: {expected})")
    print("all counts match OEIS")
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="python3 -m erdos993", description=__doc__.strip().splitlines()[0])
    sub = parser.add_subparsers(dest="command", required=True)

    scan = sub.add_parser("scan-trees", help="scan all trees of order n <= N")
    scan.add_argument("N", type=int)
    scan.add_argument("--min-n", type=int, default=1)
    scan.add_argument("--res", type=int, default=None, help="gentreeg res (with --mod)")
    scan.add_argument("--mod", type=int, default=None, help="gentreeg mod (with --res)")
    scan.add_argument("--backend", choices=("auto", "gentreeg", "networkx"), default="auto")
    scan.add_argument("--json", action="store_true", help="emit JSON instead of a table")
    scan.set_defaults(func=cmd_scan_trees)

    poly = sub.add_parser("poly", help="independence polynomial of a forest")
    poly.add_argument("edgelist", nargs="?", default=None, help='e.g. "0-1,1-2,1-3"')
    poly.add_argument("--n", type=int, default=None, help="number of vertices (default: max label + 1)")
    poly.add_argument("--parents", default=None, help='gentreeg parent array, e.g. "0 1 1 2"')
    poly.set_defaults(func=cmd_poly)

    lemma = sub.add_parser("verify-lemma", help="run the sympy/brute-force lemma verification")
    lemma.add_argument("--trials", type=int, default=2000)
    lemma.add_argument("--seed", type=int, default=993)
    lemma.set_defaults(func=cmd_verify_lemma)

    counts = sub.add_parser("counts", help="verify tree/forest counts against OEIS")
    counts.add_argument("--max-trees", type=int, default=15)
    counts.add_argument("--max-forests", type=int, default=13)
    counts.add_argument("--backend", choices=("auto", "gentreeg", "networkx"), default="auto")
    counts.set_defaults(func=cmd_counts)
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
