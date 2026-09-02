# The strong rooted rank-6 theorem

Date: 2026-07-28

Status: **proved theorem**, with exact symbolic and finite
certificates. This is a new fixed-rank theorem toward Erdős Problem
993; it is not yet a proof of the full all-rank conjecture.

## Theorem

Let \(T\) be any tree of order \(n\ge18\), rooted at any vertex \(p\).
Write

\[
d=i_4(T),\quad e=i_5(T),\qquad
h=i_4(T-p),\quad k=i_5(T-p).
\]

Then

\[
\boxed{
S_6(T,p):=
d(2e+d)-24(eh-dk)>0.
}
\tag{1}
\]

## Rooted-cross corollary

Let \(f=i_6(T)\). The proved rank-5 forest theorem gives

\[
10e^2-de-12df\ge0,
\]

and hence

\[
e^2-df\ge\frac{e(2e+d)}{12}.
\]

Therefore

\[
\begin{aligned}
C_6(T,p)
&:=d(e^2-df)-2e(eh-dk)\\
&\ge\frac e{12}
\left[d(2e+d)-24(eh-dk)\right]\\
&=\frac e{12}S_6(T,p)\ge0.
\end{aligned}
\tag{2}
\]

Thus every rooted tree of order at least 18 satisfies the exact
rank-6 rooted-cross inequality required by the fixed-rank
leaf-payment program.

## Infinite and finite parts

The proof divides at order 22.

### Orders \(n\ge22\)

The infinite proof combines:

- the sharp tree rank-\((4,5)\) path-ratio theorem;
- degree-sensitive rooted ratio cones;
- exact edge/wedge/connected-subtree motif identities;
- sharp two-component coefficient lemmas;
- full center-subset contributions after deleting a root;
- integral degree-excess partition certificates;
- a finite weighted-core fallback for 139 order-22 leaf partitions.

The consolidated \(n\ge22\) replay validates all symbolic cells and
1,698,339 exact weighted leaf-core states.

### Orders \(18\le n\le21\)

A direct WROM free-tree generator checks every unlabeled tree and
every root:

\[
\begin{array}{c|r|r|r}
n&\text{trees}&\text{rooted checks}&\min S_6\\ \hline
18&123867&2229606&31256\\
19&317955&6041145&1072784\\
20&823065&16461300&3633096\\
21&2144505&45034605&9091872.
\end{array}
\]

This finite base contains 3,409,392 free trees and 69,766,656 rooted
checks. Every calculation uses exact integers.

## Complete replay

Install the portable Rust target once:

```powershell
rustup target add wasm32-wasip1
```

Then run:

```powershell
python .\verify_rank6_all_roots.py
```

The replay first checks the symbolic \(n\ge22\) chain, then compiles
and runs the exact finite verifier for orders 18 through 21.

## What remains

The theorem closes the previously open rooted rank-6 input. To turn
it into a rank-6 coefficient theorem, the next step is to finish the
rank-6 leaf-payment assembly, including arbitrary sibling isolates.
After that, the all-rank Erdős conjecture still requires a
rank-uniform argument rather than one proof per fixed rank.
