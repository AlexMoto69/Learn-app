"""
Script to add columns to the `user` table for modules progress and daily tracking.

Usage (Windows cmd/powershell):
    (.venv) python scripts\apply_db_alter_env.py

The script uses the DATABASE_URL environment variable if set, otherwise falls back to the app's SQLALCHEMY_DATABASE_URI from config.py (if present).
It will safely add these columns if they don't exist:
  - modules_progress TEXT DEFAULT '{}' NOT NULL
  - last_daily_quiz_date DATE

This is written for PostgreSQL. It runs simple ALTER TABLE ... ADD COLUMN IF NOT EXISTS statements.
"""
import os
import sys
import sqlalchemy

# Try to find a database URL from environment or config
DATABASE_URL = os.environ.get('DATABASE_URL') or os.environ.get('SQLALCHEMY_DATABASE_URI')

# Try to import config.py from project root
if not DATABASE_URL:
    try:
        # add project root to path
        project_root = os.path.dirname(os.path.dirname(__file__))
        if project_root not in sys.path:
            sys.path.insert(0, project_root)
        import config
        # Try module-level attribute first
        DATABASE_URL = getattr(config, 'SQLALCHEMY_DATABASE_URI', None) or getattr(config, 'DATABASE_URL', None)
        # If config uses Config class, read from it
        if not DATABASE_URL and hasattr(config, 'Config'):
            cfg = getattr(config, 'Config')
            DATABASE_URL = getattr(cfg, 'SQLALCHEMY_DATABASE_URI', None) or getattr(cfg, 'DATABASE_URL', None)
    except Exception:
        pass

if not DATABASE_URL:
    print('Error: no DATABASE_URL or SQLALCHEMY_DATABASE_URI found in environment or config.py')
    print('Set the environment variable or edit scripts/apply_db_alter_env.py to point to your DB.')
    sys.exit(1)

print('Using DATABASE_URL:', DATABASE_URL)

# Create engine and run safe ALTER statements for Postgres
engine = sqlalchemy.create_engine(DATABASE_URL)

# Define statements
# Add modules_progress as TEXT with default '{}'. If your DB requires a specific default syntax you can change it.
stmts = [
    "ALTER TABLE \"user\" ADD COLUMN IF NOT EXISTS modules_progress TEXT DEFAULT '{}'::text;",
    "ALTER TABLE \"user\" ADD COLUMN IF NOT EXISTS last_daily_quiz_date DATE;",
]

with engine.connect() as conn:
    for sql in stmts:
        try:
            print('Executing:', sql)
            conn.execute(sqlalchemy.text(sql))
            print('OK')
        except Exception as e:
            print('Failed to execute:', sql)
            print('Error:', e)

print('\nDone. Verify columns were added. Example query:')
print("  SELECT column_name, data_type FROM information_schema.columns WHERE table_name='user' AND column_name IN ('modules_progress','last_daily_quiz_date');")

