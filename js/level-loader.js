(function (R) {
  R.LevelLoader = {
    count: 50,
    cache: {}, // '01' -> { valid: true, data: { ... } } or { valid: false }

    async loadAll() {
      const promises = [];
      for (let i = 1; i <= this.count; i++) {
        const id = String(i).padStart(2, "0");
        if (this.cache[id]) continue; // Already checked

        promises.push(
          fetch(`levels/${id}.json`)
            .then(async (res) => {
              if (!res.ok) {
                this.cache[id] = { valid: false };
                return;
              }
              const data = await res.json();
              if (data.format !== "resonanz-level" || data.formatVersion !== 1) {
                this.cache[id] = { valid: false };
                return;
              }
              const cleanLayout = R.LevelData.validate(data.layout);
              if (!cleanLayout) {
                console.warn(`Level ${id} invalid`);
                this.cache[id] = { valid: false };
                return;
              }
              // Sicherstellen, dass das Level die bereinigten Daten verwendet
              data.layout = cleanLayout;
              this.cache[id] = { valid: true, data };
            })
            .catch(() => {
              this.cache[id] = { valid: false };
            })
        );
      }
      await Promise.all(promises);
    },

    get(id) {
      const entry = this.cache[id];
      return entry && entry.valid ? entry.data : null;
    }
  };
})(Resonance);
