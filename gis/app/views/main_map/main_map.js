var FrameModule = require("ui/frame");
var ObservableModule = require("data/observable");
var Gmap = require("nativescript-google-maps-sdk");
var GeoLocation = require("nativescript-geolocation");
var Map = require("../../utils/Map");
var Permissions = require("nativescript-permissions");
var application = require("application");
var Color = require("color").Color;
var Dialogs = require("ui/dialogs");

var mapView = null;
var page = null;
var latlng_1 = null;
var latlng_2 = null;
var pageContext = new ObservableModule.fromObject({
    padding: '0, 0, 0, 0',
    latitude: '0',
    longitude: '0',
    zoom: 0,
    track_lat: '0',
    track_lng: '0',
    track_time: '0',
    location_1_address: "",
    location_1_ward: "",
    location_1_district: "",
    location_2_address: "",
    location_2_ward: "",
    location_2_district: "",
    distance: "",
});
exports.pageLoaded = function(args){
    page = args.object;
    page.bindingContext = pageContext;
    page.actionBarHidden = true;
    console.log(">> onPageLoaded");
}

exports.onMapReady = function(args){
    mapView = args.object;
    mapView.settings.zoomGesturesEnabled = true;
    console.log(">> onMapReady");
    _requestPermissions().then(function(granted) {
        if (granted)
        {
            mapView.myLocationEnabled = true;
            mapView.settings.myLocationButtonEnabled = false;
            _getCurPos();
        }
    }).catch(function (error) {
        console.log(error);
    });

    _getDataFromAddress1(page.navigationContext.location_1)
    .then(function(data){
        _getDistrictPolygon(data, '#9970d0a0', '#9900d0a0');
        _getDataFromAddress2(page.navigationContext.location_2).then(function(data){
            _getDistrictPolygon(data, 'rgba(255, 0, 255, 0.36)', 'rgba(255, 0, 255, 0.9)');
            _getMapDirections(latlng_1, latlng_2);
            _getDistance();
        });
    });
    
}

function _getDataFromAddress1(address) {
    return Map.getDataFromAddress(address).then(data =>{
        var marker = new Gmap.Marker();
        marker.title = data._address;
        marker.draggable = false;
        marker.userData = { index: data._place_id };
        marker.color = "red";
        marker.position = Gmap.Position.positionFromLatLng(data._lat, data._long);
        mapView.addMarker(marker);

        page.bindingContext.location_1_address = data._address;
        page.bindingContext.location_1_ward = data._sublocality;
        page.bindingContext.location_1_district = data._administrative_area_level_2;

        latlng_1 = Gmap.Position.positionFromLatLng(data._lat, data._long);
        
        return data;
    }).catch(e => {
        console.log(e);
    });
}

function _getDataFromAddress2(address) {
    return Map.getDataFromAddress(address).then(data =>{
        var marker = new Gmap.Marker();
        marker.title = data._address;
        marker.draggable = false;
        marker.userData = { index: data._place_id };
        marker.color = "blue";
        marker.position = Gmap.Position.positionFromLatLng(data._lat, data._long);
        mapView.addMarker(marker);
        page.bindingContext.location_2_address = data._address;
        page.bindingContext.location_2_ward = data._sublocality;
        page.bindingContext.location_2_district = data._administrative_area_level_2;
        latlng_2 = Gmap.Position.positionFromLatLng(data._lat, data._long);
        
        return data;
    }).catch(e => {
        console.log(e);
    });
}

function _getCurPos() {
    return Map.getCurrentPosition().then(loc => {
    
        pageContext.latitude = loc["latitude"];
        pageContext.longitude = loc["longitude"];
        pageContext.zoom = 11;
        return loc;
    }).catch(e => {
        console.log(e);
    });
}

function _requestPermissions() {
    return new Promise(function(resolve, reject) {
        if (!application.android) return resolve(true);
        Permissions.requestPermission([
            android.Manifest.permission.ACCESS_FINE_LOCATION,
            android.Manifest.permission.ACCESS_COARSE_LOCATION],
            "This app requires access to location in order to fully operation")
            .then(function (result) {
                console.log("Permissions granted!");
                resolve(true);
            })
            .catch(function (result) {
                console.log("Permissions denied!", result);
                reject(false);
            });

    });
}

function _getMapDirections(fromLocation, toLocation) {
    console.log(">> getting map direction");
    Map.getDirections(
        fromLocation,
        toLocation
    ).then(decodedString => {
        if (decodedString !== "ZERO_RESULTS")
        {
            console.log(">> drawing map direction");
            mapView.removeAllPolylines();
            var polyline = new Gmap.Polyline();
            for (var i = 0; i < decodedString.length; i++)
            {
                polyline.addPoints(decodedString[i]);
            }
    
            polyline.visible = true;
            polyline.width = 11;
            polyline.color = new Color('#0011ff');
            polyline.geodesic = true;
            mapView.addPolyline(polyline);
        }
        else
        {
            dialogsModule.alert("No routes found.");
        }

    }).catch(e => {
        console.log(e);
    });
}

function _getDistrictPolygon(address, fillColor, strokeColor) {
    Map.getAdministrativeAreaLevel2Polygon(address)
    .then(data => {
        var polygon = new Gmap.Polygon();
        for (var i = 0; i < data.length; i++)
        {
            polygon.addPoints(data[i]);
        }
        polygon.visible = true;
        polygon.fillColor = new Color(fillColor);
        polygon.strokeColor = new Color(strokeColor);
        polygon.strokeWidth = 5;
        mapView.addPolygon(polygon);
    }).catch(e => {
        console.log(e);
    });
}

function _getRouteLines(address, color) {
    Map.getRouteLines(address)
    .then(data => {
        mapView.removeAllPolylines();
        var polyline = new Gmap.Polyline();
        for (var i = 0; i < data.length; i++)
        {
            polyline.addPoint(data[i]);
        }
        polyline.visible = true;
        polyline.color = new Color(color);
        polyline.width = 5;
        mapView.addPolyline(polyline);
        // for(var i = 0; i < data.length; i++)
        // {
        //     var marker = new Gmap.Marker();
        //     marker.draggable = false;
        //     marker.color = "green";
        //     marker.position = data[i];
        //     mapView.addMarker(marker);
        // }
    }).catch(e => {
        console.log(e);
    });
}

function _getDistance(){
    console.log(">> getting distance");
    Map.getDistance(pageContext.location_1_address, pageContext.location_2_address)
    .then(data => {
        console.log(">> distance is " + data);
        pageContext.distance = data;
    }).catch(e => {
        console.log(e);
    });   
}

exports.showPrompt = function(args){
    var fullscreen = args.object.text.indexOf("(full-screen)") !== -1;
    page.showModal("views/custom_dialog/custom_dialog", "context", function (district, route) {
        console.log(district + "/" + route);
        if (district)
            _getDistrictPolygon(district, 'rgba(255, 0, 255, 0.36)', 'rgba(255, 0, 255, 0.9)');
        if (route)
            _getRouteLines(route, 'rgba(255, 0, 0, 1)');
    }, fullscreen);
}


/**
 * https://stackoverflow.com/questions/22521982/js-check-if-point-inside-a-polygon
 * @param {*} x latitude of tested point
 * @param {*} y longitude of tested point
 * @param {*} cornersX cornersX = array with x or latitude vertices array
 * @param {*} cornersY cornersY = array with y or longitude array
 */
function checkPnP (x, y, cornersX, cornersY) {

    var i, j=cornersX.length-1 ;
    var  oddNodes=false;

    var polyX = cornersX;
    var polyY = cornersY;

    for (i=0; i<cornersX.length; i++) {
        if ((polyY[i]< y && polyY[j]>=y ||  polyY[j]< y && polyY[i]>=y) &&  (polyX[i]<=x || polyX[j]<=x)) {
          oddNodes^=(polyX[i]+(y-polyY[i])/(polyY[j]-polyY[i])*(polyX[j]-polyX[i])<x); 
        }
        j=i; 
    }

    return oddNodes;
}