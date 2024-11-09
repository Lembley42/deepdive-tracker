(function(window) {
function DeepDive(project_id) {
    this.project_id = project_id;
}

DeepDive.prototype = {
    sendData: function(data, event) {
    var params = new URLSearchParams(data).toString();
    var url = 'https://collect.backend.deep-dive.cloud/' + 
                '?event=' + encodeURIComponent(event) + 
                '&' + params + 
                '&project_id=' + encodeURIComponent(this.project_id) + 
                '&_=' + new Date().getTime();

    // Create a pixel for tracking
    var pixel = new Image();
    pixel.src = url;
    },

    pageview: function() {
    var data = this._getCommonData();
    data = this._mergeObjects(data, this._getParameters());
    data = this._mergeObjects(data, {
        device_type: this._getDeviceType(),
        screen_resolution: this._getScreenResolution(),
        browser: this._getBrowserInfo()
    });
    this.sendData(data, 'pageview');
    },

    customEvent: function(eventName, params) {
    var data = this._mergeObjects(this._getCommonData(), {
        name: eventName,
        params: JSON.stringify(params)
    });
    this.sendData(data, 'custom_event');
    },

    viewItem: function(items) {
    var data = this._mergeObjects(this._getCommonData(), {
        items: JSON.stringify(items)
    });
    this.sendData(data, 'view_item');
    },

    addToCart: function(items, value, currency) {
    var data = this._mergeObjects(this._getCommonData(), {
        items: JSON.stringify(items),
        value: value,
        currency: currency
    });
    this.sendData(data, 'add_to_cart');
    },

    checkout: function(items, value, currency) {
    var data = this._mergeObjects(this._getCommonData(), {
        items: JSON.stringify(items),
        value: value,
        currency: currency
    });
    this.sendData(data, 'checkout');
    },

    purchase: function(items, value, currency, tax, shipping, transactionId) {
    var data = this._mergeObjects(this._getCommonData(), {
        items: JSON.stringify(items),
        value: value,
        currency: currency,
        tax: tax,
        shipping: shipping,
        transaction_id: transactionId
    });
    this.sendData(data, 'purchase');
    },

    _generateUUID: function() {
    var d = new Date().getTime();
    if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
        d += performance.now();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = (d + Math.random() * 16) % 16 | 0;
        d = Math.floor(d / 16);
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
    },

    _getStorageItem: function(key) {
    try {
        return localStorage.getItem(key) || this._getCookie(key);
    } catch (e) {
        return this._getCookie(key);
    }
    },

    _setStorageItem: function(key, value, days) {
    try {
        localStorage.setItem(key, value);
    } catch (e) {
        // Fallback to cookie if localStorage is not available
    }
    this._createCookie(key, value, days);
    },

    _createCookie: function(name, value, days) {
    var expires = "";
    if (days) {
        var date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "") + expires + "; path=/; Secure; SameSite=Strict";
    },

    _getCookie: function(name) {
    var value = "; " + document.cookie;
    var parts = value.split("; " + name + "=");
    if (parts.length === 2) return parts.pop().split(';').shift();
    return '';
    },

    _getUserId: function() {
    var userId = this._getStorageItem('dd_uid');
    if (!userId) {
        userId = this._generateUUID();
        this._setStorageItem('dd_uid', userId, 365);
    }
    return userId;
    },

    _getSessionId: function() {
    var sessionValue = this._getStorageItem('dd_sid');
    var now = new Date().getTime();

    if (!sessionValue) {
        return this._createSession(now);
    }

    var parts = sessionValue.split('_');
    var sessionId = parts[0];
    var lastTimestamp = parseInt(parts[1], 10);

    if (now - lastTimestamp > 30 * 60 * 1000) { // 30 minutes
        return this._createSession(now);
    } else {
        this._setStorageItem('dd_sid', sessionId + '_' + now, 1/48); // 30 minutes
        return sessionId;
    }
    },

    _createSession: function(timestamp) {
    var sessionId = this._generateUUID();
    this._setStorageItem('dd_sid', sessionId + '_' + timestamp, 1/48); // 30 minutes
    return sessionId;
    },

    _getParameters: function() {
    var paramKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_id', 'utm_term', 'utm_content'];
    var searchParams = new URLSearchParams(window.location.search);
    return paramKeys.reduce(function(params, key) {
        var value = searchParams.get(key);
        if (value !== null) {
        params[key] = value;
        }
        return params;
    }, {});
    },

    _getDeviceType: function() {
    var width = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
    if (width > 992) return 'desktop';
    if (width > 768) return 'tablet';
    return 'mobile';
    },

    _getScreenResolution: function() {
    return window.screen.width + 'x' + window.screen.height;
    },

    _getBrowserInfo: function() {
    var ua = navigator.userAgent;
    var browsers = {
        'Firefox': /Firefox/,
        'Opera': /Opera|OPR/,
        'Chrome': /Chrome/,
        'Safari': /Safari/,
        'IE': /MSIE|Trident/
    };
    for (var browser in browsers) {
        if (browsers[browser].test(ua)) return browser;
    }
    return 'Other';
    },

    _getCommonData: function() {
    var date = new Date();
    var offset = -date.getTimezoneOffset();
    var sign = offset >= 0 ? '+' : '-';
    var pad = function(num) { return ('00' + Math.abs(num)).slice(-2); };

    var localISOTime = date.getFullYear() +
                        '-' + pad(date.getMonth() + 1) +
                        '-' + pad(date.getDate()) +
                        'T' + pad(date.getHours()) +
                        ':' + pad(date.getMinutes()) +
                        ':' + pad(date.getSeconds()) +
                        sign + pad(offset / 60) + ':' + pad(offset % 60);

    return {
        user_id: this._getUserId(),
        session_id: this._getSessionId(),
        timestamp: localISOTime,  // Include local time with timezone
        url: window.location.href,
        title: document.title,
        referrer: document.referrer || 'direct',
        language: navigator.language
    };
    },

    _mergeObjects: function(obj1, obj2) {
    return Object.assign({}, obj1, obj2);
    }
};

// Expose the deepdive object globally with an init function
window.deepdive = {
    instance: null,

    // Initialize deepdive with the given project ID
    init: function(project_id) {
    if (!this.instance) {
        this.instance = new DeepDive(project_id);
        this.instance.pageview(); // Optionally, call pageview on init
    }
    }
};
})(window);
  