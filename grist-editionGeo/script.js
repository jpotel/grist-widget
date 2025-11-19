// Initialisation de la carte
const map = L.map('map').setView([45, 3], 6);
L.tileLayer('https://data.geopf.fr/wmts?service=WMTS&request=GetTile&version=1.0.0&tilematrixset=PM&tilematrix={z}&tilecol={x}&tilerow={y}&layer=ORTHOIMAGERY.ORTHOPHOTOS&format=image/jpeg&style=normal', {
  attribution: '&copy; IGN',
  minZoom: 1,
  maxZoom: 19
}).addTo(map);

L.tileLayer('https://data.geopf.fr/wmts?service=WMTS&request=GetTile&version=1.0.0&tilematrixset=PM&tilematrix={z}&tilecol={x}&tilerow={y}&layer=CADASTRALPARCELS.PARCELLAIRE_EXPRESS&format=image/png&style=normal', {
  attribution: '&copy; IGN',
  minZoom: 1,
  maxZoom: 19
}).addTo(map);

let geojsonLayer = null;

// Demande les colonnes "geometry" et "label", label étant optionnel.
grist.ready({columns: ['geometry', 'label'], requiredAccess: 'read table'});

grist.onRecord(function (record, mappings) {
  const mapped = grist.mapColumnNames(record);

  if (mapped && mapped.geometry) {
    let feature = null;
    try {
      feature = JSON.parse(mapped.geometry);

      // Injecte le label comme propriété pour l'affichage
      if (!feature.properties) feature.properties = {};
      if (mapped.label) feature.properties.label = mapped.label;
    } catch (e) {
      console.error("Erreur lors du parsing du GeoJSON:", e);
    }

    // Supprime ancienne couche
    if (geojsonLayer) {
      geojsonLayer.remove();
    }
    // Affiche le GeoJSON si valide, avec popup
    if (feature) {
      geojsonLayer = L.geoJSON(feature, {
        style: {
          color: "#FF0000",
          weight: 2,
          fillColor: "#FF0000",
          fillOpacity: 0.5
        },
        onEachFeature: function (feat, layer) {
          if (feat.properties && feat.properties.label) {
            layer.bindPopup(feat.properties.label);
          }
        }
      }).addTo(map);
      try {
        map.fitBounds(geojsonLayer.getBounds(), {maxZoom: 16, padding: [20,20]});
      } catch (err) {}
    }
  }
});
