"""Migration script to add missing columns to generated_quizzes table."""
import asyncio
import asyncpg

async def migrate():
    conn = await asyncpg.connect('postgresql://a3_user:a3_password@localhost:5432/a3_db')

    # Check existing columns
    columns = await conn.fetch("""
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'generated_quizzes'
    """)
    existing = {c['column_name'] for c in columns}
    print("Existing columns:", existing)

    # Columns to add
    new_columns = [
        ("complexity_level", "VARCHAR(50)"),
        ("attempt_number", "INTEGER DEFAULT 1"),
        ("previous_wrong_concepts", "TEXT[] DEFAULT '{}'"),
        ("has_coding", "BOOLEAN DEFAULT FALSE"),
        ("concept_tags", "TEXT[] DEFAULT '{}'"),
        ("next_milestone_prerequisites", "TEXT[] DEFAULT '{}'"),
        ("is_active", "BOOLEAN DEFAULT TRUE"),
    ]

    for col_name, col_type in new_columns:
        if col_name not in existing:
            sql = f'ALTER TABLE generated_quizzes ADD COLUMN {col_name} {col_type}'
            print(f"Adding: {sql}")
            await conn.execute(sql)
        else:
            print(f"Skipping {col_name} (already exists)")

    print("Migration complete!")
    await conn.close()

if __name__ == "__main__":
    asyncio.run(migrate())
