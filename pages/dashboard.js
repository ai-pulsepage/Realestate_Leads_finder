// Dashboard Page
// Search and map

import Layout from '../components/layout';
import { useState } from 'react';

export default function Dashboard() {
  const [properties, setProperties] = useState([]);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    try {
      const res = await fetch('/api/properties?zip_code=33040');
      if (!res.ok) throw new Error('Search failed');
      const data = await res.json();
      setProperties(data);
      setError('');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <Layout>
      <input placeholder="Search" />
      <button onClick={handleSearch}>Search</button>
      {error && <div style={{ color: 'red' }}>{error}</div>}
      <div>
        {properties.map(p => <div key={p.property_id}>{p.address}</div>)}
      </div>
    </Layout>
  );
}