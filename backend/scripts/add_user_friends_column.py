#!/usr/bin/env python
"""Add a `friends` text column to the `user` table and optionally backfill from the user_friends table.
Usage:
  python scripts\add_user_friends_column.py       # uses DATABASE_URL from env
  python scripts\add_user_friends_column.py --no-backfill   # skip backfill

The script will:
- Read DATABASE_URL from env if present, or accept an override via the DATABASE_URL=... environment variable.
- Connect to the database and execute: ALTER TABLE "user" ADD COLUMN IF NOT EXISTS friends text;
- If backfill enabled (default), it will read user_friends and populate users.friends with a JSON array of friend ids.

This is safe to run multiple times (ALTER TABLE uses IF NOT EXISTS).
"""
import os
import sys
import json
from dotenv import load_dotenv

load_dotenv()

def main():
    args = sys.argv[1:]
    backfill = True
    if '--no-backfill' in args:
        backfill = False

    db_url = os.getenv('DATABASE_URL') or os.environ.get('DATABASE_URL')
    if not db_url:
        print('No DATABASE_URL found. Set env or call with DATABASE_URL=...')
        sys.exit(1)

    # Use psycopg2 for Postgres
    try:
        import psycopg2
        from psycopg2.extras import RealDictCursor
    except Exception as e:
        print('psycopg2 not installed in this environment:', e)
        sys.exit(1)

    print('Connecting to database...')
    conn = None
    try:
        conn = psycopg2.connect(db_url)
        conn.autocommit = False
        cur = conn.cursor()

        print('Adding column `friends` to table "user" (if not exists)...')
        cur.execute('ALTER TABLE "user" ADD COLUMN IF NOT EXISTS friends text;')
        conn.commit()
        print('ALTER executed')

        if backfill:
            # Ensure join table exists; create a simple version if it doesn't.
            print('Ensuring join table user_friends exists (CREATE IF NOT EXISTS)...')
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS user_friends (
                    user_id integer NOT NULL,
                    friend_id integer NOT NULL,
                    PRIMARY KEY (user_id, friend_id)
                );
                """
            )
            conn.commit()

            print('Backfilling `friends` from user_friends join table...')
            # read all friend pairs
            cur.execute('SELECT user_id, friend_id FROM user_friends;')
            rows = cur.fetchall()
            mapping = {}
            for u, f in rows:
                mapping.setdefault(u, set()).add(f)
            # also ensure symmetry: if A->B exists, add B->A
            for u, fset in list(mapping.items()):
                for f in fset:
                    mapping.setdefault(f, set()).add(u)

            # update each user
            updated = 0
            for uid, fset in mapping.items():
                friends_list = sorted(list(fset))
                friends_json = json.dumps(friends_list)
                cur.execute('UPDATE "user" SET friends = %s WHERE id = %s;', (friends_json, uid))
                updated += 1

            # set empty [] for users not present (and for any NULLs)
            cur.execute('UPDATE "user" SET friends = %s WHERE friends IS NULL;', (json.dumps([]),))

            conn.commit()
            print(f'Backfilled friends for {updated} users (set [] for others).')

        print('Done.')

    except Exception as e:
        if conn:
            conn.rollback()
        print('Error:', str(e))
        sys.exit(1)
    finally:
        if conn:
            conn.close()

if __name__ == '__main__':
    main()
