/**
 * Canevyn Frontend Configuration & Environment Boundary
 * Strict Rule: Developer hardware simulator is available ONLY in development.
 * It is completely omitted and disabled in production.
 */

class CanevynConfig {
  constructor() {
    this.environment = window.CANEVYN_ENV || 'development';
    this.isDevelopment = this.environment === 'development';
    this.isProduction = this.environment === 'production';
    this.emergencyDispatchNumber = 'sos';
  }

  async loadServerConfig() {
    try {
      let baseUrl = (typeof window !== 'undefined' && window.location.origin) || 'http://localhost:8000';
      if (!baseUrl || baseUrl === 'null' || (typeof window !== 'undefined' && window.location.protocol === 'file:')) {
        baseUrl = 'http://localhost:8000';
      } else if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
        if (window.location.port !== '8000') {
          baseUrl = `${window.location.protocol}//${window.location.hostname}:8000`;
        }
      }
      const res = await fetch(`${baseUrl}/api/v1/config`);
      if (res.ok) {
        const data = await res.json();
        this.environment = data.environment;
        this.isDevelopment = data.is_development;
        this.isProduction = data.environment === 'production';
        this.emergencyDispatchNumber = data.emergency_dispatch_number || 'sos';
      }
    } catch (e) {
      console.warn('Could not load dynamic server config, using local default:', this.environment);
    }
  }
}

export const appConfig = new CanevynConfig();
