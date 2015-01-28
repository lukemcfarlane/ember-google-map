import Ember from 'ember';
import GoogleObjectProperty from '../core/google-object-property';
import GoogleObjectEvent from '../core/google-object-event';

var computed = Ember.computed;
var fmt = Ember.String.fmt;

/**
 * @extension GoogleObjectMixin
 * @mixin GoogleObjectMixin
 */
var GoogleObjectMixin = Ember.Mixin.create({
  /**
   * The fully qualified class name of the object
   * @property googleFQCN
   * @type {string}
   */
  googleFQCN: null,

  /**
   * The class of this object
   * @property googleClass
   * @type {subclass of google.maps.MVCObject}
   */
  googleClass: computed('googleFQCN', function (key, value) {
    var path;
    if (arguments.length > 1) {
      return value;
    }
    else {
      path = this.get('googleFQCN');
      if (path) {
        return Ember.get(window, path);
      }
    }
  }),


  /**
   * Name/label of the object for debug
   * @property googleName
   * @type {string}
   */
  googleName: computed('googleFQCN', function (key, value) {
    var name;
    if (arguments.length > 1) {
      return value;
    }
    else {
      name = this.get('googleFQCN');
      return name ? Ember.String.dasherize(name.split('.').pop()) : this.toString();
    }
  }),

  /**
   * The definition of all google properties to bind
   * @property googleProperties
   * @type Object
   */
  googleProperties: Ember.required(),

  /**
   * The definition of all google events to bind
   * @property googleEvents
   * @type Object
   */
  googleEvents: Ember.required(),

  /**
   * The google object itself
   * @property googleObject
   * @type google.maps.MVCObject
   */
  googleObject: null,

  /**
   * Creates the google object
   *
   * @method createGoogleObject
   * @param {*} [firstArg]
   * @param {Object} [optionsOverrides]
   * @return {google.maps.MVCObject}
   */
  createGoogleObject: function (optionsOverrides) {
    var opt = this.serializeGoogleOptions(), object, firstArg, Class;
    if (arguments.length === 2) {
      firstArg = optionsOverrides;
      optionsOverrides = arguments[1];
    }
    opt = Ember.merge(opt, optionsOverrides);
    Ember.debug(fmt(
      '[google-maps] creating new %@: %@',
      this.get('googleName'), opt
    ));
    Class = this.get('googleClass');
    if (firstArg) {
      object = new Class(firstArg, opt);
    }
    else {
      object = new Class(opt);
    }
    this.set('googleObject', object);
    this.synchronizeEmberObject();
    return object;
  },


  /**
   * An array of all compiled (parsed) properties
   * @property _compiledProperties
   * @type Array.<GoogleObjectProperty>
   * @private
   */
  _compiledProperties: computed(function () {
    var def = this.get('googleProperties') || {},
      res = [], d, defined = Object.create(null);
    for (var k in def) {
      if (def.hasOwnProperty(k)) {
        d = def[k];
        if (typeof d === 'string') {
          d = {name: d};
        }
        else if (d === true) {
          d = {};
        }
        res.push(d = new GoogleObjectProperty(k, d));
        defined[d.getName()] = null;
        d = null;
      }
    }
    // now read all properties of the object which name start with 'gopt_'
    def = Ember.keys(this);
    for (var i = 0; i < def.length; i++) {
      if (/^gopt_/.test(def[i]) && (k = def[i].substr(5)) && !(k in defined)) {
        res.push(new GoogleObjectProperty(def[i], {name: k, optionOnly: true}));
      }
    }
    return res;
  }).readOnly(),

  /**
   * An array of all compiled (parsed) events
   * @property _compiledEvents
   * @type Array.<GoogleObjectEvent>
   * @private
   */
  _compiledEvents: computed(function () {
    var def = this.get('googleEvents') || {},
      res = [], d;
    for (var k in def) {
      if (def.hasOwnProperty(k)) {
        d = def[k];
        if (typeof d === 'string') {
          d = {action: d};
        }
        else if (d === true) {
          d = {};
        }
        res.push(new GoogleObjectEvent(k, d));
        d = null;
      }
    }
    return res;
  }).readOnly(),

  /**
   * Serialize all google options into an object usable with google object constructor
   *
   * @method serializeGoogleOptions
   * @returns {Object}
   */
  serializeGoogleOptions: function () {
    var res = {}, def = this.get('_compiledProperties');
    for (var i = 0; i < def.length; i++) {
      def[i].toOptions(this, res);
    }
    return res;
  },

  /**
   * Synchronize this Ember object by reading all values of the properties from google object
   */
  synchronizeEmberObject: function () {
    var def = this.get('_compiledProperties'),
      go = this.get('googleObject');
    if (!go) {
      return;
    }
    this.beginPropertyChanges();
    for (var i = 0; i < def.length; i++) {
      if (!def[i]._cfg.readOnly) {
        this.setProperties(def[i].readGoogle(go));
      }
    }
    this.endPropertyChanges();
  },

  /**
   * Unlink the google object
   */
  unlinkGoogleObject: Ember.beforeObserver('googleObject', function () {
    this.get('_compiledEvents').invoke('unlink');
    this.get('_compiledProperties').invoke('unlink');
  }),

  /**
   * Link the google object to this object
   */
  linkGoogleObject: Ember.observer('googleObject', function () {
    var obj = this.get('googleObject');
    if (obj) {
      this.get('_compiledProperties').invoke('link', this, obj);
      this.get('_compiledEvents').invoke('link', this, obj);
    }
  }),

  /**
   * Destroy our object, removing all listeners and pointers to google's object
   */
  destroyGoogleObject: Ember.on('destroy', function () {
    this.set('googleObject', null);
    this.get('_compiledEvents').clear();
    this.get('_compiledProperties').clear();
  })
});

export default GoogleObjectMixin;
