"""
Check which columns the `user` table has in the configured database.
Usage:
    (.venv) python scripts\check_user_columns.py

It reads DATABASE_URL or SQLALCHEMY_DATABASE_URI from env or from config, connects, and prints the column names and types.
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
    print('No DATABASE_URL or SQLALCHEMY_DATABASE_URI found; set env var or update config.py')
    sys.exit(1)

print('Using DATABASE_URL:', DATABASE_URL)
engine = sqlalchemy.create_engine(DATABASE_URL)

with engine.connect() as conn:
    dialect = engine.dialect.name
    print('Detected dialect:', dialect)
    if dialect == 'sqlite':
        res = conn.execute(sqlalchemy.text("PRAGMA table_info('user');"))
        rows = res.fetchall()
        print('Columns in user table (sqlite):')
        for r in rows:
            print(r)
    else:
        sql = "SELECT column_name, data_type FROM information_schema.columns WHERE table_name='user' ORDER BY ordinal_position;"
        res = conn.execute(sqlalchemy.text(sql))
        rows = res.fetchall()
        print('Columns in user table:')
        for r in rows:
            print(r[0], r[1])

print('\nDone.')

