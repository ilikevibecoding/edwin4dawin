# Rooted rank-seven cross theorem for `B2=4`

## Theorem

Let `T` be a tree of order `23 <= n <= 38`, rooted at any vertex `p`, and put

```text
B2(T)=sum_v C(deg(v)-1,2),
d=i5(T), e=i6(T), f=i7(T), h=i5(T-p), k=i6(T-p).
```

If `B2(T)=4`, then

```text
C7(T,p)=d(e^2-df)-2e(eh-dk) > 0.
```

Together with the earlier structural certificates, every tree with `B2<=4`
is therefore closed throughout orders 23--38.  This theorem makes no claim
about `B2>=5`.

## Exhaustive skeleton classification

Suppressing all degree-two vertices preserves `B2`.  A degree-three branch
contributes 1, a degree-four branch contributes 3, and a degree-five branch
already contributes 6.  Hence `B2=4` has exactly these three skeleton types:

1. one degree-four and one degree-three branch vertex, joined by an edge;
2. four degree-three branch vertices whose induced branch tree is a path;
3. four degree-three branch vertices whose induced branch tree is a star.

Their leaf incidences are forced by their degrees.  The verifier assigns a
positive integer length to every skeleton edge, with total `n-1`, and uses
sorted same-role arms plus the skeleton reversal/permutation symmetries to
enumerate every nonisomorphic subdivision exactly once.  Every reconstructed
tree independently asserts `B2=4`, and every vertex is checked as a root with
signed 128-bit integer arithmetic.

## Exact census

| order | trees | rooted checks | minimum `C7` |
|---:|---:|---:|---:|
| 23 | 49,192 | 1,131,416 | 694,394,936,714 |
| 24 | 74,836 | 1,796,064 | 1,968,555,458,898 |
| 25 | 111,498 | 2,787,450 | 5,247,475,542,621 |
| 26 | 163,175 | 4,242,550 | 13,244,295,812,670 |
| 27 | 234,696 | 6,336,792 | 31,836,218,707,092 |
| 28 | 332,492 | 9,309,776 | 73,245,518,054,708 |
| 29 | 464,183 | 13,461,307 | 161,974,628,013,560 |
| 30 | 639,687 | 19,190,610 | 345,543,308,087,350 |
| 31 | 870,644 | 26,989,964 | 713,378,108,793,644 |
| 32 | 1,171,771 | 37,496,672 | 1,429,209,946,687,694 |
| 33 | 1,560,250 | 51,488,250 | 2,785,364,235,162,693 |
| 34 | 2,057,386 | 69,951,124 | 5,291,820,117,586,206 |
| 35 | 2,687,755 | 94,071,425 | 9,819,469,215,599,544 |
| 36 | 3,481,410 | 125,330,760 | 17,826,422,425,269,924 |
| 37 | 4,472,769 | 165,492,453 | 31,709,559,438,237,878 |
| 38 | 5,703,207 | 216,721,866 | 55,342,184,733,973,046 |
| **total** | **24,074,951** | **845,798,479** | -- |

There are zero failures.  The global minimum occurs at order 23 in the mixed
degree-`(4,3)` skeleton, with canonical edge lengths `(2,1,1,1,1,16)` and
root index 2.

## Updated residual

The outer residual still consists of the 85 order/root-degree cells from the
degree/curvature cut, but every uncovered interval now begins at `B2=5`.
Relative to the original `B2>=2` cut, 255 integer
`(order,root-degree,B2)` levels have now been removed.  No cell is silently
declared empty and no universal rooted-`C7` theorem is claimed.

## Replay and hashes

The default command compiles the verifier and replays four disjoint order
ranges in parallel:

```powershell
python replay_rank7_rooted_cross_b2_4.py
```

The JSON presently records the byte-for-byte expected summary of the completed
four-range replay.  Its `generation_mode` field states this explicitly; the
default command regenerates the same data from a fresh exact run.

SHA-256:

```text
verify_rank7_rooted_cross_b2_4.rs
53587DF347B71F7E378EF6DDE52F1C1E89E95BED714856FA3A0A16CBC0BC0D6D

replay_rank7_rooted_cross_b2_4.py
385AA560695B255B5C21398BFB2E08CF6BFEA53FC159A2C864C16621663AD7DF

rank7_rooted_cross_b2_4_exact_20260816.json
9206DE0F0AE7923BBF25FB399E0BB4A5AED057BA3E519B70632AA957F7C4302B
```
