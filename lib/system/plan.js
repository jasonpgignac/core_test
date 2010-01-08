// ==========================================================================
// Project:   SproutCore Unit Testing Library
// Copyright: ©2006-2009 Sprout Systems, Inc. and contributors.
//            Portions ©2008-2009 Apple Inc. All rights reserved.
// License:   Licened under MIT license (see license.js)
// ==========================================================================

var CoreTest = require('core'),
    utils    = require('utils');
var Plan;

require('system/test');

/**
  This module defines some helper methods for describing a test plan.  To 
  start building a test module, just call module() to start a test plan.  Then
  call test() for each  test you want to perform.  This will generate test 
  functions as needed.
  
  The plan you are building will be found at CoreTest.plan.  When you are 
  ready, just call plan.run() to actually run the test.  To start a new test
  plan, call plan('test name').  When you are done, just call plan.run();
*/

Plan = utils.extend({
  
  init: function(id) {
    this.id = id;
  },
  
  isFocused: false,
  
  logger: null,
  
  /**
    Makes the receiver the current plan.
    
    @returns {Plan} receiver
  */
  begin: function() {    
    if (this.isFocused) return this ;
    this._lastPlan = CoreTest.currentPlan;
    CoreTest.currentPlan = this ;
    this.isFocused = true;
    return this ;
  },
  
  /**
    Restores the previous focused plan.
    
    @returns {Plan} receiver
  */
  end: function() {
    if (!this.isFocused) return this; 
    CoreTest.currentPlan = this._lastPlan;
    this._lastPlan = null;
    this.isFocused = false;
    return this ;
  },
  
  /**
    Runs the plan.  This will simply submit the plan to the standard test 
    runner.
    
    @returns {Plan} receiver
  */
  run: function() {
    this._module = this._tests = this._setup = this._teardown = null; // reset

    var logger = this.logger;
    CoreTest.run(this, logger);
    
    return this ;
  },
  
  /**
    Changes the current module.  Also resets the current setup/teardown
    
    @param {String} name the module name
    @returns {Plan} receiver
  */
  module: function(name) {
    this._module = name;
    name = "test module: " + name;
    
    var tests = this[name];
    if (!tests) tests = this[name] = {};
    this._tests = tests;
    
    this._setup = this._teardown = null ; // reset
    return this ;
  },
  
  /**
    Changes the current setup method.
    
    @param {Function} func new setup function
    @returns {Plan} receiver
  */
  setup: function(func) {
    this._setup = func;
    return this ;
  },

  /**
    Changes the current teardown method.
    
    @param {Function} func new teardown function
    @returns {Plan} receiver
  */
  teardown: function(func) {
    this._teardown = func;
    return this ;
  },
  
  /**
    Adds some html to the page body.  Useful for testing low-level HTML-related
    items.  (such as for CoreQuery).

    @param {String} string the html to insert
  */
  htmlbody: function(string) {
    this._htmlbodyString = string;
  },
  
  _htmlbody: function(string) {
    var $ = require('browser/jquery');
    var html = $(string),
        body = $('body')[0];
        
    // first, find the first element with id 'htmlbody-begin'  if exists,
    // remove everything after that to reset...
    var begin = $('body #htmlbody-begin')[0];
    if (!begin) {
      begin = $('<div id="htmlbody-begin"></div>')[0];
      body.appendChild(begin);
    } else {
      while(begin.nextSibling) body.removeChild(begin.nextSibling);
    }
    begin = null; 

    // now append new content
    html.each(function() { body.appendChild(this); });
  },
  
  /**
    Adds a new test to the test plan in the current module.
    
    @param {String} testName the test name
    @param {Function} func the test function to run
    @returns {Plan} receiver
  */
  addTest: function(testName, func) {
    
    // get into default module if needed.
    if (!this._module) this.module('default'); 

    // generate a wrap with setup and teardown...
    var setup    = this._setup, 
        teardown = this._teardown, 
        html     = this._htmlbodyString,
        htmlbody = this._htmlbody;
    
    testName = "test " + testName;
    this._tests[testName] = function() {
      if (html) htmlbody(html);
      if (setup) setup();
      if (func) func();
      if (teardown) teardown();
    };
  }
  
});
CoreTest.Plan = Plan;

// ..........................................................
// PLAN DSL
// 

/**
  Call this method to start a new test plan.  This should appear at the top of
  every test.  Build tools may include this automatically for you.
  
  @param {String} planName the name of the new plan (optional)
  @returns {Plan} the new plan instance
*/
var plan = function plan(planName) { 
  return new Plan(planName).begin();
};

/**
  Call this method to finish with the current plan, restoring any previous 
  plan.
  
  @returns {Plan} the plan that was just ended
*/
plan.end = function() {
  return CoreTest.currentPlan.end();
};

/**
  Ends the current plan and then runs it.
  
  @returns {Plan} the plan that was run.
*/
plan.run = function() {
  return CoreTest.currentPlan.end().run();
};

/**
  Optionally specify an alternate logger for the plan.  Pass with no params
  to get the current logger.
  
  @param {Object} logger alternate logger
  @returns {Plan} the plan that was run.
*/
plan.logger = function(logger) {
  if (arguments.length === 0) return CoreTest.plan.logger;
  else CoreTest.plan.logger = logger;
  return logger;  
};

CoreTest.plan = plan;

/**
  Begins a new module in the plan.  Optionally pass a hash with setup and 
  teardown methods for the module.  Future tests will be placed inside of 
  this module automatically.
  
  @param {String} moduleName the name of the module
  @param {Hash} opts optional setup and teardown methods for module
  @returns {void}
*/
CoreTest.module = function(moduleName, opts) {
  var cp = CoreTest.currentPlan;
  if (!cp) cp = CoreTest.plan('unknown'); // begin a plan 
  cp.module(moduleName);
  if (opts && opts.setup) cp.setup(opts.setup);
  if (opts && opts.teardown) cp.teardown(opts.teardown);
};

/**
  Changes the setup method for the remaining tests in the current module. 
  You can use this instead of passing options to the module() helper.
  
  @param {Function} func setup function
  @returns {void}
*/
CoreTest.setup = function(func) {
  if (!CoreTest.currentPlan) CoreTest.plan('unknown'); // begin a plan
  CoreTest.currentPlan.setup(func);
};

/**
  Changes the teardown method for the remaining tests in the current module. 
  You can use this instead of passing options to the module() helper.
  
  @param {Function} func teardown function
  @returns {void}
*/
CoreTest.teardown = function(func) {
  if (!CoreTest.currentPlan) CoreTest.plan('unknown'); // begin a plan
  CoreTest.currentPlan.teardown(func);
};

/**
  Adds the named unit test to the current module.
  
  @param {String} desc description of the unit test
  @param {Function} func actual unit test to run
  @returns {void}
*/
CoreTest.test = function(desc, func) {
  if (!CoreTest.currentPlan) CoreTest.plan('unknown'); // begin a plan
  CoreTest.currentPlan.addTest(desc, func);
};

CoreTest.htmlbody = function(str) {
  if (!CoreTest.currentPlan) CoreTest.plan('unknown'); // begin a plan
  CoreTest.currentPlan.htmlbody(str);
};