'use strict';

const BbPromise = require('bluebird');

class UtsusemiUseApiKey {
    constructor(serverless, options) {
        this.serverless = serverless;
        this.options = options || {};
        this.serverless.variables.loadVariableSyntax();

        this.hooks = {
            'package:initialize': () => BbPromise.bind(this)
                .then(this.use)
        };
    }

    use() {
        const env = this.serverless.service.provider.environment;
        if (Number(env['UTSUSEMI_USE_API_KEY'])) {
            this.serverless.service.functions.starter.events[0].http.private = true;
            this.serverless.service.functions.purge.events[0].http.private = true;
            this.serverless.service.functions.delete.events[0].http.private = true;
            this.serverless.service.functions.status.events[0].http.private = true;
            this.serverless.service.functions.nstarter.events[0].http.private = true;
        }
        return BbPromise.resolve();
    }
}

module.exports = UtsusemiUseApiKey;
