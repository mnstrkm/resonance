(function (R) {
  // One history entry per visible screen/panel; re-rendering never adds entries.
  R.Navigation = class {
    constructor(render) {
      this.render = render;
      this.token = String(Date.now()) + Math.random().toString(36).slice(2);
      this.depth = 0;
      this.route = { screen: "home" };
      this.entries = [this.route];
      this.pending = false;
      this.supported = true;
      try {
        history.replaceState(this.entry(), "");
      } catch (_) {
        this.supported = false;
      }
      window.addEventListener("popstate", (event) => {
        this.pending = false;
        const state = event.state;
        if (state?.resonance === this.token) {
          this.depth = state.depth;
          this.entries = this.entries.slice(0, this.depth + 1);
          this.route = state.route;
          this.entries[this.depth] = this.route;
          this.render(this.route);
        }
      });
    }
    entry() {
      return { resonance: this.token, depth: this.depth, route: this.route };
    }
    go(route, replace = false) {
      if (this.pending) return;
      if (!replace && JSON.stringify(route) === JSON.stringify(this.route))
        return;
      if (!replace) this.depth++;
      this.route = route;
      this.entries = this.entries.slice(0, this.depth);
      this.entries[this.depth] = route;
      if (this.supported) {
        try {
          history[replace ? "replaceState" : "pushState"](this.entry(), "");
        } catch (_) {
          this.supported = false;
        }
      }
      this.render(route);
    }
    back() {
      this.toDepth(this.depth - 1);
    }
    home() {
      this.toDepth(0);
    }
    toDepth(depth) {
      if (this.pending || depth < 0 || depth >= this.depth) return;
      if (this.supported) {
        this.pending = true;
        history.go(depth - this.depth);
      } else {
        this.depth = depth;
        this.route = this.entries[depth];
        this.render(this.route);
      }
    }
  };
})(Resonance);
