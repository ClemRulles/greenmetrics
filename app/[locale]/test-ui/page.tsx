/**
 * Simple UI Test Page - Basic test for CSS loading
 */
'use client';

import React from 'react';

export default function TestUI() {
  return (
    <div className="min-h-screen p-8 bg-blue-100">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-blue-900 mb-8">
          UI Test Page
        </h1>
        
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">
            Basic Styling Test
          </h2>
          <p className="text-gray-600 mb-4">
            If you can see this styled content, CSS is loading correctly.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-green-100 p-4 rounded border-l-4 border-green-500">
              <h3 className="text-green-800 font-medium">Success Box</h3>
              <p className="text-green-700 text-sm">This should be green.</p>
            </div>
            
            <div className="bg-red-100 p-4 rounded border-l-4 border-red-500">
              <h3 className="text-red-800 font-medium">Alert Box</h3>
              <p className="text-red-700 text-sm">This should be red.</p>
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-purple-400 to-pink-400 p-6 rounded-lg text-white">
          <h2 className="text-2xl font-bold mb-2">Gradient Test</h2>
          <p>If you see a purple to pink gradient, Tailwind is working!</p>
        </div>
      </div>
    </div>
  );
}
