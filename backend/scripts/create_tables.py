import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from app import create_app
from extensions import db

app = create_app()
with app.app_context():
    print('Creating all tables via db.create_all()')
    db.create_all()
    # list tables created
    inspector = None
    try:
        from sqlalchemy import inspect
        inspector = inspect(db.engine)
        tables = inspector.get_table_names()
        print('Tables in DB:', tables)
    except Exception as e:
        print('Could not list tables:', e)

print('Done')

