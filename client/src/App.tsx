import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import DashboardPage from './pages/DashboardPage';
// import TasksPage from './pages/TasksPage';
import SettingsPage from './pages/SettingsPage';
import './App.css';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          {/* <Route path="/tasks" element={<TasksPage />} /> */}
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/sessions" element={<DashboardPage />} />
          <Route path="/session/:chatId" element={<DashboardPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
