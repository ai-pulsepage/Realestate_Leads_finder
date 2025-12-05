import React, { useState } from 'react';

/**
 * Tools & Settings - Configuration for AI, Twilio, and Email
 */
const ToolsSettings = () => {
    const [aiEnabled, setAiEnabled] = useState(true);
    const [forwardingNumber, setForwardingNumber] = useState('+1 (555) 123-4567');
    const [twilioNumber, setTwilioNumber] = useState('+1 (786) 555-0199');

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold text-gray-900 mb-8">Tools & Configuration</h1>

                {/* Voice AI Section */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Voice AI Receptionist</h2>
                            <p className="text-gray-600 text-sm mt-1">
                                Configure your AI agent to answer missed calls and qualify leads.
                            </p>
                        </div>
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
                                <button className="bg-gray-100 px-4 py-2 border border-l-0 border-gray-300 rounded-r-md text-sm font-medium text-gray-700 hover:bg-gray-200">
                                    Change
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Call Forwarding Number</label>
                            <input
                                type="text"
                                value={forwardingNumber}
                                onChange={(e) => setForwardingNumber(e.target.value)}
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                            />
                            <p className="mt-1 text-xs text-gray-500">Calls forwarded here when AI is off.</p>
                        </div>
                    </div>

                    <div className="mt-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">AI Knowledge Base</label>
                        <textarea
                            rows={4}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                            defaultValue="We are a premier roofing company in Miami. We handle shingle, tile, and metal roofs. Our hours are 8am-6pm Mon-Fri. We offer free estimates."
                        />
                        <p className="mt-1 text-xs text-gray-500">Teach your AI about your business, hours, and services.</p>
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
        </div>
    );
};

export default ToolsSettings;
