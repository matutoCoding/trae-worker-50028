export interface PegMaterial {
  id: string;
  name: string;
  density: number;
  frictionCoefficient: number;
  swellingCoefficient: number;
  hardness: number;
  description?: string;
}

export interface PegDimensions {
  smallEndDiameter: number;
  largeEndDiameter: number;
  length: number;
  taper: number;
}

export interface PegBoxHoleDimensions {
  smallEndDiameter: number;
  largeEndDiameter: number;
  depth: number;
  taper: number;
  concentricity: number;
}

export interface StringTension {
  stringName: string;
  tension: number;
  frequency: number;
  diameter: number;
}

export interface PegRecord {
  _id?: string;
  instrumentId: string;
  instrumentType: string;
  maker: string;
  date: string;
  pegPosition: number;
  stringName: string;
  pegMaterial: PegMaterial;
  pegDimensions: PegDimensions;
  holeDimensions: PegBoxHoleDimensions;
  stringTension: StringTension;
  fitQuality: 'excellent' | 'good' | 'fair' | 'poor';
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TaperFitAnalysis {
  taperDifference: number;
  interference: number;
  clearance: number;
  contactArea: number;
  fitStatus: 'too_tight' | 'optimal' | 'too_loose';
  selfLockingAngle: number;
  isSelfLocking: boolean;
  requiredTaper: number;
  deviation: number;
  turningTorque: number;
  holdingTorque: number;
  slipRisk: 'low' | 'medium' | 'high';
  recommendations: string[];
}

export interface TuningStabilityAnalysis {
  stringTension: number;
  pegRadius: number;
  pegRadius_m?: number;
  stringAngle: number;
  requiredTorque: number;
  gripForce: number;
  holdingStability: number;
  concentricityDeviation: number;
  bindingRisk: boolean;
  humidityEffect: HumidityEffect;
  overallStability: 'excellent' | 'good' | 'fair' | 'poor';
  warnings: string[];
}

export interface HumidityEffect {
  humidity: number;
  pegDiameterChange: number;
  holeDiameterChange: number;
  fitChange: number;
  stressChange: number;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface InstrumentArchive {
  _id?: string;
  instrumentId: string;
  instrumentType: string;
  maker: string;
  model: string;
  year: number;
  serialNumber?: string;
  pegRecords: string[];
  setupDate: string;
  lastMaintenanceDate?: string;
  overallStatus: 'excellent' | 'good' | 'fair' | 'poor';
  notes?: string;
  history: MaintenanceRecord[];
  createdAt?: string;
  updatedAt?: string;
}

export interface RecheckResult {
  stringName: string;
  taper: number;
  interference: number;
  concentricity: number;
  humidity: number;
  fitStatus: 'too_tight' | 'optimal' | 'too_loose';
  isSelfLocking: boolean;
  slipRisk: 'low' | 'medium' | 'high';
  bindingRisk: boolean;
  notes?: string;
}

export interface RecheckReport {
  date: string;
  technician: string;
  instrumentId: string;
  ambientHumidity: number;
  ambientTemperature: number;
  results: RecheckResult[];
  overallConclusion: string;
  recommendations: string[];
}

export interface MaintenanceRecord {
  date: string;
  type: 'fitting' | 'replacement' | 'adjustment' | 'recheck' | 'other';
  description: string;
  technician: string;
  recheckReport?: RecheckReport;
}

export interface LibraryItem {
  _id?: string;
  name: string;
  instrumentType: string;
  description: string;
  pegSpecifications: {
    material: PegMaterial;
    dimensions: PegDimensions;
    holeDimensions: PegBoxHoleDimensions;
  };
  stringTensions: StringTension[];
  recommendedTaper: number;
  optimalInterference: number;
  notes?: string;
  isStandard: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface RiskAlert {
  id: string;
  instrumentId: string;
  type: 'slippage' | 'binding' | 'humidity' | 'wear';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  recommendation: string;
  timestamp: string;
  acknowledged: boolean;
}

export interface FitCorrectionPlan {
  currentTaper: number;
  targetTaper: number;
  materialToRemove: number;
  reamingDepth: number;
  expectedInterference: number;
  steps: string[];
  tools: string[];
}
