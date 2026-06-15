import React, { useState, useEffect } from 'react';
import { PegRecord, PegMaterial, PegDimensions, PegBoxHoleDimensions, StringTension, RiskAlert } from '../../shared/types';
import { MATERIAL_DATABASE, calculateTaper, calculateTaperFit, generateRiskAlerts } from '../../shared/calculationEngine';
import { pegService } from '../services/ipcService';

interface PegInputPageProps {
  onAddAlert: (alert: RiskAlert) => void;
}

const PegInputPage: React.FC<PegInputPageProps> = ({ onAddAlert }) => {
  const [instrumentType, setInstrumentType] = useState('violin');
  const [instrumentId, setInstrumentId] = useState('');
  const [maker, setMaker] = useState('');
  const [pegPosition, setPegPosition] = useState(1);
  const [stringName, setStringName] = useState('G');

  const [selectedMaterial, setSelectedMaterial] = useState<PegMaterial>(MATERIAL_DATABASE[0]);
  const [pegSmallDiameter, setPegSmallDiameter] = useState(7.8);
  const [pegLargeDiameter, setPegLargeDiameter] = useState(8.6);
  const [pegLength, setPegLength] = useState(24.0);

  const [holeSmallDiameter, setHoleSmallDiameter] = useState(7.78);
  const [holeLargeDiameter, setHoleLargeDiameter] = useState(8.58);
  const [holeDepth, setHoleDepth] = useState(23.5);
  const [concentricity, setConcentricity] = useState(0.02);

  const [tension, setTension] = useState(35);
  const [frequency, setFrequency] = useState(196);
  const [stringDiameter, setStringDiameter] = useState(0.8);

  const [notes, setNotes] = useState('');
  const [pegRecords, setPegRecords] = useState<PegRecord[]>([]);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    loadRecords();
  }, []);

  const loadRecords = async () => {
    try {
      const records = await pegService.find();
      setPegRecords(records);
    } catch (error) {
      console.error('Failed to load records:', error);
    }
  };

  const pegTaper = calculateTaper(pegSmallDiameter, pegLargeDiameter, pegLength);
  const holeTaper = calculateTaper(holeSmallDiameter, holeLargeDiameter, holeDepth);

  const pegDimensions: PegDimensions = {
    smallEndDiameter: pegSmallDiameter,
    largeEndDiameter: pegLargeDiameter,
    length: pegLength,
    taper: pegTaper,
  };

  const holeDimensions: PegBoxHoleDimensions = {
    smallEndDiameter: holeSmallDiameter,
    largeEndDiameter: holeLargeDiameter,
    depth: holeDepth,
    taper: holeTaper,
    concentricity,
  };

  const stringTension: StringTension = {
    stringName,
    tension,
    frequency,
    diameter: stringDiameter,
  };

  const handleSave = async () => {
    const pegRecord: Omit<PegRecord, '_id'> = {
      instrumentId: instrumentId || `INST-${Date.now()}`,
      instrumentType,
      maker,
      date: new Date().toISOString().split('T')[0],
      pegPosition,
      stringName,
      pegMaterial: selectedMaterial,
      pegDimensions,
      holeDimensions,
      stringTension,
      fitQuality: 'good',
      notes,
    };

    try {
      const saved = await pegService.create(pegRecord);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);

      const analysis = calculateTaperFit(pegDimensions, holeDimensions, selectedMaterial, stringTension);
      const stabilityAnalysis = {
        bindingRisk: concentricity > 0.05,
        humidityEffect: { riskLevel: 'low' as const },
        overallStability: 'good' as const,
      };
      const alerts = generateRiskAlerts(analysis, stabilityAnalysis as any, saved.instrumentId);
      alerts.forEach(alert => onAddAlert(alert));

      loadRecords();
    } catch (error) {
      console.error('Failed to save record:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('确定要删除这条记录吗？')) {
      try {
        await pegService.remove(id);
        loadRecords();
      } catch (error) {
        console.error('Failed to delete record:', error);
      }
    }
  };

  const handleAutoCalculate = () => {
    const analysis = calculateTaperFit(pegDimensions, holeDimensions, selectedMaterial, stringTension);
    const stabilityAnalysis = {
      bindingRisk: concentricity > 0.05,
      humidityEffect: { riskLevel: 'low' as const },
      overallStability: 'good' as const,
    };
    const alerts = generateRiskAlerts(analysis, stabilityAnalysis as any, instrumentId || 'preview');
    alerts.forEach(alert => onAddAlert(alert));
  };

  return (
    <div className="page">
      {saveSuccess && (
        <div style={{
          background: 'rgba(0, 184, 148, 0.2)',
          border: '1px solid #00b894',
          padding: '12px 20px',
          borderRadius: '8px',
          marginBottom: '24px',
          color: '#00b894',
        }}>
          ✓ 记录保存成功！
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">乐器基本信息</h2>
        </div>
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">乐器类型</label>
            <select className="form-select" value={instrumentType} onChange={e => setInstrumentType(e.target.value)}>
              <option value="violin">小提琴</option>
              <option value="viola">中提琴</option>
              <option value="cello">大提琴</option>
              <option value="bass">低音提琴</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">乐器编号</label>
            <input
              className="form-input"
              placeholder="自动生成或手动输入"
              value={instrumentId}
              onChange={e => setInstrumentId(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">制琴师</label>
            <input
              className="form-input"
              placeholder="输入制琴师姓名"
              value={maker}
              onChange={e => setMaker(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">弦轴位置 (1-4)</label>
            <input
              type="number"
              className="form-input"
              min="1"
              max="4"
              value={pegPosition}
              onChange={e => setPegPosition(Number(e.target.value))}
            />
          </div>
          <div className="form-group">
            <label className="form-label">弦名</label>
            <select className="form-select" value={stringName} onChange={e => setStringName(e.target.value)}>
              <option value="G">G弦</option>
              <option value="D">D弦</option>
              <option value="A">A弦</option>
              <option value="E">E弦</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">弦轴参数</h2>
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
                <option key={mat.id} value={mat.id}>
                  {mat.name} - {mat.description}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">小头直径 (mm)</label>
            <input
              type="number"
              step="0.01"
              className="form-input"
              value={pegSmallDiameter}
              onChange={e => setPegSmallDiameter(Number(e.target.value))}
            />
          </div>
          <div className="form-group">
            <label className="form-label">大头直径 (mm)</label>
            <input
              type="number"
              step="0.01"
              className="form-input"
              value={pegLargeDiameter}
              onChange={e => setPegLargeDiameter(Number(e.target.value))}
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
            <label className="form-label">计算锥度</label>
            <div className="data-value">
              1:{(1 / pegTaper).toFixed(2)}
              <span className="data-unit"> ({pegTaper.toFixed(4)})</span>
            </div>
          </div>
        </div>

        <div className="data-display">
          <div className="data-item">
            <div className="data-label">摩擦系数</div>
            <div className="data-value">{selectedMaterial.frictionCoefficient}</div>
          </div>
          <div className="data-item">
            <div className="data-label">胀缩系数</div>
            <div className="data-value">{selectedMaterial.swellingCoefficient}</div>
          </div>
          <div className="data-item">
            <div className="data-label">密度</div>
            <div className="data-value">{selectedMaterial.density} <span className="data-unit">g/cm³</span></div>
          </div>
          <div className="data-item">
            <div className="data-label">硬度</div>
            <div className="data-value">{selectedMaterial.hardness}</div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">弦轴箱孔参数</h2>
        </div>
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">孔小头直径 (mm)</label>
            <input
              type="number"
              step="0.01"
              className={`form-input ${Math.abs(holeSmallDiameter - pegSmallDiameter) > 0.03 ? 'value-danger' : ''}`}
              value={holeSmallDiameter}
              onChange={e => setHoleSmallDiameter(Number(e.target.value))}
            />
          </div>
          <div className="form-group">
            <label className="form-label">孔大头直径 (mm)</label>
            <input
              type="number"
              step="0.01"
              className={`form-input ${Math.abs(holeLargeDiameter - pegLargeDiameter) > 0.03 ? 'value-danger' : ''}`}
              value={holeLargeDiameter}
              onChange={e => setHoleLargeDiameter(Number(e.target.value))}
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
            <label className="form-label">计算孔锥度</label>
            <div className={`data-value ${Math.abs(pegTaper - holeTaper) > 0.002 ? 'value-danger' : ''}`}>
              1:{(1 / holeTaper).toFixed(2)}
              <span className="data-unit"> ({holeTaper.toFixed(4)})</span>
            </div>
          </div>
        </div>
        {Math.abs(pegTaper - holeTaper) > 0.002 && (
          <div style={{ marginTop: '16px', color: '#ff6b6b', fontSize: '13px' }}>
            ⚠️ 弦轴与孔的锥度差 {(Math.abs(pegTaper - holeTaper)).toFixed(4)} 超过允许范围 (0.002)，可能导致接触不良
          </div>
        )}
        {concentricity > 0.05 && (
          <div style={{ marginTop: '8px', color: '#ff6b6b', fontSize: '13px' }}>
            ⚠️ 同轴度偏差过大，可能导致弦轴别劲
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">琴弦张力参数</h2>
        </div>
        <div className="form-grid">
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
            <label className="form-label">标准频率 (Hz)</label>
            <input
              type="number"
              step="0.01"
              className="form-input"
              value={frequency}
              onChange={e => setFrequency(Number(e.target.value))}
            />
          </div>
          <div className="form-group">
            <label className="form-label">弦直径 (mm)</label>
            <input
              type="number"
              step="0.01"
              className="form-input"
              value={stringDiameter}
              onChange={e => setStringDiameter(Number(e.target.value))}
            />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="form-group">
          <label className="form-label">备注</label>
          <textarea
            className="form-textarea"
            rows={3}
            placeholder="记录特殊情况、调整历史等信息..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </div>
      </div>

      <div className="btn-group" style={{ marginBottom: '40px' }}>
        <button className="btn btn-primary" onClick={handleSave}>
          💾 保存记录
        </button>
        <button className="btn btn-secondary" onClick={handleAutoCalculate}>
          🔍 预览风险
        </button>
        <button className="btn btn-secondary" onClick={() => {
          setInstrumentId('');
          setMaker('');
          setNotes('');
        }}>
          🔄 清空表单
        </button>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">历史记录 ({pegRecords.length})</h2>
        </div>
        {pegRecords.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <p>暂无记录，请填写上方表单并保存</p>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>乐器编号</th>
                <th>类型</th>
                <th>弦位</th>
                <th>材质</th>
                <th>弦轴锥度</th>
                <th>孔锥度</th>
                <th>过盈量</th>
                <th>日期</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {pegRecords.map(record => {
                const interference = (
                  (record.pegDimensions.smallEndDiameter + record.pegDimensions.largeEndDiameter) / 2 -
                  (record.holeDimensions.smallEndDiameter + record.holeDimensions.largeEndDiameter) / 2
                );
                const isBad = interference < 0.02 || interference > 0.06;
                return (
                  <tr key={record._id} className={isBad ? 'row-error' : ''}>
                    <td>{record.instrumentId}</td>
                    <td>{record.instrumentType}</td>
                    <td>{record.stringName}</td>
                    <td>{record.pegMaterial.name}</td>
                    <td>1:{(1 / record.pegDimensions.taper).toFixed(1)}</td>
                    <td>1:{(1 / record.holeDimensions.taper).toFixed(1)}</td>
                    <td className={isBad ? 'value-danger' : 'value-good'}>
                      {interference.toFixed(3)} mm
                    </td>
                    <td>{record.date}</td>
                    <td>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => record._id && handleDelete(record._id)}
                      >
                        删除
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default PegInputPage;
