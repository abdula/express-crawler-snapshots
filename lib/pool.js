var phantom = require('phantom'),
    CrawlerSnapshotsError = require('./exception'),
    Instance = require('./instance');

var Pool = module.exports = function Pool(max_instances, opts) {
    this.max_instances = max_instances;
    this.instances = [];
    this.available_instances = [];
    this.queued_get_instance_callbacks = [];
    this.instance_no = 0;
    this.opts = opts;
}

Pool.prototype.spawnInstance = function spawnInstance(cb) {
    var instance_no = this.instance_no ++,
        instance,
        self = this;

    self.log('starting phantomjs instance ' + instance_no + '...');
    phantom.create("--web-security=no", "--ignore-ssl-errors=yes", 
        {
            onExit: function () {
                self.log('phantomjs instance ' + instance_no + ' terminated'); 
                if (instance) {
                    instance.onExit();
                } else {
                    cb(null, new CrawlerSnapshotsError('phantom instance terminated before fully starting'));
                }
            }   
        }, function(ph, error) {
            if (error) {
                self.log('phantomjs instance ' + instance_no + ' failed to start');
                cb(null, error);
            } else {
                self.log('phantomjs instance ' + instance_no + ' started');
                instance = new Instance(ph, self, instance_no, self.opts);
                self.instances.push(instance);
                cb(instance);
            }
        }
    );
};

Pool.prototype.log = function (msg) {
    var msg = 'phantomjs pool: ' + msg;
    if (this.opts.log) {
        this.opts.log(msg);
    } else {
        console.log(msg);
    }
};

Pool.prototype.processQueue = function () {
    if (this.queued_get_instance_callbacks.length) {
        this.log('processing next queued request, queue length is now ' + (this.queued_get_instance_callbacks.length -1 ))
        this.getInstance(this.queued_get_instance_callbacks.shift());
    }
}

Pool.prototype.removeInstance = function (instance) {
    this.instances = this.instances.filter(function(i) {
        return i !== instance;
    });
    this.processQueue();
};

Pool.prototype.releaseInstance = function (instance) {
    this.available_instances.push(instance);
    this.processQueue();
};

Pool.prototype.getInstance = function getInstance(cb) {
    if (this.available_instances.length) {
        cb(this.available_instances.shift());
    } else if (this.instances.length < this.max_instances) {
        this.spawnInstance(cb);
    } else {
        this.queued_get_instance_callbacks.push(cb);
        this.log('queued a request for phantomjs instance. queue length is ' + this.queued_get_instance_callbacks.length);
    }
};