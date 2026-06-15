import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LibraryItem, RiskAlert, StringTension } from '../../shared/types';
import { libraryService } from '../services/ipcService';
import { MATERIAL_DATABASE, STANDARD_LIBRARY, calculateTaper } from '../../shared/calculationEngine';
import { useAppContext } from '../context/AppContext';

interface LibraryPageProps {
  onAddAlert: (alert: RiskAlert) => void;
}

const LibraryPage: React.FC<LibraryPageProps> = ({ onAddAlert }) => {
  const navigate = useNavigate();
  const { applyLibraryPreset } = useAppContext();
  const [libraryItems, setLibraryItems] = useState<LibraryItem[]>([]);
  const [filterType, setFilterType] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<LibraryItem | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [instrumentType, setInstrumentType] = useState('violin');
  const [description, setDescription] = useState('');
  const [materialId, setMaterialId] = useState(MATERIAL_DATABASE[0].id);
  const [pegSmall, setPegSmall] = useState(7.8);
  const [pegLarge, setPegLarge] = useState(8.6);
  const [pegLength, setPegLength] = useState(24.0);
  const [holeSmall, setHoleSmall] = useState(7.78);
  const [holeLarge, setHoleLarge] = useState(8.58);
  const [holeDepth, setHoleDepth] = useState(23.5);
  const [recommendedTaper, setRecommendedTaper] = useState(1 / 30);
  const [optimalInterference, setOptimalInterference] = useState(0.04);
  const [notes, setNotes] = useState('');

  const [stringTensions, setStringTensions] = useState<StringTension[]>([
    { stringName: 'G', tension: 35, frequency: 196, diameter: 0.8 },
    { stringName: 'D', tension: 32, frequency: 293.66, diameter: 0.7 },
    { stringName: 'A', tension: 30, frequency: 440, diameter: 0.6 },
    { stringName: 'E', tension: 28, frequency: 659.26, diameter: 0.3 },
  ]);

  useEffect(() => {
    loadLibrary();
  }, []);

  const loadLibrary = async () => {
    try {
      const items = await libraryService.find();
      if (items.length === 0) {
        for (const std of STANDARD_LIBRARY) {
          await libraryService.create(std);
        }
        const newItems = await libraryService.find();
        setLibraryItems(newItems);
      } else {
        setLibraryItems(items);
      }
    } catch (error) {
      console.error('Failed to load library:', error);
    }
  };

  const filteredItems = filterType === 'all'
    ? libraryItems
    : libraryItems.filter(item => item.instrumentType === filterType);

  const handleCreateItem = async () => {
    const material = MATERIAL_DATABASE.find(m => m.id === materialId)!;
    const pegTaper = calculateTaper(pegSmall, pegLarge, pegLength);
    const holeTaper = calculateTaper(holeSmall, holeLarge, holeDepth);

    const item: Omit<LibraryItem, '_id'> = {
      name,
      instrumentType,
      description,
      pegSpecifications: {
        material,
        dimensions: {
          smallEndDiameter: pegSmall,
          largeEndDiameter: pegLarge,
          length: pegLength,
          taper: pegTaper,
        },
        holeDimensions: {
          smallEndDiameter: holeSmall,
          largeEndDiameter: holeLarge,
          depth: holeDepth,
          taper: holeTaper,
          concentricity: 0.02,
        },
      },
      stringTensions: [...stringTensions],
      recommendedTaper,
      optimalInterference,
      notes,
      isStandard: false,
    };

    try {
      await libraryService.create(item);
      setShowCreateModal(false);
      resetForm();
      loadLibrary();
    } catch (error) {
      console.error('Failed to create library item:', error);
    }
  };

  const resetForm = () => {
    setName('');
    setInstrumentType('violin');
    setDescription('');
    setMaterialId(MATERIAL_DATABASE[0].id);
    setPegSmall(7.8);
    setPegLarge(8.6);
    setPegLength(24.0);
    setHoleSmall(7.78);
    setHoleLarge(8.58);
    setHoleDepth(23.5);
    setRecommendedTaper(1 / 30);
    setOptimalInterference(0.04);
    setNotes('');
    setStringTensions([
      { stringName: 'G', tension: 35, frequency: 196, diameter: 0.8 },
      { stringName: 'D', tension: 32, frequency: 293.66, diameter: 0.7 },
      { stringName: 'A', tension: 30, frequency: 440, diameter: 0.6 },
      { stringName: 'E', tension: 28, frequency: 659.26, diameter: 0.3 },
    ]);
  };

  const handleDeleteItem = async (id: string) => {
    if (confirm('确定要删除这个工艺方案吗？')) {
      try {
        await libraryService.remove(id);
        loadLibrary();
      } catch (error) {
        console.error('Failed to delete item:', error);
      }
    }
  };

  const handleApplyToInput = (item: LibraryItem) => {
    applyLibraryPreset(item);
    navigate('/');
  };

  const updateStringTension = (index: number, field: keyof StringTension, value: string | number) => {
    setStringTensions(prev => {
      const newTensions = [...prev];
      newTensions[index] = { ...newTensions[index], [field]: value };
      return newTensions;
    });
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

  return (
    <div className="page">
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">工艺库管理</h2>
          <div className="btn-group">
            <select
              className="form-select"
              style={{ width: '150px' }}
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
            >
              <option value="all">全部类型</option>
              <option value="violin">小提琴</option>
              <option value="viola">中提琴</option>
              <option value="cello">大提琴</option>
              <option value="bass">低音提琴</option>
            </select>
            <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
              + 新建方案
            </button>
          </div>
        </div>
        <p className="section-subtitle">
          存储不同乐器的标准弦轴配合方案，作为生产和维修的参考标准
        </p>
      </div>

      <div className="card">
        <div className="data-display">
          <div className="data-item">
            <div className="data-label">总方案数</div>
            <div className="data-value">{libraryItems.length}</div>
          </div>
          <div className="data-item">
            <div className="data-label">标准方案</div>
            <div className="data-value value-good">{libraryItems.filter(i => i.isStandard).length}</div>
          </div>
          <div className="data-item">
            <div className="data-label">自定义方案</div>
            <div className="data-value">{libraryItems.filter(i => !i.isStandard).length}</div>
          </div>
          <div className="data-item">
            <div className="data-label">当前筛选</div>
            <div className="data-value value-highlight">{getInstrumentTypeText(filterType)}</div>
          </div>
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">📚</div>
            <p>暂无符合条件的工艺方案</p>
          </div>
        </div>
      ) : (
        filteredItems.map(item => (
          <div key={item._id} className="card">
            <div
              className="accordion-header"
              onClick={() => setExpandedId(expandedId === item._id ? null : item._id)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span className={`chevron ${expandedId === item._id ? 'open' : ''}`}>▼</span>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#fff' }}>
                      {item.name}
                    </span>
                    {item.isStandard && (
                      <span className="status-badge status-good">标准方案</span>
                    )}
                  </div>
                  <div style={{ fontSize: '13px', color: '#a0a0a0', marginTop: '4px' }}>
                    {getInstrumentTypeText(item.instrumentType)} | {item.description}
                  </div>
                </div>
              </div>
              <span className="status-badge status-good">
                锥度 1:{(1 / item.recommendedTaper).toFixed(1)}
              </span>
            </div>

            {expandedId === item._id && (
              <div className="accordion-content">
                <div className="data-display" style={{ marginBottom: '24px' }}>
                  <div className="data-item">
                    <div className="data-label">推荐材质</div>
                    <div className="data-value">{item.pegSpecifications.material.name}</div>
                  </div>
                  <div className="data-item">
                    <div className="data-label">弦轴小头</div>
                    <div className="data-value">{item.pegSpecifications.dimensions.smallEndDiameter} mm</div>
                  </div>
                  <div className="data-item">
                    <div className="data-label">弦轴大头</div>
                    <div className="data-value">{item.pegSpecifications.dimensions.largeEndDiameter} mm</div>
                  </div>
                  <div className="data-item">
                    <div className="data-label">弦轴长度</div>
                    <div className="data-value">{item.pegSpecifications.dimensions.length} mm</div>
                  </div>
                  <div className="data-item">
                    <div className="data-label">孔小头</div>
                    <div className="data-value">{item.pegSpecifications.holeDimensions.smallEndDiameter} mm</div>
                  </div>
                  <div className="data-item">
                    <div className="data-label">孔大头</div>
                    <div className="data-value">{item.pegSpecifications.holeDimensions.largeEndDiameter} mm</div>
                  </div>
                  <div className="data-item">
                    <div className="data-label">推荐锥度</div>
                    <div className="data-value value-highlight">1:{(1 / item.recommendedTaper).toFixed(1)}</div>
                  </div>
                  <div className="data-item">
                    <div className="data-label">最佳过盈量</div>
                    <div className="data-value value-good">{item.optimalInterference.toFixed(3)} mm</div>
                  </div>
                </div>

                <h3 style={{ color: '#e94560', marginBottom: '16px' }}>各弦张力参数</h3>
                <table className="table">
                  <thead>
                    <tr>
                      <th>弦名</th>
                      <th>张力 (N)</th>
                      <th>频率 (Hz)</th>
                      <th>弦直径 (mm)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {item.stringTensions.map((st, idx) => (
                      <tr key={idx}>
                        <td>{st.stringName}</td>
                        <td>{st.tension}</td>
                        <td>{st.frequency}</td>
                        <td>{st.diameter}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {item.notes && (
                  <div style={{ marginTop: '24px' }}>
                    <h3 style={{ color: '#e94560', marginBottom: '12px' }}>备注说明</h3>
                    <p style={{ color: '#a0a0a0', padding: '12px 16px', background: 'rgba(0, 0, 0, 0.2)', borderRadius: '8px' }}>
                      {item.notes}
                    </p>
                  </div>
                )}

                <div className="btn-group" style={{ marginTop: '24px' }}>
                  <button className="btn btn-primary btn-sm" onClick={() => handleApplyToInput(item)}>
                    ✏️ 应用到录入页
                  </button>
                  {!item.isStandard && (
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => item._id && handleDeleteItem(item._id)}
                    >
                      🗑️ 删除方案
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))
      )}

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" style={{ maxWidth: '900px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">新建工艺方案</h2>
              <button className="close-btn" onClick={() => setShowCreateModal(false)}>×</button>
            </div>

            <div className="card" style={{ background: 'rgba(0, 0, 0, 0.2)', border: 'none' }}>
              <h3 className="card-title">基本信息</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">方案名称</label>
                  <input
                    className="form-input"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="如：4/4小提琴G弦标准方案"
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
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">描述</label>
                  <input
                    className="form-input"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="简单描述此方案的适用场景"
                  />
                </div>
              </div>
            </div>

            <div className="card" style={{ background: 'rgba(0, 0, 0, 0.2)', border: 'none' }}>
              <h3 className="card-title">弦轴规格</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">弦轴材质</label>
                  <select
                    className="form-select"
                    value={materialId}
                    onChange={e => setMaterialId(e.target.value)}
                  >
                    {MATERIAL_DATABASE.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
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
                  <label className="form-label">推荐锥度 (1/X)</label>
                  <input
                    type="number"
                    step="0.5"
                    className="form-input"
                    value={1 / recommendedTaper}
                    onChange={e => setRecommendedTaper(1 / Number(e.target.value))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">最佳过盈量 (mm)</label>
                  <input
                    type="number"
                    step="0.001"
                    className="form-input"
                    value={optimalInterference}
                    onChange={e => setOptimalInterference(Number(e.target.value))}
                  />
                </div>
              </div>
            </div>

            <div className="card" style={{ background: 'rgba(0, 0, 0, 0.2)', border: 'none' }}>
              <h3 className="card-title">各弦张力参数</h3>
              <div className="form-grid">
                {['G', 'D', 'A', 'E'].map((stringName, idx) => (
                  <div key={stringName} style={{
                    gridColumn: '1 / -1',
                    display: 'grid',
                    gridTemplateColumns: '80px 1fr 1fr 1fr',
                    gap: '12px',
                    alignItems: 'end',
                  }}>
                    <div className="form-group">
                      <label className="form-label">弦名</label>
                      <div className="data-value">{stringName}</div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">张力 (N)</label>
                      <input
                        type="number"
                        step="0.5"
                        className="form-input"
                        value={stringTensions[idx]?.tension || 30}
                        onChange={e => updateStringTension(idx, 'tension', Number(e.target.value))}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">频率 (Hz)</label>
                      <input
                        type="number"
                        step="0.01"
                        className="form-input"
                        value={stringTensions[idx]?.frequency || 440}
                        onChange={e => updateStringTension(idx, 'frequency', Number(e.target.value))}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">弦直径 (mm)</label>
                      <input
                        type="number"
                        step="0.01"
                        className="form-input"
                        value={stringTensions[idx]?.diameter || 0.6}
                        onChange={e => updateStringTension(idx, 'diameter', Number(e.target.value))}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card" style={{ background: 'rgba(0, 0, 0, 0.2)', border: 'none' }}>
              <div className="form-group">
                <label className="form-label">备注</label>
                <textarea
                  className="form-textarea"
                  rows={2}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
              </div>
            </div>

            <div className="btn-group" style={{ marginTop: '24px', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                取消
              </button>
              <button className="btn btn-primary" onClick={handleCreateItem}>
                创建方案
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LibraryPage;
