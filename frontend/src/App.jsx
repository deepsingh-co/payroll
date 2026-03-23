import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import Teams from './pages/Teams';
import Tasks from './pages/Tasks';
import Payroll from './pages/Payroll';
import Leaves from './pages/Leaves';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/employees" element={<Employees />} />
            <Route path="/teams" element={<Teams />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/payroll" element={<Payroll />} />
            <Route path="/leaves" element={<Leaves />} />
          </Route>
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
