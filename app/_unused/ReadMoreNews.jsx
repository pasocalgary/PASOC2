// Originally located at: app/(Navigation)/(Members)/UI/ReadMoreNews.jsx
import React from 'react';

export function ReadMore({ Title, Description, onCancel }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/50">
            <div className="relative max-w-3xl mx-auto p-6 bg-white rounded-lg shadow-md">

                <button
                    className="absolute top-4 right-4 text-gray-400 text-2xl font-bold hover:text-red-400"
                    onClick={onCancel}
                >
                    X
                </button>

                <h2 className="text-2xl font-bold text-gray-900 mb-4">{Title}</h2>

                <p className="text-gray-700 leading-relaxed mb-6">
                    {Description}
                </p>

            </div>
        </div>
    );
}