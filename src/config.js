/**
 * Central API configuration.
 *
 * The whole app talks to the single Sangam Wholesale backend (the same one the
 * customer Udaan app uses). Change HOST in this one place to point everything
 * at a different backend. The backend listens on port 5000.
 */

// Root host, no trailing slash.
//
// LOCAL DEV (current): backend on this PC at port 5000, reached over USB.
//   Run once:  adb reverse tcp:5000 tcp:5000
//   Then the phone's localhost:5000 tunnels to this PC's backend over USB.
//   (No WiFi / LAN IP / firewall needed with adb reverse.)
// PRODUCTION: switch back to 'http://localhost:5000'.
export const HOST = 'http://localhost:5000';

// Common API bases built from HOST.
export const BASE_URL = `${HOST}/api`;

// Base used by the Notifications screen.
export const USER_API = `${HOST}/api/user`;

// Delivery-partner auth (register / OTP login / profile).
export const DRIVER_API = `${HOST}/api/driver`;

// Delivery operations (order lists, accept, start, verify OTP, undelivered).
export const DELIVERY_API = `${HOST}/api/delivery`;

// Helpers for asset URLs used around the app.
// Product images are served from the backend uploads root.
export const productImageUrl = file => `${HOST}/products/${file}`;
export const driverImageUrl = file => `${HOST}/${file}`;

export default {
  HOST,
  BASE_URL,
  USER_API,
  DRIVER_API,
  DELIVERY_API,
  productImageUrl,
  driverImageUrl,
};
