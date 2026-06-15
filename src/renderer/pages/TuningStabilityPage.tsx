import React, { useState, useMemo } from 'react';
import {
  PegMaterial,
  PegDimensions,
  PegBoxHoleDimensions,
  StringTension,
  TuningStabilityAnalysis,
  HumidityEffect,
  RiskAlert,
} from '../../shared/types';
import {
  MATERIAL_DATABASE,
  calculateTaper,
  calculateTuningStability,
  simulateHumiditySweep,
  checkConcentricity,
  generateRiskAlerts,
  calculateTaperFit,
} from '../../shared/calculationEngine';

interface TuningStabilityPageProps {
  onAddAlert: (alert: RiskAlert) => void;
}

const TuningStabilityPage: React.FC<TuningStabilityPageProps> = ({ onAddAlert }) => {
  const [instrumentId, setInstrumentId] = useState('STAB-' + Date.now());
  const [selectedMaterial, setSelectedMaterial] = useState<PegMaterial>(MATERIAL_DATABASE[0]);
  const [humidity, setHumidity] = useState(45);

  const [pegSmall, setPegSmall] = useState(7.8);
  const [pegLarge, setPegLarge] = useState(8.6);
  const [pegLength, setPegLength] = useState(24.0);

  const [holeSmall, setHoleSmall] = useState(7.78);
  const [holeLarge, setHoleLarge] = useState(8.58);
  const [holeDepth, setHoleDepth] = useState(23.5);
  const [concentricity, setConcentricity] = useState(0.02);

  const [tension, setTension] = useState(35);
  const [stringName, setStringName] = useState('G');

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
    frequency: 196,
    diameter: 0.8,
  };

  const analysis: TuningStabilityAnalysis = useMemo(() => {
    return calculateTuningStability(pegDimensions, holeDimensions, stringTension, selectedMaterial, humidity);
  }, [pegDimensions, holeDimensions, stringTension, selectedMaterial, humidity]);

  const humiditySweep: HumidityEffect[] = useMemo(() => {
    return simulateHumiditySweep(pegDimensions, holeDimensions, selectedMaterial, 20, 80, 5);
  }, [pegDimensions, holeDimensions, selectedMaterial]);

  const concentricityCheck = useMemo(() => {
    return checkConcentricity(holeDimensions, pegDimensions);
  }, [holeDimensions, pegDimensions]);

  const handleAnalyze = () => {
    const taperAnalysis = calculateTaperFit(pegDimensions, holeDimensions, selectedMaterial, stringTension);
    const alerts = generateRiskAlerts(taperAnalysis, analysis, instrumentId);
    alerts.forEach(alert => onAddAlert(alert));
  };

  const getOverallStabilityText = (status: string) => {
    switch (status) {
      case 'excellent': return '优秀';
      case 'good': return '良好';
      case 'fair': return '一般';
      case 'poor': return '较差';
      default: return status;
    }
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'low': return '#00b894';
      case 'medium': return '#fdcb6e';
      case 'high': return '#ff6b6b';
      default: return '#a0a0a0';
    }
  };

  return (
    <div className="page">
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">调音稳定性参数设置</h2>
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
            <label className="form-label">环境湿度 (%)</label>
            <input
              type="range"
              min="20"
              max="80"
              value={humidity}
              onChange={e => setHumidity(Number(e.target.value))}
            />
            <div style={{ textAlign: 'center', fontSize: '18px', fontWeight: 'bold', color: '#e94560' }}>
              {humidity}%
            </div>
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
            <label className="form-label">弦位</label>
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
            <label className="form-label">弦轴直径 (mm)</label>
            <input
              type="number"
              step="0.01"
              className="form-input"
              value={pegSmall}
              onChange={e => setPegSmall(Number(e.target.value))}
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
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">整体稳定性评估</h2>
          <span className={`status-badge status-${analysis.overallStability}`}>
            {getOverallStabilityText(analysis.overallStability)}
          </span>
        </div>
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-value">{analysis.requiredTorque.toFixed(3)}</div>
            <div className="metric-label">所需扭矩 (N·m)</div>
          </div>
          <div className="metric-card">
            <div className="metric-value">{analysis.gripForce.toFixed(2)}</div>
            <div className="metric-label">握持力 (N)</div>
          </div>
          <div className="metric-card">
            <div className={`metric-value ${analysis.holdingStability < 50 ? 'value-danger' : 'value-good'}`}>
              {analysis.holdingStability.toFixed(1)}%
            </div>
            <div className="metric-label">握持稳定性</div>
          </div>
          <div className="metric-card">
            <div className={`metric-value ${analysis.bindingRisk ? 'value-danger' : 'value-good'}`}>
              {analysis.bindingRisk ? '有' : '无'}
            </div>
            <div className="metric-label">别劲风险</div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">弦轴在弦张力下的扭矩分析</h2>
        </div>
        <p className="section-subtitle">
          扭矩公式：<strong>T = F · r · sin(θ)</strong>，其中 F 为弦张力（N），r 为弦轴半径（m），θ 为包角（弧度）
        </p>
        <div className="data-display">
          <div className="data-item">
            <div className="data-label">弦张力 F</div>
            <div className="data-value">{analysis.stringTension} <span className="data-unit">N</span></div>
          </div>
          <div className="data-item">
            <div className="data-label">弦轴半径 r</div>
            <div className="data-value">
              {analysis.pegRadius.toFixed(3)} <span className="data-unit">mm</span>
              <span style={{ color: '#666', fontSize: '12px', marginLeft: '6px' }}>
                (= {(analysis.pegRadius_m || analysis.pegRadius / 1000).toFixed(6)} m)
              </span>
            </div>
          </div>
          <div className="data-item">
            <div className="data-label">包角 θ</div>
            <div className="data-value">
              {(analysis.stringAngle * 180 / Math.PI).toFixed(0)}°
              <span style={{ color: '#666', fontSize: '12px', marginLeft: '6px' }}>
                (= {analysis.stringAngle.toFixed(3)} rad, sin = {Math.sin(analysis.stringAngle).toFixed(3)})
              </span>
            </div>
          </div>
          <div className="data-item">
            <div className="data-label">所需扭矩 T = F·r·sin(θ)</div>
            <div className="data-value value-highlight">
              {analysis.requiredTorque.toFixed(4)} <span className="data-unit">N·m</span>
              <span style={{ color: '#666', fontSize: '12px', marginLeft: '6px' }}>
                (= {(analysis.requiredTorque * 1000).toFixed(2)} N·mm)
              </span>
            </div>
          </div>
          <div className="data-item">
            <div className="data-label">法向力 N</div>
            <div className="data-value">{(analysis.stringTension * Math.sin(analysis.stringAngle / 2)).toFixed(2)} <span className="data-unit">N</span></div>
          </div>
          <div className="data-item">
            <div className="data-label">最大摩擦力</div>
            <div className="data-value">{(analysis.gripForce / 2).toFixed(2)} <span className="data-unit">N</span></div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">握持稳定性分析</h2>
        </div>
        <p className="section-subtitle">
          握持稳定性 = (最大摩擦力 / 弦张力) × 100%，值越高表示调音后越不容易回滑
        </p>
        <div style={{
          height: '24px',
          background: 'rgba(0, 0, 0, 0.3)',
          borderRadius: '12px',
          overflow: 'hidden',
          margin: '20px 0',
        }}>
          <div style={{
            height: '100%',
            width: `${analysis.holdingStability}%`,
            background: analysis.holdingStability >= 80 ? 'linear-gradient(90deg, #00b894, #00ceac)' :
                       analysis.holdingStability >= 60 ? 'linear-gradient(90deg, #00b0ff, #4fc3f7)' :
                       analysis.holdingStability >= 40 ? 'linear-gradient(90deg, #fdcb6e, #fddb91)' :
                       'linear-gradient(90deg, #ff6b6b, #ff8787)',
            transition: 'width 0.5s ease',
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#666' }}>
          <span>0% - 极易回滑</span>
          <span>40%</span>
          <span>60%</span>
          <span>80% - 非常稳定</span>
        </div>

        <div className="data-display" style={{ marginTop: '24px' }}>
          <div className="data-item">
            <div className="data-label">摩擦系数 μ</div>
            <div className="data-value">{selectedMaterial.frictionCoefficient}</div>
          </div>
          <div className="data-item">
            <div className="data-label">安全系数</div>
            <div className="data-value">{(analysis.gripForce / analysis.stringTension).toFixed(2)}</div>
          </div>
          <div className="data-item">
            <div className="data-label">建议最小握持稳定性</div>
            <div className="data-value value-good">50%</div>
          </div>
          <div className="data-item">
            <div className="data-label">裕度</div>
            <div className={`data-value ${analysis.holdingStability < 50 ? 'value-danger' : 'value-good'}`}>
              {(analysis.holdingStability - 50).toFixed(1)}%
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">同轴度校验 - 避免别劲</h2>
          <span className={`status-badge ${concentricityCheck.isAcceptable ? 'status-good' : 'status-critical'}`}>
            {concentricityCheck.isAcceptable ? '✓ 合格' : '✗ 不合格'}
          </span>
        </div>
        <div className="data-display">
          <div className="data-item">
            <div className="data-label">同轴度偏差</div>
            <div className={`data-value ${!concentricityCheck.isAcceptable ? 'value-danger' : ''}`}>
              {concentricityCheck.deviation.toFixed(4)} <span className="data-unit">mm</span>
            </div>
          </div>
          <div className="data-item">
            <div className="data-label">允许最大值</div>
            <div className="data-value">0.05 <span className="data-unit">mm</span></div>
          </div>
          <div className="data-item">
            <div className="data-label">别劲风险</div>
            <div className={`data-value ${analysis.bindingRisk ? 'value-danger' : 'value-good'}`}>
              {analysis.bindingRisk ? '存在' : '无'}
            </div>
          </div>
        </div>
        {analysis.bindingRisk && (
          <div style={{ marginTop: '16px', padding: '16px', background: 'rgba(255, 107, 107, 0.1)', borderRadius: '8px', borderLeft: '4px solid #ff6b6b' }}>
            <p style={{ color: '#ff6b6b', fontWeight: 'bold' }}>⚠️ 警告：同轴度偏差过大，可能导致以下问题：</p>
            <ul style={{ marginTop: '8px', color: '#a0a0a0', paddingLeft: '20px' }}>
              <li>弦轴转动不顺畅，有卡滞感</li>
              <li>局部应力集中，加速磨损</li>
              <li>配合面接触不均匀，影响自锁</li>
              <li>调音时手感沉重，难以精细调整</li>
            </ul>
            <p style={{ marginTop: '12px', color: '#fdcb6e' }}>建议：使用导向铰刀重新修整弦轴孔，确保同轴度在 0.05mm 以内</p>
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">湿度变化对配合的影响</h2>
          <span className={`status-badge status-${analysis.humidityEffect.riskLevel}`}>
            风险: {analysis.humidityEffect.riskLevel === 'low' ? '低' :
                   analysis.humidityEffect.riskLevel === 'medium' ? '中' : '高'}
          </span>
        </div>

        <div className="data-display">
          <div className="data-item">
            <div className="data-label">当前湿度</div>
            <div className="data-value">{humidity}%</div>
          </div>
          <div className="data-item">
            <div className="data-label">弦轴直径变化</div>
            <div className={`data-value ${Math.abs(analysis.humidityEffect.pegDiameterChange) > 0.02 ? 'value-warning' : ''}`}>
              {analysis.humidityEffect.pegDiameterChange > 0 ? '+' : ''}
              {analysis.humidityEffect.pegDiameterChange.toFixed(3)} <span className="data-unit">mm</span>
            </div>
          </div>
          <div className="data-item">
            <div className="data-label">孔直径变化</div>
            <div className="data-value">
              {analysis.humidityEffect.holeDiameterChange > 0 ? '+' : ''}
              {analysis.humidityEffect.holeDiameterChange.toFixed(3)} <span className="data-unit">mm</span>
            </div>
          </div>
          <div className="data-item">
            <div className="data-label">配合变化量</div>
            <div className={`data-value ${Math.abs(analysis.humidityEffect.fitChange) > 0.02 ? 'value-warning' : ''}`}>
              {analysis.humidityEffect.fitChange > 0 ? '+' : ''}
              {analysis.humidityEffect.fitChange.toFixed(3)} <span className="data-unit">mm</span>
            </div>
          </div>
          <div className="data-item">
            <div className="data-label">应力变化</div>
            <div className={`data-value ${analysis.humidityEffect.stressChange > 5 ? 'value-warning' : ''}`}>
              {analysis.humidityEffect.stressChange.toFixed(1)} <span className="data-unit">MPa</span>
            </div>
          </div>
        </div>

        <div className="humidity-chart">
          <h3 style={{ marginBottom: '16px', color: '#e94560' }}>湿度 20% - 80% 配合变化模拟</h3>
          <div className="humidity-bars">
            {humiditySweep.map((h, idx) => (
              <div key={idx} className="humidity-bar">
                <div
                  className={`bar-fill ${h.riskLevel}`}
                  style={{
                    height: `${Math.min(100, Math.abs(h.fitChange) * 1000)}%`,
                    minHeight: '10px',
                  }}
                />
                <div className="bar-label">{h.humidity}%</div>
                <div className="bar-label" style={{ color: getRiskLevelColor(h.riskLevel) }}>
                  {h.fitChange.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: '12px', fontSize: '12px', color: '#666', textAlign: 'center' }}>
            配合变化量 (mm) - 正值表示配合变紧，负值表示配合变松
          </div>
        </div>

        <div style={{ marginTop: '24px', padding: '16px', background: 'rgba(233, 69, 96, 0.1)', borderRadius: '8px' }}>
          <h4 style={{ color: '#e94560', marginBottom: '12px' }}>💧 湿度控制建议</h4>
          <ul style={{ color: '#a0a0a0', paddingLeft: '20px' }}>
            <li>最佳环境湿度范围：40% - 50%</li>
            <li>使用加湿器或除湿器维持稳定湿度</li>
            <li>避免将乐器放置在空调出风口或暖气附近</li>
            <li>湿度剧变季节应加强检查配合状态</li>
            <li>配合过紧时可适当降低湿度，过松时适当增加湿度</li>
          </ul>
        </div>
      </div>

      {analysis.warnings.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">⚠️ 警告信息</h2>
          </div>
          <ul className="recommendation-list">
            {analysis.warnings.map((warning, idx) => (
              <li key={idx} className="warning">{warning}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default TuningStabilityPage;
