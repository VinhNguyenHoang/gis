var Gmap = require("nativescript-google-maps-sdk");

exports.decodePoly = function (encoded) {
    
    var poly = [];
    var index = 0, len = encoded.length;
    var lat = 0, lng = 0;
    var factor = Math.pow(10, 5);
    var loc = null;

    while (index < len) {
        var b, shift = 0, result = 0;
        do {
            b = encoded.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);
        var dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
        lat += dlat;

        shift = 0;
        result = 0;
        do {
            b = encoded.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);
        var dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
        lng += dlng;
        
        // console.log(">> lat: " + (lat / factor) + ", lang: " + (lng / factor));
        loc = new Gmap.Position.positionFromLatLng( lat / factor , lng / factor );
        poly.push(loc);
    }

    return poly;
}