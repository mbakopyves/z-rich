"""Migration: Add url column to articles table."""

import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), 'zürich.db')
conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()

try:
    cur.execute("ALTER TABLE articles ADD COLUMN url TEXT")
    print("✓ Colonne 'url' ajoutée avec succès")
except Exception as e:
    print(f"ℹ Colonne 'url' déjà existante ou erreur : {e}")

conn.commit()
conn.close()
print("Migration terminée")
