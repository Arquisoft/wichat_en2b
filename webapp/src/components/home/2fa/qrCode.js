import React from "react";
import "../../../styles/home/2fa/qrCode.css";

export default function QrCode({ imgUrl }) {
  console.log(imgUrl);
  return (
    <div className="qrcode-container">
      {imgUrl ? (
        <img src={imgUrl} alt="QR Code for 2FA" className="qrcode-img" />
      ) : (
        <p>QR Code is not available.</p>
      )}
    </div>
  );
}
