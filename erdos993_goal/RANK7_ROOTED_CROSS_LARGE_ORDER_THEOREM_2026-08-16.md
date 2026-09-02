# Rank-seven rooted cross theorem from order 39

Date: 2026-08-16

Status: **PROVED ALL-ORDER LARGE-ORDER THEOREM.**  This is a new input for
the connected-tree rank-seven reserve.  It does not settle the finite band
below order 39 and does not by itself prove rank-seven PGC or Erdős Problem
#993.

## Theorem

Let `T` be any tree of order `n>=39`, rooted at an arbitrary vertex `p`.
Write

```text
d=i5(T), e=i6(T), f=i7(T),
h=i5(T-p), k=i6(T-p).
```

Then

```text
C7(T,p)=d(e^2-df)-2e(eh-dk)>0.                    (1)
```

Equivalently, with

```text
D6=1-df/e^2,  s=h/d,  q=k/e,
```

one has the shifted rooted-cross inequality

```text
q>s-D6/2.                                          (2)
```

## Exact reduction to one scalar inequality

The proved all-forest rank-six reserve is

```text
Q6=12e^2-de-14df>=0.
```

Set

```text
S7=d(2e+d)-28(eh-dk).
```

Direct expansion gives the exact identity

```text
14 C7=e S7+d Q6.                                   (3)
```

It therefore suffices to prove `S7>0`.

Put `F=T-N[p]`, `a=i4(F)`, and `b=i5(F)`.  Root deletion gives

```text
d=h+a,  e=k+b,  eh-dk=db-ea.                      (4)
```

If the last expression is nonpositive, `S7>0` is immediate.  Otherwise set
`x=e/d` and `y=b/a`; then `y>x`.  Extension counting and connectedness give

```text
y<=L=(n-6)/5,
d>=a+b=a(1+y).
```

Since `(y-x)/(1+y)` increases with `y`,

```text
(eh-dk)/d^2 <= (L-x)/(1+L).                        (5)
```

The certified sharp rank-`(4,5)` tree path ratio and its one-step extension
transfer give

```text
t_n=(n-7)(n-8)/(n-3),
x=i6/i5 >= (t_n-3+2/t_n)/6=:x_n.                  (6)
```

The right side of (5) decreases with `x`, so (5)--(6) yield

```text
S7/d^2
 >= 1+2x_n-28(L-x_n)/(1+L)
  = [n^5-45n^4+75n^3+7923n^2-69788n+168234]
    /[3(n-8)(n-7)(n-3)(n-1)].                     (7)
```

After `n=m+39`, the numerator of (7) is

```text
m^5+150m^4+8265m^3+199218m^2+1780216m+65664,
```

which is strictly positive for every `m>=0`; the denominator is positive.
At the sharp endpoint `n=39`, (7) is exactly `1/62`.

## Degree-sensitive strengthening

If the root has degree `delta`, then `|F|<=n-delta-1`, so the same proof
improves the extension ceiling to

```text
L_delta=(n-delta-5)/5.
```

Exact shifted-numerator certificates give the following staircase:

| minimum root degree | minimum order |
|---:|---:|
| 9 | 19 |
| 8 | 25 |
| 7 | 29 |
| 6 | 32 |
| 5 | 34 |
| 4 | 35 |
| 3 | 37 |
| 2 | 38 |
| 1 | 39 |

For example, at root degree nine the scalar numerator, after `n=m+19`,
has positive coefficients

```text
1, 42, 569, 3166, 16408, 104320,
```

and its endpoint value is `163/99`.  Thus throughout the analytic band
starting at order 19, any possible failure is confined to the complementary
small-root-degree staircase in the table.  This refinement is useful for the
remaining terminal-broom root-capacity cells.

## Replay and prerequisites

Run

```powershell
python .\prove_rank7_rooted_cross_large_order.py
```

It writes `rank7_rooted_cross_large_order_exact_20260816.json` and verifies
all identities, the scalar factorization, and the positive shifted
coefficients exactly.

The two prior all-order inputs are:

- `RANK6_FOREST_THREE_HALVES_THEOREM_2026-08-13.md`, SHA-256
  `703F7CECACB996BA20CDD50125B9D4EFD509436AE8295978144C7B3500883459`;
- `FOREST_V7_ALPHA12_THEOREM_2026-08-13.md`, SHA-256
  `B2FCEDD33177DB50B1FB868B2098F2E896B2AB2687215EDC580B2E85D21DBA78`.

The unrestricted remaining rooted-cross band is `n<=38`, with the
degree-sensitive part of that band reduced by the table above.  The
terminal-broom rank-seven proof still also requires positivity of its low
Newton coefficients; (1) is a structural input for that cone, not a
substitute for checking it.
