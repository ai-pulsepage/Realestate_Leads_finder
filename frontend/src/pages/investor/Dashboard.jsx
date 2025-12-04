import React, { useState, useEffect } from 'react';
import { propertiesApi } from '../../api/properties';

/**
 * Investor Dashboard - High-level stats and overview
 */
const Dashboard = () => {
  const [stats, setStats] = useState({
    totalProperties: 0,
    highEquityProperties: 0,
    distressedProperties: 0,
    averageEquity: 0,
    recentSales: 0,
    averagePropertyValue: 0,
    foreclosureCount: 0,
    taxLienCount: 0,
    vacantProperties: 0,
    olderHomes: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get all properties for analysis
      const allProperties = await propertiesApi.getProperties();

      // Calculate stats
      const totalProperties = allProperties.length;

      // High equity properties (>30% equity)
      const highEquityProperties = allProperties.filter(property => {
        if (!property.assessed_value) return false;
        const mortgage = property.mortgage_balance || 0;
        const equity = property.assessed_value - mortgage;
        const equityPercent = (equity / property.assessed_value) * 100;
        return equityPercent > 30;
      }).length;

      // Distressed properties (any distress flag)
      const distressedProperties = allProperties.filter(property =>
        property.is_foreclosure ||
        property.has_tax_lien ||
        property.has_code_violation ||
        property.is_vacant ||
        property.is_probate ||
        property.is_divorce ||
        property.is_heirship ||
        property.is_pre_foreclosure ||
        (property.distressed_score && property.distressed_score > 0)
      ).length;

      // Average equity percentage
      const propertiesWithEquity = allProperties.filter(p => p.assessed_value);
      const averageEquity = propertiesWithEquity.length > 0
        ? propertiesWithEquity.reduce((sum, property) => {
            const mortgage = property.mortgage_balance || 0;
            const equity = property.assessed_value - mortgage;
            const equityPercent = (equity / property.assessed_value) * 100;
            return sum + equityPercent;
          }, 0) / propertiesWithEquity.length
        : 0;

      // Recent sales (last 6 months)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const recentSales = allProperties.filter(property => {
        if (!property.last_sale_date) return false;
        const saleDate = new Date(property.last_sale_date);
        return saleDate >= sixMonthsAgo;
      }).length;

      // Average property value
      const propertiesWithValue = allProperties.filter(p => p.assessed_value);
      const averagePropertyValue = propertiesWithValue.length > 0
        ? propertiesWithValue.reduce((sum, p) => sum + p.assessed_value, 0) / propertiesWithValue.length
        : 0;

      // Detailed distress breakdown
      const foreclosureCount = allProperties.filter(p => p.is_foreclosure).length;
      const taxLienCount = allProperties.filter(p => p.has_tax_lien).length;
      const vacantProperties = allProperties.filter(p => p.is_vacant).length;
      const olderHomes = allProperties.filter(p => p.year_built && p.year_built < 1990).length;

      setStats({
        totalProperties,
        highEquityProperties,
        distressedProperties,
        averageEquity: Math.round(averageEquity * 10) / 10, // Round to 1 decimal
        recentSales,
        averagePropertyValue: Math.round(averagePropertyValue),
        foreclosureCount,
        taxLienCount,
        vacantProperties,
        olderHomes
      });
    } catch (err) {
      console.error('Error loading dashboard stats:', err);
      setError('Failed to load dashboard statistics');
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, subtitle, icon, color = 'blue' }) => {
    const colorClasses = {
      blue: 'bg-blue-500',
      green: 'bg-green-500',
      red: 'bg-red-500',
      yellow: 'bg-yellow-500',
      purple: 'bg-purple-500'
    };

    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center">
          <div className={`p-3 rounded-full ${colorClasses[color]} text-white`}>
            {icon}
          </div>
          <div className="ml-4">
            <h3 className="text-sm font-medium text-gray-500">{title}</h3>
            <div className="text-2xl font-bold text-gray-900">{value}</div>
            {subtitle && <p className="text-sm text-gray-600">{subtitle}</p>}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-lg mb-2">Error Loading Dashboard</div>
          <div className="text-gray-600 mb-4">{error}</div>
          <button
            onClick={loadDashboardStats}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Investor Dashboard</h1>
          <p className="mt-2 text-gray-600">
            Overview of your real estate investment opportunities
          </p>
        </div>

        {/* Primary Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Properties"
            value={stats.totalProperties.toLocaleString()}
            subtitle="In database"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            }
            color="blue"
          />

          <StatCard
            title="Average Property Value"
            value={`$${(stats.averagePropertyValue / 1000).toFixed(0)}K`}
            subtitle="Assessed value"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            }
            color="green"
          />

          <StatCard
            title="High Equity Properties"
            value={stats.highEquityProperties.toLocaleString()}
            subtitle=">30% equity"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            }
            color="green"
          />

          <StatCard
            title="Average Equity"
            value={`${stats.averageEquity}%`}
            subtitle="Across all properties"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            }
            color="purple"
          />
        </div>

        {/* Distress Analysis Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Distressed Properties"
            value={stats.distressedProperties.toLocaleString()}
            subtitle="Investment opportunities"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            }
            color="red"
          />

          <StatCard
            title="Foreclosure Properties"
            value={stats.foreclosureCount.toLocaleString()}
            subtitle="Active foreclosures"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            color="red"
          />

          <StatCard
            title="Tax Lien Properties"
            value={stats.taxLienCount.toLocaleString()}
            subtitle="Tax delinquent"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            }
            color="orange"
          />

          <StatCard
            title="Vacant Properties"
            value={stats.vacantProperties.toLocaleString()}
            subtitle="Opportunity potential"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            }
            color="yellow"
          />
        </div>

        {/* Market Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Recent Activity */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Market Activity</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-gray-200">
                <div>
                  <p className="text-sm font-medium text-gray-900">Recent Sales</p>
                  <p className="text-sm text-gray-600">Last 6 months</p>
                </div>
                <div className="text-2xl font-bold text-blue-600">{stats.recentSales}</div>
              </div>

              <div className="flex items-center justify-between py-3 border-b border-gray-200">
                <div>
                  <p className="text-sm font-medium text-gray-900">Older Homes</p>
                  <p className="text-sm text-gray-600">Built before 1990</p>
                </div>
                <div className="text-2xl font-bold text-purple-600">{stats.olderHomes}</div>
              </div>

              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">Total Opportunities</p>
                  <p className="text-sm text-gray-600">High equity + distressed</p>
                </div>
                <div className="text-2xl font-bold text-green-600">
                  {(stats.highEquityProperties + stats.distressedProperties).toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          {/* Investment Strategy Tips */}
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Investment Strategy</h2>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Focus on High Equity</p>
                  <p className="text-sm text-gray-600">{stats.highEquityProperties} properties with >30% equity for quick flips</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-red-500 rounded-full mt-2"></div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Target Distressed Assets</p>
                  <p className="text-sm text-gray-600">{stats.distressedProperties} properties with foreclosure/tax issues</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Monitor Recent Sales</p>
                  <p className="text-sm text-gray-600">{stats.recentSales} sales in last 6 months indicate active market</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Consider Rehab Opportunities</p>
                  <p className="text-sm text-gray-600">{stats.olderHomes} pre-1990 homes may need updates</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <a
              href="/investor/search"
              className="flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Search Properties
            </a>

            <button className="flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Create Campaign
            </button>

            <button className="flex items-center justify-center px-4 py-3 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              View Calculator
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;