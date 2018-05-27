var FrameModule = require("ui/frame");
var UtilsModule = require("tns-core-modules/utils/utils");


var location_1;
var location_2;
exports.pageLoaded = function(args){
    var page = args.object;
    
    location_1 = page.getViewById("location_1");
    location_2 = page.getViewById("location_2");
}

exports.dismissKeyboardInput = function() {
    UtilsModule.ad.dismissSoftInput();
}

exports.continue = function(){

    if (!location_1.text && !location_2.text)
        return;

    var topmost = FrameModule.topmost();
    topmost.navigate({
        moduleName: "views/main_map/main_map",
        context: {
            location_1: location_1.text,
            location_2: location_2.text
        }
    });
}