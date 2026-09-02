"""Probe parity-Hurwitz chambers of the target-disk Cayley transform."""

from __future__ import annotations

import sympy as sp

from audit_lower_selector_alpha0_duran_margins import duran_polynomial
from verify_lower_qsharp_reduction import selector_gamma


W, U = sp.symbols("w u")


def roots(poly: sp.Poly) -> list[complex]:
    if poly.degree() <= 0:
        return []
    return [complex(root) for root in sp.nroots(poly, n=35, maxsteps=300)]


def one_case(d: int, r: int, row_s: int):
    N = d + r
    gamma = selector_gamma(N, row_s)
    a = max(0, row_s - N + 1)
    gamma_hat = gamma[a:]
    m = len(gamma_hat) - 1
    P = d + row_s
    p = P - 2 * a
    n = p // 2
    beta = sp.Rational(2 * (p % 2) - 1, 2)
    A = sp.Rational((n - m + 1) * (n - m + 1 + beta))
    R = sp.sqrt(A)
    q = duran_polynomial(P - a, gamma_hat)
    F = sp.Poly(sp.cancel((1 - W) ** m * q.as_expr().subs(q.gens[0], R * (1 + W) / (1 - W))), W, extension=R)
    E = sp.Poly(sum(F.nth(2*j)*U**j for j in range(m//2+1)),U,extension=R)
    O = sp.Poly(sum(F.nth(2*j+1)*U**j for j in range((m+1)//2)),U,extension=R)
    eroots, oroots = roots(E), roots(O)
    e_real = all(abs(root.imag)<1e-12 for root in eroots)
    o_real = all(abs(root.imag)<1e-12 for root in oroots)
    return {
        "cell": (d,r,row_s), "m":m,
        "e_real":e_real,"o_real":o_real,
        "e_pos":sum(root.real>0 for root in eroots if abs(root.imag)<1e-12),
        "o_pos":sum(root.real>0 for root in oroots if abs(root.imag)<1e-12),
        "e_neg":sorted(root.real for root in eroots if abs(root.imag)<1e-12 and root.real<0),
        "o_neg":sorted(root.real for root in oroots if abs(root.imag)<1e-12 and root.real<0),
        "lead_same":float(E.LC())*float(O.LC())>0,
    }


def main():
    rows=[]
    for d in range(5,10):
      for r in range(d-4):
       N=d+r
       for s in range(r+1,N+r+1): rows.append(one_case(d,r,s))
    nonreal=[x for x in rows if not x['e_real'] or not x['o_real']]
    posdiff=[x for x in rows if x['e_pos']!=x['o_pos']]
    print('cases',len(rows),'nonreal parity',len(nonreal),'positive-count different',len(posdiff))
    print('nonreal first',nonreal[:5])
    print('posdiff first',posdiff[:10])

if __name__=='__main__':main()
