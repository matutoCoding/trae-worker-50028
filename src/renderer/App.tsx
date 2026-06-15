import React, { useState, useEffect } from 'react';
import { Routes, Route, NavLink, useLocation } from 'react-router-dom';
import PegInputPage from './pages/PegInputPage';
import TaperFitPage from './pages/TaperFitPage';
import TuningStabilityPage from './pages/TuningStabilityPage';
import ArchivePage from './pages/ArchivePage';
import LibraryPage from './pages/LibraryPage';
import AlertModal from './components/AlertModal';
import { RiskAlert } from '../shared/types';
import { AppProvider } from './context/AppContext';

const App: React.FC = () => {
  const [alerts, setAlerts] = useState<RiskAlert[]>([]);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const location = useLocation();

  const navItems = [
    { path: '/', icon: '📏', label: '弦轴录入' },
    { path: '/taper-fit', icon: '⚙️', label: '锥度配合' },
    { path: '/tuning-stability', icon: '🎵', label: '调音稳定' },
    { path: '/archive', icon: '📁', label: '工艺档案' },
    { path: '/library', icon: '📚', label: '工艺库' },
  ];

  const pageTitles: Record<string, string> = {
    '/': '弦轴录入 - 录入弦轴箱孔锥度、材质与弦的张力',
    '/taper-fit': '锥度配合 - 摩擦自锁原理计算与配合分析',
    '/tuning-stability': '调音稳定 - 扭矩计算与握持稳定性分析',
    '/archive': '工艺档案 - 每件乐器的弦轴配合记录',
    '/library': '工艺库 - 不同乐器的弦轴方案库',
  };

  const addAlert = (alert: RiskAlert) => {
    setAlerts(prev => {
      const exists = prev.some(a => a.id === alert.id);
      if (!exists) {
        return [...prev, alert];
      }
      return prev;
    });
  };

  const clearAlert = (alertId: string) => {
    setAlerts(prev => prev.filter(a => a.id !== alertId));
  };

  const acknowledgeAlert = (alertId: string) => {
    setAlerts(prev =>
      prev.map(a => (a.id === alertId ? { ...a, acknowledged: true } : a))
    );
  };

  const criticalAlerts = alerts.filter(a => a.severity === 'critical' && !a.acknowledged);

  return (
    <AppProvider>
      <div className="app-container">
        <aside className="sidebar">
          <div className="logo">
            <span className="logo-icon">🎻</span>
            <span className="logo-text">弦轴配合系统</span>
          </div>
          <nav className="nav-menu">
            {navItems.map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `nav-item ${isActive ? 'active' : ''}`
                }
              >
                <span className="nav-icon">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </aside>

        <main className="main-content">
          <header className="topbar">
            <h1 className="page-title">{pageTitles[location.pathname] || '弦轴配合系统'}</h1>
            {criticalAlerts.length > 0 && (
              <button className="btn btn-danger btn-sm" onClick={() => setShowAlertModal(true)}>
                ⚠️ {criticalAlerts.length} 个风险预警
              </button>
            )}
          </header>

          <div className="content-area">
            <Routes>
              <Route
                path="/"
                element={<PegInputPage onAddAlert={addAlert} />}
              />
              <Route
                path="/taper-fit"
                element={<TaperFitPage onAddAlert={addAlert} />}
              />
              <Route
                path="/tuning-stability"
                element={<TuningStabilityPage onAddAlert={addAlert} />}
              />
              <Route
                path="/archive"
                element={<ArchivePage onAddAlert={addAlert} />}
              />
              <Route
                path="/library"
                element={<LibraryPage onAddAlert={addAlert} />}
              />
            </Routes>
          </div>
        </main>

        {showAlertModal && (
          <AlertModal
            alerts={alerts}
            onClose={() => setShowAlertModal(false)}
            onAcknowledge={acknowledgeAlert}
            onClear={clearAlert}
          />
        )}
      </div>
    </AppProvider>
  );
};

export default App;
