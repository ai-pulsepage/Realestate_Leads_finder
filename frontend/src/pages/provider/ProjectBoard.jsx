import React, { useState } from 'react';

/**
 * Project Board - The "Central Area" where Homeowners post work
 * Providers can view open projects and submit bids.
 */
const ProjectBoard = () => {
    // Mock data for now - will be replaced by API call
    const [projects, setProjects] = useState([
        {
            id: 1,
            title: 'Full Roof Replacement',
            homeowner: 'John D.',
            location: 'Miami, FL 33133',
            category: 'Roofing',
            budget: '$15k - $20k',
            posted: '2 days ago',
            description: 'Looking for a licensed roofer to replace 2500 sqft shingle roof. Permit required.',
            status: 'Open'
        },
        {
            id: 2,
            title: 'Kitchen Remodel',
            homeowner: 'Sarah M.',
            location: 'Coral Gables, FL 33134',
            category: 'Remodeling',
            budget: '$30k - $45k',
            posted: '1 day ago',
            description: 'Complete kitchen overhaul. Cabinets, countertops, and flooring. Design ready.',
            status: 'Open'
        },
        {
            id: 3,
            title: 'Emergency Pipe Fix',
            homeowner: 'Mike R.',
            location: 'Brickell, FL 33130',
            category: 'Plumbing',
            budget: '$500 - $1k',
            posted: '4 hours ago',
            description: 'Leaking pipe under sink. Need someone ASAP.',
            status: 'Urgent'
        }
    ]);

    const handleBidClick = (project) => {
        console.log('Bid clicked for:', project);
        // TODO: Open Bid Modal
    };

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Project Board</h1>
                        <p className="mt-2 text-gray-600">
                            Find active projects posted by homeowners in your area.
                        </p>
                    </div>
                    <div className="flex space-x-4">
                        <select className="bg-white border border-gray-300 rounded-md px-4 py-2 text-sm">
                            <option>All Categories</option>
                            <option>Roofing</option>
                            <option>Plumbing</option>
                            <option>Remodeling</option>
                        </select>
                        <select className="bg-white border border-gray-300 rounded-md px-4 py-2 text-sm">
                            <option>Within 25 miles</option>
                            <option>Within 50 miles</option>
                            <option>Anywhere</option>
                        </select>
                    </div>
                </div>

                <div className="grid gap-6">
                    {projects.map((project) => (
                        <div key={project.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="flex items-center space-x-3 mb-2">
                                        <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                                            {project.category}
                                        </span>
                                        {project.status === 'Urgent' && (
                                            <span className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                                                Urgent
                                            </span>
                                        )}
                                        <span className="text-sm text-gray-500">• Posted {project.posted}</span>
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 mb-2">{project.title}</h3>
                                    <p className="text-gray-600 mb-4 max-w-2xl">{project.description}</p>

                                    <div className="flex items-center space-x-6 text-sm text-gray-500">
                                        <div className="flex items-center">
                                            <span className="mr-2">📍</span> {project.location}
                                        </div>
                                        <div className="flex items-center">
                                            <span className="mr-2">💰</span> {project.budget}
                                        </div>
                                        <div className="flex items-center">
                                            <span className="mr-2">👤</span> {project.homeowner}
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={() => handleBidClick(project)}
                                    className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                                >
                                    Submit Bid
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ProjectBoard;
