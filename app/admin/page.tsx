'use client';

import { useState } from 'react';

interface Lead {
    id: string;
    naam: string;
    email: string;
    risicoscore: string;
    createdAt: string;
}

const STYLES = {
    page: {
        minHeight: '100vh',
        backgroundColor: '#0A0A0A',
        color: '#E0E0E0',
        fontFamily: 'Inter, sans-serif',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
    } as React.CSSProperties,
    card: {
        backgroundColor: '#111111',
        border: '1px solid #2A2A2A',
        borderRadius: '4px',
        padding: '3rem',
        width: '100%',
        maxWidth: '400px',
    } as React.CSSProperties,
    heading: {
        fontFamily: '"Cormorant Garamond", serif',
        fontSize: '2rem',
        fontWeight: 400,
        color: '#C9A84C',
        marginBottom: '0.5rem',
        letterSpacing: '0.04em',
    } as React.CSSProperties,
    subheading: {
        fontSize: '0.85rem',
        color: '#888',
        marginBottom: '2rem',
    } as React.CSSProperties,
    label: {
        display: 'block',
        fontSize: '0.75rem',
        letterSpacing: '0.1em',
        textTransform: 'uppercase' as const,
        color: '#888',
        marginBottom: '0.5rem',
    } as React.CSSProperties,
    input: {
        width: '100%',
        padding: '0.75rem 1rem',
        backgroundColor: '#0A0A0A',
        border: '1px solid #2A2A2A',
        borderRadius: '2px',
        color: '#E0E0E0',
        fontSize: '0.95rem',
        outline: 'none',
        boxSizing: 'border-box' as const,
        marginBottom: '1.5rem',
    } as React.CSSProperties,
    button: {
        width: '100%',
        padding: '0.75rem 1rem',
        backgroundColor: '#C9A84C',
        border: 'none',
        borderRadius: '2px',
        color: '#0A0A0A',
        fontSize: '0.85rem',
        fontWeight: 600,
        letterSpacing: '0.1em',
        textTransform: 'uppercase' as const,
        cursor: 'pointer',
    } as React.CSSProperties,
    errorText: {
        fontSize: '0.8rem',
        color: '#E05A4E',
        marginTop: '-1rem',
        marginBottom: '1rem',
    } as React.CSSProperties,
    tableContainer: {
        width: '100%',
        maxWidth: '1100px',
        margin: '0 auto',
    } as React.CSSProperties,
    tableHeading: {
        fontFamily: '"Cormorant Garamond", serif',
        fontSize: '2.2rem',
        fontWeight: 400,
        color: '#C9A84C',
        marginBottom: '0.25rem',
        letterSpacing: '0.04em',
    } as React.CSSProperties,
    tableSubheading: {
        fontSize: '0.85rem',
        color: '#888',
        marginBottom: '2rem',
    } as React.CSSProperties,
    table: {
        width: '100%',
        borderCollapse: 'collapse' as const,
        border: '1px solid #2A2A2A',
    } as React.CSSProperties,
    th: {
        padding: '0.9rem 1.25rem',
        textAlign: 'left' as const,
        fontSize: '0.7rem',
        letterSpacing: '0.1em',
        textTransform: 'uppercase' as const,
        color: '#888',
        borderBottom: '1px solid #2A2A2A',
        backgroundColor: '#111111',
        fontWeight: 500,
    } as React.CSSProperties,
    td: {
        padding: '0.9rem 1.25rem',
        fontSize: '0.9rem',
        color: '#E0E0E0',
        borderBottom: '1px solid #1A1A1A',
    } as React.CSSProperties,
};

function RiscoBadge({ score }: { score: string }) {
    const upper = score?.toUpperCase?.() ?? '';
    let bg = '#888';
    let color = '#0A0A0A';
    let label = score;

    if (upper === 'HIGH' || upper === 'HOOG') {
        bg = '#C9A84C';
        color = '#0A0A0A';
        label = 'HOOG';
    } else if (upper === 'MEDIUM') {
        bg = '#E0E0E0';
        color = '#111111';
        label = 'MEDIUM';
    } else if (upper === 'LOW' || upper === 'LAAG') {
        bg = '#888';
        color = '#0A0A0A';
        label = 'LAAG';
    }

    return (
        <span style={{
            display: 'inline-block',
            padding: '0.2rem 0.65rem',
            borderRadius: '2px',
            backgroundColor: bg,
            color,
            fontSize: '0.7rem',
            fontWeight: 700,
            letterSpacing: '0.1em',
        }}>
            {label}
        </span>
    );
}

function formatDate(iso: string): string {
    if (!iso) return '—';
    try {
        return new Date(iso).toLocaleDateString('nl-NL', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        });
    } catch {
        return iso;
    }
}

export default function AdminPage() {
    const [password, setPassword] = useState('');
    const [leads, setLeads] = useState<Lead[] | null>(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        if (!password) return;
        setLoading(true);
        setError('');
        try {
            const res = await fetch(`/api/admin/leads?pw=${encodeURIComponent(password)}`);
            if (res.status === 401) {
                setError('Ongeldig wachtwoord.');
                setLoading(false);
                return;
            }
            if (!res.ok) {
                setError('Er is een fout opgetreden. Probeer opnieuw.');
                setLoading(false);
                return;
            }
            const data = await res.json();
            setLeads(data.leads);
        } catch {
            setError('Verbindingsfout. Probeer opnieuw.');
        }
        setLoading(false);
    };

    if (leads !== null) {
        return (
            <div style={{ ...STYLES.page, alignItems: 'flex-start', paddingTop: '3rem' }}>
                <div style={STYLES.tableContainer}>
                    <h1 style={STYLES.tableHeading}>Admin Dashboard</h1>
                    <p style={STYLES.tableSubheading}>{leads.length} lead{leads.length !== 1 ? 's' : ''} gevonden</p>
                    <table style={STYLES.table}>
                        <thead>
                            <tr>
                                <th style={STYLES.th}>Naam</th>
                                <th style={STYLES.th}>Email</th>
                                <th style={STYLES.th}>Risicoscore</th>
                                <th style={STYLES.th}>Datum</th>
                            </tr>
                        </thead>
                        <tbody>
                            {leads.length === 0 && (
                                <tr>
                                    <td colSpan={4} style={{ ...STYLES.td, color: '#888', textAlign: 'center' }}>
                                        Geen leads gevonden.
                                    </td>
                                </tr>
                            )}
                            {leads.map((lead) => (
                                <tr key={lead.id} style={{ transition: 'background 0.15s' }}>
                                    <td style={STYLES.td}>{lead.naam || '—'}</td>
                                    <td style={STYLES.td}>{lead.email || '—'}</td>
                                    <td style={STYLES.td}><RiscoBadge score={lead.risicoscore} /></td>
                                    <td style={{ ...STYLES.td, color: '#888' }}>{formatDate(lead.createdAt)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }

    return (
        <div style={STYLES.page}>
            <div style={STYLES.card}>
                <h1 style={STYLES.heading}>Admin</h1>
                <p style={STYLES.subheading}>Voer het wachtwoord in om toegang te krijgen.</p>
                <label style={STYLES.label}>Wachtwoord</label>
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                    placeholder="••••••••"
                    style={STYLES.input}
                    autoFocus
                />
                {error && <p style={STYLES.errorText}>{error}</p>}
                <button
                    onClick={handleLogin}
                    disabled={loading}
                    style={{ ...STYLES.button, opacity: loading ? 0.6 : 1 }}
                >
                    {loading ? 'Laden...' : 'Inloggen'}
                </button>
            </div>
        </div>
    );
}
