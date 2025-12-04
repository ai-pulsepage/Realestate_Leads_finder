import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import PublicLayout from './layouts/PublicLayout';
import InvestorLayout from './layouts/InvestorLayout';
import ProviderLayout from './layouts/ProviderLayout';
import Search from './pages/investor/Search';
import Dashboard from './pages/investor/Dashboard';
import Leads from './pages/provider/Leads';

// Placeholder Pages
const Home = () => <div className="p-8 text-center"><h1 className="text-4xl font-bold mb-4">Welcome to BizLeadFinders</h1><p className="text-xl text-gray-600">The ultimate platform for Real Estate Investors and Service Providers.</p></div>;
const ProviderDashboard = () => <div><h2 className="text-2xl font-bold mb-4">Provider Dashboard</h2><p>Welcome back, Pro.</p></div>;

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<PublicLayout />}>
          <Route index element={<Home />} />
          <Route path="login" element={<div className="p-8">Login Page</div>} />
          <Route path="signup" element={<div className="p-8">Signup Page</div>} />
        </Route>

        {/* Investor Routes */}
        <Route path="/investor" element={<InvestorLayout />}>
          <Route index element={<Navigate to="/investor/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="search" element={<Search />} />
          <Route path="campaigns" element={<div>Campaigns</div>} />
          <Route path="calculator" element={<div>Flipping Calculator</div>} />
        </Route>

        {/* Provider Routes */}
        <Route path="/provider" element={<ProviderLayout />}>
          <Route index element={<Navigate to="/provider/dashboard" replace />} />
          <Route path="dashboard" element={<ProviderDashboard />} />
          <Route path="leads" element={<Leads />} />
          <Route path="bids" element={<div>My Bids</div>} />
          <Route path="profile" element={<div>Profile Settings</div>} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
