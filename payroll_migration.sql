-- =============================================
-- NOMINAPRO: Migración de Tablas para Nómina
-- =============================================

-- Tabla: Empleados
-- Guarda la información de cada empleado de la empresa
CREATE TABLE IF NOT EXISTS public.empleados (
  id uuid DEFAULT auth.uid() PRIMARY KEY,
  empresa_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  sueldo_base BIGINT NOT NULL, -- En centavos para precisión decimal
  horas_acumuladas DECIMAL(10, 2) DEFAULT 0,
  estado VARCHAR(50) DEFAULT 'activo', -- activo, inactivo, suspendido
  fecha_inicio_labores DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(empresa_id, email)
);

-- Tabla: Registros Diarios
-- Almacena las horas trabajadas día a día
CREATE TABLE IF NOT EXISTS public.registros_diarios (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  empleado_id uuid NOT NULL REFERENCES public.empleados(id) ON DELETE CASCADE,
  horas DECIMAL(10, 2) NOT NULL,
  fecha DATE NOT NULL,
  liquidado BOOLEAN DEFAULT FALSE,
  concepto VARCHAR(255), -- Descripción: Trabajo normal, Horas extra, etc.
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(empleado_id, fecha)
);

-- Tabla: Historial de Pagos
-- Registro completo de cada liquidación realizada
CREATE TABLE IF NOT EXISTS public.historial_pagos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  empleado_id uuid NOT NULL REFERENCES public.empleados(id) ON DELETE CASCADE,
  total_pagado BIGINT NOT NULL, -- En centavos
  cantidad_horas_liquidadas DECIMAL(10, 2) NOT NULL,
  fecha_pago DATE NOT NULL,
  fecha_inicio_periodo DATE NOT NULL,
  fecha_fin_periodo DATE NOT NULL,
  detalle_periodo VARCHAR(500),
  comprobante_numero INT, -- Número de recibo/comprobante
  estado_pago VARCHAR(50) DEFAULT 'pendiente', -- pendiente, pagado, rechazado
  metodo_pago VARCHAR(100), -- efectivo, transferencia, cheque, etc.
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- ÍNDICES PARA OPTIMIZACIÓN
-- =============================================

CREATE INDEX IF NOT EXISTS idx_empleados_empresa_id ON public.empleados(empresa_id);
CREATE INDEX IF NOT EXISTS idx_empleados_estado ON public.empleados(estado);
CREATE INDEX IF NOT EXISTS idx_registros_empleado_id ON public.registros_diarios(empleado_id);
CREATE INDEX IF NOT EXISTS idx_registros_fecha ON public.registros_diarios(fecha);
CREATE INDEX IF NOT EXISTS idx_registros_liquidado ON public.registros_diarios(liquidado);
CREATE INDEX IF NOT EXISTS idx_historial_empresa_id ON public.historial_pagos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_historial_empleado_id ON public.historial_pagos(empleado_id);
CREATE INDEX IF NOT EXISTS idx_historial_fecha_pago ON public.historial_pagos(fecha_pago);

-- =============================================
-- Row Level Security (RLS) POLICIES
-- =============================================

-- Habilitar RLS en las tablas
ALTER TABLE public.empleados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registros_diarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historial_pagos ENABLE ROW LEVEL SECURITY;

-- Políticas para empleados: solo el propietario (empresa) puede verlos
CREATE POLICY "Users can view their own employees"
  ON public.empleados FOR SELECT
  USING (auth.uid() = empresa_id);

CREATE POLICY "Users can create employees"
  ON public.empleados FOR INSERT
  WITH CHECK (auth.uid() = empresa_id);

CREATE POLICY "Users can update their own employees"
  ON public.empleados FOR UPDATE
  USING (auth.uid() = empresa_id);

CREATE POLICY "Users can delete their own employees"
  ON public.empleados FOR DELETE
  USING (auth.uid() = empresa_id);

-- Políticas para registros diarios
CREATE POLICY "Users can view their employees' records"
  ON public.registros_diarios FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.empleados
      WHERE empleados.id = registros_diarios.empleado_id
      AND empleados.empresa_id = auth.uid()
    )
  );

CREATE POLICY "Users can create records for their employees"
  ON public.registros_diarios FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.empleados
      WHERE empleados.id = empleado_id
      AND empleados.empresa_id = auth.uid()
    )
  );

CREATE POLICY "Users can update records for their employees"
  ON public.registros_diarios FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.empleados
      WHERE empleados.id = registros_diarios.empleado_id
      AND empleados.empresa_id = auth.uid()
    )
  );

-- Políticas para historial de pagos
CREATE POLICY "Users can view their payment history"
  ON public.historial_pagos FOR SELECT
  USING (auth.uid() = empresa_id);

CREATE POLICY "Users can create payment records"
  ON public.historial_pagos FOR INSERT
  WITH CHECK (auth.uid() = empresa_id);

-- =============================================
-- FUNCIONES Y TRIGGERS
-- =============================================

-- Función para actualizar el timestamp de actualización
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para actualizar updated_at
CREATE TRIGGER update_empleados_updated_at BEFORE UPDATE ON public.empleados
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_registros_diarios_updated_at BEFORE UPDATE ON public.registros_diarios
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_historial_pagos_updated_at BEFORE UPDATE ON public.historial_pagos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- VISTAS ÚTILES
-- =============================================

-- Vista: Resumen de horas pendientes por empleado
CREATE OR REPLACE VIEW v_horas_pendientes AS
SELECT
  e.id as empleado_id,
  e.nombre,
  e.email,
  e.sueldo_base / 100 as sueldo_mensual,
  COALESCE(SUM(rd.horas), 0) as total_horas_pendientes,
  (e.sueldo_base / 100) / 26 / 10 as valor_hora,
  COALESCE(SUM(rd.horas), 0) * ((e.sueldo_base / 100) / 26 / 10) as total_a_pagar
FROM public.empleados e
LEFT JOIN public.registros_diarios rd ON e.id = rd.empleado_id AND rd.liquidado = FALSE
WHERE e.estado = 'activo'
GROUP BY e.id, e.nombre, e.email, e.sueldo_base;

-- Vista: Historial de liquidaciones por empleado
CREATE OR REPLACE VIEW v_liquidaciones_por_empleado AS
SELECT
  e.id as empleado_id,
  e.nombre,
  hp.fecha_pago,
  hp.cantidad_horas_liquidadas,
  hp.total_pagado / 100 as total_pagado,
  hp.detalle_periodo,
  hp.estado_pago
FROM public.empleados e
JOIN public.historial_pagos hp ON e.id = hp.empleado_id
ORDER BY e.nombre, hp.fecha_pago DESC;

-- =============================================
-- DATOS DE EJEMPLO (COMENTADO - descomentar si es necesario)
-- =============================================

-- -- Insertar un empleado de ejemplo:
-- INSERT INTO public.empleados (empresa_id, nombre, email, sueldo_base)
-- VALUES (
--   'your-user-id-here', 
--   'Juan Pérez',
--   'juan@example.com',
--   70000000 -- $700.000 en centavos
-- );

-- -- Registrar horas de trabajo de ejemplo:
-- INSERT INTO public.registros_diarios (empleado_id, horas, fecha, concepto)
-- VALUES (
--   'employee-id-here',
--   8,
--   CURRENT_DATE,
--   'Trabajo normal'
-- );
