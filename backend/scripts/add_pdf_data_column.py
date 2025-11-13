"""
Add `data` column (bytea) to `pdf_document` table for PostgreSQL. Run from project root in venv:
    python scripts\add_pdf_data_column.py
"""
import os, sys
from dotenv import load_dotenv

# load project .env (project root)
project_root = os.path.dirname(os.path.dirname(__file__))
load_dotenv(os.path.join(project_root, '.env'))

import sqlalchemy

DATABASE_URL = os.environ.get('DATABASE_URL') or os.environ.get('SQLALCHEMY_DATABASE_URI')
if not DATABASE_URL:
    # try config
    if project_root not in sys.path:
        sys.path.insert(0, project_root)
    try:
        import config
        DATABASE_URL = getattr(config, 'SQLALCHEMY_DATABASE_URI', None) or getattr(config, 'DATABASE_URL', None)
    except Exception:
        pass

if not DATABASE_URL:
    print('No DATABASE_URL found. Set env or edit this script.'); sys.exit(1)

engine = sqlalchemy.create_engine(DATABASE_URL)

sql = "ALTER TABLE pdf_document ADD COLUMN IF NOT EXISTS data bytea;"
with engine.connect() as conn:
    try:
        print('Executing:', sql)
        conn.execute(sqlalchemy.text(sql))
        print('OK')
    except Exception as e:
        print('Error:', e)

print('Done')
