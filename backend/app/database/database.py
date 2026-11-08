import sqlite3
import os
import json
from datetime import datetime

DB_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "..", "database")
DB_PATH = os.path.join(DB_DIR, "stego_history.db")

def init_db():
    os.makedirs(DB_DIR, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS analysis_history (
            id TEXT PRIMARY KEY,
            timestamp TEXT,
            filename TEXT,
            sha256 TEXT,
            dimensions TEXT,
            format TEXT,
            overall_assessment TEXT,
            risk_score INTEGER,
            ml_prob REAL,
            cnn_prob REAL,
            full_results_json TEXT
        )
    ''')
    conn.commit()
    conn.close()

def save_analysis(data):
    """
    Saves an analysis result to the SQLite DB.
    """
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Extract needed fields from the structured result
    analysis_id = data.get("analysis_id", "")
    timestamp = data.get("timestamp", datetime.utcnow().isoformat())
    
    metadata = data.get("metadata", {})
    filename = data.get("filename", "Unknown")
    sha256 = metadata.get("sha256", "")
    dimensions = f"{metadata.get('width', 0)}x{metadata.get('height', 0)}"
    file_format = metadata.get("format", "Unknown")
    
    overall_assessment = data.get("overall_result", "Unknown")
    risk_score = data.get("risk_score", 0)
    
    ml_prob = data.get("ml_prediction", {}).get("probability", 0.0)
    cnn_prob = data.get("cnn_prediction", {}).get("probability", 0.0)
    
    full_json = json.dumps(data)
    
    cursor.execute('''
        INSERT INTO analysis_history 
        (id, timestamp, filename, sha256, dimensions, format, overall_assessment, risk_score, ml_prob, cnn_prob, full_results_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (analysis_id, timestamp, filename, sha256, dimensions, file_format, overall_assessment, risk_score, ml_prob, cnn_prob, full_json))
    
    conn.commit()
    conn.close()
    
def get_all_analyses():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT id, timestamp, filename, sha256, overall_assessment, risk_score, ml_prob, cnn_prob 
        FROM analysis_history 
        ORDER BY timestamp DESC
    ''')
    
    rows = cursor.fetchall()
    conn.close()
    
    return [dict(row) for row in rows]
    
def get_analysis_by_id(analysis_id):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute('SELECT full_results_json FROM analysis_history WHERE id = ?', (analysis_id,))
    row = cursor.fetchone()
    conn.close()
    
    if row:
        return json.loads(row["full_results_json"])
    return None

def delete_analysis(analysis_id):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('DELETE FROM analysis_history WHERE id = ?', (analysis_id,))
    conn.commit()
    conn.close()

# Initialize when the module is loaded
init_db()
