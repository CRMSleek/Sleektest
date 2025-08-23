-- PostgreSQL compatible seed data for SleekCRM

-- Insert demo user (password is 'demo123' hashed with bcrypt)
INSERT INTO users (id, email, password, name, created_at, updated_at) VALUES
('demo_user_001', 'demo@sleekcrm.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VcSAg/9qm', 'Demo User', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Insert demo business
INSERT INTO businesses (id, name, description, user_id, created_at, updated_at) VALUES
('demo_business_001', 'Demo Business', 'A sample business for demonstration purposes', 'demo_user_001', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Insert sample customers
INSERT INTO customers (id, business_id, name, email, phone, data, created_at, updated_at) VALUES
('customer_001', 'demo_business_001', 'John Doe', 'john@example.com', '+1234567890', '{"source": "website", "preferences": ["email", "phone"]}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('customer_002', 'demo_business_001', 'Jane Smith', 'jane@example.com', '+1234567891', '{"source": "referral", "preferences": ["email"]}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('customer_003', 'demo_business_001', 'Bob Johnson', 'bob@example.com', '+1234567892', '{"source": "social_media", "preferences": ["phone"]}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Insert sample surveys
INSERT INTO surveys (id, title, description, questions, is_active, user_id, created_at, updated_at) VALUES
('survey_001', 'Customer Satisfaction Survey', 'Help us improve our service by sharing your feedback', 
'[
  {
    "id": "q1",
    "type": "select",
    "question": "How satisfied are you with our service?",
    "required": true,
    "options": ["5", "4", "3", "2", "1"]
  },
  {
    "id": "q2",
    "type": "textarea",
    "question": "What can we do to improve?",
    "required": false
  },
  {
    "id": "q3",
    "type": "select",
    "question": "Would you recommend us to others?",
    "required": true,
    "options": ["Definitely", "Probably", "Not Sure", "Probably Not", "Definitely Not"]
  }
]', true, 'demo_user_001', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

('survey_002', 'Product Feedback Survey', 'Tell us about your experience with our products', 
'[
  {
    "id": "q1",
    "type": "text",
    "question": "Which product did you purchase?",
    "required": true
  },
  {
    "id": "q2",
    "type": "select",
    "question": "How would you rate the product quality?",
    "required": true,
    "options": ["Excellent", "Good", "Average", "Poor", "Very Poor"]
  },
  {
    "id": "q3",
    "type": "number",
    "question": "On a scale of 1-10, how likely are you to purchase again?",
    "required": true
  },
  {
    "id": "q4",
    "type": "email",
    "question": "Email address for follow-up (optional)",
    "required": false
  }
]', true, 'demo_user_001', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Insert sample survey responses
INSERT INTO survey_responses (id, survey_id, customer_id, answers, created_at) VALUES
('response_001', 'survey_001', 'customer_001', 
'{"q1": "Very Satisfied", "q2": "Keep up the great work!", "q3": "Definitely"}', 
CURRENT_TIMESTAMP),

('response_002', 'survey_001', 'customer_002', 
'{"q1": "Satisfied", "q2": "Maybe faster response times", "q3": "Probably"}', 
CURRENT_TIMESTAMP),

('response_003', 'survey_002', 'customer_003', 
'{"q1": "Premium Widget", "q2": "Excellent", "q3": "9", "q4": "bob@example.com"}', 
CURRENT_TIMESTAMP);
