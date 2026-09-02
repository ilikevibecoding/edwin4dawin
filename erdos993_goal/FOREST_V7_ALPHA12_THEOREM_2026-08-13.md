# The all-forest `V_7` theorem above independence number eleven

Date: 2026-08-13

Status: **proved all-order theorem, with exact finite replays**.  This
closes the standalone residual theorem needed by the rank-seven PGC
identity.  It does not by itself prove the rank-seven reserve `Q_7`, the
coupled `alpha(B)=11` boundary, or Erdős Problem 993.

## Theorem

For every forest `F` with `alpha(F)>=12`,

\[
\boxed{V_7(F):=9i_5(F)i_6(F)+105i_5(F)i_7(F)-72i_6(F)^2\geq0.}
\tag{1}
\]

The proof has three exact ranges:

1. the earlier exhaustive forest-polynomial census through order 20;
2. a new exhaustive free-tree and component-multiset census for orders
   21--24; and
3. a new analytic theorem for every forest of order at least 25.

## 1. Orders at most 20

`scan_rank7_forest_residual_n20.py` exhaustively checked the larger
required range `alpha>=11` through order 20.  It found exactly 15
negative `V_7` rows, and every one has `alpha=11`.  Consequently the
subrange `alpha>=12` has no negative row.

This is an exact implication from the exhaustive report, not an
extrapolation from a sample.

## 2. The discrete extension-moment lemma

For a uniform independent `k`-set `S`, let

\[
X=|V(F-N[S])|,\qquad Y=i_2(F-N[S]).
\]

Double counting gives

\[
\mathbb EX=(k+1)i_{k+1}/i_k,
\qquad
\mathbb EY=\binom{k+2}{2}i_{k+2}/i_k.
\tag{2}
\]

A forest on `q` vertices has at least

\[
h(q)=0\quad(q=0,1,2),
\qquad h(q)=\binom{q-1}{2}\quad(q\ge3)
\tag{3}
\]

independent pairs.  The integer first differences of `h` are
`0,0,1,2,3,...`, so its piecewise-linear interpolation `Phi` is convex.
Jensen's inequality therefore gives

\[
\mathbb EY\geq\Phi(\mathbb EX).
\tag{4}
\]

Writing `mu_k=(k+1)i_(k+1)/i_k`, this is the exact transfer

\[
\boxed{\mu_{k+1}\geq2\Phi(\mu_k)/\mu_k.}
\tag{5}
\]

The transfer function is nondecreasing: on `[q,q+1]`, it has the form
`2(q-1)-(q-1)(q+2)/t`, which is increasing and joins continuously at
integer endpoints.

## 3. Every order at least 26

The certified sharp forest rank-`(4,5)` path ratio gives

\[
\mu_4=5i_5/i_4\geq\frac{(n-7)(n-8)}{n-3}.
\tag{6}
\]

Since `Phi(t)>=(t-1)(t-2)/2`, one use of (5) gives

\[
\mu_5=6i_6/i_5\geq\mu_4-3+2/\mu_4.
\tag{7}
\]

At `n=26`, the endpoint is

\[
\mu_4\geq342/23,
\qquad \mu_5\geq47212/3933>12,
\]

and both bounds increase thereafter.  For a uniform independent
five-set, put `mu=6i_6/i_5` and `z=21i_7/i_5`.  Then

\[
\frac{V_7}{i_5^2}=\frac32\mu+5z-2\mu^2
\geq\frac12(\mu^2-12\mu+10)>0.
\tag{8}
\]

The exact normalized lower bound at the order-26 endpoint is
`77720141/15468489`.

## 4. Order 25

The scalar endpoint chain alone misses order 25 by exactly `19/289`,
so a quantitative split is required.

- If the forest is disconnected, one leaf-to-leaf component bridge,
  the sharp forest rank-`(2,3)` ratio, and `i_4<=C(25,4)` improve the
  extension means enough to give
  `V_7/i_5^2 >= 6901696750/6144521769 > 0`.
- For a tree, put `B_2=sum_v C(d(v)-1,2)`.  The quantitative conclusion
  of the certified rank-`(4,5)` proof is
  `110i_5-306i_4 >= 1742B_2`.  When `B_2>=2`, this gives
  `V_7/i_5^2 >= 2172607993/117272276402 > 0`.
- `B_2=0` is the path, with `V_7=6,591,506,220`.
- `B_2=1` is a three-arm spider whose positive unordered arm lengths
  partition 24.  All 48 partitions are checked exactly; the minimum is
  `7,249,560,525` at arms `(2,2,20)`.

Thus (1) holds for every order-25 forest, without an alpha restriction.

## 5. Orders 21--24

The portable Rust/WASM verifier implements the canonical
Wright--Richmond--Odlyzko--McKay free-tree generator.  It checks the
known exact tree counts and computes the independence number and the
first eight coefficients by integer recursion.

Disconnected coverage is also exact.  Since the total order is at most
24, either every component has order at most 12, or there is a unique
component of order at least 13 and its remainder has order at most 11.
The verifier enumerates the first class as canonical component
multisets and streams every large tree against every exact small-forest
remainder in the second class.

| order | trees | eligible forests (`alpha>=12`) | minimum `V_7` |
|---:|---:|---:|---:|
| 21 | 2,144,505 | 4,869,785 | 139,197,240 |
| 22 | 5,623,756 | 13,104,919 | 343,390,824 |
| 23 | 14,828,074 | 34,402,932 | 874,809,936 |
| 24 | 39,299,897 | 90,328,674 | 2,590,346,304 |

In total, 61,896,232 free trees and 142,706,310 required-range forest
instances are certified.  Every displayed minimum is strictly positive.

## 6. Exact replay

Run

```powershell
python .\scan_rank7_forest_residual_n20.py
python .\verify_forest_v7_medium_trees.py
python .\prove_forest_v7_order25.py
python .\prove_forest_v7_alpha12.py
```

The long middle replay checks all orders 21--24 and writes
`forest_v7_medium_orders21_24_exact_20260813.json`.  The final fast
assembler writes `forest_v7_alpha12_exact_20260813.json` and terminates
with

```text
PASS_EXACT_ALL_FOREST_V7_ALPHA_AT_LEAST_12
```
