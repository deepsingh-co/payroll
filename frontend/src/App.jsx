import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import VerifyEmail from './pages/VerifyEmail';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import Teams from './pages/Teams';
import Tasks from './pages/Tasks';
import Payroll from './pages/Payroll';
import Leaves from './pages/Leaves';
import Attendance from './pages/Attendance';
import TeamWorkspace from './pages/TeamWorkspace';
import Progress from './pages/Progress';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/employees" element={<Employees />} />
            <Route path="/teams" element={<Teams />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/payroll" element={<Payroll />} />
            <Route path="/leaves" element={<Leaves />} />
            <Route path="/attendance" element={<Attendance />} />
            <Route path="/progress" element={<Progress />} />
            <Route path="/teams/:teamId" element={<TeamWorkspace />} />
          </Route>
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
