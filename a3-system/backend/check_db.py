import asyncio
import asyncpg

async def check():
    try:
        conn = await asyncpg.connect('postgresql://a3_user:a3_password@localhost:5432/a3_db')
        tables = await conn.fetch("SELECT tablename FROM pg_tables WHERE schemaname='public'")
        print("Tables:", [t['tablename'] for t in tables])
        await conn.close()
    except Exception as e:
        print(f"Error: {type(e).__name__}: {e}")

asyncio.run(check())
