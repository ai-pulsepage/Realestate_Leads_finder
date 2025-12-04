import React, { useState, useEffect } from 'react';
import PropertyCard from '../../components/PropertyCard';
import { propertiesApi } from '../../api/properties';

/**
 * Provider Leads Page - Shows recently sold properties for service providers
 */
const Leads = () => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeframe, setTimeframe] = useState(6); // months

  useEffect(() => {
    loadLeads();
  }, [timeframe]);

  const loadLeads = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get recent sales using the API helper
      const recentSales = await propertiesApi.getRecentSales(timeframe);
      setLeads(recentSales);
    } catch (err) {
      console.error('Error loading leads:', err);
      setError('Failed to load recent leads. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePropertyClick = (property) => {
    // Navigate to property detail or contact form (to be implemented)
    console.log('Lead clicked:', property);
    // For now, just log. Later this could open a contact modal or detail view
  };

  const timeframeOptions = [
    { value: 3, label: 'Last 3 Months' },
    { value: 6, label: 'Last 6 Months' },
    { value: 12, label: 'Last 12 Months' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">New Homeowner Leads</h1>
              <p className="mt-2 text-gray-600">
                Recently sold properties - potential service opportunities
              </p>
            </div>

            {/* Timeframe selector */}
            <div className="flex items-center space-x-4">
              <label className="text-sm font-medium text-gray-700">Timeframe:</label>
              <select
                value={timeframe}
                onChange={(e) => setTimeframe(parseInt(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {timeframeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Results summary */}
          <div className="mt-4">
            <div className="text-sm text-gray-600">
              {loading ? (
                'Loading recent leads...'
              ) : error ? (
                <span className="text-red-600">{error}</span>
              ) : (
                `Found ${leads.length} recently sold propert${leads.length === 1 ? 'y' : 'ies'}`
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <div className="text-red-600 text-lg mb-2">Error Loading Leads</div>
            <div className="text-gray-600">{error}</div>
            <button
              onClick={loadLeads}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        ) : leads.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-500 text-lg">No recent sales found</div>
            <div className="text-gray-400 text-sm mt-2">
              Try expanding your timeframe or check back later
            </div>
          </div>
        ) : (
          <>
            {/* Stats Bar */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{leads.length}</div>
                  <div className="text-sm text-gray-600">Recent Sales</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {leads.filter(lead => lead.assessed_value && lead.assessed_value > 300000).length}
                  </div>
                  <div className="text-sm text-gray-600">High-Value ($300K+)</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {leads.filter(lead => lead.year_built && lead.year_built < 1990).length}
                  </div>
                  <div className="text-sm text-gray-600">Older Homes (Pre-1990)</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {Math.round(leads.reduce((sum, lead) => sum + (lead.last_sale_price || 0), 0) / leads.length / 1000) * 1000}
                  </div>
                  <div className="text-sm text-gray-600">Avg Sale Price</div>
                </div>
              </div>
            </div>

            {/* Leads Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {leads.map((lead, index) => (
                <div key={lead.property_id || index} className="relative">
                  <PropertyCard
                    property={lead}
                    onClick={handlePropertyClick}
                  />

                  {/* Sale Date Badge */}
                  <div className="absolute top-2 right-2">
                    <div className="bg-green-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                      Sold {new Date(lead.last_sale_date).toLocaleDateString()}
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="absolute bottom-2 left-2 right-2 flex space-x-2">
                    <button className="flex-1 bg-blue-600 text-white text-xs py-1 px-2 rounded hover:bg-blue-700 transition-colors">
                      Contact
                    </button>
                    <button className="flex-1 bg-green-600 text-white text-xs py-1 px-2 rounded hover:bg-green-700 transition-colors">
                      Bid
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Load More (if needed) */}
            {leads.length >= 50 && (
              <div className="text-center mt-8">
                <button className="px-6 py-3 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors">
                  Load More Leads
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Leads;