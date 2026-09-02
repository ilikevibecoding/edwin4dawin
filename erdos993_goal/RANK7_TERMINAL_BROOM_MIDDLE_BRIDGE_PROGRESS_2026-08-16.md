# Rank-seven terminal-broom middle-bridge progress

Date: 2026-08-16

Status: **partial exact closure; unrestricted orders 23--38 remain open.**

The newly proved finite pieces are:

1. every root of every free tree at orders 19--22;
2. every root of every `B2<=3` tree at orders 23--38, where
   `B2=sum_v binom(deg(v)-1,2)`.

The first part comprises 8,909,281 free trees and 191,259,682 rooted checks;
use the individual reports for their exact per-order totals. The structural
part comprises 1,203 `B2<=1` skeleton subdivisions plus 1,608,043 `B2=2,3`
subdivisions. Every checked Newton minimum is strictly positive, so each
piece proves `R_t>=0` for all integer `t>=1`, not merely for a sampled range.

The current exact obstruction is now:

```text
orders 23--38 with B2>=4.
```

The existing `B2=4` suppressed-skeleton census has 845,798,479 rooted checks
and can be instrumented exactly, but `B2=5` already grows to about 8.6
billion rooted checks. Thus brute-force skeleton extension is useful for one
more layer but is not a satisfactory universal closure. A viable analytic
completion needs a branching-surplus or root-preserving smoothing lemma that
couples `I(A)`, `I(A-q)`, and `I(A-N[q])`.

The separate weak-box failure note proves why decoupled bounds on those three
forests are insufficient. It is an enclosure failure, not a tree
counterexample.
