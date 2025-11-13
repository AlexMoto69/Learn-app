import os, sys
from dotenv import load_dotenv
project_root = os.path.dirname(os.path.dirname(__file__))
load_dotenv(os.path.join(project_root, '.env'))
DATABASE_URL = os.environ.get('DATABASE_URL') or os.environ.get('SQLALCHEMY_DATABASE_URI')
print('Using DATABASE_URL=', DATABASE_URL)
from sqlalchemy import create_engine, text
engine = create_engine(DATABASE_URL)
with engine.connect() as conn:
    r = conn.execute(text("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='pdf_document' AND column_name='data';"))
    rows = list(r)
    if rows:
        for col, dtype in rows:
            print('Found column:', col, 'type:', dtype)
    else:
        print('Column data not found in pdf_document')

