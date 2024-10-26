import React, { useState, useEffect } from 'react';
import './PaymentForm.css';

const PaymentForm = () => {
  const [amount, setAmount] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = `https://www.paypal.com/sdk/js?client-id=${process.env.REACT_APP_PAYPAL_CLIENT_ID}&currency=USD`;
    script.async = true;
    script.onload = () => {
      if (window.paypal) {
        window.paypal.Buttons({
          createOrder: async () => {
            try {
              const response = await fetch('http://localhost:5000/api/create-paypal-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: parseFloat(amount) }),
              });
              const order = await response.json();
              return order.id;
            } catch (err) {
              setError('Failed to create PayPal order');
              console.error(err);
            }
          },
          onApprove: async (data, actions) => {
            try {
              const details = await actions.order.capture();
              console.log('Payment successful!', details);
              // Handle successful payment (e.g., show a success message, redirect)
            } catch (err) {
              setError('Failed to process payment');
              console.error(err);
            }
          },
        }).render('#paypal-button-container');
      }
    };
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, [amount]);

  return (
    <div className="payment-form-container">
      <h2>Payment Details</h2>
      <div className="form-group">
        <label htmlFor="amount">Amount (USD)</label>
        <input
          type="number"
          id="amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Enter amount"
          required
        />
      </div>
      {error && <div className="error-message">{error}</div>}
      <div id="paypal-button-container"></div>
    </div>
  );
};

export default PaymentForm;