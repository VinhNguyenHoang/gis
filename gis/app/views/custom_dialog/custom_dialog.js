var pages = require("ui/page");
var textField = require("ui/text-field");
var observable = require("data/observable");

var context;
var closeCallback;

var page = pages.Page;
var district = textField.TextField;
var route = textField.TextField;

exports.onShownModally = function(args) {
    console.log("login-page.onShownModally, context: " + args.context);
    context = args.context;
    closeCallback = args.closeCallback;
}

exports.onLoaded = function(args) {
    console.log("login-page.onLoaded");
    page = args.object;
    district = page.getViewById("district");
    route = page.getViewById("route");
}

exports.onUnloaded = function() {
    console.log("login-page.onUnloaded");
}

exports.onButtonTap = function() {
    closeCallback(district.text, route.text);
}