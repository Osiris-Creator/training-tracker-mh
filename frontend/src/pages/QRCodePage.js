import React, { useState } from 'react';
import QRCode from 'react-qr-code';
import './QRCodePage.css';

function QRCodePage() {
  const formUrl = window.location.origin + '/form';
  const [copied, setCopied] = useState(false);

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(formUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadQR = () => {
    const svg = document.getElementById('qr-code');
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL('image/png');

      const downloadLink = document.createElement('a');
      downloadLink.download = 'training-form-qr.png';
      downloadLink.href = pngFile;
      downloadLink.click();
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  return (
    <div className="qr-container">
      <div className="qr-card">
        <div className="qr-header">
          <span className="eyebrow-pill">Quick Access</span>
          <h1 className="qr-title">
            QR Code for <em>Training Form</em>
          </h1>
          <p className="qr-subtitle">
            Scan to access the training record form
          </p>
        </div>

        <div className="qr-code-wrapper">
          <div className="qr-code-box">
            <QRCode
              id="qr-code"
              value={formUrl}
              size={256}
              level="H"
              fgColor="#1F2421"
              bgColor="#FFFFFF"
            />
          </div>
        </div>

        <div className="qr-actions">
          <button onClick={handleDownloadQR} className="action-button primary">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            Download QR Code
          </button>

          <button onClick={handleCopyUrl} className="action-button secondary">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            {copied ? 'Copied ✓' : 'Copy URL'}
          </button>
        </div>

        <div className="url-display">
          <div className="url-label">Form URL:</div>
          <div className="url-value">{formUrl}</div>
        </div>

        <div className="qr-instructions">
          <h3 className="instructions-title">How to Use</h3>
          <ol className="instructions-list">
            <li>Download the QR Code above</li>
            <li>Print or display the QR Code for employees to see</li>
            <li>Employees scan the QR Code to access the form</li>
            <li>Fill in the training information and submit</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

export default QRCodePage;
