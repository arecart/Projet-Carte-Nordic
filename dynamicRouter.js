var express = require("express");
var router = express.Router();
var appContext;
var url = require("url");
var fs = require('fs');

function dynamicRouter(app) {
    appContext = app;
    router.use(manageAction);
    appContext.use(router);
}

function manageAction(req, res, next) {
    req.message = {};
    var path = req.originalUrl;
    
    if (path === '/') {
        path = '/';
    } else if (path.includes("?")) {
        path = path.split('?')[0];
        if (path.split('/').length > 0) path = '/' + path.split('/')[1];
    } else if (path.split('/').length > 0) {
        path = '/' + path.split('/')[1];
    }

    var type = req.method;
    req.message.action = type + path;

    global.params_json = JSON.parse(fs.readFileSync("./config_params.json", "utf8"));

    if (typeof global.actions_json[req.message.action] === 'undefined') {
        console.log("Erreur: Pas d'action dans l'annuaire config_actions.json : " + path);
        next();
    } else {
        for (param in global.actions_json[req.message.action]) {
            req.message[param] = (global.actions_json[req.message.action])[param];
        }
        
        console.log('req.message dans dynamicRouteur : ', req.message);

        if (req.message.fieldUpload) {
            global.fieldUpload = req.message.fieldUpload;
        }

        try {
            let controllerModule = require('./routes/' + req.message.controler);
            if (controllerModule.router) {
                router.use(path, controllerModule.router);
            } else {
                router.use(path, controllerModule);
            }
            next();
        } catch (error) {
            console.error("Erreur lors du chargement du contrôleur:", error);
            next(error);
        }
    }
}

module.exports = dynamicRouter;
