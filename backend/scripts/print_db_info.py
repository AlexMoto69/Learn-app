import os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env'))
import config
print('ENV DATABASE_URL =', os.environ.get('DATABASE_URL'))
print('config.SQLALCHEMY_DATABASE_URI =', getattr(config, 'SQLALCHEMY_DATABASE_URI', None))

from app import create_app
from extensions import db
app = create_app()
with app.app_context():
    print('app.config[SQLALCHEMY_DATABASE_URI]=', app.config.get('SQLALCHEMY_DATABASE_URI'))
    try:
        print('db.engine.url =', db.engine.url)
    except Exception as e:
        print('db.engine.url error:', e)
    # try a direct query
    try:
        res = db.session.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='pdf_document' AND column_name='data';")
        rows = list(res)
        print('query info_schema rows=', rows)
    except Exception as e:
        print('info_schema query error:', e)
    # show sqlite file path if using sqlite
    if str(db.engine.url).startswith('sqlite'):
        print('sqlite db path:', db.engine.url)

print('done')

