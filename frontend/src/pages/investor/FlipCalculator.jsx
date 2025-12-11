import React, { useState, useEffect } from 'react';
import {
    Calculator, Search, Home, AlertTriangle, DollarSign, TrendingUp,
    Hammer, FileText, Download, Save, ChevronDown, ChevronUp,
    CheckCircle, XCircle, Info, Building, MapPin, Calendar
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || '';

/**
 * Flip Calculator - Professional Deal Analysis Tool
 * Features: Property lookup, auto-pulled issues, rehab estimator, flipper math
 */
const FlipCalculator = () => {
    // Property Data
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedProperty, setSelectedProperty] = useState(null);
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [showSearch, setShowSearch] = useState(false);

    // Auto-Pulled Data (from property record)
    const [propertyData, setPropertyData] = useState({
        address: '',
        sqft: 0,
        yearBuilt: 0,
        appraisedValue: 0,
        lastSalePrice: 0,
        lastSaleDate: '',
        estimatedMortgage: 0,
        equity: 0,
        equityPercent: 0
    });

    // Issues (auto-pulled)
    const [issues, setIssues] = useState({
        codeViolations: [],
        taxLiens: 0,
        lisPendens: false,
        totalIssuesCost: 0
    });

    // User Inputs
    const [arv, setArv] = useState(0); // After Repair Value
    const [repairs, setRepairs] = useState({
        roof: 0,
        kitchen: 0,
        bathrooms: 0,
        flooring: 0,
        paint: 0,
        hvac: 0,
        electrical: 0,
        plumbing: 0,
        windows: 0,
        landscaping: 0,
        other: 0
    });
    const [laborPercent, setLaborPercent] = useState(30);
    const [holdingMonths, setHoldingMonths] = useState(4);
    const [monthlyHolding, setMonthlyHolding] = useState(1500);
    const [closingBuyPercent, setClosingBuyPercent] = useState(3);
    const [closingSellPercent, setClosingSellPercent] = useState(8);
    const [profitGoal, setProfitGoal] = useState(30000);
    const [useFinancing, setUseFinancing] = useState(false);
    const [downPaymentPercent, setDownPaymentPercent] = useState(20);

    // Expanded sections
    const [showRepairs, setShowRepairs] = useState(true);
    const [showAdvanced, setShowAdvanced] = useState(false);

    // Calculations
    const totalRepairMaterials = Object.values(repairs).reduce((a, b) => a + b, 0);
    const laborCost = totalRepairMaterials * (laborPercent / 100);
    const totalRepairs = totalRepairMaterials + laborCost;
    const holdingCosts = holdingMonths * monthlyHolding;

    // 70% Rule Max Offer
    const maxOffer70 = (arv * 0.70) - totalRepairs;

    // MAO (Maximum Allowable Offer) with profit goal
    const closingBuyCost = (maxOffer70 > 0 ? maxOffer70 : 0) * (closingBuyPercent / 100);
    const closingSellCost = arv * (closingSellPercent / 100);
    const maoWithProfit = arv - totalRepairs - profitGoal - holdingCosts - closingBuyCost - closingSellCost - issues.totalIssuesCost;

    // All-In Cost (at max offer)
    const purchasePrice = Math.max(maxOffer70, 0);
    const allInCost = purchasePrice + totalRepairs + holdingCosts + closingBuyCost + issues.totalIssuesCost;

    // Profit Calculation
    const saleProceeds = arv - closingSellCost;
    const estimatedProfit = saleProceeds - allInCost;

    // ROI
    const roi = allInCost > 0 ? (estimatedProfit / allInCost) * 100 : 0;

    // Cash-on-Cash (if financing)
    const downPayment = purchasePrice * (downPaymentPercent / 100);
    const cashInvested = useFinancing ? downPayment + totalRepairs + holdingCosts + closingBuyCost : allInCost;
    const cashOnCash = cashInvested > 0 ? (estimatedProfit / cashInvested) * 100 : 0;

    // Search properties
    const handleSearch = async () => {
        if (!searchQuery.trim()) return;
        setSearching(true);
        try {
            const res = await fetch(`${API_BASE}/properties?search=${encodeURIComponent(searchQuery)}&limit=10`);
            const data = await res.json();
            setSearchResults(data.properties || []);
            setShowSearch(true);
        } catch (err) {
            console.error('Search failed:', err);
        } finally {
            setSearching(false);
        }
    };

    // Select a property
    const selectProperty = (property) => {
        setSelectedProperty(property);
        setShowSearch(false);

        // Extract data from property
        const details = property.property_details || {};
        const appraisedValue = details.appraised_value || property.sale_price || 0;
        const estimatedMortgage = appraisedValue * 0.6; // Rough estimate
        const equity = appraisedValue - estimatedMortgage;

        setPropertyData({
            address: property.address,
            sqft: details.sqft || details.living_area || 1800,
            yearBuilt: details.year_built || 1985,
            appraisedValue: appraisedValue,
            lastSalePrice: property.sale_price || 0,
            lastSaleDate: property.sale_date || '',
            estimatedMortgage: estimatedMortgage,
            equity: equity,
            equityPercent: appraisedValue > 0 ? (equity / appraisedValue) * 100 : 0
        });

        // Set ARV suggestion (10% above appraised for now)
        setArv(Math.round(appraisedValue * 1.1));

        // Extract issues from property details
        const violations = details.code_violations || [];
        const taxLien = details.tax_lien_amount || 0;
        const lisPendens = details.lis_pendens || false;

        setIssues({
            codeViolations: violations,
            taxLiens: taxLien,
            lisPendens: lisPendens,
            totalIssuesCost: taxLien + (violations.length * 5000) + (lisPendens ? 10000 : 0)
        });

        // Estimate repairs based on age
        const age = new Date().getFullYear() - (details.year_built || 1985);
        const sqft = details.sqft || 1800;

        setRepairs({
            roof: age > 15 ? 12000 : 0,
            kitchen: 15000,
            bathrooms: 8000,
            flooring: Math.round(sqft * 3),
            paint: Math.round(sqft * 2),
            hvac: age > 12 ? 6000 : 0,
            electrical: age > 30 ? 5000 : 0,
            plumbing: age > 25 ? 4000 : 0,
            windows: 0,
            landscaping: 2000,
            other: 0
        });
    };

    const formatCurrency = (num) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(num);
    };

    const formatPercent = (num) => {
        return `${num.toFixed(1)}%`;
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 lg:p-8">
            <div className="max-w-6xl mx-auto">

                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                            <Calculator className="w-8 h-8 text-emerald-400" />
                            Flip Calculator
                        </h1>
                        <p className="text-slate-400 mt-1">Analyze deals with precision. Know your numbers.</p>
                    </div>
                    <div className="flex gap-3">
                        <button className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition">
                            <Save className="w-4 h-4" /> Save Analysis
                        </button>
                        <button className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition">
                            <Download className="w-4 h-4" /> Export PDF
                        </button>
                    </div>
                </div>

                <div className="grid lg:grid-cols-3 gap-8">

                    {/* Left Column - Property & Inputs */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* Property Search */}
                        <div className="bg-slate-800/50 backdrop-blur rounded-2xl border border-slate-700 p-6">
                            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                <MapPin className="w-5 h-5 text-emerald-400" />
                                Property Selection
                            </h2>

                            <div className="relative">
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                        placeholder="Search by address or property ID..."
                                        className="flex-1 bg-slate-700 border border-slate-600 text-white rounded-lg px-4 py-3 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition"
                                    />
                                    <button
                                        onClick={handleSearch}
                                        disabled={searching}
                                        className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition flex items-center gap-2"
                                    >
                                        <Search className="w-4 h-4" />
                                        {searching ? 'Searching...' : 'Search'}
                                    </button>
                                </div>

                                {/* Search Results Dropdown */}
                                {showSearch && searchResults.length > 0 && (
                                    <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-600 rounded-xl shadow-2xl z-50 max-h-80 overflow-y-auto">
                                        {searchResults.map((prop) => (
                                            <button
                                                key={prop.property_id}
                                                onClick={() => selectProperty(prop)}
                                                className="w-full text-left px-4 py-3 hover:bg-slate-700 transition border-b border-slate-700 last:border-b-0"
                                            >
                                                <div className="text-white font-medium">{prop.address}</div>
                                                <div className="text-slate-400 text-sm">
                                                    {prop.zip_code} • {formatCurrency(prop.sale_price || 0)}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Selected Property Info */}
                            {selectedProperty && (
                                <div className="mt-4 p-4 bg-slate-700/50 rounded-xl">
                                    <div className="flex items-center gap-3 mb-3">
                                        <Home className="w-6 h-6 text-emerald-400" />
                                        <div>
                                            <div className="text-white font-semibold">{propertyData.address}</div>
                                            <div className="text-slate-400 text-sm">
                                                {propertyData.sqft.toLocaleString()} sqft • Built {propertyData.yearBuilt}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                        <div>
                                            <div className="text-slate-400">Appraised</div>
                                            <div className="text-white font-semibold">{formatCurrency(propertyData.appraisedValue)}</div>
                                        </div>
                                        <div>
                                            <div className="text-slate-400">Last Sale</div>
                                            <div className="text-white font-semibold">{formatCurrency(propertyData.lastSalePrice)}</div>
                                        </div>
                                        <div>
                                            <div className="text-slate-400">Est. Mortgage</div>
                                            <div className="text-white font-semibold">{formatCurrency(propertyData.estimatedMortgage)}</div>
                                        </div>
                                        <div>
                                            <div className="text-slate-400">Equity</div>
                                            <div className="text-emerald-400 font-semibold">
                                                {formatCurrency(propertyData.equity)} ({formatPercent(propertyData.equityPercent)})
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Issues Section */}
                        {selectedProperty && (issues.codeViolations.length > 0 || issues.taxLiens > 0 || issues.lisPendens) && (
                            <div className="bg-gradient-to-r from-red-900/30 to-orange-900/30 backdrop-blur rounded-2xl border border-red-700/50 p-6">
                                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                    <AlertTriangle className="w-5 h-5 text-red-400" />
                                    Issues Affecting Value
                                </h2>
                                <div className="space-y-3">
                                    {issues.codeViolations.length > 0 && (
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <XCircle className="w-4 h-4 text-red-400" />
                                                <span className="text-white">Code Violations ({issues.codeViolations.length})</span>
                                            </div>
                                            <span className="text-red-400 font-semibold">-{formatCurrency(issues.codeViolations.length * 5000)}</span>
                                        </div>
                                    )}
                                    {issues.taxLiens > 0 && (
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <XCircle className="w-4 h-4 text-orange-400" />
                                                <span className="text-white">Tax Liens</span>
                                            </div>
                                            <span className="text-orange-400 font-semibold">-{formatCurrency(issues.taxLiens)}</span>
                                        </div>
                                    )}
                                    {issues.lisPendens && (
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <XCircle className="w-4 h-4 text-yellow-400" />
                                                <span className="text-white">Lis Pendens (Pre-Foreclosure)</span>
                                            </div>
                                            <span className="text-yellow-400 font-semibold">-{formatCurrency(10000)}</span>
                                        </div>
                                    )}
                                    <div className="border-t border-red-700/50 pt-3 flex items-center justify-between">
                                        <span className="text-white font-semibold">Total Issues Cost</span>
                                        <span className="text-red-400 font-bold text-lg">{formatCurrency(issues.totalIssuesCost)}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ARV Input */}
                        <div className="bg-slate-800/50 backdrop-blur rounded-2xl border border-slate-700 p-6">
                            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-emerald-400" />
                                After Repair Value (ARV)
                            </h2>
                            <div className="flex items-center gap-4">
                                <div className="flex-1">
                                    <input
                                        type="number"
                                        value={arv}
                                        onChange={(e) => setArv(Number(e.target.value))}
                                        className="w-full bg-slate-700 border border-slate-600 text-white text-2xl font-bold rounded-lg px-4 py-3 focus:border-emerald-500 transition"
                                    />
                                </div>
                                <div className="text-slate-400 text-sm">
                                    Based on comparable sales in the area
                                </div>
                            </div>
                        </div>

                        {/* Repair Costs */}
                        <div className="bg-slate-800/50 backdrop-blur rounded-2xl border border-slate-700 p-6">
                            <button
                                onClick={() => setShowRepairs(!showRepairs)}
                                className="w-full flex items-center justify-between text-lg font-semibold text-white mb-4"
                            >
                                <span className="flex items-center gap-2">
                                    <Hammer className="w-5 h-5 text-emerald-400" />
                                    Rehab Cost Estimator
                                </span>
                                <div className="flex items-center gap-3">
                                    <span className="text-emerald-400">{formatCurrency(totalRepairs)}</span>
                                    {showRepairs ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                </div>
                            </button>

                            {showRepairs && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                        {Object.entries(repairs).map(([key, value]) => (
                                            <div key={key}>
                                                <label className="block text-slate-400 text-sm mb-1 capitalize">{key}</label>
                                                <input
                                                    type="number"
                                                    value={value}
                                                    onChange={(e) => setRepairs({ ...repairs, [key]: Number(e.target.value) })}
                                                    className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 focus:border-emerald-500 transition"
                                                />
                                            </div>
                                        ))}
                                    </div>

                                    <div className="border-t border-slate-700 pt-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-slate-400">Materials Subtotal</span>
                                            <span className="text-white">{formatCurrency(totalRepairMaterials)}</span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <label className="text-slate-400">Labor %</label>
                                            <input
                                                type="number"
                                                value={laborPercent}
                                                onChange={(e) => setLaborPercent(Number(e.target.value))}
                                                className="w-20 bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-1 text-center"
                                            />
                                            <span className="text-white">{formatCurrency(laborCost)}</span>
                                        </div>
                                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-700">
                                            <span className="text-white font-semibold">Total Rehab</span>
                                            <span className="text-emerald-400 font-bold text-xl">{formatCurrency(totalRepairs)}</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Advanced Options */}
                        <div className="bg-slate-800/50 backdrop-blur rounded-2xl border border-slate-700 p-6">
                            <button
                                onClick={() => setShowAdvanced(!showAdvanced)}
                                className="w-full flex items-center justify-between text-lg font-semibold text-white"
                            >
                                <span className="flex items-center gap-2">
                                    <Settings className="w-5 h-5 text-slate-400" />
                                    Advanced Options
                                </span>
                                {showAdvanced ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                            </button>

                            {showAdvanced && (
                                <div className="mt-4 grid md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-slate-400 text-sm mb-1">Holding Period (months)</label>
                                        <input
                                            type="number"
                                            value={holdingMonths}
                                            onChange={(e) => setHoldingMonths(Number(e.target.value))}
                                            className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-slate-400 text-sm mb-1">Monthly Holding Cost</label>
                                        <input
                                            type="number"
                                            value={monthlyHolding}
                                            onChange={(e) => setMonthlyHolding(Number(e.target.value))}
                                            className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-slate-400 text-sm mb-1">Closing Costs (Buy %)</label>
                                        <input
                                            type="number"
                                            value={closingBuyPercent}
                                            onChange={(e) => setClosingBuyPercent(Number(e.target.value))}
                                            className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-slate-400 text-sm mb-1">Selling Costs (%)</label>
                                        <input
                                            type="number"
                                            value={closingSellPercent}
                                            onChange={(e) => setClosingSellPercent(Number(e.target.value))}
                                            className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-slate-400 text-sm mb-1">Target Profit</label>
                                        <input
                                            type="number"
                                            value={profitGoal}
                                            onChange={(e) => setProfitGoal(Number(e.target.value))}
                                            className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2"
                                        />
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="checkbox"
                                            checked={useFinancing}
                                            onChange={(e) => setUseFinancing(e.target.checked)}
                                            className="w-5 h-5 rounded bg-slate-700 border-slate-600"
                                        />
                                        <label className="text-white">Using Financing</label>
                                        {useFinancing && (
                                            <input
                                                type="number"
                                                value={downPaymentPercent}
                                                onChange={(e) => setDownPaymentPercent(Number(e.target.value))}
                                                className="w-20 bg-slate-700 border border-slate-600 text-white rounded-lg px-2 py-1 text-center"
                                                placeholder="%"
                                            />
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column - Results */}
                    <div className="space-y-6">

                        {/* Max Offer Card */}
                        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-2xl p-6 text-white shadow-2xl shadow-emerald-900/30">
                            <div className="text-sm uppercase tracking-wider text-emerald-200 mb-1">70% Rule Max Offer</div>
                            <div className="text-4xl font-bold">{formatCurrency(Math.max(maxOffer70, 0))}</div>
                            <div className="text-emerald-200 text-sm mt-2">
                                ({formatCurrency(arv)} × 70%) − {formatCurrency(totalRepairs)}
                            </div>
                        </div>

                        {/* MAO Card */}
                        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-2xl shadow-blue-900/30">
                            <div className="text-sm uppercase tracking-wider text-blue-200 mb-1">MAO (With {formatCurrency(profitGoal)} Profit Goal)</div>
                            <div className="text-4xl font-bold">{formatCurrency(Math.max(maoWithProfit, 0))}</div>
                            <div className="text-blue-200 text-sm mt-2">
                                Includes all costs + issues
                            </div>
                        </div>

                        {/* Breakdown */}
                        <div className="bg-slate-800/50 backdrop-blur rounded-2xl border border-slate-700 p-6">
                            <h3 className="text-white font-semibold mb-4">Deal Breakdown</h3>
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Purchase (at 70% rule)</span>
                                    <span className="text-white">{formatCurrency(Math.max(maxOffer70, 0))}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Rehab Costs</span>
                                    <span className="text-white">{formatCurrency(totalRepairs)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Holding Costs</span>
                                    <span className="text-white">{formatCurrency(holdingCosts)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Closing (Buy)</span>
                                    <span className="text-white">{formatCurrency(closingBuyCost)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Issues</span>
                                    <span className="text-red-400">{formatCurrency(issues.totalIssuesCost)}</span>
                                </div>
                                <div className="border-t border-slate-700 pt-3 flex justify-between font-semibold">
                                    <span className="text-white">All-In Cost</span>
                                    <span className="text-white">{formatCurrency(allInCost)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Sale at ARV</span>
                                    <span className="text-white">{formatCurrency(arv)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Selling Costs</span>
                                    <span className="text-red-400">-{formatCurrency(closingSellCost)}</span>
                                </div>
                                <div className="border-t border-slate-700 pt-3 flex justify-between font-semibold">
                                    <span className="text-white">Estimated Profit</span>
                                    <span className={estimatedProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                                        {formatCurrency(estimatedProfit)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* ROI */}
                        <div className="bg-slate-800/50 backdrop-blur rounded-2xl border border-slate-700 p-6">
                            <h3 className="text-white font-semibold mb-4">Return Metrics</h3>
                            <div className="space-y-4">
                                <div>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-slate-400">ROI</span>
                                        <span className={`font-bold ${roi >= 20 ? 'text-emerald-400' : roi >= 10 ? 'text-yellow-400' : 'text-red-400'}`}>
                                            {formatPercent(roi)}
                                        </span>
                                    </div>
                                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full transition-all ${roi >= 20 ? 'bg-emerald-500' : roi >= 10 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                            style={{ width: `${Math.min(Math.max(roi, 0), 100)}%` }}
                                        />
                                    </div>
                                </div>
                                {useFinancing && (
                                    <div>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="text-slate-400">Cash-on-Cash</span>
                                            <span className={`font-bold ${cashOnCash >= 30 ? 'text-emerald-400' : cashOnCash >= 15 ? 'text-yellow-400' : 'text-red-400'}`}>
                                                {formatPercent(cashOnCash)}
                                            </span>
                                        </div>
                                        <div className="text-slate-500 text-xs">
                                            Cash invested: {formatCurrency(cashInvested)}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Verdict */}
                        <div className={`rounded-2xl p-6 ${estimatedProfit >= profitGoal ? 'bg-emerald-900/30 border border-emerald-700/50' : 'bg-red-900/30 border border-red-700/50'}`}>
                            <div className="flex items-center gap-3">
                                {estimatedProfit >= profitGoal ? (
                                    <>
                                        <CheckCircle className="w-8 h-8 text-emerald-400" />
                                        <div>
                                            <div className="text-emerald-400 font-bold text-lg">Good Deal!</div>
                                            <div className="text-emerald-300 text-sm">Meets your profit goal</div>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <XCircle className="w-8 h-8 text-red-400" />
                                        <div>
                                            <div className="text-red-400 font-bold text-lg">Needs Negotiation</div>
                                            <div className="text-red-300 text-sm">Below profit target by {formatCurrency(profitGoal - estimatedProfit)}</div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FlipCalculator;
