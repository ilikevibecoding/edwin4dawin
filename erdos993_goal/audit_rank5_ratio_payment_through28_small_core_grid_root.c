#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>
#include <string.h>
#include "gtools.h"

/*
 * Independent audit of the strong-Q5 small-core grid.
 *
 * Unlike the primary callback's memoized directed-edge recursion, this code
 * first roots the tree once, computes downward states, and then performs a
 * separate outward reroot pass.  Every root-deleted polynomial is assembled
 * from the incident component states in that second pass.
 */

#define AUDIT_MAX_ORDER 19
#define DEGREE_LIMIT 6

typedef unsigned long long u64;
typedef __int128 i128;

typedef struct { u64 c[DEGREE_LIMIT + 1]; } Poly;

static int n_current;
static int degree_of[AUDIT_MAX_ORDER + 1];
static int neighbor[AUDIT_MAX_ORDER + 1][AUDIT_MAX_ORDER + 1];
static Poly downward_excluded[AUDIT_MAX_ORDER + 1];
static Poly downward_total[AUDIT_MAX_ORDER + 1];
static Poly deleted_polynomial[AUDIT_MAX_ORDER + 1];

static u64 tree_count[AUDIT_MAX_ORDER + 1];
static u64 root_count[AUDIT_MAX_ORDER + 1][27];
static u64 negative_count[AUDIT_MAX_ORDER + 1][27];
static i128 minimum_margin[AUDIT_MAX_ORDER + 1][27];
static unsigned char minimum_set[AUDIT_MAX_ORDER + 1][27];
static u64 witness_tree[AUDIT_MAX_ORDER + 1][27];
static int witness_root[AUDIT_MAX_ORDER + 1][27];
static u64 witness_window[AUDIT_MAX_ORDER + 1][27][5];

static u64 base_trees;
static u64 base_negative;
static i128 base_minimum;
static unsigned char base_minimum_set;
static u64 base_witness_tree;
static u64 base_witness_coefficients[7];
static int registered;

static Poly poly_one(void)
{
    Poly p;
    memset(&p, 0, sizeof(p));
    p.c[0] = 1;
    return p;
}

static Poly poly_multiply(Poly left, Poly right)
{
    Poly result;
    memset(&result, 0, sizeof(result));
    for (int i = 0; i <= DEGREE_LIMIT; ++i)
        for (int j = 0; i + j <= DEGREE_LIMIT; ++j)
            result.c[i + j] += left.c[i] * right.c[j];
    return result;
}

static Poly add_included_vertex(Poly excluded, Poly included_base)
{
    Poly total = excluded;
    for (int rank = 1; rank <= DEGREE_LIMIT; ++rank)
        total.c[rank] += included_base.c[rank - 1];
    return total;
}

static void downward_pass(int vertex, int parent)
{
    Poly excluded = poly_one();
    Poly included_base = poly_one();
    for (int index = 0; index < degree_of[vertex]; ++index)
    {
        int child = neighbor[vertex][index];
        if (child == parent) continue;
        downward_pass(child, vertex);
        excluded = poly_multiply(excluded, downward_total[child]);
        included_base = poly_multiply(included_base, downward_excluded[child]);
    }
    downward_excluded[vertex] = excluded;
    downward_total[vertex] = add_included_vertex(excluded, included_base);
}

static void outward_pass(int vertex, int parent, Poly parent_excluded, Poly parent_total)
{
    Poly all_total = poly_one();
    for (int index = 0; index < degree_of[vertex]; ++index)
    {
        int adjacent = neighbor[vertex][index];
        Poly component_total = adjacent == parent
            ? parent_total : downward_total[adjacent];
        all_total = poly_multiply(all_total, component_total);
    }
    deleted_polynomial[vertex] = all_total;

    for (int index = 0; index < degree_of[vertex]; ++index)
    {
        int child = neighbor[vertex][index];
        if (child == parent) continue;
        Poly side_excluded = poly_one();
        Poly side_included_base = poly_one();
        for (int other_index = 0; other_index < degree_of[vertex]; ++other_index)
        {
            int adjacent = neighbor[vertex][other_index];
            if (adjacent == child) continue;
            Poly component_excluded = adjacent == parent
                ? parent_excluded : downward_excluded[adjacent];
            Poly component_total = adjacent == parent
                ? parent_total : downward_total[adjacent];
            side_excluded = poly_multiply(side_excluded, component_total);
            side_included_base = poly_multiply(side_included_base, component_excluded);
        }
        Poly side_total = add_included_vertex(side_excluded, side_included_base);
        outward_pass(child, vertex, side_excluded, side_total);
    }
}

static u64 choose_u64(int n, int k)
{
    if (k < 0 || k > n) return 0;
    if (k > n - k) k = n - k;
    u64 result = 1;
    for (int j = 1; j <= k; ++j)
        result = result * (u64)(n - k + j) / (u64)j;
    return result;
}

static u64 with_isolates(const Poly *core, int isolates, int rank)
{
    u64 result = 0;
    for (int picked = 0; picked <= rank; ++picked)
        result += choose_u64(isolates, picked) * core->c[rank - picked];
    return result;
}

static i128 payment_margin(u64 a, u64 b, u64 d, u64 e, u64 f)
{
    i128 q4 = 8 * (i128)e * e - (i128)d * e - 10 * (i128)d * f;
    i128 mismatch = (i128)b * d - (i128)a * e;
    i128 payment =
        6 * (i128)a * (a + d) * q4
        + (i128)a * d * e * (a + d + 2 * e)
        + 2 * (i128)a * a * e * e
        - 50 * mismatch * mismatch;
    return payment - (i128)a * d * e * (a + d);
}

static i128 base_reserve(const Poly *tree)
{
    i128 i4 = tree->c[4];
    i128 i5 = tree->c[5];
    i128 i6 = tree->c[6];
    i128 q5 = 10 * i5 * i5 - i4 * i5 - 12 * i4 * i6;
    return 5 * q5 - i4 * i5;
}

static void print_i128(i128 value)
{
    if (value == 0) { putchar('0'); return; }
    if (value < 0) { putchar('-'); value = -value; }
    char text[64];
    int length = 0;
    while (value)
    {
        text[length++] = (char)('0' + value % 10);
        value /= 10;
    }
    while (length) putchar(text[--length]);
}

static void report(void)
{
    puts("BASE,trees,negative,minimum,witness_tree,i0,i1,i2,i3,i4,i5,i6");
    printf("BASE,%llu,%llu,", base_trees, base_negative);
    print_i128(base_minimum);
    printf(",%llu", base_witness_tree);
    for (int rank = 0; rank <= 6; ++rank)
        printf(",%llu", base_witness_coefficients[rank]);
    putchar('\n');

    puts("GRID,core_order,siblings,total_order,trees,roots,negative,minimum,witness_tree,witness_root,a,b,d,e,f");
    u64 total_tree_rows = 0, total_root_rows = 0, total_negative = 0;
    for (int order = 1; order <= AUDIT_MAX_ORDER; ++order)
    {
        int low = 10 - order;
        if (low < 0) low = 0;
        int high = 26 - order;
        for (int siblings = low; siblings <= high; ++siblings)
        {
            printf("GRID,%d,%d,%d,%llu,%llu,%llu,", order, siblings,
                   order + siblings + 2, tree_count[order],
                   root_count[order][siblings], negative_count[order][siblings]);
            print_i128(minimum_margin[order][siblings]);
            printf(",%llu,%d,%llu,%llu,%llu,%llu,%llu\n",
                   witness_tree[order][siblings], witness_root[order][siblings],
                   witness_window[order][siblings][0],
                   witness_window[order][siblings][1],
                   witness_window[order][siblings][2],
                   witness_window[order][siblings][3],
                   witness_window[order][siblings][4]);
            total_tree_rows += tree_count[order];
            total_root_rows += root_count[order][siblings];
            total_negative += negative_count[order][siblings];
        }
    }
    printf("TOTAL,%llu,%llu,%llu\n", total_tree_rows, total_root_rows, total_negative);
    puts(base_negative == 0 && total_negative == 0
         ? "PASS_INDEPENDENT_RANK5_BASE_AND_SMALL_CORE_GRID_AUDIT"
         : "FAIL_RANK5_BASE_OR_SMALL_CORE_GRID_AUDIT");
}

void audit_ratio_payment_grid(FILE *output, int parent[], int order)
{
    (void)output;
    if (!registered)
    {
        if (atexit(report) != 0) abort();
        registered = 1;
    }
    n_current = order;
    memset(degree_of, 0, sizeof(degree_of));
    memset(neighbor, 0, sizeof(neighbor));
    memset(downward_excluded, 0, sizeof(downward_excluded));
    memset(downward_total, 0, sizeof(downward_total));
    memset(deleted_polynomial, 0, sizeof(deleted_polynomial));
    for (int vertex = 2; vertex <= order; ++vertex)
    {
        int ancestor = parent[vertex];
        neighbor[vertex][degree_of[vertex]++] = ancestor;
        neighbor[ancestor][degree_of[ancestor]++] = vertex;
    }
    downward_pass(1, 0);
    outward_pass(1, 0, poly_one(), poly_one());
    Poly core = downward_total[1];
    u64 tree_index = tree_count[order]++;

    if (order == 11)
    {
        i128 reserve = base_reserve(&core);
        ++base_trees;
        if (reserve < 0) ++base_negative;
        if (!base_minimum_set || reserve < base_minimum)
        {
            base_minimum_set = 1;
            base_minimum = reserve;
            base_witness_tree = tree_index;
            memcpy(base_witness_coefficients, core.c, sizeof(base_witness_coefficients));
        }
    }

    int low = 10 - order;
    if (low < 0) low = 0;
    int high = 26 - order;
    for (int siblings = low; siblings <= high; ++siblings)
    {
        u64 d = with_isolates(&core, siblings, 3);
        u64 e = with_isolates(&core, siblings, 4);
        u64 f = with_isolates(&core, siblings, 5);
        for (int root = 1; root <= order; ++root)
        {
            u64 a = e + deleted_polynomial[root].c[3];
            u64 b = f + deleted_polynomial[root].c[4];
            i128 margin = payment_margin(a, b, d, e, f);
            ++root_count[order][siblings];
            if (margin < 0) ++negative_count[order][siblings];
            if (!minimum_set[order][siblings]
                || margin < minimum_margin[order][siblings])
            {
                minimum_set[order][siblings] = 1;
                minimum_margin[order][siblings] = margin;
                witness_tree[order][siblings] = tree_index;
                witness_root[order][siblings] = root;
                witness_window[order][siblings][0] = a;
                witness_window[order][siblings][1] = b;
                witness_window[order][siblings][2] = d;
                witness_window[order][siblings][3] = e;
                witness_window[order][siblings][4] = f;
            }
        }
    }
}
