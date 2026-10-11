-- Run once on the production database; preserves all existing payment values.
ALTER TABLE payment_history
    MODIFY total_paid DECIMAL(12,2) NOT NULL;