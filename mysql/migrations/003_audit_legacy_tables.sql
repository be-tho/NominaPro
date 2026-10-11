SELECT 'empleados' AS table_name, COUNT(*) AS row_count FROM empleados
UNION ALL
SELECT 'historial_pagos', COUNT(*) FROM historial_pagos
UNION ALL
SELECT 'registros_diarios', COUNT(*) FROM registros_diarios;