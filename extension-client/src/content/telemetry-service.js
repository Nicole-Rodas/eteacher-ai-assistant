window.ETeacherTelemetry = {
  ENDPOINT_BASE: "http://localhost:3000/api/telemetry",

  logSession(payload) {
    fetch(`${this.ENDPOINT_BASE}/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }).catch(() => {});
  },

  logInjection(payload) {
    fetch(`${this.ENDPOINT_BASE}/injection`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }).catch(() => {});
  }
};