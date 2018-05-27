var pages = require("ui/page");
var textField = require("ui/text-field");
var observable = require("data/observable");

var isRouteForm;
var closeCallback;

var page = pages.Page;
var district = textField.TextField;
var route = textField.TextField;

var pageContext = new observable.fromObject({
    isRouteForm: false
});

exports.onShownModally = function(args) {
    console.log("login-page.onShownModally, context: " + args.context);
    page = args.object;
    pageContext.isRouteForm = args.context;
    page.bindingContext = pageContext;
    console.log(args.context);
    district = page.getViewById("district");
    route = page.getViewById("route");
    closeCallback = args.closeCallback;
}

exports.onLoaded = function(args) {
    
}

exports.onUnloaded = function() {
    console.log("login-page.onUnloaded");
}

exports.onButtonTap = function() {
    closeCallback(district.text, route.text);
}