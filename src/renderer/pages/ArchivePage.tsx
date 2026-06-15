import React, { useState, useEffect } from 'react';
import { InstrumentArchive, PegRecord, MaintenanceRecord, RiskAlert } from '../../shared/types';
import { archiveService, pegService } from '../services/ipcService';
import { calculateTaperFit, generateRiskAlerts } from '../../shared/calculationEngine';

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
                          background: 'rgba(0, 0, 0, 0.2)',
                          borderRadius: '8px',
                          marginBottom: '8px',
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span style={{ fontWeight: 'bold', color: '#e94560' }}>
                              {record.type === 'fitting' ? '配合修整' :
                               record.type === 'replacement' ? '更换弦轴' :
                               record.type === 'adjustment' ? '调整' : '其他'}
                            </span>
                            <span style={{ color: '#a0a0a0', fontSize: '13px' }}>
                              {record.date} · {record.technician}
                            </span>
                          </div>
                          <p style={{ color: '#a0a0a0', fontSize: '13px' }}>{record.description}</p>
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
    </div>
  );
};

export default ArchivePage;
