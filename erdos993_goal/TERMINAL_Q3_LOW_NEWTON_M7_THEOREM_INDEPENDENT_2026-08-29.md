# Terminal q3 payment: exact Newton-degree-7 theorem

Date: 2026-08-29

Status: exact all-order proof of the `m=7` Newton coefficient inside the
pinned terminal-payment framework.  This is not a proof of the other seven
low coefficients or of Erdős Problem 993.

## Statement

Put `s=t-1`.  In the notation of the terminal split, let

```text
P = i_3(G union (s+1)K1),       U = i_(j+1)(G union (s+1)K1),
a = f_2(F),                     b = f_j(F),
A = P*c-a*R,
delta = (j+1)a*A*U + L,
L = a*P*Q,
Q = (j+1)b(c+R)-3(P+a)e.
```

The coefficients below are in the Newton basis `binom(s,m)`.  For every
supported target `j>=3`, the coefficient `delta_7` is nonnegative.

## Exact top-degree algebra

Pascal's identity for adding `s+1` isolates gives `P_3=1`.  Since `c` and
`e` are linear in `s`, `R` has Newton degree at most two, and the coefficient
of `binom(s,1)` in `e` is `b`, direct multiplication gives

```text
Q_4 = -12b,       A_4 = 4a.
```

The Newton product kernel is

```text
[binom(s,m)] binom(s,p)binom(s,q)
 = m!/((m-p)!(m-q)!(p+q-m)!).
```

At `(p,q,m)=(3,4,7)` and `(4,3,7)` this kernel is `35`.  Therefore

```text
L_7 = a * 35 * P_3 * Q_4 = -420ab,
[A*U]_7 >= 35 A_4 U_3 = 140a U_3.                 (1)
```

All discarded terms in the second line are nonnegative: `A` is
coefficientwise nonnegative by the pinned terminal-anchor theorem, `U` is
coefficientwise nonnegative by Pascal, and all Newton product kernels are
nonnegative.

## The containment payment

Let `N=|F|`.  Support gives `N>=j>=3` and `b>0`.  Since `F` is a forest,

```text
a=f_2(F)=binom(N,2)-|E(F)| >= binom(N-1,2).         (2)
```

Double-count containments of an independent `(j-2)`-set in an independent
`j`-set:

```text
binom(N-j+2,2) f_(j-2) >= binom(j,2)b.              (3)
```

For `j>=3`, `binom(N-1,2)>=binom(N-j+2,2)`.  Also
`U_3=i_(j-2)(G)+i_(j-3)(G)>=f_(j-2)`.  Combining (2) and (3),

```text
a U_3 >= binom(j,2)b >= 3b.                         (4)
```

Now (1) and (4) yield

```text
delta_7 >= 140(j+1)a^2 U_3 - 420ab
        >= 420j ab
        >= 0.
```

No division is used.  If `b=0`, the target cell is unsupported and vacuous;
in any supported cell, the independent `j`-set itself shows
`a>=binom(j,2)>0`.

## Replay

`prove_terminal_q3_low_newton_m7_independent_agent.py` reconstructs `Q_4`,
`A_4`, and `L_7`, enumerates every nonzero Newton product kernel contributing
to `[A*U]_7`, checks that the discarded abstract terms have nonnegative
coefficients, verifies the cleared order comparison, and pins the upstream
anchor and tail certificates by SHA-256.

