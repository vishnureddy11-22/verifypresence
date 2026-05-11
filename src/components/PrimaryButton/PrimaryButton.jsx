import React from 'react';
import './PrimaryButton.css';

export function PrimaryButton({ children, className = '', variant = 'primary', ...props }) {
  return (
    <button className={`btn btn-${variant} hover-lift ${className}`} {...props}>
      {children}
    </button>
  );
}
