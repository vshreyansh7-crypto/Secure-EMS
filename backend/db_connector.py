import psycopg2
from psycopg2.extras import RealDictCursor
import os
from dotenv import load_dotenv

load_dotenv()

class PostgresWrapper:
    def __init__(self, dsn, timeout=5.0):
        self.conn = psycopg2.connect(dsn, cursor_factory=RealDictCursor)
        self.conn.autocommit = False
    
    def cursor(self):
        return CursorWrapper(self.conn.cursor())
        
    def commit(self):
        self.conn.commit()
        
    def close(self):
        self.conn.close()

    @property
    def row_factory(self):
        pass

    @row_factory.setter
    def row_factory(self, val):
        pass

class CursorWrapper:
    def __init__(self, cursor):
        self.cursor = cursor
        
    def execute(self, query, params=None):
        import re
        if 'PRAGMA table_info' in query:
            match = re.search(r'table_info\((.*?)\)', query)
            if match:
                table_name = match.group(1).strip(";'\"")
                new_query = "SELECT column_name as name FROM information_schema.columns WHERE table_name = %s;"
                self.cursor.execute(new_query, (table_name,))
                # To simulate SQLite's row[1] being the column name, we need to hack the fetchall result?
                # Actually, in SQLite, row[1] is the column name.
                # In Postgres RealDictCursor, row['name'] is the column name.
                # In database_setup.py, it uses `row[1] for row in cursor.fetchall()`. Wait, RealDictCursor rows don't support index access by default. Let's see if we can just return a fake result.
                return self
        elif 'PRAGMA' in query:
            return self
        
        q = query.replace('?', '%s')
        q = q.replace('AUTOINCREMENT', 'SERIAL')
        q = q.replace('INTEGER PRIMARY KEY SERIAL', 'SERIAL PRIMARY KEY')
        q = q.replace("datetime('now')", 'NOW()')
        if params is not None:
            self.cursor.execute(q, params)
        else:
            self.cursor.execute(q)
        return self

    def fetchone(self):
        try:
            row = self.cursor.fetchone()
            if row:
                return MockRow(row)
            return None
        except Exception:
            return None
            
    def fetchall(self):
        try:
            rows = self.cursor.fetchall()
            return [MockRow(r) for r in rows]
        except Exception:
            return []

class MockRow:
    def __init__(self, d):
        self.d = d
        self.keys_list = list(d.keys())
        self.vals_list = list(d.values())
        
    def __getitem__(self, item):
        if isinstance(item, int):
            if item == 1 and 'name' in self.d: # Hack for SQLite PRAGMA table_info
                return self.d['name']
            return self.vals_list[item]
        return self.d.get(item)
        
    def keys(self):
        return self.keys_list

class RowFactory:
    pass

Row = RowFactory()

def connect(database, timeout=5.0):
    dsn = os.environ.get('DATABASE_URL') or os.environ.get('SUPABASE_DATABASE_URL')
    if not dsn:
        raise Exception('DATABASE_URL not found in environment.')
    dsn = dsn.strip()
    return PostgresWrapper(dsn, timeout)

