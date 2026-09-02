"""Derive a local differential relation for the four-step path block shift.

This is an independent exact-algebra work script for Section 79.  It solves
the generic coefficient identity over Q(n,s), not by fitting numerical cases.
"""

import sympy as sp


k, n, s = sp.symbols("k n s")

# U0=a0+...+a3*x^3, U1=b0+...+b4*x^4,
# U2=x^2*(c2+c3*x+c4*x^2+c5*x^3), and W=w*x^3.
a = sp.symbols("a0:4")
b = sp.symbols("b0:5")
c = sp.symbols("c2:6")
w = sp.symbols("w")
unknowns = (*a, *b, *c, w)


def ratio(j):
    """p_(j+1)/p_j for B_(n,s)."""
    return -(s-j) * (n-2*j) * (n-2*j-1) / (4*(j+1)*(n-j))


# Divide the coefficient of x^k by p_(k-3).
r0, r1, r2, r3 = (ratio(k-j) for j in (3, 2, 1, 0))
p_ratios = {
    -1: r0*r1*r2*r3,
    0: r0*r1*r2,
    1: r0*r1,
    2: r0,
    3: sp.S.One,
}
d_km3 = sp.prod(n - 2*(k-3) - j for j in range(4)) / sp.prod(
    n - (k-3) - j for j in range(4)
)

weights = {
    -1: b[0]*(k+1),
    0: a[0] + b[1]*k + c[0]*k*(k-1),
    1: a[1] + b[2]*(k-1) + c[1]*(k-1)*(k-2),
    2: a[2] + b[3]*(k-2) + c[2]*(k-2)*(k-3),
    3: a[3] + b[4]*(k-3) + c[3]*(k-3)*(k-4) - w*d_km3,
}

def rnum(j):
    return -(s-j) * (n-2*j) * (n-2*j-1)


def rden(j):
    return 4*(j+1)*(n-j)


full_den = sp.prod(rden(k-j) for j in (3, 2, 1, 0))
d_num = sp.prod(n - 2*(k-3) - j for j in range(4))
bases = {
    -1: sp.prod(rnum(k-j) for j in (3, 2, 1, 0)),
    0: sp.prod(rnum(k-j) for j in (3, 2, 1)) * rden(k),
    1: sp.prod(rnum(k-j) for j in (3, 2)) * rden(k-1)*rden(k),
    2: rnum(k-3) * rden(k-2)*rden(k-1)*rden(k),
    3: full_den,
}
w_base = -d_num * (4**4*(k-2)*(k-1)*k*(k+1))
column_exprs = [
    bases[0], bases[1], bases[2], bases[3],
    (k+1)*bases[-1], k*bases[0], (k-1)*bases[1],
    (k-2)*bases[2], (k-3)*bases[3],
    k*(k-1)*bases[0], (k-1)*(k-2)*bases[1],
    (k-2)*(k-3)*bases[2], (k-3)*(k-4)*bases[3],
    w_base,
]
field = sp.QQ.frac_field(n, s)
columns = [sp.Poly(expr, k, domain=field) for expr in column_exprs]
degree = max(poly.degree() for poly in columns)
print("generic numerator degree in k:", degree, flush=True)
matrix = sp.Matrix([
    [poly.nth(power) for poly in columns[:-1]]
    for power in range(degree + 1)
])
rhs = sp.Matrix([-columns[-1].nth(power) for power in range(degree + 1)])
print("system shape:", matrix.shape, flush=True)
solution = sp.linsolve((matrix, rhs), unknowns[:-1])
sol_tuple = next(iter(solution))

for var, value in zip(unknowns[:-1], sol_tuple):
    print(f"{var} = {sp.factor(value)}")

# Exact symbolic check.
sol = dict(zip(unknowns[:-1], sol_tuple))
check = sp.factor(sum(expr*sol.get(var, 1) for expr, var in zip(column_exprs, unknowns)))
print("symbolic residual:", check)
