# Rank-seven rooted-cross strengthening

## Scope and result

For a tree `T` of order `n` rooted at `p`, put

```text
d=i5(T), e=i6(T), f=i7(T), h=i5(T-p), k=i6(T-p)
C7=d(e^2-df)-2e(eh-dk).
```

The exact argument proves:

1. `C7>0` for every root of every tree of orders 19--22 (finite theorem);
2. `C7>0` for every root of every tree of order at least 39 (analytic tail);
3. the degree-staircase and `B2`-curvature cells below in orders 23--38;
4. every `B2=0` or `B2=1` tree, at every root, in orders 23--38.

It **does not** close all trees in orders 23--38.  The JSON certificate lists
all parameter cells not covered by these arguments.  Therefore this note must
not be cited as a universal rooted-`C7` theorem or as a proof of `Q7`.

## Exact reduction

Let

```text
Q6=12e^2-de-14df,
S7=d(2e+d)-28(eh-dk).
```

Direct expansion gives

```text
14 C7 = e S7 + d Q6.                         (1)
```

The all-forest rank-six theorem gives `Q6>=0`, so it is enough to prove
`S7>0`.  For `F=T-N[p]`, write `a=i4(F)` and `b=i5(F)`.  Root deletion gives

```text
d=h+a, e=k+b, eh-dk=db-ea.
```

If the last quantity is nonpositive, `S7>0` is immediate.  Otherwise put
`x=e/d`, `y=b/a`, and let `r=deg(p)`.  Then `d>=a+b`, while elementary
extension counting in `F` gives

```text
y <= L_r=(n-r-5)/5.
```

Consequently

```text
(eh-dk)/d^2 <= (y-x)/(1+y) <= (L_r-x)/(1+L_r),
S7/d^2 >= 1+2x-28(L_r-x)/(1+L_r).            (2)
```

The second comparison is exact because its difference is

```text
(L_r-y)(1+x)/((1+L_r)(1+y)).
```

The sharp tree rank-`(4,5)` endpoint and extension transfer give

```text
t_n=(n-7)(n-8)/(n-3),
mu4>=t_n,
6x=mu5>=mu4-3+2/mu4.
```

Substitution into (2), followed by exact polynomial sign checks, gives the
degree staircase.

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

For every row, the replay expands the scalar numerator after shifting by the
listed order and asserts that every coefficient is positive.  In particular,
the all-root endpoint at `n=39` is `1/62`.

## Quantitative curvature split

For a tree define

```text
B2=sum_v C(deg(v)-1,2).
```

The quantitative rank-`(4,5)` theorem gives

```text
5(n-3)i5-(n-7)(n-8)i4
  >= ((n^3-8n^2-19n+302)/6) B2.              (3)
```

Two exact ceilings sharpen the conversion of (3) to a lower bound on `mu4`.
Counting pairs `(edge,S)` with `|S|=4` gives `i4<=C(n-1,4)`.  Two-term
inclusion-exclusion over the tree edges, together with the connected-four-
subtree bound `S3>=n-3+B2`, gives

```text
i4 <= C(n,4)-(n-1)C(n-2,2)+C(n-1,2)
      +(n-4)(B2+n-2)-(n-3+B2).
```

For completeness, `S3>=n-3+B2` has a leaf-deletion proof.  When a leaf at a
vertex of old degree `d` is restored, the new connected four-subtrees are the
connected triples through its neighbor; there are at least `d-1`, exactly the
increase of `n-3+B2`.  The order-six base is exhaustively checked by all
`6^4=1,296` Prüfer codes (minimum gap zero).

The replay uses the minimum of these ceilings.  The table gives the least
integer `B2` certified by (2)--(3), for exact root degrees 1 through 9.  `0`
means the degree bound alone works.  A dash means this curvature calculation
does not become positive before the universal ceiling `B2<=C(n-2,2)`.

| n | r=1 | r=2 | r=3 | r=4 | r=5 | r=6 | r=7 | r=8 | r=9 |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 23 | -- | -- | -- | -- | -- | 209 | 108 | 15 | 0 |
| 24 | -- | -- | -- | -- | -- | 211 | 99 | 7 | 0 |
| 25 | -- | -- | -- | -- | -- | 206 | 86 | 0 | 0 |
| 26 | -- | -- | -- | -- | -- | 196 | 69 | 0 | 0 |
| 27 | -- | -- | -- | -- | 294 | 171 | 47 | 0 | 0 |
| 28 | -- | -- | -- | -- | 274 | 137 | 21 | 0 | 0 |
| 29 | -- | -- | -- | -- | 246 | 100 | 0 | 0 | 0 |
| 30 | -- | -- | -- | 340 | 197 | 58 | 0 | 0 | 0 |
| 31 | -- | -- | -- | 298 | 140 | 13 | 0 | 0 | 0 |
| 32 | -- | -- | 385 | 232 | 81 | 0 | 0 | 0 | 0 |
| 33 | -- | -- | 324 | 155 | 19 | 0 | 0 | 0 | 0 |
| 34 | -- | 402 | 233 | 78 | 0 | 0 | 0 | 0 | 0 |
| 35 | 474 | 311 | 139 | 0 | 0 | 0 | 0 | 0 | 0 |
| 36 | 381 | 197 | 44 | 0 | 0 | 0 | 0 | 0 | 0 |
| 37 | 250 | 86 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 38 | 121 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

The replay also checks the scalar at every integer `B2` from each threshold
through `C(n-2,2)`, so no monotonicity assumption is hidden in the table.

## Low curvature: complete exact check

The classification is elementary: `B2=0` forces a path; `B2=1` forces one
degree-three vertex and all other degrees at most two, hence a three-arm spider
with unordered positive arm lengths.  The replay checks every such tree and
every root in orders 23--38:

```text
1,203 trees
38,365 rooted checks
0 failures
minimum C7 = 723,540,832,752
witness = order 23, arms (1,1,20), a leaf root
```

As an independent symbolic check, for a leaf of the path `P_n`,

```text
C7 = (n-10)(n-9)(n-8)^3(n-7)^3(n-6)^3(n-5)^2
     * (n^4-24n^3+227n^2-780n-1332) / 435456000.
```

After `n=13+m`, the quartic has coefficients
`[1,28,305,1742,2724]`, all positive.

## Exact residual

Orders 19--22 are completely closed, and orders at least 39 are completely
closed.  In orders 23--38, the only input still missing from this route is a
proof or exact census for trees whose root degree lies below the staircase and
whose `B2` is at least 2 but below the corresponding threshold in the table.
For a dash, the current curvature estimate covers no attainable positive
`B2` threshold.  The 85 row/degree parameter cells and their exact uncovered
integer intervals are recorded under `residual.cells` in the JSON report.
Some outer parameter cells may be structurally empty; the report does not
silently assume their realizability.

Closing this finite band would make the rooted-`C7` statement universal for
orders at least 19.  It still would not replace the genuinely separate missing
connected-tree `Q7` theorem in the overall rank-seven program.

## Replay and hashes

Run:

```powershell
python prove_rank7_rooted_cross_strengthening.py
```

SHA-256:

```text
prove_rank7_rooted_cross_strengthening.py
499E0D644CCC21E7E450F525878F7A5B59E789D2F7FD1171C2132C725C929FFB

rank7_rooted_cross_strengthening_exact_20260816.json
7BC02FB1026BCD8B178D8443A2B511F5BA03FEF092ED77744C396955B9C427B3
```

The exact orders-19--22 theorem and replay are separately packaged in
`RANK7_ROOTED_CROSS_FINITE_N19_N22_THEOREM_2026-08-16.md` and
`replay_rank7_rooted_cross_finite.py`.
