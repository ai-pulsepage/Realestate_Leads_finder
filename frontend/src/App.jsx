import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import PublicLayout from './layouts/PublicLayout';
import InvestorLayout from './layouts/InvestorLayout';
import ProviderLayout from './layouts/ProviderLayout';
import Search from './pages/investor/Search';
import Dashboard from './pages/investor/Dashboard';
import ProjectBoard from './pages/provider/ProjectBoard';
import MyBids from './pages/provider/MyBids';
import ToolsSettings from './pages/provider/ToolsSettings';
import Leads from './pages/provider/Leads';
import ProviderDashboard from './pages/provider/Dashboard';
import Marketing from './pages/provider/Marketing';
import Profile from './pages/provider/Profile';
import Waitlist from './pages/Waitlist';
import LandingPageRevised from './pages/LandingPageRevised';
import Login from './pages/Login';
import Signup from './pages/Signup';
import FSBO from './pages/investor/FSBO';

// Placeholder Pages
const Home = () => (
  <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8">
    <div className="max-w-4xl w-full text-center space-y-8">
      <div>
        <h1 className="text-5xl font-extrabold text-gray-900 mb-4">
          Welcome to <span className="text-blue-600">BizLeadFinders</span>
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          The ultimate platform connecting Real Estate Investors, Service Providers, and Homeowners with data-driven insights.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mt-12">
        {/* Investor Card */}
        <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow border border-gray-100">
          <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">For Investors</h2>
          <p className="text-gray-600 mb-6">
            Find distressed properties, vacant land, and high-equity deals before they hit the market.
          </p>
          <a
            href="/investor/search"
            className="inline-block w-full py-3 px-6 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Find Deals &rarr;
          </a>
        </div>

        {/* Provider Card */}
        <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow border border-gray-100">
          <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">For Service Providers</h2>
          <p className="text-gray-600 mb-6">
            Connect with new homeowners and get exclusive leads for your contracting business.
          </p>
          <a
            href="/provider/leads"
            className="inline-block w-full py-3 px-6 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
          >
            Get Leads &rarr;
          </a>
        </div>
      </div>

      <div className="mt-12 text-sm text-gray-500">
        &copy; 2025 BizLeadFinders. All rights reserved.
      </div>
    </div>
  </div>
);


function App() {
  // Subdomain Routing Logic
  const hostname = window.location.hostname;
  const isAppSubdomain = hostname.startsWith('app.');

  return (
    <Router>
      <Routes>
        {/* 
            DOMAIN BASED ROUTING WRAPPER 
            If on root/www and path is /, show LandingPageRevised (Waitlist V2).
            If on app., show Home (User Selection Page).
        */}

        {/* Root Route Handlers */}
        <Route path="/" element={
          !isAppSubdomain ? <LandingPageRevised /> : <Home />
        } />

        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* Investor Routes */}
        <Route path="/investor" element={<InvestorLayout />}>
          <Route index element={<Navigate to="/investor/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="search" element={<Search />} />
          <Route path="fsbo" element={<FSBO />} />
          <Route path="campaigns" element={<div>Campaigns</div>} />
          <Route path="marketing" element={<Marketing />} />
          <Route path="tools" element={<ToolsSettings />} />
          <Route path="calculator" element={<div>Flipping Calculator</div>} />
        </Route>

        {/* Provider Routes */}
        <Route path="/provider" element={<ProviderLayout />}>
          <Route index element={<Navigate to="/provider/dashboard" replace />} />
          <Route path="dashboard" element={<ProviderDashboard />} />
          <Route path="leads" element={<Leads />} />
          <Route path="projects" element={<ProjectBoard />} />
          <Route path="bids" element={<MyBids />} />
          <Route path="tools" element={<ToolsSettings />} />
          <Route path="marketing" element={<Marketing />} />
          <Route path="profile" element={<Profile />} />
        </Route>

        {/* Explicit Waitlist Route (Accessible from anywhere if needed, or just root) */}
        <Route path="/waitlist" element={<Waitlist />} />
      </Routes>
    </Router>
  );
}

export default App;
