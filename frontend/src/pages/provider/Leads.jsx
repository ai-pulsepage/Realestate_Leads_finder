```
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
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">New Homeowner Leads</h1>
              <p className="mt-2 text-gray-600">
                Recently sold properties - potential service opportunities
              </p>
            </div>

            {/* Timeframe selector */}
            <div className="flex items-center space-x-4 bg-white p-2 rounded-lg shadow-sm border border-gray-200">
              <label className="text-sm font-medium text-gray-700 pl-2">Sold in:</label>
              <select
                value={timeframe}
                onChange={(e) => setTimeframe(parseInt(e.target.value))}
                className="px-3 py-1.5 border-none bg-gray-50 rounded-md text-sm font-medium text-gray-900 focus:ring-2 focus:ring-blue-500 cursor-pointer"
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
                <span className="font-medium bg-green-100 text-green-800 py-1 px-3 rounded-full text-xs">
                    Found {leads.length} new homeowners
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-500">Finding new homeowners...</p>
          </div>
        ) : error ? (
          <div className="text-center py-20 bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="text-red-500 text-5xl mb-4">⚠️</div>
            <div className="text-gray-900 text-lg font-medium mb-2">Error Loading Leads</div>
            <div className="text-gray-600 max-w-md mx-auto mb-6">{error}</div>
            <button
              onClick={loadLeads}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              Try Again
            </button>
          </div>
        ) : leads.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="text-gray-300 text-6xl mb-4">🏠</div>
            <h3 className="text-lg font-medium text-gray-900">No recent sales found</h3>
            <div className="text-gray-500 text-sm mt-2">
              Try expanding your timeframe to see more results.
            </div>
          </div>
        ) : (
          <>
            {/* Stats Bar */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-1">{leads.length}</div>
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Leads</div>
                </div>
                <div className="text-center border-l border-gray-100">
                  <div className="text-3xl font-bold text-green-600 mb-1">
                    {leads.filter(lead => lead.assessed_value && lead.assessed_value > 300000).length}
                  </div>
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">High Value ($300k+)</div>
                </div>
                <div className="text-center border-l border-gray-100">
                  <div className="text-3xl font-bold text-purple-600 mb-1">
                    {leads.filter(lead => lead.year_built && lead.year_built < 1990).length}
                  </div>
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Older Homes</div>
                </div>
                <div className="text-center border-l border-gray-100">
                  <div className="text-3xl font-bold text-orange-600 mb-1">
                    ${Math.round(leads.reduce((sum, lead) => sum + (lead.last_sale_price || 0), 0) / leads.length / 1000)}k
                  </div>
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Price</div>
                </div>
              </div>
            </div>

            {/* Leads Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {leads.map((lead, index) => (
                <div key={lead.property_id || index} className="relative group">
                  <PropertyCard
                    property={lead}
                    onClick={handlePropertyClick}
                  />

                  {/* Sale Date Badge */}
                  <div className="absolute top-3 right-3 shadow-sm">
                    <div className="bg-green-500 text-white text-xs px-2 py-1 rounded-md font-bold uppercase tracking-wide">
                      Sold {new Date(lead.last_sale_date).toLocaleDateString()}
                    </div>
                  </div>

                  {/* Quick Actions Overlay */}
                  <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-b-xl flex gap-2">
                    <button className="flex-1 bg-white text-gray-900 text-sm font-medium py-2 rounded-lg hover:bg-gray-100 transition-colors">
                      Contact
                    </button>
                    <button className="flex-1 bg-blue-600 text-white text-sm font-medium py-2 rounded-lg hover:bg-blue-700 transition-colors">
                      Save Lead
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Load More (if needed) */}
            {leads.length >= 50 && (
              <div className="text-center mt-12">
                <button className="px-8 py-3 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors shadow-sm">
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
```