# Exact rooted rank-6 finite base: orders 18 through 21

Date: 2026-07-28

Status: **proved finite theorem**.

## Theorem

Every rooted tree \((T,p)\) of order

\[
18\le |T|\le21
\]

satisfies the strong rank-6 inequality \(S_6(T,p)>0\).

## Exhaustive generator

The verifier implements the
Wright–Richmond–Odlyzko–McKay free-tree generator directly from its
canonical level-sequence successor rules. It validates the exact
known counts of unlabeled trees:

\[
\begin{array}{c|r|r}
n&\text{unlabeled trees}&\text{rooted checks}\\ \hline
18&123867&2229606\\
19&317955&6041145\\
20&823065&16461300\\
21&2144505&45034605.
\end{array}
\]

Thus the replay checks 3,409,392 free trees and 69,766,656 choices of
root.

## Exact coefficient computation

For every directed edge, the verifier memoizes the two truncated
independence polynomials of its rooted component:

- the endpoint excluded;
- the endpoint included.

Rerooting these messages gives \(I(T-p;x)\) for every vertex \(p\)
without regenerating the tree. All coefficients and reserve margins
are signed 128-bit integers.

The exact minima are:

\[
\begin{array}{c|r}
n&\min_{T,p}S_6(T,p)\\ \hline
18&31256\\
19&1072784\\
20&3633096\\
21&9091872.
\end{array}
\]

Every minimum is strictly positive.

## Independent replay

The portable build targets WebAssembly/WASI so it does not require a
Visual Studio linker:

```powershell
rustup target add wasm32-wasip1
python .\verify_rank6_finite_orders_18_21.py
```

The Python launcher compiles the checked-in Rust source with
optimization and executes it through the installed Node runtime.
