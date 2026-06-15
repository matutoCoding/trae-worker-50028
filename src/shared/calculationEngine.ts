import {
  PegMaterial,
  PegDimensions,
  PegBoxHoleDimensions,
  StringTension,
  TaperFitAnalysis,
  TuningStabilityAnalysis,
  HumidityEffect,
  FitCorrectionPlan,
  RiskAlert,
} from './types';

const STANDARD_TAPER = 1 / 30;
const OPTIMAL_INTERFERENCE_MIN = 0.02;
const OPTIMAL_INTERFERENCE_MAX = 0.06;
const SELF_LOCKING_FACTOR = 1.5;
const HUMIDITY_REFERENCE = 45;

export const MATERIAL_DATABASE: PegMaterial[] = [
  {
    id: 'ebony',
    name: '乌木',
    density: 1.2,
    frictionCoefficient: 0.45,
    swellingCoefficient: 0.0025,
    hardness: 8,
    description: '传统弦轴材料，硬度高，稳定性好',
  },
  {
    id: 'rosewood',
    name: '红木',
    density: 0.9,
    frictionCoefficient: 0.42,
    swellingCoefficient: 0.003,
    hardness: 6,
    description: '常用弦轴材料，纹理美观',
  },
  {
    id: 'boxwood',
    name: '黄杨木',
    density: 0.95,
    frictionCoefficient: 0.48,
    swellingCoefficient: 0.0028,
    hardness: 7,
    description: '优质弦轴材料，耐磨性好',
  },
  {
    id: 'tulipwood',
    name: '郁金香木',
    density: 0.88,
    frictionCoefficient: 0.40,
    swellingCoefficient: 0.0032,
    hardness: 5,
    description: '装饰性弦轴材料',
  },
];

export function calculateTaper(smallDiameter: number, largeDiameter: number, length: number): number {
  return (largeDiameter - smallDiameter) / length;
}

export function calculateTaperFit(
  pegDimensions: PegDimensions,
  holeDimensions: PegBoxHoleDimensions,
  pegMaterial: PegMaterial,
  stringTension: StringTension
): TaperFitAnalysis {
  const taperDifference = Math.abs(pegDimensions.taper - holeDimensions.taper);
  const pegAvgDiameter = (pegDimensions.smallEndDiameter + pegDimensions.largeEndDiameter) / 2;
  const holeAvgDiameter = (holeDimensions.smallEndDiameter + holeDimensions.largeEndDiameter) / 2;
  const interference = pegAvgDiameter - holeAvgDiameter;
  const clearance = Math.max(0, holeAvgDiameter - pegAvgDiameter);

  const contactLength = Math.min(pegDimensions.length, holeDimensions.depth);
  const avgDiameter = (pegAvgDiameter + holeAvgDiameter) / 2;
  const contactArea = Math.PI * avgDiameter * contactLength;

  let fitStatus: 'too_tight' | 'optimal' | 'too_loose';
  if (interference > OPTIMAL_INTERFERENCE_MAX) {
    fitStatus = 'too_tight';
  } else if (interference < OPTIMAL_INTERFERENCE_MIN) {
    fitStatus = 'too_loose';
  } else {
    fitStatus = 'optimal';
  }

  const selfLockingAngle = Math.atan(pegDimensions.taper / 2) * (180 / Math.PI);
  const frictionAngle = Math.atan(pegMaterial.frictionCoefficient) * (180 / Math.PI);
  const isSelfLocking = selfLockingAngle < frictionAngle / SELF_LOCKING_FACTOR;

  const requiredTaper = 2 * Math.tan((frictionAngle / SELF_LOCKING_FACTOR) * (Math.PI / 180));
  const deviation = pegDimensions.taper - requiredTaper;

  const normalForce = stringTension.tension * Math.sin(Math.PI / 6);
  const turningTorque = normalForce * pegMaterial.frictionCoefficient * (pegAvgDiameter / 2);
  const holdingTorque = turningTorque * SELF_LOCKING_FACTOR;

  let slipRisk: 'low' | 'medium' | 'high';
  if (isSelfLocking && fitStatus === 'optimal' && interference >= 0.03) {
    slipRisk = 'low';
  } else if ((isSelfLocking && fitStatus !== 'too_loose') || interference >= 0.02) {
    slipRisk = 'medium';
  } else {
    slipRisk = 'high';
  }

  const recommendations: string[] = [];
  if (fitStatus === 'too_tight') {
    recommendations.push(`配合过紧，过盈量 ${interference.toFixed(3)}mm 超过最大值 ${OPTIMAL_INTERFERENCE_MAX}mm`);
    recommendations.push('建议：使用铰刀扩孔，去除约 ' + (interference - OPTIMAL_INTERFERENCE_MAX).toFixed(3) + 'mm 材料');
  } else if (fitStatus === 'too_loose') {
    recommendations.push(`配合过松，过盈量 ${interference.toFixed(3)}mm 低于最小值 ${OPTIMAL_INTERFERENCE_MIN}mm`);
    if (interference < 0) {
      recommendations.push('警告：存在间隙，调音后极易回滑跑音！');
    }
    recommendations.push('建议：更换较粗弦轴或使用弦轴膏增加摩擦');
  } else {
    recommendations.push('配合良好，过盈量在最佳范围内');
  }

  if (!isSelfLocking) {
    recommendations.push(`锥度过大 (${selfLockingAngle.toFixed(2)}°)，不满足自锁条件 (需 < ${frictionAngle.toFixed(2)}°)`);
    recommendations.push('建议：减小弦轴锥度至 ' + requiredTaper.toFixed(4) + ' (1:' + (1/requiredTaper).toFixed(1) + ')');
  } else {
    recommendations.push('自锁条件满足，锥度设计合理');
  }

  if (taperDifference > 0.002) {
    recommendations.push(`弦轴与孔锥度差过大 (${taperDifference.toFixed(4)})，可能导致接触不良`);
  }

  return {
    taperDifference,
    interference,
    clearance,
    contactArea,
    fitStatus,
    selfLockingAngle,
    isSelfLocking,
    requiredTaper,
    deviation,
    turningTorque,
    holdingTorque,
    slipRisk,
    recommendations,
  };
}

export function calculateTuningStability(
  pegDimensions: PegDimensions,
  holeDimensions: PegBoxHoleDimensions,
  stringTension: StringTension,
  pegMaterial: PegMaterial,
  humidity: number = HUMIDITY_REFERENCE
): TuningStabilityAnalysis {
  const pegRadius = (pegDimensions.smallEndDiameter + pegDimensions.largeEndDiameter) / 4;
  const stringAngle = Math.PI / 6;
  const requiredTorque = stringTension.tension * pegRadius * Math.sin(stringAngle);

  const normalForce = stringTension.tension * Math.sin(stringAngle / 2);
  const maxFrictionForce = normalForce * pegMaterial.frictionCoefficient;
  const gripForce = maxFrictionForce * 2;

  const holdingStability = Math.min(100, (gripForce / stringTension.tension) * 100);

  const concentricityDeviation = holeDimensions.concentricity;
  const bindingRisk = concentricityDeviation > 0.05;

  const humidityEffect = calculateHumidityEffect(
    pegDimensions,
    holeDimensions,
    pegMaterial,
    humidity
  );

  let overallStability: 'excellent' | 'good' | 'fair' | 'poor';
  const warnings: string[] = [];

  if (holdingStability >= 80 && humidityEffect.riskLevel === 'low' && !bindingRisk) {
    overallStability = 'excellent';
  } else if (holdingStability >= 60 && humidityEffect.riskLevel !== 'high' && !bindingRisk) {
    overallStability = 'good';
  } else if (holdingStability >= 40 && !bindingRisk) {
    overallStability = 'fair';
  } else {
    overallStability = 'poor';
  }

  if (bindingRisk) {
    warnings.push(`同轴度偏差 ${concentricityDeviation.toFixed(3)}mm 过大，可能导致弦轴别劲`);
    warnings.push('建议：检查弦轴孔是否同心，必要时重新铰孔');
  }

  if (humidityEffect.riskLevel === 'high') {
    warnings.push(`湿度 ${humidity}% 下配合变化风险高，配合变化量 ${humidityEffect.fitChange.toFixed(3)}mm`);
  }

  if (holdingStability < 50) {
    warnings.push(`握持稳定性 ${holdingStability.toFixed(1)}% 较低，可能出现调音回滑`);
  }

  return {
    stringTension: stringTension.tension,
    pegRadius,
    stringAngle,
    requiredTorque,
    gripForce,
    holdingStability,
    concentricityDeviation,
    bindingRisk,
    humidityEffect,
    overallStability,
    warnings,
  };
}

export function calculateHumidityEffect(
  pegDimensions: PegDimensions,
  holeDimensions: PegBoxHoleDimensions,
  pegMaterial: PegMaterial,
  humidity: number
): HumidityEffect {
  const humidityDelta = humidity - HUMIDITY_REFERENCE;
  const pegAvgDiameter = (pegDimensions.smallEndDiameter + pegDimensions.largeEndDiameter) / 2;
  const holeAvgDiameter = (holeDimensions.smallEndDiameter + holeDimensions.largeEndDiameter) / 2;

  const pegDiameterChange = pegAvgDiameter * pegMaterial.swellingCoefficient * humidityDelta;
  const holeDiameterChange = holeAvgDiameter * 0.002 * humidityDelta;
  const fitChange = pegDiameterChange - holeDiameterChange;
  const stressChange = Math.abs(fitChange) * pegMaterial.hardness * 10;

  let riskLevel: 'low' | 'medium' | 'high';
  if (Math.abs(fitChange) < 0.02) {
    riskLevel = 'low';
  } else if (Math.abs(fitChange) < 0.05) {
    riskLevel = 'medium';
  } else {
    riskLevel = 'high';
  }

  return {
    humidity,
    pegDiameterChange,
    holeDiameterChange,
    fitChange,
    stressChange,
    riskLevel,
  };
}

export function reverseCalculateTaper(
  stringTension: StringTension,
  pegMaterial: PegMaterial,
  currentInterference: number
): FitCorrectionPlan {
  const frictionAngle = Math.atan(pegMaterial.frictionCoefficient) * (180 / Math.PI);
  const targetTaper = 2 * Math.tan((frictionAngle / SELF_LOCKING_FACTOR) * (Math.PI / 180));
  const targetInterference = (OPTIMAL_INTERFERENCE_MIN + OPTIMAL_INTERFERENCE_MAX) / 2;

  const materialToRemove = Math.max(0, currentInterference - targetInterference);
  const reamingDepth = materialToRemove / targetTaper;

  const steps: string[] = [
    `1. 测量当前弦轴锥度，确认与目标锥度 ${targetTaper.toFixed(4)} (1:${(1/targetTaper).toFixed(1)}) 的偏差`,
    `2. 使用 ${targetTaper.toFixed(4)} 锥度铰刀修整弦轴孔`,
    `3. 控制铰削深度约 ${reamingDepth.toFixed(2)}mm，去除 ${materialToRemove.toFixed(3)}mm 材料`,
    `4. 试装弦轴，检查过盈量应在 ${OPTIMAL_INTERFERENCE_MIN}-${OPTIMAL_INTERFERENCE_MAX}mm`,
    '5. 涂抹适量弦轴膏，测试转动手感和自锁性能',
    '6. 装弦调音，验证调音稳定性',
  ];

  const tools: string[] = [
    `${targetTaper.toFixed(4)} 锥度铰刀 (1:${(1/targetTaper).toFixed(1)})`,
    '内径千分尺',
    '外径千分尺',
    '锥度量规',
    '扭力扳手',
  ];

  return {
    currentTaper: targetTaper + (currentInterference > targetInterference ? 0.001 : -0.001),
    targetTaper,
    materialToRemove,
    reamingDepth,
    expectedInterference: targetInterference,
    steps,
    tools,
  };
}

export function checkConcentricity(
  holeDimensions: PegBoxHoleDimensions,
  pegDimensions: PegDimensions
): { isAcceptable: boolean; deviation: number; recommendation: string } {
  const deviation = holeDimensions.concentricity;
  const isAcceptable = deviation <= 0.05;

  let recommendation: string;
  if (isAcceptable) {
    recommendation = '同轴度良好，无需修整';
  } else if (deviation <= 0.1) {
    recommendation = '同轴度偏差略大，建议使用导向铰刀修整';
  } else {
    recommendation = '同轴度偏差严重，必须重新铰孔校正，否则会导致弦轴别劲';
  }

  return { isAcceptable, deviation, recommendation };
}

export function generateRiskAlerts(
  analysis: TaperFitAnalysis,
  stability: TuningStabilityAnalysis,
  instrumentId: string
): RiskAlert[] {
  const alerts: RiskAlert[] = [];
  const timestamp = new Date().toISOString();

  if (analysis.slipRisk === 'high') {
    alerts.push({
      id: `slip-${Date.now()}`,
      instrumentId,
      type: 'slippage',
      severity: 'critical',
      message: '弦轴配合过松，存在严重的调音回滑跑音风险',
      recommendation: '立即修整弦轴配合或更换弦轴',
      timestamp,
      acknowledged: false,
    });
  } else if (analysis.slipRisk === 'medium') {
    alerts.push({
      id: `slip-${Date.now()}-1`,
      instrumentId,
      type: 'slippage',
      severity: 'medium',
      message: '弦轴配合一般，可能出现调音回滑',
      recommendation: '建议检查配合并考虑修整',
      timestamp,
      acknowledged: false,
    });
  }

  if (stability.bindingRisk) {
    alerts.push({
      id: `bind-${Date.now()}`,
      instrumentId,
      type: 'binding',
      severity: 'high',
      message: '弦轴孔同轴度偏差过大，存在别劲风险',
      recommendation: '重新铰孔校正同轴度',
      timestamp,
      acknowledged: false,
    });
  }

  if (stability.humidityEffect.riskLevel === 'high') {
    alerts.push({
      id: `humid-${Date.now()}`,
      instrumentId,
      type: 'humidity',
      severity: 'high',
      message: '湿度变化对配合影响较大',
      recommendation: '使用加湿器/除湿器控制环境湿度在40-50%范围',
      timestamp,
      acknowledged: false,
    });
  }

  if (!analysis.isSelfLocking) {
    alerts.push({
      id: `lock-${Date.now()}`,
      instrumentId,
      type: 'slippage',
      severity: 'critical',
      message: '锥度过大，不满足摩擦自锁条件，调音必然回滑',
      recommendation: '必须减小弦轴锥度至推荐值',
      timestamp,
      acknowledged: false,
    });
  }

  return alerts;
}

export function simulateHumiditySweep(
  pegDimensions: PegDimensions,
  holeDimensions: PegBoxHoleDimensions,
  pegMaterial: PegMaterial,
  minHumidity: number = 20,
  maxHumidity: number = 80,
  step: number = 5
): HumidityEffect[] {
  const results: HumidityEffect[] = [];
  for (let h = minHumidity; h <= maxHumidity; h += step) {
    results.push(calculateHumidityEffect(pegDimensions, holeDimensions, pegMaterial, h));
  }
  return results;
}

export const STANDARD_LIBRARY = [
  {
    name: '小提琴标准G弦轴',
    instrumentType: 'violin',
    description: '4/4小提琴G弦标准弦轴配合方案',
    pegSpecifications: {
      material: MATERIAL_DATABASE[0],
      dimensions: {
        smallEndDiameter: 7.8,
        largeEndDiameter: 8.6,
        length: 24.0,
        taper: 1 / 30,
      },
      holeDimensions: {
        smallEndDiameter: 7.78,
        largeEndDiameter: 8.58,
        depth: 23.5,
        taper: 1 / 30,
        concentricity: 0.02,
      },
    },
    stringTensions: [
      { stringName: 'G', tension: 35, frequency: 196, diameter: 0.8 },
    ],
    recommendedTaper: 1 / 30,
    optimalInterference: 0.04,
    isStandard: true,
  },
  {
    name: '小提琴标准D弦轴',
    instrumentType: 'violin',
    description: '4/4小提琴D弦标准弦轴配合方案',
    pegSpecifications: {
      material: MATERIAL_DATABASE[0],
      dimensions: {
        smallEndDiameter: 7.8,
        largeEndDiameter: 8.6,
        length: 24.0,
        taper: 1 / 30,
      },
      holeDimensions: {
        smallEndDiameter: 7.78,
        largeEndDiameter: 8.58,
        depth: 23.5,
        taper: 1 / 30,
        concentricity: 0.02,
      },
    },
    stringTensions: [
      { stringName: 'D', tension: 32, frequency: 293.66, diameter: 0.7 },
    ],
    recommendedTaper: 1 / 30,
    optimalInterference: 0.04,
    isStandard: true,
  },
];
