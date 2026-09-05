// Test IDs for the auth feature (login, register, password reset, logout).
// Add new keys here as you wire up additional auth UI; see ./index.js for
// the recipe to add a new feature file.
//
// Directive:
//   - Keys are camelCase, values are kebab-case shaped as `<feature>-<element>`
//     (or `<feature>-<element>-<qualifier>` when an element repeats). Examples:
//     'login-submit-button', 'cart-quantity-input', 'product-card-image'.
//   - Reference them in JSX as `data-testid={LOGIN.submitButton}`.

export const LOGIN = {
\temailInput: 'login-email-input',
\tpasswordInput: 'login-password-input',
\tsubmitButton: 'login-submit-button',
\tforgotPasswordLink: 'login-forgot-password-link',
\tregisterLink: 'login-register-link',
};

export const REGISTER = {
\tnameInput: 'register-name-input',
\temailInput: 'register-email-input',
\tpasswordInput: 'register-password-input',
\tpasswordConfirmInput: 'register-password-confirm-input',
\tsubmitButton: 'register-submit-button',
\tloginLink: 'register-login-link',
};

export const LOGOUT = {
\tbutton: 'logout-button',
};
