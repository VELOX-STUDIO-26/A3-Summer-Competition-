"""Add generated_quizzes and quiz_attempts tables

Revision ID: 002
Revises: 001
Create Date: 2026-04-28 14:35:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '002'
down_revision: Union[str, None] = '001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create generated_quizzes table
    op.create_table(
        'generated_quizzes',
        sa.Column('quiz_id', sa.String(50), primary_key=True),
        sa.Column('student_id', sa.String(50), sa.ForeignKey('student_profiles.student_id'), index=True),
        sa.Column('node_id', sa.String(50), nullable=True, index=True),
        sa.Column('title', sa.String(200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('topic', sa.String(200), nullable=False),
        sa.Column('difficulty', sa.Float(), default=0.5),
        sa.Column('num_questions', sa.Integer(), default=5),
        sa.Column('questions', postgresql.JSONB(), default=list),
        sa.Column('weak_points_focus', postgresql.ARRAY(sa.String()), default=list),
        sa.Column('estimated_time_minutes', sa.Integer(), default=15),
        sa.Column('total_points', sa.Integer(), default=100),
        sa.Column('is_active', sa.Boolean(), default=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
    )
    op.create_index('idx_generated_quizzes_student', 'generated_quizzes', ['student_id'])
    op.create_index('idx_generated_quizzes_created', 'generated_quizzes', ['created_at'])

    # Create quiz_attempts table
    op.create_table(
        'quiz_attempts',
        sa.Column('attempt_id', sa.String(50), primary_key=True),
        sa.Column('quiz_id', sa.String(50), sa.ForeignKey('generated_quizzes.quiz_id'), index=True),
        sa.Column('student_id', sa.String(50), sa.ForeignKey('student_profiles.student_id'), index=True),
        sa.Column('score', sa.Float(), nullable=True),
        sa.Column('correct_count', sa.Integer(), default=0),
        sa.Column('total_questions', sa.Integer(), default=0),
        sa.Column('answers', postgresql.JSONB(), default=list),
        sa.Column('weak_topics', postgresql.ARRAY(sa.String()), default=list),
        sa.Column('time_spent_seconds', sa.Integer(), default=0),
        sa.Column('started_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index('idx_quiz_attempts_quiz', 'quiz_attempts', ['quiz_id'])
    op.create_index('idx_quiz_attempts_student', 'quiz_attempts', ['student_id'])


def downgrade() -> None:
    op.drop_index('idx_quiz_attempts_student', table_name='quiz_attempts')
    op.drop_index('idx_quiz_attempts_quiz', table_name='quiz_attempts')
    op.drop_table('quiz_attempts')

    op.drop_index('idx_generated_quizzes_created', table_name='generated_quizzes')
    op.drop_index('idx_generated_quizzes_student', table_name='generated_quizzes')
    op.drop_table('generated_quizzes')
