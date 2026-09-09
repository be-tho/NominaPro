export type StandardDayType = 'full' | 'half' | 'holiday' | 'holiday-worked' | 'not-working'
export type DayType = StandardDayType | null

export const getDayTypeValue = (type: DayType | string | null): number => {
  if (!type) return 0

  const values: Record<StandardDayType, number> = {
    full: 1,
    half: 0.5,
    holiday: 1,
    'holiday-worked': 2,
    'not-working': 0,
  }

  return values[type as StandardDayType] ?? 0
}

export const getDayTypeLabel = (type: DayType | string | null): string => {
  if (!type) return 'Sin registrar'

  const labels: Record<StandardDayType, string> = {
    full: 'Día Completo',
    half: 'Medio Día',
    holiday: 'Feriado (No trabajado)',
    'holiday-worked': 'Feriado Trabajado',
    'not-working': 'No Trabajado',
  }

  return labels[type as StandardDayType] ?? 'Sin registrar'
}

export const getDayTypeColor = (type: DayType | string | null): string => {
  if (!type) return 'bg-white border-2 border-gray-200'

  const colors: Record<StandardDayType, string> = {
    full: 'bg-green-500',
    half: 'bg-yellow-500',
    holiday: 'bg-purple-500',
    'holiday-worked': 'bg-red-500',
    'not-working': 'bg-gray-300',
  }

  return colors[type as StandardDayType] ?? 'bg-white border-2 border-gray-200'
}

export const parseDayType = (type: DayType | string | null) => ({
  value: getDayTypeValue(type),
  label: getDayTypeLabel(type),
  color: getDayTypeColor(type),
})
