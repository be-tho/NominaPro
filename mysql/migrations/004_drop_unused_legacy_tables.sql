-- Back up the database first. Run only after checking 003_audit_legacy_tables.sql.
-- These legacy tables are not used by the current NominaPro PHP API or frontend.
-- Child tables are dropped before empleados because they reference it.
DROP TABLE IF EXISTS registros_diarios;
DROP TABLE IF EXISTS historial_pagos;
DROP TABLE IF EXISTS empleados;