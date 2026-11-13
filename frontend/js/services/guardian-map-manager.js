/**
 * Canevyn Guardian Leaflet Map Manager
 * Renders real OpenStreetMap + Leaflet maps for Authorized Members.
 * Reuses existing map and marker instances when coordinates update;
 * clears markers immediately when live sharing stops or expires.
 */

export class CanevynGuardianMapManager {
  constructor() {
    this.maps = new Map();
  }

  hasLeaflet() {
    return typeof window !== 'undefined' && typeof window.L !== 'undefined';
  }

  /**
   * Synchronizes a Leaflet map container with the selected Blind User's live coordinates.
   * Updates existing markers smoothly without destroying/recreating the map instance.
   */
  syncLocation(containerId, loc, { centerOnFirst = true } = {}) {
    if (!this.hasLeaflet()) return false;
    const el = document.getElementById(containerId);
    if (!el) return false;

    let entry = this.maps.get(containerId);

    // If DOM container changed due to view navigation, cleanly dispose old map first
    if (entry && entry.containerEl !== el) {
      try { entry.map.remove(); } catch (e) {}
      this.maps.delete(containerId);
      entry = null;
    }

    if (!entry) {
      const map = window.L.map(el, {
        zoomControl: true,
        attributionControl: true
      }).setView([20.5937, 78.9629], 4);

      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      entry = {
        map,
        containerEl: el,
        marker: null,
        accuracyCircle: null,
        hasCentered: false,
        lastUserId: null
      };
      this.maps.set(containerId, entry);
      setTimeout(() => {
        try { map.invalidateSize(); } catch (e) {}
      }, 60);
    }

    const isLive = Boolean(
      loc &&
      (loc.is_live_available || loc.isLiveAvailable || loc.is_live) &&
      Number.isFinite(Number(loc.latitude)) &&
      Number.isFinite(Number(loc.longitude))
    );

    if (!isLive) {
      this._clearLayers(entry);
      entry.hasCentered = false;
      entry.lastUserId = null;
      return true;
    }

    const lat = Number(loc.latitude);
    const lon = Number(loc.longitude);
    const hasAcc = loc.accuracy_meters !== null && loc.accuracy_meters !== undefined && Number.isFinite(Number(loc.accuracy_meters));
    const rawAcc = hasAcc ? Math.max(0, Number(loc.accuracy_meters)) : null;
    const ownerId = loc.user_id || null;
    const userSwitched = ownerId && entry.lastUserId && ownerId !== entry.lastUserId;
    entry.lastUserId = ownerId || entry.lastUserId;

    const popupText = rawAcc !== null
      ? `Lat: ${lat.toFixed(5)}, Lon: ${lon.toFixed(5)} (±${Math.round(rawAcc)}m${rawAcc > 100 ? ' Approximate' : ''})`
      : `Lat: ${lat.toFixed(5)}, Lon: ${lon.toFixed(5)}`;

    if (!entry.marker) {
      entry.marker = window.L.marker([lat, lon]).addTo(entry.map);
      entry.marker.bindPopup(popupText);
    } else {
      entry.marker.setLatLng([lat, lon]);
      entry.marker.setPopupContent(popupText);
    }

    const circleColor = loc.is_stale ? '#ffb703' : '#40efb7';
    if (rawAcc !== null) {
      if (!entry.accuracyCircle) {
        entry.accuracyCircle = window.L.circle([lat, lon], {
          radius: rawAcc,
          color: circleColor,
          fillColor: circleColor,
          fillOpacity: 0.16,
          weight: 2
        }).addTo(entry.map);
      } else {
        entry.accuracyCircle.setLatLng([lat, lon]);
        entry.accuracyCircle.setRadius(rawAcc);
        entry.accuracyCircle.setStyle({ color: circleColor, fillColor: circleColor });
      }
    } else if (entry.accuracyCircle) {
      try { entry.map.removeLayer(entry.accuracyCircle); } catch (e) {}
      entry.accuracyCircle = null;
    }

    if (userSwitched || (!entry.hasCentered && centerOnFirst)) {
      const targetZoom = rawAcc !== null && rawAcc > 1500 ? 13 : (rawAcc !== null && rawAcc > 250 ? 15 : 16);
      entry.map.setView([lat, lon], targetZoom, { animate: false });
      entry.hasCentered = true;
    } else {
      entry.map.panTo([lat, lon], { animate: true });
    }

    setTimeout(() => {
      try { entry.map.invalidateSize(); } catch (e) {}
    }, 60);
    return true;
  }

  recenter(containerId) {
    const entry = this.maps.get(containerId);
    if (!entry || !entry.marker) return false;
    const latlng = entry.marker.getLatLng();
    entry.map.setView(latlng, Math.max(entry.map.getZoom(), 16), { animate: true });
    return true;
  }

  clearContainer(containerId) {
    const entry = this.maps.get(containerId);
    if (entry) {
      this._clearLayers(entry);
      entry.hasCentered = false;
    }
  }

  _clearLayers(entry) {
    if (entry.marker) {
      try { entry.map.removeLayer(entry.marker); } catch (e) {}
      entry.marker = null;
    }
    if (entry.accuracyCircle) {
      try { entry.map.removeLayer(entry.accuracyCircle); } catch (e) {}
      entry.accuracyCircle = null;
    }
  }

  destroyAll() {
    for (const entry of this.maps.values()) {
      try { entry.map.remove(); } catch (e) {}
    }
    this.maps.clear();
  }
}
