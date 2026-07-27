"""Parser for the Mathematica-style vertex files (`*.vtx`) used by
Heule's CNP-SAT repository.

Each vertex is a pair ``{x, y}`` where x and y are arithmetic expressions
built from integers, ``+ - * /``, parentheses and ``Sqrt[rational]``
(e.g. ``{(3 - Sqrt[33])/6, (Sqrt[3] + 3*Sqrt[11])/6}``).  Expressions are
evaluated exactly into elements of Q(sqrt3, sqrt5, sqrt11) — see `qfield`.
"""

from __future__ import annotations

import re
from fractions import Fraction
from typing import List, Tuple

from .qfield import QF

_TOKEN = re.compile(r"\s*(\d+|Sqrt\[|[][()+\-*/,])")


class _Parser:
    """Recursive-descent parser for the expression grammar

    expr   := term (('+'|'-') term)*
    term   := unary (('*'|'/') unary)*
    unary  := ('-'|'+')* atom
    atom   := INT | '(' expr ')' | 'Sqrt[' expr ']'
    """

    def __init__(self, text: str):
        self.tokens: List[str] = []
        pos = 0
        while pos < len(text):
            m = _TOKEN.match(text, pos)
            if not m:
                if text[pos:].strip():
                    raise ValueError(f"cannot tokenise {text[pos:]!r}")
                break
            self.tokens.append(m.group(1))
            pos = m.end()
        self.i = 0

    def peek(self) -> str | None:
        return self.tokens[self.i] if self.i < len(self.tokens) else None

    def take(self, expected: str | None = None) -> str:
        tok = self.peek()
        if tok is None or (expected is not None and tok != expected):
            raise ValueError(f"expected {expected!r}, got {tok!r}")
        self.i += 1
        return tok

    def expr(self) -> QF:
        val = self.term()
        while self.peek() in ("+", "-"):
            if self.take() == "+":
                val = val + self.term()
            else:
                val = val - self.term()
        return val

    def term(self) -> QF:
        val = self.unary()
        while self.peek() in ("*", "/"):
            if self.take() == "*":
                val = val * self.unary()
            else:
                val = val / self.unary()
        return val

    def unary(self) -> QF:
        sign = 1
        while self.peek() in ("+", "-"):
            if self.take() == "-":
                sign = -sign
        return self.atom() if sign == 1 else -self.atom()

    def atom(self) -> QF:
        tok = self.peek()
        if tok == "(":
            self.take("(")
            val = self.expr()
            self.take(")")
            return val
        if tok == "Sqrt[":
            self.take("Sqrt[")
            arg = self.expr()
            self.take("]")
            return QF.sqrt_rational(arg.as_rational())
        if tok is not None and tok.isdigit():
            self.take()
            return QF.rational(Fraction(int(tok)))
        raise ValueError(f"unexpected token {tok!r}")


def parse_expr(text: str) -> QF:
    p = _Parser(text)
    val = p.expr()
    if p.peek() is not None:
        raise ValueError(f"trailing tokens in {text!r}")
    return val


def _split_top_level_comma(text: str) -> List[str]:
    parts, depth, cur = [], 0, []
    for ch in text:
        if ch in "([":
            depth += 1
        elif ch in ")]":
            depth -= 1
        if ch == "," and depth == 0:
            parts.append("".join(cur))
            cur = []
        else:
            cur.append(ch)
    parts.append("".join(cur))
    return parts


def load_vtx(path: str) -> List[Tuple[QF, QF]]:
    """Read a .vtx file into a list of exact points (x, y)."""
    with open(path) as f:
        text = f.read()
    points: List[Tuple[QF, QF]] = []
    for m in re.finditer(r"\{([^{}]*)\}", text):
        coords = _split_top_level_comma(m.group(1))
        if len(coords) != 2:
            raise ValueError(f"vertex {m.group(0)!r} is not a pair")
        points.append((parse_expr(coords[0]), parse_expr(coords[1])))
    return points
