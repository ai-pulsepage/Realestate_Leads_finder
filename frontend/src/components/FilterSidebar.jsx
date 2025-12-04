import React, { useState } from 'react';

/**
 * FilterSidebar component for property search filters
 * @param {Object} props
 * @param {Object} props.filters - Current filter values
 * @param {Function} props.onFiltersChange - Filter change handler
 * @param {boolean} props.isOpen - Whether sidebar is open (for mobile)
 * @param {Function} props.onClose - Close handler (for mobile)
 */
const FilterSidebar = ({ filters, onFiltersChange, isOpen = true, onClose }) => {
  const [localFilters, setLocalFilters] = useState(filters);

  const handleFilterChange = (key, value) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleApplyFilters = () => {
    onFiltersChange(localFilters);
    if (onClose) onClose();
  };

  const handleResetFilters = () => {
    const resetFilters = {};
    setLocalFilters(resetFilters);
    onFiltersChange(resetFilters);
  };

  const distressTypes = [
    { value: '', label: 'Any Distress' },
    { value: 'foreclosure', label: 'Foreclosure' },
    { value: 'tax_lien', label: 'Tax Lien' },
    { value: 'code_violation', label: 'Code Violation' },
    { value: 'vacant', label: 'Vacant' },
    { value: 'probate', label: 'Probate' },
    { value: 'divorce', label: 'Divorce' },
    { value: 'heirship', label: 'Heirship' },
    { value: 'pre_foreclosure', label: 'Pre-Foreclosure' }
  ];

  const propertyTypes = [
    { value: '', label: 'All Types' },
    { value: 'Single Family', label: 'Single Family' },
    { value: 'Condo', label: 'Condo' },
    { value: 'Townhouse', label: 'Townhouse' },
    { value: 'Multi-Family', label: 'Multi-Family' },
    { value: 'Commercial', label: 'Commercial' }
  ];

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && onClose && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-50 w-80 bg-white shadow-lg transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        ${onClose ? 'lg:relative lg:translate-x-0' : ''}
      `}>
        <div className="h-full overflow-y-auto">
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
              {onClose && (
                <button
                  onClick={onClose}
                  className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Filters */}
          <div className="p-6 space-y-6">
            {/* Equity Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Minimum Equity (%)
              </label>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={localFilters.minEquity || 0}
                onChange={(e) => handleFilterChange('minEquity', parseInt(e.target.value) / 100)}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-sm text-gray-600 mt-1">
                <span>0%</span>
                <span className="font-medium">{((localFilters.minEquity || 0) * 100).toFixed(0)}%</span>
                <span>100%</span>
              </div>
            </div>

            {/* Year Built Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Maximum Year Built (Older Homes)
              </label>
              <select
                value={localFilters.maxYearBuilt || ''}
                onChange={(e) => handleFilterChange('maxYearBuilt', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Any Age</option>
                <option value="1950">Before 1950</option>
                <option value="1960">Before 1960</option>
                <option value="1970">Before 1970</option>
                <option value="1980">Before 1980</option>
                <option value="1990">Before 1990</option>
                <option value="2000">Before 2000</option>
              </select>
            </div>

            {/* Distress Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Distress Type
              </label>
              <select
                value={localFilters.distressType || ''}
                onChange={(e) => handleFilterChange('distressType', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {distressTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Property Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Property Type
              </label>
              <select
                value={localFilters.property_type || ''}
                onChange={(e) => handleFilterChange('property_type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {propertyTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Zip Code Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Zip Code
              </label>
              <input
                type="text"
                value={localFilters.zip_code || ''}
                onChange={(e) => handleFilterChange('zip_code', e.target.value)}
                placeholder="Enter zip code"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* County Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                County
              </label>
              <select
                value={localFilters.county || ''}
                onChange={(e) => handleFilterChange('county', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Counties</option>
                <option value="Miami-Dade">Miami-Dade</option>
                <option value="Broward">Broward</option>
                <option value="Palm Beach">Palm Beach</option>
              </select>
            </div>
          </div>

          {/* Actions */}
          <div className="p-6 border-t border-gray-200 space-y-3">
            <button
              onClick={handleApplyFilters}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Apply Filters
            </button>
            <button
              onClick={handleResetFilters}
              className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Reset All
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default FilterSidebar;