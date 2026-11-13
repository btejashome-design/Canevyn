"""
CaneVyn Database Export and Viewer Generator
Extracts all tables from backend/canevyn.db into database_export/ and refreshes database_viewer.html.
"""

import sqlite3
import json
import csv
import os
import html

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, "backend", "canevyn.db")
EXPORT_DIR = os.path.join(BASE_DIR, "database_export")
VIEWER_HTML = os.path.join(BASE_DIR, "database_viewer.html")

os.makedirs(EXPORT_DIR, exist_ok=True)

if not os.path.exists(DB_PATH):
    print(f"Error: Database not found at {DB_PATH}")
    exit(1)

conn = sqlite3.connect(DB_PATH)
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;")
tables = [row[0] for row in cursor.fetchall()]

db_data = {}

for table in tables:
    cursor.execute(f"SELECT * FROM {table}")
    rows = cursor.fetchall()
    
    col_names = [description[0] for description in cursor.description]
    table_rows = []
    
    csv_file = os.path.join(EXPORT_DIR, f"{table}.csv")
    with open(csv_file, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(col_names)
        for r in rows:
            row_dict = dict(r)
            table_rows.append(row_dict)
            writer.writerow([row_dict[col] for col in col_names])
            
    json_file = os.path.join(EXPORT_DIR, f"{table}.json")
    with open(json_file, "w", encoding="utf-8") as f:
        json.dump(table_rows, f, indent=2, default=str)
        
    db_data[table] = {
        "columns": col_names,
        "rowCount": len(table_rows),
        "rows": table_rows
    }

conn.close()

html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CaneVyn Database Inspector</title>
  <style>
    :root {{
      --bg: #0b132b;
      --card-bg: #1c2541;
      --panel-bg: #131d36;
      --accent: #48bfe3;
      --accent-glow: #00f2fe;
      --text: #e0e1dd;
      --text-muted: #8d99ae;
      --border: #2e3a59;
      --success: #2ec4b6;
      --warning: #ffb703;
      --danger: #e63946;
    }}
    * {{
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }}
    body {{
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }}
    header {{
      background: var(--panel-bg);
      border-bottom: 1px solid var(--border);
      padding: 16px 28px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    }}
    .logo-area {{
      display: flex;
      align-items: center;
      gap: 14px;
    }}
    .badge-live {{
      background: rgba(72, 191, 227, 0.15);
      border: 1px solid var(--accent);
      color: var(--accent);
      padding: 4px 10px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }}
    h1 {{
      font-size: 20px;
      font-weight: 700;
      letter-spacing: 0.5px;
      color: #fff;
    }}
    .subtext {{
      color: var(--text-muted);
      font-size: 13px;
      margin-top: 2px;
    }}
    .container {{
      display: flex;
      flex: 1;
      height: calc(100vh - 75px);
      overflow: hidden;
    }}
    aside {{
      width: 280px;
      background: var(--panel-bg);
      border-right: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      flex-shrink: 0;
    }}
    .aside-header {{
      padding: 14px 18px;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      color: var(--text-muted);
      border-bottom: 1px solid var(--border);
      letter-spacing: 0.5px;
    }}
    .table-list {{
      list-style: none;
      overflow-y: auto;
      flex: 1;
    }}
    .table-item {{
      padding: 12px 18px;
      cursor: pointer;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid rgba(46, 58, 89, 0.4);
      transition: background 0.15s, color 0.15s;
      font-size: 14px;
    }}
    .table-item:hover {{
      background: rgba(72, 191, 227, 0.08);
      color: var(--accent);
    }}
    .table-item.active {{
      background: rgba(72, 191, 227, 0.15);
      border-left: 4px solid var(--accent);
      color: #fff;
      font-weight: 600;
    }}
    .row-pill {{
      background: rgba(255, 255, 255, 0.08);
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 11px;
      color: var(--text-muted);
    }}
    main {{
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      padding: 20px 24px;
    }}
    .toolbar {{
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      gap: 16px;
    }}
    .search-box {{
      position: relative;
      flex: 1;
      max-width: 450px;
    }}
    .search-input {{
      width: 100%;
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 9px 14px;
      color: #fff;
      font-size: 14px;
      outline: none;
      transition: border-color 0.2s;
    }}
    .search-input:focus {{
      border-color: var(--accent);
    }}
    .btn-group {{
      display: flex;
      gap: 8px;
    }}
    .btn {{
      background: var(--card-bg);
      border: 1px solid var(--border);
      color: var(--text);
      padding: 8px 14px;
      border-radius: 6px;
      font-size: 13px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      text-decoration: none;
      transition: all 0.15s;
    }}
    .btn:hover {{
      background: rgba(72, 191, 227, 0.12);
      border-color: var(--accent);
      color: #fff;
    }}
    .table-container {{
      flex: 1;
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      overflow: auto;
      box-shadow: 0 4px 16px rgba(0,0,0,0.2);
    }}
    table {{
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
      text-align: left;
    }}
    thead th {{
      position: sticky;
      top: 0;
      background: #17213c;
      color: var(--accent);
      padding: 11px 14px;
      font-weight: 600;
      border-bottom: 2px solid var(--border);
      white-space: nowrap;
      z-index: 2;
    }}
    tbody tr {{
      border-bottom: 1px solid rgba(46, 58, 89, 0.4);
      transition: background 0.1s;
    }}
    tbody tr:hover {{
      background: rgba(72, 191, 227, 0.05);
    }}
    tbody td {{
      padding: 10px 14px;
      color: var(--text);
      max-width: 320px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }}
    .role-badge {{
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      text-transform: capitalize;
    }}
    .role-canevyn_user {{
      background: rgba(46, 196, 182, 0.2);
      color: #2ec4b6;
      border: 1px solid #2ec4b6;
    }}
    .role-authorized_member {{
      background: rgba(255, 183, 3, 0.18);
      color: #ffb703;
      border: 1px solid #ffb703;
    }}
    .canevyn-id-badge {{
      font-family: monospace;
      font-weight: 700;
      color: #00f2fe;
      background: rgba(0, 242, 254, 0.1);
      padding: 2px 6px;
      border-radius: 4px;
      border: 1px solid rgba(0, 242, 254, 0.3);
    }}
    .empty-state {{
      text-align: center;
      padding: 60px 20px;
      color: var(--text-muted);
    }}
  </style>
</head>
<body>
  <header>
    <div class="logo-area">
      <span class="badge-live">SQLite Direct View</span>
      <div>
        <h1>CaneVyn Database Inspector</h1>
        <div class="subtext">Direct read of <code>backend/canevyn.db</code></div>
      </div>
    </div>
    <div style="font-size: 13px; color: var(--text-muted);">
      File: <span style="color:#fff;">C:\\Users\\Thrisha\\Desktop\\Canevyn\\backend\\canevyn.db</span>
    </div>
  </header>

  <div class="container">
    <aside>
      <div class="aside-header">Tables in Database ({len(tables)})</div>
      <ul class="table-list" id="tableNav"></ul>
    </aside>

    <main>
      <div class="toolbar">
        <div class="search-box">
          <input type="text" id="searchInput" class="search-input" placeholder="Search rows in current table...">
        </div>
        <div class="btn-group">
          <button class="btn" id="exportCsvBtn">📥 Open CSV Folder</button>
        </div>
      </div>

      <div class="table-container">
        <table id="dataTable">
          <thead><tr id="tableHead"></tr></thead>
          <tbody id="tableBody"></tbody>
        </table>
        <div id="emptyMessage" class="empty-state" style="display:none;">No matching records found</div>
      </div>
    </main>
  </div>

  <script>
    const dbData = {json.dumps(db_data)};
    let activeTable = "{tables[0] if tables else ''}";
    
    const nav = document.getElementById("tableNav");
    Object.keys(dbData).forEach(tbl => {{
      const li = document.createElement("li");
      li.className = "table-item" + (tbl === activeTable ? " active" : "");
      li.innerHTML = `<span>📂 ${{tbl}}</span> <span class="row-pill">${{dbData[tbl].rowCount}} rows</span>`;
      li.onclick = () => switchTable(tbl);
      nav.appendChild(li);
    }});

    function switchTable(tblName) {{
      activeTable = tblName;
      document.querySelectorAll(".table-item").forEach(el => {{
        el.classList.toggle("active", el.innerText.includes(tblName));
      }});
      document.getElementById("searchInput").value = "";
      renderTable();
    }}

    function renderTable() {{
      const tbl = dbData[activeTable];
      if (!tbl) return;

      const filter = document.getElementById("searchInput").value.toLowerCase().trim();
      const head = document.getElementById("tableHead");
      const body = document.getElementById("tableBody");
      const emptyMsg = document.getElementById("emptyMessage");

      head.innerHTML = tbl.columns.map(c => `<th>${{c}}</th>`).join("");

      const filteredRows = tbl.rows.filter(row => {{
        if (!filter) return true;
        return Object.values(row).some(v => String(v || '').toLowerCase().includes(filter));
      }});

      if (filteredRows.length === 0) {{
        body.innerHTML = "";
        emptyMsg.style.display = "block";
        return;
      }}
      emptyMsg.style.display = "none";

      body.innerHTML = filteredRows.map(row => {{
        return "<tr>" + tbl.columns.map(col => {{
          const val = row[col];
          let displayVal = val === null || val === undefined ? '<span style="color:#666">NULL</span>' : htmlEscape(String(val));
          
          if (col === "role") {{
            displayVal = `<span class="role-badge role-${{val}}">${{val}}</span>`;
          }} else if (col === "canevyn_id" && val) {{
            displayVal = `<span class="canevyn-id-badge">${{val}}</span>`;
          }} else if (col === "hashed_password") {{
            displayVal = `<span style="font-family:monospace; color:#888; font-size:11px;">${{displayVal.substring(0, 20)}}...</span>`;
          }}
          return `<td title="${{htmlEscape(String(val || ''))}}">${{displayVal}}</td>`;
        }}).join("") + "</tr>";
      }}).join("");
    }}

    function htmlEscape(str) {{
      return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }}

    document.getElementById("searchInput").addEventListener("input", renderTable);
    document.getElementById("exportCsvBtn").onclick = () => {{
      window.location.href = `database_export/${{activeTable}}.csv`;
    }};

    renderTable();
  </script>
</body>
</html>
"""

with open(VIEWER_HTML, "w", encoding="utf-8") as f:
    f.write(html_content)

print(f"Export refreshed. Database viewer ready at {VIEWER_HTML}")
