import React, { useState } from 'react';
import { Link } from 'react-router-dom';

/**
 * Email Marketing Page
 * Hybrid Approach: AI Assistant + Playbooks + Data
 */
const Marketing = () => {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [showImportModal, setShowImportModal] = useState(false);

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Email Marketing</h1>
                        <p className="text-gray-600 mt-1">
                            Generate leads on demand with AI-powered campaigns.
                        </p>
                    </div>
                    <button className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 shadow-sm flex items-center">
                        <span className="mr-2">✨</span> Create New Campaign
                    </button>
                </div>

                {/* Navigation Tabs */}
                <div className="flex space-x-8 border-b border-gray-200 mb-8">
                    {['dashboard', 'lists', 'templates'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`pb-4 px-2 text-sm font-medium capitalize transition-colors ${activeTab === tab
                                    ? 'border-b-2 border-blue-600 text-blue-600'
                                    : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {/* Content Area */}
                {activeTab === 'dashboard' && <DashboardView />}
                {activeTab === 'lists' && <ListsView setShowImportModal={setShowImportModal} />}
                {activeTab === 'templates' && <TemplatesView />}
            </div>

            {/* Import Modal */}
            {showImportModal && (
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg max-w-md w-full p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Import Contacts</h3>
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mb-6 hover:bg-gray-50 cursor-pointer">
                            <div className="text-4xl mb-2">📂</div>
                            <p className="text-sm text-gray-600">Drag & drop CSV file here</p>
                            <p className="text-xs text-gray-400 mt-1">or click to browse</p>
                        </div>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowImportModal(false)}
                                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => setShowImportModal(false)}
                                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
                            >
                                Upload List
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const DashboardView = () => (
    <div className="space-y-8">
        {/* ROI Stats (The "ROI Hunter" Feature) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard title="Emails Sent (30 Days)" value="1,250" change="+12%" />
            <StatCard title="Open Rate" value="42%" change="+5%" color="green" />
            <StatCard title="Leads Generated" value="18" change="+3" color="blue" />
        </div>

        {/* Recent Campaigns */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                <h2 className="font-bold text-gray-900">Recent Campaigns</h2>
                <Link to="#" className="text-sm text-blue-600 hover:text-blue-800">View All</Link>
            </div>
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Campaign Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sent</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Opens</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    <CampaignRow name="Storm Response - Miami" status="Sent" sent="500" opens="45%" date="2 days ago" />
                    <CampaignRow name="Spring AC Tune-up" status="Draft" sent="-" opens="-" date="Edited 1 hr ago" />
                    <CampaignRow name="New Homeowner Welcome" status="Scheduled" sent="150" opens="-" date="Tomorrow, 9am" />
                </tbody>
            </table>
        </div>
    </div>
);

const ListsView = ({ setShowImportModal }) => (
    <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Import Card */}
            <div
                onClick={() => setShowImportModal(true)}
                className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:border-blue-500 cursor-pointer transition-all group"
            >
                <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-blue-600 transition-colors">
                    <svg className="w-6 h-6 text-blue-600 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                </div>
                <h3 className="text-lg font-bold text-gray-900">Import Contacts</h3>
                <p className="text-gray-500 text-sm mt-1">Upload CSV or Excel files from other sources.</p>
            </div>

            {/* Buy Leads Card */}
            <Link to="/provider/leads" className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:border-green-500 cursor-pointer transition-all group">
                <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-green-600 transition-colors">
                    <svg className="w-6 h-6 text-green-600 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                </div>
                <h3 className="text-lg font-bold text-gray-900">Find New Leads</h3>
                <p className="text-gray-500 text-sm mt-1">Browse our database of homeowners and properties.</p>
            </Link>
        </div>

        {/* Lists Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="font-bold text-gray-900">Your Lists</h2>
            </div>
            <table className="min-w-full divide-y divide-gray-200">
                <tbody className="divide-y divide-gray-200">
                    <ListRow name="Miami Homeowners (System)" count={1250} source="BizLeadFinders" />
                    <ListRow name="Past Clients 2024" count={45} source="Imported (CSV)" />
                    <ListRow name="Recent Storm Leads" count={88} source="BizLeadFinders" />
                </tbody>
            </table>
        </div>
    </div>
);

const TemplatesView = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* AI Generator Card */}
        <div className="col-span-full bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl p-8 text-white mb-4">
            <h2 className="text-2xl font-bold mb-2">✨ AI Campaign Generator</h2>
            <p className="mb-6 opacity-90">Tell us what you want to say, and our AI will write a high-converting email for you.</p>
            <div className="flex gap-2">
                <input
                    type="text"
                    placeholder="e.g. Offer 10% off roof inspections for spring..."
                    className="flex-1 rounded-lg px-4 py-3 text-gray-900 focus:outline-none"
                />
                <button className="bg-white text-blue-600 px-6 py-3 rounded-lg font-bold hover:bg-gray-100">
                    Generate
                </button>
            </div>
        </div>

        {/* Playbooks */}
        <TemplateCard title="Storm Response" desc="Reach out to homeowners after severe weather." tag="Playbook" />
        <TemplateCard title="Seasonal Maintenance" desc="Remind clients it's time for a tune-up." tag="Playbook" />
        <TemplateCard title="Review Request" desc="Ask happy customers for a Google review." tag="Playbook" />
        <TemplateCard title="Referral Bonus" desc="Offer incentives for referrals." tag="Playbook" />
        <TemplateCard title="Blank Canvas" desc="Start from scratch with a plain text editor." tag="Custom" />
    </div>
);

// Components
const StatCard = ({ title, value, change, color = 'gray' }) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="text-sm text-gray-500 mb-1">{title}</div>
        <div className="flex items-end justify-between">
            <div className="text-3xl font-bold text-gray-900">{value}</div>
            <div className={`text-sm font-medium ${change.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                {change}
            </div>
        </div>
    </div>
);

const CampaignRow = ({ name, status, sent, opens, date }) => (
    <tr>
        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{name}</td>
        <td className="px-6 py-4 whitespace-nowrap">
            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${status === 'Sent' ? 'bg-green-100 text-green-800' :
                    status === 'Draft' ? 'bg-gray-100 text-gray-800' :
                        'bg-blue-100 text-blue-800'
                }`}>
                {status}
            </span>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{sent}</td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{opens}</td>
        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
            <button className="text-blue-600 hover:text-blue-900">Manage</button>
        </td>
    </tr>
);

const ListRow = ({ name, count, source }) => (
    <tr>
        <td className="px-6 py-4 whitespace-nowrap">
            <div className="flex items-center">
                <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 mr-3">
                    📋
                </div>
                <div className="text-sm font-medium text-gray-900">{name}</div>
            </div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{count} contacts</td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{source}</td>
        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
            <button className="text-gray-400 hover:text-gray-600">Edit</button>
        </td>
    </tr>
);

const TemplateCard = ({ title, desc, tag }) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:border-blue-500 cursor-pointer transition-all">
        <div className="flex justify-between items-start mb-4">
            <div className="h-10 w-10 bg-blue-50 rounded-lg flex items-center justify-center text-xl">
                📝
            </div>
            <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full font-medium">{tag}</span>
        </div>
        <h3 className="font-bold text-gray-900 mb-1">{title}</h3>
        <p className="text-sm text-gray-500">{desc}</p>
    </div>
);

export default Marketing;
