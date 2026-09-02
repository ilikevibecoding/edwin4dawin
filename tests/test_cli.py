"""Tests for the ``python3 -m erdos993`` command line interface."""

import json
import subprocess
import sys
from pathlib import Path

import pytest

from erdos993.__main__ import describe_polynomial, format_scan_table, main, parse_edge_list
from erdos993.scan import scan_order

ROOT = Path(__file__).resolve().parent.parent


def run_cli(*args):
    return subprocess.run(
        [sys.executable, "-m", "erdos993", *args],
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=True,
    )


def test_parse_edge_list_formats():
    assert parse_edge_list("0-1,1-2,1-3") == [(0, 1), (1, 2), (1, 3)]
    assert parse_edge_list("0 1 1 2") == [(0, 1), (1, 2)]
    assert parse_edge_list("[(0, 1), (1, 2)]") == [(0, 1), (1, 2)]
    assert parse_edge_list("") == []
    with pytest.raises(ValueError):
        parse_edge_list("0-1-2")


def test_poly_command(capsys):
    assert main(["poly", "0-1,1-2,1-3,3-4"]) == 0
    out = capsys.readouterr().out
    assert "coefficients = [1, 5, 6, 2]" in out
    assert "I(x) = 1 + 5x + 6x^2 + 2x^3" in out
    assert main(["poly", "--parents", "0 1 1 1 1"]) == 0
    assert "coefficients = [1, 5, 6, 4, 1]" in capsys.readouterr().out
    assert main(["poly", "", "--n", "3"]) == 0
    assert "coefficients = [1, 3, 3, 1]" in capsys.readouterr().out


def test_describe_polynomial_mentions_framework():
    text = describe_polynomial([1, 6, 10, 10, 5, 1])
    assert "certified unimodal = True" in text
    assert "lemma applied at r = [3]" in text


def test_scan_trees_command_subprocess():
    result = run_cli("scan-trees", "7")
    lines = result.stdout.splitlines()
    assert lines[0].split()[:3] == ["n", "trees", "nonUM"]
    row7 = next(line for line in lines if line.split()[:1] == ["7"]).split()
    assert row7[1] == "11"
    assert "Witnesses" in result.stdout


def test_scan_trees_json_and_res_mod():
    result = run_cli("scan-trees", "8", "--min-n", "8", "--res", "0", "--mod", "4", "--json")
    data = json.loads(result.stdout)
    assert len(data) == 1 and data[0]["n"] == 8
    total = sum(
        json.loads(run_cli("scan-trees", "8", "--min-n", "8", "--res", str(r), "--mod", "4", "--json").stdout)[0]["trees"]
        for r in range(4)
    )
    assert total == 23


def test_format_scan_table_rows():
    rows = [scan_order(n) for n in range(1, 6)]
    table = format_scan_table(rows)
    assert len(table.splitlines()) == 6


def test_verify_lemma_and_counts_commands(capsys):
    assert main(["verify-lemma", "--trials", "50"]) == 0
    assert "verified: True" in capsys.readouterr().out
    assert main(["counts", "--max-trees", "6", "--max-forests", "6"]) == 0
    assert "all counts match OEIS" in capsys.readouterr().out
