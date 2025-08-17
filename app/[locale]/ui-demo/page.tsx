/**
 * UI Demo Page - Simple test page
 */

export default function UIDemo() {
  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f9fafb', 
      padding: '2rem',
      fontSize: '16px',
      color: '#000'
    }}>
      <div style={{ maxWidth: '64rem', margin: '0 auto' }}>
        
        {/* Simple Header Test */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ 
            fontSize: '2rem', 
            fontWeight: 'bold', 
            color: '#111827', 
            marginBottom: '0.5rem' 
          }}>
            UI Component Demo
          </h1>
          <p style={{ 
            color: '#6b7280', 
            marginBottom: '1rem' 
          }}>
            Testing the GreenMetrics design system
          </p>
          <button style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '0.375rem',
            cursor: 'pointer'
          }}>
            Test Button
          </button>
        </div>

        {/* Simple Cards Test */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
          gap: '1.5rem',
          marginBottom: '2rem'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            border: '1px solid #e5e7eb',
            padding: '1.5rem',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
          }}>
            <h3 style={{ 
              fontSize: '0.875rem', 
              fontWeight: '500', 
              color: '#374151', 
              marginBottom: '0.5rem' 
            }}>
              Sample KPI
            </h3>
            <div style={{ 
              fontSize: '1.875rem', 
              fontWeight: 'bold', 
              color: '#111827', 
              marginBottom: '0.25rem' 
            }}>
              2,847
            </div>
            <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>t CO₂e</p>
            <div style={{ 
              marginTop: '0.5rem', 
              fontSize: '0.75rem', 
              color: '#dc2626' 
            }}>
              ↘ 12.3% vs last month
            </div>
          </div>
          
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            border: '1px solid #e5e7eb',
            padding: '1.5rem',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
          }}>
            <h3 style={{ 
              fontSize: '0.875rem', 
              fontWeight: '500', 
              color: '#374151', 
              marginBottom: '0.5rem' 
            }}>
              ESG Score
            </h3>
            <div style={{ 
              fontSize: '1.875rem', 
              fontWeight: 'bold', 
              color: '#111827', 
              marginBottom: '0.25rem' 
            }}>
              87.2
            </div>
            <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>/100</p>
            <div style={{ 
              marginTop: '0.5rem', 
              fontSize: '0.75rem', 
              color: '#16a34a' 
            }}>
              ↗ 2.1% vs last month
            </div>
          </div>
          
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            border: '1px solid #e5e7eb',
            padding: '1.5rem',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
          }}>
            <h3 style={{ 
              fontSize: '0.875rem', 
              fontWeight: '500', 
              color: '#374151', 
              marginBottom: '0.5rem' 
            }}>
              Active Items
            </h3>
            <div style={{ 
              fontSize: '1.875rem', 
              fontWeight: 'bold', 
              color: '#111827', 
              marginBottom: '0.25rem' 
            }}>
              156
            </div>
            <div style={{ 
              marginTop: '0.5rem', 
              fontSize: '0.75rem', 
              color: '#16a34a' 
            }}>
              ↗ 8.7% vs last month
            </div>
          </div>
        </div>

        {/* Simple Progress Demo */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '0.5rem',
          border: '1px solid #e5e7eb',
          padding: '1.5rem',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
          maxWidth: '500px'
        }}>
          <h3 style={{ 
            fontSize: '1.125rem', 
            fontWeight: '600', 
            color: '#111827', 
            marginBottom: '1rem' 
          }}>
            Coverage Progress
          </h3>
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              fontSize: '0.875rem',
              marginBottom: '0.25rem'
            }}>
              <span>Scope 1 Coverage</span>
              <span>234/250</span>
            </div>
            <div style={{
              width: '100%',
              backgroundColor: '#e5e7eb',
              borderRadius: '9999px',
              height: '0.5rem'
            }}>
              <div style={{
                backgroundColor: '#2563eb',
                height: '0.5rem',
                borderRadius: '9999px',
                width: '93.6%'
              }}></div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
