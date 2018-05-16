var FrameModule = require("ui/frame");
var ObservableModule = require("data/observable");
var Gmap = require("nativescript-google-maps-sdk");
var GeoLocation = require("nativescript-geolocation");
var Map = require("../../utils/Map");
var Permissions = require("nativescript-permissions");
var application = require("application");
var Color = require("color").Color;

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
    .then(function(){
        _getDataFromAddress2(page.navigationContext.location_2).then(function(){
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
        console.dir(latlng_1);
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
        console.dir(latlng_2);
    }).catch(e => {
        console.log(e);
    });
}

function _getCurPos() {
    return Map.getCurrentPosition().then(loc => {
    
        pageContext.latitude = loc["latitude"];
        pageContext.longitude = loc["longitude"];
        pageContext.zoom = 14;
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