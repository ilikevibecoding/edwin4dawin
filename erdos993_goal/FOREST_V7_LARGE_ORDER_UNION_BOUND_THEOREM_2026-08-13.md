# A universal large-order theorem for the rank-seven residual

Date: 2026-08-13

Status: **PROVED ALL-FOREST THEOREM FOR ORDER AT LEAST 298.**  This is a
genuine all-order tail theorem, but it does not close the finite orders below
298 and therefore does not by itself prove rank-seven PGC or Erdős Problem
993.

Historical note: this elementary theorem has now been superseded by the much
stronger `FOREST_V7_ORDER25_THEOREM_2026-08-13.md`, which proves the same
residual nonnegative for every forest of order at least 25.  The union-bound
argument remains recorded because it is independent and exceptionally short.

## Theorem

For every forest (indeed, every graph with at most `n-1` edges) of order
`n>=298`,

\[
\boxed{V_7(F):=9i_5i_6+105i_5i_7-72i_6^2>0.}
\]

No independence-number hypothesis is needed.

## Proof

Let `e` be the number of edges.  The union bound on the `e` forbidden-edge
events in a uniformly chosen `k`-set gives

\[
i_k(F)\ge {n\choose k}-e{n-2\choose k-2}
          \ge L_k:={n\choose k}-(n-1){n-2\choose k-2}.
\]

Also `i_6(F)<=U_6:={n\choose6}`.  For `n>=298`, all three lower bounds used
below are positive; explicitly

\[
\begin{aligned}
L_5&={(n-20)(n-4)(n-3)(n-2)(n-1)\over120},\\
L_6&={(n-30)(n-5)(n-4)(n-3)(n-2)(n-1)\over720},\\
L_7&={(n-42)(n-6)(n-5)(n-4)(n-3)(n-2)(n-1)\over5040}.
\end{aligned}
\]

Consequently

\[
\begin{aligned}
V_7(F)
&\ge 9L_5L_6+105L_5L_7-72U_6^2\\
&={ (n-5)(n-4)^2(n-3)^2(n-2)^2(n-1)^2\over28800}\\
&\qquad\cdot (n^3-317n^2+5910n-23400).
\end{aligned}
\]

Writing `n=298+r`, the final cubic is

\[
r^3+577r^2+83390r+50504,
\]

which is strictly positive for every `r>=0`.  Every other displayed factor
is positive as well.  This proves the theorem.

## Exact replay

Run

```powershell
python .\verify_forest_v7_large_order_union_bound.py
```

The replay checks the three union-bound factorizations, the exact residual
factorization, and the shifted positive-coefficient cubic.

## Consequence for the rank-seven program

The residual term in the exact pendant identity is now automatically
positive for every deletion forest `B` of order at least 298.  The remaining
rank-seven residual work is therefore confined to orders at most 297.  This
is still too large for a naive exhaustive forest census, so the sharper
fixed-size ratio or coupled-deletion route remains necessary.
