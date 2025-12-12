import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import PublicLayout from './layouts/PublicLayout';
import InvestorLayout from './layouts/InvestorLayout';
import ProviderLayout from './layouts/ProviderLayout';
import AdminLayout from './layouts/AdminLayout';
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
import FlipCalculator from './pages/investor/FlipCalculator';
import AdminDashboard from './pages/admin/Dashboard';
import AdminReferrers from './pages/admin/Referrers';
import DataImport from './pages/admin/DataImport';

// ============================================================
// AUTH HELPER - Check if user is logged in
// ============================================================
const isAuthenticated = () => {
  const token = localStorage.getItem('authToken');
  return !!token;
};

const getUser = () => {
  const userStr = localStorage.getItem('user');
  if (userStr) {
    try {
      return JSON.parse(userStr);
    } catch (e) {
      return null;
    }
  }
  return null;
};

// ============================================================
// PRIVATE ROUTE - Redirects to login if not authenticated
// ============================================================
const PrivateRoute = ({ children }) => {
  const location = useLocation();

  if (!isAuthenticated()) {
    // Redirect to login, but save the attempted URL
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

// ============================================================
// HOME PAGE - For app. subdomain with login/signup buttons
// ============================================================
const Home = () => {
  const navigate = useNavigate();
  const user = getUser();

  // If already logged in, redirect to appropriate dashboard
  useEffect(() => {
    if (user) {
      const role = user.subscription_tier || user.role;
      if (role === 'investor') {
        navigate('/investor/dashboard');
      } else if (role === 'provider') {
        navigate('/provider/dashboard');
      }
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex flex-col items-center justify-center p-8">
      <div className="max-w-4xl w-full text-center space-y-8">

        {/* Logo / Brand */}
        <div className="mb-8">
          <h1 className="text-5xl font-extrabold text-white mb-4">
            Welcome to <span className="bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">BizLeadFinders</span>
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            The ultimate platform connecting Real Estate Investors and Service Providers with data-driven leads.
          </p>
        </div>

        {/* Auth Buttons */}
        <div className="flex justify-center gap-4 mb-12">
          <a
            href="/login"
            className="px-8 py-3 bg-white text-slate-900 rounded-lg font-semibold hover:bg-slate-100 transition-colors shadow-lg"
          >
            Sign In
          </a>
          <a
            href="/signup"
            className="px-8 py-3 bg-gradient-to-r from-blue-600 to-emerald-600 text-white rounded-lg font-semibold hover:from-blue-500 hover:to-emerald-500 transition-all shadow-lg"
          >
            Create Account
          </a>
        </div>

        {/* Role Selection Cards */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Investor Card */}
          <div className="bg-white/10 backdrop-blur-lg p-8 rounded-2xl border border-white/20 hover:border-blue-400/50 transition-all">
            <div className="h-14 w-14 bg-blue-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">For Investors</h2>
            <p className="text-slate-300 mb-6">
              Find distressed properties, analyze deals with our Flip Calculator, and connect with motivated sellers.
            </p>
            <a
              href="/signup?role=investor"
              className="inline-block w-full py-3 px-6 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-500 transition-colors"
            >
              Start as Investor →
            </a>
          </div>

          {/* Provider Card */}
          <div className="bg-white/10 backdrop-blur-lg p-8 rounded-2xl border border-white/20 hover:border-emerald-400/50 transition-all">
            <div className="h-14 w-14 bg-emerald-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">For Service Providers</h2>
            <p className="text-slate-300 mb-6">
              Get exclusive leads from new homeowners, automate your calls with AI, and grow your business.
            </p>
            <a
              href="/signup?role=provider"
              className="inline-block w-full py-3 px-6 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-500 transition-colors"
            >
              Start as Provider →
            </a>
          </div>
        </div>

        <div className="mt-12 text-sm text-slate-500">
          © 2025 BizLeadFinders. All rights reserved.
        </div>
      </div>
    </div>
  );
};

// ============================================================
// MAIN APP COMPONENT
// ============================================================
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

        {/* Investor Routes - PROTECTED */}
        <Route path="/investor" element={
          <PrivateRoute>
            <InvestorLayout />
          </PrivateRoute>
        }>
          <Route index element={<Navigate to="/investor/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="search" element={<Search />} />
          <Route path="fsbo" element={<FSBO />} />
          <Route path="campaigns" element={<div className="p-8 text-center text-gray-500">Campaigns - Coming Soon</div>} />
          <Route path="marketing" element={<Marketing />} />
          <Route path="tools" element={<ToolsSettings />} />
          <Route path="calculator" element={<FlipCalculator />} />
        </Route>

        {/* Provider Routes - PROTECTED */}
        <Route path="/provider" element={
          <PrivateRoute>
            <ProviderLayout />
          </PrivateRoute>
        }>
          <Route index element={<Navigate to="/provider/dashboard" replace />} />
          <Route path="dashboard" element={<ProviderDashboard />} />
          <Route path="leads" element={<Leads />} />
          <Route path="projects" element={<ProjectBoard />} />
          <Route path="bids" element={<MyBids />} />
          <Route path="tools" element={<ToolsSettings />} />
          <Route path="marketing" element={<Marketing />} />
          <Route path="profile" element={<Profile />} />
        </Route>

        {/* Admin Routes - PROTECTED */}
        <Route path="/admin" element={
          <PrivateRoute>
            <AdminLayout />
          </PrivateRoute>
        }>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="referrers" element={<AdminReferrers />} />
          <Route path="referrers/:id" element={<AdminReferrers />} />
          <Route path="coupons" element={<div className="p-8 text-center text-gray-500">Coupons - Coming Soon</div>} />
          <Route path="commissions" element={<div className="p-8 text-center text-gray-500">Commissions - Coming Soon</div>} />
          <Route path="analytics" element={<div className="p-8 text-center text-gray-500">Analytics - Coming Soon</div>} />
          <Route path="settings" element={<div className="p-8 text-center text-gray-500">Settings - Coming Soon</div>} />
          <Route path="data-import" element={<DataImport />} />
        </Route>

        {/* Explicit Waitlist Route (Accessible from anywhere if needed, or just root) */}
        <Route path="/waitlist" element={<Waitlist />} />
      </Routes>
    </Router>
  );
}

export default App;
