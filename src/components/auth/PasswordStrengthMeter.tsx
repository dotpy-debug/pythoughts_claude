import { useMemo } from 'react';
import { Check, X } from 'lucide-react';

interface PasswordStrengthMeterProps {
  password: string;
  showRequirements?: boolean;
}

export type PasswordStrength = 'weak' | 'medium' | 'strong' | 'very-strong';

export interface PasswordCriteria {
  minLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
}

export function calculatePasswordStrength(password: string): {
  strength: PasswordStrength;
  score: number;
  criteria: PasswordCriteria;
} {
  const criteria: PasswordCriteria = {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password),
  };

  const score = Object.values(criteria).filter(Boolean).length;

  let strength: PasswordStrength = 'weak';
  if (score >= 5) {
    strength = 'very-strong';
  } else if (score >= 4) {
    strength = 'strong';
  } else if (score >= 3) {
    strength = 'medium';
  }

  return { strength, score, criteria };
}

export function PasswordStrengthMeter({ password, showRequirements = true }: PasswordStrengthMeterProps) {
  const { strength, score: _score, criteria } = useMemo(
    () => calculatePasswordStrength(password),
    [password]
  );

  if (!password) {
    return null;
  }

  const strengthConfig = {
    weak: {
      label: 'Weak',
      color: 'bg-red-500',
      textColor: 'text-red-400',
      width: '25%',
    },
    medium: {
      label: 'Medium',
      color: 'bg-orange-500',
      textColor: 'text-orange-400',
      width: '50%',
    },
    strong: {
      label: 'Strong',
      color: 'bg-terminal-blue',
      textColor: 'text-terminal-blue',
      width: '75%',
    },
    'very-strong': {
      label: 'Very Strong',
      color: 'bg-terminal-green',
      textColor: 'text-terminal-green',
      width: '100%',
    },
  };

  const config = strengthConfig[strength];

  const requirements = [
    { label: 'At least 8 characters', met: criteria.minLength },
    { label: 'One uppercase letter', met: criteria.hasUppercase },
    { label: 'One lowercase letter', met: criteria.hasLowercase },
    { label: 'One number', met: criteria.hasNumber },
    { label: 'One special character', met: criteria.hasSpecial },
  ];

  return (
    <div className="space-y-2">
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono text-gray-500">Password Strength:</span>
          <span className={`text-xs font-mono font-semibold ${config.textColor}`}>
            {config.label}
          </span>
        </div>
        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
          <div
            className={`h-full ${config.color} transition-all duration-300 ease-out`}
            style={{ width: config.width }}
          />
        </div>
      </div>

      {showRequirements && (
        <div className="space-y-1.5 pt-1">
          {requirements.map((req, index) => (
            <div
              key={index}
              className={`flex items-center space-x-2 text-xs font-mono transition-colors duration-200 ${
                req.met ? 'text-terminal-green' : 'text-gray-500'
              }`}
            >
              {req.met ? (
                <Check size={14} className="flex-shrink-0" />
              ) : (
                <X size={14} className="flex-shrink-0" />
              )}
              <span>{req.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
