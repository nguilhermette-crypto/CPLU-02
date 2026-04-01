export interface FuelRecord {
  id: string;
  plate: string;
  driverName: string;
  driverId?: string;
  shift: 'Manhã' | 'Tarde';
  mileage: number;
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
