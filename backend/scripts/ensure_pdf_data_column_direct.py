import os, sys
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

project_root = os.path.dirname(os.path.dirname(__file__))
load_dotenv(os.path.join(project_root, '.env'))

DATABASE_URL = os.environ.get('DATABASE_URL') or os.environ.get('SQLALCHEMY_DATABASE_URI')
print('DATABASE_URL=', DATABASE_URL)
if not DATABASE_URL:
    print('No DATABASE_URL found; aborting.'); sys.exit(1)

try:
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        print('Connected ok')
        sql = "ALTER TABLE pdf_document ADD COLUMN IF NOT EXISTS data bytea;"
        print('Executing:', sql)
        conn.execute(text(sql))
        print('ALTER executed')
        r = conn.execute(text("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='pdf_document' AND column_name='data';"))
        rows = list(r)
        if rows:
            for col, dtype in rows:
                print('Found column:', col, 'type:', dtype)
        else:
            print('Column data not found after ALTER')
except Exception as e:
    print('ERROR:', e)
    sys.exit(1)

print('Done')

