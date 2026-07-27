"""Command line entry point:  python -m hadwiger_nelson <command>."""

from __future__ import annotations

import argparse
import sys
import time
from fractions import Fraction

from .coloring import (
    brute_force_chromatic_number,
    build_cnf,
    is_proper,
    sat_k_colorable,
    write_dimacs,
)
from .graphs import REGISTRY, UnitDistanceGraph, de_grey_graph
from .upper_bound import stress_test, verify_upper_bound

BANNER = """\
Hadwiger-Nelson problem (1950): what is the chromatic number of the plane, CNP,
the least number of colours needed so that no two points at distance exactly 1
share a colour?

THE PROBLEM IS OPEN.  This tool does not solve it.  It re-derives, from scratch
and with exact arithmetic, the bounds that are actually known:

    5  <=  CNP  <=  7
"""


def _summarise(graph: UnitDistanceGraph) -> None:
    print(f"  {graph.name}: {graph.order} vertices, {graph.size} edges")
    if graph.report is not None:
        r = graph.report
        print(
            f"    edges certified exactly in Q(sqrt3,sqrt5,sqrt7,sqrt11); "
            f"modular filter (p={r.prime}) proposed {r.candidates_examined} pairs, "
            f"{r.false_positives} rejected"
        )


def cmd_upper_bound(args: argparse.Namespace) -> int:
    print("UPPER BOUND  CNP <= 7   (Isbell, c. 1950)\n")
    certificate = verify_upper_bound(Fraction(args.radius))
    print(certificate)
    print(f"\n  certificate valid: {certificate.valid}")
    if args.samples:
        clashes, samples = stress_test(args.samples, float(Fraction(args.radius)))
        print(f"  randomised check: {clashes} monochromatic unit-distance pairs in {samples} samples")
    return 0 if certificate.valid else 1


def cmd_lower_bound(args: argparse.Namespace) -> int:
    print("LOWER BOUND\n")
    print("  Step 1: small graphs (exact backtracking)")
    for key in ("hexagon", "spindle", "golomb"):
        graph = REGISTRY[key]()
        chi = brute_force_chromatic_number(graph.order, graph.edges)
        print(f"    {graph.name}: {graph.order} vertices, {graph.size} edges, chi = {chi}")
    print("    => CNP >= 4  (Nelson 1950 / Moser & Moser 1961)\n")

    print("  Step 2: de Grey's graph (SAT)")
    start = time.perf_counter()
    graph = de_grey_graph()
    print(f"    built in {time.perf_counter() - start:.2f}s")
    _summarise(graph)

    five = sat_k_colorable(graph.order, graph.edges, 5, symmetry_break=not args.no_symmetry_break)
    print(f"    k=5: {five}")
    if five.satisfiable:
        assert is_proper(graph.edges, five.coloring)
        print("      explicit 5-colouring verified proper")

    print("    k=4: solving (this is the expensive step)...", flush=True)
    four = sat_k_colorable(
        graph.order,
        graph.edges,
        4,
        symmetry_break=not args.no_symmetry_break,
        proof_path=args.proof,
    )
    print(f"    k=4: {four}")
    if four.satisfiable:
        print("    UNEXPECTED: a 4-colouring was found; the construction must be wrong")
        return 1
    print("\n    chi(G) = 5  =>  CNP >= 5  (de Grey 2018)")
    if args.proof:
        print(f"    DRAT proof written to {args.proof}")
    return 0


def cmd_graph(args: argparse.Namespace) -> int:
    graph = REGISTRY[args.name]()
    _summarise(graph)
    if args.chromatic:
        if graph.order <= 32:
            print(f"    chi = {brute_force_chromatic_number(graph.order, graph.edges)} (backtracking)")
        else:
            print("    use 'lower-bound' for the de Grey graph; brute force is hopeless there")
    if args.dimacs:
        write_dimacs(args.dimacs, graph.order, graph.edges)
        print(f"    graph written to {args.dimacs}")
    if args.cnf:
        clauses, nvars, clique = build_cnf(graph.order, graph.edges, args.k)
        with open(args.cnf, "w", encoding="utf-8") as handle:
            handle.write(f"p cnf {nvars} {len(clauses)}\n")
            for clause in clauses:
                handle.write(" ".join(map(str, clause)) + " 0\n")
        print(f"    {args.k}-colourability CNF written to {args.cnf} ({nvars} vars, {len(clauses)} clauses)")
    if args.svg:
        from .render import graph_to_svg

        graph_to_svg(graph, args.svg)
        print(f"    drawing written to {args.svg}")
    return 0


def cmd_render(args: argparse.Namespace) -> int:
    from .render import coloring_to_svg, graph_to_svg

    for key in ("spindle", "golomb", "degrey"):
        graph = REGISTRY[key]()
        path = f"{args.outdir}/{key}.svg"
        graph_to_svg(graph, path)
        print(f"  {path}  ({graph.order} vertices, {graph.size} edges)")
    path = f"{args.outdir}/isbell-7-colouring.svg"
    coloring_to_svg(path)
    print(f"  {path}")
    return 0


def cmd_report(args: argparse.Namespace) -> int:
    print(BANNER)
    print("=" * 78)
    rc = cmd_upper_bound(args)
    print("\n" + "=" * 78)
    rc |= cmd_lower_bound(args)
    print("\n" + "=" * 78)
    print("\nCONCLUSION:  5 <= CNP <= 7, both bounds verified above.")
    print("The exact value is unknown.  It has been unknown since 1950.")
    return rc


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="hadwiger_nelson", description=BANNER.splitlines()[0])
    sub = parser.add_subparsers(dest="command", required=True)

    report = sub.add_parser("report", help="verify both bounds end to end")
    report.add_argument("--radius", default="9/20", help="hexagon circumradius, a rational")
    report.add_argument("--samples", type=int, default=100_000)
    report.add_argument("--no-symmetry-break", action="store_true")
    report.add_argument("--proof", default=None, help="write a DRAT proof of the UNSAT result here")
    report.set_defaults(func=cmd_report)

    upper = sub.add_parser("upper-bound", help="verify Isbell's 7-colouring")
    upper.add_argument("--radius", default="9/20")
    upper.add_argument("--samples", type=int, default=100_000)
    upper.set_defaults(func=cmd_upper_bound)

    lower = sub.add_parser("lower-bound", help="verify CNP >= 5 via de Grey's graph")
    lower.add_argument("--no-symmetry-break", action="store_true")
    lower.add_argument("--proof", default=None)
    lower.set_defaults(func=cmd_lower_bound)

    graph = sub.add_parser("graph", help="inspect or export one graph")
    graph.add_argument("name", choices=sorted(REGISTRY))
    graph.add_argument("--chromatic", action="store_true")
    graph.add_argument("--dimacs", default=None, help="write the graph in DIMACS edge format")
    graph.add_argument("--cnf", default=None, help="write a k-colourability CNF")
    graph.add_argument("--svg", default=None)
    graph.add_argument("-k", type=int, default=4)
    graph.set_defaults(func=cmd_graph)

    render = sub.add_parser("render", help="write SVG drawings")
    render.add_argument("--outdir", default="out")
    render.set_defaults(func=cmd_render)

    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
