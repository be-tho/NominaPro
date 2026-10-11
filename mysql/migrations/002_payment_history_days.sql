CREATE TABLE payment_history_days (
    payment_id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    day_date DATE NOT NULL,
    type ENUM('full', 'half', 'holiday', 'holiday-worked', 'not-working') NOT NULL,
    additional_title VARCHAR(120) DEFAULT NULL,
    additional_amount DECIMAL(10,2) DEFAULT NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (payment_id, day_date),
    KEY payment_history_days_user_payment_idx (user_id, payment_id),
    CONSTRAINT payment_history_days_payment_fkey
        FOREIGN KEY (payment_id) REFERENCES payment_history (id) ON DELETE CASCADE,
    CONSTRAINT payment_history_days_user_fkey
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;