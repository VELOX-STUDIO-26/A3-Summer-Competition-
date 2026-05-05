"""Migration script to add missing columns to quiz_attempts table."""
import asyncio
import asyncpg

async def migrate():
    conn = await asyncpg.connect('postgresql://a3_user:a3_password@localhost:5432/a3_db')

    # Check existing columns
    columns = await conn.fetch("""
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'quiz_attempts'
    """)
    existing = {c['column_name'] for c in columns}
    print("Existing columns:", existing)

    # Columns to add
    new_columns = [
        ("outcome", "VARCHAR(50)"),
        ("critical_concepts_failed", "TEXT[] DEFAULT '{}'"),
        ("time_limit_seconds", "INTEGER"),
        ("rushed_through", "BOOLEAN DEFAULT FALSE"),
    ]

    for col_name, col_type in new_columns:
        if col_name not in existing:
            sql = f'ALTER TABLE quiz_attempts ADD COLUMN {col_name} {col_type}'
            print(f"Adding: {sql}")
            await conn.execute(sql)
        else:
            print(f"Skipping {col_name} (already exists)")

    print("Migration complete!")
    await conn.close()

if __name__ == "__main__":
    asyncio.run(migrate())
