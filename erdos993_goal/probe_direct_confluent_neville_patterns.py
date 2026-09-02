#!/usr/bin/env python3
"""Print factored Neville parameters of direct G(1)^(-1) C."""

from sympy import factorint

from probe_direct_confluent_quotient import direct_confluent_quotient
from probe_newton_full_neville_patterns import neville_parameters


def fac(n):
    if n == 1:
        return "1"
    return "*".join(
        str(p) if e == 1 else f"{p}^{e}" for p, e in factorint(n).items()
    )


def fmt(v):
    return f"{v.numerator}/{v.denominator} [{fac(v.numerator)}/{fac(v.denominator)}]"


def main():
    for q in range(2, 9):
        z = direct_confluent_quotient(q)
        forward, pivots = neville_parameters(z)
        transpose, _ = neville_parameters([list(row) for row in zip(*z)])
        print(f"\nq={q}")
        for name, parameters in (("F", forward), ("T", transpose)):
            print(name)
            for col, level in enumerate(parameters):
                print(" ", col, [(row, fmt(value)) for row, value in level])
        print("P", [fmt(value) for value in pivots])


if __name__ == "__main__":
    main()
