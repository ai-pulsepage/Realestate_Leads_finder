import React from 'react';
import Badge from './Badge';

/**
 * PropertyCard component for displaying property information
 * @param {Object} props
 * @param {Object} props.property - Property data object
 * @param {Function} props.onClick - Click handler
 * @param {string} props.className - Additional CSS classes
 */
const PropertyCard = ({ property, onClick, className = '' }) => {
  if (!property) return null;

  const formatCurrency = (amount) => {
    if (!amount) return '$0';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatAddress = (property) => {
    const parts = [];
    if (property.street_address) parts.push(property.street_address);
    if (property.city) parts.push(property.city);
    if (property.state) parts.push(property.state);
    if (property.zip_code) parts.push(property.zip_code);
    return parts.join(', ') || property.full_address || 'Address not available';
  };

  const calculateEquity = () => {
    if (!property.assessed_value) return null;
    const mortgage = property.mortgage_balance || 0;
    const equity = property.assessed_value - mortgage;
    const equityPercent = (equity / property.assessed_value) * 100;
    return {
      amount: equity,
      percentage: equityPercent.toFixed(1)
    };
  };

  const equity = calculateEquity();
  const distressIndicators = [];

  if (property.is_foreclosure) distressIndicators.push('Foreclosure');
  if (property.has_tax_lien) distressIndicators.push('Tax Lien');
  if (property.has_code_violation) distressIndicators.push('Code Violation');
  if (property.is_vacant) distressIndicators.push('Vacant');
  if (property.is_probate) distressIndicators.push('Probate');
  if (property.is_divorce) distressIndicators.push('Divorce');

  return (
    <div
      className={`bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer border border-gray-200 ${className}`}
      onClick={() => onClick && onClick(property)}
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
            {formatAddress(property)}
          </h3>
          {property.distressed_score > 0 && (
            <Badge variant="danger" size="sm">
              Distress: {property.distressed_score}
            </Badge>
          )}
        </div>

        {/* Property Details */}
        <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
          <div>
            <span className="font-medium">Type:</span> {property.property_type || 'N/A'}
          </div>
          <div>
            <span className="font-medium">Year Built:</span> {property.year_built || 'N/A'}
          </div>
          <div>
            <span className="font-medium">Bedrooms:</span> {property.bedrooms || 'N/A'}
          </div>
          <div>
            <span className="font-medium">Bathrooms:</span> {property.bathrooms || 'N/A'}
          </div>
        </div>
      </div>

      {/* Financial Info */}
      <div className="p-4 bg-gray-50">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-gray-600">Assessed Value</div>
            <div className="text-lg font-semibold text-gray-900">
              {formatCurrency(property.assessed_value)}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Mortgage Balance</div>
            <div className="text-lg font-semibold text-gray-900">
              {formatCurrency(property.mortgage_balance)}
            </div>
          </div>
        </div>

        {equity && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Estimated Equity</span>
              <div className="text-right">
                <div className="text-lg font-semibold text-green-600">
                  {formatCurrency(equity.amount)}
                </div>
                <div className="text-sm text-gray-600">
                  ({equity.percentage}%)
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Distress Indicators */}
      {distressIndicators.length > 0 && (
        <div className="px-4 pb-4">
          <div className="flex flex-wrap gap-1">
            {distressIndicators.map((indicator, index) => (
              <Badge key={index} variant="warning" size="sm">
                {indicator}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Last Sale Info */}
      {property.last_sale_date && (
        <div className="px-4 pb-4 text-sm text-gray-600">
          <span className="font-medium">Last Sale:</span> {formatCurrency(property.last_sale_price)}
          {' '}({new Date(property.last_sale_date).toLocaleDateString()})
        </div>
      )}
    </div>
  );
};

export default PropertyCard;