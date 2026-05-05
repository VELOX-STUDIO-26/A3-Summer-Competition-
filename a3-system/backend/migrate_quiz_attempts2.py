"""Migration to change critical_concepts_failed from TEXT[] to JSONB."""
import asyncio
import asyncpg

async def migrate():
    conn = await asyncpg.connect('postgresql://a3_user:a3_password@localhost:5432/a3_db')

    # Check current type
    col = await conn.fetchrow("""
        SELECT data_type, udt_name
        FROM information_schema.columns
        WHERE table_name = 'quiz_attempts' AND column_name = 'critical_concepts_failed'
    """)
    print(f"Current type: {col['data_type']} / {col['udt_name']}")

    # Drop old column and recreate as JSONB
    await conn.execute("""
        ALTER TABLE quiz_attempts
        DROP COLUMN IF EXISTS critical_concepts_failed
    """)
    await conn.execute("""
        ALTER TABLE quiz_attempts
        ADD COLUMN critical_concepts_failed JSONB DEFAULT '[]'::jsonb
    """)
    print("Changed critical_concepts_failed to JSONB")

    await conn.close()

asyncio.run(migrate())
