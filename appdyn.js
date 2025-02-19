var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var fs = require("fs");
var session = require('express-session');
var passport = require("passport");
var LocalStrategy = require('passport-local').Strategy;
var multer = require('multer');
require('dotenv').config();

global.upload = multer({
    dest: './public/data/uploads/'
})


global.actions_json = JSON.parse(fs.readFileSync("./routes/config_actions.json", "utf8"));
var filePath = "./routes/config_actions.json";
fs.watch(filePath, "utf-8", function(event, trigger) {
    console.log("-- The file config_actons.json has changed ! --");
    global.actions_json = JSON.parse(fs.readFileSync(filePath, "utf8"));
    console.log("-- The file config_actons.json reloaded ! --");
});

var hbs = require('hbs');
hbs.registerPartials(__dirname + '/views/partials', function() {
    console.log('partials registered');
});

hbs.registerHelper('formatDate', function(date) {
    return new Date(date).toLocaleString('fr-FR', {
        dateStyle: 'medium',
        timeStyle: 'medium'
    });
});

hbs.registerHelper('compare', function(lvalue, rvalue, options) {
    if (arguments.length < 3)
        throw new Error("Handlerbars Helper 'compare' needs 2 parameters");
    var operator = options.hash.operator || "==";
    var operators = {
        '==': function(l, r) {
            return l == r;
        },
        '===': function(l, r) {
            return l === r;
        }
    }
    if (!operators[operator])
        throw new Error("'compare' doesn't know the operator " + operator);
    var result = operators[operator](lvalue, rvalue);
    if (result) {
        return options.fn(this);
    } else {
        return options.inverse(this);
    }
});

if (process.env.MONGODB_USED === "True") {
    global.db = {};
    var mongoClient = require('mongodb').MongoClient;
    var url = process.env.MONGODB_URL;
    mongoClient.connect(url, {
        useUnifiedTopology: true
    }, function(err, client) {
        global.db = client.db('gretajs');
        console.log("Connected successfully to server: global.db initialized");
    });
}

if (process.env.MONGOOSE_USED === "True") {
    global.schemas = {};
    var mongoose = require('mongoose');
    mongoose.connect(process.env.MONGOOSE_URL, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    }, function(err) {
        if (err) {
            throw err;
        } else console.log('Connected Mongoose');
    });

    var database_schemas = JSON.parse(fs.readFileSync("database_schema.json", 'utf8'));
    for (modelName in database_schemas) {
        global.schemas[modelName] = mongoose.model(modelName, database_schemas[modelName].schema,
            database_schemas[modelName].collection);
    }
}

if (process.env.SEQUELIZE_USED === "True") {
    var Sequelize = require("sequelize");

    global.sequelize = new Sequelize(
        process.env.SEQUELIZE_DATABASE,
        process.env.SEQUELIZE_USER,
        process.env.SEQUELIZE_PASSWORD, 
        {
            host: process.env.SEQUELIZE_HOST,
            dialect: process.env.SEQUELIZE_DIALECT,
            pool: {
                max: 5,
                min: 0,
                idle: 10000
            }
        }
    );
    try {
        sequelize.authenticate();
        console.log('Sequelize : Connection has been established successfully.');
    } catch (error) {
        console.error('Sequelize: Unable to connect to the database:', error);
    }
}

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({
    extended: false
}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    name: 'sessiongreta',
    secret: 'AsipfGjdp*%dsDKNFNFKqoeID1345',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false
    } 
}));
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser(function(user, done) {
    done(null, user.id_users);
});

passport.deserializeUser(function(id, done) {
    var params_value = [];
    params_value.push(id);
    global.sequelize.query("SELECT * FROM users WHERE id_users=?", {
        replacements: params_value,
        type: sequelize.QueryTypes.SELECT
    }).then(function(result) { // sql query success
        console.log('deserialize user data : ', result);
        done(null, result);
    }).catch(function(err) { // sql query error
        console.log('error select', err);
    });
});

passport.use(new LocalStrategy(
    function(username, password, done) {
        var params_value = [];
        params_value.push(username);
        params_value.push(password);
        global.sequelize.query("SELECT id_users, login, mdp FROM users WHERE login=?", {
                replacements: params_value,
                type: sequelize.QueryTypes.SELECT
            })
            .then(function(result) { 
                if (!result[0]) {
                    console.log("pas d'utilisateur trouvé");
                    return done(null, false, {
                        message: 'Incorrect username.'
                    });
                }
                if (result[0].mdp != password) {
                    console.log("password erroné");
                    return done(null, false, {
                        message: 'Incorrect password.'
                    });
                }
                console.log("utilisateur : ", result[0]);
                return done(null, result[0]);
            }).catch(function(err) { // sql query error
                console.log('error select', err);
            });
    }
));

app.post('/authenticated', passport.authenticate('local'), function(req, res) {
    if (req.session.passport.user != null) {
        res.redirect('/index'); 
    } else {
        res.redirect('/'); 
    }
});

require('./dynamicRouter')(app);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});

module.exports = app;
