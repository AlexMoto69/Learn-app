"""
Ensure the `user` table has columns `modules_progress` (TEXT) and `last_daily_quiz_date` (DATE).
If missing, add them using ALTER TABLE. Prints before/after status.

Usage:
    (.venv) python scripts\ensure_user_columns.py
"""
import os
import sys
import sqlalchemy

DATABASE_URL = os.environ.get('DATABASE_URL') or os.environ.get('SQLALCHEMY_DATABASE_URI')
if not DATABASE_URL:
    try:
        project_root = os.path.dirname(os.path.dirname(__file__))
        if project_root not in sys.path:
            sys.path.insert(0, project_root)
        import config
        DATABASE_URL = getattr(config, 'SQLALCHEMY_DATABASE_URI', None) or getattr(config, 'DATABASE_URL', None)
        if not DATABASE_URL and hasattr(config, 'Config'):
            cfg = getattr(config, 'Config')
            DATABASE_URL = getattr(cfg, 'SQLALCHEMY_DATABASE_URI', None) or getattr(cfg, 'DATABASE_URL', None)
    except Exception:
        pass

if not DATABASE_URL:
    print('No DATABASE_URL found; set env var or update config.py')
    sys.exit(1)

print('Using DATABASE_URL:', DATABASE_URL)
engine = sqlalchemy.create_engine(DATABASE_URL)

def get_columns(conn):
    dialect = engine.dialect.name
    if dialect == 'sqlite':
        res = conn.execute(sqlalchemy.text("PRAGMA table_info('user');"))
        rows = res.fetchall()
        return [r[1] for r in rows]
    else:
        sql = "SELECT column_name FROM information_schema.columns WHERE table_name='user' ORDER BY ordinal_position;"
        res = conn.execute(sqlalchemy.text(sql))
        rows = res.fetchall()
        return [r[0] for r in rows]

# First read current columns
with engine.connect() as conn:
    cols = get_columns(conn)
    print('Current columns:', cols)

# Determine which statements to run
to_add = []
if 'modules_progress' not in cols:
    to_add.append("ALTER TABLE \"user\" ADD COLUMN modules_progress TEXT DEFAULT '{}'::text;")
if 'last_daily_quiz_date' not in cols:
    to_add.append("ALTER TABLE \"user\" ADD COLUMN last_daily_quiz_date DATE;")

if not to_add:
    print('All columns already exist. No action required.')
    sys.exit(0)

print('Will execute these statements:')
for s in to_add:
    print('-', s)

# Execute statements in a transactional context using engine.begin()
try:
    with engine.begin() as conn:
        for s in to_add:
            conn.execute(sqlalchemy.text(s))
    print('Executed statements successfully.')
except Exception as e:
    print('Error executing statements:', e)
    sys.exit(1)

# Re-check columns after change
with engine.connect() as conn:
    cols_after = get_columns(conn)
    print('Columns after change:', cols_after)
    missing = [c for c in ('modules_progress', 'last_daily_quiz_date') if c not in cols_after]
    if missing:
        print('Failed to add columns:', missing)
        sys.exit(1)
    else:
        print('Success: both columns present.')
