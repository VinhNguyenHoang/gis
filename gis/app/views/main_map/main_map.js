var FrameModule = require("ui/frame");
var ObservableModule = require("data/observable");
var Gmap = require("nativescript-google-maps-sdk");
var GeoLocation = require("nativescript-geolocation");
var Map = require("../../utils/Map");
var Permissions = require("nativescript-permissions");
var application = require("application");
var Color = require("color").Color;
var Dialogs = require("ui/dialogs");
var D3 = require("d3-geo");

var testResults = {false: 'ngoài biên', true: 'trong biên', 0: 'thuộc biên'};
var mapView = null;
var page = null;
var listPolylines = [];
var listPolygons = [];
var objDistrict = null;

var enteredDistrictData = null;
var enteredRouteData = null;
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
}

exports.onMapReady = function(args){
    mapView = args.object;
    mapView.settings.zoomGesturesEnabled = true;
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
        if (data == false)
            return;
        else
        {
            _getDistrictPolygon(data, '#9970d0a0', '#9900d0a0');
            _getDataFromAddress2(page.navigationContext.location_2).then(function(data){
            if (data == false)
                return;

            _getDistrictPolygon(data, 'rgba(255, 0, 255, 0.36)', 'rgba(255, 0, 255, 0.9)');
            _getMapDirections(latlng_1, latlng_2);
            _getDistance();
        });
        }
        
    });
    
}

function _getDataFromAddress1(address) {
    return Map.getDataFromAddress(address).then(data =>{
        if (data.hasOwnProperty("status"))
        {
            Dialogs.alert({
                title: "Lỗi",
                message: "Không có kết quả từ địa chỉ 1, vui lòng nhập lại",
                okButtonText: "OK"
            }).then(function () {
            });
            return false;
        }

        var marker = new Gmap.Marker();
        marker.title = "Z1: " + data._address;
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
        if (data.hasOwnProperty("status"))
        {
            Dialogs.alert({
                title: "Lỗi",
                message: "Không có kết quả từ địa chỉ 2, vui lòng nhập lại",
                okButtonText: "OK"
            }).then(function () {
            });
            return false;
        }

        var marker = new Gmap.Marker();
        marker.title = "Z2: " + data._address;
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
    Map.getDirections(
        fromLocation,
        toLocation
    ).then(decodedString => {
        if (decodedString !== "ZERO_RESULTS")
        {
            mapView.removeAllPolylines();
            var polyline = new Gmap.Polyline();
            for (var i = 0; i < decodedString.length; i++)
            {
                polyline.addPoint(decodedString[i]);
            }
    
            polyline.visible = true;
            polyline.width = 11;
            polyline.color = new Color('#0011ff');
            polyline.geodesic = true;
            mapView.addPolyline(polyline);
            listPolylines.push(polyline);
        }
        else
        {
            dialogsModule.alert("No routes found.");
        }

    }).catch(e => {
        console.log(e);
    });
}

function _getDistrictPolygonGeoJson(address)
{
    console.log(">> _getDistrictPolygonGeoJson");
    return Map.getDistrictPolygon(address, 1)
    .then(data => {
        objDistrict = data;
    }).catch(e => {
        console.log(e);
    })
}

function _getDistrictPolygon(address, fillColor, strokeColor) {
    return Map.getDistrictPolygon(address)
    .then(data => {
        if (data.length == 0)
        {
            Dialogs.alert({
                title: "Lỗi",
                message: "Không có kết quả",
                okButtonText: "OK"
            }).then(function () {
                console.log("Dialog closed!");
            });
            return false;
        }

        enteredDistrictData = data;
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
        listPolygons.push(polygon);

        return true;
    }).catch(e => {
        console.log(e);
    });
}

function _getRouteLines(address, color) {
    return Map.getRouteLines(address)
    .then(data => {
        for(var j = 0; j < data.length; j++)
        {
            var polyline = null;
            polyline = new Gmap.Polyline();
            for(var i = 0; i < data[j].geojson.coordinates.length; i++)
            {
                polyline.addPoint(new Gmap.Position.positionFromLatLng(
                    data[j].geojson.coordinates[i][1], data[j].geojson.coordinates[i][0]
                ));
            }
            polyline.visible = true;
            polyline.color = new Color(color);
            polyline.width = 5;
            mapView.addPolyline(polyline);
            listPolylines.push(polyline);
        }
        return true;
    }).catch(e => {
        console.log(e);
    });
}

function _getDistance(){
    return Map.getDistance(pageContext.location_1_address, pageContext.location_2_address)
    .then(data => {
        pageContext.distance = data;
    }).catch(e => {
        console.log(e);
    });   
}

function _checkPointAndPolygon(point1, point2, polygon, districtName){
    if (polygon == null)
        return;

    var arr1 = [point1.longitude, point1.latitude];
    var arr2 = [point2.longitude, point2.latitude];
    var result1 = D3.geoContains(objDistrict, arr1);
    var result2 = D3.geoContains(objDistrict, arr2);
    
    var resultStr = '';

    resultStr += 'Điểm z1 nằm ' + testResults[result1] + ' của ' + districtName + ' \n';
    resultStr += 'Điểm z2 nằm ' + testResults[result2] + ' của ' + districtName + ' \n';
    Dialogs.alert({
        title: "Kết quả điểm và quận",
        message: resultStr,
        okButtonText: "OK"
    }).then(function () {
    });
}

function _checkPointAndPolylines(point1, point2, routeName){
    if (!listPolylines)
        return;

    var resultPoint1 = _checkPointInPolyline(point1, listPolylines);
    var resultPoint2 = _checkPointInPolyline(point2, listPolylines);
    var resultStr = '';
    resultStr += 'Điểm z1 ' + ((resultPoint1 == true)?'thuộc':'không thuộc') + ' đường ' + routeName + ' \n';
    resultStr += 'Điểm z2 ' + ((resultPoint2 == true)?'thuộc':'không thuộc') + ' đường ' + routeName + ' \n';

    Dialogs.alert({
        title: "Kết quả điểm và đường",
        message: resultStr,
        okButtonText: "OK"
    }).then(function () {
    });
}

function _checkPointInPolyline(point, polyline){
    for(var i = 0; i < polyline.length; i++)
    {
        for(var j = 0; j < polyline[i].length - 2; j++)
        {
            if (_checkPointInSegment(point, polyline[i][j], polyline[i][j + 1]))
            {
                return true;
            }
        }
    }

    return false;
}

function _checkPointInSegment(point, start, end){
    var deltaX = end.latitude - start.latitude;
    var isInXDir;
    if (deltaX == 0)
    {
        isInXDir = (point.latitude == start.latitude);
    }
    else
    {
        var t = (point.latitude - start.latitude) / deltaX;
        isInXDir = (t >= 0 && t <= 1);
    }

    if (isInXDir)
    {
        var deltaY = end.longitude - start.longitude;
        if (deltaY == 0)
        {
            return (point.longitude == start.longitude);
        }
        else
        {
            var u = (point.longitude - start.longitude) / deltaY;
            return (u >= 0 && u <= 1);
        }
    }
    else
    {
        return false;
    }
}

function _removeAllPolylines() {
    while (listPolylines.length > 0)
    {
        mapView.removeShape(listPolylines.pop());
    }
}

function _removeAllPolygons() {
    while(listPolygons.length > 0)
    {
        mapView.removeShape(listPolygons.pop());
    }
}

exports.showPromptRoute = function(args){
    var fullscreen = args.object.text.indexOf("(full-screen)") !== -1;
    var isRoutePrompt = true;
    page.showModal("views/custom_dialog/custom_dialog", isRoutePrompt, function (district, route) {

        if (route)
        {
            _removeAllPolylines();
            _getRouteLines(route, 'rgba(255, 0, 0, 1)')
            .then(function(result){
                if (result == true)
                    _checkPointAndPolylines(latlng_1, latlng_2, route);
            });
        }
    }, fullscreen);
}

exports.showPromptDistrict = function(args){
    var fullscreen = args.object.text.indexOf("(full-screen)") !== -1;
    var isRoutePrompt = false;
    page.showModal("views/custom_dialog/custom_dialog", isRoutePrompt, function (district, route) {

        if (district)
        {
            _removeAllPolygons();
            _getDistrictPolygon(district, 'rgba(255, 0, 255, 0.36)', 'rgba(255, 0, 255, 0.9)')
            .then(function(result){
                if (result == true)
                {
                    _getDistrictPolygonGeoJson(district)
                    .then(function() {
                        console.log(">> _checkPointAndPolygon");
                        _checkPointAndPolygon(latlng_1, latlng_2, enteredDistrictData, district);
                    });
                }
            });
        }
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

function _calculateDistance(lat1, lon1, lat2, lon2, unit){
    var radlat1 = Math.PI * lat1/180
    var radlat2 = Math.PI * lat2/180
    var radlon1 = Math.PI * lon1/180
    var radlon2 = Math.PI * lon2/180
    var theta = lon1-lon2
    var radtheta = Math.PI * theta/180
    var dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
    dist = Math.acos(dist)
    dist = dist * 180/Math.PI
    dist = dist * 60 * 1.1515
    if (unit=="K") { dist = dist * 1.609344 }
    if (unit=="N") { dist = dist * 0.8684 }
    return dist
}

function toDegreesMinutesAndSeconds(coordinate) {
    var absolute = Math.abs(coordinate);
    var degrees = Math.floor(absolute);
    var minutesNotTruncated = (absolute - degrees) * 60;
    var minutes = Math.floor(minutesNotTruncated);
    var seconds = Math.floor((minutesNotTruncated - minutes) * 60);

    return degrees + " " + minutes + " " + seconds;
}

function convertDMS(lng, lat) {
    var latitude = toDegreesMinutesAndSeconds(lat);
    var latitudeCardinal = Math.sign(lat) >= 0 ? "N" : "S";

    var longitude = toDegreesMinutesAndSeconds(lng);
    var longitudeCardinal = Math.sign(lng) >= 0 ? "E" : "W";

    var result = [longitude + " " + longitudeCardinal, latitude + " " + latitudeCardinal];
    return result;
}