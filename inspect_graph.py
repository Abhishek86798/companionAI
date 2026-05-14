import sqlite3
conn = sqlite3.connect('.code-review-graph/graph.db')
conn.row_factory = sqlite3.Row

# Phase 3 relevant files
phase3_files = [
    'dependencies.py', 'config.py', 'schemas.py', 'messages.py',
    'message.py', 'main.py', 'api.ts', 'chat/page.tsx', 'layout.tsx',
    'page.tsx'
]

print("=== NODES for Phase 3 files ===")
for f in phase3_files:
    rows = conn.execute(
        "SELECT id, kind, name, file_path, line_start, line_end, params, return_type FROM nodes WHERE file_path LIKE ?",
        (f'%{f}',)
    ).fetchall()
    if rows:
        print(f"\n--- {f} ---")
        for r in rows:
            print(f"  [{r['id']}] {r['kind']} '{r['name']}' L{r['line_start']}-{r['line_end']} params={r['params']} returns={r['return_type']}")

print("\n=== EDGES between Phase 3 nodes ===")
rows = conn.execute("""
    SELECT e.kind, n1.name as src, n1.file_path as src_file, n2.name as dst, n2.file_path as dst_file
    FROM edges e
    JOIN nodes n1 ON e.source_id = n1.id
    JOIN nodes n2 ON e.target_id = n2.id
    WHERE n1.file_path LIKE '%backend%' OR n2.file_path LIKE '%backend%'
    LIMIT 60
""").fetchall()
for r in rows:
    src_short = r['src_file'].split('\\')[-1] if r['src_file'] else '?'
    dst_short = r['dst_file'].split('\\')[-1] if r['dst_file'] else '?'
    print(f"  {r['kind']}: {src_short}::{r['src']} → {dst_short}::{r['dst']}")
