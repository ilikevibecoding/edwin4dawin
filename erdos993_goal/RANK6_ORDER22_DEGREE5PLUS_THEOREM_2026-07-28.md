# Rank-6 reserve at order-22 roots of degree at least five

Date: 2026-07-28

Status: **proved theorem**.

Degree at least six follows from the degree-sensitive path-ratio cone;
its degree-six endpoint is \(13/19>0\).

For degree five, put \(F=T-N[p]\), so \(|F|=16\). Exact forest motif
formulas and the line-graph bound show

\[
\frac{i_4(F)}{i_3(F)}<\frac{1111}{353}
\qquad(e(F)\ge2).
\]

This is the exact zero boundary for the whole-tree ratio
\(i_5(T)/i_4(T)\ge42/19\). The relaxed ratio margin is minimized at
the wedge upper endpoint for \(2\le e\le14\); at \(e=15\) its convex
quadratic minimum is \(8\,336\,770/353>0\). The global minimum is
\(9360>0\).

The two residual layers are enumerated exactly:

\[
\begin{array}{c|r|r}
e(F)&\text{states}&\min S_6\\ \hline
0&4845&69\,468\,429\\
1&15300&68\,682\,808.
\end{array}
\]

Thus every order-22 root of degree at least five has positive strong
rank-6 reserve.

## Replay

```powershell
python .\verify_rank6_order22_degree5plus.py
```
