
module.exports = class Address {
    constructor(address, 
                street_number, 
                route, 
                sublocality, 
                administrative_area_level_2 , 
                administrative_area_level_1,
                country,
                lat, long,
                place_id) {
        this._address                                   = address;
        this._street_number                             = street_number;
        this._route                                     = route;
        this._sublocality                               = sublocality;
        this._administrative_area_level_2               = administrative_area_level_2;
        this._administrative_area_level_1               = administrative_area_level_1;
        this._country                                   = country;
        this._lat                                       = lat;
        this._long                                      = long;
        this._place_id                                  = place_id;
    }

}