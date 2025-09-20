# Migration script to add admin intervention support
# Run this to update your database

ALTER TABLE ai_chat_history 
ADD COLUMN needs_intervention BOOLEAN DEFAULT FALSE,
ADD COLUMN intervention_reason TEXT,
ADD COLUMN last_message_at TIMESTAMP NULL;

ALTER TABLE ai_chat_messages 
ADD COLUMN is_intervention BOOLEAN DEFAULT FALSE,
ADD COLUMN admin_id VARCHAR(50) NULL;

# Index for better performance
CREATE INDEX idx_chat_intervention ON ai_chat_history(needs_intervention);
CREATE INDEX idx_message_intervention ON ai_chat_messages(is_intervention);
CREATE INDEX idx_chat_last_message ON ai_chat_history(last_message_at);