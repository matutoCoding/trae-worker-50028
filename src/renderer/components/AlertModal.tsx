import React from 'react';
import { RiskAlert } from '../../shared/types';

interface AlertModalProps {
  alerts: RiskAlert[];
  onClose: () => void;
  onAcknowledge: (alertId: string) => void;
  onClear: (alertId: string) => void;
}

const AlertModal: React.FC<AlertModalProps> = ({ alerts, onClose, onAcknowledge, onClear }) => {
  const getAlertIcon = (type: RiskAlert['type']) => {
    switch (type) {
      case 'slippage': return '⚠️';
      case 'binding': return '🔧';
      case 'humidity': return '💧';
      case 'wear': return '📉';
      default: return '⚠️';
    }
  };

  const unacknowledgedAlerts = alerts.filter(a => !a.acknowledged);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">风险预警中心</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        {unacknowledgedAlerts.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">✅</div>
            <p>暂无未处理的风险预警</p>
          </div>
        ) : (
          <div>
            {unacknowledgedAlerts.map(alert => (
              <div key={alert.id} className={`alert-item ${alert.severity}`}>
                <span className="alert-icon">{getAlertIcon(alert.type)}</span>
                <div className="alert-content">
                  <div className="alert-title">
                    <span className={`status-badge status-${alert.severity}`}>
                      {alert.severity === 'critical' ? '严重' :
                       alert.severity === 'high' ? '高' :
                       alert.severity === 'medium' ? '中' : '低'}
                    </span>
                    {' '}乐器 #{alert.instrumentId}
                  </div>
                  <div className="alert-message">{alert.message}</div>
                  <div className="alert-message" style={{ marginTop: '8px', color: '#e94560' }}>
                    建议：{alert.recommendation}
                  </div>
                  <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                    <button
                      className="btn btn-success btn-sm"
                      onClick={() => onAcknowledge(alert.id)}
                    >
                      ✓ 已知晓
                    </button>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => onClear(alert.id)}
                    >
                      清除
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AlertModal;
