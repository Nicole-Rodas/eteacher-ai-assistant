window.ETeacherTelemetry = {
  // Si estás en desarrollo local usa localhost:5000 o 3000; si estás usando el servicio en la nube, pon tu URL de Render:
  ENDPOINT_BASE: "https://eteacher-backend.onrender.com/api/telemetry",

  async logSession(payload) {
    try {
      const res = await fetch(`${this.ENDPOINT_BASE}/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        console.warn(`[Telemetry] Fallo al guardar sesión (${res.status}):`, await res.text());
        return null;
      }
      const data = await res.json();
      console.log("[Telemetry] Sesión registrada en BD:", data);
      return data;
    } catch (err) {
      console.warn("[Telemetry] Error de conexión al registrar sesión:", err.message);
      return null;
    }
  },

  async logInjection(payload) {
    try {
      const res = await fetch(`${this.ENDPOINT_BASE}/injection`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        console.warn(`[Telemetry] Fallo al guardar inyección (${res.status}):`, await res.text());
        return null;
      }
      const data = await res.json();
      console.log("[Telemetry] Inyección registrada en BD:", data);
      return data;
    } catch (err) {
      console.warn("[Telemetry] Error de conexión al registrar inyección:", err.message);
      return null;
    }
  }
};