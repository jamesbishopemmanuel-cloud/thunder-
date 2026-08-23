/**
 * Validation Utilities
 * Veylora - Connect • Create • Share
 */

export function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validatePhoneNumber(phone) {
  // Nigerian phone number validation
  const phoneRegex = /^(\+234|234|0)?[789]\d{9}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
}

export function validatePassword(password) {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special character
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
}

export function validateUsername(username) {
  // 3-20 characters, alphanumeric and underscores only
  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
  return usernameRegex.test(username);
}

export function validateUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function validateNotEmpty(value) {
  return value && value.trim().length > 0;
}

export function validateMinLength(value, min) {
  return value && value.length >= min;
}

export function validateMaxLength(value, max) {
  return value && value.length <= max;
}

export function validateMatch(value1, value2) {
  return value1 === value2;
}

export function getPasswordStrength(password) {
  let strength = 0;
  
  if (password.length >= 8) strength++;
  if (password.length >= 12) strength++;
  if (/[a-z]/.test(password)) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/\d/.test(password)) strength++;
  if (/[@$!%*?&]/.test(password)) strength++;
  
  if (strength <= 2) return 'weak';
  if (strength <= 4) return 'medium';
  return 'strong';
}

export function validateForm(data, schema) {
  const errors = {};
  
  for (const [key, rule] of Object.entries(schema)) {
    const value = data[key];
    
    if (rule.required && !validateNotEmpty(value)) {
      errors[key] = `${key} is required`;
      continue;
    }
    
    if (!value) continue;
    
    if (rule.type === 'email' && !validateEmail(value)) {
      errors[key] = 'Invalid email address';
    } else if (rule.type === 'phone' && !validatePhoneNumber(value)) {
      errors[key] = 'Invalid phone number';
    } else if (rule.type === 'password' && !validatePassword(value)) {
      errors[key] = 'Password must be at least 8 characters with uppercase, lowercase, number, and special character';
    } else if (rule.type === 'username' && !validateUsername(value)) {
      errors[key] = 'Username must be 3-20 characters, alphanumeric and underscores only';
    } else if (rule.type === 'url' && !validateUrl(value)) {
      errors[key] = 'Invalid URL';
    } else if (rule.minLength && !validateMinLength(value, rule.minLength)) {
      errors[key] = `${key} must be at least ${rule.minLength} characters`;
    } else if (rule.maxLength && !validateMaxLength(value, rule.maxLength)) {
      errors[key] = `${key} must be no more than ${rule.maxLength} characters`;
    } else if (rule.match && !validateMatch(value, data[rule.match])) {
      errors[key] = `${key} does not match`;
    }
  }
  
  return errors;
}
