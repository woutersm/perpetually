-- Create test database
CREATE DATABASE perpetually_test;

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE perpetually TO perpetually;
GRANT ALL PRIVILEGES ON DATABASE perpetually_test TO perpetually;

-- Enable extensions
\c perpetually
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\c perpetually_test
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
