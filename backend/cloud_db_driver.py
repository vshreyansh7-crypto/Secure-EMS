import os
import psycopg2
from psycopg2.extras import DictCursor
from dotenv import load_dotenv

# Force loading keys directly from root monorepo config
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

class CloudDBCursor:
    def __init__(self, conn):
        self.cursor = conn.cursor(cursor_factory=DictCursor)
        
    def execute(self, query, params=None):
        pg_query = query.replace("?", "%s")
        pg_query = pg_query.replace("INSERT OR IGNORE INTO", "INSERT INTO")
        pg_query = pg_query.replace("INSERT OR REPLACE INTO", "INSERT INTO")
        
        # Suppress legacy SQLite schema mutations dynamically
        upp = pg_query.strip().upper()
        if upp.startswith("PRAGMA") or upp.startswith("ALTER TABLE") or upp.startswith("CREATE TABLE"):
            self.last_suppressed = True
            return self
            
        self.last_suppressed = False
        if params:
            self.cursor.execute(pg_query, params)
        else:
            self.cursor.execute(pg_query)
        return self
            
    def executemany(self, query, params_list):
        pg_query = query.replace("?", "%s")
        self.cursor.executemany(pg_query, params_list)
        return self

    def fetchone(self):
        if getattr(self, 'last_suppressed', False):
            return None
        row = self.cursor.fetchone()
        return row

    def fetchall(self):
        if getattr(self, 'last_suppressed', False):
            return []
        rows = self.cursor.fetchall()
        return rows if rows else []
        
    @property
    def lastrowid(self):
        # For Postgres, we assume operations requiring IDs will be updated manually
        return None

class CloudDBConnection:
    def __init__(self, dsn):
        self.conn = psycopg2.connect(dsn)
        # Setting row factory behavior emulation
        self.row_factory = None 
        
    def cursor(self):
        return CloudDBCursor(self.conn)
        
    def commit(self):
        self.conn.commit()
        
    def close(self):
        self.conn.close()

def get_db_connection():
    # Prevent tests from falling back to Supabase
    TESTING = os.getenv("TESTING") == "1"
    
    if TESTING:
        dsn = os.getenv("DATABASE_URL")
        if not dsn:
            raise Exception("DATABASE_URL environment variable must be configured for tests!")
    else:
        dsn = os.getenv("SUPABASE_DATABASE_URL")
        if not dsn:
            raise Exception("SUPABASE_DATABASE_URL environment variable is missing!")
            
    return CloudDBConnection(dsn)
