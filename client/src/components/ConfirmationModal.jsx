import React from 'react';

const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message, cost, currentBalance, isLoading }) => {
    if (!isOpen) return null;

    const newBalance = currentBalance - cost;
    const isInsufficient = newBalance < 0;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md p-6 transform transition-all scale-100">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    {title || 'Confirm Action'}
                </h3>

                <p className="text-gray-600 dark:text-gray-300 mb-6">
                    {message || 'Are you sure you want to proceed?'}
                </p>

                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6 space-y-2">
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-500 dark:text-gray-400">Current Balance:</span>
                        <span className="font-medium text-gray-900 dark:text-white">{currentBalance} Tokens</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-500 dark:text-gray-400">Cost:</span>
                        <span className="font-bold text-red-500">-{cost} Tokens</span>
                    </div>
                    <div className="border-t border-gray-200 dark:border-gray-600 pt-2 flex justify-between text-base font-bold">
                        <span className="text-gray-700 dark:text-gray-200">New Balance:</span>
                        <span className={isInsufficient ? "text-red-600" : "text-green-600"}>
                            {newBalance} Tokens
                        </span>
                    </div>
                </div>

                {isInsufficient && (
                    <div className="mb-4 p-3 bg-red-100 border border-red-200 text-red-700 rounded-lg text-sm">
                        ⚠️ You do not have enough tokens for this action. Please purchase more.
                    </div>
                )}

                <div className="flex justify-end space-x-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                        disabled={isLoading}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isInsufficient || isLoading}
                        className={`px-4 py-2 text-white rounded-lg transition-colors flex items-center ${isInsufficient
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-blue-600 hover:bg-blue-700'
                            }`}
                    >
                        {isLoading ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Processing...
                            </>
                        ) : (
                            'Confirm & Pay'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;
