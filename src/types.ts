export interface FuelRecord {
  id: string;
  plate: string;
  driverName: string;
  driverId?: string;
  shift: 'Manhã' | 'Tarde';
  mileage: number; // This remains as the "current/final" mileage for backward compatibility
  mileageStart?: number;
  mileageEnd?: number;
  horimeterStart?: number;
  horimeterEnd?: number;
  mileageDiff?: number;
  horimeterDiff?: number;
  amount: number;
  fuelType: string;
  timestamp: string;
  consumption?: number;
  observation?: string;
  userId: string;
  responsibleName: string;
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
