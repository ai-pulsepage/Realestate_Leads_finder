import React, { useState, useEffect } from 'react';
import { X, Calculator, Brain, Phone, User, Mail, Plus } from 'lucide-react';

/**
 * Property Detail Modal with Flipping Calculator and AI Insights
 */
const PropertyDetailModal = ({ property, isOpen, onClose, onSkipTrace, onVoiceCall, onAddToCampaign }) => {
  const [calculatorInputs, setCalculatorInputs] = useState({
    arv: property?.assessed_value || 0,
    repairCosts: 0,
    closingCosts: 0,
    holdingCosts: 0,
    sellingCosts: 0,
    desiredProfit: 25000
  });

  const [aiAnalysis, setAiAnalysis] = useState('');
  const [analyzing, setAnalyzing] = useState(false);

  // Calculate MAO (Max Allowable Offer)
  const calculateMAO = () => {
    const {
      arv,
      repairCosts,
      closingCosts,
      holdingCosts,
      sellingCosts,
      desiredProfit
    } = calculatorInputs;

    // MAO = ARV - Repair Costs - Closing Costs - Holding Costs - Selling Costs - Desired Profit
    const mao = arv - repairCosts - closingCosts - holdingCosts - sellingCosts - desiredProfit;
    return Math.max(0, mao);
  };

  // Calculate profit margin
  const calculateProfitMargin = () => {
    const mao = calculateMAO();
    const totalInvestment = mao + calculatorInputs.repairCosts + calculatorInputs.closingCosts;
    if (totalInvestment === 0) return 0;
    return ((calculatorInputs.arv - totalInvestment) / totalInvestment) * 100;
  };

  // Generate AI analysis
  const generateAIAnalysis = async () => {
    if (!property) return;

    setAnalyzing(true);
    try {
      // This would call the Gemini API in a real implementation
      // For now, we'll simulate an analysis
      const analysis = `Property Analysis for ${property.full_address}:

**Market Position:** This property shows strong potential in the ${property.zip_code} market. The assessed value of $${property.assessed_value?.toLocaleString()} suggests good ARV potential.

**Financial Health:** ${property.mortgage_balance ? `Current mortgage balance: $${property.mortgage_balance.toLocaleString()}` : 'No mortgage detected - excellent for quick acquisition'}

**Distress Indicators:** ${property.is_foreclosure ? 'Active foreclosure proceedings' : property.has_tax_lien ? 'Tax lien present' : property.is_vacant ? 'Vacant property - possible quick rehab opportunity' : 'No major distress indicators detected'}

**Investment Recommendation:** ${calculateProfitMargin() > 20 ? 'High potential deal with strong profit margins' : calculateProfitMargin() > 10 ? 'Moderate potential - requires careful cost management' : 'Low margin deal - consider passing'}`;

      setAiAnalysis(analysis);
    } catch (error) {
      setAiAnalysis('Unable to generate AI analysis at this time.');
    } finally {
      setAnalyzing(false);
    }
  };

  useEffect(() => {
    if (isOpen && property) {
      // Reset calculator with property data
      setCalculatorInputs(prev => ({
        ...prev,
        arv: property.assessed_value || 0
      }));

      // Auto-generate AI analysis when modal opens
      generateAIAnalysis();
    }
  }, [isOpen, property]);

  if (!isOpen || !property) return null;

  const mao = calculateMAO();
  const profitMargin = calculateProfitMargin();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{property.full_address}</h2>
            <p className="text-gray-600">{property.city}, {property.state} {property.zip_code}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Property Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Assessed Value</div>
              <div className="text-2xl font-bold text-gray-900">
                ${property.assessed_value?.toLocaleString() || 'N/A'}
              </div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Mortgage Balance</div>
              <div className="text-2xl font-bold text-gray-900">
                ${property.mortgage_balance?.toLocaleString() || 'None'}
              </div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Equity</div>
              <div className="text-2xl font-bold text-green-600">
                ${property.equity?.toLocaleString() || 'N/A'}
              </div>
            </div>
          </div>

          {/* Flipping Calculator */}
          <div className="bg-blue-50 p-6 rounded-lg">
            <div className="flex items-center mb-4">
              <Calculator className="w-6 h-6 text-blue-600 mr-2" />
              <h3 className="text-xl font-bold text-blue-900">Flipping Calculator</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Calculator Inputs */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    After Repair Value (ARV)
                  </label>
                  <input
                    type="number"
                    value={calculatorInputs.arv}
                    onChange={(e) => setCalculatorInputs(prev => ({ ...prev, arv: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Repair Costs
                  </label>
                  <input
                    type="number"
                    value={calculatorInputs.repairCosts}
                    onChange={(e) => setCalculatorInputs(prev => ({ ...prev, repairCosts: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Closing Costs
                  </label>
                  <input
                    type="number"
                    value={calculatorInputs.closingCosts}
                    onChange={(e) => setCalculatorInputs(prev => ({ ...prev, closingCosts: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Holding Costs
                  </label>
                  <input
                    type="number"
                    value={calculatorInputs.holdingCosts}
                    onChange={(e) => setCalculatorInputs(prev => ({ ...prev, holdingCosts: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Selling Costs
                  </label>
                  <input
                    type="number"
                    value={calculatorInputs.sellingCosts}
                    onChange={(e) => setCalculatorInputs(prev => ({ ...prev, sellingCosts: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Desired Profit
                  </label>
                  <input
                    type="number"
                    value={calculatorInputs.desiredProfit}
                    onChange={(e) => setCalculatorInputs(prev => ({ ...prev, desiredProfit: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Calculator Results */}
              <div className="space-y-4">
                <div className="bg-white p-4 rounded-lg border-2 border-blue-200">
                  <div className="text-sm text-gray-600 mb-1">Max Allowable Offer (MAO)</div>
                  <div className="text-3xl font-bold text-blue-600">
                    ${mao.toLocaleString()}
                  </div>
                </div>

                <div className="bg-white p-4 rounded-lg border-2 border-green-200">
                  <div className="text-sm text-gray-600 mb-1">Estimated Profit Margin</div>
                  <div className={`text-3xl font-bold ${profitMargin > 20 ? 'text-green-600' : profitMargin > 10 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {profitMargin.toFixed(1)}%
                  </div>
                </div>

                <div className="bg-white p-4 rounded-lg">
                  <div className="text-sm text-gray-600 mb-2">Deal Summary</div>
                  <div className="space-y-1 text-sm">
                    <div>Total Investment: ${(mao + calculatorInputs.repairCosts + calculatorInputs.closingCosts).toLocaleString()}</div>
                    <div>Expected Sale: ${calculatorInputs.arv.toLocaleString()}</div>
                    <div>Expected Profit: ${(calculatorInputs.arv - (mao + calculatorInputs.repairCosts + calculatorInputs.closingCosts)).toLocaleString()}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* AI Insights */}
          <div className="bg-purple-50 p-6 rounded-lg">
            <div className="flex items-center mb-4">
              <Brain className="w-6 h-6 text-purple-600 mr-2" />
              <h3 className="text-xl font-bold text-purple-900">AI Property Analysis</h3>
            </div>

            {analyzing ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600"></div>
                <span className="text-purple-700">Analyzing property...</span>
              </div>
            ) : (
              <div className="bg-white p-4 rounded-lg border border-purple-200">
                <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono">
                  {aiAnalysis || 'AI analysis not available'}
                </pre>
              </div>
            )}
          </div>

          {/* Action Bar */}
          <div className="bg-gray-50 p-6 rounded-lg">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Actions</h3>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => onSkipTrace?.(property)}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                <User className="w-4 h-4 mr-2" />
                Skip Trace Owner
              </button>

              <button
                onClick={() => onVoiceCall?.(property)}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
              >
                <Phone className="w-4 h-4 mr-2" />
                AI Voice Call
              </button>

              <button
                onClick={() => onAddToCampaign?.(property)}
                className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
              >
                <Mail className="w-4 h-4 mr-2" />
                Add to Campaign
              </button>

              <button className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition">
                <Plus className="w-4 h-4 mr-2" />
                Save to Favorites
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyDetailModal;