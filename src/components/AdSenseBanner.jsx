import React, { useEffect } from 'react';

const AdSenseBanner = () => {
    useEffect(() => {
        try {
            (window.adsbygoogle = window.adsbygoogle || []).push({});
        } catch (e) {
            console.error("AdSense error", e);
        }
    }, []);

    return (
        <div style={{ margin: '2rem 0', textAlign: 'center', overflow: 'hidden' }}>
            <ins className="adsbygoogle"
                style={{ display: 'block' }}
                data-ad-client="ca-pub-1046887903835726"
                data-ad-slot="3103142227"
                data-ad-format="auto"
                data-full-width-responsive="true"></ins>
        </div>
    );
};

export default AdSenseBanner;
