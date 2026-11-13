window.ETeacherStorage = {
  PREFIX: "et_cache_",

  buildKey(exerciseInfo) {
    if (!exerciseInfo) return this.PREFIX + "default";
    const title = (exerciseInfo.unitTitle || "").replace(/\s+/g, "_").toLowerCase();
    const concept = exerciseInfo.conceptId || "";
    const chapter = exerciseInfo.chapterNum || "";
    return `${this.PREFIX}${chapter}__${concept}__${title}`;
  },

  getExerciseRows(exerciseInfo) {
    const key = this.buildKey(exerciseInfo);
    try {
      const raw = sessionStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  saveExerciseRows(exerciseInfo, rowsData) {
    const key = this.buildKey(exerciseInfo);
    try {
      sessionStorage.setItem(key, JSON.stringify(rowsData || []));
    } catch {}
  },

  clearExercise(exerciseInfo) {
    sessionStorage.removeItem(this.buildKey(exerciseInfo));
  },

  clearAllCurrentTab() {
    try {
      const keys = Object.keys(sessionStorage);
      keys.forEach((k) => {
        if (k.startsWith(this.PREFIX)) {
          sessionStorage.removeItem(k);
        }
      });
    } catch {}
  }
};