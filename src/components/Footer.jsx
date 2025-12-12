import React from 'react';
import packageJson from '../../package.json';

const Footer = () => {
    return (
        <footer style={{
            textAlign: 'center',
            padding: '1rem',
            marginTop: 'auto',
            color: 'var(--text-secondary)',
            fontSize: '0.8rem',
            borderTop: '1px solid var(--border-color)'
        }}>
            <p>Halı Saha İstatistik v{packageJson.version}</p>
        </footer>
    );
};

export default Footer;
