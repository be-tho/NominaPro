-- ============================================
-- NOMINAPRO - COMPLETE DATABASE SETUP
-- Reset all tables and create fresh structure
-- ============================================

-- ============================================
-- STEP 1: DROP ALL EXISTING POLICIES
-- ============================================

DROP POLICY IF EXISTS "Users can view their own days" ON days;
DROP POLICY IF EXISTS "Users can insert their own days" ON days;
DROP POLICY IF EXISTS "Users can update their own days" ON days;
DROP POLICY IF EXISTS "Users can delete their own days" ON days;
DROP POLICY IF EXISTS "Users can view their own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can insert their own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can update their own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can delete their own settings" ON user_settings;
DROP POLICY IF EXISTS "Allow all operations on own days" ON days;
DROP POLICY IF EXISTS "Allow all operations on own settings" ON user_settings;

-- ============================================
-- STEP 2: DROP ALL EXISTING TABLES
-- ============================================

DROP TABLE IF EXISTS days CASCADE;
DROP TABLE IF EXISTS user_settings CASCADE;

-- ============================================
-- STEP 3: CREATE OPTIMIZED TABLES
-- ============================================

-- Days table: tracks work days for attendance
-- Optimized with DATE type for better performance
CREATE TABLE days (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  type text NOT NULL CHECK (type IN ('full', 'half', 'holiday', 'holiday-worked', 'not-working')),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, date)
);

-- User settings table: stores user configuration
-- monthly_salary is in Argentine Pesos (ARS), integer only
CREATE TABLE user_settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  monthly_salary integer NOT NULL DEFAULT 40000,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Payment history table: tracks all payments/settlements
CREATE TABLE payment_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_days decimal NOT NULL,
  daily_value integer NOT NULL,
  total_paid integer NOT NULL,
  payment_date DATE NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================
-- STEP 4: CREATE OPTIMIZED INDEXES
-- ============================================

-- Performance optimizations for common queries
CREATE INDEX idx_days_user_date ON days(user_id, date DESC);
CREATE INDEX idx_days_user_created ON days(user_id, created_at DESC);
CREATE INDEX idx_days_date ON days(date);
CREATE INDEX idx_user_settings_user_id ON user_settings(user_id);
CREATE INDEX idx_payment_history_user_date ON payment_history(user_id, payment_date DESC);
CREATE INDEX idx_payment_history_user_id ON payment_history(user_id);

-- ============================================
-- STEP 5: ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE days ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 6: CREATE RLS POLICIES FOR DAYS TABLE
-- ============================================

-- Users can only view their own records
CREATE POLICY "Users can view their own days" ON days
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only insert their own records
CREATE POLICY "Users can insert their own days" ON days
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can only update their own records
CREATE POLICY "Users can update their own days" ON days
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own records
CREATE POLICY "Users can delete their own days" ON days
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- STEP 7: CREATE RLS POLICIES FOR USER_SETTINGS TABLE
-- ============================================

-- Users can only view their own settings
CREATE POLICY "Users can view their own settings" ON user_settings
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only insert their own settings
CREATE POLICY "Users can insert their own settings" ON user_settings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can only update their own settings
CREATE POLICY "Users can update their own settings" ON user_settings
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own settings
CREATE POLICY "Users can delete their own settings" ON user_settings
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- STEP 8: CREATE RLS POLICIES FOR PAYMENT_HISTORY TABLE
-- ============================================

-- Users can only view their own payment history
CREATE POLICY "Users can view their own payment history" ON payment_history
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only insert their own payment records
CREATE POLICY "Users can insert their own payment history" ON payment_history
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own payment records
CREATE POLICY "Users can delete their own payment history" ON payment_history
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- COMPLETE: Database is ready!
-- ============================================
-- 
-- Tables created:
-- ✅ days - Work day records per user
-- ✅ user_settings - User configuration (monthly salary)
-- ✅ payment_history - Payment/settlement records
--
-- Security:
-- ✅ RLS enabled on all tables
-- ✅ Users can only access their own data
-- ✅ Type validation on days.type column
--
-- Performance:
-- ✅ Optimized indexes for common queries
-- ✅ DATE type for better date handling
-- ✅ Integer type for salary (no decimals)
--
-- ============================================

