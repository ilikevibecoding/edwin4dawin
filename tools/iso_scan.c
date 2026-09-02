/*
 * iso_scan.c -- independent falsification scanner for the WR/ISO "target
 * theorem" of the Erdős #993 (Alavi–Malde–Schwenk–Erdős) proof framework.
 *
 * Reads `nauty-gentreeg -p -q n [res/mod]` parent arrays (1-indexed,
 * parent[1] = 0, parent[i] < i) from stdin, computes the exact independence
 * polynomial I(T;x) = sum_r p_r x^r of every tree in uint64 arithmetic
 * (n <= 32, so every coefficient is <= C(32,16) < 2^30 and every partial
 * convolution sum is itself a count of independent sets, hence also < 2^30),
 * and evaluates in (unsigned) __int128:
 *
 *   alpha       = deg I = independence number
 *   L(alpha)    = ceil((2 alpha - 1)/3)  = (2 alpha + 1) / 3 in integer division
 *   unimodal?   no descent followed by a strict ascent
 *   LC break k  p_{k-1} p_{k+1} > p_k^2               (1 <= k <= alpha-1)
 *   WR_r        p_{r-1} <= r p_r                     (1 <= r <= alpha)
 *               target range: 1 <= r < L(alpha)
 *   ISO_r       Q_r = r p_r^2 + p_{r-1}^2 - (r+1) p_{r-1} p_{r+1} >= 0
 *               evaluated for 1 <= r <= alpha-1;
 *               target range: 2 <= r < L(alpha);  descent-conditional variant
 *               counts only target r with p_{r-1} > p_r.
 *   slack       Q_r / (p_{r-1} p_{r+1}) minimised over target r (exact
 *               rational comparison; numerator/denominator recorded).
 *
 * Output (stdout):
 *   ALARM_ISO / ALARM_WR / ALARM_NONUNIMODAL lines for target-range
 *   violators (parent array, polynomial, r, Q_r),
 *   LC_FAIL lines for every log-concavity break (all k),
 *   optional TREE lines (-v) for every tree (used by the pytest cross-check),
 *   a human-readable STATS trailer and one machine-readable STATS_JSON line.
 *
 * Build:  gcc -O3 -march=native -Wall -Wextra -o iso_scan iso_scan.c
 * Usage:  nauty-gentreeg -p -q 26 0/2 | ./iso_scan 26 [-v] [-o stats.json] [--res 0 --mod 2]
 *
 * Input parsing and the bottom-up F/G (vertex excluded / included) fold are
 * adapted from scripts/lc_census.c of github.com/BrettRey/erdos-problem-993
 * (MIT License, Copyright (c) 2026 Brett Reynolds).  All inequality logic,
 * exact-rational slack tracking and the JSON trailer are new.
 */
#include <inttypes.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define MAXN 33
#define MAXC (MAXN + 1)
#define OPEN_RANK 9   /* ISO_r for r >= 9 is open in the user's corpus */

typedef __int128 i128;
typedef unsigned __int128 u128;

static int n;
static int par[MAXN];
static uint64_t F[MAXN][MAXC], G[MAXN][MAXC];
static int lf[MAXN], lg[MAXN];
static int verbose = 0;

/* ---------- counters ---------- */
static unsigned long long trees = 0;
static unsigned long long nonunimodal = 0;
static unsigned long long lc_fail_trees = 0, lc_fail_cells = 0;
static unsigned long long lc_by_k[MAXC], lc_by_dist[2 * MAXC]; /* dist = k - L(alpha) + MAXC */
static unsigned long long iso_fail_cells_target = 0, iso_fail_trees_target = 0;
static unsigned long long iso_fail_cells_outside = 0, iso_fail_trees_outside = 0;
static unsigned long long iso_fail_cells_desc_target = 0, iso_fail_trees_desc_target = 0;
static unsigned long long wr_fail_cells_target = 0, wr_fail_trees_target = 0;
static unsigned long long wr_fail_cells_all = 0, wr_fail_trees_all = 0;
static unsigned long long wr_first_fail_dist[2 * MAXC]; /* first failing r - L(alpha) + MAXC */
static unsigned long long trees_with_target_descent = 0, target_descent_cells = 0;
static unsigned long long trees_with_target_desc_r_ge_open = 0;
static unsigned long long alpha_hist[MAXC];
static unsigned long long mode_hist[MAXC];
static unsigned long long alarms = 0;

/* tightest ISO cells: exact fraction Q / D, D = p_{r-1} p_{r+1} */
typedef struct {
    int valid;
    i128 num;
    u128 den;
    int r, alpha;
    int par[MAXN];
    uint64_t poly[MAXC];
    int len;
} cell_t;
static cell_t best_target, best_target_desc, best_target_open, best_all;

/* ---------- helpers ---------- */
static void u128_to_str(u128 v, char *out)
{
    char buf[48]; int i = 0;   /* 2^128 has 39 decimal digits */
    if (v == 0) { out[0] = '0'; out[1] = 0; return; }
    while (v) { buf[i++] = (char)('0' + (int)(v % 10)); v /= 10; }
    int j = 0;
    while (i) out[j++] = buf[--i];
    out[j] = 0;
}
static void i128_to_str(i128 v, char *out)
{
    if (v < 0) { out[0] = '-'; u128_to_str((u128)(-v), out + 1); }
    else u128_to_str((u128)v, out);
}

/* is a/b < c/d for a,c signed, b,d > 0 ?  |a d| <= 2^66 * 2^60 fits in i128 */
static int frac_less(i128 a, u128 b, i128 c, u128 d)
{
    return a * (i128)d < c * (i128)b;
}

static void save_cell(cell_t *c, i128 num, u128 den, int r, const uint64_t *poly, int len)
{
    if (c->valid && !frac_less(num, den, c->num, c->den)) return;
    c->valid = 1; c->num = num; c->den = den; c->r = r; c->alpha = len - 1; c->len = len;
    memcpy(c->par, par, sizeof(int) * (size_t)(n + 1));
    memcpy(c->poly, poly, sizeof(uint64_t) * (size_t)len);
}

static void print_par(FILE *f, const int *p)
{
    for (int i = 1; i <= n; i++) fprintf(f, i == 1 ? "%d" : ",%d", p[i]);
}
static void print_poly(FILE *f, const uint64_t *c, int len)
{
    for (int i = 0; i < len; i++) fprintf(f, i == 0 ? "%" PRIu64 : ",%" PRIu64, c[i]);
}

static void report_line(const char *tag, const uint64_t *c, int len, int r, const char *extra)
{
    printf("%s n=%d alpha=%d L=%d r=%d par=", tag, n, len - 1, (2 * (len - 1) + 1) / 3, r);
    print_par(stdout, par);
    printf(" poly=");
    print_poly(stdout, c, len);
    if (extra) printf(" %s", extra);
    printf("\n");
    fflush(stdout);
}

/* ---------- per-tree evaluation ---------- */
static void evaluate(const uint64_t *c, int len)
{
    int alpha = len - 1;
    int L = (2 * alpha + 1) / 3;   /* ceil((2 alpha - 1)/3) */
    char extra[320], s1[96], s2[96];
    alpha_hist[alpha]++;

    /* mode (first index of the maximum) and unimodality */
    int mode = 0;
    for (int i = 1; i < len; i++) if (c[i] > c[mode]) mode = i;
    mode_hist[mode]++;
    int rising = 1, uni = 1;
    for (int i = 1; i < len; i++) {
        if (rising) { if (c[i] < c[i - 1]) rising = 0; }
        else if (c[i] > c[i - 1]) { uni = 0; break; }
    }
    if (!uni) {
        nonunimodal++; alarms++;
        report_line("ALARM_NONUNIMODAL", c, len, -1, NULL);
    }

    /* log-concavity */
    int lc_tree = 0;
    for (int k = 1; k < alpha; k++) {
        u128 lhs = (u128)c[k - 1] * c[k + 1], rhs = (u128)c[k] * c[k];
        if (lhs > rhs) {
            lc_tree = 1; lc_fail_cells++; lc_by_k[k]++; lc_by_dist[k - L + MAXC]++;
            u128_to_str(lhs - rhs, s1);
            snprintf(extra, sizeof extra, "k=%d k_minus_L=%d defect=%s", k, k - L, s1);
            report_line("LC_FAIL", c, len, k, extra);
        }
    }
    if (lc_tree) lc_fail_trees++;

    /* WR_r : p_{r-1} <= r p_r, 1 <= r <= alpha */
    int wr_t = 0, wr_a = 0, wr_first = -1;
    for (int r = 1; r <= alpha; r++) {
        if ((u128)c[r - 1] > (u128)r * c[r]) {
            wr_fail_cells_all++; wr_a = 1;
            if (wr_first < 0) wr_first = r;
            if (r < L) {
                wr_fail_cells_target++; wr_t = 1; alarms++;
                snprintf(extra, sizeof extra, "p_prev=%" PRIu64 " r_times_p_r=%" PRIu64,
                         c[r - 1], (uint64_t)r * c[r]);
                report_line("ALARM_WR", c, len, r, extra);
            }
        }
    }
    if (wr_a) { wr_fail_trees_all++; wr_first_fail_dist[wr_first - L + MAXC]++; }
    if (wr_t) wr_fail_trees_target++;

    /* descents in the target range */
    int desc_t = 0, desc_open = 0;
    for (int r = 1; r < L && r <= alpha; r++) {
        if (c[r - 1] > c[r]) {
            target_descent_cells++; desc_t = 1;
            if (r >= OPEN_RANK) desc_open = 1;
        }
    }
    if (desc_t) trees_with_target_descent++;
    if (desc_open) trees_with_target_desc_r_ge_open++;

    /* ISO_r, 1 <= r <= alpha-1 */
    int iso_t = 0, iso_o = 0, iso_d = 0;
    for (int r = 1; r < alpha; r++) {
        i128 Q = (i128)r * (i128)((u128)c[r] * c[r])
               + (i128)((u128)c[r - 1] * c[r - 1])
               - (i128)(r + 1) * (i128)((u128)c[r - 1] * c[r + 1]);
        u128 D = (u128)c[r - 1] * c[r + 1];
        int in_target = (r >= 2 && r < L);
        int descent = c[r - 1] > c[r];
        if (D > 0) save_cell(&best_all, Q, D, r, c, len);
        if (in_target) {
            if (D > 0) {
                save_cell(&best_target, Q, D, r, c, len);
                if (descent) save_cell(&best_target_desc, Q, D, r, c, len);
                if (r >= OPEN_RANK) save_cell(&best_target_open, Q, D, r, c, len);
            }
            if (Q < 0) {
                iso_fail_cells_target++; iso_t = 1; alarms++;
                if (descent) { iso_fail_cells_desc_target++; iso_d = 1; }
                i128_to_str(Q, s1); u128_to_str(D, s2);
                snprintf(extra, sizeof extra, "Q=%s D=%s descent=%d", s1, s2, descent);
                report_line("ALARM_ISO", c, len, r, extra);
            }
        } else if (Q < 0) {
            iso_fail_cells_outside++; iso_o = 1;
        }
    }
    if (iso_t) iso_fail_trees_target++;
    if (iso_o) iso_fail_trees_outside++;
    if (iso_d) iso_fail_trees_desc_target++;

    if (verbose) {
        snprintf(extra, sizeof extra, "mode=%d unimodal=%d lc_fail=%d wr_fail_target=%d iso_fail_target=%d",
                 mode, uni, lc_tree, wr_t, iso_t);
        report_line("TREE", c, len, -1, extra);
    }
}

static void process_tree(void)
{
    trees++;
    if (par[1] != 0) { fprintf(stderr, "bad parent array: par[1]=%d\n", par[1]); exit(3); }
    for (int v = 2; v <= n; v++)
        if (par[v] < 1 || par[v] >= v) {
            fprintf(stderr, "bad parent array at tree %llu: par[%d]=%d\n", trees, v, par[v]);
            exit(3);
        }
    for (int v = 1; v <= n; v++) {
        F[v][0] = 1; lf[v] = 1;
        G[v][0] = 0; G[v][1] = 1; lg[v] = 2;
    }
    /* children have larger indices: fold v into par[v], v = n..2 */
    for (int v = n; v >= 2; v--) {
        int p = par[v];
        uint64_t merged[MAXC], tmp[MAXC];
        int lm = lf[v] > lg[v] ? lf[v] : lg[v];
        for (int i = 0; i < lm; i++)
            merged[i] = (i < lf[v] ? F[v][i] : 0) + (i < lg[v] ? G[v][i] : 0);
        int lt = lf[p] + lm - 1;
        memset(tmp, 0, (size_t)lt * sizeof(uint64_t));
        for (int i = 0; i < lf[p]; i++) {
            uint64_t fi = F[p][i];
            if (!fi) continue;
            for (int j = 0; j < lm; j++) tmp[i + j] += fi * merged[j];
        }
        memcpy(F[p], tmp, (size_t)lt * sizeof(uint64_t));
        lf[p] = lt;
        lt = lg[p] + lf[v] - 1;
        memset(tmp, 0, (size_t)lt * sizeof(uint64_t));
        for (int i = 0; i < lg[p]; i++) {
            uint64_t gi = G[p][i];
            if (!gi) continue;
            for (int j = 0; j < lf[v]; j++) tmp[i + j] += gi * F[v][j];
        }
        memcpy(G[p], tmp, (size_t)lt * sizeof(uint64_t));
        lg[p] = lt;
    }
    uint64_t c[MAXC];
    int len = lf[1] > lg[1] ? lf[1] : lg[1];
    for (int i = 0; i < len; i++)
        c[i] = (i < lf[1] ? F[1][i] : 0) + (i < lg[1] ? G[1][i] : 0);
    while (len > 1 && c[len - 1] == 0) len--;   /* never happens for a tree, defensive */
    evaluate(c, len);
}

/* ---------- JSON trailer ---------- */
static void json_hist(FILE *f, const char *name, const unsigned long long *h, int lo, int hi, int shift)
{
    fprintf(f, "\"%s\":{", name);
    int first = 1;
    for (int i = lo; i <= hi; i++)
        if (h[i]) { fprintf(f, "%s\"%d\":%llu", first ? "" : ",", i - shift, h[i]); first = 0; }
    fprintf(f, "}");
}
static void json_cell(FILE *f, const char *name, const cell_t *c)
{
    char s1[96], s2[96];
    if (!c->valid) { fprintf(f, "\"%s\":null", name); return; }
    i128_to_str(c->num, s1); u128_to_str(c->den, s2);
    fprintf(f, "\"%s\":{\"num\":\"%s\",\"den\":\"%s\",\"value\":%.9g,\"r\":%d,\"alpha\":%d,\"L\":%d,\"par\":[",
            name, s1, s2, (double)c->num / (double)c->den, c->r, c->alpha, (2 * c->alpha + 1) / 3);
    for (int i = 1; i <= n; i++) fprintf(f, i == 1 ? "%d" : ",%d", c->par[i]);
    fprintf(f, "],\"poly\":[");
    for (int i = 0; i < c->len; i++) fprintf(f, i == 0 ? "%" PRIu64 : ",%" PRIu64, c->poly[i]);
    fprintf(f, "]}");
}
static void write_json(FILE *f, int res, int mod)
{
    fprintf(f, "{\"n\":%d,\"res\":%d,\"mod\":%d,\"trees\":%llu,\"nonunimodal\":%llu,", n, res, mod, trees, nonunimodal);
    fprintf(f, "\"lc_fail_trees\":%llu,\"lc_fail_cells\":%llu,", lc_fail_trees, lc_fail_cells);
    json_hist(f, "lc_by_k", lc_by_k, 0, MAXC - 1, 0); fprintf(f, ",");
    json_hist(f, "lc_by_k_minus_L", lc_by_dist, 0, 2 * MAXC - 1, MAXC); fprintf(f, ",");
    fprintf(f, "\"iso_fail_cells_target\":%llu,\"iso_fail_trees_target\":%llu,", iso_fail_cells_target, iso_fail_trees_target);
    fprintf(f, "\"iso_fail_cells_outside\":%llu,\"iso_fail_trees_outside\":%llu,", iso_fail_cells_outside, iso_fail_trees_outside);
    fprintf(f, "\"iso_fail_cells_desc_target\":%llu,\"iso_fail_trees_desc_target\":%llu,", iso_fail_cells_desc_target, iso_fail_trees_desc_target);
    fprintf(f, "\"wr_fail_cells_target\":%llu,\"wr_fail_trees_target\":%llu,", wr_fail_cells_target, wr_fail_trees_target);
    fprintf(f, "\"wr_fail_cells_all\":%llu,\"wr_fail_trees_all\":%llu,", wr_fail_cells_all, wr_fail_trees_all);
    json_hist(f, "wr_first_fail_r_minus_L", wr_first_fail_dist, 0, 2 * MAXC - 1, MAXC); fprintf(f, ",");
    fprintf(f, "\"trees_with_target_descent\":%llu,\"target_descent_cells\":%llu,\"trees_with_target_descent_r_ge_%d\":%llu,",
            trees_with_target_descent, target_descent_cells, OPEN_RANK, trees_with_target_desc_r_ge_open);
    json_hist(f, "alpha_hist", alpha_hist, 0, MAXC - 1, 0); fprintf(f, ",");
    json_hist(f, "mode_hist", mode_hist, 0, MAXC - 1, 0); fprintf(f, ",");
    json_cell(f, "min_slack_target", &best_target); fprintf(f, ",");
    json_cell(f, "min_slack_target_descent", &best_target_desc); fprintf(f, ",");
    fprintf(f, "\"open_rank\":%d,", OPEN_RANK);
    json_cell(f, "min_slack_target_r_ge_open_rank", &best_target_open); fprintf(f, ",");
    json_cell(f, "min_slack_all_r", &best_all);
    fprintf(f, ",\"alarms\":%llu}\n", alarms);
}

int main(int argc, char **argv)
{
    if (argc < 2) { fprintf(stderr, "usage: iso_scan n [-v] [-o stats.json] [--res r --mod m]\n"); return 2; }
    n = atoi(argv[1]);
    if (n < 1 || n > 32) { fprintf(stderr, "n out of range [1,32]\n"); return 2; }
    const char *jsonpath = NULL; int res = 0, mod = 1;
    for (int i = 2; i < argc; i++) {
        if (!strcmp(argv[i], "-v") || !strcmp(argv[i], "all")) verbose = 1;
        else if (!strcmp(argv[i], "-o") && i + 1 < argc) jsonpath = argv[++i];
        else if (!strcmp(argv[i], "--res") && i + 1 < argc) res = atoi(argv[++i]);
        else if (!strcmp(argv[i], "--mod") && i + 1 < argc) mod = atoi(argv[++i]);
        else { fprintf(stderr, "unknown argument %s\n", argv[i]); return 2; }
    }
    /* sanity check of the integer form of L(alpha) */
    for (int a = 1; a <= 32; a++) {
        int L1 = (2 * a + 1) / 3, L2 = (2 * a - 1 + 2) / 3;  /* ceil((2a-1)/3) */
        if (L1 != L2) { fprintf(stderr, "L(alpha) formula mismatch\n"); return 4; }
    }

    static char buf[1 << 20];
    size_t got;
    int field = 0, val = -1;
    while ((got = fread(buf, 1, sizeof buf, stdin)) > 0) {
        for (size_t i = 0; i < got; i++) {
            char ch = buf[i];
            if (ch >= '0' && ch <= '9') val = (val < 0 ? 0 : val) * 10 + (ch - '0');
            else if (val >= 0) {
                if (field >= n) { fprintf(stderr, "too many fields on a line\n"); return 3; }
                par[++field] = val; val = -1;
                if (ch == '\n') {
                    if (field != n) { fprintf(stderr, "line with %d fields, expected %d\n", field, n); return 3; }
                    process_tree(); field = 0;
                }
            } else if (ch == '\n' && field) {
                if (field != n) { fprintf(stderr, "line with %d fields, expected %d\n", field, n); return 3; }
                process_tree(); field = 0;
            }
        }
    }
    if (val >= 0) { par[++field] = val; }
    if (field) {
        if (field != n) { fprintf(stderr, "TRUNCATED INPUT: %d leftover fields\n", field); return 3; }
        process_tree();
    }

    printf("STATS n=%d trees=%llu nonunimodal=%llu lc_fail_trees=%llu lc_fail_cells=%llu "
           "iso_fail_target=%llu iso_fail_desc_target=%llu iso_fail_outside=%llu "
           "wr_fail_target=%llu wr_fail_all_trees=%llu trees_with_target_descent=%llu alarms=%llu\n",
           n, trees, nonunimodal, lc_fail_trees, lc_fail_cells, iso_fail_cells_target,
           iso_fail_cells_desc_target, iso_fail_cells_outside, wr_fail_cells_target,
           wr_fail_trees_all, trees_with_target_descent, alarms);
    printf("STATS_JSON ");
    write_json(stdout, res, mod);
    if (jsonpath) {
        FILE *f = fopen(jsonpath, "w");
        if (!f) { perror(jsonpath); return 5; }
        write_json(f, res, mod);
        fclose(f);
    }
    return alarms ? 42 : 0;
}
