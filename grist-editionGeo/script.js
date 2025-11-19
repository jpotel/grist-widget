    // Initialisation carte
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
    const drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);

    // Outils pour tous types de géométrie
    const drawControl = new L.Control.Draw({
      draw: {
        polygon: true,
        polyline: true,
        marker: true,
        rectangle: false,
        circle: false,
        circlemarker: false
      },
      edit: { featureGroup: drawnItems }
    });
    map.addControl(drawControl);

    map.on('draw:created', function (e) {
      drawnItems.addLayer(e.layer);
    });

    // Affichage GeoJSON multi-type éditable
    function showGeometry(geojson) {
      drawnItems.clearLayers();
      if (!geojson) return;
      try {
        const data = JSON.parse(geojson);
        function addFeatureLayer(layerGeoJSON) {
          L.geoJSON(layerGeoJSON, {
            onEachFeature: function (feature, layer) {
              drawnItems.addLayer(layer);
            }
          });
        }
        if (data.type === "FeatureCollection") {
          (data.features || []).forEach(addFeatureLayer);
        } else if (data.type === "Feature") {
          addFeatureLayer(data);
        } else if (data.type) {
          addFeatureLayer({ type: "Feature", geometry: data, properties: {} });
        }
        if (drawnItems.getLayers().length) {
          map.fitBounds(drawnItems.getBounds());
        }
      } catch (e) { /* ignore */ }
    }

    // Export FeatureCollection si plusieurs objets, sinon simple geometry
    function getMixedGeoJSON() {
      let features = [];
      drawnItems.eachLayer(function (layer) {
        if (layer.toGeoJSON) {
          let feat = layer.toGeoJSON();
          if (feat.type === "FeatureCollection") {
            features.push(...(feat.features || []));
          } else if (feat.type === "Feature") {
            features.push(feat);
          }
        }
      });
      if (features.length === 0) return '';
      if (features.length === 1) {
        return JSON.stringify(features[0].geometry);
      } else {
        return JSON.stringify({
          type: "FeatureCollection",
          features: features
        });
      }
    }

    let rowId = null;

    window.grist && window.grist.ready();
    window.grist && window.grist.onRecord(function(record) {
      if (record && typeof record.id === "number" && record.id > 0) {
        rowId = record.id;
        if (record.geometrie_geojson && record.geometrie_geojson.trim() !== "") {
          showGeometry(record.geometrie_geojson);
        } else {
          drawnItems.clearLayers();
        }
      } else {
        // Aucune ligne sélectionnée : on fige tout
        rowId = null;
        drawnItems.clearLayers();
      }
    });

    document.getElementById('btn').onclick = function() {
      if (!rowId) {
        alert("Sélectionnez d'abord un enregistrement existant dans Grist.");
        return;
      }
      if (drawnItems.getLayers().length === 0) {
        alert("Dessinez au moins un objet.");
        return;
      }
      const geometrie_geojson = getMixedGeoJSON();
      if (window.grist) {
        window.grist.docApi.applyUserActions([
          ["UpdateRecord", "Geojson_perimetre", rowId, {geometrie_geojson}]
        ]);
        alert("Géométrie enregistrée !");
      }
      drawnItems.clearLayers();
    };

    // ---- redimensionnement dynamique pour leaflet quand Grist widget redimensionné
    window.addEventListener('resize', function() {
      setTimeout(()=>{ map.invalidateSize(); }, 200);
    });
    setTimeout(()=>{ map.invalidateSize(); }, 100);
