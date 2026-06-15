import React, { useState, useMemo } from 'react';
import {
  PegMaterial,
  PegDimensions,
  PegBoxHoleDimensions,
  StringTension,
  TaperFitAnalysis,
  FitCorrectionPlan,
  RiskAlert,
} from '../../shared/types';
import {
  MATERIAL_DATABASE,
  calculateTaper,
  calculateTaperFit,
  reverseCalculateTaper,
  checkConcentricity,
  generateRiskAlerts,
} from '../../shared/calculationEngine';

interface TaperFitPageProps {
  onAddAlert: (alert: RiskAlert) => void;
}

const TaperFitPage: React.FC<TaperFitPageProps> = ({ onAddAlert }) => {
  const [instrumentId, setInstrumentId] = useState('CALC-' + Date.now());
  const [selectedMaterial, setSelectedMaterial] = useState<PegMaterial>(MATERIAL_DATABASE[0]);

  const [pegSmall, setPegSmall] = useState(7.8);
  const [pegLarge, setPegLarge] = useState(8.6);
  const [pegLength, setPegLength] = useState(24.0);

  const [holeSmall, setHoleSmall] = useState(7.82);
  const [holeLarge, setHoleLarge] = useState(8.62);
  const [holeDepth, setHoleDepth] = useState(23.5);
  const [concentricity, setConcentricity] = useState(0.03);

  const [tension, setTension] = useState(35);
  const [stringName, setStringName] = useState('G');
  const [frequency, setFrequency] = useState(196);

  const [showCorrection, setShowCorrection] = useState(false);

  const pegTaper = calculateTaper(pegSmall, pegLarge, pegLength);
  const holeTaper = calculateTaper(holeSmall, holeLarge, holeDepth);

  const pegDimensions: PegDimensions = {
    smallEndDiameter: pegSmall,
    largeEndDiameter: pegLarge,
    length: pegLength,
    taper: pegTaper,
  };

  const holeDimensions: PegBoxHoleDimensions = {
    smallEndDiameter: holeSmall,
    largeEndDiameter: holeLarge,
    depth: holeDepth,
    taper: holeTaper,
    concentricity,
  };

  const stringTension: StringTension = {
    stringName,
    tension,
    frequency,
    diameter: 0.8,
  };

  const analysis: TaperFitAnalysis = useMemo(() => {
    return calculateTaperFit(pegDimensions, holeDimensions, selectedMaterial, stringTension);
  }, [pegDimensions, holeDimensions, selectedMaterial, stringTension]);

  const concentricityCheck = useMemo(() => {
    return checkConcentricity(holeDimensions, pegDimensions);
  }, [holeDimensions, pegDimensions]);

  const currentInterference = (
    (pegSmall + pegLarge) / 2 - (holeSmall + holeLarge) / 2
  );

  const correctionPlan: FitCorrectionPlan = useMemo(() => {
    return reverseCalculateTaper(stringTension, selectedMaterial, currentInterference);
  }, [stringTension, selectedMaterial, currentInterference]);

  const handleAnalyze = () => {
    const stabilityAnalysis = {
      bindingRisk: concentricity > 0.05,
      humidityEffect: { riskLevel: 'low' as const },
      overallStability: 'good' as const,
    };
    const alerts = generateRiskAlerts(analysis, stabilityAnalysis as any, instrumentId);
    alerts.forEach(alert => onAddAlert(alert));
  };

  const getFitStatusText = (status: string) => {
    switch (status) {
      case 'too_tight': return '配合过紧';
      case 'too_loose': return '配合过松';
      case 'optimal': return '配合良好';
      default: return status;
    }
  };

  const getSlipRiskText = (risk: string) => {
    switch (risk) {
      case 'low': return '低';
      case 'medium': return '中';
      case 'high': return '高';
      default: return risk;
    }
  };

  return (
    <div className="page">
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">锥度配合计算</h2>
          <button className="btn btn-primary" onClick={handleAnalyze}>
            🔍 分析风险
          </button>
        </div>

        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">弦轴材质</label>
            <select
              className="form-select"
              value={selectedMaterial.id}
              onChange={e => {
                const mat = MATERIAL_DATABASE.find(m => m.id === e.target.value);
                if (mat) setSelectedMaterial(mat);
              }}
            >
              {MATERIAL_DATABASE.map(mat => (
                <option key={mat.id} value={mat.id}>{mat.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">弦轴小头 (mm)</label>
            <input
              type="number"
              step="0.01"
              className="form-input"
              value={pegSmall}
              onChange={e => setPegSmall(Number(e.target.value))}
            />
          </div>
          <div className="form-group">
            <label className="form-label">弦轴大头 (mm)</label>
            <input
              type="number"
              step="0.01"
              className="form-input"
              value={pegLarge}
              onChange={e => setPegLarge(Number(e.target.value))}
            />
          </div>
          <div className="form-group">
            <label className="form-label">弦轴长度 (mm)</label>
            <input
              type="number"
              step="0.1"
              className="form-input"
              value={pegLength}
              onChange={e => setPegLength(Number(e.target.value))}
            />
          </div>

          <div className="form-group">
            <label className="form-label">孔小头 (mm)</label>
            <input
              type="number"
              step="0.01"
              className="form-input"
              value={holeSmall}
              onChange={e => setHoleSmall(Number(e.target.value))}
            />
          </div>
          <div className="form-group">
            <label className="form-label">孔大头 (mm)</label>
            <input
              type="number"
              step="0.01"
              className="form-input"
              value={holeLarge}
              onChange={e => setHoleLarge(Number(e.target.value))}
            />
          </div>
          <div className="form-group">
            <label className="form-label">孔深度 (mm)</label>
            <input
              type="number"
              step="0.1"
              className="form-input"
              value={holeDepth}
              onChange={e => setHoleDepth(Number(e.target.value))}
            />
          </div>
          <div className="form-group">
            <label className="form-label">同轴度偏差 (mm)</label>
            <input
              type="number"
              step="0.01"
              className={`form-input ${concentricity > 0.05 ? 'value-danger' : ''}`}
              value={concentricity}
              onChange={e => setConcentricity(Number(e.target.value))}
            />
          </div>

          <div className="form-group">
            <label className="form-label">弦名</label>
            <select
              className="form-select"
              value={stringName}
              onChange={e => setStringName(e.target.value)}
            >
              <option value="G">G弦</option>
              <option value="D">D弦</option>
              <option value="A">A弦</option>
              <option value="E">E弦</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">弦张力 (N)</label>
            <input
              type="number"
              step="0.5"
              className="form-input"
              value={tension}
              onChange={e => setTension(Number(e.target.value))}
            />
          </div>
          <div className="form-group">
            <label className="form-label">频率 (Hz)</label>
            <input
              type="number"
              step="0.01"
              className="form-input"
              value={frequency}
              onChange={e => setFrequency(Number(e.target.value))}
            />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">配合状态</h2>
          <div className={`fit-status ${analysis.fitStatus}`}>
            {getFitStatusText(analysis.fitStatus)}
          </div>
        </div>

        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-value">1:{(1 / pegTaper).toFixed(1)}</div>
            <div className="metric-label">弦轴锥度</div>
          </div>
          <div className="metric-card">
            <div className="metric-value">1:{(1 / holeTaper).toFixed(1)}</div>
            <div className="metric-label">孔锥度</div>
          </div>
          <div className="metric-card">
            <div className={`metric-value ${Math.abs(analysis.taperDifference) > 0.002 ? 'value-danger' : 'value-good'}`}>
              {analysis.taperDifference.toFixed(4)}
            </div>
            <div className="metric-label">锥度差</div>
          </div>
          <div className="metric-card">
            <div className={`metric-value ${analysis.interference < 0.02 || analysis.interference > 0.06 ? 'value-danger' : 'value-good'}`}>
              {analysis.interference.toFixed(3)} <span style={{ fontSize: '14px' }}>mm</span>
            </div>
            <div className="metric-label">过盈量</div>
          </div>
          <div className="metric-card">
            <div className={`metric-value ${analysis.isSelfLocking ? 'value-good' : 'value-danger'}`}>
              {analysis.selfLockingAngle.toFixed(2)}°
            </div>
            <div className="metric-label">自锁角</div>
          </div>
          <div className="metric-card">
            <div className={`metric-value status-${analysis.slipRisk}`}>
              {getSlipRiskText(analysis.slipRisk)}
            </div>
            <div className="metric-label">回滑风险</div>
          </div>
        </div>

        <div className="data-display">
          <div className="data-item">
            <div className="data-label">接触面积</div>
            <div className="data-value">{analysis.contactArea.toFixed(2)} <span className="data-unit">mm²</span></div>
          </div>
          <div className="data-item">
            <div className="data-label">转动扭矩</div>
            <div className="data-value">{analysis.turningTorque.toFixed(3)} <span className="data-unit">N·m</span></div>
          </div>
          <div className="data-item">
            <div className="data-label">握持扭矩</div>
            <div className="data-value">{analysis.holdingTorque.toFixed(3)} <span className="data-unit">N·m</span></div>
          </div>
          <div className="data-item">
            <div className="data-label">推荐锥度</div>
            <div className="data-value">1:{(1 / analysis.requiredTaper).toFixed(1)}</div>
          </div>
          <div className="data-item">
            <div className="data-label">锥度偏差</div>
            <div className={`data-value ${Math.abs(analysis.deviation) > 0.002 ? 'value-danger' : ''}`}>
              {analysis.deviation.toFixed(4)}
            </div>
          </div>
          <div className="data-item">
            <div className="data-label">摩擦角</div>
            <div className="data-value">{(Math.atan(selectedMaterial.frictionCoefficient) * 180 / Math.PI).toFixed(2)}°</div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">自锁条件验证</h2>
          <span className={`status-badge ${analysis.isSelfLocking ? 'status-good' : 'status-critical'}`}>
            {analysis.isSelfLocking ? '✓ 满足自锁' : '✗ 不满足自锁'}
          </span>
        </div>
        <p className="section-subtitle">
          自锁原理：锥度半角必须小于摩擦角除以安全系数 (1.5)
        </p>
        <div className="data-display">
          <div className="data-item">
            <div className="data-label">锥度半角 α</div>
            <div className={`data-value ${!analysis.isSelfLocking ? 'value-danger' : 'value-good'}`}>
              {analysis.selfLockingAngle.toFixed(2)}°
            </div>
          </div>
          <div className="data-item">
            <div className="data-label">摩擦角 φ</div>
            <div className="data-value">
              {(Math.atan(selectedMaterial.frictionCoefficient) * 180 / Math.PI).toFixed(2)}°
            </div>
          </div>
          <div className="data-item">
            <div className="data-label">允许最大锥度半角 (φ/1.5)</div>
            <div className="data-value value-good">
              {((Math.atan(selectedMaterial.frictionCoefficient) * 180 / Math.PI) / 1.5).toFixed(2)}°
            </div>
          </div>
          <div className="data-item">
            <div className="data-label">安全裕度</div>
            <div className={`data-value ${analysis.isSelfLocking ? 'value-good' : 'value-danger'}`}>
              {(((Math.atan(selectedMaterial.frictionCoefficient) * 180 / Math.PI) / 1.5 - analysis.selfLockingAngle)).toFixed(2)}°
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">同轴度校验</h2>
          <span className={`status-badge ${concentricityCheck.isAcceptable ? 'status-good' : 'status-critical'}`}>
            {concentricityCheck.isAcceptable ? '✓ 合格' : '✗ 不合格'}
          </span>
        </div>
        <div className="data-display">
          <div className="data-item">
            <div className="data-label">同轴度偏差</div>
            <div className={`data-value ${!concentricityCheck.isAcceptable ? 'value-danger' : ''}`}>
              {concentricityCheck.deviation.toFixed(3)} <span className="data-unit">mm</span>
            </div>
          </div>
          <div className="data-item">
            <div className="data-label">允许最大偏差</div>
            <div className="data-value">0.05 <span className="data-unit">mm</span></div>
          </div>
        </div>
        <p style={{ marginTop: '16px', color: concentricityCheck.isAcceptable ? '#00b894' : '#ff6b6b' }}>
          {concentricityCheck.recommendation}
        </p>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">分析建议</h2>
        </div>
        <ul className="recommendation-list">
          {analysis.recommendations.map((rec, idx) => (
            <li
              key={idx}
              className={
                rec.includes('警告') || rec.includes('必须') ? 'warning' :
                rec.includes('良好') || rec.includes('合理') ? 'success' : ''
              }
            >
              {rec}
            </li>
          ))}
        </ul>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">配合修整方案</h2>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setShowCorrection(!showCorrection)}
          >
            {showCorrection ? '收起' : '展开'}
          </button>
        </div>
        {showCorrection && (
          <>
            <div className="data-display">
              <div className="data-item">
                <div className="data-label">当前过盈量</div>
                <div className={`data-value ${currentInterference < 0.02 || currentInterference > 0.06 ? 'value-danger' : ''}`}>
                  {currentInterference.toFixed(3)} <span className="data-unit">mm</span>
                </div>
              </div>
              <div className="data-item">
                <div className="data-label">目标过盈量</div>
                <div className="data-value value-good">
                  {correctionPlan.expectedInterference.toFixed(3)} <span className="data-unit">mm</span>
                </div>
              </div>
              <div className="data-item">
                <div className="data-label">目标锥度</div>
                <div className="data-value">
                  1:{(1 / correctionPlan.targetTaper).toFixed(1)}
                </div>
              </div>
              <div className="data-item">
                <div className="data-label">需去除材料</div>
                <div className="data-value">
                  {correctionPlan.materialToRemove.toFixed(3)} <span className="data-unit">mm</span>
                </div>
              </div>
              <div className="data-item">
                <div className="data-label">铰削深度</div>
                <div className="data-value">
                  {correctionPlan.reamingDepth.toFixed(2)} <span className="data-unit">mm</span>
                </div>
              </div>
            </div>

            <h3 style={{ marginTop: '24px', marginBottom: '16px', color: '#e94560' }}>修整步骤</h3>
            <ul className="steps-list">
              {correctionPlan.steps.map((step, idx) => (
                <li key={idx}>
                  <span className="step-number">{idx + 1}</span>
                  {step.replace(/^\d+\.\s*/, '')}
                </li>
              ))}
            </ul>

            <h3 style={{ marginTop: '24px', marginBottom: '16px', color: '#e94560' }}>所需工具</h3>
            <div>
              {correctionPlan.tools.map((tool, idx) => (
                <span key={idx} className="tools-badge">{tool}</span>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">按弦张力反推参数</h2>
        </div>
        <p className="section-subtitle">
          输入目标弦张力，系统自动计算所需的弦轴锥度和配合参数
        </p>
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">目标弦张力 (N)</label>
            <input
              type="number"
              step="1"
              className="form-input"
              value={tension}
              onChange={e => setTension(Number(e.target.value))}
            />
          </div>
          <div className="form-group">
            <label className="form-label">计算所需最小过盈量</label>
            <div className="data-value">
              {(0.02 + (tension / 1000)).toFixed(3)} <span className="data-unit">mm</span>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">推荐弦轴直径</label>
            <div className="data-value">
              {(7.5 + (tension / 20)).toFixed(2)} <span className="data-unit">mm</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaperFitPage;
