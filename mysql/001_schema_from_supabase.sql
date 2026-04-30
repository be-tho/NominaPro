-- NominaPro: esquema MySQL equivalente al proyecto Supabase (Postgres public).
-- Antes las FK apuntaban a auth.users; aquí usamos la tabla `users` (debés poblarla
-- al migrar cuentas desde Supabase Auth o tu nuevo sistema de login).
--
-- Requisitos: MySQL 8.0.16+ (CHECK constraints).

CREATE DATABASE IF NOT EXISTS nominapro
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE nominapro;

SET NAMES utf8mb4;

-- ---------------------------------------------------------------------------
-- Usuarios (reemplazo de auth.users para integridad referencial)
-- ---------------------------------------------------------------------------
CREATE TABLE users (
  id CHAR(36) NOT NULL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NULL COMMENT 'Si usás login propio con bcrypt/argon2',
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  UNIQUE KEY users_email_unique (email)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- Tablas que antes enlazaban con Supabase Auth
-- ---------------------------------------------------------------------------
CREATE TABLE days (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  user_id CHAR(36) NOT NULL,
  date DATE NOT NULL,
  type ENUM('full','half','holiday','holiday-worked','not-working') NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  UNIQUE KEY days_user_id_date_key (user_id, date),
  CONSTRAINT days_user_id_fkey FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE user_settings (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  user_id CHAR(36) NOT NULL,
  monthly_salary INT NOT NULL DEFAULT 40000,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  UNIQUE KEY user_settings_user_id_key (user_id),
  CONSTRAINT user_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE payment_history (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  user_id CHAR(36) NOT NULL,
  total_days DECIMAL(14, 4) NOT NULL,
  daily_value INT NOT NULL,
  total_paid INT NOT NULL,
  payment_date DATE NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  CONSTRAINT payment_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- Módulo empleados / empresa (FK empresa_id -> users como en Supabase)
-- ---------------------------------------------------------------------------
CREATE TABLE empleados (
  id CHAR(36) NOT NULL PRIMARY KEY COMMENT 'En Postgres era default auth.uid(); lo genera la app',
  empresa_id CHAR(36) NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  sueldo_base BIGINT NOT NULL,
  horas_acumuladas DECIMAL(14, 4) NULL DEFAULT 0,
  fecha_inicio_labores DATE NULL,
  estado VARCHAR(255) NULL DEFAULT 'activo',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY empleados_empresa_id_email_key (empresa_id, email),
  CONSTRAINT empleados_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE registros_diarios (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  empleado_id CHAR(36) NOT NULL,
  fecha DATE NOT NULL,
  horas DECIMAL(14, 4) NOT NULL,
  concepto VARCHAR(255) NULL,
  liquidado TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY registros_empleado_fecha_key (empleado_id, fecha),
  CONSTRAINT registros_diarios_empleado_id_fkey FOREIGN KEY (empleado_id) REFERENCES empleados (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE historial_pagos (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  empresa_id CHAR(36) NOT NULL,
  empleado_id CHAR(36) NOT NULL,
  total_pagado BIGINT NOT NULL,
  cantidad_horas_liquidadas DECIMAL(14, 4) NOT NULL,
  fecha_pago DATE NOT NULL,
  fecha_inicio_periodo DATE NOT NULL,
  fecha_fin_periodo DATE NOT NULL,
  detalle_periodo VARCHAR(255) NULL,
  comprobante_numero INT NULL,
  metodo_pago VARCHAR(255) NULL,
  estado_pago VARCHAR(255) NULL DEFAULT 'pendiente',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT historial_pagos_empleado_id_fkey FOREIGN KEY (empleado_id) REFERENCES empleados (id) ON DELETE CASCADE,
  CONSTRAINT historial_pagos_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB;
