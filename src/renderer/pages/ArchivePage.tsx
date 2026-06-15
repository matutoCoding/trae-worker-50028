import React, { useState, useEffect } from 'react';
import { InstrumentArchive, PegRecord, MaintenanceRecord, RiskAlert, RecheckResult, RecheckReport, PegDimensions, PegBoxHoleDimensions, PegMaterial, StringTension } from '../../shared/types';
import { archiveService, pegService } from '../services/ipcService';
import { calculateTaperFit, generateRiskAlerts, calculateTaper, calculateTuningStability, MATERIAL_DATABASE } from '../../shared/calculationEngine';

interface ArchivePageProps {
  onAddAlert: (alert: RiskAlert) => void;
}

const ArchivePage: React.FC<ArchivePageProps> = ({ onAddAlert }) => {
  const [archives, setArchives] = useState<InstrumentArchive[]>([]);
  const [pegRecords, setPegRecords] = useState<PegRecord[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedArchive, setSelectedArchive] = useState<InstrumentArchive | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [instrumentId, setInstrumentId] = useState('');
  const [instrumentType, setInstrumentType] = useState('violin');
  const [maker, setMaker] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [serialNumber, setSerialNumber] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [archiveData, pegData] = await Promise.all([
        archiveService.find(),
        pegService.find(),
      ]);
      setArchives(archiveData);
      setPegRecords(pegData);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const getInstrumentPegs = (archive: InstrumentArchive) => {
    return pegRecords.filter(p => archive.pegRecords.includes(p._id || ''));
  };

  const handleCreateArchive = async () => {
    const archive: Omit<InstrumentArchive, '_id'> = {
      instrumentId: instrumentId || `ARCH-${Date.now()}`,
      instrumentType,
      maker,
      model,
      year,
      serialNumber: serialNumber || undefined,
      pegRecords: [],
      setupDate: new Date().toISOString().split('T')[0],
      overallStatus: 'good',
      notes,
      history: [],
    };

    try {
      await archiveService.create(archive);
      setShowCreateModal(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Failed to create archive:', error);
    }
  };

  const resetForm = () => {
    setInstrumentId('');
    setInstrumentType('violin');
    setMaker('');
    setModel('');
    setYear(new Date().getFullYear());
    setSerialNumber('');
    setNotes('');
  };

  const handleAnalyzeArchive = (archive: InstrumentArchive) => {
    const pegs = getInstrumentPegs(archive);
    pegs.forEach(peg => {
      const analysis = calculateTaperFit(
        peg.pegDimensions,
        peg.holeDimensions,
        peg.pegMaterial,
        peg.stringTension
      );
      const stability = {
        bindingRisk: peg.holeDimensions.concentricity > 0.05,
        humidityEffect: { riskLevel: 'low' as const },
        overallStability: 'good' as const,
      };
      const alerts = generateRiskAlerts(analysis, stability as any, archive.instrumentId);
      alerts.forEach(alert => onAddAlert(alert));
    });
  };

  const handleDeleteArchive = async (id: string) => {
    if (confirm('确定要删除这份工艺档案吗？相关的弦轴记录不会被删除。')) {
      try {
        await archiveService.remove(id);
        loadData();
      } catch (error) {
        console.error('Failed to delete archive:', error);
      }
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'excellent': return '优秀';
      case 'good': return '良好';
      case 'fair': return '一般';
      case 'poor': return '较差';
      default: return status;
    }
  };

  const getInstrumentTypeText = (type: string) => {
    switch (type) {
      case 'violin': return '小提琴';
      case 'viola': return '中提琴';
      case 'cello': return '大提琴';
      case 'bass': return '低音提琴';
      default: return type;
    }
  };

  const [addPegModal, setAddPegModal] = useState(false);
  const [selectedPegIds, setSelectedPegIds] = useState<string[]>([]);

  const [showRecheckModal, setShowRecheckModal] = useState(false);
  const [recheckArchive, setRecheckArchive] = useState<InstrumentArchive | null>(null);
  const [recheckTechnician, setRecheckTechnician] = useState('');
  const [recheckHumidity, setRecheckHumidity] = useState(45);
  const [recheckTemperature, setRecheckTemperature] = useState(22);
  const [recheckResults, setRecheckResults] = useState<Map<string, RecheckResult>>(new Map());
  const [recheckNotes, setRecheckNotes] = useState<Map<string, string>>(new Map());

  const handleAddPegs = async (archiveId: string) => {
    try {
      await archiveService.update(archiveId, {
        pegRecords: selectedPegIds,
      });
      setAddPegModal(false);
      setSelectedPegIds([]);
      loadData();
    } catch (error) {
      console.error('Failed to add pegs:', error);
    }
  };

  const togglePegSelection = (pegId: string) => {
    setSelectedPegIds(prev =>
      prev.includes(pegId)
        ? prev.filter(id => id !== pegId)
        : [...prev, pegId]
    );
  };

  const startRecheck = (archive: InstrumentArchive) => {
    setRecheckArchive(archive);
    setRecheckTechnician('');
    setRecheckHumidity(45);
    setRecheckTemperature(22);
    setRecheckResults(new Map());
    setRecheckNotes(new Map());

    const pegs = getInstrumentPegs(archive);
    const initialResults = new Map<string, RecheckResult>();
    ['G', 'D', 'A', 'E'].forEach(stringName => {
      const existingPeg = pegs.find(p => p.stringName === stringName);
      if (existingPeg) {
        const pegDims = existingPeg.pegDimensions;
        const holeDims = existingPeg.holeDimensions;
        const material = existingPeg.pegMaterial;
        const st = existingPeg.stringTension;
        const analysis = calculateTaperFit(pegDims, holeDims, material, st);
        const interference = (
          (pegDims.smallEndDiameter + pegDims.largeEndDiameter) / 2 -
          (holeDims.smallEndDiameter + holeDims.largeEndDiameter) / 2
        );
        initialResults.set(stringName, {
          stringName,
          taper: pegDims.taper,
          interference,
          concentricity: holeDims.concentricity,
          humidity: 45,
          fitStatus: analysis.fitStatus,
          isSelfLocking: analysis.isSelfLocking,
          slipRisk: analysis.slipRisk,
          bindingRisk: holeDims.concentricity > 0.05,
        });
      } else {
        initialResults.set(stringName, {
          stringName,
          taper: 1 / 30,
          interference: 0.04,
          concentricity: 0.02,
          humidity: 45,
          fitStatus: 'optimal',
          isSelfLocking: true,
          slipRisk: 'low',
          bindingRisk: false,
        });
      }
    });
    setRecheckResults(initialResults);
    setShowRecheckModal(true);
  };

  const updateRecheckResult = (stringName: string, field: keyof RecheckResult, value: number | string | boolean) => {
    setRecheckResults(prev => {
      const newResults = new Map(prev);
      const existing = newResults.get(stringName);
      if (existing) {
        const updated = { ...existing, [field]: value };
        if (field === 'taper' || field === 'interference' || field === 'concentricity') {
          const pegTaper = (field === 'taper') ? Number(value) : existing.taper;
          const interference = (field === 'interference') ? Number(value) : existing.interference;
          const concentricity = (field === 'concentricity') ? Number(value) : existing.concentricity;
          const material = MATERIAL_DATABASE[0];
          const st: StringTension = { stringName, tension: 32, frequency: 440, diameter: 0.6 };
          const pegDims: PegDimensions = {
            smallEndDiameter: 7.8,
            largeEndDiameter: 7.8 + pegTaper * 24,
            length: 24,
            taper: pegTaper,
          };
          const holeDims: PegBoxHoleDimensions = {
            smallEndDiameter: 7.8 - interference + (pegTaper * 24) / 2,
            largeEndDiameter: 7.8 + pegTaper * 24 - interference - (pegTaper * 24) / 2,
            depth: 23.5,
            taper: pegTaper,
            concentricity,
          };
          const analysis = calculateTaperFit(pegDims, holeDims, material, st);
          updated.fitStatus = analysis.fitStatus;
          updated.isSelfLocking = analysis.isSelfLocking;
          updated.slipRisk = analysis.slipRisk;
          updated.bindingRisk = concentricity > 0.05;
        }
        newResults.set(stringName, updated);
      }
      return newResults;
    });
  };

  const updateRecheckNote = (stringName: string, note: string) => {
    setRecheckNotes(prev => {
      const newNotes = new Map(prev);
      newNotes.set(stringName, note);
      return newNotes;
    });
  };

  const saveRecheckReport = async () => {
    if (!recheckArchive || !recheckTechnician.trim()) {
      alert('请填写复检技师姓名');
      return;
    }

    const results: RecheckResult[] = [];
    recheckResults.forEach((r, stringName) => {
      results.push({ ...r, notes: recheckNotes.get(stringName) });
    });

    const hasProblems = results.some(r =>
      r.fitStatus !== 'optimal' ||
      !r.isSelfLocking ||
      r.slipRisk !== 'low' ||
      r.bindingRisk
    );
    const allExcellent = results.every(r =>
      r.fitStatus === 'optimal' &&
      r.isSelfLocking &&
      r.slipRisk === 'low' &&
      !r.bindingRisk
    );

    let overallConclusion: string;
    const recommendations: string[] = [];

    if (allExcellent) {
      overallConclusion = '全部四根弦轴配合状态优秀，自锁良好，无回滑风险，无需修整';
    } else if (!hasProblems) {
      overallConclusion = '整体配合状态良好，满足使用要求，建议定期复检';
    } else {
      overallConclusion = '存在配合问题，建议根据下方建议进行修整';
      results.forEach(r => {
        if (r.fitStatus === 'too_loose') {
          recommendations.push(`${r.stringName}弦：配合过松 (过盈量 ${r.interference.toFixed(3)}mm)，建议更换较粗弦轴或使用弦轴膏`);
        }
        if (r.fitStatus === 'too_tight') {
          recommendations.push(`${r.stringName}弦：配合过紧 (过盈量 ${r.interference.toFixed(3)}mm)，建议使用铰刀扩孔`);
        }
        if (!r.isSelfLocking) {
          recommendations.push(`${r.stringName}弦：锥度过大不满足自锁，必须修整锥度`);
        }
        if (r.slipRisk === 'high') {
          recommendations.push(`${r.stringName}弦：回滑风险高，需立即处理`);
        }
        if (r.bindingRisk) {
          recommendations.push(`${r.stringName}弦：同轴度偏差 ${r.concentricity.toFixed(3)}mm 过大，存在别劲风险，建议重新铰孔`);
        }
      });
    }

    if (recheckHumidity < 35 || recheckHumidity > 55) {
      recommendations.push(`当前环境湿度 ${recheckHumidity}% 偏离最佳范围(40-50%)，建议控制环境湿度后再复检`);
    }

    const report: RecheckReport = {
      date: new Date().toISOString().split('T')[0],
      technician: recheckTechnician,
      instrumentId: recheckArchive.instrumentId,
      ambientHumidity: recheckHumidity,
      ambientTemperature: recheckTemperature,
      results,
      overallConclusion,
      recommendations,
    };

    const maintenanceRecord: MaintenanceRecord = {
      date: report.date,
      type: 'recheck',
      technician: recheckTechnician,
      description: `工艺复检：${overallConclusion}。发现 ${results.filter(r => r.fitStatus !== 'optimal' || !r.isSelfLocking || r.slipRisk !== 'low' || r.bindingRisk).length} 项需关注。${recommendations.length > 0 ? recommendations.join('；') : ''}`,
      recheckReport: report,
    };

    try {
      await archiveService.update(recheckArchive._id!, {
        history: [...recheckArchive.history, maintenanceRecord],
        lastMaintenanceDate: report.date,
      });
      setShowRecheckModal(false);
      alert('复检报告已保存，已追加到维护历史');
      loadData();
    } catch (error) {
      console.error('保存复检报告失败:', error);
      alert('保存失败，请重试');
    }
  };

  return (
    <div className="page">
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">工艺档案管理</h2>
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            + 新建档案
          </button>
        </div>
        <p className="section-subtitle">
          记录每件乐器的弦轴配合工艺，建立完整的制作档案
        </p>
      </div>

      {archives.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">📁</div>
            <p>暂无工艺档案</p>
            <p style={{ fontSize: '13px', marginTop: '8px' }}>
              点击上方"新建档案"按钮创建第一件乐器的工艺档案
            </p>
          </div>
        </div>
      ) : (
        archives.map(archive => {
          const pegs = getInstrumentPegs(archive);
          const hasRisk = pegs.some(p => {
            const interference = (
              (p.pegDimensions.smallEndDiameter + p.pegDimensions.largeEndDiameter) / 2 -
              (p.holeDimensions.smallEndDiameter + p.holeDimensions.largeEndDiameter) / 2
            );
            return interference < 0.02 || interference > 0.06;
          });

          return (
            <div key={archive._id} className="card">
              <div
                className="accordion-header"
                onClick={() => setExpandedId(expandedId === archive._id ? null : archive._id)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <span className={`chevron ${expandedId === archive._id ? 'open' : ''}`}>▼</span>
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#fff' }}>
                      {archive.maker} - {getInstrumentTypeText(archive.instrumentType)} {archive.model}
                    </div>
                    <div style={{ fontSize: '13px', color: '#a0a0a0', marginTop: '4px' }}>
                      编号: {archive.instrumentId} | {archive.year}年制 | 弦轴记录: {pegs.length}条
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {hasRisk && (
                    <span className="status-badge status-critical">⚠️ 有风险</span>
                  )}
                  <span className={`status-badge status-${archive.overallStatus}`}>
                    {getStatusText(archive.overallStatus)}
                  </span>
                </div>
              </div>

              {expandedId === archive._id && (
                <div className="accordion-content">
                  <div className="data-display" style={{ marginBottom: '24px' }}>
                    <div className="data-item">
                      <div className="data-label">乐器编号</div>
                      <div className="data-value">{archive.instrumentId}</div>
                    </div>
                    <div className="data-item">
                      <div className="data-label">乐器类型</div>
                      <div className="data-value">{getInstrumentTypeText(archive.instrumentType)}</div>
                    </div>
                    <div className="data-item">
                      <div className="data-label">制琴师</div>
                      <div className="data-value">{archive.maker}</div>
                    </div>
                    <div className="data-item">
                      <div className="data-label">型号</div>
                      <div className="data-value">{archive.model || '-'}</div>
                    </div>
                    <div className="data-item">
                      <div className="data-label">年份</div>
                      <div className="data-value">{archive.year}</div>
                    </div>
                    <div className="data-item">
                      <div className="data-label">序列号</div>
                      <div className="data-value">{archive.serialNumber || '-'}</div>
                    </div>
                    <div className="data-item">
                      <div className="data-label">装配日期</div>
                      <div className="data-value">{archive.setupDate}</div>
                    </div>
                    <div className="data-item">
                      <div className="data-label">最后维护</div>
                      <div className="data-value">{archive.lastMaintenanceDate || '-'}</div>
                    </div>
                  </div>

                  {pegs.length > 0 && (
                    <div style={{ marginBottom: '24px' }}>
                      <h3 style={{ color: '#e94560', marginBottom: '16px' }}>弦轴配合记录</h3>
                      <table className="table">
                        <thead>
                          <tr>
                            <th>弦位</th>
                            <th>材质</th>
                            <th>弦轴锥度</th>
                            <th>孔锥度</th>
                            <th>过盈量</th>
                            <th>张力</th>
                            <th>配合质量</th>
                            <th>日期</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pegs.map(peg => {
                            const interference = (
                              (peg.pegDimensions.smallEndDiameter + peg.pegDimensions.largeEndDiameter) / 2 -
                              (peg.holeDimensions.smallEndDiameter + peg.holeDimensions.largeEndDiameter) / 2
                            );
                            const isBad = interference < 0.02 || interference > 0.06;
                            return (
                              <tr key={peg._id} className={isBad ? 'row-error' : ''}>
                                <td>{peg.stringName}</td>
                                <td>{peg.pegMaterial.name}</td>
                                <td>1:{(1 / peg.pegDimensions.taper).toFixed(1)}</td>
                                <td>1:{(1 / peg.holeDimensions.taper).toFixed(1)}</td>
                                <td className={isBad ? 'value-danger' : ''}>
                                  {interference.toFixed(3)} mm
                                </td>
                                <td>{peg.stringTension.tension} N</td>
                                <td>
                                  <span className={`status-badge status-${peg.fitQuality}`}>
                                    {getStatusText(peg.fitQuality)}
                                  </span>
                                </td>
                                <td>{peg.date}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {archive.history.length > 0 && (
                    <div style={{ marginBottom: '24px' }}>
                      <h3 style={{ color: '#e94560', marginBottom: '16px' }}>维护历史</h3>
                      {archive.history.map((record, idx) => (
                        <div key={idx} style={{
                          padding: '12px 16px',
                          background: record.type === 'recheck' ? 'rgba(0, 176, 255, 0.08)' : 'rgba(0, 0, 0, 0.2)',
                          borderRadius: '8px',
                          marginBottom: '8px',
                          borderLeft: record.type === 'recheck' ? '4px solid #00b0ff' : 'none',
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span style={{ fontWeight: 'bold', color: record.type === 'recheck' ? '#00b0ff' : '#e94560' }}>
                              {record.type === 'fitting' ? '配合修整' :
                               record.type === 'replacement' ? '更换弦轴' :
                               record.type === 'adjustment' ? '调整' :
                               record.type === 'recheck' ? '🔬 工艺复检' : '其他'}
                            </span>
                            <span style={{ color: '#a0a0a0', fontSize: '13px' }}>
                              {record.date} · {record.technician}
                            </span>
                          </div>
                          <p style={{ color: '#a0a0a0', fontSize: '13px' }}>{record.description}</p>
                          {record.recheckReport && (
                            <div style={{ marginTop: '12px', padding: '12px', background: 'rgba(0, 0, 0, 0.2)', borderRadius: '6px', fontSize: '12px' }}>
                              <div style={{ color: '#ccc', marginBottom: '8px' }}>
                                <strong>复检报告</strong> · 环境 {record.recheckReport.ambientHumidity}%RH / {record.recheckReport.ambientTemperature}°C
                              </div>
                              <table style={{ width: '100%', fontSize: '12px', color: '#a0a0a0' }}>
                                <thead>
                                  <tr style={{ borderBottom: '1px solid #333' }}>
                                    <th style={{ textAlign: 'left', padding: '4px' }}>弦位</th>
                                    <th style={{ textAlign: 'left', padding: '4px' }}>锥度</th>
                                    <th style={{ textAlign: 'left', padding: '4px' }}>过盈量</th>
                                    <th style={{ textAlign: 'left', padding: '4px' }}>同轴度</th>
                                    <th style={{ textAlign: 'left', padding: '4px' }}>状态</th>
                                    <th style={{ textAlign: 'left', padding: '4px' }}>自锁</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {record.recheckReport.results.map((r, i) => (
                                    <tr key={i} style={{ borderBottom: '1px solid #222' }}>
                                      <td style={{ padding: '4px' }}>{r.stringName}</td>
                                      <td style={{ padding: '4px' }}>1:{(1 / r.taper).toFixed(1)}</td>
                                      <td style={{ padding: '4px', color: r.interference < 0.02 || r.interference > 0.06 ? '#ff6b6b' : '#00b894' }}>{r.interference.toFixed(3)}mm</td>
                                      <td style={{ padding: '4px', color: r.concentricity > 0.05 ? '#ff6b6b' : '#00b894' }}>{r.concentricity.toFixed(3)}mm</td>
                                      <td style={{ padding: '4px', color: r.fitStatus === 'optimal' ? '#00b894' : '#ff6b6b' }}>
                                        {r.fitStatus === 'optimal' ? '良好' : r.fitStatus === 'too_tight' ? '过紧' : '过松'}
                                      </td>
                                      <td style={{ padding: '4px', color: r.isSelfLocking ? '#00b894' : '#ff6b6b' }}>
                                        {r.isSelfLocking ? '✓' : '✗'}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                              <div style={{ marginTop: '8px', color: '#fdcb6e' }}>
                                <strong>结论：</strong>{record.recheckReport.overallConclusion}
                              </div>
                              {record.recheckReport.recommendations.length > 0 && (
                                <div style={{ marginTop: '8px', color: '#fdcb6e' }}>
                                  <strong>建议：</strong>
                                  <ul style={{ margin: '4px 0 0 20px', padding: 0 }}>
                                    {record.recheckReport.recommendations.map((rec, ri) => (
                                      <li key={ri}>{rec}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {archive.notes && (
                    <div style={{ marginBottom: '24px' }}>
                      <h3 style={{ color: '#e94560', marginBottom: '12px' }}>备注</h3>
                      <p style={{ color: '#a0a0a0', padding: '12px 16px', background: 'rgba(0, 0, 0, 0.2)', borderRadius: '8px' }}>
                        {archive.notes}
                      </p>
                    </div>
                  )}

                  <div className="btn-group">
                    <button className="btn btn-primary btn-sm" onClick={() => handleAnalyzeArchive(archive)}>
                      🔍 风险分析
                    </button>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => startRecheck(archive)}
                    >
                      🔬 工艺复检
                    </button>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        setSelectedArchive(archive);
                        setSelectedPegIds(archive.pegRecords);
                        setAddPegModal(true);
                      }}
                    >
                      📎 关联弦轴记录
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => archive._id && handleDeleteArchive(archive._id)}
                    >
                      🗑️ 删除档案
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">新建工艺档案</h2>
              <button className="close-btn" onClick={() => setShowCreateModal(false)}>×</button>
            </div>
            <div className="form-grid">
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
                <label className="form-label">乐器类型</label>
                <select
                  className="form-select"
                  value={instrumentType}
                  onChange={e => setInstrumentType(e.target.value)}
                >
                  <option value="violin">小提琴</option>
                  <option value="viola">中提琴</option>
                  <option value="cello">大提琴</option>
                  <option value="bass">低音提琴</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">制琴师</label>
                <input
                  className="form-input"
                  value={maker}
                  onChange={e => setMaker(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">型号</label>
                <input
                  className="form-input"
                  placeholder="如：4/4 标准型"
                  value={model}
                  onChange={e => setModel(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">制作年份</label>
                <input
                  type="number"
                  className="form-input"
                  value={year}
                  onChange={e => setYear(Number(e.target.value))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">序列号</label>
                <input
                  className="form-input"
                  value={serialNumber}
                  onChange={e => setSerialNumber(e.target.value)}
                />
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">备注</label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
              </div>
            </div>
            <div className="btn-group" style={{ marginTop: '24px', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                取消
              </button>
              <button className="btn btn-primary" onClick={handleCreateArchive}>
                创建档案
              </button>
            </div>
          </div>
        </div>
      )}

      {addPegModal && selectedArchive && (
        <div className="modal-overlay" onClick={() => setAddPegModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">关联弦轴记录</h2>
              <button className="close-btn" onClick={() => setAddPegModal(false)}>×</button>
            </div>
            <p className="section-subtitle">选择要关联到此档案的弦轴记录</p>
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {pegRecords.filter(p => p.instrumentId === selectedArchive.instrumentId).length === 0 ? (
                <p style={{ color: '#666', textAlign: 'center', padding: '40px' }}>
                  暂无该乐器的弦轴记录，请先在"弦轴录入"页面创建
                </p>
              ) : (
                pegRecords
                  .filter(p => p.instrumentId === selectedArchive.instrumentId)
                  .map(peg => (
                    <div
                      key={peg._id}
                      style={{
                        padding: '12px',
                        marginBottom: '8px',
                        background: selectedPegIds.includes(peg._id || '')
                          ? 'rgba(233, 69, 96, 0.2)'
                          : 'rgba(0, 0, 0, 0.2)',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        border: selectedPegIds.includes(peg._id || '')
                          ? '1px solid #e94560'
                          : '1px solid transparent',
                      }}
                      onClick={() => peg._id && togglePegSelection(peg._id)}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>{peg.stringName}弦 - {peg.pegMaterial.name}</span>
                        <span style={{ color: selectedPegIds.includes(peg._id || '') ? '#e94560' : '#666' }}>
                          {selectedPegIds.includes(peg._id || '') ? '✓ 已选' : '点击选择'}
                        </span>
                      </div>
                    </div>
                  ))
              )}
            </div>
            <div className="btn-group" style={{ marginTop: '24px', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setAddPegModal(false)}>
                取消
              </button>
              <button
                className="btn btn-primary"
                onClick={() => selectedArchive._id && handleAddPegs(selectedArchive._id)}
              >
                确认关联
              </button>
            </div>
          </div>
        </div>
      )}

      {showRecheckModal && recheckArchive && (
        <div className="modal-overlay" onClick={() => setShowRecheckModal(false)}>
          <div className="modal" style={{ maxWidth: '1000px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">🔬 工艺复检 - {recheckArchive.maker} - {getInstrumentTypeText(recheckArchive.instrumentType)} {recheckArchive.model}</h2>
              <button className="close-btn" onClick={() => setShowRecheckModal(false)}>×</button>
            </div>

            <div className="card" style={{ background: 'rgba(0, 0, 0, 0.2)', border: 'none' }}>
              <h3 className="card-title">复检环境信息</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">复检技师</label>
                  <input
                    className="form-input"
                    value={recheckTechnician}
                    onChange={e => setRecheckTechnician(e.target.value)}
                    placeholder="请输入技师姓名"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">环境湿度 (%)</label>
                  <input
                    type="number"
                    className="form-input"
                    min="20"
                    max="80"
                    value={recheckHumidity}
                    onChange={e => setRecheckHumidity(Number(e.target.value))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">环境温度 (°C)</label>
                  <input
                    type="number"
                    className="form-input"
                    min="10"
                    max="40"
                    value={recheckTemperature}
                    onChange={e => setRecheckTemperature(Number(e.target.value))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">乐器编号</label>
                  <div className="data-value">{recheckArchive.instrumentId}</div>
                </div>
              </div>
            </div>

            <h3 style={{ color: '#e94560', marginTop: '20px', marginBottom: '12px' }}>四根弦轴逐项复测</h3>
            <p className="section-subtitle">
              逐项测量并录入每根弦轴的当前参数，系统会自动判定配合状态
            </p>

            {['G', 'D', 'A', 'E'].map(stringName => {
              const r = recheckResults.get(stringName);
              if (!r) return null;
              const hasProblem = r.fitStatus !== 'optimal' || !r.isSelfLocking || r.slipRisk !== 'low' || r.bindingRisk;
              return (
                <div
                  key={stringName}
                  className="card"
                  style={{
                    background: hasProblem ? 'rgba(255, 107, 107, 0.05)' : 'rgba(0, 0, 0, 0.2)',
                    border: hasProblem ? '1px solid #ff6b6b' : 'none',
                    marginBottom: '16px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 className="card-title" style={{ margin: 0 }}>
                      {stringName}弦
                      {hasProblem && <span style={{ color: '#ff6b6b', marginLeft: '12px', fontSize: '14px' }}>⚠️ 有问题</span>}
                    </h3>
                    <span className={`status-badge ${r.fitStatus === 'optimal' ? 'status-good' : 'status-critical'}`}>
                      {r.fitStatus === 'optimal' ? '配合良好' : r.fitStatus === 'too_tight' ? '配合过紧' : '配合过松'}
                    </span>
                  </div>
                  <div className="form-grid">
                    <div className="form-group">
                      <label className="form-label">弦轴锥度 (1:X)</label>
                      <input
                        type="number"
                        step="0.5"
                        className={`form-input ${Math.abs(r.taper - 1/30) > 0.002 ? 'value-danger' : ''}`}
                        value={1 / r.taper}
                        onChange={e => updateRecheckResult(stringName, 'taper', 1 / Number(e.target.value))}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">过盈量 (mm)</label>
                      <input
                        type="number"
                        step="0.001"
                        className={`form-input ${r.interference < 0.02 || r.interference > 0.06 ? 'value-danger' : ''}`}
                        value={r.interference}
                        onChange={e => updateRecheckResult(stringName, 'interference', Number(e.target.value))}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">同轴度偏差 (mm)</label>
                      <input
                        type="number"
                        step="0.001"
                        className={`form-input ${r.concentricity > 0.05 ? 'value-danger' : ''}`}
                        value={r.concentricity}
                        onChange={e => updateRecheckResult(stringName, 'concentricity', Number(e.target.value))}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">局部湿度 (%)</label>
                      <input
                        type="number"
                        min="20"
                        max="80"
                        className="form-input"
                        value={r.humidity}
                        onChange={e => updateRecheckResult(stringName, 'humidity', Number(e.target.value))}
                      />
                    </div>
                  </div>
                  <div className="data-display" style={{ marginTop: '12px' }}>
                    <div className="data-item">
                      <div className="data-label">自锁条件</div>
                      <div className={`data-value ${r.isSelfLocking ? 'value-good' : 'value-danger'}`}>
                        {r.isSelfLocking ? '✓ 满足' : '✗ 不满足'}
                      </div>
                    </div>
                    <div className="data-item">
                      <div className="data-label">回滑风险</div>
                      <div className={`data-value ${r.slipRisk === 'low' ? 'value-good' : r.slipRisk === 'medium' ? 'value-warning' : 'value-danger'}`}>
                        {r.slipRisk === 'low' ? '低' : r.slipRisk === 'medium' ? '中' : '高'}
                      </div>
                    </div>
                    <div className="data-item">
                      <div className="data-label">别劲风险</div>
                      <div className={`data-value ${r.bindingRisk ? 'value-danger' : 'value-good'}`}>
                        {r.bindingRisk ? '有' : '无'}
                      </div>
                    </div>
                  </div>
                  <div className="form-group" style={{ marginTop: '12px' }}>
                    <label className="form-label">本弦位备注</label>
                    <input
                      className="form-input"
                      placeholder="记录异常情况、修整说明等"
                      value={recheckNotes.get(stringName) || ''}
                      onChange={e => updateRecheckNote(stringName, e.target.value)}
                    />
                  </div>
                </div>
              );
            })}

            <div className="btn-group" style={{ marginTop: '24px', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowRecheckModal(false)}>
                取消
              </button>
              <button className="btn btn-primary" onClick={saveRecheckReport}>
                💾 生成复检报告并保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ArchivePage;
