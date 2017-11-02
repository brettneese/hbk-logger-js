var config = require("convict")(__dirname + "/config.json").getProperties();
var winston = require("winston");
var toYAML = require("winston-console-formatter");
var getNamespace = function(){
  return {
    get: function(key){
      return process.env[key];
    }
  };
};

try {
  getNamespace = require("continuation-local-storage").getNamespace;
} catch(err){
  console.warn('An error occurred loading "continuation-local-storage". It may have to do with https://github.com/HBKEngineering/hbk-logger-js/issues/1. Using a barebones implementation of `getNamespace`.')
  console.warn('The error was', err);
}

var _pickBy = require("lodash.pickby");
var _isString = require("lodash.isstring");

// inspired by https://stackoverflow.com/questions/42858585/add-module-name-in-winston-log-entries/42966914#42966914
module.exports = function(options) {
  var namespace = {};
  // declaring the options here for two reasons
  // one, as pseudo-documentation
  // two, because that way the order can be controlled
  var logOutput = {
    timestamp: Date.now(),
    message: null,
    meta: null,
    userId: null,
    modulePath: null,
    stage: process.env.STAGE,
    apiRequestId: null,
    lambdaRequestId: null
  };

  // if the options is a string, assume it's a module path.
  // if we have zero options, don't log the module path
  if (_isString(options)) {
    logOutput.modulePath = options.split(process.cwd()).pop();
  }

  if (options.modulePath) {
    logOutput.modulePath = options.modulePath.split(process.cwd()).pop();
  }

  var winstonLogger = new winston.Logger({
    level: options.logLevel || config.LOG_LEVEL,
    rewriters: [
      function(level, msg, meta) {
        const ns =
          getNamespace(options.clsNamespace) || getNamespace("transaction");

        logOutput.message = msg;
        logOutput.meta = meta;
        logOutput.userId =
          (ns ? ns.get("USER_ID") : undefined) ||
          process.env.USER_ID ||
          options.userId;
        logOutput.apiRequestId =
          (ns ? ns.get("AWS_APIG_REQUEST_ID") : undefined) ||
          process.env["AWS_APIG_REQUEST_ID"] ||
          options.awsApigRequestId;
        logOutput.lambdaRequestId =
          (ns ? ns.get("AWS_APIG_REQUEST_ID") : undefined) ||
          process.env["AWS_LAMBDA_REQUEST_ID"] ||
          options.awsLambdaRequestId;

        if (process.env.AWS_EXECUTION_ENV){
          logOutput.awsLambdaWarm = !!process.env.LAMBDA_WARM;
          process.env.AWS_LAMBDA_WARM = true; 
        }
        // only return the logOutput values that explictly have a value assigned
        return _pickBy(logOutput, function(value, key){
          return value || (value === false);
        });
      }
    ]
  });

  // override console.*() so we get all the logs
  // https://github.com/winstonjs/winston/issues/790#issuecomment-173759879
  ["profile", "startTimer"]
    .concat(Object.keys(winstonLogger.levels))
    .forEach(function(method) {
      console[method] = function() {
        return winstonLogger[method].apply(winstonLogger, arguments);
      };
    });

  // override console.log separately to call log.info
  console.log = function() {
    return winstonLogger.info.apply(winstonLogger, arguments);
  };

  // if we're not in Lambda, go ahead and just spit out YAML. If we are, spit out stringified JSON
  if (!config.LOG_JSON) {
    winstonLogger.add(winston.transports.Console, toYAML.config());
  } else {
    winstonLogger.add(winston.transports.Console, {
      json: true,
      stringify: true
    });
  }

  // @todo implement file logging
  // if we have a logOutputPath log the output to a file
  // if (options.logOutputPath) {
  //   winstonLogger.add(winston.transports.File, {
  //     // options
  //   });
  // }

  return winstonLogger;
};
