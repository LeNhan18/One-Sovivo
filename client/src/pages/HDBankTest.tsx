import React from 'react';
import HDBankCard from '../components/HDBankCard';

const HDBankTestPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-indigo-900 p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8 text-center">HDBank Component Test</h1>
        <HDBankCard 
          customerId={2003} 
          onSuccess={() => {
            console.log('HDBank action completed!');
          }}
        />
      </div>
    </div>
  );
};

export default HDBankTestPage;
