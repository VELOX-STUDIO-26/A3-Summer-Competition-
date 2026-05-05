"""Initial schema creation

Revision ID: 001
Revises:
Create Date: 2026-04-26 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create courses table
    op.create_table(
        'courses',
        sa.Column('course_id', sa.String(50), primary_key=True),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('total_nodes', sa.Integer(), default=0),
        sa.Column('is_active', sa.Boolean(), default=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
    )

    # Create student_profiles table
    op.create_table(
        'student_profiles',
        sa.Column('student_id', sa.String(50), primary_key=True),
        sa.Column('knowledge_base', postgresql.JSONB(), default={}),
        sa.Column('cognitive_style', sa.String(20), default='mixed'),
        sa.Column('weak_points', postgresql.ARRAY(sa.String()), default=list),
        sa.Column('goals', postgresql.ARRAY(sa.String()), default=list),
        sa.Column('learning_pace', sa.Float(), default=0.5),
        sa.Column('content_preferences', postgresql.ARRAY(sa.String()), default=list),
        sa.Column('version', sa.Integer(), default=1),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
    )
    op.create_index('idx_student_profiles_id', 'student_profiles', ['student_id'])

    # Create knowledge_nodes table
    op.create_table(
        'knowledge_nodes',
        sa.Column('node_id', sa.String(50), primary_key=True),
        sa.Column('course_id', sa.String(50), sa.ForeignKey('courses.course_id')),
        sa.Column('title', sa.String(200), nullable=False),
        sa.Column('difficulty', sa.Float(), default=0.5),
        sa.Column('est_minutes', sa.Integer(), default=30),
        sa.Column('hard_prerequisites', postgresql.ARRAY(sa.String()), default=list),
        sa.Column('soft_prerequisites', postgresql.ARRAY(sa.String()), default=list),
        sa.Column('topic_tags', postgresql.ARRAY(sa.String()), default=list),
        sa.Column('content_types', postgresql.ARRAY(sa.String()), default=list),
        sa.Column('rag_chunk_ids', postgresql.ARRAY(sa.String()), default=list),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), default=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
    )
    op.create_index('idx_knowledge_nodes_course', 'knowledge_nodes', ['course_id'])
    op.create_index('idx_knowledge_nodes_id', 'knowledge_nodes', ['node_id'])

    # Create learning_paths table
    op.create_table(
        'learning_paths',
        sa.Column('path_id', sa.String(50), primary_key=True),
        sa.Column('student_id', sa.String(50), sa.ForeignKey('student_profiles.student_id')),
        sa.Column('course_id', sa.String(50), sa.ForeignKey('courses.course_id')),
        sa.Column('path_sequence', postgresql.ARRAY(sa.String()), default=list),
        sa.Column('milestones', postgresql.JSONB(), default=list),
        sa.Column('total_estimated_time', sa.Integer(), default=0),
        sa.Column('path_hash', sa.String(64), unique=True),
        sa.Column('metrics', postgresql.JSONB(), default=dict),
        sa.Column('status', sa.String(20), default='active'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
    )
    op.create_index('idx_learning_paths_student', 'learning_paths', ['student_id'])
    op.create_index('idx_learning_paths_course', 'learning_paths', ['course_id'])

    # Create chat_sessions table
    op.create_table(
        'chat_sessions',
        sa.Column('session_id', sa.String(50), primary_key=True),
        sa.Column('student_id', sa.String(50), sa.ForeignKey('student_profiles.student_id')),
        sa.Column('current_node_id', sa.String(50), nullable=True),
        sa.Column('context_summary', sa.Text(), nullable=True),
        sa.Column('status', sa.String(20), default='active'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
    )

    # Create chat_messages table
    op.create_table(
        'chat_messages',
        sa.Column('message_id', sa.String(50), primary_key=True),
        sa.Column('session_id', sa.String(50), sa.ForeignKey('chat_sessions.session_id')),
        sa.Column('role', sa.String(20), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('content_type', sa.String(20), default='text'),
        sa.Column('meta_data', postgresql.JSONB(), default=dict),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
    )
    op.create_index('idx_chat_messages_session', 'chat_messages', ['session_id'])

    # Create quiz_results table
    op.create_table(
        'quiz_results',
        sa.Column('result_id', sa.String(50), primary_key=True),
        sa.Column('student_id', sa.String(50), sa.ForeignKey('student_profiles.student_id')),
        sa.Column('node_id', sa.String(50)),
        sa.Column('score', sa.Float()),
        sa.Column('max_score', sa.Float(), default=1.0),
        sa.Column('correct_count', sa.Integer(), default=0),
        sa.Column('total_questions', sa.Integer(), default=0),
        sa.Column('answers', postgresql.JSONB(), default=list),
        sa.Column('weak_topics', postgresql.ARRAY(sa.String()), default=list),
        sa.Column('time_spent_seconds', sa.Integer(), default=0),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
    )
    op.create_index('idx_quiz_results_student', 'quiz_results', ['student_id'])

    # Create learning_events table
    op.create_table(
        'learning_events',
        sa.Column('event_id', sa.String(50), primary_key=True),
        sa.Column('student_id', sa.String(50), sa.ForeignKey('student_profiles.student_id')),
        sa.Column('event_type', sa.String(50), nullable=False),
        sa.Column('event_data', postgresql.JSONB(), default=dict),
        sa.Column('node_id', sa.String(50), nullable=True),
        sa.Column('session_id', sa.String(50), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
    )
    op.create_index('idx_learning_events_student', 'learning_events', ['student_id'])
    op.create_index('idx_learning_events_type', 'learning_events', ['event_type'])
    op.create_index('idx_learning_events_created', 'learning_events', ['created_at'])


def downgrade() -> None:
    op.drop_table('learning_events')
    op.drop_table('quiz_results')
    op.drop_table('chat_messages')
    op.drop_table('chat_sessions')
    op.drop_table('learning_paths')
    op.drop_table('knowledge_nodes')
    op.drop_table('student_profiles')
    op.drop_table('courses')
