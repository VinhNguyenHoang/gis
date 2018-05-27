var Observable = require("data/observable");
var ObservableArray = require("data/observable-array");
var PolylineDecoder = require("../utils/PolylineDecoder");
var Geolocation = require("nativescript-geolocation");
var Gmap = require("nativescript-google-maps-sdk");
var Gplaces = require("nativescript-google-places");
var Address = require("../models/Address");

var _googleDirectionsApiKey     = 'AIzaSyDxiEPnm_K5mUmGAeZP1DDHPcBCcMKG2JU';
var _googleDirectionsApiUrl     = 'https://maps.googleapis.com/maps/api/directions/json';

var _googleGeodecodingApiUrl    = 'https://maps.googleapis.com/maps/api/geocode/json';
var _googleGeodecodingApiKey    = 'AIzaSyDFAvWX7Ue1tvQzvt1cZkIOO7oMjaiMOE0';

var _googleDistanceApiUrl       = 'https://maps.googleapis.com/maps/api/distancematrix/json';
var _googleDistanceApiKey       = 'AIzaSyBzDfMmTtaERfhDimkUiDef4CvPFl6zvqw';

var _osmNominatimApiURl         = 'https://nominatim.openstreetmap.org/search';

Gplaces.init({
    googleServerApiKey: 'AIzaSyDX172HJFC1QDdV222PBICvu3kDRqIeIXU',
    language: 'vi',
    radius: '100000',
    errorCallback: function(text){console.log(text)}
});

function _handleErrors(response) {
    
    if (!response.ok) {

    if(_errorCallback)
        _errorCallback(response.statusText)
    }

    return response;
}

const Map = {
    getCurrentPosition() {
         return Promise.resolve()
        .then(function() {
            if (!Geolocation.isEnabled())
            {
                return Geolocation.enableLocationRequest();
            } else {

            }
        })
        .then(function() {
            if (Geolocation.isEnabled())
            {
                return Geolocation.getCurrentLocation({
                    desiredAccuracy: 3,
                    updateDistance: 10,
                    maximumAge: 20000,
                    timeout: 20000
                });
            }
            else
            {
                throw new Error("Geolocation could not be enabled");
            }
        })
        .then(function(loc) {
            if (loc)
            {
                console.log("Current location is: " + loc["latitude"] + ", " + loc["longitude"]);
                return Gmap.Position.positionFromLatLng(loc["latitude"], loc["longitude"]);
            }
            else
            {
                throw new Error("Geolocation enabled, but failed to retrieve current location");
            }
        })
        .catch(function(e) {
            console.error(e);
            throw e;
        });
    },

    getPlacesAsType(string) {
        return Promise.resolve()
        .then(function(){
            return Gplaces.search(string, 'geocode');
        })
        .then(function(results){
            if (results.length !== 0) {      
                              
                return results;
            }
        })
        .catch(function(e){
            console.log(e);
            throw e;
        });

    },
    
    getDirections(fromLocation, toLocation) {
        var url = _googleDirectionsApiUrl + "?origin=" + fromLocation.latitude + "," + fromLocation.longitude
                + "&destination=" + toLocation.latitude + "," + toLocation.longitude
                + "&key=" + _googleDirectionsApiKey;
        
        return fetch(url)
        .then(_handleErrors)
        .then(response => {
            return response.json();
        }).then(data => {
            if (data.status == "OK")
            {
                var encodedPolylines = data.routes[0].overview_polyline.points;

                return PolylineDecoder.decodePoly(encodedPolylines);
            }
            else if (data.status == "ZERO_RESULTS")
            {
                return data.status;
            }

            return null;
        }).catch(function(e){
            console.log(e);
            throw e;
        });
    },

    getDataFromAddress(address) {
        var url = _googleGeodecodingApiUrl + "?address=" + address + "&key=" + _googleGeodecodingApiKey + "&language=vi";

        return fetch(url)
        .then(_handleErrors)
        .then(response => {
            return response.json();
        }).then(data => {
            if (data.status == "OK")
            {
                address_components = data.results[0].address_components;
                street_number = "";
                route = "";
                sublocality = "";
                admin_area_2 = "";
                admin_area_1 = "";
                country = "";

                for (var i = 0; i < address_components.length; i++)
                {
                    for (var j = 0; j < address_components[i].types.length; j++)
                    {
                        if (address_components[i].types[j] == "street_number")
                        {
                            street_number = address_components[i].long_name;
                        }
                        else if (address_components[i].types[j] == "route")
                        {
                            route = address_components[i].long_name;
                        }
                        else if (address_components[i].types[j] == "sublocality")
                        {
                            sublocality = address_components[i].long_name;
                        }
                        else if (address_components[i].types[j] == "administrative_area_level_2")
                        {
                            admin_area_2 = address_components[i].long_name;
                        }
                        else if (address_components[i].types[j] == "administrative_area_level_1")
                        {
                            admin_area_1 = address_components[i].long_name;
                        }
                        else if (address_components[i].types[j] == "country")
                        {
                            country = address_components[i].long_name;
                        }
                    }
                }
                address = new Address(data.results[0].formatted_address,
                                    street_number, route, sublocality, admin_area_2, admin_area_1, country,
                                    data.results[0].geometry.location.lat, data.results[0].geometry.location.lng,
                                    data.results[0].place_id);
                return address;
            }
            else
            {
                return data;
            }

        }).catch(function(e){
            console.log(e);
            throw e;
        });
    },

    getDistance(fromLocation, toLocation){
        var url = _googleDistanceApiUrl + "?origins=" + fromLocation + "&destinations=" + toLocation
                + "&key=" + _googleDistanceApiKey + "&language=vi";
        
        return fetch(url)
        .then(_handleErrors)
        .then(response => {
            return response.json();
        })
        .then(data => {
            if (data.status == "OK")
            {
                return data.rows[0].elements[0].distance.text;
            }
            else
            {
                return data.status;
            }
        }).catch(function(e){
            console.log(e);
            throw e;
        });
    },

    getDistrictPolygon(addressData, geojson = 0){
        var queryString = "";

        if (addressData instanceof Address)
        {
            queryString = addressData._administrative_area_level_2 + ', ' + addressData._administrative_area_level_1;
        }
        else
        {
            queryString = addressData + ', Thành Phố Hồ Chí Minh';
        }
        var url = _osmNominatimApiURl + '?q=' + queryString + '&format=json&polygon_geojson=1';

        return fetch(url)
        .then(_handleErrors)
        .then(response => {
            return response.json();
        })
        .then(data => {
            if (geojson == 1)
            {
                data[0].geojson.coordinates[0] = data[0].geojson.coordinates[0].reverse();
                return data[0].geojson;
            }
            else
            {
                var poly = [];
                if (data[0].geojson.coordinates[0]) {
                    for(var i = 0; i < data[0].geojson.coordinates[0].length; i++)
                    {
                        poly.push(new Gmap.Position.positionFromLatLng(data[0].geojson.coordinates[0][i][1],
                            data[0].geojson.coordinates[0][i][0]));
                    }
                }
                return poly;
            }
            
        }).catch(function(e){
            console.log(e);
            throw e;
        });
    },

    getRouteLines(addressData) {
        var street = 'street=' + addressData;
        var city = 'city=Hồ Chí Minh';
        var url = _osmNominatimApiURl + '?' + street + '&' + city  + '&limit=1000&format=json&polygon_geojson=1&accept-language=en-US,en;q=0.9,vi;q=0.8';

        return fetch(url)
        .then(_handleErrors)
        .then(response => {
            return response.json();
        })
        .then(data => {
            var polyline = [];
            if (data)
            {
                data = data.filter(function(obj){
                    return obj.geojson.type === 'LineString';
                });
            }
            return data;
        }).catch(function(e){
            console.log(e);
            throw e;
        });
    }
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

module.exports = Map;