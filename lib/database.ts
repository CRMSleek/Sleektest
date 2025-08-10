// Database schema and utilities
export interface DatabaseSchema {
  users: {
    id: string
    name: string
    email: string
    password_hash: string
    role: "business" | "staff"
    business_id?: string
    created_at: string
    updated_at: string
  }

  businesses: {
    id: string
    name: string
    email: string
    website?: string
    description?: string
    phone?: string
    address?: string
    created_at: string
    updated_at: string
  }

  customers: {
    id: string
    business_id: string
    name: string
    email: string
    phone?: string
    location?: string
    age?: number
    preferences?: string // JSON
    notes?: string
    created_at: string
    updated_at: string
  }

  surveys: {
    id: string
    business_id: string
    title: string
    description: string
    status: "draft" | "active" | "completed"
    welcome_message: string
    completion_message: string
    questions: string // JSON
    expires_at?: string
    created_at: string
    updated_at: string
  }

  survey_responses: {
    id: string
    survey_id: string
    customer_id: string
    responses: string // JSON
    submitted_at: string
  }
}

// SQL schema creation scripts
export const createTablesSQL = `
  CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('business', 'staff') NOT NULL DEFAULT 'business',
    business_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS businesses (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    website VARCHAR(255),
    description TEXT,
    phone VARCHAR(50),
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS customers (
    id VARCHAR(255) PRIMARY KEY,
    business_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    location VARCHAR(255),
    age INT,
    preferences JSON,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS surveys (
    id VARCHAR(255) PRIMARY KEY,
    business_id VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status ENUM('draft', 'active', 'completed') NOT NULL DEFAULT 'draft',
    welcome_message TEXT,
    completion_message TEXT,
    questions JSON NOT NULL,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS survey_responses (
    id VARCHAR(255) PRIMARY KEY,
    survey_id VARCHAR(255) NOT NULL,
    customer_id VARCHAR(255) NOT NULL,
    responses JSON NOT NULL,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (survey_id) REFERENCES surveys(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
  );

  CREATE INDEX idx_customers_business_id ON customers(business_id);
  CREATE INDEX idx_surveys_business_id ON surveys(business_id);
  CREATE INDEX idx_survey_responses_survey_id ON survey_responses(survey_id);
  CREATE INDEX idx_survey_responses_customer_id ON survey_responses(customer_id);
`
