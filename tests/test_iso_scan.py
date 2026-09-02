"""pytest: cross-checks for tools/iso_scan.c and scripts/check_known_hard_trees.py."""
import os
import shutil
import subprocess
import sys
from fractions import Fraction
from math import comb

import pytest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "scripts"))

from check_known_hard_trees import (  # noqa: E402
    L_of, T3mn, analyze, indpoly_forest, indpoly_from_parents, path_graph, prufer_to_edges, spider, tree_canonical,
)

HAVE_GENTREEG = shutil.which("nauty-gentreeg") is not None
HAVE_GCC = shutil.which("gcc") is not None or shutil.which("cc") is not None


@pytest.fixture(scope="module")
def iso_scan_bin(tmp_path_factory):
    if not HAVE_GCC:
        pytest.skip("no C compiler")
    out = tmp_path_factory.mktemp("build") / "iso_scan"
    cc = shutil.which("gcc") or shutil.which("cc")
    subprocess.run([cc, "-O3", "-Wall", "-Wextra", "-o", str(out), os.path.join(ROOT, "tools", "iso_scan.c")], check=True)
    return str(out)


def parse_tree_lines(text):
    for line in text.splitlines():
        if not line.startswith("TREE "):
            continue
        fields = dict(tok.split("=", 1) for tok in line.split()[1:] if "=" in tok)
        par = [int(x) for x in fields["par"].split(",")]
        poly = [int(x) for x in fields["poly"].split(",")]
        yield par, poly, fields


@pytest.mark.skipif(not HAVE_GENTREEG, reason="nauty-gentreeg not installed")
@pytest.mark.parametrize("n", list(range(1, 11)))
def test_c_scanner_matches_python_dp_all_trees(iso_scan_bin, n):
    gen = subprocess.run(["nauty-gentreeg", "-p", "-q", str(n)], capture_output=True, text=True, check=True).stdout
    res = subprocess.run([iso_scan_bin, str(n), "-v"], input=gen, capture_output=True, text=True)
    assert res.returncode == 0, res.stderr
    trees = list(parse_tree_lines(res.stdout))
    expected = [1, 1, 1, 2, 3, 6, 11, 23, 47, 106][n - 1]
    assert len(trees) == expected
    for par, poly, fields in trees:
        assert indpoly_from_parents(par) == poly
        a = analyze(poly)
        assert a["alpha"] == int(fields["alpha"])
        assert a["L"] == int(fields["L"])
        assert a["unimodal"] == (fields["unimodal"] == "1")
        assert bool(a["lc_breaks"]) == (fields["lc_fail"] == "1")
        assert bool(a["iso_fail_target"]) == (fields["iso_fail_target"] == "1")
        assert bool(a["wr_fail_target"]) == (fields["wr_fail_target"] == "1")
    assert "STATS n=%d trees=%d" % (n, expected) in res.stdout


@pytest.mark.skipif(not HAVE_GENTREEG, reason="nauty-gentreeg not installed")
def test_c_scanner_min_slack_cell_is_exact_and_matches_python(iso_scan_bin):
    import json
    n = 12
    gen = subprocess.run(["nauty-gentreeg", "-p", "-q", str(n)], capture_output=True, text=True, check=True).stdout
    res = subprocess.run([iso_scan_bin, str(n)], input=gen, capture_output=True, text=True)
    stats = json.loads([l for l in res.stdout.splitlines() if l.startswith("STATS_JSON ")][0][len("STATS_JSON "):])
    assert stats["trees"] == 551
    cell = stats["min_slack_target"]
    p = indpoly_from_parents(cell["par"])
    assert p == cell["poly"]
    r = cell["r"]
    Q = r * p[r] ** 2 + p[r - 1] ** 2 - (r + 1) * p[r - 1] * p[r + 1]
    assert Fraction(int(cell["num"]), int(cell["den"])) == Fraction(Q, p[r - 1] * p[r + 1])
    # brute-force the minimum over all trees with the Python DP
    best = None
    for line in gen.splitlines():
        par = [int(x) for x in line.split()]
        a = analyze(indpoly_from_parents(par))
        if a["min_slack_target"] is not None and (best is None or a["min_slack_target"][0] < best):
            best = a["min_slack_target"][0]
    assert best == Fraction(int(cell["num"]), int(cell["den"]))


@pytest.mark.parametrize("n", list(range(1, 41)))
def test_paths_give_binomials(n):
    p = indpoly_forest(*path_graph(n))
    assert p == [comb(n - k + 1, k) for k in range(0, (n + 1) // 2 + 1)]


def test_hand_checked_small_forests():
    # P3 + K1 :  a-b-c, d.  size1: 4; size2: {a,c},{a,d},{b,d},{c,d}; size3: {a,c,d}
    assert indpoly_forest(4, [(0, 1), (1, 2)]) == [1, 4, 4, 1]
    # K_{1,3} + K2 : (1 + 4x + 3x^2 + x^3)(1 + 2x)
    assert indpoly_forest(6, [(0, 1), (0, 2), (0, 3), (4, 5)]) == [1, 6, 11, 7, 2]
    # 3 K1 : (1+x)^3
    assert indpoly_forest(3, []) == [1, 3, 3, 1]
    # star K_{1,5}
    assert indpoly_forest(*spider([1] * 5)) == [1, 6, 10, 10, 5, 1]
    with pytest.raises(ValueError):
        indpoly_forest(3, [(0, 1), (1, 2), (2, 0)])


def test_L_formula():
    for alpha in range(1, 40):
        assert L_of(alpha) == (2 * alpha + 1) // 3      # the integer form used in iso_scan.c
        assert L_of(alpha) == -((-(2 * alpha - 1)) // 3)


def test_two_n26_trees_break_log_concavity_at_13_only():
    for name, (n, edges) in {"T_{3,4,4}": T3mn(4, 4), "T*_{3,3,4}": T3mn(3, 4, star=True)}.items():
        assert n == 26
        p = indpoly_forest(n, edges)
        a = analyze(p)
        assert a["alpha"] == 14 and a["L"] == 9
        assert a["lc_breaks"] == [13]
        assert a["unimodal"]
        assert a["iso_fail_target"] == [] and a["wr_fail_target"] == []
    assert tree_canonical(*T3mn(4, 4)) != tree_canonical(*T3mn(3, 4, star=True))


def test_analyze_detects_synthetic_violations():
    a = analyze([1, 5, 4, 6, 2])          # non-unimodal
    assert not a["unimodal"]
    # LC break at an ascent position inside the target range forces Q_r < 0
    p = [1, 10, 20, 100, 120, 130, 125, 100, 60, 20, 5, 1]   # alpha = 11, L = 7
    a = analyze(p)
    assert a["lc_breaks"] == [2]
    assert [r for r, _ in a["iso_fail_target"]] == [2]
    assert a["iso_fail_desc_target"] == []       # p_1 < p_2: an ascent, not a descent
    # WR violation: p_{r-1} > r p_r inside the target range
    p = [1, 100, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
    a = analyze(p)
    assert 2 in a["wr_fail_target"]


def test_prufer_decoding():
    n, edges = prufer_to_edges([4, 4, 4, 5], one_based=True)
    assert n == 6 and sorted(map(tuple, map(sorted, edges))) == [(0, 3), (1, 3), (2, 3), (3, 4), (4, 5)]
