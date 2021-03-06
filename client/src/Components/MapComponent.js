import React, { useEffect, useRef, useState, useCallback } from "react";
import axios from "axios";
import { loadModules } from "esri-loader";
import FavItem from "./Sidebar";

import "./mapcss.css";

class StaticStore {
  static dots = [];
}

const WebMapView = () => {
  const [favourite, setFavourite] = useState();
  const [dots, setDots] = useState([]);
  const [favouriteS, setfavouriteS] = useState([]);

  const onSaveFav = useCallback(function (event) {
    // This event fires for each click on any action
    if (event.action.id === "save-fav") {
      let popupInfo = viewRef.current.popup.selectedFeature.attributes.Location;
      axios.post("user/favourite", { location: popupInfo }).then((response) => {
        axios.get("/user/favourites").then((data) => {
          let Ids = data.data.message.msgBody;
          console.log(Ids);
          setfavouriteS(Ids);

          // })
        });
      });
    }
  });

  const mapRef = useRef();
  const viewRef = useRef();

  useEffect(() => {
    // lazy load the required ArcGIS API for JavaScript modules and CSS
    loadModules(
      [
        "esri/Map",
        "esri/views/MapView",
        "esri/widgets/Locate",
        "esri/Graphic",
        "esri/layers/GraphicsLayer",
      ],
      { css: true }
    ).then(([ArcGISMap, MapView, Locate, Graphic, GraphicsLayer]) => {
      const map = new ArcGISMap({
        basemap: "topo-vector",
      });

      // LOAD THE MAP VIEW AT THE REF'S DOM NODE

      const view = new MapView({
        container: mapRef.current,
        map: map,
        center: [138, -34],
        zoom: 6,
      });

      viewRef.current = view;

      // LOCATE BUTTON
      let locateWidget = new Locate({
        view: view, // Attaches the Locate button to the view
        graphic: new Graphic({
          symbol: { type: "simple-marker" }, // overwrites the default symbol used for the graphic placed at the location of the user when found
        }),
      });

      //MAP COORDINATES INFO

      let coordsWidget = document.createElement("div");
      coordsWidget.id = "coordsWidget";
      coordsWidget.className = "esri-widget esri-component";
      coordsWidget.style.padding = "7px 15px 5px";

      view.ui.add(coordsWidget, "bottom-right");

      function showCoordinates(pt) {
        let coords =
          "Lat/Lon " +
          pt.latitude.toFixed(3) +
          " " +
          pt.longitude.toFixed(3) +
          " | Scale 1:" +
          Math.round(view.scale * 1) / 1 +
          " | Zoom " +
          view.zoom;
        coordsWidget.innerHTML = coords;
      }

      view.watch("stationary", function (isStationary) {
        showCoordinates(view.center);
      });

      view.on("pointer-move", function (evt) {
        showCoordinates(view.toMap({ x: evt.x, y: evt.y }));
      });

      //ADDING WIDGETS TO THE MAP
      view.ui.add(locateWidget, "top-right");
      view.ui.add(coordsWidget, "bottom-right");

      // ADD POINTS TO THE MAP
      let graphicsLayer = new GraphicsLayer();
      map.add(graphicsLayer);

      let simpleMarkerSymbol = {
        type: "simple-marker",
        color: [226, 119, 40], // orange
        outline: {
          color: [255, 255, 255], // white
          width: 1,
        },
      };

      // DEFINES AN ACTION TO BUTTON SAVE
      let saveFavorite = {
        title: "Save",
        // The ID FOR REFERENCE TO THE EVENT HANDLER
        id: "save-fav",

        className: "esri-icon-grant",
      };
      // ADDS THE CUSTOM ACTION TO POPUP
      view.popup.actions.push(saveFavorite);

      view.popup.on("trigger-action", onSaveFav);

      //FOR LOOP FOR GENERATING POINTS IN THE MAP
      axios.get("/user/dots").then((res) => {
        let dots = res.data;
        setDots(dots);
        StaticStore.dots = dots;

        for (let i = 0; i < dots.length; i++) {
          let popupTemplate = {
            title: dots[i].Name,
            content: dots[i].Location,
          };
          let pointGraphic = new Graphic({
            geometry: dots[i].point,
            symbol: simpleMarkerSymbol,
            attributes: dots[i],
            popupTemplate: popupTemplate,
          });

          //ADDING POPUPS TO THE POINTS
          graphicsLayer.add(pointGraphic);
        }
        axios.get("/user/favourites").then((data) => {
          let Ids = data.data.message.msgBody;
          console.log(Ids);
          setfavouriteS(Ids);
        });
      });

      return () => {
        if (view) {
          // destroy the map view
          view.container = null;
        }
      };
    });
  }, []);

  const test = (id) => {
    axios.delete("user/favourites/" + id).then(() => {
      // get again, refresh favourites
      axios.get("/user/favourites").then((data) => {
        let Ids = data.data.message.msgBody;
        console.log(Ids);
        setfavouriteS(Ids);
      });
    });
  };

  return (
    <div>
      <div className="webmap" ref={mapRef} />
      <FavItem items={favouriteS} myOnClick={test} />
    </div>
  );
};

export default WebMapView;
