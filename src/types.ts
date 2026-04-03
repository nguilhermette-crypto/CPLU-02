export interface FuelRecord {
  id: string;
  plate: string;
  driverName: string;
  time: string;
  truckKm: number;
  horimeter: number;
  liters: number;
  pumpOdometer: number;
  timestamp: string;
  userId: string;
  shiftId: string;
  consumption?: number;
}

export interface Shift {
  id: string;
  date: string;
  time: string;
  shiftType: 'Manhã' | 'Tarde';
  initialPumpOdometer: number;
  initialLiters: number;
  remainingLiters: number;
  status: 'Aberto' | 'Fechado';
  timestamp: string;
  userId: string;
}

export interface TruckStats {
  truckId: string;
  totalFuel: number;
  lastMileage: number;
  firstMileage: number;
  recordsCount: number;
}

export type AlertStatus = 'Normal' | 'Atenção' | 'Crítico';

export interface TruckAlert {
  plate: string;
  currentConsumption: number;
  weeklyAvg: number;
  variation: number;
  status: AlertStatus;
}
