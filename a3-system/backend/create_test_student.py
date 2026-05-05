"""Create a test student in the database."""
import asyncio
import asyncpg

async def create():
    conn = await asyncpg.connect('postgresql://a3_user:a3_password@localhost:5432/a3_db')
    await conn.execute("""
        INSERT INTO student_profiles (student_id, knowledge_base, cognitive_style, weak_points, goals, learning_pace, content_preferences, version)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (student_id) DO NOTHING
    """, 'stu_001', '{}', 'mixed', [], [], 0.5, [], 1)
    print("Created student stu_001")
    await conn.close()

asyncio.run(create())
