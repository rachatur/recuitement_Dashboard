import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
import urllib.parse
from app.core.config import settings

def ensure_postgres_database():
    url = settings.DATABASE_URL
    if not url.startswith("postgresql"):
        return
    
    parsed = urllib.parse.urlparse(url)
    db_name = parsed.path.lstrip("/")
    user = parsed.username or "postgres"
    password = parsed.password or "root"
    host = parsed.hostname or "localhost"
    port = parsed.port or 5432

    try:
        conn = psycopg2.connect(
            dbname="postgres",
            user=user,
            password=password,
            host=host,
            port=port
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cur = conn.cursor()
        cur.execute("SELECT 1 FROM pg_database WHERE datname = %s;", (db_name,))
        exists = cur.fetchone()
        if not exists:
            cur.execute(f'CREATE DATABASE "{db_name}";')
            print(f"Created PostgreSQL database '{db_name}' successfully!")
        else:
            print(f"PostgreSQL database '{db_name}' already exists.")
        cur.close()
        conn.close()
    except Exception as e:
        print(f"PostgreSQL database creation check note: {e}")

if __name__ == "__main__":
    ensure_postgres_database()
