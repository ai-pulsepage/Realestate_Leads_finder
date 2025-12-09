import React, { useState } from 'react';

/**
 * Tools & Settings - Configuration for AI, Twilio, and Email
 */
const ToolsSettings = () => {
    const [aiEnabled, setAiEnabled] = useState(true);
    const [forwardingNumber, setForwardingNumber] = useState('+1 (555) 123-4567');
    const [twilioNumber, setTwilioNumber] = useState('+1 (786) 555-0199');
    const [greeting, setGreeting] = useState("Hello! You've reached [Company Name]. How can we help you today?");
    const [showBuyModal, setShowBuyModal] = useState(false);

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold text-gray-900 mb-8">Tools & Configuration</h1>

                {/* Wallet Section */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Wallet & Tokens</h2>
                            <p className="text-gray-600 text-sm mt-1">
                                Manage your credits for AI calls and premium leads.
                            </p>
                        </div>
                        <div className="text-right">
                            <div className="text-3xl font-bold text-blue-600">500</div>
                            <div className="text-xs text-gray-500 uppercase tracking-wider">Available Tokens</div>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6 mb-8">
                        {/* Purchase Options */}
                        <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-500 transition-colors cursor-pointer text-center">
                            <div className="text-lg font-bold text-gray-900">Starter Pack</div>
                            <div className="text-2xl font-bold text-blue-600 my-2">100 Tokens</div>
                            <div className="text-gray-500 mb-4">$10.00</div>
                            <button className="w-full py-2 bg-blue-50 text-blue-700 font-medium rounded-lg hover:bg-blue-100">
                                Buy Now
                            </button>
                        </div>
                        <div className="border border-blue-500 bg-blue-50 rounded-lg p-4 relative text-center">
                            <div className="absolute top-0 right-0 bg-blue-500 text-white text-xs px-2 py-1 rounded-bl-lg rounded-tr-lg font-bold">
                                POPULAR
                            </div>
                            <div className="text-lg font-bold text-gray-900">Pro Pack</div>
                            <div className="text-2xl font-bold text-blue-600 my-2">500 Tokens</div>
                            <div className="text-gray-500 mb-4">$45.00</div>
                            <button className="w-full py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 shadow-sm">
                                Buy Now
                            </button>
                        </div>
                        <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-500 transition-colors cursor-pointer text-center">
                            <div className="text-lg font-bold text-gray-900">Business Pack</div>
                            <div className="text-2xl font-bold text-blue-600 my-2">1,000 Tokens</div>
                            <div className="text-gray-500 mb-4">$80.00</div>
                            <button className="w-full py-2 bg-blue-50 text-blue-700 font-medium rounded-lg hover:bg-blue-100">
                                Buy Now
                            </button>
                        </div>
                    </div>

                    {/* Transaction History */}
                    <div>
                        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">Recent Transactions</h3>
                        <div className="overflow-hidden rounded-lg border border-gray-200">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    <tr>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Today</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">AI Call - Lead Qualification</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 text-right">-5</td>
                                    </tr>
                                    <tr>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Yesterday</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Purchased Pro Pack</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 text-right">+500</td>
                                    </tr>
                                    <tr>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Dec 01</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Email Campaign (50 recipients)</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 text-right">-50</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Voice AI Section */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Voice AI 2.0</h2>
                            <p className="text-gray-600 text-sm mt-1">
                                Dual-Agent System: Inbound Receptionist & Outbound Sales
                            </p>
                        </div>
                        <div className="flex items-center gap-4">
                            {/* Calendar Status */}
                            <div className="flex items-center text-sm border-r pr-4 border-gray-200">
                                <span className="w-2 h-2 rounded-full bg-gray-300 mr-2"></span>
                                <span className="text-gray-500">Calendar: Not Connected</span>
                                <button className="ml-2 text-blue-600 font-medium hover:text-blue-800">Connect</button>
                            </div>
                            {/* Toggle */}
                            <div className="flex items-center">
                                <span className={`mr-3 text-sm font-medium ${aiEnabled ? 'text-green-600' : 'text-gray-500'}`}>
                                    {aiEnabled ? 'Active' : 'Disabled'}
                                </span>
                                <button
                                    onClick={() => setAiEnabled(!aiEnabled)}
                                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${aiEnabled ? 'bg-green-600' : 'bg-gray-200'}`}
                                >
                                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${aiEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex border-b border-gray-200 mb-6">
                        <button className="px-4 py-2 text-sm font-medium text-blue-600 border-b-2 border-blue-600">
                            📞 Inbound Receptionist
                        </button>
                        <button className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700">
                            🚀 Outbound Sales
                        </button>
                    </div>

                    {/* Inbound Tab Content */}
                    <div className="space-y-4">
                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Twilio Number (Inbound)</label>
                                <div className="flex">
                                    <input
                                        type="text"
                                        value={twilioNumber}
                                        readOnly
                                        className="flex-1 rounded-l-md border-gray-300 bg-gray-50 text-gray-500 sm:text-sm p-2 border"
                                    />
                                    <button
                                        onClick={() => setShowBuyModal(true)}
                                        className="bg-gray-100 px-4 py-2 border border-l-0 border-gray-300 rounded-r-md text-sm font-medium text-gray-700 hover:bg-gray-200"
                                    >
                                        Change
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Fallback Forwarding</label>
                                <input
                                    type="text"
                                    value={forwardingNumber}
                                    onChange={(e) => setForwardingNumber(e.target.value)}
                                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                                    placeholder="+1 (305) 555-0100"
                                />
                                <p className="mt-1 text-xs text-gray-500">Calls go here if AI is off or caller requests transfer.</p>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Initial Greeting</label>
                            <input
                                type="text"
                                value={greeting}
                                onChange={(e) => setGreeting(e.target.value)}
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                                placeholder="Thanks for calling [Company]. How can I help you today?"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Knowledge Base</label>
                            <textarea
                                rows={4}
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                                defaultValue="We are a premier roofing company in Miami. We handle shingle, tile, and metal roofs. Our hours are 8am-6pm Mon-Fri. We offer free estimates."
                            />
                            <p className="mt-1 text-xs text-gray-500">Teach your AI about your business, hours, and services.</p>
                        </div>
                    </div>
                </div>

                {/* Email Marketing Section */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Email Marketing</h2>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div>
                                <div className="font-medium text-gray-900">SendGrid Integration</div>
                                <div className="text-sm text-gray-500">Connected as info@bizleadfinders.com</div>
                            </div>
                            <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">Configure</button>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                            <button className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left">
                                <div className="font-medium text-gray-900">Create Campaign</div>
                                <div className="text-sm text-gray-500 mt-1">Use AI to write a new email blast</div>
                            </button>
                            <button className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left">
                                <div className="font-medium text-gray-900">Manage Lists</div>
                                <div className="text-sm text-gray-500 mt-1">Import contacts or sync from CRM</div>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Buy Number Modal */}
            {showBuyModal && (
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg max-w-md w-full p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Get a New Number</h3>
                        <p className="text-sm text-gray-500 mb-4">
                            Search for a local number to use with your AI receptionist.
                        </p>

                        <div className="flex gap-2 mb-4">
                            <input
                                type="text"
                                placeholder="Area Code (e.g. 305)"
                                className="flex-1 rounded-md border-gray-300 border p-2 text-sm"
                            />
                            <button className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700">
                                Search
                            </button>
                        </div>

                        <div className="space-y-2 mb-6 max-h-48 overflow-y-auto">
                            {['(305) 555-0123', '(305) 555-0124', '(305) 555-0125'].map(num => (
                                <div key={num} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:bg-gray-50 cursor-pointer">
                                    <span className="font-medium text-gray-900">{num}</span>
                                    <span className="text-sm text-gray-500">$1.00/mo</span>
                                </div>
                            ))}
                        </div>

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowBuyModal(false)}
                                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => setShowBuyModal(false)}
                                className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md"
                            >
                                Buy Selected
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ToolsSettings;
