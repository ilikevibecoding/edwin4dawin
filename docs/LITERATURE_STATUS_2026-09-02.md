# Erdős Problem #993 — literature status and load-bearing checks, 2026-09-02

**Audit date:** 2026-09-02 (Gate 6, item 9 of the handoff checklist).
**Scope:** (1) is the Alavi–Malde–Schwenk–Erdős (AMSE 1987) conjecture — the independence polynomial \(I(F;x)=\sum_r p_r x^r\) of every finite forest is unimodal — proved or disproved anywhere as of today, with special attention to May–September 2026; (2) the exact status of the three literature-facing inputs of the workspace framework: the decreasing-tail theorem (TAIL), the weak ratio \(WR_r\), and the quadratic inequality \(ISO_r\); (3) comparison with the workspace's own refreshes of 2026-08-25 and 2026-08-27.

Notation: \(p_r=i_r(G)\), \(\alpha=\alpha(G)\), \(n=|V|\), \(m=|E|\), \(L(\alpha)=\lceil(2\alpha-1)/3\rceil\).
Companion machine check: `scripts/verify_framework_identities.py` → `reports/framework_identities_20260902.json` (all "own check" numbers below come from that run, seed 20260902, one core, 9 s).

---

## 1. Verdict

**Erdős Problem #993 is open as of 2026-09-02.** No published paper, preprint, repository, forum comment, or official record found by this audit claims a proof or a counterexample. Nothing found supersedes or contradicts the workspace framework; conversely, nothing in the literature supplies any of the framework's unproved inputs.

Evidence re-verified today (not carried over):

1. **Official record.** The erdosproblems.com proof-claims page for #993, fetched 2026-09-02 (cached text in `/tmp/e993/forum_thread_993_proof-claims.txt`): status badge "FALSIFIABLE — Open, but could be disproved with a finite counterexample"; "Proof expositions (0)"; "Proof claims (0)"; "No proof claims have been submitted yet."; page last edited 01 February 2026. A search-engine snapshot of the discussion thread (7 comments) shows only exhaustive-verification reports and log-concavity notes; the most recent comment (Reynolds, 21 Aug 2026) is a structural partial result and explicitly not a proof claim.
2. **arXiv listings sorted by announcement date, fetched 2026-09-02** (`arxiv.org/search`, queries `"independence polynomial"`, `"independence polynomial" unimodal`, `"independent set sequence" OR "independence sequence"`). Every hit announced May–September 2026 was inspected by title/abstract: 2605.02193 (dominating sets), 2605.14076 (\(W_p\) graphs), 2606.04789 (zero-divisor graphs), 2607.08480 (multiplicity of \(-1\); cites the tree conjecture as open), 2607.29322 (graphs with independence number five; unrelated), and off-topic vocabulary hits. **No submission in the window claims a proof or a counterexample of #993.** The most recent tree-specific preprints remain Li (2603.03025, March), Levit–Kadrawi (2603.17114, March), and Hibi–Kara–Vien (2604.18824, April), the last stating: "As of April 2026, the conjecture remains open in general."
3. **Web search** (queries: `Erdős problem 993 proof 2026`, `Alavi Malde Schwenk Erdős conjecture proved OR counterexample 2026`, `independence polynomial trees unimodal September 2026`): every synthesis and every primary hit says "remains open"; the Zenodo record 19100781 (v3, 2026-03-18) abstract ends "The conjecture that every tree independence polynomial is unimodal remains open."
4. **Reynolds repository** (`/tmp/reynolds993`, latest commit 2026-08-28): `README.md` — "This repository does not contain a proof of Erdos Problem #993." Its `notes/arxiv-watch-triage-2026-08-26.md` reviewed all 10 papers its arXiv watch harvested 2026-08-14…08-26 and found one tangentially relevant (Schweitzer, 2608.23262, ULC of matroid intersection) and nothing on #993.

Carried over from the 2026-09-02 morning pass (same-day fetches, not repeated): Tyorden's exhaustive unimodality check of all trees with \(n\le 32\) (GitHub, Aug 2026, unrefereed, AI-assisted), willblair0708's forest-surface search (June 2026, "This does not resolve #993"), kylekaba's notes ("Erdos Problem 993 (Open)"), the `teorth/erdosproblems` dataset (`status: falsifiable`), and the Quanta article of 2026-08-03 (does not mention #993).

---

## 2. Statement, provenance, trees vs forests

- **Statement (erdosproblems.com/993):** "The independent set sequence of any tree or forest is unimodal." Attribution: Alavi, Malde, Schwenk, Erdős, "The vertex independence sequence of a graph is not constrained," *Congr. Numer.* 58 (1987) 15–23, Problem 3; they showed every pattern of inequalities occurs for general graphs.
- **Trees vs forests.** Convolution of unimodal sequences need not be unimodal (Basit–Galvin, E-JC 28(3) (2021) P3.23, §1), so the forest statement is formally stronger; convolution of log-concave sequences is log-concave (Hoggar 1974), so a forest counterexample must contain a non-log-concave tree component. The workspace framework is stated for forests, which is the right target.

---

## 3. Exhaustive verification and log-concavity failures (context)

| Frontier | Source | Status |
|---|---|---|
| \(n\le 25\) log-concave | Radcliffe (cited in Basit–Galvin 2021) | peer-reviewed citation |
| \(n\le 26\) unimodal; exactly 2 non-LC trees at \(n=26\) | Kadrawi–Levit–Yosef–Mizrachi (IntechOpen 2023); Kadrawi–Levit, *Ars Math. Contemp.* 25 (2025) #P4.03, arXiv:2305.01784 | peer-reviewed |
| \(n\le 29\) unimodal (8,691,747,673 trees) | Reynolds, Zenodo 19100781 (v3) + forum comment 2026-03-12 | preprint + repository |
| \(n\le 32\) unimodal | Tyorden (GitHub, forum comments 2026-08-02/05); Reynolds census `results/lc_census_20260814/` | unrefereed, two independent pipelines |
| LC failures with \(27\le n\le 101\), all unimodal | Ramos–Sun, arXiv:2510.18826 (PatternBoost) | preprint |
| Infinite non-LC families, breaks far from the top | Galvin, arXiv:2502.10654 (v2 Jan 2026); Bautista-Ramos arXiv:2511.00334; Bautista-Ramos–Guillén-Galván–Gómez-Salgado, *Graphs Combin.* 42 (2026), doi:10.1007/s00373-026-03054-4 | preprint / peer-reviewed |
| Proved families | spiders strongly LC (Li–Li–Yang–Zhang, arXiv:2501.04245); \(T_{3,m,n},T^*_{3,m,n}\) unimodal (Li, arXiv:2603.03025); trees with \(\le 2\) branch vertices LC (Reynolds, Lean-checked, unrefereed, Aug 2026); real-rooted families (Bencs 2018; Liu–Tang–Zhao 2025); pre-Lorentzian caterpillar substitutions (Bendjeddou–Hardiman, BLMS 2025) | mixed |

**Attribution correction.** The parent brief's "Li–Xie–Zhuang 2025 spiders log-concave" could not be located; the verifiable source for spider log-concavity is Li, Li, Yang, Zhang, arXiv:2501.04245 (Theorem 3.1).

**Own check (this audit).** Both 26-vertex Kadrawi–Levit trees \(T_{3,4,4}\) and \(T^*_{3,3,4}\) were rebuilt exactly: \(n=26\), \(\alpha=14\), \(L=9\), unimodal, single LC break at \(k=13\), first descent at \(r=9=L\). At every rank \(1\le r\le 13\), \(ISO_r\ge 0\); \(WR_r\) holds for all \(r<L\); the framework's stronger reserve \(S_r\) is negative only at \(r=13\) (a tail rank). See `reports/framework_identities_20260902.json`, key `7_kadrawi_levit_n26`.

---

## 4. Load-bearing check (i): the decreasing-tail theorem (TAIL)

**Citation.** V. E. Levit, E. Mandrescu, "Partial unimodality for independence polynomials of König–Egerváry graphs," *Congressus Numerantium* 179 (2006) 109–119. The paper is not on arXiv; its statement is taken verbatim from peer-reviewed restatements: Basit–Galvin, E-JC 28(3) (2021) P3.23, Theorem 1.2 (arXiv:2006.12562, HTML fetched 2026-09-02) and Galvin, *Discrete Math.* 311 (2011) (arXiv:1206.3206, eq. (1)); also Galvin–Hilyard arXiv:1701.02204 eq. (1) and Galvin arXiv:1110.3760 eq. (2).

**Exact statement (Basit–Galvin Theorem 1.2).** For a König–Egerváry graph \(G\) (i.e. \(n=\alpha+\mu\), \(\mu\)=matching number),
\[
 i_{\lceil(2\alpha-1)/3\rceil}\ \ge\ i_{\lceil(2\alpha-1)/3\rceil+1}\ \ge\cdots\ge i_{\alpha-1}\ \ge i_{\alpha}.
\]

- **Scope: not all graphs.** It holds for all König–Egerváry graphs, hence all bipartite graphs, hence all trees and forests. It is false for general graphs: \(3K_{10}\) has \(p=(1,30,300,1000)\), \(\alpha=3\), \(L(3)=2\), and \(p_2<p_3\) (own check, key `8_general_graphs`). Basit–Galvin Theorem 1.3 gives the general-graph version: \((i_k)_{k\ge\ell}\) is weakly decreasing for \(\ell=\lceil\alpha(n-1)/(\alpha+n)\rceil\), which recovers Levit–Mandrescu exactly when \(\alpha\ge n/2\) (\(\kappa=1/2\) in their eq. (1)); for \(3K_{10}\) it gives only \(\ell=3=\alpha\).
- **Proof.** Levit–Mandrescu's original argument uses the König–Egerváry structure. Basit–Galvin's proof of Theorem 1.3 is elementary and self-contained: Fisher–Ryan's inequality \((i_k/\binom{\alpha}{k})^{1/k}\ge(i_{k+1}/\binom{\alpha}{k+1})^{1/(k+1)}\) combined with Zykov's bound \(i_k\le\binom{\alpha}{k}(n/\alpha)^k\) shows \(i_{k+1}>i_k\) forces \(k<(\alpha n-\alpha)/(\alpha+n)\). For forests \(\alpha\ge n/2\), so this independently proves TAIL for the framework's use.
- **Weak vs strict.** The inequalities are **weak** (\(\ge\)). Basit–Galvin: "Theorem 1.2 is easily seen to be tight: the graph consisting of \(\alpha\) vertex disjoint edges … is weakly decreasing from exactly \(i_{\lceil(2\alpha-1)/3\rceil}\) on." (For \(\alpha K_2\), \(p_r=\binom{\alpha}{r}2^r\), and \(p_r=p_{r+1}\) can occur at the threshold.) The skeleton and ledger use the weak form `p_r >= p_(r+1) for r >= L(alpha)`, which is the correct reading; the workspace's `L(alpha)=ceil((2alpha-1)/3)=floor((2alpha+1)/3)` identity was checked for \(1\le\alpha<400\).
- **Framework use is sound.** The prefix lemma only needs the weak tail (a plateau followed by descent is unimodal).

---

## 5. Load-bearing check (ii): the weak ratio \(WR_r:\ p_{r-1}\le r\,p_r\)

**Is it in the literature?** Not under this or any other name as a theorem for trees or forests. The closest published objects (Basit–Galvin 2021, §2.2) are the double-counting identity
\[
\sum_{I\in\mathcal I_{r-1}} e(I) \;=\; r\,p_r \qquad\text{(their eq. (4))},
\]
where \(e(I)\) counts vertices extending the independent set \(I\), and their Theorem 1.5: if every maximal independent set has size \(\ge\lambda\), then \((\lambda-(k-1))\,i_{k-1}\le k\,i_k\) for \(k\le\lambda\).

**Is it elementary?** Only partially, and it is **not** true for general graphs in the required range:

- \(WR_r\) is equivalent to "the average number of extensions of an independent \((r-1)\)-set is at least 1". If \(r-1<i(G)\) (independent domination number = smallest maximal independent set), every \((r-1)\)-set is non-maximal, \(e(I)\ge 1\) pointwise, and \(WR_r\) follows from eq. (4) for **every graph**. This is the elementary part.
- Beyond \(r\le i(G)\) the pointwise argument fails (a star's centre is a maximal independent set of size 1 with \(e=0\)), so \(WR_r\) becomes a genuine averaging statement. For forests Basit–Galvin Theorem 1.6 gives \(i(T)\ge\lceil(n-\alpha+1)/2\rceil\); since \(\alpha\) can be as large as \(n-1\), this covers as little as \(r\le 1\), while the framework needs \(r\le L(\alpha)-1\approx 2\alpha/3\). So the elementary argument does **not** cover the required range for forests.
- \(WR_r\) is **false for general graphs below the cutoff**: \(K_{13}\) with the six edges inside a 4-set removed has \(p=(1,13,6,4,1)\), \(\alpha=4\), \(L(4)=3\), and \(WR_2\) fails (\(13>2\cdot 6\)) although the sequence is unimodal (own check, key `8_general_graphs`). Hence any proof of \(WR_r\) on \(1\le r<L(\alpha)\) must use forest structure; it is not a "trivially true" fact.
- **Where it can fail for forests:** only at or beyond the cutoff (e.g. \(P_3\): \(p=(1,3,1)\), \(L(2)=1\), \(WR_2\) fails). Exhaustive own check: for all 32,508 trees with \(n\le 16\), \(WR_r\) holds at every \(1\le r<L(\alpha)\) (0 failures) while failing at 21,224 (tree, rank) cells at \(r\ge L(\alpha)\) — the framework's range restriction is therefore exactly right, and also exactly what its stated proof must exploit.

**Status of the framework's claim.** The all-forest theorem `WR_r for 1<=r<L(alpha)` (`PASS_EXACT_POINTED_HALL_FULL_PAYMENT_AND_FOREST_WEAK_PREFIX_RATIO`) is a workspace-internal certified theorem with no literature counterpart. This audit did not replay that certificate; it is consistent with all exhaustive data through \(n\le 16\) and with both \(n=26\) Kadrawi–Levit trees. It should be treated as "claimed-in-ledger, independently replayable" until Gate 6's replay is done.

---

## 6. Load-bearing check (iii): \(ISO_r:\ r p_r^2+p_{r-1}^2-(r+1)p_{r-1}p_{r+1}\ge 0\)

**Not found** anywhere in the literature under any name (searches for the algebraic form, "Newton-type", "ratio monotone", "ultra log-concave" variants, Turán/Darroch-type inequalities for independence polynomials). Exact relations to named inequalities (all verified by sympy, key `2_bridge_identity_B`):

| Inequality | Form | Relation |
|---|---|---|
| Ordered log-concavity \(OLC_r\) (Basit–Galvin 2021, Question 9; = \((k!a_k)\) log-concave; = average extension count \(e_k\) nonincreasing, Claim 1.10) | \(r p_r^2\ge(r+1)p_{r-1}p_{r+1}\) | \(ISO_r = OLC_r + p_{r-1}^2\); ISO is strictly weaker |
| Reynolds' "prefix GSB" (repository `STATUS.md` 2026-07-11, unrefereed), reindexed \(k=r\) | \(r p_r^2 + p_{r-1}p_r \ge (r+1)p_{r-1}p_{r+1}\) | \(ISO_r-GSB_r = p_{r-1}(p_{r-1}-p_r)\): GSB implies ISO exactly at descents (the only case the prefix lemma uses); ISO implies GSB at ascents |
| Framework reserve \(S_r\ge 0\) | \(2r p_r^2 - p_{r-1}p_r \ge 2(r+1)p_{r-1}p_{r+1}\) | \(OLC_r - S_r/2 = p_{r-1}p_r/2\): \(S_r\ge0\Rightarrow OLC_r\Rightarrow GSB_r\Rightarrow ISO_r\) at descents |
| Newton's inequality | \(a_k^2\ge(1+\tfrac1k)(1+\tfrac1{m-k})a_{k-1}a_{k+1}\) | fails already for \(K_{1,3}\) (Basit–Galvin); unrelated in strength |
| "CLC" in arXiv:2501.02375 | \(k a_k^2\ge(k+1)a_{k-1}a_{k+1}\) | same as OLC; no tree content |
| Darroch's theorem | mode within 1 of mean for real-rooted polynomials | tree independence polynomials are not real-rooted in general; not applicable |

Consequences that matter for the framework:

- Because \(S_r\ge0\Rightarrow OLC_r\Rightarrow LC_r\), the framework's fixed-rank reserve theorems (\(S_r\ge0\) for \(3\le r\le 8\) at prefix-relevant \(\alpha\)) would be **refuted** by any known tree with an LC break at a rank \(r\le 8\) inside the prefix. None exists: all known breaks (Kadrawi–Levit, Galvin, Bautista-Ramos, Ramos–Sun, Reynolds' census to \(n\le 32\)) lie in the tail, and Reynolds' census note records that no break lies within distance 3 of the Levit–Mandrescu threshold through \(n=32\). Own exhaustive check: for all trees with \(n\le16\), \(S_r\ge 0\) at every prefix cell with \(3\le r\le 8\) (0 negatives).
- \(S_2\) is **negative** for stars \(K_{1,m}\), \(m\ge 4\) (e.g. \(K_{1,4}\): \(p=(1,5,6,4,1)\), \(S_2=-6\), \(\alpha=4\), \(L=3\), so \(r=2\) is a prefix rank) — 13 such prefix cells among trees with \(n\le 16\). This is why the framework cannot (and does not) use \(S_2\) at rank two. Rank two is nevertheless elementary: `scripts/verify_framework_identities.py` (key `5_rank_two_ISO_2`) proves symbolically that for every forest \(Q_2 = f(n,m)+3n\,(\binom m2-S)\) with \(S=\sum_v\binom{d_v}{2}\le\binom m2\), \(f(n,m)=\tfrac12\big(n^2(n+1)+mn(2n-5)-m^2(3n-4)\big)\) concave in \(m\) with \(f(n,0)=n^2(n+1)/2>0\), \(f(n,n-1)=2n^2-3n+2>0\); hence \(ISO_2>0\) for every forest (indeed for every graph with at most \(n-1\) edges).
- \(ISO_r\) holds at **every** rank (not only the prefix) for all trees \(n\le 16\), for both \(n=26\) Kadrawi–Levit trees, and (morning pass) for all 1,228 LC-failure polynomials in Reynolds' \(n\le 32\) census. This matters because the framework's leaf induction actually needs ISO at all supported ranks of subforests (see `FRAMEWORK_LOGIC_AUDIT_2026-09-02.md`, §4(d)).
- Reynolds' rank-3 prefix-GSB theorem "\(\alpha\ge7\Rightarrow 5i_3i_5\le 4i_4^2+i_3i_4\)" is, in the framework's indexing, \(GSB_4\) for \(\alpha\ge7\), i.e. exactly the framework's rank-4 prefix threshold; the framework's \(S_4\ge0\) (\(\alpha\ge7\)) implies it. This is an independent (unrefereed) consistency point, not a literature proof of either statement.

---

## 7. Comparison with the workspace refreshes of 2026-08-25 and 2026-08-27

| Item | 08-25 refresh | 08-27 status | This audit (09-02) |
|---|---|---|---|
| Problem open | yes | yes | yes (proof-claims page: 0 claims; arXiv listings to 2026-09-02) |
| Newest tree preprints | Li 2603.03025; Hibi–Kara–Vien 2604.18824; Ramos–Sun 2510.18826 | same + Du–Heilman–Panova 2605.02193 (off-topic) | same + Levit–Kadrawi 2603.17114 (unicyclic), Bhardwaj et al. 2607.08480 (partial, open), Bautista-Ramos et al. journal version (June 2026) |
| Exhaustive frontier | not stated | \(n\le 29\) | \(n\le 32\) (two unrefereed pipelines) |
| TAIL citation/scope | not discussed | not discussed | Levit–Mandrescu 2006 via Basit–Galvin 2021; KE graphs only; weak inequalities; general-graph counterexample given |
| WR / ISO in literature | not discussed | not discussed | neither found; relations to ordered LC / GSB / \(S_r\) made exact; WR not a general-graph fact |
| Caveat | "not a proof that no unindexed manuscript exists" | same | same; erdosproblems.com is Cloudflare-protected and was read via cached proxy text |

Both earlier refreshes are consistent with today's findings; neither addressed the three load-bearing checks, which are new here.

---

## 8. Does anything published supersede or contradict the framework?

- **No result proves the conjecture or a general partial result stronger than the framework's certified pieces.** The strongest general theorems remain Levit–Mandrescu's tail (used by the framework) and Basit–Galvin's increasing prefix (\(i_0\le\cdots\le i_\ell\), \(\ell=\lceil(n-\alpha+1)/4\rceil\)), which the framework does not need.
- **No result contradicts a certified framework theorem.** The only way a published object could do so is an LC (hence \(S_r\)) break at a prefix rank \(r\le 8\); none is known (§6).
- **Two published/preprint facts constrain any completion of the framework:** (a) ordered LC, GSB and \(S_r\) all fail in the tail for known trees, so no all-rank proof can go through \(S_r\ge0\) or OLC uniformly; only the weaker ISO (or GSB at descents) is consistent with known data at all ranks. (b) Galvin (2502.10654 §3) and Bencs (spherically symmetric trees with many LC breaks) show LC breaks can move far from the top; the framework's prefix/tail split at \(L(\alpha)\) is unaffected only because all known breaks remain at \(\ge 2\alpha/3\).
- **Nothing in the literature supplies WR, ISO, FML, or the whole-bundle payments.** These remain workspace-internal.

---

## 9. References (URLs accessed 2026-09-02)

Official: https://www.erdosproblems.com/993 ; https://www.erdosproblems.com/forum/thread/993 ; https://www.erdosproblems.com/forum/thread/993/proof-claims ; https://www.erdosproblems.com/history/993 ; https://raw.githubusercontent.com/teorth/erdosproblems/main/data/problems.yaml

Original: Alavi, Malde, Schwenk, Erdős, Congr. Numer. 58 (1987) 15–23.

Tail theorem and relatives: Levit–Mandrescu, Congr. Numer. 179 (2006) 109–119; Basit–Galvin, E-JC 28(3) (2021) P3.23, https://arxiv.org/abs/2006.12562 ; Galvin, Discrete Math. 311 (2011), https://ar5iv.labs.arxiv.org/html/1206.3206 ; Galvin, https://arxiv.org/abs/1110.3760 ; Bhattacharyya–Kahn, https://arxiv.org/abs/1301.1752 ; Galvin–Hilyard, https://arxiv.org/abs/1701.02204 .

LC failures: Yosef–Mizrachi–Kadrawi, https://arxiv.org/abs/2101.06744 ; Kadrawi–Levit–Yosef–Mizrachi, https://www.intechopen.com/chapters/1130709 ; Kadrawi–Levit, https://doi.org/10.26493/1855-3974.3207.2ad , https://arxiv.org/abs/2305.01784 ; Galvin, https://arxiv.org/abs/2502.10654 ; Ramos–Sun, https://arxiv.org/abs/2510.18826 ; Bautista-Ramos, https://arxiv.org/abs/2511.00334 ; Bautista-Ramos–Guillén-Galván–Gómez-Salgado, https://arxiv.org/abs/2603.14204 , https://doi.org/10.1007/s00373-026-03054-4 ; Levit–Kadrawi, https://arxiv.org/abs/2603.17114 .

Proved families / partial results: Li–Li–Yang–Zhang, https://arxiv.org/abs/2501.04245 ; Li, https://arxiv.org/abs/2603.03025 ; Hibi–Kara–Vien, https://arxiv.org/abs/2604.18824 ; Bhardwaj et al., https://arxiv.org/abs/2607.08480 ; Bendjeddou–Hardiman, https://arxiv.org/abs/2405.00511 ; Bencs, Discrete Math. 341 (2018); Liu–Tang–Zhao, https://doi.org/10.1007/s10255-025-0082-x ; Du–Heilman–Panova, https://arxiv.org/abs/2605.02193 (dominating sets, off-topic).

Computational (unrefereed): Reynolds, https://zenodo.org/records/19100781 , https://github.com/BrettRey/erdos-problem-993 (local clone `/tmp/reynolds993`); Tyorden, https://github.com/Tyorden/erdos-993-trees-n31 ; willblair0708, https://github.com/willblair0708/verified-combinatorics/tree/main/erdos-993 ; kylekaba, https://github.com/kylekaba/erdos-problem-993 .

Other: Quanta, https://www.quantamagazine.org/why-the-legendary-erdos-problems-are-falling-to-ai-20260803/ (no mention of #993); arXiv:2501.02375 (CLC inequality, unrelated).

### Caveats
- erdosproblems.com is behind a Cloudflare challenge; text was obtained via a rendering proxy (cached 2026-09-02) and search-engine snapshots. Comment authorship is inferred from content and corroborating repositories.
- The Levit–Mandrescu 2006 proceedings paper was not accessed directly; its statement is quoted from peer-reviewed restatements.
- Absence of evidence: this search does not prove that no unindexed or private manuscript exists. It must be repeated immediately before any public resolution claim (handoff rule 9, checklist item 9).
