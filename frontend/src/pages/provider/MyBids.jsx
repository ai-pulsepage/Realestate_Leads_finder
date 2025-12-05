import React, { useState } from 'react';

/**
 * My Bids - Tracks bids submitted by the provider
 */
const MyBids = () => {
    // Mock data
    const [bids, setBids] = useState([
        {
            id: 101,
            projectTitle: 'Master Bath Reno',
            amount: '$12,500',
            submittedDate: '2023-10-15',
            status: 'Pending',
            homeowner: 'Alice W.'
        },
        {
            id: 102,
            projectTitle: 'Driveway Pavers',
            amount: '$8,200',
            submittedDate: '2023-10-10',
            status: 'Accepted',
            homeowner: 'Robert T.'
        },
        {
            id: 103,
            projectTitle: 'AC Unit Install',
            amount: '$4,500',
            submittedDate: '2023-10-05',
            status: 'Rejected',
            homeowner: 'James L.'
        }
    ]);

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-7xl mx-auto">
                <h1 className="text-3xl font-bold text-gray-900 mb-8">My Bids</h1>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bid Amount</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submitted</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {bids.map((bid) => (
                                <tr key={bid.id}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">{bid.projectTitle}</div>
                                        <div className="text-sm text-gray-500">Client: {bid.homeowner}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900">{bid.amount}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-500">{bid.submittedDate}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                      ${bid.status === 'Accepted' ? 'bg-green-100 text-green-800' :
                                                bid.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                                                    'bg-yellow-100 text-yellow-800'}`}>
                                            {bid.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <button className="text-blue-600 hover:text-blue-900 mr-4">View</button>
                                        {bid.status === 'Pending' && (
                                            <button className="text-red-600 hover:text-red-900">Retract</button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default MyBids;
