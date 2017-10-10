var config = require("convict")(__dirname + "/config.json").getProperties();
var winston = require("winston");
var toYAML = require("winston-console-formatter");
var cls = require("continuation-local-storage");
var _ = require("lodash");

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

  // if the option is a string, assume it's a module path.
  // if we have zero options, don't log the module path
  if (_.isString(options)) {
    logOutput.modulePath = options.split(process.cwd()).pop(); // is there a way we can split this without defining ahead of time?
  }

  if (options.modulePath) {
    logOutput.modulePath = options.modulePath.split(process.cwd()).pop(); // is there a way we can split this without defining ahead of time?
  }
  if (process.namespaces[options.clsNamespace] || process.namespaces["transaction"]) {
    clsNamespace = namespace.get(options.clsNamespace) || namespace.get("transaction")
    namespace.USER_ID = clsNamespace.get('USER_ID')    
    namespace.AWS_APIG_REQUEST_ID = clsNamespace.get('AWS_APIG_REQUEST_ID')    
    namespace.AWS_LAMBDA_REQUEST_ID = clsNamespace.get('AWS_LAMBDA_REQUEST_ID')    
  }

  var winstonLogger = new winston.Logger({
    level: options.logLevel || config.LOG_LEVEL,
    rewriters: [
      function(level, msg, meta) {
        logOutput.message = msg;
        logOutput.meta = meta;
        logOutput.userId =
          namespace.USER_ID ||
          process.env.USER_ID ||
          options.userId;
        logOutput.apiRequestId =
          namespace.AWS_APIG_REQUEST_ID ||
          process.env["AWS_APIG_REQUEST_ID"] ||
          options.awsApigRequestId;
        logOutput.lambdaRequestId =
          namespace.AWS_LAMBDA_REQUEST_ID ||
          process.env["AWS_LAMBDA_REQUEST_ID"] ||
          options.awsLambdaRequestId;

          
        // only return the logOutput values that have a value assigned
        return _.pickBy(logOutput, _.identity)
      }
    ]
  });

  // @todo this isn't working
  // //override console.log() so we get all the logs
  // https://github.com/winstonjs/winston/issues/790#issuecomment-173759879
  // ["log", "profile", "startTimer"]
  //   .concat(Object.keys(winstonLogger.levels))
  //   .forEach(function(method) {
  //     console[method] = function() {
  //       return winstonLogger[method].apply(winstonLogger, arguments);
  //     };
  //   });

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
