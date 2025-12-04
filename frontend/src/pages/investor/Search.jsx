import React, { useState, useEffect } from 'react';
import FilterSidebar from '../../components/FilterSidebar';
import DataTable from '../../components/DataTable';
import { propertiesApi } from '../../api/properties';

/**
 * Investor Search Page - Main property search interface
 */
const Search = () => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({});
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Load properties based on filters
  const loadProperties = async (searchFilters = {}) => {
    try {
      setLoading(true);
      setError(null);

      // Convert frontend filter names to API parameter names
      const apiFilters = {
        ...searchFilters,
        // Convert minEquity from decimal to percentage for API
        minEquity: searchFilters.minEquity ? searchFilters.minEquity : undefined,
        // Keep other filters as-is
        maxYearBuilt: searchFilters.maxYearBuilt,
        distressType: searchFilters.distressType,
        property_type: searchFilters.property_type,
        zip_code: searchFilters.zip_code,
        county: searchFilters.county
      };

      // Remove undefined values
      Object.keys(apiFilters).forEach(key => {
        if (apiFilters[key] === undefined || apiFilters[key] === '') {
          delete apiFilters[key];
        }
      });

      const data = await propertiesApi.getProperties(apiFilters);
      setProperties(data);
    } catch (err) {
      console.error('Error loading properties:', err);
      setError('Failed to load properties. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Load initial properties on mount
  useEffect(() => {
    loadProperties();
  }, []);

  // Handle filter changes
  const handleFiltersChange = (newFilters) => {
    setFilters(newFilters);
    loadProperties(newFilters);
  };

  // Handle property selection
  const handlePropertyClick = (property) => {
    // Navigate to property detail page (to be implemented)
    console.log('Property clicked:', property);
    // For now, just log. Later this will navigate to detail view
  };

  // Table columns for potential table view
  const tableColumns = [
    { key: 'full_address', label: 'Address', sortable: true },
    { key: 'property_type', label: 'Type', sortable: true },
    { key: 'assessed_value', label: 'Assessed Value', format: 'currency', sortable: true },
    { key: 'mortgage_balance', label: 'Mortgage', format: 'currency', sortable: true },
    { key: 'year_built', label: 'Year Built', sortable: true },
    { key: 'distressed_score', label: 'Distress Score', sortable: true }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Property Search</h1>
              <p className="mt-2 text-gray-600">
                Find distressed properties with high equity potential
              </p>
            </div>

            {/* Mobile filter toggle */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Filters
            </button>
          </div>

          {/* Results summary */}
          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {loading ? (
                'Loading properties...'
              ) : error ? (
                <span className="text-red-600">{error}</span>
              ) : (
                `Found ${properties.length} properties`
              )}
            </div>

            {/* View toggle (future enhancement) */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">View:</span>
              <button className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md">
                Cards
              </button>
              <button className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300">
                Table
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-8">
          {/* Sidebar */}
          <div className="hidden lg:block w-80 flex-shrink-0">
            <FilterSidebar
              filters={filters}
              onFiltersChange={handleFiltersChange}
            />
          </div>

          {/* Mobile sidebar */}
          <FilterSidebar
            filters={filters}
            onFiltersChange={handleFiltersChange}
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
          />

          {/* Main content */}
          <div className="flex-1">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <div className="text-red-600 text-lg mb-2">Error Loading Properties</div>
                <div className="text-gray-600">{error}</div>
                <button
                  onClick={() => loadProperties(filters)}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Try Again
                </button>
              </div>
            ) : (
              <DataTable
                data={properties}
                columns={tableColumns}
                view="cards"
                onRowClick={handlePropertyClick}
                pageSize={12}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Search;