import React, { useState, useEffect, useCallback } from 'react';
import { Upload, FileText, CheckCircle, XCircle, Clock, RefreshCw, Folder, ChevronRight, Play, Loader, Trash2 } from 'lucide-react';
import apiClient from '../../api/client';

const DataImport = () => {
    const [files, setFiles] = useState([]);
    const [counties, setCounties] = useState([]);
    const [selectedCounty, setSelectedCounty] = useState('MiamiDade');
    const [selectedDataType, setSelectedDataType] = useState('municipal_roll');
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [dragActive, setDragActive] = useState(false);
    const [importHistory, setImportHistory] = useState([]);
    const [activeTab, setActiveTab] = useState('upload');
    const [message, setMessage] = useState(null);

    useEffect(() => {
        loadFiles();
        loadCounties();
        loadHistory();
    }, [selectedCounty]);

    const loadFiles = async () => {
        try {
            const response = await apiClient.get('/admin/data/files', {
                params: { county: selectedCounty }
            });
            setFiles(response.data.files || []);
        } catch (err) {
            console.error('Error loading files:', err);
        }
    };

    const loadCounties = async () => {
        try {
            const response = await apiClient.get('/admin/data/counties');
            setCounties(response.data.counties || []);
        } catch (err) {
            console.error('Error loading counties:', err);
        }
    };

    const loadHistory = async () => {
        try {
            const response = await apiClient.get('/admin/data/import/history');
            setImportHistory(response.data.jobs || []);
        } catch (err) {
            console.error('Error loading history:', err);
        }
    };

    const handleDrag = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileUpload(e.dataTransfer.files[0]);
        }
    }, [selectedCounty, selectedDataType]);

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            handleFileUpload(e.target.files[0]);
        }
    };

    const handleFileUpload = async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('county', selectedCounty);
        formData.append('dataType', selectedDataType);

        setUploading(true);
        setUploadProgress(0);
        setMessage(null);

        try {
            const response = await apiClient.post('/admin/data/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                onUploadProgress: (progressEvent) => {
                    const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    setUploadProgress(progress);
                }
            });

            setMessage({ type: 'success', text: `File uploaded successfully: ${file.name}` });
            loadFiles();
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.error || 'Upload failed' });
        } finally {
            setUploading(false);
        }
    };

    const startImport = async (fileId) => {
        try {
            setMessage(null);
            await apiClient.post(`/admin/data/import/${fileId}`);
            setMessage({ type: 'success', text: 'Import job started. Refresh to see progress.' });
            loadFiles();
            loadHistory();
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to start import' });
        }
    };

    const deleteFile = async (fileId, filename) => {
        if (!window.confirm(`Delete "${filename}"?\n\nThis will remove the file and its import records.`)) {
            return;
        }
        try {
            setMessage(null);
            await apiClient.delete(`/admin/data/files/${fileId}`);
            setMessage({ type: 'success', text: `Deleted: ${filename}` });
            loadFiles();
            loadHistory();
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to delete file' });
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'completed':
                return <CheckCircle className="w-5 h-5 text-green-500" />;
            case 'failed':
                return <XCircle className="w-5 h-5 text-red-500" />;
            case 'processing':
            case 'running':
                return <Loader className="w-5 h-5 text-blue-500 animate-spin" />;
            default:
                return <Clock className="w-5 h-5 text-gray-400" />;
        }
    };

    const formatBytes = (bytes) => {
        if (!bytes) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleString();
    };

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Data Import</h1>
                    <p className="text-gray-600 mt-2">Upload and process Official Records and Property Appraiser data files</p>
                </div>

                {/* Message Banner */}
                {message && (
                    <div className={`mb-6 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                        {message.text}
                    </div>
                )}

                {/* Tabs */}
                <div className="flex border-b border-gray-200 mb-6">
                    {[
                        { id: 'upload', label: 'Upload Files' },
                        { id: 'files', label: 'Manage Files' },
                        { id: 'history', label: 'Import History' },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${activeTab === tab.id
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Upload Tab */}
                {activeTab === 'upload' && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                        {/* County & Data Type Selection */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">County</label>
                                <select
                                    value={selectedCounty}
                                    onChange={(e) => setSelectedCounty(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                    {counties.map(c => (
                                        <option key={c.id} value={c.id} disabled={!c.enabled}>
                                            {c.name} {!c.enabled && '(Coming Soon)'}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Data Type</label>
                                <select
                                    value={selectedDataType}
                                    onChange={(e) => setSelectedDataType(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                    <option value="municipal_roll">🏠 Municipal Roll (All Properties + Sales)</option>
                                    <option value="records">📋 Daily Records (Deeds, Liens)</option>
                                    <option value="property_appraiser">📊 Property Appraiser (Parcel Data)</option>
                                </select>
                                <p className="mt-1 text-xs text-gray-500">
                                    {selectedDataType === 'municipal_roll' && 'Complete property data with addresses, owners, and last 3 sales. Best for new homeowner leads.'}
                                    {selectedDataType === 'records' && 'Daily deed recordings from Clerk of Courts. Use for up-to-date sale transactions.'}
                                    {selectedDataType === 'property_appraiser' && 'Basic parcel data without sales. Use for property info updates.'}
                                </p>
                            </div>
                        </div>

                        {/* GCS Path Preview */}
                        <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="flex items-center text-sm text-gray-600">
                                <Folder className="w-4 h-4 mr-2" />
                                <span>Upload destination: </span>
                                <code className="ml-2 text-blue-600 font-mono">
                                    {selectedCounty}/{selectedDataType === 'property_appraiser' ? 'PropertyAppraiser' : 'Records'}/
                                </code>
                            </div>
                        </div>

                        {/* Drop Zone */}
                        <div
                            onDragEnter={handleDrag}
                            onDragLeave={handleDrag}
                            onDragOver={handleDrag}
                            onDrop={handleDrop}
                            className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${dragActive
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-300 hover:border-gray-400'
                                }`}
                        >
                            {uploading ? (
                                <div className="space-y-4">
                                    <Loader className="w-12 h-12 mx-auto text-blue-500 animate-spin" />
                                    <p className="text-gray-600">Uploading... {uploadProgress}%</p>
                                    <div className="w-64 mx-auto bg-gray-200 rounded-full h-2">
                                        <div
                                            className="bg-blue-500 h-2 rounded-full transition-all"
                                            style={{ width: `${uploadProgress}%` }}
                                        />
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <Upload className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                                    <p className="text-xl font-medium text-gray-700 mb-2">
                                        Drop files here or click to upload
                                    </p>
                                    <p className="text-gray-500 text-sm mb-4">
                                        Supports .zip, .exp, .xls, .csv files up to 100MB
                                    </p>
                                    <input
                                        type="file"
                                        onChange={handleFileChange}
                                        accept=".zip,.exp,.xls,.csv"
                                        className="hidden"
                                        id="file-input"
                                    />
                                    <label
                                        htmlFor="file-input"
                                        className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 cursor-pointer transition-colors"
                                    >
                                        <Upload className="w-5 h-5 mr-2" />
                                        Select File
                                    </label>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* Files Tab */}
                {activeTab === 'files' && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                            <h2 className="text-lg font-medium">Uploaded Files</h2>
                            <button
                                onClick={loadFiles}
                                className="flex items-center px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900"
                            >
                                <RefreshCw className="w-4 h-4 mr-1" />
                                Refresh
                            </button>
                        </div>

                        {files.length === 0 ? (
                            <div className="p-12 text-center text-gray-500">
                                <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                                <p>No files uploaded yet</p>
                            </div>
                        ) : (
                            <table className="w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">File</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Size</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Imported</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {files.map(file => (
                                        <tr key={file.file_id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3">
                                                <div className="flex items-center">
                                                    <FileText className="w-5 h-5 text-gray-400 mr-2" />
                                                    <div>
                                                        <div className="font-medium text-gray-900">{file.original_filename}</div>
                                                        <div className="text-xs text-gray-500">{formatDate(file.uploaded_at)}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100">
                                                    {file.data_type} / {file.file_subtype || 'upload'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600">
                                                {formatBytes(file.file_size_bytes)}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center">
                                                    {getStatusIcon(file.status)}
                                                    <span className="ml-2 text-sm capitalize">{file.status}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600">
                                                {file.records_imported?.toLocaleString() || '-'}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center space-x-2">
                                                    {file.status === 'pending' && (
                                                        <button
                                                            onClick={() => startImport(file.file_id)}
                                                            className="flex items-center px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
                                                        >
                                                            <Play className="w-4 h-4 mr-1" />
                                                            Import
                                                        </button>
                                                    )}
                                                    {file.status === 'completed' && (
                                                        <span className="text-sm text-green-600">✓ Imported</span>
                                                    )}
                                                    <button
                                                        onClick={() => deleteFile(file.file_id, file.original_filename)}
                                                        className="flex items-center px-2 py-1.5 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                                                        title="Delete file"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}

                {/* History Tab */}
                {activeTab === 'history' && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                            <h2 className="text-lg font-medium">Import History</h2>
                            <button
                                onClick={loadHistory}
                                className="flex items-center px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900"
                            >
                                <RefreshCw className="w-4 h-4 mr-1" />
                                Refresh
                            </button>
                        </div>

                        {importHistory.length === 0 ? (
                            <div className="p-12 text-center text-gray-500">
                                <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                                <p>No import jobs yet</p>
                            </div>
                        ) : (
                            <table className="w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">File</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Started</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Processed</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Imported</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {importHistory.map(job => (
                                        <tr key={job.job_id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3">
                                                <div className="font-medium text-gray-900">{job.original_filename}</div>
                                                <div className="text-xs text-gray-500">{job.county} / {job.data_type}</div>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600">
                                                {formatDate(job.started_at)}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center">
                                                    {getStatusIcon(job.status)}
                                                    <span className="ml-2 text-sm capitalize">{job.status}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600">
                                                {job.records_processed?.toLocaleString() || '-'}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600">
                                                {job.records_imported?.toLocaleString() || '-'}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600">
                                                {job.completed_at && job.started_at
                                                    ? `${((new Date(job.completed_at) - new Date(job.started_at)) / 1000).toFixed(1)}s`
                                                    : '-'
                                                }
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default DataImport;
