# HBK Logger 

Here it lies, the great HBK Logger for Node. 

This is a basic logger, extracted out of `chartroom-api`, that makes it very easy to format logs in a Cloudwatch/ElasticSearch/Kibana-friendly way, as an extension of our [logging pipeline]().

## Usage

The quick copypasta to include the logger is to `npm install --save @hbkapps/logger` and include

`var log = require('@hbkapps/logger')(__filename)`

wherever you need a logger. 

You can also specify an options object, like so:

```
var log = require('@hbkapps/logger')({
    logLevel: 'silly',
    modulePath:  __filename,
    logOutputPath: './path.txt',
    userId: 'bneese',
    awsApigRequestId: 'blah',
    awsLambdaRequestId: 'blah',
    clsNamespace: 'blah' // by default this is this is 'transaction', see note below 
})
```

All options are optional. If `options` is a string, we assume it's a module path.

The last three (awsApigRequestId, awsLambdaRequestId) are mostly included for the sake of consistency. As a practical matter, they should not be used that way and should be set either by their respective CLS namespace (see below).

## Features 

This is mostly a tailored version of Winston, and it uses the same methods and log levels Winston uses. However, there are a few interesting things this module does that one should be aware of. 

### Overrides `console.log` (not yet working)

This module does a dirty dirty thing: it overrides `console.log`, `console.profile,` and `console.startTimer`. The reason for this is that we can capture and funnel log outputs from all downstream modules into our logging pipeline, something that has proven useful time and again.

### YAML-first console logging 

By default, the logger will output YAML to the console for easy readability. However, in a production environment, this logger will output well-structured JSON for consumption by Elasticsearch. This is controlled by setting any of the following environmental variables:

- `AWS_EXECUTION_ENV` to any truthy value
- `LOG_JSON` to any truthy value (not implemented yet)
- `NODE_ENV` to `production` (not implemented yet)

### Module Path Support 

By including the __filename when we include the logger, we get to see exactly what module produced that log. That makes it much easier to trace logs across different module.

Note that if the __filename starts with "chartroom-api/", it will be automatically dropped to produce a more readable output. 

<!-- Still need to figure out how to drop the fully qualified path in favor of just the app home --> 

### API Gateway/Lambda Support via CLS

If there is a `transaction` CLS namespace (or the clsNamespace option is provided) and the `AWS_APIG_REQUEST_ID` and/or `AWS_LAMBDA_REQUEST_ID` variables are set, the logger will automatically add them to the output. If not, it will drop them. This makes it much easier to trace transactions from end to end. Note that if this is being used in an Express/server context, you _must_ set the CLS namespace because Express has no notion of per-request variables and setting environmental variables will cause race.

### Automatic STAGE/NODE_ENV logging

If the `STAGE` or `NODE_ENV` environmental variables are set, this module will include them in its output. By default, our Serverless configuration automatically sets the STAGE variable, so this should work OOTB. 

N.B: For at least `chartroom-api`, there is no need to fiddle with the `NODE_ENV` as it should not be used.

### User ID support

If there is a `transaction` CLS namespace and the `USER_ID` is set on that namespace _or_ the environmental variable `USER_ID` is set _or_ the logger is initalized with a `userId` option, the logger will include them in its output. Note that if this is being used in an Express/server context, you _must_ set the CLS namespace because Express has no notion of per-request variables and setting environmental variables will cause race conditions.

### Optional File Logging (not yet implemented)

If there is an `logOutputPath` in the `options`, the logs will write to disk at the `logOutputPath.` Note that this module will not create any necessary directories for you.

<!-- also not sure if it's appending or rewriting -->

### Object Logging 

Need to log an object? Just pass the option as the second parameter to the logger instance, like so:

`log.silly('blah', object)`


## Log Output Structure

With all options filled, the logger will output either JSON or YAML that looks something like: 

```
 {
    "timestamp": "1507582665044",
    "message": "blah",
    "meta": {
        "ayy": "lmao",
        "lmao": "ayy",
    },
    "userId": "bneese",
    "modulePath": "@crapi-orm/index.js",
    "stage": "STAGING",
    "apiRequestId": "1010101",
    "lambdaRequestId": "1010101"
  };
```

This object's structure is also documented on line 9 of `index.js.`

Note again that all falsy values will automatically be trimmed from the output.

## Full Environmental Variable Documentation

For now, refer to `config.json.`