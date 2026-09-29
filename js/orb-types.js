(function (R) {
  R.OrbTypes = {
    red: {
      name: "Druck",
      color: "#ff786d",
      description: "Stößt nahe Orbs weg und regt sie an.",
      symbol: "expand",
      ability: "red",
    },
    blue: {
      name: "Sog",
      color: "#73b7ff",
      description: "Zieht nahe Orbs an und regt sie an.",
      symbol: "inward",
      ability: "blue",
    },
    violet: {
      name: "Pulsar",
      color: "#bda0ff",
      description: "Zieht erst zusammen, dann folgt ein Druckstoß.",
      symbol: "pulse",
      ability: "violet",
    },
    green: {
      name: "Pfeil",
      color: "#78d8b0",
      description:
        "Trifft das nächste ruhende Ziel in Reichweite. Mit kleinem Rückstoß.",
      symbol: "arrow",
      ability: "green",
    },
    gold: {
      name: "Funke",
      color: "#edcf7e",
      description: "Sucht ein zufälliges ruhendes Ziel in der gesamten Arena.",
      symbol: "spark",
      ability: "gold",
    },
    orange: {
      name: "Aura",
      color: "#f5a66c",
      description:
        "Regt nahe Orbs an und verstärkt ihre Kraft und Reichweite.",
      symbol: "aura",
      ability: "orange",
    },
    pearl: {
      name: "Spiegel",
      color: "#dddce9",
      description:
        "Kopiert die auslösende Fähigkeit. Manuell: nur Core-Energie.",
      symbol: "diamond",
      ability: null,
    },
  };
})(Resonance);
